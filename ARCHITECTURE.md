# GETY — System Architecture Design

## Overview

GETY is a mobile application for detecting rubber tree leaf diseases using AI diagnosis and managing treatment milestones. It follows a **3-tier mobile BFF (Backend-for-Frontend)** architecture.

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MOBILE CLIENT (Expo / React Native)          │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    PRESENTATION LAYER                         │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │                 Navigation (expo-router)                │  │  │
│  │  │                                                        │  │  │
│  │  │   Stack Root (_layout.tsx)                             │  │  │
│  │  │   ├── Auth Screens                                     │  │  │
│  │  │   │   ├── Login                                        │  │  │
│  │  │   │   └── Register                                     │  │  │
│  │  │   ├── Tab Navigator                                    │  │  │
│  │  │   │   ├── Home (index.tsx)                             │  │  │
│  │  │   │   ├── History                                      │  │  │
│  │  │   │   ├── Milestone                                    │  │  │
│  │  │   │   └── Assistant (AI Chat)                          │  │  │
│  │  │   ├── Pages (Modals/Stacked)                           │  │  │
│  │  │   │   ├── ScanPage                                     │  │  │
│  │  │   │   ├── AnalysisPage                                 │  │  │
│  │  │   │   ├── DetailHistoryPage                            │  │  │
│  │  │   │   ├── MilestoneDetailPage                          │  │  │
│  │  │   │   └── TreatmentPage                               │  │  │
│  │  │   └── Admin (Role-gated)                               │  │  │
│  │  │       └── KnowledgeBaseUpload                          │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │                   Shared Components                    │  │  │
│  │  │  AppHeader │ ScanHistoryList │ TreatmentRoadmap        │  │  │
│  │  │  DiseaseProgressCard │ StatsCards │ ProfileSection     │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                   STATE MANAGEMENT LAYER                      │  │
│  │                                                              │  │
│  │   ┌─────────────────────┐   ┌─────────────────────────────┐ │  │
│  │   │    AuthContext       │   │       ScanContext            │ │  │
│  │   │  ─────────────────  │   │  ─────────────────────────  │ │  │
│  │   │  session             │   │  currentScan: ScanResult    │ │  │
│  │   │  user                │   │  history: ScanRecord[]      │ │  │
│  │   │  loading             │   │  saveToHistory()            │ │  │
│  │   │  userRole            │   │  setCurrentScan()           │ │  │
│  │   │  isAdmin             │   │  selectHistoryScan()        │ │  │
│  │   │  signOut()           │   │                             │ │  │
│  │   │  onAuthStateChange() │   │                             │ │  │
│  │   └─────────────────────┘   └─────────────────────────────┘ │  │
│  │                                                              │  │
│  │   Local Component State: loading, filtering, modal toggles   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    DEVICE SERVICES LAYER                      │  │
│  │                                                              │  │
│  │   expo-camera       expo-image-picker     expo-location      │  │
│  │   (Camera capture)  (Gallery upload)      (GPS + geocode)    │  │
│  │                                                              │  │
│  │   AsyncStorage (Session persistence / offline cache)         │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │  HTTPS / REST
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Supabase)                          │
│                                                                     │
│  ┌───────────────────┐   ┌────────────────────────────────────────┐ │
│  │   Supabase Auth   │   │          PostgreSQL Database            │ │
│  │  ───────────────  │   │  ──────────────────────────────────── │ │
│  │  Email/Password   │   │                                        │ │
│  │  JWT Tokens       │   │   users ──────────── trees             │ │
│  │  Session Mgmt     │   │   (1)                (many)            │ │
│  └───────────────────┘   │                         │              │ │
│                           │                      scans             │ │
│  ┌───────────────────┐   │                      (many)            │ │
│  │  Supabase Storage │   │                         │              │ │
│  │  ─────────────── │   │               treatment_plans           │ │
│  │  Scan Images      │   │               (1:1 per scan)           │ │
│  │  (planned)        │   │                         │              │ │
│  │  knowledge-base   │   │               treatment_plan_steps     │ │
│  │  (PDF/TXT, admin) │   │               (many per plan)         │ │
│  └───────────────────┘   │                         │              │ │
│                           │               (many per plan)         │ │
│                           │                         │              │ │
│                           │   diseases   reminders  notifications  │ │
│                           │   ai_requests                          │ │
│                           └────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Core Feature Flows

