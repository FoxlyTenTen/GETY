# Supabase Implementation Guide — GETY App

> Follow these steps in order. Copy-paste each SQL block directly into the **Supabase SQL Editor**.

---

## Step 1 — Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in (or create a free account).
2. Click **"New Project"**.
3. Fill in:
   - **Name**: `gety`
   - **Database Password**: choose a strong password and save it
   - **Region**: pick the closest to Malaysia (Singapore — `ap-southeast-1`)
4. Click **"Create new project"** and wait ~2 minutes for it to provision.

---

## Step 2 — Enable UUID Extension

Go to **SQL Editor** → click **"New query"** → paste and run:

```sql
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

---

## Step 3 — Create All Tables

Paste each block in the SQL Editor and click **Run**.

### 3.1 — `users` table

```sql
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name   VARCHAR(100) NOT NULL,
    email       VARCHAR(255) UNIQUE NOT NULL,
    avatar_url  TEXT,
    role        VARCHAR(20) NOT NULL DEFAULT 'estate_owner'
                CHECK (role IN ('estate_owner', 'agronomist', 'admin')),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 3.2 — `estates` table

```sql
CREATE TABLE estates (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(150) NOT NULL,
    location    TEXT,
    hectares    DECIMAL(8,2),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.3 — `plots` table

```sql
CREATE TABLE plots (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    estate_id       UUID NOT NULL REFERENCES estates(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    area_hectares   DECIMAL(6,2),
    gps_lat         DECIMAL(10,6),
    gps_lng         DECIMAL(10,6),
    tree_count      INTEGER,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.4 — `diseases` table (master reference)

```sql
CREATE TABLE diseases (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                    VARCHAR(200) UNIQUE NOT NULL,
    scientific_name         VARCHAR(200),
    description             TEXT NOT NULL,
    risk_level              VARCHAR(10) NOT NULL
                            CHECK (risk_level IN ('Low', 'Medium', 'High')),
    recommended_fungicide   VARCHAR(100),
    water_mix_ratio         VARCHAR(50),
    default_day_plan        INTEGER DEFAULT 14,
    follow_up_days          INTEGER DEFAULT 14,
    prevention_tips         JSONB,
    what_to_do              JSONB,
    created_at              TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.5 — `scans` table

```sql
CREATE TABLE scans (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plot_id         UUID REFERENCES plots(id) ON DELETE SET NULL,
    disease_id      UUID REFERENCES diseases(id) ON DELETE SET NULL,
    image_url       TEXT NOT NULL,
    confidence      DECIMAL(5,2) NOT NULL CHECK (confidence BETWEEN 0 AND 100),
    risk_level      VARCHAR(10) NOT NULL
                    CHECK (risk_level IN ('Low', 'Medium', 'High', 'Healthy')),
    scan_date       DATE NOT NULL DEFAULT CURRENT_DATE,
    -- GPS fields: captured from device when user taps "Tag GPS Location"
    scan_lat        DECIMAL(10,6),       -- e.g. 4.210528
    scan_lng        DECIMAL(10,6),       -- e.g. 101.975769
    scan_address    TEXT,                -- reverse-geocoded e.g. "Jalan Ladang, Perak"
    location_label  VARCHAR(100),        -- manual plot label e.g. "North Plot B-12"
    notes           TEXT,
    is_saved        BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- History list: most recent first
CREATE INDEX idx_scans_user_date ON scans(user_id, scan_date DESC);

-- GPS spatial lookups: only rows where GPS was captured
CREATE INDEX idx_scans_gps ON scans(scan_lat, scan_lng)
    WHERE scan_lat IS NOT NULL;
```

### 3.6 — `treatment_plans` table

```sql
CREATE TABLE treatment_plans (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_id         UUID UNIQUE NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    disease_id      UUID REFERENCES diseases(id) ON DELETE SET NULL,
    fungicide       VARCHAR(100) NOT NULL,
    water_mix       VARCHAR(50),
    day_plan        INTEGER NOT NULL,
    start_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date        DATE GENERATED ALWAYS AS (start_date + day_plan) STORED,
    status          VARCHAR(15) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'completed', 'abandoned')),
    progress_pct    DECIMAL(5,2) DEFAULT 0.00,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.7 — `treatment_steps` table

```sql
CREATE TABLE treatment_steps (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id      UUID NOT NULL REFERENCES treatment_plans(id) ON DELETE CASCADE,
    step_order   INTEGER NOT NULL,
    title        VARCHAR(150) NOT NULL,
    description  TEXT NOT NULL,
    status       VARCHAR(15) NOT NULL DEFAULT 'upcoming'
                 CHECK (status IN ('upcoming', 'current', 'completed')),
    due_date     DATE,
    completed_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (plan_id, step_order)
);

CREATE INDEX idx_steps_plan_order ON treatment_steps(plan_id, step_order ASC);
```

### 3.8 — Auto-update `progress_pct` trigger

```sql
-- Recalculates treatment_plans.progress_pct when any step changes status
CREATE OR REPLACE FUNCTION recalc_plan_progress()
RETURNS TRIGGER AS $$
DECLARE
    total_steps   INTEGER;
    done_steps    INTEGER;
BEGIN
    SELECT COUNT(*)          INTO total_steps FROM treatment_steps WHERE plan_id = NEW.plan_id;
    SELECT COUNT(*)          INTO done_steps  FROM treatment_steps WHERE plan_id = NEW.plan_id AND status = 'completed';

    UPDATE treatment_plans
    SET progress_pct = CASE WHEN total_steps = 0 THEN 0
                            ELSE ROUND((done_steps::DECIMAL / total_steps) * 100, 2)
                       END
    WHERE id = NEW.plan_id;

    -- Auto-complete plan when all steps done
    IF done_steps = total_steps AND total_steps > 0 THEN
        UPDATE treatment_plans SET status = 'completed' WHERE id = NEW.plan_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_step_progress
AFTER INSERT OR UPDATE OF status ON treatment_steps
FOR EACH ROW EXECUTE FUNCTION recalc_plan_progress();
```

### 3.9 — `reminders` table

```sql
CREATE TABLE reminders (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    step_id       UUID REFERENCES treatment_steps(id) ON DELETE CASCADE,
    title         VARCHAR(200) NOT NULL,
    body          TEXT,
    priority      VARCHAR(10) NOT NULL DEFAULT 'Medium'
                  CHECK (priority IN ('High', 'Medium', 'Low')),
    scheduled_at  TIMESTAMPTZ NOT NULL,
    is_sent       BOOLEAN DEFAULT FALSE,
    is_dismissed  BOOLEAN DEFAULT FALSE,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reminders_user_scheduled ON reminders(user_id, scheduled_at ASC, is_sent);
```

### 3.10 — `ai_requests` table

```sql
CREATE TABLE ai_requests (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_id             UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
    model_version       VARCHAR(50) NOT NULL,
    input_image_url     TEXT NOT NULL,
    raw_response        JSONB,
    disease_predicted   VARCHAR(200),
    confidence          DECIMAL(5,2),
    latency_ms          INTEGER,
    status              VARCHAR(10) NOT NULL DEFAULT 'success'
                        CHECK (status IN ('success', 'failed', 'timeout')),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.11 — `notifications` table

```sql
CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(25) NOT NULL
                CHECK (type IN ('scan_result', 'treatment_reminder', 'system', 'tip')),
    title       VARCHAR(200) NOT NULL,
    body        TEXT,
    related_id  UUID,
    is_read     BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
```

---

## Step 4 — Seed the `diseases` Table

Pre-populate with known rubber tree diseases:

```sql
INSERT INTO diseases (name, scientific_name, description, risk_level, recommended_fungicide, water_mix_ratio, default_day_plan, follow_up_days, prevention_tips, what_to_do) VALUES
(
    'Pestalotiopsis Leaf Fall',
    'Pestalotiopsis palmarum',
    'Circular brown spots on leaves causing early leaf drop. Reduces rubber yield significantly if untreated.',
    'High',
    'Mancozeb 80WP',
    '20L Water Mix',
    14,
    14,
    '[{"title":"Water Control","desc":"Ensure good drainage in low-lying areas."},{"title":"Tree Spacing","desc":"Allow air to flow freely between trees."}]',
    '["Prune infected branches and burn them away from the estate to stop spread.","Apply copper-based fungicide during the next dry spell for maximum effect."]'
),
(
    'Rubber Powdery Mildew',
    'Oidium heveae',
    'White powdery coating on leaf surfaces affecting the upper canopy. Caused by Oidium heveae species.',
    'Medium',
    'Sulfur 80WP',
    '15L Water Mix',
    10,
    10,
    '[{"title":"Reduce Moisture","desc":"Avoid overhead irrigation to reduce leaf surface moisture."},{"title":"Early Detection","desc":"Inspect new flushes weekly during dry season."}]',
    '["Apply wettable sulfur or trifloxystrobin fungicide immediately.","Avoid overhead irrigation to reduce leaf surface moisture."]'
),
(
    'Phytophthora Leaf Blight',
    'Phytophthora meadii',
    'Dark water-soaked lesions on leaves, often with yellow halos. Spreads rapidly during wet season.',
    'High',
    'Fosetyl-Al 80WP',
    '25L Water Mix',
    21,
    14,
    '[{"title":"Drainage","desc":"Improve soil drainage to prevent root rot."},{"title":"Sanitation","desc":"Remove and destroy infected leaf litter promptly."}]',
    '["Apply systemic fungicide Fosetyl-Al immediately.","Remove all infected leaf litter from the ground to prevent re-infection."]'
),
(
    'Colletotrichum Leaf Disease',
    'Colletotrichum gloeosporioides',
    'Anthracnose-type brown necrotic spots with dark margins. Common in nursery-stage trees.',
    'Low',
    'Copper Oxychloride',
    '20L Water Mix',
    10,
    7,
    '[{"title":"Nursery Hygiene","desc":"Sanitize tools and equipment between rows."},{"title":"Air Circulation","desc":"Increase spacing between nursery bags."}]',
    '["Spray copper oxychloride at first sign of infection.","Reduce canopy density to improve airflow."]'
);
```

---

## Step 5 — Set Up Row Level Security (RLS)

Enable RLS so each user can only access their own data:

```sql
-- Enable RLS on all tables
ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE estates            ENABLE ROW LEVEL SECURITY;
ALTER TABLE plots              ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans              ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_plans    ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_steps    ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_requests        ENABLE ROW LEVEL SECURITY;

-- diseases is a public read-only reference table
ALTER TABLE diseases           ENABLE ROW LEVEL SECURITY;
CREATE POLICY "diseases_public_read" ON diseases FOR SELECT USING (true);

-- Users can only read/update their own profile
CREATE POLICY "users_own" ON users
    FOR ALL USING (auth.uid() = id);

-- Estates: owner only
CREATE POLICY "estates_own" ON estates
    FOR ALL USING (auth.uid() = owner_id);

-- Plots: via estate ownership
CREATE POLICY "plots_own" ON plots
    FOR ALL USING (
        estate_id IN (SELECT id FROM estates WHERE owner_id = auth.uid())
    );

-- Scans: owner only
CREATE POLICY "scans_own" ON scans
    FOR ALL USING (auth.uid() = user_id);

-- Treatment plans: owner only
CREATE POLICY "plans_own" ON treatment_plans
    FOR ALL USING (auth.uid() = user_id);

-- Treatment steps: via plan ownership
CREATE POLICY "steps_own" ON treatment_steps
    FOR ALL USING (
        plan_id IN (SELECT id FROM treatment_plans WHERE user_id = auth.uid())
    );

-- Reminders: owner only
CREATE POLICY "reminders_own" ON reminders
    FOR ALL USING (auth.uid() = user_id);

-- Notifications: owner only
CREATE POLICY "notifications_own" ON notifications
    FOR ALL USING (auth.uid() = user_id);

-- AI requests: via scan ownership
CREATE POLICY "ai_requests_own" ON ai_requests
    FOR ALL USING (
        scan_id IN (SELECT id FROM scans WHERE user_id = auth.uid())
    );
```

---

## Step 6 — Create Storage Bucket for Leaf Images

In the **Supabase Dashboard**:

1. Go to **Storage** → click **"New bucket"**
2. Name it: `leaf-images`
3. Set it to **Private** (images accessed via signed URLs)
4. Click **Create bucket**

Then run this SQL to set the storage policy:

```sql
-- Allow authenticated users to upload to their own folder
CREATE POLICY "leaf_images_upload" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'leaf-images'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Allow authenticated users to read their own images
CREATE POLICY "leaf_images_read" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'leaf-images'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );
```

---

## Step 7 — Install Supabase in Your Expo Project

Run this in your terminal inside the `GETY` folder:

```bash
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill
```

---

## Step 8 — Get Your Supabase Keys

In the **Supabase Dashboard**:
1. Go to **Project Settings** → **API**
2. Copy:
   - **Project URL** (looks like `https://xyzxyz.supabase.co`)
   - **anon public key** (long JWT string)

---

## Step 9 — Create `.env` File

Create a `.env` file in your `GETY/` root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

> [!IMPORTANT]
> Add `.env` to your `.gitignore` to never commit secret keys.

---

## Step 10 — Create the Supabase Client

Create this file at `GETY/lib/supabase.ts`:

```typescript
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,       // persists session across app restarts
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
```

---

## Step 11 — Usage Examples in the App

### Fetch scan history for the logged-in user

```typescript
import { supabase } from '@/lib/supabase';

const fetchHistory = async () => {
    const { data, error } = await supabase
        .from('scans')
        .select(`
            *,
            disease:diseases(name, risk_level, recommended_fungicide),
            plot:plots(name)
        `)
        .order('scan_date', { ascending: false });

    if (error) console.error(error);
    return data;
};
```

### Save a new scan (with GPS)

```typescript
const saveScan = async (
    imageUrl: string,
    diseaseId: string,
    confidence: number,
    gps?: { lat: number; lng: number; address: string },
) => {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
        .from('scans')
        .insert({
            user_id:      user!.id,
            image_url:    imageUrl,
            disease_id:   diseaseId,
            confidence,
            risk_level:   'High',
            is_saved:     true,
            // GPS — all optional, only stored when user tapped Tag GPS
            scan_lat:     gps?.lat ?? null,
            scan_lng:     gps?.lng ?? null,
            scan_address: gps?.address ?? null,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
};
```

### Capture GPS then save (using expo-location)

```typescript
import * as Location from 'expo-location';

const captureGPSAndSave = async (imageUrl: string, diseaseId: string) => {
    let gps: { lat: number; lng: number; address: string } | undefined;

    try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
            const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });
            const [place] = await Location.reverseGeocodeAsync({
                latitude:  loc.coords.latitude,
                longitude: loc.coords.longitude,
            });
            const label = [place?.street, place?.district, place?.city, place?.region]
                .filter(Boolean).join(', ');
            gps = {
                lat:     loc.coords.latitude,
                lng:     loc.coords.longitude,
                address: label || 'Unknown location',
            };
        }
    } catch {
        // GPS failed — save scan without location
    }

    return saveScan(imageUrl, diseaseId, 92, gps);
};
```

### Upload a leaf image

```typescript
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

const uploadLeafImage = async (localUri: string, userId: string): Promise<string> => {
    const fileName = `${userId}/${Date.now()}.jpg`;
    const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64,
    });

    const { data, error } = await supabase.storage
        .from('leaf-images')
        .upload(fileName, decode(base64), {
            contentType: 'image/jpeg',
            upsert: false,
        });

    if (error) throw error;

    // Get a public URL (valid for 1 hour)
    const { data: { signedUrl } } = await supabase.storage
        .from('leaf-images')
        .createSignedUrl(fileName, 3600);

    return signedUrl;
};
```

### Create a treatment plan from a scan

```typescript
const createTreatmentPlan = async (scanId: string, diseaseId: string) => {
    // 1. Create the plan
    const { data: plan, error: planError } = await supabase
        .from('treatment_plans')
        .insert({
            scan_id: scanId,
            disease_id: diseaseId,
            fungicide: 'Mancozeb 80WP',
            day_plan: 14,
            start_date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

    if (planError) throw planError;

    // 2. Insert default steps
    await supabase.from('treatment_steps').insert([
        { plan_id: plan.id, step_order: 1, title: 'Initial Application', description: 'First fungicide spray.', status: 'current' },
        { plan_id: plan.id, step_order: 2, title: 'Secondary Spray', description: 'Follow-up spray.', status: 'upcoming', due_date: new Date(Date.now() + 7*864e5).toISOString().split('T')[0] },
        { plan_id: plan.id, step_order: 3, title: 'Observation Period', description: 'Monitor recovery.', status: 'upcoming' },
        { plan_id: plan.id, step_order: 4, title: 'Final Check', description: 'Verify tree health.', status: 'upcoming' },
    ]);

    return plan;
};
```

---

## Summary Checklist

- [ ] Supabase project created (Singapore region)
- [ ] UUID extension enabled
- [ ] All 10 tables created *(scans table includes `scan_lat`, `scan_lng`, `scan_address`)*
- [ ] `diseases` table seeded with 4 known rubber diseases
- [ ] Row Level Security enabled on all tables
- [ ] `leaf-images` storage bucket created
- [ ] `@supabase/supabase-js` installed in Expo project
- [ ] `expo-location` installed (`npx expo install expo-location`)
- [ ] `.env` file created with URL + anon key
- [ ] `.env` added to `.gitignore`
- [ ] `lib/supabase.ts` client file created
- [ ] GPS columns wired into `saveScan()` call from Analysis page
- [ ] Ready to replace [ScanContext](file:///c:/Users/mohda/OneDrive/Documents/Visual%20Studio%20Code/fyp/GETY/context/ScanContext.tsx#77-85) mock data with real Supabase queries
