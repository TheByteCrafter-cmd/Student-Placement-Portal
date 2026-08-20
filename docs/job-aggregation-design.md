# Job Aggregation & Intelligence Engine Architecture

## Overview
The Job Aggregation Engine is the core intelligence component of the Student Placement Portal. It is responsible for discovering, fetching, parsing, normalizing, deduplicating, and monitoring job opportunities from diverse web sources in scheduled near-real-time cycles.

---

## 1. Job Source Hierarchy & Strategy

To maintain high data quality, legal compliance, and system stability, the platform enforces a strict source hierarchy:

```
Priority 1: Official & Public Job APIs (e.g. Greenhouse public API, Lever API, GitHub Jobs RSS/APIs)
     ↓
Priority 2: Applicant Tracking System (ATS) Feeds & Structured Endpoints (e.g. Workday, SmartRecruiters public feeds)
     ↓
Priority 3: Official Company Career Pages (Direct company site feeds)
     ↓
Priority 4: RSS / Atom Feeds (Legitimate public job syndication feeds)
     ↓
Priority 5: Controlled Web Extraction (Restricted, targeted extraction only when no API/feed exists)
```

> **Design Principle**: The architecture avoids unrestricted or illegal web scraping. Source connectors interface primarily with structured endpoints and public APIs configured by administrators.

---

## 2. Connector-Based Source Architecture

Every job source is implemented as an independent, decoupled module adhering to the standard `SourceConnector` contract. This modular pattern ensures that adding a new job source requires zero changes to core database logic or API routes.

### Connector Contract Interface Concept
```typescript
interface SourceConnector {
  readonly sourceId: string;
  readonly sourceName: string;
  readonly sourceType: 'API' | 'ATS' | 'RSS' | 'WEB_EXTRACTION';
  readonly config: SourceConfiguration;

  /**
   * Fetches raw job listings from the source.
   */
  fetchJobs(): Promise<RawJobResult[]>;

  /**
   * Fetches full job details for a specific raw job if initial fetch is a summary.
   */
  fetchJobDetails(externalJobId: string): Promise<RawJobDetail>;

  /**
   * Normalizes raw source payload into canonical job model.
   */
  normalizeJob(rawJob: RawJobResult): CanonicalJobInput;

  /**
   * Checks whether a previously indexed job is still active on the source.
   */
  checkJobStatus(externalJobId: string, sourceUrl: string): Promise<JobStatusCheckResult>;
}
```

---

## 3. Canonical Job Data Model

All job listings are transformed into a standardized canonical format regardless of their origin.

### Field Categories

#### A. Identifiers & Metadata
- `id` (UUID): Internal primary key.
- `external_job_id` (String): Source-provided unique job identifier.
- `source_id` (UUID): Reference to the job source.
- `source_name` (String): Name of originating platform/company.
- `source_type` (Enum): `API`, `ATS`, `RSS`, `WEB_EXTRACTION`.

#### B. Core Job Information
- `title` (String): Normalized job title (e.g., "Software Engineer Intern").
- `company_name` (String): Standardized employer name.
- `description` (Text): Cleaned HTML/Markdown job description.
- `location` (String): Primary work location (e.g., "Bangalore, India").
- `work_mode` (Enum): `REMOTE`, `HYBRID`, `ON_SITE`, `UNSPECIFIED`.
- `employment_type` (Enum): `FULL_TIME`, `INTERNSHIP`, `PART_TIME`, `CONTRACT`.

#### C. Qualification & Compensation
- `salary_package` (String, Optional): Offered CTC or stipend (e.g., "12 LPA", "₹30,000/month").
- `min_experience_years` (Decimal, Optional): Minimum required experience (0 for freshers).
- `required_skills` (Array of Strings): Normalized array of required technical skills.
- `preferred_skills` (Array of Strings): Optional secondary skills.
- `degree_eligibility` (Array of Strings): Eligible degrees (e.g., `["B.Tech", "M.Tech", "MCA"]`).
- `cgpa_cutoff` (Decimal, Optional): Minimum CGPA requirement (e.g., `7.5`).
- `max_backlogs_allowed` (Integer, Optional): Backlog limit.