### 1. Authentication Flow

```
App Launch
    │
    ├── AuthContext checks Supabase session (AsyncStorage)
    │
    ├── [No session] ──→ Login / Register screens
    │                          │
    │                          └──→ Supabase Auth ──→ JWT token
    │                                                    │
    └── [Session valid] ◄───────────────────────────────┘
              │
              └──→ Tab Navigator (Home, History, Milestone, Assistant)
```

### 2. Scan & Diagnosis Flow

```
[ScanPage]
    │
    ├── Camera (expo-camera)        ──→ Image captured
    └── Gallery (expo-image-picker) ──→ Image selected
              │
              ▼
    [AnalysisPage]
    ├── Mockup AI diagnosis (disease_name, confidence_score, risk_level)
    ├── GPS tagging (expo-location + reverse geocode)
    ├── Fungicide recommendation
    └── Save Report
              │
              ▼
    Supabase INSERT:
    ├── trees (get or create by GPS)
    ├── scans (disease, confidence, risk, image_url, GPS)
    └── treatment_plans + treatment_plan_steps (optional)
              │
              ▼
    [DetailHistoryPage] ──→ [MilestoneDetailPage]
```

### 3. Milestone Tracking Flow

```
[MilestonePage]
    │
    └── Supabase: SELECT treatment_plans (active/completed)
              │
              ▼
    [MilestoneDetailPage]
    └── Shows TreatmentRoadmap (step timeline)
              │
              ├── User marks step COMPLETED
              │       │
              │       ├── UPDATE treatment_plan_steps SET status='completed'
              │       ├── Recalculate overall_progress
              │       ├── UPDATE treatment_plans SET overall_progress=X
              │       └── Activate next step
              │
              └── Re-fetch → Re-render
```

### 4. Home Dashboard Load

```
[IndexPage] mounts
    │
    └── useFocusEffect()
          ├── GET user from AuthContext
          ├── SELECT trees WHERE user_uid = user.id
          ├── SELECT scans WHERE tree_id IN (treeIds) ORDER BY scanned_at DESC
          ├── SELECT treatment_plan_steps WHERE status = 'ongoing'
          └── Render:
                ├── Greeting + ProfileSection
                ├── Latest scan card
                ├── Current treatment step
                └── Stats (total scans, high-risk count)
```

---

## Database Schema (Entity Relationship)

```
users (1) ──────────────────────────── trees (many)
  id (PK)                                id (PK)
  full_name                              user_uid (FK → users)
  email                                  label_name
  role                                   latitude, longitude
                                              │
                                         scans (many)
                                           id (PK)
                                           tree_id (FK → trees)
                                           disease_name
                                           confidence_score
                                           risk_level
                                           image_url
                                           recommendation_json
                                           scanned_at
                                              │
                                    treatment_plans (1:1)
                                      id (PK)
                                      scan_id (FK → scans)
                                      tree_id (FK → trees)
                                      status
                                      overall_progress
                                      estimated_recovery_days
                                              │
                              treatment_plan_steps (many)
                                id (PK)
                                plan_id (FK → treatment_plans)
                                step_order
                                title
                                status (pending/ongoing/completed)
                                due_date, completed_at
                                              │
                                         reminders (many)
                                           user_id (FK → users)
                                           step_id (FK → steps)
                                           scheduled_at
                                           is_sent

diseases (lookup)          ai_requests (audit log)
  name (PK)                  id (PK)
  risk_level                 scan_id
  recommended_fungicide      model_version
  prevention_tips            response_json
                             created_at

notifications
  id (PK)
  user_id (FK → users)
  title, message
  is_read, created_at

knowledge_base_files (admin)
  id (PK)
  filename, file_path
  mime_type, file_size
  version
  uploaded_by (FK → auth.users)
```

---

## Component Dependency Tree

