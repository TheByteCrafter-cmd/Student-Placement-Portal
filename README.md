# Student Placement Portal

A real-time / near-real-time student placement intelligence platform that discovers online job openings from legitimate sources across the web, extracts and normalizes job information, detects duplicates and expired jobs, queues newly discovered jobs in an Admin Verification Queue, and publishes admin-approved opportunities to students while preserving original application links.

---

## 🚀 Phase 1 Foundation & Development Setup

### Project Structure
```
F:\Student Placement Portal\
├── frontend/                # React + TypeScript + Vite Application
│   ├── src/                 # Phase 1 Status Dashboard & UI Components
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── backend/                 # Node.js + Express + TypeScript Backend API
│   ├── src/
│   │   ├── config/          # Centralized Config & Database Health Monitor
│   │   ├── middleware/      # Security (Helmet, CORS) & Error Handler
│   │   ├── routes/          # /api/health Endpoint Controller
│   │   └── index.ts         # Main Express Server Entrypoint
│   ├── package.json
│   └── tsconfig.json
├── docs/                    # Phase 0 Architecture Specifications & Blueprints
├── .env.example             # Environment Variable Template
├── .gitignore               # Full-Stack Git Ignore Rules
└── README.md                # Project Overview & Quick Start Instructions
```

---

## ⚙️ How to Run Locally

### 1. Manual PostgreSQL Database Setup (Dependency)
PostgreSQL is configured as the core database engine. If PostgreSQL is not yet running on your local machine:
1. Install PostgreSQL Server (version 14+) or start the local service on default port `5432`.
2. Create local database: `placement_portal`.
3. Configure credentials in your root `.env` file (copied from `.env.example`):
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/placement_portal
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=postgres
   POSTGRES_DB=placement_portal
   ```
*(Note: If PostgreSQL is offline/unreachable during local development, the backend automatically detects it, logs a warning, and returns a graceful `degraded` health status via `/api/health` without crashing.)*

### 2. Backend Server Setup
```bash
cd backend
npm install
npm run dev
```
The backend API server starts at `http://localhost:5000`.
- Health Check Endpoint: `http://localhost:5000/api/health`

### 3. Frontend Client Setup
```bash
cd frontend
npm install
npm run dev
```
The frontend SPA starts at `http://localhost:5173`.

---

## 🛠️ Verification Commands

- **Backend TypeScript Build**: `cd backend && npm run build`
- **Frontend Vite Build**: `cd frontend && npm run build`
- **Health Check Verification**: `curl http://localhost:5000/api/health`

---

## 📅 21-Phase Development Roadmap

- [x] **Phase 0 — Requirements & Architecture**
- [x] **Phase 1 — Project Setup & Foundation** *(Completed)*
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