#### D. URLs & Timestamps
- `original_source_url` (URL): Direct link to the source post page.
- `apply_url` (URL): Direct link where students submit their application on the external platform.
- `posted_date` (Timestamp, Optional): Date job was originally published by employer.
- `closing_date` (Timestamp, Optional): Application deadline.
- `first_discovered_at` (Timestamp): System discovery timestamp.
- `last_checked_at` (Timestamp): Last successful health scan timestamp.

#### E. Status & Moderation
- `status` (Enum): `DISCOVERED`, `PENDING_REVIEW`, `APPROVED`, `REJECTED`, `PUBLISHED`, `HIDDEN`, `EXPIRED`, `ARCHIVED`.
- `verification_timestamp` (Timestamp, Optional): When admin acted on the job.
- `verified_by_admin_id` (UUID, Optional): Admin user ID who reviewed the job.

---

## 4. Job Lifecycle & State Machine

Every job transitions through well-defined lifecycle states governed by strict validation rules:

```
         [Scanner Discovers New Job]
                     │
                     ▼
                DISCOVERED
                     │ (Normalizer & Duplicate Check Pass)
                     ▼
              PENDING_REVIEW ◄─────────────────┐
                     │                         │
        ┌────────────┴────────────┐            │
        ▼                         ▼            │ (Admin Edits)
    APPROVED                  REJECTED ────────┘
        │                         │
        ▼                         ▼
    PUBLISHED                   HIDDEN
        │
   (Closing Date Passed / Source Removed)
        │
        ▼
     EXPIRED
        │ (30 Days Post Expiry)
        ▼
    ARCHIVED
```

---

## 5. Scheduler & Scan Engine Architecture

### A. MVP Architecture (Node.js Scheduled Execution)
For the MVP, scanning is orchestrated using a lightweight **Node.js-based scheduler** (`node-cron` or built-in scheduled task manager):
- **Configurable Intervals**: Scans execute per source based on configured intervals (15m, 30m, 1h).
- **Per-Source Scheduling**: Each source maintains its own last-run timestamp and target scan schedule.
- **Overlap Prevention**: In-memory task locks ensure a scan job for a specific source does not execute concurrently if a previous run is still processing.
- **Retry & Timeout Handling**: Outbound HTTP requests enforce a strict 10-second timeout per source call with exponential backoff on transient network failures.

```
       [Node.js Scheduled Task Manager (MVP)]
                         │
                         ├─ Every 15 minutes (High-Priority APIs)
                         ├─ Every 30 minutes (Standard Feeds)
                         └─ Every 1 hour (Company Career Pages)
                         │
                         ▼
             Scan Task Dispatcher
                         │
            ┌────────────┼────────────┐
            ▼            ▼            ▼
       Source A     Source B     Source C  (Isolated Execution Contexts)
```

### B. Future Scalability Architecture (BullMQ + Redis)
When source volume, scan frequency, or worker distribution demands dedicated background queue infrastructure, the engine seamlessly upgrades to a **BullMQ + Redis** worker queue architecture:
- Distributed background workers handling concurrent queue processing.
- Persistent job retry queues and dead-letter queues.
- Admin metric monitoring for active, waiting, and failed queue jobs.

---

## 6. Duplicate Detection & Expiry Strategy

### Duplicate Detection
- **Exact Duplicate**: Matched by SHA-256 `url_hash` of the normalized `apply_url` or identical `external_job_id` from the same source.
- **Probable Duplicate**: Candidate matching same company, >85% normalized title similarity, and location. Flagged for Admin side-by-side verification.

### Expiry Detection
- **Explicit Expiry**: Current date > `closing_date` or source API returns `closed`.
- **Scan Absence**: Job missing from source across 3 consecutive scans triggers transition to `EXPIRED`.
