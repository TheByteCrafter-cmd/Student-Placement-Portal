# Authentication & Role-Based Access Control Specification (Phase 2)

## Overview
Phase 2 establishes the core authentication and authorization architecture for the **Student Placement Portal**. It delivers secure, role-restricted user authentication for **STUDENT** and **ADMIN** roles using bcrypt password hashing, JWT token transport in HTTP-only cookies, strict endpoint rate limiting, and RBAC authorization middleware.

---

## 1. Supported Roles & Segregation

```
                          ┌──────────────────────────┐
                          │   Authentication Entry   │
                          └─────────────┬────────────┘
                                        │
                         ┌──────────────┴──────────────┐
                         ▼                             ▼
              ┌─────────────────────┐       ┌─────────────────────┐
              │    STUDENT Role     │       │     ADMIN Role      │
              ├─────────────────────┤       ├─────────────────────┤
              │ • Public Register   │       │ • Bootstrapped via  │
              │ • Access /student/* │       │   Environment Vars  │
              │ • Blocked /admin/*  │       │ • Access /admin/*   │
              │                     │       │ • Blocked /student/*│
              └─────────────────────┘       └─────────────────────┘
```

1. **STUDENT**: Created via public registration (`POST /api/auth/register`). Client attempts to supply `role = ADMIN` are strictly overridden and ignored.
2. **ADMIN**: Bootstrapped securely via environment variables (`ADMIN_EMAIL`, `ADMIN_PASSWORD`). Unauthenticated public admin registration is strictly prohibited.

---

## 2. Admin Account Bootstrap Strategy

Admin accounts are created securely via environment variable configuration without hardcoded secrets:

1. Copy `.env.example` to `.env`.
2. Set your target `ADMIN_EMAIL` (e.g. `admin@institution.edu`).
3. Set a strong `ADMIN_PASSWORD` (min 8 characters).
4. On server start, the system reads `ADMIN_EMAIL` and `ADMIN_PASSWORD`. If no admin account exists for that email, it hashes the password securely using bcrypt and bootstraps the admin account.
5. If an admin account already exists, the bootstrap process does nothing (existing passwords are never overwritten or logged).

---

## 3. Security & Token Strategy

- **Password Hashing**: `bcryptjs` with cost factor 12. Plaintext passwords are never stored, logged, or returned in API payloads.
- **Session Transport**: JWT access tokens stored in **HTTP-only, Secure, SameSite=Lax** cookies (`access_token`).
- **Token Claims**: Contains `id`, `email`, `role`, signed with `JWT_SECRET`, issuing `issuer` (`student-placement-portal`), and `audience` (`placement-portal-users`).
- **Error Enumeration Defense**: Login failures return generic `"Invalid email or password"` responses to prevent account enumeration.
- **Rate Limiting**: Auth endpoints (`/login`, `/register`) enforced with `express-rate-limit` (30 requests / 15 mins).

---

## 4. Database Schema (`users` table)

```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('STUDENT', 'ADMIN')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
```

---

## 5. API Endpoint Summary

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Student account registration (Forces `role = STUDENT`) |
| `POST` | `/api/auth/login` | Public | User authentication for Student and Admin |
| `POST` | `/api/auth/logout` | Any | Clears HTTP-only `access_token` session cookie |
| `GET` | `/api/auth/me` | Authenticated | Returns current authenticated user profile |
| `GET` | `/api/student/test` | STUDENT Only | Demonstration RBAC route (Returns 403 for Admin) |
| `GET` | `/api/admin/test` | ADMIN Only | Demonstration RBAC route (Returns 403 for Student) |
