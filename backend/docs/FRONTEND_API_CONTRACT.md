# AI-Powered Sustainable Campus — Frontend API Contract
**Target Audience**: Person 1 (Frontend & Dashboard Engineer)  
**Backend Base URL**: `http://localhost:5000/api`  
**Swagger UI**: `http://localhost:5000/api/docs`  
**Raw OpenAPI Spec**: `http://localhost:5000/api/docs/json`  

---

## 1. Authentication & Headers

Protected routes require an `Authorization` header containing the Bearer token:
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Seed Credentials for Hackathon Demonstration:
| Role | Email | Password | Allowed Capabilities |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@campus.edu` | `CampusPass2026!` | All endpoints + Settings modifications |
| **FACILITY_MANAGER** | `manager@campus.edu` | `CampusPass2026!` | Telemetry, alerts, maintenance assignment |
| **VIEWER** | `viewer@campus.edu` | `CampusPass2026!` | Read-only dashboards and Digital Twin |

---

## 2. Standard Response Contract

### Success Response:
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-10-15T06:00:00.000Z",
    "pagination": {
      "total": 120,
      "limit": 50,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

### Error Response:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "consumptionKwh",
        "message": "consumptionKwh must be non-negative"
      }
    ]
  }
}
```

---

## 3. Endpoints Directory & Examples

### A. Health & System
* `GET /api/health`: Health status of server and SQLite database.
* `GET /api/system/status`: Total buildings, active sensors, reading counts, and data mode.

### B. Overview Dashboard
* `GET /api/dashboard`: Unified dashboard metrics including:
  - `campusOverview.dataMode`: `"SIMULATED_DEMO_DATA"` or `"LIVE_TELEMETRY"`
  - `sustainabilityScore.currentScore`: `80.0` (out of 100)
  - `energy.totalConsumptionKwh`, `energy.renewablePercentage`, `energy.averagePeakDemandKw`
  - `water.totalVolumeLitres`, `water.recycledPercentage`, `water.flowRateStatus`
  - `waste.totalWeightKg`, `waste.diversionRatePercent`, `waste.averageBinFullnessPercent`
  - `carbon.totalKgCo2e`, `carbon.totalMetricTonsCo2e`
  - `alerts.totalActive`, `alerts.criticalCount`
* `GET /api/dashboard/trends`: Synchronized time-series points `[{ period, energyKwh, solarKwh, waterLitres }]`.
* `GET /api/dashboard/building-comparison`: Building rankings, intensity per sq ft, and performance tiers (A, B, C).

### C. Campus & 3D Digital Twin
* `GET /api/buildings`: All campus buildings. Includes `digitalTwinCoordinates`:
```json
{
  "x": 25.5,
  "y": 0.0,
  "z": 12.0,
  "length": 60,
  "width": 40,
  "height": 20
}
```
* `GET /api/buildings/:id`: Specific building with nested zones and active sensors.
* `GET /api/buildings/:id/metrics`: Aggregated energy, water, waste, and active alerts for that building.
* `GET /api/zones`: List campus zones (classrooms, research labs, dining halls).

### D. Energy Monitoring
* `GET /api/energy`: Paginated readings. Filter by `?buildingId=...&source=GRID|SOLAR|GENERATOR&startDate=...&endDate=...`
* `GET /api/energy/summary`: Total kWh, source breakdown (grid vs solar), and peak kW.
* `GET /api/energy/trends`: Time series points grouped by `?interval=daily|hourly`.
* `POST /api/energy/readings`:
```json
// POST /api/energy/readings
{
  "buildingId": "cm123...",
  "consumptionKwh": 340.5,
  "peakDemandKw": 28.4,
  "source": "GRID"
}
```

### E. Water Monitoring
* `GET /api/water`: Paginated readings. Filter by `?buildingId=...&category=POTABLE|RECYCLED|IRRIGATION`
* `GET /api/water/summary`: Potable vs recycled volume, recycling %, and anomaly status.
* `GET /api/water/trends`: Water consumption trends over time.
* `POST /api/water/readings`: Record water meter measurement.

### F. Waste Monitoring
* `GET /api/waste`: Paginated bin fullness and weight records.
* `GET /api/waste/summary`: Diversion rate %, landfill vs recycled kg, and fullness %.
* `GET /api/waste/detections`: Computer vision detection records.
* `POST /api/waste/detections`: Log a detection event.

### G. Alerts & Sustainability Guardian
* `GET /api/alerts`: Active alerts. Filter by `?severity=LOW|MEDIUM|HIGH|CRITICAL&status=OPEN|ACKNOWLEDGED|RESOLVED`.
* `GET /api/alerts/:id`: Alert with chronological audit history.
* `PATCH /api/alerts/:id`:
```json
// PATCH /api/alerts/:id
{
  "status": "ACKNOWLEDGED", // or "RESOLVED"
  "note": "HVAC technician investigating sensor drift."
}
```
* `POST /api/alerts/evaluate`: Run rule evaluation engine (scans flow rates, peak kW, bin capacity). Avoids duplicate alerts for ongoing issues.

### H. Sustainability Score (CSI-100)
* `GET /api/sustainability-score`: Score out of 100 with component weights:
  - Energy: 35%
  - Water: 25%
  - Waste: 20%
  - Carbon: 20%
  - Explicit missing-data penalty & freshness rating.
* `GET /api/sustainability-score/history`: Historical scores.

### I. Carbon Footprint
* `GET /api/carbon`: Greenhouse gas emissions breakdown:
  - Scope 1: Direct stationary combustion
  - Scope 2: Indirect purchased grid electricity
  - Scope 3: Water distribution & landfill waste
  - Units in `kg CO2e` and `MT CO2e`. Configurable emission factors displayed.
* `GET /api/carbon/trends`: Historical emissions.

### J. What-If Simulator
* `POST /api/simulator`:
```json
// Request Body
{
  "name": "15% Energy Reduction + 20kW Rooftop Solar",
  "energyReductionPct": 15,
  "waterEfficiencyPct": 10,
  "solarAdditionKw": 20,
  "tariffPerKwh": 0.14,
  "gridEmissionFactor": 0.82,
  "baselineDays": 30
}
```
Returns:
- `energyResults`: baseline kWh, projected kWh, absolute savings kWh, percentage savings.
- `financialResults`: baseline cost ($), projected cost ($), cost savings ($).
- `carbonResults`: baseline kg CO2e, projected kg CO2e, CO2e savings (kg and metric tons).
- `assumptions`: explicit calculation parameters used.
* `GET /api/simulator/:id`: Retrieve scenario by ID.

### K. Maintenance Management
* `GET /api/maintenance`: List tasks with filter by `?status=PENDING|IN_PROGRESS|COMPLETED|CANCELLED`.
* `POST /api/maintenance`: Create maintenance task.
* `PATCH /api/maintenance/:id`: Status transition:
  - `PENDING` -> `IN_PROGRESS` or `CANCELLED`
  - `IN_PROGRESS` -> `COMPLETED` or `CANCELLED`

### L. AI Services
* `POST /api/ai/waste-detection`: Send image file via multipart form-data (field: `image`) or JSON with `imageUrl`.
* `POST /api/ai/chat`:
```json
// POST /api/ai/chat
{
  "message": "What is the primary cause of peak energy demand this week?"
}
```
* `POST /api/ai/recommendations`:
```json
// POST /api/ai/recommendations
{
  "domain": "ENERGY" // or "WATER", "WASTE", "ALL"
}
```
