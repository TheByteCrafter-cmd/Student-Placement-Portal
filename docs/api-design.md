# REST API Architecture & Endpoint Specification

## Overview
The Student Placement Portal API follows RESTful principles, utilizing standard HTTP verbs, JSON request/response bodies, clear HTTP status codes, and Bearer Token (JWT in HTTP-only Cookies) authentication.

---

## Standard API Response Envelope

All API endpoints return JSON payloads wrapped in a standard response envelope:

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
| `POST` | `/api/auth/refresh` | Cookie | Any | Refresh expired access token using HTTP-only refresh cookie |

---

### 2. Student Management Endpoints (`/api/students`)

| Method | Endpoint | Auth | Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/students/profile` | JWT | Student | Fetch student profile, skills, and academic records |
| `PUT` | `/api/students/profile` | JWT | Student | Update student profile, academic info, GitHub/LinkedIn links |
| `POST` | `/api/students/resume` | JWT | Student | Upload new PDF resume (multipart/form-data) |
| `GET` | `/api/students/resumes` | JWT | Student | List uploaded resumes for authenticated student |
| `DELETE`| `/api/students/resumes/:id`| JWT | Student | Delete specific uploaded resume |

---

### 3. Public & Approved Job Feed Endpoints (`/api/jobs`)

| Method | Endpoint | Auth | Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/jobs` | JWT | Student | Query approved job feed with search, filters & pagination |
| `GET` | `/api/jobs/:id` | JWT | Student | Get comprehensive job details by Canonical Job ID |
| `POST` | `/api/jobs/:id/save` | JWT | Student | Bookmark/save a job for future reference |
| `DELETE`| `/api/jobs/:id/save` | JWT | Student | Remove saved job bookmark |
| `POST` | `/api/jobs/:id/track-apply`| JWT | Student | Record student intent to apply via outbound source link |

#### Sample Request Query Params for `GET /api/jobs`:
```
GET /api/jobs?search=software&location=Bangalore&work_mode=REMOTE&degree=B.Tech&page=1&limit=20
```

---

### 4. Admin Job Verification Queue Endpoints (`/api/admin/jobs`)

| Method | Endpoint | Auth | Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/jobs/pending` | JWT | Admin | Fetch pending job verification queue |
| `POST` | `/api/admin/jobs/:id/approve` | JWT | Admin | Approve pending job & publish to Student Feed |
| `POST` | `/api/admin/jobs/:id/reject` | JWT | Admin | Reject pending job with reason |
| `PUT` | `/api/admin/jobs/:id` | JWT | Admin | Edit normalized job details before approval |
| `POST` | `/api/admin/jobs/:id/expire` | JWT | Admin | Manually mark an approved job as expired |
| `GET` | `/api/admin/jobs/:id/duplicates`| JWT | Admin | View flagged duplicate job candidates for side-by-side review |

#### Sample Payload for `POST /api/admin/jobs/:id/approve`:
```json
{
  "publish_immediately": true,
  "override_eligibility": {
    "cgpa_cutoff": 7.0,
    "degree_eligibility": ["B.Tech", "MCA"]
  }
}
```

---

### 5. Admin Source Management Endpoints (`/api/admin/sources`)

| Method | Endpoint | Auth | Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/sources` | JWT | Admin | List all registered job source connectors & health status |
| `POST` | `/api/admin/sources` | JWT | Admin | Register new job source configuration |
| `PUT` | `/api/admin/sources/:id` | JWT | Admin | Update job source parameters or scan frequency |
| `PATCH` | `/api/admin/sources/:id/toggle`| JWT | Admin | Enable/disable active background scanning for a source |
| `POST` | `/api/admin/sources/:id/scan-now`| JWT | Admin | Trigger immediate manual scan run for a source |

---

### 6. Admin Scan History & Health Endpoints (`/api/admin/scans`)

| Method | Endpoint | Auth | Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/scans/history` | JWT | Admin | View recent background scan execution runs & statistics |
| `GET` | `/api/admin/scans/health` | JWT | Admin | Get source health summary metrics (healthy/failing counts) |

---

### 7. Audit & Log Endpoints (`/api/admin/audit`)

| Method | Endpoint | Auth | Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/audit/logs` | JWT | Admin | Fetch system audit trail with filtering by action/admin |

---

## Standard Error Codes

| Status Code | Error Code | Description |
| :--- | :--- | :--- |
| `400` | `BAD_REQUEST` | Malformed request body or invalid query syntax. |
| `401` | `UNAUTHORIZED` | Missing, invalid, or expired authentication token. |
| `403` | `FORBIDDEN` | Authenticated user lacks required role (e.g. Student calling Admin route). |
| `404` | `NOT_FOUND` | Target entity (Job, Student, Source) does not exist. |
| `409` | `CONFLICT` | Entity duplicate collision (e.g. email already registered). |
| `422` | `VALIDATION_ERROR` | Request payload failed schema validation checks. |
| `429` | `TOO_MANY_REQUESTS` | Rate limit threshold exceeded. |
| `500` | `INTERNAL_SERVER_ERROR` | Unexpected server error. |
