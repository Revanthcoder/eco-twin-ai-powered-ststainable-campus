# AI-Powered Sustainable Campus — Backend API

Backend REST API, database models, Digital Twin telemetry services, What-If simulator, automated sustainability guardian, and AI microservice integration adapter for the **AI-Powered Sustainable Campus** hackathon project.

Built with **Node.js (ES modules)**, **Express.js**, **Prisma ORM**, and **SQLite**.

---

## 🏗️ Architecture & Folder Structure

```
backend/
├── prisma/
│   ├── schema.prisma           # Prisma relational database models and indexes
│   └── seed.js                 # Realistic seed data (buildings, readings, alerts, scores)
├── docs/
│   ├── swagger.json            # OpenAPI 3.0 specification
│   ├── FRONTEND_API_CONTRACT.md# Comprehensive API contract for Person 1 (Frontend)
│   └── AI_SERVICE_CONTRACT.md  # HTTP service interface contract for Person 3 (AI)
├── src/
│   ├── app.js                  # Express application setup, security, Swagger UI, routing
│   ├── server.js               # Server entry point with graceful shutdown handling
│   ├── config/
│   │   └── index.js            # Environment validation with Zod
│   ├── middleware/
│   │   ├── auth.js             # JWT authentication & RBAC middleware
│   │   ├── errorHandler.js     # Centralized error handler
│   │   ├── rateLimiter.js      # Rate limiters for general, auth, and AI endpoints
│   │   └── validate.js         # Generic Zod request schema validator
│   ├── routes/                 # Express REST endpoint route declarations
│   ├── controllers/            # HTTP request/response orchestration
│   ├── services/               # Business logic, aggregations, state machines, rule engines
│   ├── repositories/
│   │   └── prismaClient.js     # Prisma database client singleton & disconnect
│   ├── validators/
│   │   └── schemas.js          # Zod validation schemas for all inputs
│   ├── integrations/
│   │   └── aiClient.js         # HTTP adapter for Person 3's Python AI microservice
│   └── utils/
│       ├── errors.js           # Custom AppError subclasses (NotFound, Validation, etc.)
│       └── response.js         # Standard JSON response helpers
├── tests/                      # Automated Vitest test suites (14 suites, 51 tests)
├── .env.example                # Template configuration with placeholders
├── package.json                # Dependencies and scripts (ES modules)
└── README.md                   # This documentation
```

---

## ⚡ Quick Start

### 1. Prerequisites
* **Node.js**: v18.0.0 or higher (v24 LTS recommended)
* **npm**: v9.0.0 or higher

### 2. Install Dependencies
```bash
cd backend
npm install
```

### 3. Setup Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default `.env` values are pre-configured for local SQLite development and immediate execution.

### 4. Database Setup & Seeding
Generate Prisma Client and push database schema:
```bash
npm run prisma:generate
npm run prisma:migrate
```
Populate database with demo campus buildings, sensors, time-series telemetry (energy, water, waste), alerts, maintenance tasks, and system settings:
```bash
npm run seed
```

### 5. Start Server
* **Development mode** (with auto-reload):
```bash
npm run dev
```
* **Production mode**:
```bash
npm start
```
Server starts at: `http://localhost:5000/api`  
Interactive Swagger documentation: `http://localhost:5000/api/docs`

---

## 🧪 Automated Testing

Run the complete test suite:
```bash
npm test
```
All 14 test suites and 51 tests run using **Vitest** and **Supertest** covering:
- Health check & system status.
- Campus & Digital Twin building/zone hierarchy.
- Energy monitoring (kWh, solar generation, peak kW, trends, validation).
- Water monitoring (Litres, flow rates LPM, leak thresholds).
- Waste monitoring (kg weight, bin fullness %, diversion rate %, CV detections).
- Carbon footprint (Scope 1, 2, 3 emissions, configurable factors).
- Sustainability score (CSI-100 weighted index, freshness, missing data penalties).
- What-If simulator (scenario modeling, cost and emissions savings).
- Alerts & Sustainability Guardian (rule evaluation engine, duplicate prevention).
- Maintenance tasks (state machine transitions: PENDING -> IN_PROGRESS -> COMPLETED).
- AI microservice integration (timeouts, error handling, mock fallback).
- Authentication & RBAC (Admin, Facility Manager, Viewer roles).
- Reports generation & data coverage calculations.

---

## 📡 Implemented REST API Endpoints

