# Admin Control Center & Moderation Specification (Phase 4)

## Overview
Phase 4 establishes the **Admin Control Center and Job Moderation Infrastructure** for the **Student Placement Portal**. It equips administrators with student management, account activation controls, a job verification queue, approval/rejection workflows with audit trailing, and job source channel configuration.

> [!NOTE]
> *Phase 4 does NOT implement live job aggregation, scrapers, background scanners, or automatic web crawlers.*

---

## 1. Database Schemas

### 1.1 `jobs` Table
```sql
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_job_id VARCHAR(255) NULL,
  company_name VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(255) NOT NULL,
  work_mode VARCHAR(50) NOT NULL DEFAULT 'ON_SITE',
  employment_type VARCHAR(50) NOT NULL DEFAULT 'FULL_TIME',
  salary_package VARCHAR(100) NULL,
  experience_requirement VARCHAR(100) NULL,
  qualification_requirement VARCHAR(255) NULL,
  required_skills TEXT[] NOT NULL DEFAULT '{}',
  preferred_skills TEXT[] NOT NULL DEFAULT '{}',
  branch_eligibility TEXT[] NOT NULL DEFAULT '{}',
  cgpa_requirement NUMERIC(4,2) NULL,
  backlog_requirement INTEGER NULL,
  verification_status VARCHAR(30) NOT NULL DEFAULT 'PENDING_REVIEW' CHECK (verification_status IN ('PENDING_REVIEW', 'APPROVED', 'REJECTED')),
  lifecycle_status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (lifecycle_status IN ('ACTIVE', 'EXPIRED', 'ARCHIVED')),
  publication_status VARCHAR(30) NOT NULL DEFAULT 'HIDDEN' CHECK (publication_status IN ('HIDDEN', 'PUBLISHED')),
  source_name VARCHAR(100) NOT NULL,
  source_type VARCHAR(50) NOT NULL DEFAULT 'CONTROLLED_EXTRACTION',
  source_url VARCHAR(500) NOT NULL,
  apply_url VARCHAR(500) NOT NULL,
  posted_at TIMESTAMPTZ NULL,
  closing_at TIMESTAMPTZ NULL,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ NULL,
  rejection_reason TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_verification ON jobs(verification_status);
CREATE INDEX IF NOT EXISTS idx_jobs_lifecycle ON jobs(lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company_name);
CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs(location);
CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source_name);
CREATE INDEX IF NOT EXISTS idx_jobs_discovered ON jobs(discovered_at DESC);
```

### 1.2 `job_sources` Table
```sql
CREATE TABLE IF NOT EXISTS job_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('API', 'ATS', 'CAREER_PAGE', 'RSS', 'CONTROLLED_EXTRACTION')),
  base_url VARCHAR(500) NOT NULL,
  source_url VARCHAR(500) NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  scan_interval INTEGER NOT NULL DEFAULT 3600,
  priority INTEGER NOT NULL DEFAULT 1,
  last_scan_at TIMESTAMPTZ NULL,
  last_success_at TIMESTAMPTZ NULL,
  last_error_at TIMESTAMPTZ NULL,
  last_error_message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sources_enabled ON job_sources(is_enabled);
```

### 1.3 `audit_logs` Table (Append-Only)
```sql
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
```

---

## 2. Job Moderation Lifecycle & Rules

```
                      ┌────────────────────────────┐
                      │    Job Discovery Record    │
                      └─────────────┬──────────────┘
                                    │
                                    ▼
                      ┌────────────────────────────┐
                      │   PENDING_REVIEW / HIDDEN  │
                      └─────────────┬──────────────┘
                                    │
                     ┌──────────────┴──────────────┐
                     ▼                             ▼
         ┌───────────────────────┐     ┌───────────────────────┐
         │   APPROVED/PUBLISHED  │     │   REJECTED / HIDDEN   │
         │  (Eligible for feed)  │     │   (Reason Required)   │
         └───────────────────────┘     └───────────────────────┘
```

1. **Job Approval (`PATCH /api/admin/jobs/:id/approve`)**:
   - Updates `verification_status = 'APPROVED'`, `publication_status = 'PUBLISHED'`, `verified_by = req.user.id`, and `verified_at = NOW()`.
   - Records an append-only entry in `audit_logs`.
2. **Job Rejection (`PATCH /api/admin/jobs/:id/reject`)**:
   - Requires an explicit `reason` string in body payload.
   - Updates `verification_status = 'REJECTED'`, `publication_status = 'HIDDEN'`, `rejection_reason = reason`, `verified_by = req.user.id`, and `verified_at = NOW()`.
   - Records an append-only entry in `audit_logs`.
3. **Controlled Normalized Field Editing (`PATCH /api/admin/jobs/:id`)**:
   - Allows editing normalized fields: `title`, `company_name`, `description`, `location`, `salary_package`, `required_skills`, `qualification_requirement`, `cgpa_requirement`, `backlog_requirement`.
   - Protects immutable source provenance fields (`source_name`, `source_url`, `apply_url`, `external_job_id`).

---

## 3. API Endpoint Summary

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/dashboard` | ADMIN | Database-backed statistics for students, jobs, sources & activity |
| `GET` | `/api/admin/students` | ADMIN | Paginated student list with search & active status filters |
| `GET` | `/api/admin/students/:id` | ADMIN | Detailed student inspection & resume metadata |
| `PATCH` | `/api/admin/students/:id/status` | ADMIN | Activates or Deactivates student account |
| `GET` | `/api/admin/jobs/pending` | ADMIN | Verification queue of jobs awaiting admin moderation |
| `GET` | `/api/admin/jobs` | ADMIN | Paginated jobs listing filterable by verification status |
| `GET` | `/api/admin/jobs/:id` | ADMIN | Single job opening inspection |
| `PATCH` | `/api/admin/jobs/:id/approve` | ADMIN | Approves job & sets publication status to PUBLISHED |
| `PATCH` | `/api/admin/jobs/:id/reject` | ADMIN | Rejects job with mandatory rejection reason |
| `PATCH` | `/api/admin/jobs/:id` | ADMIN | Edits normalized job fields while preserving source URL |
| `GET` | `/api/admin/sources` | ADMIN | Lists job discovery channels |
| `PATCH` | `/api/admin/sources/:id/status` | ADMIN | Enables or Disables a job source channel |
| `GET` | `/api/admin/audit-logs` | ADMIN | Paginated append-only administrative audit trail |
