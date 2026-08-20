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

> **Design Principle**: The architecture avoids unrestricted or illegal web scraping. Source connectors interface primarily with structured endpoints and public APIs.

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

### Connector Pipeline Flow
```
SourceConnector
     ↓
Fetcher Component (HTTP Client with SSRF protection & Rate Limiter)
     ↓
Parser Component (JSON / XML / DOM Parser)
     ↓
Normalizer Component (Maps fields to Canonical Schema)
     ↓
Canonical Job Object
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
- `apply_url` (URL): Direct link where students submit their application.
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

### State Definitions & Transitions
1. **`DISCOVERED`**: Initial state when candidate payload is received by the scanner.
2. **`PENDING_REVIEW`**: Job is normalized, validated, checked for duplicates, and queued in the Admin Verification Queue.
3. **`APPROVED`**: Admin verifies listing authenticity, relevance, and criteria.
4. **`REJECTED`**: Admin rejects invalid, low-quality, or spam job posting.
5. **`PUBLISHED`**: Job is active and visible on the Student Feed.
6. **`HIDDEN`**: Temporarily hidden by Admin or system alert.
7. **`EXPIRED`**: Closing date reached, application link dead, or job removed from source.
8. **`ARCHIVED`**: Retained for historical placement analytics.

---

## 5. Field Normalization Layer

Different sources use disparate field names and formats. The Normalization Engine transforms raw inputs into unified canonical representations:

| Raw Source Input Examples | Canonical Field | Normalization Strategy |
| :--- | :--- | :--- |
| `"SDE 1"`, `"Software Developer - I"`, `"Junior Dev"` | `title` | Title cleaning, trimming, and standard capitalization. |
| `"Google India LLC"`, `"Google Inc"` | `company_name` | Corporate suffix stripping (`Inc`, `LLC`, `Pvt Ltd`) for uniform matching. |
| `"B.E / B.Tech in CS"`, `"Bachelor of Technology"` | `degree_eligibility` | Canonical array mapping: `["B.Tech", "BE"]`. |
| `"Work from Home"`, `"Remote - India"`, `"Onsite"` | `work_mode` | Mapped to `REMOTE`, `HYBRID`, or `ON_SITE`. |
| `"10-12 LPA"`, `"₹50k/pm"`, `"Stipend: 25000"` | `salary_package` | Extracted into clean display strings & searchable numeric range bounds. |

---

## 6. Duplicate Detection Strategy

Because the same job opening may be listed on multiple websites, a multi-stage duplicate detection algorithm prevents feed clutter:

```
Incoming Job Candidate
         │
         ├──► 1. Exact Match Check (External Job ID + Source ID) ──► Mark as Duplicate / Update existing
         │
         ├──► 2. URL Fingerprint Match (Canonical Apply URL hash) ──► Flag Exact Duplicate
         │
         └──► 3. Probable Match Heuristic (Company + Title Similarity + Location)
                     │
                     ├─ Score ≥ 85% ──► Link as Duplicate (Queue for Admin Review)
                     └─ Score < 85% ──► Treat as Unique Job Opening
```

### Matching Tiers
1. **Exact Duplicate**: Same `external_job_id` from the same source or identical normalized `apply_url`. Automatically merged/updated without creating a new listing.
2. **Probable Duplicate**: Same company, >85% title similarity (Jaro-Winkler/Levenshtein metric), and matching location from a different source. Flagged for Admin side-by-side comparison.
3. **Distinct Opening**: Same company, different title or location. Processed as a separate job listing.

---

## 7. Expiry & Active Status Monitoring

The system ensures job postings remain fresh and removes dead listings through multi-signal checking:

### Expiry Signals
- **Explicit Closing Date**: Current timestamp > `closing_date`.
- **Source Status Signal**: Source API explicitly returns `closed` or `inactive`.
- **HTTP 404 / 410 Response**: Original application URL or job page returns client error.
- **Repeated Scan Absence**: Job missing from source feed across 3 consecutive scans.

### Safety Thresholds
To prevent temporary network glitches from wrongly expiring jobs:
- A job is marked **`POSSIBLY_EXPIRED`** after 1 scan absence or HTTP timeout.
- A job is marked **`EXPIRED`** only after 3 consecutive failures or explicit HTTP 404 validation.

---

## 8. Scheduler & Scan Engine Architecture

The scan engine executes background job polling in configurable near-real-time intervals.

```
       [Configurable Scheduler (Node-cron / BullMQ)]
                         │
                         ├─ Every 15 minutes (High-Priority APIs)
                         ├─ Every 30 minutes (Standard Feeds)
                         └─ Every 1 hour (Company Career Pages)
                         │
                         ▼
             Scan Job Dispatcher
                         │
            ┌────────────┼────────────┐
            ▼            ▼            ▼
       Source A     Source B     Source C  (Concurrent Isolated Execution)
            │            │            │
            └────────────┼────────────┘
                         ▼
        Scan Execution Logger & Source Health Update
```

### Key Operational Controls
- **Overlap Prevention**: Distributed mutex locking (`source_id` lock) ensures a scan job for a specific source cannot run concurrently if a previous scan is still processing.
- **Circuit Breaker & Backoff**: If a source fails 3 consecutive times, it enters `DEGRADED` state with exponential backoff (e.g., poll interval increases from 15m → 2h) to avoid rate limits or IP bans.
- **Source Health Metrics**: Tracked metrics include `last_successful_scan`, `consecutive_failures`, `total_jobs_found`, and `avg_response_time_ms`.
- **Failure Isolation**: Each source execution is wrapped in isolated `try-catch` boundary contexts. An error in Source A will **never** stop Source B or crash the main application.
