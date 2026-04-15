# 🌿 GETY — Supabase Database Setup Guide

Follow these steps **in order** inside the Supabase **SQL Editor**.

> **Supabase Dashboard → Your Project → SQL Editor → New Query**

---

## ⚠️ Important — Two Separate User Systems

Supabase has **two** user tables. Do NOT confuse them:

| Table | Schema | What it does |
|---|---|---|
| `auth.users` | `auth` | Built-in Supabase login system. Controls sign-in. You cannot delete this. |
| `public.users` | `public` | Your custom profile table (full_name, avatar_url, role). Visible in Table Editor. |

Deleting `public.users` does NOT affect login — `auth.users` is always separate and protected.

---

## Step 0 — Create `public.users` Table

Run this **before anything else**. All other tables reference this.

```sql
CREATE TABLE public.users (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name   VARCHAR,
    email       VARCHAR,
    avatar_url  TEXT,
    role        VARCHAR DEFAULT 'user',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own row
CREATE POLICY "users_own" ON public.users FOR ALL
    USING (auth.uid() = id);
```

---

## Step 0b — Auto-Sync Trigger (New Signups → `public.users`)

This trigger fires every time someone registers, and automatically inserts their profile into `public.users`.

```sql
-- The function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, avatar_url, role)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url',
        'user'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old trigger first (avoids "already exists" error)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

> [!NOTE]
> Always run `DROP TRIGGER IF EXISTS` before `CREATE TRIGGER` — if the trigger already exists from a previous run, `CREATE TRIGGER` will error without the drop.

> [!TIP]
> **Existing accounts** created before this trigger was set up won't have a row in `public.users`. Run this to backfill them:
> ```sql
> INSERT INTO public.users (id, email, role)
> SELECT id, email, 'user'
> FROM auth.users
> ON CONFLICT (id) DO NOTHING;
> ```

> [!CAUTION]
> To fully delete a test account and start fresh:
> 1. Go to **Dashboard → Authentication → Users** → Delete the user there (this removes from `auth.users`)
> 2. Then run `DELETE FROM public.users;` in SQL Editor
> The next signup will auto-populate `public.users` via the trigger.

---

## Step 1 — Create ENUM Types

```sql
-- Scan status lifecycle
CREATE TYPE scan_status AS ENUM (
    'new',
    'converted_to_plan',
    'monitoring',
    'resolved'
);

-- Risk level
CREATE TYPE risk_level_type AS ENUM (
    'low',
    'medium',
    'high'
);

-- Treatment plan status
CREATE TYPE plan_status AS ENUM (
    'active',
    'completed',
    'cancelled'
);

