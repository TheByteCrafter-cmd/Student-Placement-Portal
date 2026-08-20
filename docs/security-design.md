# Cybersecurity Architecture & Defensive Controls Specification

## Overview
Because the Student Placement Portal handles sensitive student academic records and continuously communicates with external web servers to fetch job listings, security is a fundamental architectural requirement. This document outlines the defensive security controls, threat mitigations, and compliance specifications embedded into the application design.

---

## 1. Threat Matrix & Defense Strategy

| Threat Category | Primary Risk | Architectural Defense Control |
| :--- | :--- | :--- |
| **Server-Side Request Forgery (SSRF)** | Scanner fetching internal networks or metadata endpoints via source URLs | Strict outbound IP filtering, DNS validation, blocking loopback/private ranges & metadata IPs. |
| **Malicious URL / XSS Links** | Embedded `javascript:` URIs or phishing links in job postings | Strict URL parsing, protocol whitelisting (`http`/`https`), DOM Purify output encoding. |
| **Malicious File Upload** | Malware disguised as PDF resumes | Magic-byte file validation, PDF parser isolation, storage outside web root. |
| **SQL Injection (SQLi)** | Database query manipulation | Parameterized queries via ORM (Prisma/TypeORM/Kysely), strict input type checking. |
| **Cross-Site Scripting (XSS)** | Injection of scripts in job descriptions | Sanitization of HTML descriptions using DOMPurify/sanitize-html before rendering. |
| **Broken Authentication** | Credential stuffing, session hijacking | Argon2id password hashing, HTTP-only SameSite cookies, JWT expiry, rate limiting. |
| **Broken Authorization (IDOR)** | Students accessing admin endpoints or other student profiles | Strict RBAC middleware checking token claims against target entity ownership. |
| **Open Redirects** | Tricking users via application redirect parameters | Disallow arbitrary redirect parameters; render target URLs as explicit transparent links. |

---

## 2. Server-Side Request Forgery (SSRF) Defense Blueprint

The Job Aggregation Engine continuously contacts external URLs. To eliminate SSRF risks, every outbound HTTP request issued by a Source Connector MUST pass through an **SSRF Defensive Proxy Wrapper**:

```
Source Connector Request
           │
           ▼
   URL Protocol Check (Enforce HTTP / HTTPS)
           │
           ▼
   DNS Resolution (Resolve domain to IP address)
           │
           ▼
   IP Address Validation (Check against Restricted IP Subnets)
           │
     ┌─────┴───────────────────────────────────┐
     ▼                                         ▼
[Restricted IP Detected]              [Public Valid IP]
     │                                         │
     ▼                                         ▼
Block Request & Log Security Alert    Execute HTTP Request with Timeout
```

### Restricted Subnets & IPs (Blocked):
- **Loopback**: `127.0.0.0/8`, `::1`
- **Private Subnets (RFC 1918)**: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`
- **Link-Local & Cloud Metadata**: `169.254.169.254` (AWS/GCP/Azure Metadata), `169.254.0.0/16`
- **Carrier-Grade NAT**: `100.64.0.0/10`

### Execution Controls:
- **Maximum Redirect Limit**: 3 redirects max. Redirect targets re-evaluated against SSRF IP check.
- **Request Timeout**: Strict 10-second timeout per outbound request.
- **User-Agent Identification**: Explicit custom User-Agent identifying the Placement Portal Scanner.

---

## 3. External URL Handling & Outbound Link Security

To ensure student safety when clicking external job listing and application links:

1. **Protocol Whitelisting**: Only `http:` and `https:` URLs are accepted. `javascript:`, `data:`, `file:`, `vbscript:` schemes are rejected during normalization.
2. **Transparent Link Attributes**: All outbound external links rendered on the frontend MUST include:
   ```html
   <a href="https://official-company.com/jobs/123" target="_blank" rel="noopener noreferrer">
     Apply on Official Site (official-company.com)
   </a>
   ```
3. **Domain Display**: The originating domain name (e.g. `careers.microsoft.com`) is prominently displayed alongside the apply link so students know where they are being redirected.
4. **No Proxy Redirects**: The application never acts as an open redirect gateway (`/redirect?url=...`). Links point directly to validated target URLs.

---

## 4. Resume Upload Security Controls

Student resumes present a common attack vector for malicious payload uploads. The following controls apply:

1. **Strict MIME & Extension Enforcement**: Only `.pdf` extensions with MIME type `application/pdf` are accepted.
2. **Magic Byte Verification**: Uploaded files are inspected for the mandatory PDF magic signature header bytes (`%PDF-1.`). Files failing byte inspection are immediately discarded.
3. **File Size Boundary**: Strict maximum limit of 5 MB per file.
4. **File Storage Isolation**: Files are stored outside the public web root directory using randomized UUID filenames (`resumes/7f8a...-resume.pdf`).
5. **No Direct Execution**: Upload directories are configured with `No-Execute` permissions (`Set-Content-Type: application/pdf`, `Content-Disposition: inline`).

---

## 5. Authentication & Session Management

- **Password Hashing**: Passwords hashed using **Argon2id** (memory cost 64MB, time cost 3, parallelism 4) or **bcrypt** (cost factor 12).
- **Session Transport**: Access and refresh tokens stored exclusively in **HTTP-only, Secure, SameSite=Strict** cookies to prevent XSS session theft.
- **Rate Limiting**: Brute-force protection on `/api/auth/login` allowing maximum 5 failed attempts per IP per 15-minute window.

---

## 6. Audit & Event Logging

All administrative moderation actions and security-relevant events generate immutable records in the `audit_logs` table:

### Tracked Security Events:
- Admin login / logout / failed attempts
- Job approval, rejection, or manual edit
- Source registration or configuration update
- Source health degradation or scan execution errors
- SSRF block trigger or malicious URL detection

### Log Entry Schema Concept:
```json
{
  "timestamp": "2026-08-20T23:38:00Z",
  "event_type": "SECURITY_SSRF_BLOCKED",
  "user_id": null,
  "ip_address": "192.0.2.45",
  "details": {
    "target_url": "http://169.254.169.254/latest/meta-data/",
    "source_id": "8f3b...-source-uuid"
  }
}
```
