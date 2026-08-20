# REST API Architecture & Endpoint Specification

## Overview
The Student Placement Portal API follows RESTful principles, utilizing standard HTTP verbs, JSON request/response bodies, clear HTTP status codes, and Bearer Token (JWT in HTTP-only Cookies) authentication.

---

## Standard API Response Envelope

### Success Response Format
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid authentication credentials.",
    "details": []
  }
}
```

---

## Endpoint Groups

### 1. Authentication Endpoints (`/api/auth`)

| Method | Endpoint | Auth | Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | None | Public | Register new Student account |
| `POST` | `/api/auth/login` | None | Public | User login (Student or Admin), returns session cookie/JWT |
| `POST` | `/api/auth/logout` | JWT | Any | Terminate active user session & clear cookies |
| `GET` | `/api/auth/me` | JWT | Any | Get current authenticated user profile & permissions |

---

### 2. Student Management & Profile (`/api/students`)

| Method | Endpoint | Auth | Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/students/profile` | JWT | Student | Fetch student profile, skills, and academic records |
| `PUT` | `/api/students/profile` | JWT | Student | Update student profile, academic info, GitHub/LinkedIn links |
| `POST` | `/api/students/resume` | JWT | Student | Upload new PDF resume (multipart/form-data) |
| `GET` | `/api/students/resumes` | JWT | Student | List uploaded resumes for authenticated student |

---

### 3. Student Application Tracking (`/api/students/applications`)

*Note: The primary workflow is external application redirection. Students manage their personal tracking status for opportunities.*

| Method | Endpoint | Auth | Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/students/applications` | JWT | Student | List student saved and tracked job applications |
| `POST` | `/api/students/applications` | JWT | Student | Save a job opportunity (`INTERESTED`) |
| `PATCH`| `/api/students/applications/:id`| JWT | Student | Update self-recorded status (`INTERESTED`, `APPLIED`, `INTERVIEW`, `SELECTED`, `REJECTED`) |
| `DELETE`| `/api/students/applications/:id`| JWT | Student | Remove saved job opportunity from student list |

#### Sample Request Payload for `PATCH /api/students/applications/:id`:
```json
{
  "status": "APPLIED",
  "notes": "Submitted application via company career portal on 2026-08-20."
}
```

---

### 4. Approved Job Feed Endpoints (`/api/jobs`)

| Method | Endpoint | Auth | Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/jobs` | JWT | Student | Query approved job feed with search, filters & pagination |
| `GET` | `/api/jobs/:id` | JWT | Student | Get comprehensive job details by Canonical Job ID |

---

### 5. Admin Verification Queue & Moderation (`/api/admin/jobs`)

| Method | Endpoint | Auth | Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/jobs/pending` | JWT | Admin | Fetch pending job verification queue |
| `POST` | `/api/admin/jobs/:id/approve` | JWT | Admin | Approve pending job & publish to Student Feed |
| `POST` | `/api/admin/jobs/:id/reject` | JWT | Admin | Reject pending job with reason |
| `PUT` | `/api/admin/jobs/:id` | JWT | Admin | Edit normalized job details before approval |
| `POST` | `/api/admin/jobs/:id/expire` | JWT | Admin | Manually mark an approved job as expired |
| `GET` | `/api/admin/jobs/:id/duplicates`| JWT | Admin | View flagged duplicate job candidates |

---

### 6. Admin Source Management (`/api/admin/sources`)

| Method | Endpoint | Auth | Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/sources` | JWT | Admin | List all registered job source connectors & health status |
| `POST` | `/api/admin/sources` | JWT | Admin | Register new trusted job source configuration |
| `PUT` | `/api/admin/sources/:id` | JWT | Admin | Update job source parameters or scan frequency |
| `PATCH` | `/api/admin/sources/:id/toggle`| JWT | Admin | Enable/disable active background scanning for a source |
| `POST` | `/api/admin/sources/:id/scan-now`| JWT | Admin | Trigger immediate manual scan run for a source |

---

### 7. Admin Scan History & Health (`/api/admin/scans`)

| Method | Endpoint | Auth | Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/scans/history` | JWT | Admin | View background scan execution runs & statistics |
| `GET` | `/api/admin/scans/health` | JWT | Admin | Get source health summary metrics |

---

## Standard Error Codes

| Status Code | Error Code | Description |
| :--- | :--- | :--- |
| `400` | `BAD_REQUEST` | Malformed request body or invalid query syntax. |
| `401` | `UNAUTHORIZED` | Missing, invalid, or expired authentication token. |
| `403` | `FORBIDDEN` | Authenticated user lacks required role. |
| `404` | `NOT_FOUND` | Target entity (Job, Student, Source) does not exist. |
| `422` | `VALIDATION_ERROR` | Request payload failed schema validation. |
| `500` | `INTERNAL_SERVER_ERROR` | Unexpected server error. |
