"""
Analytics API Endpoints.
Provides explainable anomaly detection, telemetry cleaning reports, and forecasting.
"""

from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any, List, Optional
import math

from app.analytics.schemas import (
    SensorReading,
    SensorEvaluationRequest,
    SensorEvaluationResponse,
    ForecastResponse
)
from app.analytics.anomaly_rules import anomaly_engine
from app.analytics.forecasting import telemetry_forecaster

router = APIRouter(tags=["Explainable Analytics"])


@router.post(
    "/detect-anomalies",
    summary="Statistical Z-Score Anomaly Detection (Legacy compatibility)"
)
async def detect_anomalies_legacy(payload: Dict[str, Any] = Body(...)):
    """
    Preserves exact contract of legacy ai-service/main.py.
    Calculates mean, standard deviation, and identifies 2.5-sigma outliers.
    """
    readings = payload.get("readings", [])
    if not readings:
        return {"anomalies_detected": False, "count": 0}

    values = [r.get("value", 0) for r in readings if isinstance(r.get("value"), (int, float))]
    if len(values) < 3:
        return {"anomalies_detected": False, "count": 0}

    mean = sum(values) / len(values)
    variance = sum((x - mean) ** 2 for x in values) / len(values)
    std_dev = math.sqrt(variance) or 1.0

    anomalies = []
    for r in readings:
        val = r.get("value", 0)
        z_score = abs(val - mean) / std_dev
        if z_score > 2.5:
            anomalies.append({
                "timestamp": r.get("measured_at"),
                "value": val,
                "z_score": round(z_score, 2),
                "severity": "critical" if z_score > 3.5 else "warning"
            })

    return {
        "anomalies_detected": len(anomalies) > 0,
        "count": len(anomalies),
        "mean": round(mean, 2),
        "std_dev": round(std_dev, 2),
        "anomalies": anomalies
    }


@router.post(
    "/api/analytics/evaluate",
    response_model=SensorEvaluationResponse,
    summary="Full Explainable Multi-Sensor Evaluation"
)
async def evaluate_sensor_telemetry(request: SensorEvaluationRequest):
    """
    Runs multi-condition explainable analytics:
    - Data deduplication and bounds cleaning
    - Sustained high water flow rule (N consecutive readings)
    - Baseline power surge (requires both % and min absolute deviation)
    - Waste bin overflow threshold
    - Stale sensor inactivity flag
    - Standardized resource intensities (kWh/m2, L/person)
    """
    try:
        return anomaly_engine.evaluate_telemetry(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sensor evaluation error: {str(e)}")


@router.post(
    "/api/analytics/forecast",
    response_model=ForecastResponse,
    summary="Telemetry Regression & Forecasting"
)
async def forecast_telemetry(
    readings: List[SensorReading] = Body(..., description="Chronological sensor readings"),
    horizon_steps: int = Body(5, description="Number of future intervals to project"),
    step_minutes: int = Body(15, description="Minutes between intervals")
):
    """
    Generates ordinary least squares linear projection with 95% confidence bounds.
    Requires at least 5 readings; returns explicit limitation if insufficient.
    """
    try:
        return telemetry_forecaster.generate_forecast(
            readings=readings,
            horizon_steps=horizon_steps,
            step_minutes=step_minutes
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecasting error: {str(e)}")
