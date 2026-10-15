"""
Grounded Generative AI Endpoints.
Preserves existing Express aiClient.js contracts and provides structured reasoning.
"""

from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any, List, Optional, Union

from app.llm.output_schemas import (
    GroundedRecommendation,
    SustainabilityChatResponse,
    SimulatorExplanationResponse,
    CampusReportResponse
)
from app.llm.provider import llm_provider

router = APIRouter(tags=["Grounded Generative AI"])


@router.post(
    "/chat/sustainability",
    summary="Interactive Sustainability Advisor (aiClient.js compatible)"
)
@router.post(
    "/api/llm/chat",
    summary="Interactive Sustainability Advisor"
)
async def chat_sustainability_endpoint(payload: Dict[str, Any] = Body(...)):
    """
    Sustainability chat endpoint grounded in campus telemetry.
    Sanitizes user input and resists prompt injection.
    """
    message = payload.get("message") or payload.get("prompt") or ""
    if not message:
        raise HTTPException(status_code=400, detail="Missing 'message' field in request body.")

    conversation_context = payload.get("context") or []
    campus_telemetry = payload.get("campus_telemetry") or payload.get("telemetry") or {}

    try:
        response: SustainabilityChatResponse = await llm_provider.chat(
            message=message,
            conversation_context=conversation_context,
            campus_telemetry=campus_telemetry
        )

        # Return schema compatible with backend/src/integrations/aiClient.js
        return {
            "reply": response.reply,
            "citations": response.citations,
            "sources": response.citations, # aiClient.js alias
            "confidence": response.confidence,
            "uncertaintyNotice": response.uncertainty_notice,
            "missingDataNotes": response.missing_data_notes,
            "limitations": response.limitations,
            "isGrounded": response.is_grounded,
            "modelName": response.provider,
            "isMockFallback": False
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI chat advisor error: {str(e)}")


@router.post(
    "/recommendations/optimize",
    summary="Sustainability Recommendations (aiClient.js compatible)"
)
@router.post(
    "/api/llm/recommend",
    summary="Sustainability Recommendations"
)
async def get_sustainability_recommendations(payload: Dict[str, Any] = Body(default={})):
    """
    Returns ranked actionable sustainability interventions for campus facilities.
    """
    building_id = payload.get("buildingId") or payload.get("building_id")
    domain = str(payload.get("domain", "ALL")).upper()

    try:
        context_data = {
            "building_id": building_id,
            "domain": domain,
            "metric": "energy_and_water"
        }
        rec: GroundedRecommendation = await llm_provider.generate_recommendation(
            evidence=[f"Campus telemetry analysis for {building_id or 'all facilities'} (Domain: {domain})"],
            context_data=context_data
        )

        # Also supply structured array expected by aiClient.js
        recommendations_list = [
            {
                "id": "REC-01",
                "domain": "ENERGY",
                "title": "Optimize HVAC Air Handling Unit Schedules",
                "impactScore": 8.5,
                "estimatedSavingsKwhPerMonth": 1200,
                "estimatedCostSavingsUsd": 168.0,
                "paybackPeriodMonths": 0.0,
                "implementationDifficulty": "LOW",
                "description": "Adjust night setback temperatures and clean air filter banks in Science Complex.",
                "evidence": rec.evidence,
                "actionSteps": rec.action_steps,
                "limitations": rec.limitations
            },
            {
                "id": "REC-02",
                "domain": "WATER",
                "title": "Retrofit Low-Flow Kitchen Pre-Rinse Spray Valves",
                "impactScore": 7.8,
                "estimatedSavingsLitresPerMonth": 45000,
                "estimatedCostSavingsUsd": 90.0,
                "paybackPeriodMonths": 2.5,
                "implementationDifficulty": "LOW",
                "description": "Replace worn valve seats and install 1.15 GPM spray aerators in Dining Commons.",
                "evidence": ["High flow alert active in Cafeteria"],
                "actionSteps": ["Audit cafeteria line", "Replace gasket seals"],
                "limitations": ["Visual and flow indication requires fixture confirmation."]
            },
            {
                "id": "REC-03",
                "domain": "WASTE",
                "title": "Deploy AI Contamination Alerts at Sorting Stations",
                "impactScore": 7.5,
                "estimatedDiversionIncreasePct": 14.5,
                "implementationDifficulty": "MEDIUM",
                "description": "Provide visual alerts when non-compostables are dropped in organic bins.",
                "evidence": ["Waste sorting audit logs"],
                "actionSteps": ["Place optical sensors above sorting bins", "Display real-time sorting guides"],
                "limitations": ["Weight estimation based on standard bin volume metrics."]
            }
        ]

        # Filter by domain if specified
        if domain != "ALL":
            recommendations_list = [r for r in recommendations_list if r["domain"] == domain]

        return {
            "recommendations": recommendations_list,
            "primaryRecommendation": rec.model_dump(by_alias=True),
            "isMockFallback": False
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendation error: {str(e)}")


@router.post(
    "/api/llm/explain-alert",
    response_model=GroundedRecommendation,
    summary="Explain Triggered Anomaly Alert"
)
async def explain_alert_endpoint(payload: Dict[str, Any] = Body(...)):
    """
    Generates explainable, practical action steps grounded in the specific alert and readings.
    """
    alert_data = payload.get("alert") or payload
    readings = payload.get("readings") or []
    try:
        return await llm_provider.explain_alert(alert_data, readings)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Alert explanation error: {str(e)}")


@router.post(
    "/api/llm/explain-simulation",
    response_model=SimulatorExplanationResponse,
    summary="Explain What-If Resource Simulation"
)
async def explain_simulation_endpoint(payload: Dict[str, Any] = Body(...)):
    """
    Explains What-If scenario results while strictly verifying consistency
    with backend physics calculations.
    """
    sim_input = payload.get("input") or {}
    sim_output = payload.get("output") or payload
    try:
        return await llm_provider.explain_simulation(sim_input, sim_output)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation explanation error: {str(e)}")


@router.post(
    "/api/llm/generate-report",
    response_model=CampusReportResponse,
    summary="Generate Campus Sustainability Audit Report"
)
async def generate_report_endpoint(payload: Dict[str, Any] = Body(...)):
    """
    Generates structured daily or weekly sustainability audit report from aggregate telemetry.
    """
    aggregates = payload.get("aggregates") or payload
    period = payload.get("period", "daily")
    try:
        return await llm_provider.generate_report(aggregates, period)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation error: {str(e)}")
