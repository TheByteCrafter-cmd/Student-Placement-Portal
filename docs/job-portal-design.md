# Job Database & Student Job Portal Specification (Phase 5)

## Overview
Phase 5 establishes the **Student-Facing Job Portal & Feed Foundation** for the **Student Placement Portal**. It exposes admin-approved job openings to students, supports keyword search, multi-faceted filtering, sorting, pagination, and provides direct redirection to official employer/source application URLs.

> [!IMPORTANT]
> **Phase 5 does NOT implement live job aggregation, internet scanners, scrapers, background workers, RSS connectors, or automatic web crawlers.**

---

## 1. Job Visibility & Security Rules

To ensure complete data isolation and moderation integrity, student job visibility is enforced **strictly server-side** within API query logic.

A job record is returned to student clients **ONLY** when:
- `verification_status = 'APPROVED'`
- **AND** `publication_status = 'PUBLISHED'`
- **AND** `lifecycle_status = 'ACTIVE'`

> [!WARNING]
> Jobs marked as `PENDING_REVIEW`, `REJECTED`, `HIDDEN`, or `EXPIRED` are **NEVER** returned via `/api/jobs` or `/api/jobs/:id`. Attempting to retrieve a hidden or unapproved job by ID returns `404 Not Found`.

---

## 2. API Endpoints

### 2.1 `GET /api/jobs`
- **Access**: Authenticated Students (`ROLE = STUDENT`)
- **Query Parameters**:
  - `page` (default: `1`)
  - `limit` (default: `20`, max: `100`)
  - `q` / `search` (Search keyword against `title`, `company_name`, `description`, `location`)
  - `company` (Filter by company name)
  - `location` (Filter by location string)
  - `work_mode` (`ON_SITE`, `REMOTE`, `HYBRID`)
  - `employment_type` (`FULL_TIME`, `INTERNSHIP`, `PART_TIME`)
  - `branch` (Filter by branch eligibility)
  - `sort` (`latest`, `oldest`, `company`)
- **Response Format**:
  ```json
  {
    "success": true,
    "data": {
      "jobs": [
        {
          "id": "uuid",
          "company_name": "Nexus Cloud Technologies",
          "title": "Associate Software Engineer",
          "description": "...",
          "location": "Bengaluru",
          "work_mode": "HYBRID",
          "employment_type": "FULL_TIME",
          "salary_package": "12 - 15 LPA",
          "required_skills": ["TypeScript", "React"],
          "source_name": "Tech Openings API Connector",
          "source_url": "https://...",
          "apply_url": "https://..."
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 20,
        "total": 1,
        "totalPages": 1
      }
    }
  }
  ```

### 2.2 `GET /api/jobs/:id`
- **Access**: Authenticated Students (`ROLE = STUDENT`)
- **Description**: Returns detailed job description, qualifications, CGPA requirements, backlog limits, skills tags, and official application URLs for an approved job.

---

## 3. Official Source & Application Redirection Model

- The portal preserves original official employer application URLs (`apply_url`) and source listing URLs (`source_url`).
- When a student clicks **Apply on Official Website**, the application opens `apply_url` in a new browser tab (`target="_blank" rel="noreferrer"`).
- The portal does not submit job applications directly, nor does it claim automatic submission.
- **URL Safety**: All URLs are validated to ensure they use standard `http://` or `https://` protocols before rendering. Unsafe schemes (`javascript:`, `data:`, `file:`) are blocked.

---

## 4. XSS & HTML Safety

- Job descriptions are rendered using safe React text nodes (`whiteSpace: 'pre-line'`).
- Raw HTML rendering (`dangerouslySetInnerHTML`) is strictly avoided to prevent Cross-Site Scripting (XSS) attacks from un-sanitized job descriptions.
