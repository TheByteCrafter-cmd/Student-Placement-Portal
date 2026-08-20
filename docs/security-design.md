# Cybersecurity Architecture & Defensive Controls Specification

## Overview
Because the Student Placement Portal handles sensitive student academic records and continuously communicates with external web servers to fetch job listings, security is a fundamental architectural requirement. This document outlines the defensive security controls, threat mitigations, and compliance specifications embedded into the application design.

---

## 1. Source Fetching Security & Explicit URL Segregation

The system explicitly distinguishes between two classes of external URLs:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL URL SEGREGATION                        │
├──────────────────────────────────────┬─────────────────────────────────┤
│    A. Trusted / Configured Sources   │   B. User-Submitted External    │
│            (ADMIN ONLY)              │             URLs                │
├──────────────────────────────────────┼─────────────────────────────────┤
│ • Registered & verified by Admin.    │ • Submitted by Students/Users.  │
│ • Executed by Source Connector       │ • NEVER fetched server-side.    │
│   pipeline in background scans.      │ • Rendered ONLY as outbound     │
│ • Passed through SSRF Defensive      │   client-side links with        │
│   Proxy before fetching.             │   strict URL sanitization.      │
└──────────────────────────────────────┴─────────────────────────────────┘
```

> **CRITICAL SECURITY DIRECTIVE**: The background scanner engine MUST ONLY fetch URLs belonging to **Trusted/Configured Admin Sources**. Arbitrary user-submitted URLs are strictly forbidden from being fetched or crawled server-side.

---

## 2. Server-Side Request Forgery (SSRF) Defense Blueprint

Before any background scan request is issued to a Trusted Job Source, the request MUST pass through the **SSRF Defensive Proxy Wrapper**:

```
Trusted Source Connector Request
               │
               ▼
       URL Scheme Check (Enforce HTTP / HTTPS)
               │
               ▼
       DNS Resolution (Resolve domain to IP address)
               │
               ▼
       IP Address Validation (Check against Restricted IP Subnets)
               │
     ┌─────────┴───────────────────────────────┐
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
2. **Transparent Outbound Links**: All external links rendered on the frontend MUST include:
   ```html
   <a href="https://official-company.com/jobs/123" target="_blank" rel="noopener noreferrer">
     Apply on Official Site (official-company.com)
   </a>
   ```
3. **Domain Display**: The originating domain name (e.g. `careers.microsoft.com`) is prominently displayed alongside the apply link.
4. **No Open Redirect Gateways**: The application never acts as a proxy redirect gateway (`/redirect?url=...`). Links point directly to validated target URLs client-side.

---

## 4. Resume Upload Security Controls

Student resumes present a potential attack vector. The following controls apply:

1. **Strict MIME & Extension Enforcement**: Only `.pdf` extensions with MIME type `application/pdf` are accepted.
2. **Magic Byte Verification**: Uploaded files are inspected for mandatory PDF magic signature header bytes (`%PDF-1.`). Files failing byte inspection are immediately discarded.
3. **File Size Boundary**: Strict maximum limit of 5 MB per file.
4. **File Storage Isolation**: Files are stored outside the public web root directory using randomized UUID filenames (`resumes/7f8a...-resume.pdf`).

---

## 5. Authentication & Session Management

- **Password Hashing**: Passwords hashed using **Argon2id** (memory cost 64MB, time cost 3, parallelism 4) or **bcrypt** (cost factor 12).
- **Session Transport**: Access and refresh tokens stored exclusively in **HTTP-only, Secure, SameSite=Strict** cookies.
- **Rate Limiting**: Brute-force protection on `/api/auth/login` allowing maximum 5 failed attempts per IP per 15-minute window.

---

## 6. Audit & Security Logging

All administrative moderation actions and security-relevant events generate immutable records in the `audit_logs` table:
- Admin login / logout / failed attempts
- Job approval, rejection, or manual edit
- Source registration or configuration update
- SSRF block trigger or malicious URL detection
