# Student Placement Portal

A real-time / near-real-time student placement intelligence platform that discovers online job openings from legitimate sources across the web, extracts and normalizes job information, detects duplicates and expired jobs, queues newly discovered jobs in an Admin Verification Queue, and publishes admin-approved opportunities to students while preserving original application links.

---

## ⚡ Core Job Intelligence Pipeline

```
Online Sources
      ↓
Near-Real-Time Scanner
      ↓
SourceConnector
      ↓
Normalization
      ↓
Duplicate / Expiry Detection
      ↓
PENDING_REVIEW
      ↓
ADMIN APPROVAL
      ↓
STUDENT PORTAL
      ↓
Official Apply URL
```

---

## 🌟 Key Architecture & Vision

- **Automated Aggregation Engine**: Scheduled near-real-time polling engine scanning job APIs, ATS feeds, company career pages, and public RSS feeds (polling intervals: 15m, 30m, 1h).
- **Decoupled Source Connectors**: Plugin-based `SourceConnector` architecture allowing seamless addition of new job sources without modifying core business logic.
- **Canonical Normalization**: Structural mapping of heterogeneous external job feeds into a standard canonical schema.
- **Multi-Tiered Duplicate Detection**: Automatic exact-match filtering (URL hash + external job ID) and heuristic probable-duplicate flagging.
- **Admin Verification Queue**: Centralized moderation workflow ensuring only verified, high-quality, and active job postings reach students.
- **External Application Redirection**: Students inspect curated listings and click out to the official employer career page to apply directly.
- **Self-Recorded Application Tracking**: Students organize their placement journey by recording self-reported progress (`INTERESTED`, `APPLIED`, `INTERVIEW`, `SELECTED`, `REJECTED`).
- **Strict Security & Source Segregation**: Background scanner ONLY fetches trusted admin-configured sources with SSRF defensive proxy validation. User-submitted URLs are never fetched server-side.

---

## 🛠️ Technology Stack

- **Frontend**: React + TypeScript
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL (Prisma ORM / Kysely Query Builder)
- **Scheduler (MVP)**: Node.js-based Scheduled Task Engine (per-source scheduling, timeouts, retries)
- **Scheduler (Future Scalability)**: BullMQ + Redis background worker queues (optional future architecture option)
- **Authentication**: Secure Password Hashing (Argon2id/bcrypt) + Token/Session-based Auth via HTTP-only Cookies
- **Security**: SSRF Defensive Proxy, Outbound URL Protocol Validation, PDF Magic-Byte Upload Verification, Immutable Audit Logging

---

## 📁 Documentation Index (`docs/`)

The technical architecture, data model, API specifications, and security designs are fully documented in the [`docs/`](./docs/) directory:

- 📄 [`docs/requirements.md`](./docs/requirements.md) — Functional/Non-Functional Requirements, User Roles, and Feature Categorization (MUST HAVE, SHOULD HAVE, FUTURE).
- 📄 [`docs/architecture.md`](./docs/architecture.md) — High-Level Topology, Tech Stack Justification, Scalability Blueprint, and Environment Configuration.
- 📄 [`docs/job-aggregation-design.md`](./docs/job-aggregation-design.md) — Source Hierarchy, Connector Contracts, Canonical Data Model, Job Lifecycle State Machine, Duplicate & Expiry Engines, Node Scheduler MVP.
- 📄 [`docs/database-design.md`](./docs/database-design.md) — Relational PostgreSQL Schema Definitions, Table Relationships, Foreign Keys, Self-Recorded Tracking Statuses, and SQL Indexing Strategy.
- 📄 [`docs/api-design.md`](./docs/api-design.md) — REST API Endpoints, HTTP Methods, Payload Schemas, Role Requirements, and Status Error Codes.
- 📄 [`docs/security-design.md`](./docs/security-design.md) — Trusted vs User URL Segregation, SSRF Proxy Controls, Outbound Link Safety, Resume Upload Security, and Audit Logs.
- 📄 [`docs/phase-roadmap.md`](./docs/phase-roadmap.md) — Complete 21-Phase Master Development Roadmap (Phases 0 through 20).

---

## 📅 21-Phase Development Roadmap

- [x] **Phase 0 — Requirements & Architecture**
- [ ] **Phase 1 — Project Setup**
- [ ] **Phase 2 — Authentication**
- [ ] **Phase 3 — Student Module**
- [ ] **Phase 4 — Admin Module**
- [ ] **Phase 5 — Job Database**
- [ ] **Phase 6 — Real-Time Job Aggregation**
- [ ] **Phase 7 — Extraction & Normalization**
- [ ] **Phase 8 — Duplicate Detection**
- [ ] **Phase 9 — Admin Verification**
- [ ] **Phase 10 — Student Job Portal**
- [ ] **Phase 11 — Eligibility Engine**
- [ ] **Phase 12 — Application Tracking**
- [ ] **Phase 13 — Notifications**
- [ ] **Phase 14 — Expiry & Source Monitoring**
- [ ] **Phase 15 — Recommendations**
- [ ] **Phase 16 — Analytics**
- [ ] **Phase 17 — Security Hardening**
- [ ] **Phase 18 — Testing**
- [ ] **Phase 19 — Deployment**
- [ ] **Phase 20 — Advanced AI Features**
