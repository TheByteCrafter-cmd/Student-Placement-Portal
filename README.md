# Student Placement Portal

A real-time / near-real-time student placement intelligence platform that discovers online job openings from legitimate sources across the web, extracts and normalizes job information, detects duplicates and expired jobs, queues newly discovered jobs in an Admin Verification Queue, and publishes admin-approved opportunities to students while preserving original application links.

---

## 🚀 Phase 5 — Job Database, Approved Job Feed & Student Job Foundation

### 1. Environment & Setup
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Configure your JWT secret, cookie secret, and initial Admin bootstrap credentials in `.env`:
   ```env
   JWT_SECRET=your_strong_jwt_secret_key_here
   COOKIE_SECRET=your_cookie_signing_secret_here

   ADMIN_EMAIL=admin@your-institution.edu
   ADMIN_PASSWORD=your_secure_admin_password_here
   ```
3. On backend server startup, the system reads `ADMIN_EMAIL` and `ADMIN_PASSWORD` from the environment and bootstraps the initial Admin user safely (with bcrypt password hashing).

---

## ⚙️ How to Run Locally

### 1. Backend Server Setup
```bash
cd backend
npm install
npm run dev
```
The backend API server starts at `http://localhost:5000`.
- Health Check Endpoint: `http://localhost:5000/api/health`
- Student Job Feed API: `http://localhost:5000/api/jobs`
- Admin Dashboard API: `http://localhost:5000/api/admin/dashboard`

### 2. Frontend Client Setup
```bash
cd frontend
npm install
npm run dev
```
The frontend SPA starts at `http://localhost:5173`.
- Student Job Feed: `http://localhost:5173/student` (Jobs Tab)
- Admin Control Center: `http://localhost:5173/admin`

---

## 🛠️ Verification Commands

- **Backend TypeScript Build**: `cd backend && npm run build`
- **Frontend Vite Build**: `cd frontend && npm run build`
- **Health Check Verification**: `curl http://localhost:5000/api/health`

---

## 📅 21-Phase Development Roadmap

- [x] **Phase 0 — Requirements & Architecture**
- [x] **Phase 1 — Project Setup & Foundation**
- [x] **Phase 2 — Authentication & Role-Based Access Control (RBAC)**
- [x] **Phase 3 — Student Profile & Resume Management**
- [x] **Phase 4 — Admin Control Center & Moderation**
- [x] **Phase 5 — Job Database & Student Job Portal** *(Completed)*
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
