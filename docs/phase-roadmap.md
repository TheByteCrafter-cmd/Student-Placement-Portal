# Development Roadmap & Milestone Schedule

## Overview
The development lifecycle of the **Student Placement Portal** is structured into 21 distinct sequential phases (Phase 0 through Phase 20). This roadmap ensures that system architecture, security controls, and job aggregation pipelines are thoroughly validated before feature construction begins.

---

## 21-Phase Master Roadmap

- [x] **Phase 0 — Requirements & Architecture**: Define system vision, functional/non-functional requirements, technical blueprints, canonical data models, security controls, database schema, API specifications, and roadmap.
- [ ] **Phase 1 — Project Setup**: Initialize repository structure, Node.js + Express backend setup, React + TypeScript frontend setup, linting, and environment config.
- [ ] **Phase 2 — Authentication**: Password hashing (Argon2id/bcrypt), JWT token/session authentication with HTTP-only cookies, and RBAC authorization guards (`STUDENT`, `ADMIN`).
- [ ] **Phase 3 — Student Module**: Student profile management, academic records (degree, CGPA, backlogs), skill showcase, GitHub/LinkedIn links, and resume upload.
- [ ] **Phase 4 — Admin Module**: Admin authentication, departmental credentials, management dashboard, and institutional controls.
- [ ] **Phase 5 — Job Database**: PostgreSQL relational schema migrations, canonical job model, indexes, and source registry tables.
- [ ] **Phase 6 — Real-Time Job Aggregation**: Modular connector-based source architecture (`SourceConnector` contract), Node.js-based scanner engine with configurable intervals (15m, 30m, 1h), and SSRF defensive proxy.
- [ ] **Phase 7 — Extraction & Normalization**: Parsing engine, field normalizer mapping raw source inputs into unified canonical representation.
- [ ] **Phase 8 — Duplicate Detection**: Multi-tier duplicate detection (SHA-256 URL hash, exact external ID match, heuristic title/company matching).
- [ ] **Phase 9 — Admin Verification**: Verification queue UI, moderation actions (approve, reject, edit, manual expire), and original source preview.
- [ ] **Phase 10 — Student Job Portal**: Responsive student job feed UI, search, location/work-mode filters, job detail view, and direct external apply URL redirection.
- [ ] **Phase 11 — Eligibility Engine**: Automated student eligibility check (CGPA cutoff, degree match, max backlogs limit) with visual indicators.
- [ ] **Phase 12 — Application Tracking**: Saved job bookmarks and self-recorded external application status tracking (`INTERESTED`, `APPLIED`, `INTERVIEW`, `SELECTED`, `REJECTED`).
- [ ] **Phase 13 — Notifications**: Notification engine for newly approved job opportunities and upcoming deadline reminders.
- [ ] **Phase 14 — Expiry & Source Monitoring**: Automated active status checks, multi-signal expiry monitor, and source health tracking (`HEALTHY`, `DEGRADED`, `FAILING`).
- [ ] **Phase 15 — Recommendations**: Skill-matching recommendation engine highlighting high-relevance job opportunities for students.
- [ ] **Phase 16 — Analytics**: Placement officer analytics (company-wise, branch-wise, salary package averages) and audit log reports.
- [ ] **Phase 17 — Security Hardening**: Vulnerability assessment, OWASP Top 10 hardening, SSRF test suite, input sanitization, and security logging audit.
- [ ] **Phase 18 — Testing**: End-to-end integration testing, automated unit tests, and performance benchmark validation under load.
- [ ] **Phase 19 — Deployment**: Production environment deployment configuration, database connection pooling, CI/CD pipeline, and system health checks.
- [ ] **Phase 20 — Advanced AI Features**: AI-powered resume skill extraction, intelligent job description matching scores, and automated career insights.