-- Treatment step status
CREATE TYPE step_status AS ENUM (
    'locked',
    'upcoming',
    'ongoing',
    'completed'
);
```

---

## Step 2 — Create All Tables

```sql
-- ─────────────────────────────────────────────────────────────────
-- TABLE 1: trees
-- Represents a physical rubber tree tagged by the user
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE trees (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_uid    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    label_name  TEXT NOT NULL,
    latitude    DOUBLE PRECISION,
    longitude   DOUBLE PRECISION,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- TABLE 2: scans
-- Stores AI diagnosis result as a snapshot
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE scans (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tree_id              UUID NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
    disease_name         TEXT NOT NULL,
    disease_description  TEXT,
    image_url            TEXT,
    recommendation_json  JSONB,
    confidence_score     NUMERIC(5,2) CHECK (confidence_score >= 0 AND confidence_score <= 100),
    risk_level           risk_level_type NOT NULL DEFAULT 'low',
    follow_up_days       INT CHECK (follow_up_days > 0),
    model_version        TEXT,
    status               scan_status NOT NULL DEFAULT 'new',
    scanned_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- TABLE 3: treatment_plans
-- Created when user taps "Convert to Milestone Plan"
-- One scan → one plan (UNIQUE on scan_id enforces this)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE treatment_plans (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id                 UUID NOT NULL UNIQUE REFERENCES scans(id) ON DELETE CASCADE,
    tree_id                 UUID NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
    title                   TEXT NOT NULL,
    disease_name            TEXT NOT NULL,
    estimated_recovery_days INT CHECK (estimated_recovery_days > 0),
    overall_progress        NUMERIC(5,2) NOT NULL DEFAULT 0
                            CHECK (overall_progress >= 0 AND overall_progress <= 100),
    status                  plan_status NOT NULL DEFAULT 'active',
    expert_tip              TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- TABLE 4: treatment_plan_steps
-- Milestone roadmap steps (4 default steps per plan)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE treatment_plan_steps (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    treatment_plan_id   UUID NOT NULL REFERENCES treatment_plans(id) ON DELETE CASCADE,
    step_order          INT NOT NULL CHECK (step_order > 0),
    title               TEXT NOT NULL,
    description         TEXT,
    status              step_status NOT NULL DEFAULT 'locked',
    progress_percent    NUMERIC(5,2) NOT NULL DEFAULT 0
                        CHECK (progress_percent >= 0 AND progress_percent <= 100),
    due_date            TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (treatment_plan_id, step_order)
);

-- ─────────────────────────────────────────────────────────────────
-- TABLE 5: treatment_step_updates
-- Logs progress notes and images per step over time
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE treatment_step_updates (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    treatment_plan_step_id  UUID NOT NULL REFERENCES treatment_plan_steps(id) ON DELETE CASCADE,
    note                    TEXT,
    image_url               TEXT,
    progress_percent        NUMERIC(5,2) CHECK (progress_percent >= 0 AND progress_percent <= 100),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Step 3 — Indexes & Auto-Update Triggers

```sql
-- INDEXES
CREATE INDEX idx_trees_user_uid        ON trees(user_uid);
CREATE INDEX idx_scans_tree_id         ON scans(tree_id);
CREATE INDEX idx_scans_status          ON scans(status);
CREATE INDEX idx_treatment_plans_scan  ON treatment_plans(scan_id);
CREATE INDEX idx_steps_plan_order      ON treatment_plan_steps(treatment_plan_id, step_order);
CREATE INDEX idx_step_updates_step_id  ON treatment_step_updates(treatment_plan_step_id);

-- AUTO updated_at TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to users
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Apply to treatment_plans
CREATE TRIGGER trg_treatment_plans_updated_at
    BEFORE UPDATE ON treatment_plans
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Apply to treatment_plan_steps
CREATE TRIGGER trg_plan_steps_updated_at
    BEFORE UPDATE ON treatment_plan_steps
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

---

## Step 4 — Row Level Security (RLS)

> [!IMPORTANT]
> Without RLS, any authenticated user can read ALL rows. This locks each user to their own data only.

```sql
-- Enable RLS on all tables
ALTER TABLE trees                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_plans        ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_plan_steps   ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_step_updates ENABLE ROW LEVEL SECURITY;

-- trees: own rows only
CREATE POLICY "trees_own" ON trees FOR ALL
    USING (auth.uid() = user_uid);

-- scans: only if you own the tree
CREATE POLICY "scans_own" ON scans FOR ALL
    USING (tree_id IN (SELECT id FROM trees WHERE user_uid = auth.uid()));

-- treatment_plans: only if you own the tree
CREATE POLICY "plans_own" ON treatment_plans FOR ALL
    USING (tree_id IN (SELECT id FROM trees WHERE user_uid = auth.uid()));

-- treatment_plan_steps: only if you own the plan
CREATE POLICY "steps_own" ON treatment_plan_steps FOR ALL
    USING (
        treatment_plan_id IN (
            SELECT tp.id FROM treatment_plans tp
            JOIN trees t ON t.id = tp.tree_id
            WHERE t.user_uid = auth.uid()
        )
    );

-- treatment_step_updates: only if you own the step
CREATE POLICY "step_updates_own" ON treatment_step_updates FOR ALL
    USING (
        treatment_plan_step_id IN (
            SELECT s.id FROM treatment_plan_steps s
            JOIN treatment_plans tp ON tp.id = s.treatment_plan_id
            JOIN trees t ON t.id = tp.tree_id
            WHERE t.user_uid = auth.uid()
        )
    );
```

---

## Step 5 — Verify Everything

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Expected output — you should see all **6 tables**:

| table_name |
|---|
| scans |
| treatment_plan_steps |
| treatment_plans |
| treatment_step_updates |
| trees |
| users |

---

## `recommendation_json` Field Format

```json
{
  "what_to_do_next": [
    "Prune infected branches and burn them away from the estate.",
    "Apply copper-based fungicide spray during the next dry spell."
  ],
  "keep_your_farm_safe": [
    { "title": "Water Drainage", "desc": "Ensure good drainage in low-lying areas." },
    { "title": "Tree Spacing",   "desc": "Maintain 5–6 m spacing for airflow." }
  ],
  "follow_up_action": "Scan these trees again in 14 days to monitor healing."
}
```

---

## Backend Function Stubs (TypeScript)

```typescript
import { supabase } from '@/lib/supabase';

// ── 1. Save scan result (create tree if needed) ────────────────────────────
async function saveScanResult(params: {
    userId: string; labelName: string;
    latitude?: number; longitude?: number;
    diseaseName: string; diseaseDescription: string;
    imageUrl?: string; recommendationJson: object;
    confidenceScore: number; riskLevel: 'low' | 'medium' | 'high';
    followUpDays: number; modelVersion?: string;
}) {
    // Find existing tree by label, or create new
    let { data: tree } = await supabase
        .from('trees').select('id')
        .eq('user_uid', params.userId)
        .eq('label_name', params.labelName)
        .maybeSingle();

    if (!tree) {
        const { data } = await supabase.from('trees')
            .insert({ user_uid: params.userId, label_name: params.labelName,
                      latitude: params.latitude, longitude: params.longitude })
            .select().single();
        tree = data;
    }

    const { data: scan } = await supabase.from('scans').insert({
        tree_id: tree!.id,
        disease_name: params.diseaseName,
        disease_description: params.diseaseDescription,
        image_url: params.imageUrl,
        recommendation_json: params.recommendationJson,
        confidence_score: params.confidenceScore,
        risk_level: params.riskLevel,
        follow_up_days: params.followUpDays,
        model_version: params.modelVersion,
        status: 'new',
    }).select().single();

    return scan;
}

// ── 2. Convert scan to 4-step milestone plan ───────────────────────────────
async function convertScanToMilestone(
    scanId: string, treeId: string,
    diseaseName: string, recoveryDays: number
) {
    const addDays = (d: number) =>
        new Date(Date.now() + d * 864e5).toISOString();

    const { data: plan } = await supabase.from('treatment_plans').insert({
        scan_id: scanId, tree_id: treeId,
        title: `${diseaseName} Treatment`, disease_name: diseaseName,
        estimated_recovery_days: recoveryDays, status: 'active',
    }).select().single();

    await supabase.from('treatment_plan_steps').insert([
        { treatment_plan_id: plan!.id, step_order: 1,
          title: 'Initial Application', status: 'ongoing',   due_date: addDays(0) },
        { treatment_plan_id: plan!.id, step_order: 2,
          title: 'Secondary Spray',    status: 'upcoming',   due_date: addDays(Math.floor(recoveryDays * 0.3)) },
        { treatment_plan_id: plan!.id, step_order: 3,
          title: 'Observation Period', status: 'upcoming',   due_date: addDays(Math.floor(recoveryDays * 0.6)) },
        { treatment_plan_id: plan!.id, step_order: 4,
          title: 'Final Assessment',   status: 'locked',     due_date: addDays(recoveryDays) },
    ]);

    await supabase.from('scans')
        .update({ status: 'converted_to_plan' }).eq('id', scanId);

    return plan;
}

// ── 3. Complete a step, activate next, update overall progress ─────────────
async function updateStepProgress(stepId: string, planId: string) {
    await supabase.from('treatment_plan_steps').update({
        status: 'completed', progress_percent: 100,
        completed_at: new Date().toISOString(),
    }).eq('id', stepId);

    const { data: steps } = await supabase
        .from('treatment_plan_steps')
        .select('id, step_order, status')
        .eq('treatment_plan_id', planId)
        .order('step_order');

    const current = steps?.find(s => s.id === stepId);
    const next    = steps?.find(s => s.step_order === (current?.step_order ?? 0) + 1);

    if (next) {
        await supabase.from('treatment_plan_steps')
            .update({ status: 'ongoing' }).eq('id', next.id);
    }

    const total    = steps?.length ?? 0;
    const doneNow  = (steps?.filter(s => s.status === 'completed').length ?? 0) + 1;
    const progress = total > 0 ? Math.round((doneNow / total) * 100) : 0;

    await supabase.from('treatment_plans').update({
        overall_progress: progress,
        status: progress === 100 ? 'completed' : 'active',
    }).eq('id', planId);
}

// ── 4. Fetch full scan detail (tree + scan + plan + steps) ─────────────────
async function getScanDetail(scanId: string) {
    const { data } = await supabase
        .from('scans')
        .select(`
            *,
            tree:trees(*),
            treatment_plans(
                *,
                treatment_plan_steps(* ORDER BY step_order ASC)
            )
        `)
        .eq('id', scanId)
        .single();
    return data;
}
```

---

## Step 6 — Knowledge Base Storage (Admin Feature)

Run these queries to set up the admin knowledge base upload system.

### 6a. Create `knowledge_base_files` Table

```sql
CREATE TABLE knowledge_base_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    uploaded_by UUID REFERENCES auth.users(id),
    uploaded_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_kb_files_uploaded_at ON knowledge_base_files(uploaded_at DESC);

-- Reuses the set_updated_at() function from Step 3
CREATE TRIGGER trg_kb_files_updated_at
    BEFORE UPDATE ON knowledge_base_files
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

### 6b. RLS Policies for `knowledge_base_files`

```sql
ALTER TABLE knowledge_base_files ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admin full access" ON knowledge_base_files
    FOR ALL
    USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

-- All authenticated users can read
CREATE POLICY "Authenticated read" ON knowledge_base_files
    FOR SELECT USING (auth.role() = 'authenticated');
```

### 6c. Create Storage Bucket

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('knowledge-base', 'knowledge-base', false, 10485760, ARRAY['application/pdf', 'text/plain']);
```

### 6d. Storage RLS Policies

```sql
-- Admin can upload
CREATE POLICY "Admin upload KB" ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'knowledge-base' AND EXISTS (
        SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

-- Admin can delete
CREATE POLICY "Admin delete KB" ON storage.objects FOR DELETE
    USING (bucket_id = 'knowledge-base' AND EXISTS (
        SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

-- All authenticated users can read/download
CREATE POLICY "Authenticated download KB" ON storage.objects FOR SELECT
    USING (bucket_id = 'knowledge-base' AND auth.role() = 'authenticated');
```

> [!TIP]
> To make a user an admin: `UPDATE public.users SET role = 'admin' WHERE email = 'your@email.com';`

---

## Step 7 — RAG System (pgvector + Embeddings)

Run these queries to set up the RAG (Retrieval-Augmented Generation) system.

### 7a. Enable pgvector Extension

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 7b. Create `knowledge_base_chunks` Table

```sql
CREATE TABLE knowledge_base_chunks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id     UUID NOT NULL REFERENCES knowledge_base_files(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    embedding   vector(768),
    chunk_index INTEGER NOT NULL,
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vector similarity search index
CREATE INDEX idx_chunks_embedding ON knowledge_base_chunks
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- File lookup index
CREATE INDEX idx_chunks_file_id ON knowledge_base_chunks(file_id);
```

### 7c. Add Processing Columns to `knowledge_base_files`

```sql
ALTER TABLE knowledge_base_files
    ADD COLUMN processing_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed'));

ALTER TABLE knowledge_base_files
    ADD COLUMN processing_error TEXT;

ALTER TABLE knowledge_base_files
    ADD COLUMN chunk_count INTEGER DEFAULT 0;
```

### 7d. RLS for Chunks

```sql
ALTER TABLE knowledge_base_chunks ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read (needed for RAG queries)
CREATE POLICY "Authenticated read chunks" ON knowledge_base_chunks
    FOR SELECT USING (auth.role() = 'authenticated');

-- Service role (Edge Functions) can manage all chunks
CREATE POLICY "Service role manage chunks" ON knowledge_base_chunks
    FOR ALL USING (auth.role() = 'service_role');
```

### 7e. Vector Search Function

```sql
CREATE OR REPLACE FUNCTION match_chunks(
    query_embedding vector(768),
    match_count int DEFAULT 5,
    match_threshold float DEFAULT 0.3
)
RETURNS TABLE (
    id uuid,
    content text,
    chunk_index int,
    metadata jsonb,
    filename text,
    similarity float
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT kbc.id, kbc.content, kbc.chunk_index, kbc.metadata,
           kbf.filename,
           1 - (kbc.embedding <=> query_embedding) AS similarity
    FROM knowledge_base_chunks kbc
    JOIN knowledge_base_files kbf ON kbf.id = kbc.file_id
    WHERE kbf.processing_status = 'completed'
      AND 1 - (kbc.embedding <=> query_embedding) > match_threshold
    ORDER BY kbc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
```

> [!NOTE]
> After running Step 7, deploy the Edge Functions (`process-knowledge-base` and `rag-query`) using the Supabase CLI:
> ```bash
> supabase secrets set GEMINI_API_KEY=your-gemini-api-key
> supabase functions deploy process-knowledge-base
> supabase functions deploy rag-query
> ```

---

## Table Relationships

```
auth.users  (Supabase built-in — controls login)
    │
    └── public.users  (your profile table — synced via trigger)
            │
            ├── trees  (user_uid → public.users.id)
            │       │
            │       └── scans  (tree_id → trees.id)
            │               │
            │               └── treatment_plans  (scan_id, tree_id) [1-to-1 with scan]
            │                           │
            │                           └── treatment_plan_steps  (treatment_plan_id)
            │                                       │
            │                                       └── treatment_step_updates  (treatment_plan_step_id)
            │
            └── knowledge_base_files  (uploaded_by → auth.users.id)  [admin only]
                    ├── Storage: knowledge-base bucket  (PDF/TXT files)
                    └── knowledge_base_chunks  (file_id → knowledge_base_files.id)
                            └── embedding vector(768)  [pgvector, used by RAG queries]
```
