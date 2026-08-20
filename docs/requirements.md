# Functional & Non-Functional Requirements Document

## Project Vision
The **Student Placement Portal** is a near-real-time student placement intelligence platform designed for educational institutions. Unlike traditional job portals that rely exclusively on manual job posting by recruiters, this platform automatically aggregates, extracts, normalizes, deduplicates, and verifies job openings from legitimate online job sources across the web.

It empowers students by delivering verified, fresh, high-quality career and internship opportunities while maintaining direct links to original application sources. Institutional placement officers (Admins) retain full moderation control through a centralized Verification Queue to ensure only legitimate, relevant, and active job postings reach the student body.

The primary workflow for students is **External Application Redirection**: students inspect curated job listings on the portal and click out to the official source/employer page to submit their application directly. The portal provides self-recorded application status tracking (`INTERESTED`, `APPLIED`, `INTERVIEW`, `SELECTED`, `REJECTED`) so students can organize their recruitment journey.

---

## System Architecture Pipeline Summary
```
Internet Job Sources (APIs, ATS, Company Career Pages, RSS)
                         ↓
            Job Discovery / Aggregation Engine
           (Node.js Scheduled Execution Engine)
                         ↓
               Extraction & Parsing Layer
                         ↓
               Data Normalization Engine
                         ↓
             Duplicate Detection Subsystem
                         ↓
           Validation & Expiry Monitor Layer
                         ↓
                Admin Verification Queue
                         ↓
                Approved Job Feed
                         ↓
           Student Portal (External Application Redirect)
```

---

## Core User Roles

### 1. Student
Primary consumer of placement information. Students access curated job listings, track eligibility, maintain academic profiles, open official source URLs to apply on external platforms, and track their self-recorded application progress.

### 2. Admin (Placement Officer)
Central verification and moderation authority. Admins manage trusted job source connectors, review aggregated job listings in the verification queue, approve or reject postings, track source health, and oversee student placement metrics.

### 3. Company / Recruiter (Future Scope)
*Scope Evaluation*: A dedicated Company role is deferred to a future release phase. In MVP, job opportunities are aggregated automatically or managed by Admins, eliminating the cold-start problem of requiring external recruiters to manually post jobs.

---

## Functional Requirements Classification

### 1. Student Module Requirements

#### MUST HAVE (MVP)
- **Account Management**: Secure registration, login, logout, and password reset.
- **Student Profile**: Academic information (degree, major, graduation year, CGPA, backlogs count), skills, certifications, and project showcase.
- **Links Integration**: Verification and linking of external professional profiles (GitHub, LinkedIn, Portfolio).
- **Resume Upload**: Upload and management of PDF resume with strict MIME-type and magic-byte validation.
- **Approved Job Feed**: View, search, and filter admin-approved job openings by title, company, location, work mode, and eligibility.
- **Job Details View**: View full job descriptions, required skills, salary package, eligibility criteria, and posting date.
- **Direct Application Redirect**: One-click outbound link opening the official external application URL in a secure new tab.
- **Saved / Bookmarked Jobs**: Ability for students to bookmark job listings for quick access.
- **Self-Recorded Application Tracking**: Ability for students to manually record and update their personal status for an opportunity:
  - `INTERESTED` — Marked as an opportunity of interest.
  - `APPLIED` — Student self-records that they submitted an external application.
  - `INTERVIEW` — Student self-records receiving an interview call.
  - `SELECTED` — Student self-records receiving a placement offer.
  - `REJECTED` — Student self-records receiving a non-selection notice.

#### SHOULD HAVE
- **Eligibility Indicator**: Automated visual match indicator showing whether the student meets a job's CGPA, degree, and backlog requirements.
- **Application History Filter**: Filter student saved/tracked jobs by self-recorded status (`APPLIED`, `INTERVIEW`, `SELECTED`).

#### FUTURE / ADVANCED
- **AI Profile Match Score**: Automated match score comparing student profile skills with job description requirements.
- **In-App & Email Notifications**: Real-time alerts for newly approved jobs matching student preferences or upcoming closing dates.
- **Placement Analytics for Students**: Insights into top hiring skills and active recruiting companies.

---

### 2. Admin Module Requirements

#### MUST HAVE (MVP)
- **Secure Authentication**: Multi-factor authentication (MFA) supported secure Admin login.
- **Admin Dashboard**: Overview of pending verification jobs, total approved jobs, active job sources, and system scan stats.
- **Verification Queue (Pending Jobs)**: Review queue displaying newly discovered jobs before public release.
- **Job Moderation Actions**:
  - **Approve Job**: Move job from `PENDING_REVIEW` to `APPROVED` and publish to Student Feed.
  - **Reject Job**: Move job to `REJECTED` with optional rejection reason.
  - **Edit Job**: Edit normalized job title, company, salary, experience, or description prior to approval.
  - **Mark as Expired**: Manually override and mark a job as `EXPIRED`.
- **Original Source Inspection**: Quick preview of original source webpage and apply link during review.
- **Trusted Source Management**: View configured job sources, monitor scan status, view last successful scan time, and toggle source active/inactive states.

#### SHOULD HAVE
- **Duplicate Inspection**: View duplicate detection flags and compare candidate duplicate jobs side-by-side.
- **Scan History & Logs**: Detailed logs of job aggregation execution runs (jobs found, duplicates filtered, errors encountered).
- **Bulk Moderation**: Ability to bulk-approve or bulk-reject curated jobs meeting specified confidence thresholds.

#### FUTURE / ADVANCED
- **Student Management**: View student profiles, approve registered student accounts, and export placement reports.
- **Advanced Source Health Monitoring**: Automated alerts when a source structure changes or fails repeatedly.
- **Placement Analytics & Reports**: Exportable placement metrics (company-wise, branch-wise, salary package averages).

---

## Non-Functional Requirements (NFRs)

1. **Security & Source Segregation**
   - Explicit segregation between **Trusted/Configured Job Sources** (scanned server-side with SSRF protection) and **User-submitted external URLs** (never fetched server-side).
   - Defense against OWASP Top 10 vulnerabilities (SQLi, XSS, CSRF, Auth bypass).
   - Strict Server-Side Request Forgery (SSRF) controls for job source fetching.
   - Secure URL sanitization and outbound link validation.
   - Encrypted data transmission (TLS 1.3/HTTPS) and bcrypt/argon2 password hashing.

2. **Reliability & Source Isolation**
   - Connector failure isolation: Failure of one job source scan must NOT affect other sources or bring down the portal.
   - Zero loss of candidate jobs during scanner execution.

3. **Performance & Freshness**
   - Near-real-time job updates via configurable scan intervals (15m, 30m, 1h).
   - **MVP Scheduler**: Node.js-based scheduled jobs (`node-cron` or built-in task scheduler) with per-source scheduling, timeouts, and retry handling.
   - **Future Scalability**: BullMQ + Redis worker queues introduced when source count, concurrency, or volume demands it.
   - Student feed search and filter response time < 300ms.
   - Database queries optimized with comprehensive indexing.

4. **Scalability**
   - Architecture supporting seamless extension from 10 sources to 100+ sources without core system rewrite.

5. **Usability & Compliance**
   - Mobile-responsive, accessible UI (WCAG 2.1 AA compliant design concepts).
   - Preserved attribution: Original job source URLs preserved to uphold attribution and legal compliance.
