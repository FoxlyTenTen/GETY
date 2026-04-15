╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ Admin Knowledge Base Upload Page — Implementation Plan                                                                
  
 Context

 GETY needs an admin page for uploading disease knowledge base files (PDF/TXT) to Supabase Storage. This supports the  
 AI assistant's disease detection by providing a managed, versioned knowledge base. Currently no admin features,       
 role-based access, or file upload exist in the app.

 Actual DB state: public.users.role is VARCHAR DEFAULT 'user' (not an ENUM). The auto-sync trigger sets role to 'user' 
  for new signups. To make someone an admin, manually UPDATE public.users SET role = 'admin' WHERE email = '...'.      

 ---
 Files to Create/Modify

 ┌─────────────────────────────────────┬────────┬───────────────────────────────────────────────────┐
 │                File                 │ Action │                      Purpose                      │
 ├─────────────────────────────────────┼────────┼───────────────────────────────────────────────────┤
 │ lib/supabase.ts                     │ Modify │ Add KB type + 4 helper functions                  │
 ├─────────────────────────────────────┼────────┼───────────────────────────────────────────────────┤
 │ context/AuthContext.tsx             │ Modify │ Add userRole + isAdmin to context                 │
 ├─────────────────────────────────────┼────────┼───────────────────────────────────────────────────┤
 │ app/admin/_layout.tsx               │ Create │ Admin route guard layout                          │
 ├─────────────────────────────────────┼────────┼───────────────────────────────────────────────────┤
 │ app/admin/knowledge-base-upload.tsx │ Create │ Main admin upload page                            │
 ├─────────────────────────────────────┼────────┼───────────────────────────────────────────────────┤
 │ app/(tabs)/index.tsx                │ Modify │ Add conditional admin nav button                  │
 ├─────────────────────────────────────┼────────┼───────────────────────────────────────────────────┤
 │ ARCHITECTURE.md                     │ Modify │ Add admin route + KB storage to architecture docs │
 └─────────────────────────────────────┴────────┴───────────────────────────────────────────────────┘

 ---
 Step 1: Install Dependencies

 npx expo install expo-document-picker expo-file-system

 ---
 Step 2: Supabase Setup (SQL — run in Supabase SQL Editor)

 2a. knowledge_base_files table

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

 -- Auto update timestamp
 CREATE TRIGGER trg_kb_files_updated_at
     BEFORE UPDATE ON knowledge_base_files
     FOR EACH ROW EXECUTE FUNCTION set_updated_at();

 ▎ Note: set_updated_at() function already exists from Step 3 of SupabaseSetupGuide.md.

 2b. RLS Policies

 ALTER TABLE knowledge_base_files ENABLE ROW LEVEL SECURITY;

 -- Admins can do everything (role is VARCHAR, check = 'admin')
 CREATE POLICY "Admin full access" ON knowledge_base_files
     FOR ALL
     USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'))
     WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

 -- All authenticated users can read
 CREATE POLICY "Authenticated read" ON knowledge_base_files
     FOR SELECT USING (auth.role() = 'authenticated');

 2c. Storage Bucket + Policies

 INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
 VALUES ('knowledge-base', 'knowledge-base', false, 10485760, ARRAY['application/pdf', 'text/plain']);

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

 ---
 Step 3: Modify context/AuthContext.tsx

 Add role awareness to the existing auth context:

 - Add userRole: string | null and isAdmin: boolean to AuthContextType
 - After session loads in the existing useEffect, query: supabase.from('users').select('role').eq('id',
 session.user.id).maybeSingle()
 - Do same inside onAuthStateChange callback
 - Reset userRole to null on sign out
 - Expose userRole and isAdmin in context value

 This follows the same pattern already used in app/(tabs)/index.tsx lines ~56-66 where the app queries
 users.full_name.

 ---
 Step 4: Modify lib/supabase.ts

 Add after the existing supabase client export:

 Type:
 export type KnowledgeBaseFile = {
     id: string; filename: string; file_path: string;
     file_size: number | null; mime_type: string; version: number;
     uploaded_by: string | null; uploaded_at: string; updated_at: string;
 };

 Functions:
 1. uploadKnowledgeBaseFile(fileUri, filename, mimeType, fileSize) — fetch(fileUri).blob() →
 supabase.storage.from('knowledge-base').upload(path, blob) → insert metadata row → return row
 2. getKnowledgeBaseFiles() — select all ordered by uploaded_at DESC
 3. deleteKnowledgeBaseFile(fileId, filePath) — delete storage object + DB row
 4. updateKnowledgeBaseFile(fileId, fileUri, filename, mimeType, fileSize, currentFilePath) — delete old storage file, 
  upload new, update DB row with version + 1

 ---
 Step 5: Create app/admin/_layout.tsx

 Route guard layout:
 - Uses useAuth() to check isAdmin
 - Redirects non-admins → /(tabs), unauthenticated → /auth/login
 - Shows ActivityIndicator while loading
 - Renders <Stack> for child routes

 Expo Router auto-discovers app/admin/ — no changes needed to root _layout.tsx.

 ---
 Step 6: Create app/admin/knowledge-base-upload.tsx

 UI structure:
 - SafeAreaView + ScrollView
 - Header with back button + "Knowledge Base" title
 - Upload section: file picker button → selected file preview (name, size, type) → upload button with
 ActivityIndicator
 - Files list: FlatList of file cards with:
   - File icon (PDF/TXT), filename, version badge ("v3")
   - Upload date, file size
   - Update button (re-upload → version bump) + Delete button (with Alert confirmation)
 - Empty state when no files

 Key logic:
 - DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'text/plain'] })
 - Client-side 10MB size validation
 - Upload progress: indeterminate ActivityIndicator (Supabase SDK has no progress callbacks)
 - useFocusEffect to refresh file list on screen focus

 Styling: Match existing design — #1e5b43 green, #f8faf9 background, borderRadius: 24 cards, Ionicons

 ---
 Step 7: Modify app/(tabs)/index.tsx

 Add conditional admin button visible only when isAdmin:
 {isAdmin && (
     <TouchableOpacity onPress={() => router.push('/admin/knowledge-base-upload')}>
         <Ionicons name="cloud-upload-outline" /> Knowledge Base
     </TouchableOpacity>
 )}

 Place in the Quick Actions area or similar prominent location.

 ---
 Step 8: Update ARCHITECTURE.md

 Add to the navigation tree:
 ├── [Admin Group]
 │   └── knowledge-base-upload.tsx (role-gated)

 Add to Backend section:
 Supabase Storage:
 ├── knowledge-base bucket (PDF/TXT, admin-only upload)

 Add knowledge_base_files to the database schema section.

 Add to AuthContext box: userRole, isAdmin.

 ---
 Implementation Order

 1. Install expo-document-picker + expo-file-system
 2. Run SQL in Supabase (table, triggers, RLS, bucket, storage policies)
 3. Modify context/AuthContext.tsx — add role fetching
 4. Modify lib/supabase.ts — add type + 4 helper functions
 5. Create app/admin/_layout.tsx — route guard
 6. Create app/admin/knowledge-base-upload.tsx — full UI
 7. Modify app/(tabs)/index.tsx — admin nav button
 8. Update ARCHITECTURE.md — document new feature

 ---
 Verification

 1. Set test user as admin: UPDATE public.users SET role = 'admin' WHERE email = '<your-email>';
 2. Log in → verify "Knowledge Base" button shows on home page
 3. Navigate to admin page → pick PDF → upload → verify in file list
 4. Try TXT file > 10MB → verify rejection
 5. Update existing file → verify version increments to v2
 6. Delete a file → verify removed from list and Supabase Storage
 7. Log in as normal user → verify admin button hidden and /admin/ redirects to home
 8. Check Supabase dashboard: knowledge_base_files table has rows, knowledge-base bucket has files