"""
End-to-End tests for the Signature Feature: EcoImpact Intelligence Engine.
Tests full pipeline:
Input -> Vision -> Anomaly Rules -> Evidence Validation -> Grounded GenAI -> Impact Estimation.
"""

import io
import pytest
from PIL import Image
from datetime import datetime, timedelta, timezone

from app.intelligence.engine import intelligence_engine, EcoImpactAnalysisRequest
from app.analytics.schemas import SensorReading


def generate_leak_image_bytes() -> bytes:
    """Creates a sample test image with high blue channel representing moisture pooling."""
    img = Image.new("RGB", (250, 250), color=(60, 110, 210))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.mark.asyncio
async def test_corroborated_water_leak_workflow():
    """
    Scenario 1: Image of moisture halo + active high flow sensor readings.
    Cross-validation elevates confidence to CORROBORATED and computes quantitative impact.
    """
    img_bytes = generate_leak_image_bytes()
    now = datetime.now(timezone.utc)

    # Consecutive readings above threshold (25 L/min) with distinct chronological timestamps
    readings = [
        SensorReading(sensor_id="FLOW-CAF", metric="water_flow", value=32.0, unit="L/min", measured_at=(now - timedelta(seconds=20)).isoformat()),
        SensorReading(sensor_id="FLOW-CAF", metric="water_flow", value=34.0, unit="L/min", measured_at=(now - timedelta(seconds=10)).isoformat()),
        SensorReading(sensor_id="FLOW-CAF", metric="water_flow", value=36.0, unit="L/min", measured_at=now.isoformat())
    ]

    req = EcoImpactAnalysisRequest(
        building_id="Campus Cafeteria",
        zone_id="Zone C",
        sensor_readings=readings,
        user_notes="Investigating wet spot under kitchen dishwasher"
    )

    report = await intelligence_engine.execute_workflow(
        image_bytes=img_bytes,
        image_content_type="image/jpeg",
        request_params=req
    )

    assert report.workflow_status == "completed"
    assert report.vision_analysis is not None
    assert report.sensor_evaluation is not None
    assert report.evidence_validation.status == "CORROBORATED"
    assert report.evidence_validation.is_confirmed is True

    # Recommendation
    assert report.recommendation.priority in ("high", "critical")
    assert len(report.recommendation.action_steps) > 0

    # Impact estimation must be calculated based on observed 36 L/min flow
    assert report.estimated_impact is not None
    assert report.estimated_impact.quantity > 0 # Liters per day
    assert report.estimated_impact.cost_usd > 0
    assert report.estimated_impact.emissions_kg_co2e > 0


@pytest.mark.asyncio
async def test_unconfirmed_visual_only_leaves_impact_null():
    """
    Scenario 2: Photographic image uploaded WITHOUT supporting flow sensor data.
    System must NOT infer leak quantity or fabricate impact. Impact must be null.
    """
    img_bytes = generate_leak_image_bytes()

    req = EcoImpactAnalysisRequest(
        building_id="Science Wing",
        zone_id="Zone A",
        sensor_readings=[], # No sensor data
        user_notes="Found puddle on basement floor"
    )

    report = await intelligence_engine.execute_workflow(
        image_bytes=img_bytes,
        image_content_type="image/jpeg",
        request_params=req
    )

    assert report.workflow_status == "completed"
    assert report.vision_analysis is not None
    assert report.evidence_validation.status == "UNCONFIRMED_VISUAL_ONLY"
    assert report.evidence_validation.is_confirmed is False
    
    # Impact MUST be None because no quantitative flow rate exists
    assert report.estimated_impact is None
    assert any("numerical impact is null" in lim.lower() for lim in report.recommendation.limitations)


@pytest.mark.asyncio
async def test_telemetry_only_workflow():
    """
    Scenario 3: Sensor telemetry anomaly without an image upload.
    Pipeline runs explainable rules, provides grounded steps, and estimates impact.
    """
    now = datetime.now(timezone.utc).isoformat()
    readings = [
        SensorReading(sensor_id="PWR-MAIN", metric="energy", value=65.0, unit="kW", measured_at=now)
    ]

    req = EcoImpactAnalysisRequest(
        building_id="Academic Block",
        zone_id="Zone 1",
        sensor_readings=readings,
        baseline_energy_kw=40.0 # 65 kW vs 40 kW baseline = +25 kW (+62.5%)
    )

    report = await intelligence_engine.execute_workflow(
        image_bytes=None,
        request_params=req
    )

    assert report.workflow_status == "completed"
    assert report.vision_analysis is None # No image provided
    assert report.sensor_evaluation is not None
    assert report.evidence_validation.status == "TELEMETRY_ANOMALY_ONLY"
    
    # Impact calculated for 25 kW surge
    assert report.estimated_impact is not None
    assert report.estimated_impact.metric == "excess_electricity"
    assert report.estimated_impact.quantity == 600.0 # 25 kW * 24h = 600 kWh
