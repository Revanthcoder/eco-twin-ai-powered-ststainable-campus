# EcoPulse AI 🌿 — Campus Sustainability Intelligence & Digital Twin

> **AI-Powered Sustainable Campus Digital Twin · Hackathon Project 2026**
> **Phase 3: Digital Twin Campus, Real-Time Sensor Telemetry, Simulator & Building-Level Monitoring**

![EcoPulse AI Banner](https://img.shields.io/badge/EcoPulse%20AI-Digital%20Twin%20Campus-10b981?style=for-the-badge&logo=leaf)
![React](https://img.shields.io/badge/React-18.3-61dafb?style=flat-square&logo=react)
![Vite](https://img.shields.io/badge/Vite-6.0-646cff?style=flat-square&logo=vite)
![Node Express](https://img.shields.io/badge/Express-Backend-000000?style=flat-square&logo=express)
![SQLite](https://img.shields.io/badge/SQLite3-Persistent%20Database-003B57?style=flat-square&logo=sqlite)
![Python](https://img.shields.io/badge/Python-3.10%2B-blue?style=flat-square&logo=python)
![Tests](https://img.shields.io/badge/Tests-10%2F10%20Passing-brightgreen?style=flat-square)

---

## 1. Overview

**EcoPulse AI** is a real-time campus sustainability intelligence platform that pairs an interactive 2D spatial Digital Twin with live edge sensor simulation, persistent SQLite telemetry logging, explainable health diagnostics, and decision-support what-if scenario modeling.

### Key Capabilities in Phase 3:
- 🗺️ **Interactive Digital Twin Campus Map** — 2D schematic layout of 5 campus buildings across 5 zones with real-time electrical microgrid and water distribution pipeline schematics.
- 🏢 **Building-Level Deep Telemetry** — Instantaneous power (kW), cumulative energy (kWh), flow rate (L/min), cumulative water (L), occupancy count/rate, carbon emissions (kg CO₂e), and waste-bin fill levels.
- 🚨 **Explainable Deterministic Health Status** — Buildings are classified as `Healthy`, `Warning`, or `Critical` using explicit deterministic rules with transparent reason logs (no fabricated AI claims).
- 🔄 **Real-Time Sensor Simulator** — Configurable edge telemetry generator (5s / 10s / 30s) featuring diurnal activity curves, smooth variations, and automatic SQLite persistence.
- ⚠️ **Controlled Anomaly Injection** — Live test controls for lab chiller compressor surges, cafeteria pipe valve leaks, and quad bin overflows.
- 🔬 **What-If Conservation Simulator** — Engineering and physics-based scenario modeling for LED retrofits, HVAC setbacks, and low-flow plumbing fixtures with documented assumptions and uncertainty boundaries.
- 📋 **Sensor Directory & Ingestion API** — Complete registry of all 20 sensors with interactive reading ingestion.

---

## 2. Campus Facilities & Seeded Architecture

The digital twin models 5 interconnected facility nodes on campus:

| # | Facility Name | Code | Zone | Area | Floors | Primary Sensors Monitored |
|---|---------------|------|------|------|--------|---------------------------|
| 1 | **Academic Block** | `BLD-ACAD` | Zone A – North Quad | 8,500 m² | 4 | Power (kW), Water (L/min), Occupancy, Temp, Quad Waste Bins |
| 2 | **Central Library** | `BLD-LIBR` | Zone B – Central Plaza | 4,200 m² | 3 | Power (kW), Water (L/min), Occupancy, Temp, Paper Bins |
| 3 | **Campus Cafeteria** | `BLD-CAFE` | Zone C – South Courtyard | 2,800 m² | 2 | Power (kW), Water Flow (L/min), Occupancy, Compost Bins *(Active Leak)* |
| 4 | **Science & Tech Laboratory** | `BLD-LABS` | Zone D – Science Park | 6,400 m² | 3 | Cleanroom Power (kW), Water, Cleanroom Temp *(Active Chiller Surge)* |
| 5 | **Water Tank & Pump House** | `BLD-UTIL` | Zone E – Infrastructure Yard | 950 m² | 1 | Distribution Pump Power (kW), Main Flow (L/min), Cistern Level |

---

## 3. System Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    REACT FRONTEND (Vite @ port 5173)                    │
│  - Interactive 2D Campus Map     - Layer Toggles (Energy/Water/Waste)   │
│  - Building Detail Panel         - Simulator Controls (Start/Stop/Tick) │
│  - What-If Conservation Sandbox  - Accessible Sensor Directory Table    │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTP REST & Polling
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                 EXPRESS API GATEWAY (Node.js @ port 8000)               │
│  - /api/twin/overview            - /api/twin/sensors                    │
│  - /api/twin/buildings/:id       - /api/twin/simulator/start|stop|step │
│  - /api/twin/buildings/:id/reads - /api/twin/scenarios/simulate         │
│  - /api/twin/alerts              - Legacy Phase 1/2 API Compatibility   │
└──────────────┬──────────────────────────────┬───────────────────────────┘
               │                              │ Optional Proxy
               ▼                              ▼
┌──────────────────────────────┐ ┌────────────────────────────────────────┐
│     SQLITE PERSISTENCE       │ │     PYTHON AI SERVICE (@ port 8001)    │
│  server/data/campus.db       │ │  - Computer Vision Diagnostic Model    │
│  - buildings, zones, sensors │ │  - Statistical Z-Score Anomaly Detector│
│  - sensor_readings (history) │ │  - Pure Python (Runs out of the box)   │
│  - waste_bins, alerts        │ └────────────────────────────────────────┘
└──────────────────────────────┘
```

---

## 4. Requirements & Prerequisites (Windows 11)

- **Node.js** ≥ 18.0.0 (Tested on Node v24.18.0) — [nodejs.org](https://nodejs.org)
- **npm** ≥ 9.0.0 (included with Node.js)
- **Python** ≥ 3.8 (Tested on Python 3.14.2)
- **PowerShell** on Windows 11 (Note: use `npm.cmd` if Windows PowerShell script execution policy blocks `npm.ps1`)

---

## 5. Quick Start Instructions (Windows 11 / VS Code)

### Step 1: Install Dependencies
Open a PowerShell terminal in the repository root (`eco-twin-ai-powered-ststainable-campus`):

```powershell
npm.cmd install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:

```powershell
copy .env.example .env
```

The default values connect the frontend to Express at `http://127.0.0.1:8000`.

### Step 3: Initialize & Seed Database
Initialize the SQLite schema and generate the 24-hour historical telemetry log:

```powershell
<<<<<<< HEAD
npm run frontend:dev
=======
npm.cmd run seed
>>>>>>> cb8121f (Implement Phase 3 Digital Twin campus integration)
```

*(Note: The server also auto-initializes and seeds the database automatically on first startup).*

---

## 6. Running the Application (VS Code Terminals)

For the best hackathon demonstration experience, run the services in separate VS Code terminal tabs:

### Terminal 1: Express API Gateway & Sensor Simulator
```powershell
# Working Directory: Root folder
npm.cmd run dev:backend
```
*Starts Express API at `http://127.0.0.1:8000` and automatically begins streaming edge sensor simulation.*

### Terminal 2: React Frontend (Vite)
```powershell
# Working Directory: Root folder
npm.cmd run dev:frontend
```
*Starts Vite development server at `http://localhost:5173`.*

### Terminal 3 (Optional): Python AI Service
```powershell
# Working Directory: Root folder
npm.cmd run ai-service
```
*Starts Python AI service at `http://127.0.0.1:8001` (Vision diagnostics & Z-Score anomaly detector).*

---

## 7. Exact URLs to Open in Browser

| Interface | URL | Description |
|-----------|-----|-------------|
| **Frontend Application** | [http://localhost:5173](http://localhost:5173) | Main UI (Navigate to **Digital Twin (Map)** tab) |
| **API Health Check** | [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health) | Backend & SQLite connectivity status |
| **Digital Twin Overview** | [http://127.0.0.1:8000/api/twin/overview](http://127.0.0.1:8000/api/twin/overview) | Campus-wide aggregated telemetry JSON |
| **Buildings List API** | [http://127.0.0.1:8000/api/twin/buildings](http://127.0.0.1:8000/api/twin/buildings) | 5 facility models with status & reasons |
| **Sensors List API** | [http://127.0.0.1:8000/api/twin/sensors](http://127.0.0.1:8000/api/twin/sensors) | 20 edge sensors with current values |
| **Simulator Status** | [http://127.0.0.1:8000/api/twin/simulator/status](http://127.0.0.1:8000/api/twin/simulator/status) | Real-time simulator loop status |
| **Python AI Health** | [http://127.0.0.1:8001/health](http://127.0.0.1:8001/health) | Python AI companion health endpoint |

---

## 8. Running Automated Tests

A comprehensive 10-point test suite tests all backend APIs, physical calculations, sensor validation, simulator controls, and alert deduplication:

```powershell
<<<<<<< HEAD
npm run frontend:build
npm run frontend:preview
=======
npm.cmd test
>>>>>>> cb8121f (Implement Phase 3 Digital Twin campus integration)
```

### Verified Test Results (10/10 Passing):
1. ✅ **Campus overview API** — Aggregated KPIs, buildings count, energy, water, carbon.
2. ✅ **Building list & detail** — 5 facilities, zones hierarchy, sensors list, explainable status reasons.
3. ✅ **Sensor reading validation** — Rejects missing values and physically impossible readings (e.g. 99,999,999 kW).
4. ✅ **Persistence & historical retrieval** — Atomic SQLite writes and query retrieval.
5. ✅ **Simulator start, stop & step** — Configurable intervals, manual ticks, duplicate loop prevention.
6. ✅ **Energy & water physical calculations** — Correct time integration ($\Delta\text{kWh} = \text{kW} \cdot \frac{\Delta t}{3600}$; $\Delta\text{L} = \text{L/min} \cdot \frac{\Delta t}{60}$).
7. ✅ **Carbon emission calculations** — Verified regional factor without negative values.
8. ✅ **Alert generation & duplicate suppression** — Threshold triggers and 15-minute cooldown deduplication.
9. ✅ **Missing building & sensor error handling** — HTTP 404 with clean JSON error objects.
10. ✅ **What-if conservation scenario engine** — Decision support modeling without altering measured data.

---

## 9. Building Production Bundle

To build and validate the optimized production bundle:

```powershell
npm.cmd run build
npm.cmd run preview
```

---

## 10. Digital Twin Demonstration Walkthrough (For Hackathon Judges)

Follow these steps to demonstrate the full Phase 3 capabilities to judges:

1. **Launch Backend & Frontend**: Start Terminal 1 (`npm.cmd run dev:backend`) and Terminal 2 (`npm.cmd run dev:frontend`).
2. **Open Frontend**: Open `http://localhost:5173` and click **Digital Twin (Map)** in the sidebar.
3. **Inspect the 2D Schematic**:
   - Point out the 5 campus zones, pipeline overlays, and microgrid lines.
   - Show the dynamic health rings: `Healthy` (Library), `Warning` (Academic Block, Cafeteria, Water Tank), and `Critical` (Laboratory).
4. **Layer Toggling**: Click **Energy (kW)**, **Water (L/min)**, and **Waste Bins (%)** to show live telemetry overlay switching.
5. **Inspect Building Details**:
   - Click **Science & Tech Laboratory**.
   - Show the **Status Explainability** box: *"Cleanroom chiller compressor overload / continuous maximum load"*.
   - Explore the **Sensors** tab, **24h Historical Trends** chart, and **Facility Alerts**.
6. **Live Sensor Simulation**:
   - In the **Real-Time Edge Sensor Simulator** card, change the interval to **5 seconds**.
   - Watch the numbers for power (kW), water flow (L/min), and occupancy smoothly update in real time.
   - Click **Inject Test Anomaly** → select **Cafeteria Pipe Leak (85 L/m)**.
   - Notice the immediate update to Cafeteria flow rate and automatic generation of the high-severity alert.
7. **What-If Conservation Sandbox**:
   - Click **What-If Sandbox** on the building panel or in the sidebar.
   - Select **Academic Block**, choose **LED Lighting Retrofit**, and drag the slider to **30% reduction**.
   - Review the calculated baseline vs projected consumption, financial savings ($), avoided CO₂ (kg), and documented engineering assumptions.
8. **Sensor Ingestion Directory**:
   - Toggle view mode from **Map** to **Sensors Table**.
   - Show all 20 sensors across campus. Click **Inject** on any sensor to send a custom test reading and observe immediate rule evaluation.

---

## 11. Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| `npm.ps1 cannot be loaded` | Windows execution policy blocks `.ps1` scripts | Use `npm.cmd` instead of `npm` (e.g. `npm.cmd run dev:backend`) |
| `Port 8000 already in use` | Another process is occupying port 8000 | Kill occupying process: `Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess \| Stop-Process` or set `PORT=8080` in `.env` |
| `Python AI Service offline` | Python service not launched | Python service is optional; the Express backend provides automatic deterministic heuristic fallbacks with transparent labeling |

---

## License

<<<<<<< HEAD
MIT License — see [LICENSE](LICENSE) for details.

---

*Built for the AI-Powered Sustainable Campus Hackathon 2026 · EcoPulse AI Team*

---

## Backend Quick Start

The backend API is implemented in `backend/`. From the repository root, start it with:

```bash
npm install --prefix backend
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm start
```

The API base URL is `http://localhost:5000/api`.

- Health check: `http://localhost:5000/api/health`
- Swagger documentation: `http://localhost:5000/api/docs`
- Tests: `npm test`

## Documentation & Contracts

- [Backend Documentation](./backend/README.md)
- [Frontend API Contract](./backend/docs/FRONTEND_API_CONTRACT.md)
- [AI Integration Contract](./backend/docs/AI_SERVICE_CONTRACT.md)
- [Prisma Schema](./backend/prisma/schema.prisma)
=======
MIT License — Built for the AI-Powered Sustainable Campus Hackathon 2026.
>>>>>>> cb8121f (Implement Phase 3 Digital Twin campus integration)
