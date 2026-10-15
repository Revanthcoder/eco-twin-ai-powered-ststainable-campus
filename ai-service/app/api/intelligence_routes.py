"""
EcoImpact Intelligence Engine API Endpoint.
Exposes the end-to-end multi-modal intelligence pipeline.
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request
from typing import Optional
import json

from app.intelligence.engine import (
    intelligence_engine,
    EcoImpactIntelligenceReport,
    EcoImpactAnalysisRequest
)

router = APIRouter(tags=["EcoImpact Intelligence Engine"])


@router.post(
    "/api/intelligence/analyze",
    response_model=EcoImpactIntelligenceReport,
    summary="End-to-End EcoImpact Intelligence Workflow"
)
async def run_eco_impact_analysis(
    request: Request,
    image: Optional[UploadFile] = File(None),
    file: Optional[UploadFile] = File(None),
    building_id: Optional[str] = Form(None),
    zone_id: Optional[str] = Form(None),
    baseline_energy_kw: Optional[float] = Form(None),
    user_notes: Optional[str] = Form(None),
    confidence_threshold: Optional[float] = Form(None),
    readings_json: Optional[str] = Form(None)
):
    """
    Executes the signature end-to-end AI workflow:
    Image / Sensor Input -> AI Detection -> Anomaly Analysis -> Evidence Validation -> Grounded Recommendation -> Impact Estimation.
    """
    upload = image or file
    image_bytes = None
    content_type = None

    if upload:
        image_bytes = await upload.read()
        content_type = upload.content_type

    # Parse readings if passed as form-data JSON string
    sensor_readings = []
    if readings_json:
        try:
            parsed_readings = json.loads(readings_json)
            sensor_readings = parsed_readings
        except Exception:
            pass

    # Handle pure JSON request body if no multipart file was sent
    if not image_bytes:
        try:
            body = await request.body()
            if body and len(body) > 0:
                json_data = json.loads(body.decode("utf-8"))
                building_id = json_data.get("building_id", building_id)
                zone_id = json_data.get("zone_id", zone_id)
                baseline_energy_kw = json_data.get("baseline_energy_kw", baseline_energy_kw)
                user_notes = json_data.get("user_notes", user_notes)
                confidence_threshold = json_data.get("confidence_threshold", confidence_threshold)
                if "sensor_readings" in json_data:
                    sensor_readings = json_data["sensor_readings"]
        except Exception:
            pass

    req_obj = EcoImpactAnalysisRequest(
        building_id=building_id or "Main Campus Facility",
        zone_id=zone_id or "Zone A",
        sensor_readings=sensor_readings,
        baseline_energy_kw=baseline_energy_kw,
        user_notes=user_notes,
        confidence_threshold=confidence_threshold
    )

    try:
        report = await intelligence_engine.execute_workflow(
            image_bytes=image_bytes,
            image_content_type=content_type,
            request_params=req_obj
        )
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"EcoImpact workflow error: {str(e)}")
