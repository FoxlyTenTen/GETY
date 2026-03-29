I am building a mobile app called GETY using React Native and Supabase (PostgreSQL). I need you to design a complete database schema and frontend logic based on the following requirements. Do NOT simplify or change the architecture unless absolutely necessary.

## Core Context

This app detects rubber tree disease using a trained AI model and LLM-generated explanations. Users can:

1. Scan a tree and get a diagnosis
2. Save the scan result as history
3. Tag trees with GPS and label
4. Convert a scan into a treatment milestone plan
5. Track treatment progress over time

## Required Database Design

You MUST follow this structure:

### 1. trees

* Represents a physical tree
* A user can have multiple trees
* Fields:

  * id (uuid, PK)
  * user_uid (FK to auth.users)
  * label_name (text)
  * latitude (float)
  * longitude (float)
  * created_at (timestamp)

### 2. scans

* Stores AI diagnosis result snapshot
* One tree can have multiple scans
* Fields:

  * id (uuid, PK)
  * tree_id (FK)
  * disease_name (text, from AI model)
  * disease_description (text, from LLM)
  * image_url (text)
  * recommendation_json (jsonb)
  * confidence_score (0–100 numeric)
  * risk_level (enum: low, medium, high)
  * follow_up_days (int)
  * model_version (text)
  * status (enum: new, converted_to_plan, monitoring, resolved)
  * scanned_at (timestamp)
  * created_at (timestamp)

### 3. treatment_plans

* Created when user taps "Convert to Milestone Plan"
* One scan → one treatment plan
* Fields:

  * id (uuid, PK)
  * scan_id (FK, unique)
  * tree_id (FK)
  * title (text)
  * disease_name (text)
  * estimated_recovery_days (int)
  * overall_progress (0–100)
  * status (enum: active, completed, cancelled)
  * expert_tip (text)
  * created_at
  * updated_at

### 4. treatment_plan_steps

* Stores milestone steps (roadmap)
* One plan → many steps
* Fields:

  * id (uuid, PK)
  * treatment_plan_id (FK)
  * step_order (int)
  * title (text)
  * description (text)
  * status (enum: locked, upcoming, ongoing, completed)
  * progress_percent (0–100)
  * due_date (timestamp)
  * completed_at (timestamp)
  * created_at
  * updated_at

### 5. treatment_step_updates (optional but include)

* Stores history of progress updates
* Fields:

  * id (uuid, PK)
  * treatment_plan_step_id (FK)
  * note (text)
  * image_url (text)
  * progress_percent
  * created_at

## Requirements

### A. SQL

Generate FULL PostgreSQL SQL:

* CREATE TABLE statements
* foreign keys
* constraints (CHECK, UNIQUE)
* indexes
* triggers for updated_at auto-update

### B. Supabase Considerations

* Use uuid with gen_random_uuid()
* Ensure compatibility with Supabase
* Include indexes for performance

### C. Backend Logic (IMPORTANT)

Provide pseudocode or TypeScript-style functions for:

1. saveScanResult()

* create or reuse tree
* insert scan

2. convertScanToMilestone(scan_id)

* create treatment plan
* create default 4 steps:

  * Initial Application (ongoing)
  * Secondary Spray (upcoming)
  * Observation Period (upcoming)
  * Final Assessment (upcoming)
* update scan.status

3. updateStepProgress(step_id)

* mark step completed
* activate next step
* recalculate overall_progress

4. getScanDetail(scan_id)

* return joined data:

  * tree
  * scan
  * treatment_plan (if exists)
  * steps

### D. Recommendation JSON Example

Use this format:

{
"what_to_do_next": [],
"keep_your_farm_safe": [],
"follow_up_action": ""
}

### E. Output Format

Structure your answer into:

1. SQL Schema
2. Indexes & Triggers
3. Backend Logic (functions)
4. Example Data Flow

## Important Constraints

* Keep design SIMPLE but correct
* Avoid unnecessary tables
* Do NOT normalize disease into separate table
* Maintain snapshot-style storage in scans
* Ensure relational integrity

## Goal

The system must support:

* history tracking
* repeated scans per tree
* milestone progress tracking
* real-time UI rendering for roadmap

Now generate the complete solution.
