"""
API Integration Tests.
Verifies all HTTP endpoints, payload formats, status codes, and backward compatibility.
"""

import io
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.main import app

client = TestClient(app)


def get_sample_png_file():
    img = Image.new("RGB", (100, 100), color=(70, 130, 180))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return ("test.png", buf, "image/png")


def test_health_check_endpoints():
    """Validates /health and /api/health."""
    for path in ["/health", "/api/health"]:
        res = client.get(path)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "online"
        assert "computer_vision_diagnostics" in data["capabilities"]
        assert "model_version" in data


def test_vision_predict_endpoint_multipart():
    """Validates /predict and /api/vision/analyze with multipart image."""
    filename, buf, mime = get_sample_png_file()
    
    res = client.post(
        "/predict",
        files={"image": (filename, buf, mime)},
        data={"building_id": "Cafeteria"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["analysisStatus"] in ("completed", "uncertain")
    assert "detections" in data
    assert len(data["limitations"]) > 0


def test_detect_waste_endpoint():
    """Validates /detect/waste compatibility endpoint."""
    filename, buf, mime = get_sample_png_file()
    
    res = client.post("/detect/waste", files={"file": (filename, buf, mime)})
    assert res.status_code == 200
    data = res.json()
    assert "category" in data
    assert "confidence" in data
    assert data["is_model_estimate"] is True


def test_legacy_detect_anomalies_endpoint():
    """Validates legacy /detect-anomalies z-score endpoint."""
    # 10 baseline readings + 1 strong outlier for valid > 2.5 sigma test
    readings = [
        {"value": 10.0 + (i % 2) * 0.2, "measured_at": f"2026-10-15T10:0{i}:00Z"}
        for i in range(10)
    ]
    readings.append({"value": 85.0, "measured_at": "2026-10-15T10:11:00Z"})
    
    payload = {"readings": readings}
    res = client.post("/detect-anomalies", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["anomalies_detected"] is True
    assert data["count"] >= 1
    assert data["anomalies"][0]["z_score"] > 2.5


def test_analytics_evaluate_endpoint():
    """Validates /api/analytics/evaluate multi-sensor rule endpoint."""
    payload = {
        "readings": [
            {"sensor_id": "BIN-01", "metric": "waste_bin", "value": 92.0, "unit": "%", "measured_at": "2026-10-15T12:00:00Z"}
        ]
    }
    res = client.post("/api/analytics/evaluate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["anomalies_detected"] is True
    # Verify that the bin fullness rule was evaluated and included
    assert any(a["rule_id"] == "RULE-BIN-FULLNESS" for a in data["alerts"])


def test_chat_sustainability_endpoint():
    """Validates /chat/sustainability advisor endpoint."""
    res = client.post(
        "/chat/sustainability",
        json={"message": "Which building uses the most energy?"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "reply" in data
    assert "citations" in data
    assert "Laboratory" in data["reply"] or "Science" in data["reply"]


def test_recommendations_optimize_endpoint():
    """Validates /recommendations/optimize endpoint."""
    res = client.post(
        "/recommendations/optimize",
        json={"buildingId": 1, "domain": "WATER"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "recommendations" in data
    assert len(data["recommendations"]) > 0
    assert data["recommendations"][0]["domain"] == "WATER"


def test_explain_simulation_endpoint():
    """Validates /api/llm/explain-simulation endpoint."""
    payload = {
        "output": {
            "scenario_name": "Solar Array Expansion",
            "metric_type": "energy",
            "baseline_value": 1000.0,
            "projected_value": 750.0,
            "difference": 250.0,
            "percent_saved": 25.0,
            "cost_saved_usd": 35.0,
            "co2_avoided_kg": 105.0,
            "unit": "kWh"
        }
    }
    res = client.post("/api/llm/explain-simulation", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["verified_consistent_with_backend"] is True
    assert "Solar Array Expansion" in data["scenario_name"]


def test_intelligence_analyze_endpoint():
    """Validates the signature EcoImpact Intelligence /api/intelligence/analyze endpoint."""
    filename, buf, mime = get_sample_png_file()
    
    res = client.post(
        "/api/intelligence/analyze",
        files={"image": (filename, buf, mime)},
        data={
            "building_id": "Cafeteria",
            "zone_id": "Zone C",
            "user_notes": "Suspected pipe drip near dish room"
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert data["workflow_status"] == "completed"
    assert "vision_analysis" in data
    assert "evidence_validation" in data
    assert "recommendation" in data
