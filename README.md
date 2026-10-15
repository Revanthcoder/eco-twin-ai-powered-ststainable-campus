# EcoPulse AI 🌿 — Campus Sustainability Intelligence

> **AI-Powered Sustainable Campus Digital Twin · Hackathon Project 2026**

![EcoPulse AI Banner](https://img.shields.io/badge/EcoPulse%20AI-Campus%20Sustainability%20Intelligence-10b981?style=for-the-badge&logo=leaf)
![React](https://img.shields.io/badge/React-18.3-61dafb?style=flat-square&logo=react)
![Vite](https://img.shields.io/badge/Vite-6.0-646cff?style=flat-square&logo=vite)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?style=flat-square&logo=fastapi)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## Overview

**EcoPulse AI** is a real-time campus sustainability intelligence platform that integrates IoT sensor telemetry, AI vision inspection, and what-if simulation to drive evidence-based environmental decisions across a university campus.

Built as a hackathon prototype connecting to the **EcoTwin AI FastAPI backend** (SQLite-powered, 5 fictional campus locations), this frontend provides:

- 📊 **EcoPulse Dashboard** — Composite sustainability score, electricity, water, waste, and recycling KPIs
- 🗺️ **Interactive Digital Twin** — Clickable 2D campus map with green / yellow / red facility health markers
- 📸 **AI Vision Scanner** — Upload campus images and receive computer-vision-based issue detection
- 🚨 **Smart Alerts** — Live issue triage with severity, location, timestamp, and status workflow
- 🔬 **What-If Simulator** — Physics-based energy and water conservation scenario modeling
- 🤖 **Eco AI Assistant** — Conversational sustainability assistant with telemetry citations
- 📈 **Impact Reports** — ESG trend analysis and environmental impact estimations

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend Framework | React 18 |
| Build Tool | Vite 6 |
| Language | JavaScript (JSX) |
| Styling | Pure CSS (no framework — custom design system) |
| Icons | Lucide React |
| Backend API | FastAPI + SQLite (EcoTwin AI) |
| API Integration | Centralized service with labeled demo mode |

---

## Project Structure

```
twin campus agentic AI/
├── .gitignore
├── .env.example             ← Copy to .env and set VITE_API_URL
├── package.json
├── vite.config.js
├── index.html
└── src/
    ├── main.jsx             ← React entry point
    ├── App.jsx              ← Root router + global state
    ├── services/
    │   ├── api.js           ← Centralized API client (auto-detects backend)
    │   └── demoData.js      ← Labeled synthetic baseline (never misrepresented)
    ├── styles/
    │   ├── index.css        ← Design tokens + CSS variables
    │   └── App.css          ← Layout, cards, charts, responsive breakpoints
    └── components/
        ├── common/
        │   ├── Navbar.jsx       ← Header with backend status & demo toggle
        │   ├── Sidebar.jsx      ← Navigation menu with alert counters
        │   ├── StatusBadge.jsx  ← Color-coded status indicator
        │   └── MetricCard.jsx   ← Telemetry KPI card with trend delta
        ├── dashboard/
        │   ├── EcoPulseDashboard.jsx     ← Main dashboard view
        │   ├── SustainabilityScoreGauge.jsx ← Circular SVG gauge
        │   ├── MetricsGrid.jsx           ← 4 resource KPI cards
        │   ├── ConsumptionTrendChart.jsx ← 24h SVG telemetry chart
        │   ├── CampusStatusSummary.jsx   ← 5-zone building status
        │   └── RecentAlertsList.jsx      ← Priority alert list
        └── views/
            └── FeaturePlaceholder.jsx    ← Phase-ready stub views
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18.0.0 — [nodejs.org](https://nodejs.org)
- **npm** ≥ 9.0.0 (included with Node.js)
- *(Optional)* EcoTwin FastAPI backend running at `http://127.0.0.1:8000`

### 1. Clone the Repository

```powershell
git clone https://github.com/<your-username>/ecopulse-campus-ai.git
cd ecopulse-campus-ai
```

### 2. Install Dependencies

```powershell
npm install
```

### 3. Configure Environment

```powershell
# Copy the example env file
copy .env.example .env
```

Edit `.env` if your backend runs on a different URL:

```env
VITE_API_URL=http://127.0.0.1:8000
```

### 4. Start the Development Server

```powershell
npm run dev
```

Open **http://localhost:5173** in your browser.

### 5. Build for Production

```powershell
npm run build
npm run preview
```

---

## Backend Integration (EcoTwin AI)

The frontend automatically detects the FastAPI backend at startup via a health check (`/api/health`). 

| Mode | Behavior |
|------|----------|
| **Backend Online** | Streams live telemetry from SQLite, indicator shows ✅ |
| **Backend Offline** | Falls back to labeled synthetic demo data, banner shows `DEMO MODE` |
| **Demo Toggle** | Click the Demo Data switch in the navbar to force demo mode |

> **Important:** Synthetic/simulated data is always visibly labeled. The application never presents estimated or simulated values as actual measurements.

### Backend: EcoTwin AI FastAPI

The companion backend lives in `D:\ecotwin-backend` (or a sibling repo). To start it:

```powershell
# In the backend folder
.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

API Docs: `http://127.0.0.1:8000/docs`

---

## Campus Locations (Seeded Data)

| # | Building | Type | Zone |
|---|----------|------|------|
| 1 | Academic Block | Academic | Zone A – North Quad |
| 2 | Library | Library | Zone B – Central Plaza |
| 3 | Cafeteria | Cafeteria | Zone C – South Courtyard |
| 4 | Laboratory | Laboratory | Zone D – Science Park |
| 5 | Water Tank | Utility | Zone E – Infrastructure Yard |

---

## Development Roadmap

- [x] **Phase 1** — EcoPulse Dashboard (sustainability score, 4 KPI cards, telemetry chart, zone summary, alerts)
- [ ] **Phase 2** — Interactive Digital Twin (clickable 2D campus map with live status markers)
- [ ] **Phase 3** — AI Vision Scanner (image upload, preview, validation, detection results)
- [ ] **Phase 4** — Smart Alerts (full issue management with triage workflows)
- [ ] **Phase 5** — What-If Simulator (energy and water conservation modeling)
- [ ] **Phase 6** — Eco AI Assistant (conversational sustainability agent)
- [ ] **Phase 7** — Impact Reports (ESG trends and carbon offset analysis)

---

## Key Design Principles

- 🏷️ **Transparency First** — Demo data always labeled; no simulated values presented as real
- 🔑 **No API Keys in Code** — All secrets via environment variables only
- ♿ **Accessible** — ARIA roles, keyboard navigation, semantic HTML throughout
- 📱 **Responsive** — Optimized for both 1080p desktops and mobile screens
- 🔌 **Backend-Ready** — API service automatically connects when backend is available

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

*Built for the AI-Powered Sustainable Campus Hackathon 2026 · EcoPulse AI Team*
