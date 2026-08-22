# Student Profile & Resume Management Specification (Phase 3)

## Overview
Phase 3 introduces student profile management, academic record tracking, skills taxonomy, professional links validation, and secure PDF resume management for the **Student Placement Portal**.

---

## 1. Database Schemas

### 1.1 `students` Table
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

### 1.2 `resumes` Table
```sql
CREATE TABLE IF NOT EXISTS resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_filename VARCHAR(255) NOT NULL,
  stored_filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100) NOT NULL CHECK (mime_type = 'application/pdf'),
  file_size INTEGER NOT NULL CHECK (file_size > 0 AND file_size <= 5242880),
  is_primary BOOLEAN NOT NULL DEFAULT true,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
```

---

## 2. Security Controls & Validation

- **Identity Derivation**: `user_id` is extracted strictly from the authenticated JWT session (`req.user.id`). Clients cannot submit a foreign `user_id` in request payloads.
- **Academic Validation**:
  - `cgpa`: Must be a numeric value between `0.00` and `10.00`.
  - `active_backlogs`: Non-negative integer (`>= 0`).
  - `github_url`, `linkedin_url`, `portfolio_url`: Verified against strict `http://` or `https://` protocol rules (rejects `javascript:`, data URIs).
- **PDF Upload Security**:
  - **MIME Validation**: Requires `application/pdf`.
  - **Magic-Byte Verification**: Inspects file header buffer to confirm PDF signature (`%PDF-` / `0x25 0x50 0x44 0x46 0x2D`). Spoofed executable or text files renamed with a `.pdf` extension are rejected.
  - **Size Limit**: Enforces a strict 5 MB limit (5,242,880 bytes).
  - **Isolated Storage**: Files are saved with random UUID filenames outside the web root (`backend/uploads/resumes`). Raw server file paths are stripped from client API responses.
- **Cross-Student Isolation**: All resume download and deletion operations enforce server-side ownership checks (`resume.user_id === req.user.id`).

---

## 3. API Endpoint Summary

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/students/profile` | STUDENT | Fetches authenticated student's profile & academic record |
| `PUT` | `/api/students/profile` | STUDENT | Upserts student profile (Identity derived from `req.user.id`) |
| `POST` | `/api/students/resumes` | STUDENT | Uploads PDF resume (Strict MIME & Magic Byte checks) |
| `GET` | `/api/students/resumes` | STUDENT | Lists student's uploaded resumes |
| `DELETE` | `/api/students/resumes/:id` | STUDENT | Deletes resume (Server-side ownership verified) |
| `GET` | `/api/students/resumes/:id/download` | STUDENT | Streams/Downloads PDF resume (Ownership verified) |
