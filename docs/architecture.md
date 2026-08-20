# High-Level Architecture & Technical Blueprint

## System Overview & Topology

The Student Placement Portal is constructed using a decoupled, tier-based web architecture comprising a Single Page Application (SPA) frontend, a RESTful API backend, a modular Job Aggregation Engine with Node.js-based scheduled execution, and a relational database.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          STUDENT & ADMIN CLIENT                        │
│                     React + TypeScript Single Page App                 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST API (HTTPS)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                           BACKEND API SERVER                           │
│              Node.js + Express + TypeScript Controller Layer           │
│                                                                        │
│  ┌──────────────────────┐ ┌────────────────────┐ ┌──────────────────┐  │
│  │ Auth & RBAC Security │ │ Student Controller │ │ Admin Controller │  │
│  └──────────────────────┘ └────────────────────┘ └──────────────────┘  │
└──────┬────────────────────────────┬─────────────────────────────┬──────┘
       │                            │                             │
       │ ORM / Database Queries     │ Scheduled Polling Exec      │ Audit & Logs
       ▼                            ▼                             ▼
┌──────────────┐            ┌──────────────────────────┐  ┌──────────────┐
│  PostgreSQL  │            │ Node.js Scheduler Engine │  │ Audit Logs   │
│  Database    │            │  (node-cron for MVP)     │  │ Subsystem    │
└──────────────┘            └────────────┬─────────────┘  └──────────────┘
                                         │
                                         ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        BACKGROUND SCAN WORKERS                         │
│                    Source Connector Registry Engine                    │
│                                                                        │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐  │
│  │ Source Connector │    │ Source Connector │    │ Source Connector │  │
│  │     (API A)      │    │     (ATS B)      │    │     (RSS C)      │  │
│  └────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘  │
└───────────┼───────────────────────┼───────────────────────┼────────────┘
            │ Outbound Fetch        │ Outbound Fetch        │ Outbound Fetch
            ▼                       ▼                       ▼
   [Trusted Source API]    [Trusted ATS Feed]      [Trusted RSS Feed]
```

---

## Final Recommended Technology Stack & Justification

| Layer | Recommended Technology | Technical Justification |
| :--- | :--- | :--- |
| **Frontend Framework** | **React + TypeScript** | Fast component-based rendering, state management, strong developer ecosystem, type safety, and responsive UI for student/admin portals. |
| **Backend Runtime** | **Node.js + Express + TypeScript** | Asynchronous I/O ideal for non-blocking HTTP fetching, scheduled worker tasks, structured REST controller pattern, and shared type definitions with the frontend. |
| **Database** | **PostgreSQL** | Robust relational model with ACID compliance, JSONB support for raw source payloads, and rich array indexing (`TEXT[]`) for eligibility & skill arrays. |
| **Authentication** | **Secure Password Hashing + Token/Session Auth** | Argon2id / bcrypt password hashing with JWT in HTTP-only, Secure, SameSite cookies for resilient session management. |
| **Scheduler (MVP)** | **Node.js-based Scheduler (`node-cron` / Task Engine)** | Lightweight, in-process, zero-external-dependency scheduling for per-source scan intervals, timeouts, and retries. |
| **Scheduler (Future)** | **BullMQ + Redis** | Scalable background queue/worker architecture to be introduced when source count, concurrency, or scan volume demands queue isolation. |

---

## Scalability Blueprint (10 → 100+ Sources)

To scale seamlessly from 10 initial job sources to 100+ sources without rewriting core application logic:

1. **Connector Registry Pattern**: New job sources are registered by creating a single connector class implementing `SourceConnector`. Core database engines and API controllers remain untouched.
2. **Scheduler Upgrade Path**: The system starts with a lightweight Node.js scheduler for MVP. When source count and concurrency increase, the scheduler interface seamlessly transitions to a Redis-backed **BullMQ** worker queue architecture without modifying connector implementations.
3. **Database Partitioning & Indexing**: Historical scan logs (`job_source_runs`) and archived jobs are partitioned by date. Trigram indices maintain sub-second search speeds regardless of database growth.
4. **Rate Limit & Circuit Breaker Governance**: Per-source rate limits prevent external IP bans and maintain source health.

---

## Error Handling & Failure Isolation

1. **Source Isolation Boundary**: Every source connector operates inside an isolated execution sandbox. An unhandled exception or parsing failure in Source A will **never** interrupt Source B or crash the main application.
2. **Circuit Breaker Pattern**: If a source encounters 3 consecutive network failures or parsing errors, it transitions to `DEGRADED` status with increased polling intervals.
3. **Structured Global Error Middleware**: Centralized backend error handlers format all exceptions into standard API error envelopes.

---

## Configuration & Environment Variables

Centralized configuration loaded from `.env` files. Real production secrets are never committed to Git:

```env
# Server Config
NODE_ENV=development
PORT=5000
API_BASE_URL=http://localhost:5000

# Database Connection
DATABASE_URL=postgresql://user:password@localhost:5432/placement_portal?schema=public

# Authentication & Security
JWT_SECRET=super-secret-jwt-key-replace-in-production
JWT_EXPIRES_IN=1d
REFRESH_TOKEN_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000

# Scanner Engine Config (MVP Node Scheduler)
DEFAULT_SCAN_INTERVAL_MINUTES=30
MAX_CONCURRENT_SOURCE_SCANS=5
HTTP_SOURCE_TIMEOUT_MS=10000
MAX_SOURCE_REDIRECTS=3

# Optional Future Redis Queue Config
# REDIS_URL=redis://localhost:6379

# File Storage
MAX_FILE_SIZE_BYTES=5242880
UPLOAD_DIR=./uploads/resumes
```