| Module | Method | Endpoint | Auth | Test Status |
| :--- | :--- | :--- | :--- | :--- |
| **System** | `GET` | `/api/health` | Public | ✅ Verified |
| **System** | `GET` | `/api/system/status` | Public | ✅ Verified |
| **Auth** | `POST` | `/api/auth/login` | Public | ✅ Verified |
| **Auth** | `GET` | `/api/auth/me` | Bearer | ✅ Verified |
| **Dashboard** | `GET` | `/api/dashboard` | Public | ✅ Verified |
| **Dashboard** | `GET` | `/api/dashboard/trends` | Public | ✅ Verified |
| **Dashboard** | `GET` | `/api/dashboard/building-comparison` | Public | ✅ Verified |
| **Buildings** | `GET` | `/api/buildings` | Public | ✅ Verified |
| **Buildings** | `GET` | `/api/buildings/:id` | Public | ✅ Verified |
| **Buildings** | `GET` | `/api/buildings/:id/metrics` | Public | ✅ Verified |
| **Zones** | `GET` | `/api/zones` | Public | ✅ Verified |
| **Zones** | `GET` | `/api/zones/:id` | Public | ✅ Verified |
| **Energy** | `GET` | `/api/energy` | Public | ✅ Verified |
| **Energy** | `GET` | `/api/energy/summary` | Public | ✅ Verified |
| **Energy** | `GET` | `/api/energy/trends` | Public | ✅ Verified |
| **Energy** | `POST` | `/api/energy/readings` | Public | ✅ Verified |
| **Water** | `GET` | `/api/water` | Public | ✅ Verified |
| **Water** | `GET` | `/api/water/summary` | Public | ✅ Verified |
| **Water** | `GET` | `/api/water/trends` | Public | ✅ Verified |
| **Water** | `POST` | `/api/water/readings` | Public | ✅ Verified |
| **Waste** | `GET` | `/api/waste` | Public | ✅ Verified |
| **Waste** | `GET` | `/api/waste/summary` | Public | ✅ Verified |
| **Waste** | `GET` | `/api/waste/detections` | Public | ✅ Verified |
| **Waste** | `POST` | `/api/waste/detections` | Public | ✅ Verified |
| **Carbon** | `GET` | `/api/carbon` | Public | ✅ Verified |
| **Carbon** | `GET` | `/api/carbon/trends` | Public | ✅ Verified |
| **Score** | `GET` | `/api/sustainability-score` | Public | ✅ Verified |
| **Score** | `GET` | `/api/sustainability-score/history` | Public | ✅ Verified |
| **Alerts** | `GET` | `/api/alerts` | Public | ✅ Verified |
| **Alerts** | `GET` | `/api/alerts/:id` | Public | ✅ Verified |
| **Alerts** | `PATCH` | `/api/alerts/:id` | Optional | ✅ Verified |
| **Alerts** | `POST` | `/api/alerts/evaluate` | Public | ✅ Verified |
| **Simulator** | `POST` | `/api/simulator` | Optional | ✅ Verified |
| **Simulator** | `GET` | `/api/simulator/:id` | Public | ✅ Verified |
| **Maintenance**| `GET` | `/api/maintenance` | Public | ✅ Verified |
| **Maintenance**| `POST` | `/api/maintenance` | Optional | ✅ Verified |
| **Maintenance**| `GET` | `/api/maintenance/:id` | Public | ✅ Verified |
| **Maintenance**| `PATCH` | `/api/maintenance/:id` | Optional | ✅ Verified |
| **Reports** | `GET` | `/api/reports` | Public | ✅ Verified |
| **Reports** | `POST` | `/api/reports` | Optional | ✅ Verified |
| **Reports** | `GET` | `/api/reports/:id` | Public | ✅ Verified |
| **Settings** | `GET` | `/api/settings` | Public | ✅ Verified |
| **Settings** | `PATCH` | `/api/settings` | ADMIN | ✅ Verified |
| **AI** | `POST` | `/api/ai/waste-detection` | Public | ✅ Verified |
| **AI** | `POST` | `/api/ai/chat` | Public | ✅ Verified |
| **AI** | `POST` | `/api/ai/recommendations` | Public | ✅ Verified |

---

## 👥 Team Integration Guides

* **For Person 1 (Frontend)**: Read [FRONTEND_API_CONTRACT.md](./docs/FRONTEND_API_CONTRACT.md) for full request/response payloads, pagination, and 3D digital twin spatial coordinates.
* **For Person 3 (AI/ML)**: Read [AI_SERVICE_CONTRACT.md](./docs/AI_SERVICE_CONTRACT.md) for the Python microservice schema and expected JSON formats.

---

## 🔒 Security & Data Integrity Principles

1. **Explicit Data Labeling**: Simulated and seed measurements are explicitly labeled with `isDemoData: true`.
2. **Honest AI Fallbacks**: No fabricated AI detections. When Person 3's service is unreachable, development mode supplies clearly labeled mock results (`isMockFallback: true`), and production returns a controlled HTTP 503 error.
3. **Consistent Units**: Energy in **kWh**, Water in **Litres**, Waste in **kg**, Bin fullness in **%**, and Emissions in **kg CO2e** and **MT CO2e**.
4. **Duplicate Alert Suppression**: The Sustainability Guardian engine automatically verifies active alerts before issuing new ones for the same ongoing issue.
5. **State Machine Integrity**: Maintenance transitions are validated (`PENDING` -> `IN_PROGRESS` -> `COMPLETED`/`CANCELLED`).
