# Student Profile & Resume Management Specification (Phase 3 Hardened)

## Overview
Phase 3 introduces student profile management, placement academic record tracking, skills taxonomy, professional links validation, profile completion scoring, and secure PDF resume management with primary resume selection for the **Student Placement Portal**.

---

## 1. Database Schemas

### 1.1 `students` Table (Hardened with Placement Fields)
```sql
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  roll_number VARCHAR(50) UNIQUE NOT NULL,
  degree VARCHAR(100) NOT NULL,
  branch VARCHAR(100) NOT NULL,
  graduation_year INTEGER NOT NULL,
  cgpa NUMERIC(4,2) NOT NULL CHECK (cgpa >= 0.00 AND cgpa <= 10.00),
  active_backlogs INTEGER NOT NULL DEFAULT 0 CHECK (active_backlogs >= 0),
  skills TEXT[] NOT NULL DEFAULT '{}',
  phone_number VARCHAR(20) NULL,
  tenth_percentage NUMERIC(5,2) NULL CHECK (tenth_percentage IS NULL OR (tenth_percentage >= 0.00 AND tenth_percentage <= 100.00)),
  twelfth_percentage NUMERIC(5,2) NULL CHECK (twelfth_percentage IS NULL OR (twelfth_percentage >= 0.00 AND twelfth_percentage <= 100.00)),
  diploma_percentage NUMERIC(5,2) NULL CHECK (diploma_percentage IS NULL OR (diploma_percentage >= 0.00 AND diploma_percentage <= 100.00)),
  github_url VARCHAR(500) NULL,
  linkedin_url VARCHAR(500) NULL,
  portfolio_url VARCHAR(500) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_cgpa ON students(cgpa);
CREATE INDEX IF NOT EXISTS idx_students_graduation ON students(graduation_year);
```

### 1.2 `resumes` Table (With Primary Resume Flag)
```sql
CREATE TABLE IF NOT EXISTS resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_filename VARCHAR(255) NOT NULL,
  stored_filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100) NOT NULL CHECK (mime_type = 'application/pdf'),
  file_size INTEGER NOT NULL CHECK (file_size > 0 AND file_size <= 5242880),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
```

---

## 2. Server-Authoritative Profile Completion Score Algorithm

The profile completion score (0% to 100%) is calculated deterministically on the backend using weighted section scores:

- **Personal Information (20%)**: `first_name` (6%), `last_name` (6%), `phone_number` (8%).
- **Academic Information (35%)**: `roll_number` (7%), `degree` (7%), `branch` (7%), `graduation_year` (7%), `cgpa` (7%).
- **Skills (20%)**: At least 1 skill present (20%).
- **Professional Links (10%)**: At least 1 valid link (`github_url` | `linkedin_url` | `portfolio_url`) (10%).
- **Resume (15%)**: At least 1 uploaded PDF resume (15%).

---

## 3. Skills Storage & Architectural Decision
For Phase 3, skills are stored as a clean, structured string array (`TEXT[]` in PostgreSQL / `string[]` in TypeScript). This representation provides high performance, avoids over-engineering in early phases, and seamlessly supports future database index matching.

---

## 4. Security & Production Hardening Notes

- **Mass Assignment Defense**: Endpoints explicitly map allowed body properties (`first_name`, `last_name`, `roll_number`, `phone_number`, percentages, etc.). Client payloads attempting to modify `user_id`, `role`, or `password_hash` are ignored.
- **PDF Magic-Byte Validation**: Inspects file header buffer to confirm PDF signature (`%PDF-` / `0x25 0x50 0x44 0x46 0x2D`). Spoofed executable or text files renamed with a `.pdf` extension are rejected.
- **Protected File Access**: Direct static file access via `/uploads/resumes/<filename>` is prohibited. Resumes are stored outside public web root and served exclusively through protected authenticated endpoints (`GET /api/students/resumes/:id`) with ownership checks.
- **Future Security Note**: *Malware / antivirus scanning is a future production-hardening enhancement.*

---

## 5. API Endpoint Summary

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/students/profile` | STUDENT | Fetches authenticated student's profile & completion score |
| `PUT` | `/api/students/profile` | STUDENT | Upserts student profile & placement academic fields |
| `POST` | `/api/students/resumes` | STUDENT | Uploads PDF resume (Enforces 5MB limit & magic-bytes) |
| `GET` | `/api/students/resumes` | STUDENT | Lists student's uploaded resumes |
| `PATCH` | `/api/students/resumes/:id/primary` | STUDENT | Sets specified resume as Primary resume |
| `GET` | `/api/students/resumes/:id` | STUDENT | Streams/Downloads PDF resume (Ownership verified) |
| `DELETE` | `/api/students/resumes/:id` | STUDENT | Deletes resume (Server-side ownership verified) |
