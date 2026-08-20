# Development Roadmap & Milestone Schedule

## Overview
The development lifecycle of the **Student Placement Portal** is structured into 7 distinct sequential phases (Phase 0 through Phase 6). This roadmap ensures that system architecture, security controls, and job aggregation pipelines are thoroughly validated before feature construction begins.

---

## Phase Roadmap Summary

```
Phase 0: Requirements & Technical Blueprint  [COMPLETED]
   │
   ▼
Phase 1: Project Initialization & Core Infrastructure
   │
   ▼
Phase 2: Authentication & Role-Based Access Control (RBAC)
   │
   ▼
Phase 3: Job Aggregation Engine & Connector Development
   │
   ▼
Phase 4: Admin Verification Queue & Moderation Portal
   │
   ▼
Phase 5: Student Portal & Approved Job Feed
   │
   ▼
Phase 6: Security Audit, Testing & Production Deployment
```

---

## Detailed Phase Breakdown

### Phase 0: System Architecture & Technical Blueprint `[COMPLETED]`
- [x] Define functional and non-functional requirements (`docs/requirements.md`).
- [x] Design canonical job data model and job lifecycle state machine (`docs/job-aggregation-design.md`).
- [x] Design connector-based job source architecture and scanner polling scheduler (`docs/job-aggregation-design.md`).
- [x] Design relational database schema and SQL indexing strategy (`docs/database-design.md`).
- [x] Design REST API endpoint specification (`docs/api-design.md`).
- [x] Establish cybersecurity architecture, SSRF defense controls, and outbound URL security (`docs/security-design.md`).
- [x] Finalize technology stack recommendations and scalability blueprint (`docs/architecture.md`).

---

### Phase 1: Core Infrastructure Setup
- [ ] Initialize Node.js + Express backend project structure inside `server/`.
- [ ] Initialize React + Vite frontend project structure inside `client/`.
- [ ] Configure TypeScript, ESLint, and environment variable loaders.
- [ ] Establish PostgreSQL connection pool and ORM database migration pipeline.
- [ ] Create base database tables according to Phase 0 schema design.

---

### Phase 2: Authentication & Security Infrastructure
- [ ] Implement Argon2id / bcrypt password hashing and user credential verification.
- [ ] Implement JWT authentication flow with HTTP-only, SameSite secure cookies.
- [ ] Construct RBAC authorization middleware (`requireRole('STUDENT')`, `requireRole('ADMIN')`).
- [ ] Build student registration, login, logout, and session profile endpoints (`/api/auth`).
- [ ] Build basic authentication UI pages for login and student registration.

---

### Phase 3: Job Aggregation Engine & Connectors
- [ ] Implement `SourceConnector` base contract interface.
- [ ] Implement SSRF Defensive HTTP Fetcher client with URL sanitization and IP checks.
- [ ] Build initial set of 2-3 public API / RSS job source connectors.
- [ ] Build Field Normalization Layer for converting source payloads to canonical format.
- [ ] Implement multi-tiered Duplicate Detection engine (URL hash + exact match + heuristic).
- [ ] Integrate background scan scheduler (`BullMQ` / `node-cron`) with failure isolation.

---

### Phase 4: Admin Verification Queue & Moderation Portal
- [ ] Build Admin Verification Queue backend endpoints (`/api/admin/jobs/pending`).
- [ ] Build Admin Moderation Dashboard UI (Pending Jobs review queue, Approve, Reject, Edit).
- [ ] Implement Source Management UI (View sources, toggle active state, trigger manual scan).
- [ ] Implement Scan History and Source Health monitoring views.
- [ ] Connect audit log system to track all admin moderation decisions.

---

### Phase 5: Student Portal & Approved Job Feed
- [ ] Build Student Job Feed backend query endpoints with search, filter, and pagination.
- [ ] Build responsive Student Job Feed UI with search, work mode filters, and eligibility tags.
- [ ] Build Job Details View displaying complete requirements and direct outbound application button.
- [ ] Implement Student Profile management & PDF resume upload with MIME/byte validation.
- [ ] Implement saved jobs and external application intent tracking.

---

### Phase 6: Testing, Hardening & Production Deployment
- [ ] Execute security test suite (SSRF attempt tests, URL injection, file upload validation).
- [ ] Perform database query performance tuning and verify index execution plans.
- [ ] Conduct end-to-end user workflow testing (Scanner → Queue → Admin Approval → Student Apply).
- [ ] Prepare production deployment configuration and system documentation.