```
RootLayout (_layout.tsx)
├── AuthProvider
├── ScanProvider
└── Stack Navigator
    ├── [Auth Group]
    │   ├── login.tsx
    │   └── register.tsx
    ├── [Tabs Group]
    │   ├── AppHeader (shared)
    │   ├── index.tsx
    │   │   ├── ProfileSection
    │   │   ├── ScanCard
    │   │   ├── RecentCard
    │   │   └── HealCard
    │   ├── history.tsx
    │   │   ├── Dashboard (SearchBar)
    │   │   └── ScanHistoryList
    │   │       └── ScanCard (disease, GPS, progress)
    │   ├── milestone.tsx
    │   │   └── MilestoneCard[]
    │   │       ├── DiseaseProgressCard
    │   │       └── MilestoneSegments
    │   └── assistant.tsx
    │       └── Chat UI (skeleton)
    ├── [Pages Group]
    │   ├── scanpage.tsx
    │   ├── analysis.tsx
    │   ├── detail_history.tsx
    │   │   └── TreatmentRoadmap
    │   ├── milestone_detail.tsx
    │   │   ├── MilestoneHeader
    │   │   ├── TreatmentRoadmap
    │   │   ├── StatsCards
    │   │   └── FooterActions
    │   └── treatment.tsx
    └── [Admin Group] (role-gated: admin only)
        └── knowledge-base-upload.tsx
            ├── File picker (expo-document-picker)
            ├── Upload to Supabase Storage
            ├── File list with version badges
            └── Update / Delete actions
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | Expo (React Native) |
| Routing | expo-router (file-based) |
| State Management | React Context API |
| Backend / Auth | Supabase (PostgreSQL + JWT) |
| Local Storage | AsyncStorage |
| Camera | expo-camera |
| Gallery | expo-image-picker |
| Location / GPS | expo-location |
| Icons | @expo/vector-icons (Ionicons, MaterialCommunity) |
| Language | TypeScript |

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| ScanContext (in-memory) + Supabase (DB) hybrid | Supports offline/demo mode while DB provides production persistence |
| useFocusEffect for data fetching | Ensures data re-fetches when navigating back to a screen |
| No Supabase real-time subscriptions | Simpler approach; polling on focus is sufficient for current scale |
| File-based routing (expo-router) | Reduces nav boilerplate, matches Next.js mental model |
| AuthContext wraps entire tree | Every screen has consistent access to user session without prop drilling |

---

## RAG System (AI Assistant)

```
┌─────────────────────────────────────────────────────────────────────┐
│                     ADMIN UPLOAD FLOW                                │
│                                                                     │
│   Admin uploads PDF/TXT                                             │
│         │                                                           │
│         ▼                                                           │
│   Supabase Storage (knowledge-base bucket)                          │
│         │                                                           │
│         ▼                                                           │
│   Edge Function: process-knowledge-base                             │
│   ├── Download file from storage                                    │
│   ├── Extract text (PDF parse / UTF-8)                             │
│   ├── Chunk text (~2000 chars, ~400 overlap)                       │
│   ├── Generate embeddings (Gemini text-embedding-004)              │
│   └── Store in knowledge_base_chunks (pgvector)                    │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                     USER QUERY FLOW                                  │
│                                                                     │
│   User asks question in Assistant tab                               │
│         │                                                           │
│         ▼                                                           │
│   Edge Function: rag-query                                          │
│   ├── Embed question (Gemini text-embedding-004)                   │
│   ├── Vector similarity search (pgvector match_chunks)             │
│   ├── Retrieve top 5 relevant chunks                               │
│   ├── Build prompt: system + context + chat history + question     │
│   ├── Generate answer (Gemini 2.0 Flash)                           │
│   └── Return answer + source citations                             │
│         │                                                           │
│         ▼                                                           │
│   Display in chat UI with source chips                              │
└─────────────────────────────────────────────────────────────────────┘
```

**Key tables**: `knowledge_base_files` (admin uploads) → `knowledge_base_chunks` (embeddings, pgvector)
**Edge Functions**: `process-knowledge-base`, `rag-query`
**APIs used**: Gemini text-embedding-004 (embeddings, 768 dims), Gemini 2.0 Flash (generation)

---

## Planned / Not Yet Implemented

- Real AI model inference for scan diagnosis (currently mockup with random selection)
- Image upload to Supabase Storage (currently stores local URI)
- Push notification delivery (reminders table exists, no push integration)
- Supabase real-time subscriptions
- Full offline mode with sync
