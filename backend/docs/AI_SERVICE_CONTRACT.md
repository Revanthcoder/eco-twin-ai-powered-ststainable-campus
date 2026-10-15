# AI Service Integration Contract
**Target Audience**: Person 3 (AI, Computer Vision & Generative AI Engineer)  
**Consumer**: Node.js/Express Backend (`src/integrations/aiClient.js`)  
**Configured Environment Variable**: `AI_SERVICE_URL=http://localhost:8000`  
**Default Timeout**: `5000ms` (Configurable via `AI_SERVICE_TIMEOUT_MS`)  

---

## 1. Overview & Protocol
The Node.js backend communicates with Person 3's Python AI microservice (built with FastAPI, Flask, or TorchServe) over HTTP.

### Fallback Behavior:
* If your service is offline, down, or times out:
  * In **development mode**: The backend catches the error and returns an explicitly labeled mock fallback (`isMockFallback: true`, `isModelEstimate: true`).
  * In **production mode**: The backend returns a clean HTTP 503 error (`EXTERNAL_SERVICE_ERROR`) without leaking Python traces or credentials.

---

## 2. Endpoints Person 3 Must Implement

### Endpoint 1: Waste Classification & Object Detection
* **Method**: `POST`
* **Path**: `/detect/waste`
* **Content-Type**: `multipart/form-data`

#### Request:
| Field | Type | Description |
| :--- | :--- | :--- |
| `file` | Binary (image/jpeg, image/png) | The uploaded waste bin camera frame or snapshot |

#### Expected Response (HTTP 200):
```json
{
  "category": "PLASTIC",
  "confidence": 0.94,
  "estimatedWeightKg": 0.18,
  "boundingBox": {
    "xmin": 120,
    "ymin": 85,
    "xmax": 340,
    "ymax": 410
  },
  "detectedItems": [
    {
      "label": "pet_water_bottle",
      "confidence": 0.94
    }
  ],
  "inferenceMs": 42
}
```

*Permitted category values*: `"PLASTIC"`, `"PAPER"`, `"ORGANIC"`, `"METAL"`, `"GLASS"`, `"E_WASTE"`, `"UNKNOWN"`.  
*Confidence value*: Must be a normalized float between `0.0` and `1.0`.

---

### Endpoint 2: Conversational Sustainability Advisor (LLM)
* **Method**: `POST`
* **Path**: `/chat/sustainability`
* **Content-Type**: `application/json`

#### Request Body:
```json
{
  "message": "Why did Engineering Hall experience peak demand yesterday at 2 PM?",
  "context": [
    {
      "role": "system",
      "content": "You are the GreenTech Campus AI Sustainability Copilot."
    },
    {
      "role": "user",
      "content": "Hello"
    },
    {
      "role": "assistant",
      "content": "Hello! I am ready to analyze campus telemetry."
    }
  ]
}
```

#### Expected Response (HTTP 200):
```json
{
  "reply": "Telemetry indicates Engineering Hall reached 48.2 kW at 2 PM due to concurrent scheduling of CS server racks and HVAC chiller cycles. Shifting cooling load 30 minutes earlier would eliminate the peak surcharge.",
  "modelName": "Campus-LLaMA-3-Sustainability",
  "sources": [
    "Sensor: EM-ENG-01",
    "Campus Rate Tariff Schedule 2026"
  ]
}
```

---

### Endpoint 3: Prescriptive Analytics & Optimization Recommendations
* **Method**: `POST`
* **Path**: `/recommendations/optimize`
* **Content-Type**: `application/json`

#### Request Body:
```json
{
  "buildingId": "cm123abc...", // optional: null for entire campus
  "domain": "ENERGY" // "ENERGY", "WATER", "WASTE", or "ALL"
}
```

#### Expected Response (HTTP 200):
```json
{
  "recommendations": [
    {
      "id": "REC-01",
      "domain": "ENERGY",
      "title": "Shift Autoclave Run Schedule to Off-Peak Hours",
      "impactScore": 8.5,
      "estimatedSavingsKwhPerMonth": 1200,
      "estimatedCostSavingsUsd": 168.0,
      "paybackPeriodMonths": 0,
      "implementationDifficulty": "LOW",
      "description": "Coordinate with lab staff in Science Complex to run sterilizers before 10 AM or after 6 PM."
    }
  ]
}
```

---

## 3. Fast Reference Mock Service in Python (FastAPI)
Person 3 can start with this minimal FastAPI implementation:
```python
from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(title="Campus AI Service")

class ChatRequest(BaseModel):
    message: str
    context: Optional[List[dict]] = []

@app.post("/detect/waste")
async def detect_waste(file: UploadFile = File(...)):
    # Run YOLO or custom PyTorch model here
    return {
        "category": "PLASTIC",
        "confidence": 0.95,
        "estimatedWeightKg": 0.20,
        "boundingBox": {"xmin": 50, "ymin": 50, "xmax": 200, "ymax": 200},
        "detectedItems": [{"label": "plastic_bottle", "confidence": 0.95}]
    }

@app.post("/chat/sustainability")
async def chat(req: ChatRequest):
    return {
        "reply": f"AI Response to: {req.message}",
        "modelName": "Campus-LLM",
        "sources": ["Campus Telemetry"]
    }

@app.post("/recommendations/optimize")
async def recommendations(payload: dict):
    return {
        "recommendations": [
            {
                "id": "REC-01",
                "domain": "ENERGY",
                "title": "Stagger HVAC startup in Engineering Hall",
                "impactScore": 8.0,
                "estimatedSavingsKwhPerMonth": 950,
                "estimatedCostSavingsUsd": 133.0,
                "implementationDifficulty": "LOW",
                "description": "Pre-cool zones sequentially rather than simultaneously."
            }
        ]
    }
```
Run with: `uvicorn main:app --port 8000 --reload`
