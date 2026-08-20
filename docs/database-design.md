# Database Design & Relational Schema Specification

## Overview
The Student Placement Portal relies on a structured relational database model (PostgreSQL recommended). The schema enforces data integrity, role-based segregation, auditability, efficient job deduplication, and fast query execution for student search and administrative moderation.

---

## Entity Relationship Overview

```
   ┌─────────────┐       1:1       ┌─────────────┐
   │    users    │ ─────────────── │  students   │
   └─────────────┘                 └─────────────┘
          │                               │ 1:N
          │ 1:1                           ▼
          │                        ┌─────────────┐
          │                        │   resumes   │
          ▼                        └─────────────┘
   ┌─────────────┐                        │ 1:N
   │   admins    │                        ▼
   └─────────────┘                 ┌─────────────┐
          │                        │ applications│
          │ 1:N (Verifies)         └─────────────┘
          ▼                               │
   ┌─────────────┐                        │ N:1
   │    jobs     │ ◄──────────────────────┘
   └─────────────┘
          ▲
          │ N:1
   ┌─────────────┐       1:N       ┌──────────────────┐
   │ job_sources │ ─────────────── │ job_source_runs  │
   └─────────────┘                 └──────────────────┘
          │ 1:N
          ▼
   ┌─────────────────┐
   │ job_duplicates  │
   └─────────────────┘
```

---

## Detailed Schema Definitions

### 1. `users`
**Purpose**: Central authentication table storing core credentials and system roles.

| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Unique user identifier |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | Account login email |
| `password_hash` | VARCHAR(255) | NOT NULL | Argon2 / bcrypt hashed password |
| `role` | VARCHAR(20) | NOT NULL, CHECK (`role IN ('STUDENT', 'ADMIN')`) | User system role |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT `true` | Account status flag |
| `email_verified` | BOOLEAN | NOT NULL, DEFAULT `false` | Email verification state |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Record update timestamp |

---

### 2. `students`
**Purpose**: Profile, academic records, and professional details for student users.

| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Profile record ID |
| `user_id` | UUID | UNIQUE, NOT NULL, FK → `users(id)` ON DELETE CASCADE | Associated user account |
| `first_name` | VARCHAR(100) | NOT NULL | First name |
| `last_name` | VARCHAR(100) | NOT NULL | Last name / surname |
| `roll_number` | VARCHAR(50) | UNIQUE, NOT NULL | Institution student ID |
| `degree` | VARCHAR(100) | NOT NULL | e.g. "B.Tech", "MCA" |
| `branch` | VARCHAR(100) | NOT NULL | e.g. "Computer Science", "ECE" |
| `graduation_year`| INTEGER | NOT NULL | Expected graduation year |
| `cgpa` | NUMERIC(4,2)| NOT NULL | Cumulative Grade Point Average |
| `active_backlogs`| INTEGER | NOT NULL, DEFAULT `0` | Count of active backlogs |
| `skills` | TEXT[] | NOT NULL, DEFAULT `{}` | Array of skill strings |
| `github_url` | VARCHAR(500) | NULL | Verified GitHub profile URL |
| `linkedin_url` | VARCHAR(500) | NULL | Verified LinkedIn profile URL |
| `portfolio_url` | VARCHAR(500) | NULL | Personal website URL |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Profile creation date |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Profile update date |

---

### 3. `admins`
**Purpose**: Administrator profile details and institutional permissions.

| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Admin record ID |
| `user_id` | UUID | UNIQUE, NOT NULL, FK → `users(id)` ON DELETE CASCADE | Associated user account |
| `full_name` | VARCHAR(150) | NOT NULL | Admin full name |
| `department` | VARCHAR(100) | NOT NULL | e.g. "Training & Placement Cell" |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Record creation date |

---

### 4. `job_sources`
**Purpose**: Registry of web job sources, APIs, RSS feeds, and connector configurations.

| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Source identifier |
| `name` | VARCHAR(150) | UNIQUE, NOT NULL | Source display name |
| `source_type` | VARCHAR(30) | NOT NULL | `API`, `ATS`, `RSS`, `WEB_EXTRACTION` |
| `base_url` | VARCHAR(500) | NOT NULL | Target base URL / endpoint |
| `connector_class`| VARCHAR(100)| NOT NULL | Internal handler connector name |
| `scan_interval_min`| INTEGER | NOT NULL, DEFAULT `30` | Polling frequency in minutes |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT `true` | Active scanning switch |
| `health_status` | VARCHAR(20) | NOT NULL, DEFAULT `'HEALTHY'` | `HEALTHY`, `DEGRADED`, `FAILING` |
| `last_successful_scan`| TIMESTAMPTZ| NULL | Timestamp of last clean scan |
| `consecutive_failures`| INTEGER | NOT NULL, DEFAULT `0` | Failure tracker counter |
| `config` | JSONB | NOT NULL, DEFAULT `'{}'` | Headers, selectors, key params |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Record creation date |

---

### 5. `job_source_runs`
**Purpose**: Execution history and performance log for every background scan run.

| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Scan run ID |
| `source_id` | UUID | NOT NULL, FK → `job_sources(id)` ON DELETE CASCADE | Associated source |
| `status` | VARCHAR(20) | NOT NULL | `RUNNING`, `COMPLETED`, `FAILED` |
| `started_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Scan start timestamp |
| `ended_at` | TIMESTAMPTZ | NULL | Scan finish timestamp |
| `jobs_discovered`| INTEGER | NOT NULL, DEFAULT `0` | Raw jobs retrieved count |
| `jobs_added` | INTEGER | NOT NULL, DEFAULT `0` | New jobs added to review queue |
| `duplicates_found`| INTEGER | NOT NULL, DEFAULT `0` | Duplicate jobs detected count |
| `error_message` | TEXT | NULL | Execution error message if failed |

---

### 6. `jobs`
**Purpose**: Central canonical job postings table.

| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Canonical Job ID |
| `external_job_id`| VARCHAR(255)| NOT NULL | Source-provided job ID |
| `source_id` | UUID | NOT NULL, FK → `job_sources(id)` | Originating job source |
| `company_name` | VARCHAR(200) | NOT NULL | Standardized company name |
| `title` | VARCHAR(200) | NOT NULL | Standardized job title |
| `description` | TEXT | NOT NULL | Clean job description |
| `location` | VARCHAR(200) | NOT NULL | Primary work location |
| `work_mode` | VARCHAR(20) | NOT NULL, DEFAULT `'UNSPECIFIED'` | `REMOTE`, `HYBRID`, `ON_SITE` |
| `employment_type`| VARCHAR(30) | NOT NULL, DEFAULT `'FULL_TIME'` | `FULL_TIME`, `INTERNSHIP`, etc. |
| `salary_package` | VARCHAR(100) | NULL | Compensation info |
| `min_experience_years`| NUMERIC(3,1)| DEFAULT `0` | Minimum experience required |
| `degree_eligibility`| TEXT[] | DEFAULT `{}` | Eligible degree programs |
| `cgpa_cutoff` | NUMERIC(4,2)| NULL | Minimum required CGPA |
| `max_backlogs` | INTEGER | NULL | Maximum backlogs allowed |
| `required_skills`| TEXT[] | DEFAULT `{}` | Required skills array |
| `original_source_url`| TEXT | NOT NULL | Original listing URL |
| `apply_url` | TEXT | NOT NULL | Official application submission URL |
| `url_hash` | VARCHAR(64) | NOT NULL | SHA-256 hash of normalized apply URL |
| `posted_date` | TIMESTAMPTZ | NULL | Employer publication date |
| `closing_date` | TIMESTAMPTZ | NULL | Application deadline |
| `status` | VARCHAR(30) | NOT NULL, DEFAULT `'PENDING_REVIEW'`| `PENDING_REVIEW`, `APPROVED`, etc. |
| `verified_by_admin_id`| UUID| NULL, FK → `admins(id)` | Admin moderator ID |
| `verified_at` | TIMESTAMPTZ | NULL | Verification timestamp |
| `rejection_reason`| TEXT | NULL | Reason if rejected |
| `first_discovered_at`| TIMESTAMPTZ| NOT NULL, DEFAULT `NOW()` | Initial discovery date |
| `last_checked_at` | TIMESTAMPTZ| NOT NULL, DEFAULT `NOW()` | Last active health scan date |
| `expired_at` | TIMESTAMPTZ | NULL | Timestamp when marked expired |

---

### 7. `job_duplicates`
**Purpose**: Relationship tracking for probable or exact duplicate jobs across sources.

| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Record ID |
| `canonical_job_id`| UUID | NOT NULL, FK → `jobs(id)` ON DELETE CASCADE | Primary canonical job record |
| `duplicate_job_id`| UUID | NOT NULL, FK → `jobs(id)` ON DELETE CASCADE | Duplicate candidate job record |
| `confidence_score`| NUMERIC(5,2)| NOT NULL | Match percentage (0.00 to 100.00) |
| `match_reason` | VARCHAR(100)| NOT NULL | e.g. "URL_HASH_MATCH", "HEURISTIC" |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT `'FLAGGED'` | `FLAGGED`, `MERGED`, `DISMISSED` |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Flagged date |

---

### 8. `resumes`
**Purpose**: PDF resume metadata and file storage references for students.

| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Resume identifier |
| `student_id` | UUID | NOT NULL, FK → `students(id)` ON DELETE CASCADE | Student owner |
| `file_name` | VARCHAR(255) | NOT NULL | Original uploaded filename |
| `storage_path` | VARCHAR(500) | NOT NULL | Encrypted storage path / S3 key |
| `file_size_bytes`| INTEGER | NOT NULL | File size in bytes |
| `mime_type` | VARCHAR(100) | NOT NULL, CHECK (`mime_type = 'application/pdf'`) | Strictly PDF MIME |
| `is_primary` | BOOLEAN | NOT NULL, DEFAULT `true` | Primary default resume flag |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Upload date |

---

### 9. `applications`
**Purpose**: Local intent tracking for student job applications.

| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Tracker ID |
| `student_id` | UUID | NOT NULL, FK → `students(id)` ON DELETE CASCADE | Student applicant |
| `job_id` | UUID | NOT NULL, FK → `jobs(id)` ON DELETE CASCADE | Target job |
| `status` | VARCHAR(30) | NOT NULL, DEFAULT `'SAVED'` | `SAVED`, `APPLIED_EXTERNAL` |
| `applied_at` | TIMESTAMPTZ | NULL | Timestamp student marked applied |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Record created date |

---

### 10. `audit_logs`
**Purpose**: Security audit trail tracking all administrative moderation actions and critical events.

| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Log ID |
| `user_id` | UUID | NULL, FK → `users(id)` ON DELETE SET NULL | Performing user ID |
| `action` | VARCHAR(100) | NOT NULL | e.g., `JOB_APPROVE`, `JOB_REJECT` |
| `target_entity` | VARCHAR(50) | NOT NULL | e.g., `jobs`, `job_sources` |
| `target_id` | UUID | NULL | ID of entity acted upon |
| `ip_address` | INET | NULL | Client IP address |
| `user_agent` | TEXT | NULL | Browser / client identifier |
| `metadata` | JSONB | DEFAULT `'{}'` | Additional action payload details |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Audit entry timestamp |

---

## Indexing Strategy & Performance Tuning

To ensure sub-second query performance for student feeds and background scanner lookup:

```sql
-- Fast student feed filtering by status, location, work mode, and publication date
CREATE INDEX idx_jobs_student_feed ON jobs (status, posted_date DESC) WHERE status = 'APPROVED';

-- Quick duplicate check lookup using URL Hash
CREATE INDEX idx_jobs_url_hash ON jobs (url_hash);

-- Fast lookup for scanner existing job check
CREATE INDEX idx_jobs_external_source ON jobs (source_id, external_job_id);

-- Filter jobs by company name and title (trigram index for fast fuzzy searching)
CREATE INDEX idx_jobs_company_trgm ON jobs USING gin (company_name gin_trgm_ops);
CREATE INDEX idx_jobs_title_trgm ON jobs USING gin (title gin_trgm_ops);

-- Quick filtering of pending jobs for Admin review queue
CREATE INDEX idx_jobs_pending_queue ON jobs (status, first_discovered_at ASC) WHERE status = 'PENDING_REVIEW';

-- Audit log indexing
CREATE INDEX idx_audit_logs_user_action ON audit_logs (user_id, action, created_at DESC);
```
