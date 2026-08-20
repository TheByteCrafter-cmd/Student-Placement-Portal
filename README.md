# Student Placement Portal

A real-time / near-real-time student placement intelligence platform that discovers online job openings from legitimate sources across the web, extracts and normalizes job information, detects duplicates and expired jobs, queues newly discovered jobs in an Admin Verification Queue, and publishes admin-approved opportunities to students while preserving original application links.

---

## 🌟 Key Architecture & Vision

- **Automated Aggregation**: Scheduled near-real-time polling engine scanning job APIs, ATS feeds, company career pages, and public RSS feeds (polling intervals: 15m, 30m, 1h).
- **Decoupled Source Connectors**: Plugin-based `SourceConnector` architecture allowing seamless addition of new job sources without modifying core business logic.
- **Canonical Normalization**: Structural mapping of heterogeneous external job feeds into a standard canonical schema.
- **Multi-Tiered Duplicate Detection**: Automatic exact-match filtering (URL hash + external job ID) and heuristic probable-duplicate flagging.
- **Admin Verification Queue**: Centralized moderation workflow ensuring only verified, high-quality, and active job postings reach students.
- **Preserved Source Attribution**: Outbound application links directly connect students to official employer career pages with SSRF and link sanitization protections.

---

## 🛠️ Technology Stack

- **Frontend**: React (TypeScript + Vite), Vanilla / Modern CSS Modules
- **Backend**: Node.js + Express (TypeScript), RESTful Architecture
- **Database**: PostgreSQL (Prisma ORM / Kysely Query Builder)
- **Scheduler & Queue**: BullMQ + Redis / Asynchronous Worker Pipeline
- **Authentication**: JWT via HTTP-only Cookies, Argon2id / bcrypt Password Hashing
- **Security**: SSRF Defensive Proxy, Outbound URL Protocol Validation, PDF Magic-Byte Upload Verification, Immutable Audit Logging

---

## 📁 Documentation Index (`docs/`)

The technical architecture, data model, API specifications, and security designs are fully documented in the [`docs/`](./docs/) directory:

- 📄 [`docs/requirements.md`](./docs/requirements.md) — Functional/Non-Functional Requirements, User Roles, and Feature Categorization (MUST HAVE, SHOULD HAVE, FUTURE).
- 📄 [`docs/architecture.md`](./docs/architecture.md) — High-Level Topology, Tech Stack Justification, Scalability Blueprint, and Configuration.
- 📄 [`docs/job-aggregation-design.md`](./docs/job-aggregation-design.md) — Source Hierarchy, Connector Contracts, Canonical Data Model, Job Lifecycle State Machine, Duplicate Detection & Expiry Engines.
- 📄 [`docs/database-design.md`](./docs/database-design.md) — Relational PostgreSQL Schema Definitions, Table Relationships, Foreign Keys, and SQL Indexing Strategy.
- 📄 [`docs/api-design.md`](./docs/api-design.md) — REST API Endpoints, HTTP Methods, Payload Schemas, Role Requirements, and Status Error Codes.
- 📄 [`docs/security-design.md`](./docs/security-design.md) — OWASP Defense Strategy, SSRF Proxy Controls, Outbound Link Safety, Resume Upload Security, and Audit Logs.
- 📄 [`docs/phase-roadmap.md`](./docs/phase-roadmap.md) — Phase 0 to Phase 6 Milestone Schedule & Acceptance Criteria.

---

## 🚀 Project Directory Structure

```
F:\Student Placement Portal\
├── .gitignore               # Full-stack Node.js & React gitignore
├── README.md                # Project vision, architecture overview, and index
├── client/                  # Frontend workspace (To be implemented in Phase 1)
│   └── .gitkeep
├── server/                  # Backend workspace (To be implemented in Phase 1)
│   └── .gitkeep
└── docs/                    # Technical architecture & specification blueprints
    ├── architecture.md
    ├── requirements.md
    ├── database-design.md
    ├── api-design.md
    ├── security-design.md
    ├── job-aggregation-design.md
    └── phase-roadmap.md
```

---

## 📅 Roadmap Overview

- [x] **Phase 0: Requirements & Technical Blueprint** — Comprehensive documentation, database schema, security controls, and API specs.
- [ ] **Phase 1: Core Infrastructure Setup** — Node.js & React initial boilerplate, ORM setup, database migrations.
- [ ] **Phase 2: Authentication & RBAC** — User registration, login, JWT HTTP-only cookies, and role guards.
- [ ] **Phase 3: Job Aggregation & Connectors** — Source connector registry, SSRF fetcher, normalization, and duplicate detection.
- [ ] **Phase 4: Admin Moderation Portal** — Verification queue, review actions, source health, and audit trail.
- [ ] **Phase 5: Student Portal & Feed** — Job search, eligibility filtering, profile management, and resume upload.
- [ ] **Phase 6: Hardening & Deployment** — Security auditing, performance tuning, and production launch.
