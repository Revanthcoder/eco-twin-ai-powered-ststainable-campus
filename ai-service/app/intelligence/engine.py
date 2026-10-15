"""
EcoImpact Intelligence Engine.
Coordinates the end-to-end intelligence workflow:
Image / Sensor Input -> AI Detection -> Anomaly Analysis -> Evidence Validation -> Grounded Recommendation -> Impact Estimation.
"""

import time
import uuid
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

from app.vision.schemas import VisionAnalysisResponse
from app.vision.inference import vision_engine
from app.analytics.schemas import (
    SensorReading,
    SensorEvaluationRequest,
    SensorEvaluationResponse
)
from app.analytics.anomaly_rules import anomaly_engine
from app.llm.output_schemas import GroundedRecommendation, EstimatedImpact
from app.llm.provider import llm_provider
from app.intelligence.impact import impact_calculator


class EcoImpactAnalysisRequest(BaseModel):
    """Input payload for end-to-end EcoImpact Intelligence workflow."""
    building_id: Optional[str] = "Main Campus Facility"
    zone_id: Optional[str] = "Zone A"
    sensor_readings: Optional[List[SensorReading]] = None
    baseline_energy_kw: Optional[float] = None
    user_notes: Optional[str] = None
    confidence_threshold: Optional[float] = None


class EvidenceValidationSummary(BaseModel):
    """Cross-validation between Computer Vision findings and Sensor Telemetry."""
    status: str = Field(..., description="'CORROBORATED' | 'UNCONFIRMED_VISUAL_ONLY' | 'TELEMETRY_ANOMALY_ONLY' | 'NOMINAL'")
    is_confirmed: bool = Field(..., description="True if telemetry cross-verifies visual pattern")
    vision_finding: Optional[str] = None
    sensor_finding: Optional[str] = None
    explanation: str


class EcoImpactIntelligenceReport(BaseModel):
    """Complete end-to-end multi-modal intelligence assessment."""
    report_id: str
    workflow_status: str = "completed"
    building_id: Optional[str]
    zone_id: Optional[str]
    timestamp: str
    total_execution_time_ms: float
    
    # 1. Computer Vision Stage
    vision_analysis: Optional[VisionAnalysisResponse] = None
    
    # 2. Anomaly Analysis Stage
    sensor_evaluation: Optional[SensorEvaluationResponse] = None
    
    # 3. Evidence Validation Stage
    evidence_validation: EvidenceValidationSummary
    
    # 4. Grounded GenAI Recommendation
    recommendation: GroundedRecommendation
    
    # 5. Resource Impact Estimation
    estimated_impact: Optional[EstimatedImpact] = None
    
    # Responsible AI
    data_classification: str = "HYBRID_INSPECTION_AND_TELEMETRY"
    disclaimer: str = (
        "EcoImpact Intelligence outputs are strictly advisory. Computer Vision flags surface anomalies; "
        "sensor telemetry provides time-series trends. Human confirmation required prior to equipment dispatch."
    )


class EcoImpactIntelligenceEngine:
    """Core intelligence workflow coordinator."""

    async def execute_workflow(
        self,
        image_bytes: Optional[bytes] = None,
        image_content_type: Optional[str] = None,
        request_params: Optional[EcoImpactAnalysisRequest] = None
    ) -> EcoImpactIntelligenceReport:
        start_time = time.perf_counter()
        report_id = f"eco-impact-{uuid.uuid4().hex[:8]}"
        req = request_params or EcoImpactAnalysisRequest()

        # Step 1: Computer Vision Detection
        vision_result: Optional[VisionAnalysisResponse] = None
        if image_bytes and len(image_bytes) > 0:
            try:
                vision_result = vision_engine.analyze_image(
                    image_bytes=image_bytes,
                    content_type=image_content_type,
                    building_id=req.building_id,
                    zone_id=req.zone_id,
                    confidence_threshold=req.confidence_threshold
                )
            except Exception as e:
                # Log vision error but do not crash pipeline
                vision_result = VisionAnalysisResponse(
                    analysis_status="rejected",
                    inference_time_ms=0.0,
                    limitations=[f"Vision processing failed: {str(e)}"],
                    disclaimer="Image validation rejected payload."
                )

        # Step 2: Telemetry Anomaly Detection
        sensor_result: Optional[SensorEvaluationResponse] = None
        if req.sensor_readings and len(req.sensor_readings) > 0:
            eval_req = SensorEvaluationRequest(
                readings=req.sensor_readings,
                baseline_mean=req.baseline_energy_kw
            )
            sensor_result = anomaly_engine.evaluate_telemetry(eval_req)

        # Step 3: Evidence Cross-Validation
        has_vision = vision_result and vision_result.detections and vision_result.analysis_status == "completed"
        has_anomalies = sensor_result and sensor_result.anomalies_detected

        evidence_items: List[str] = []
        status = "NOMINAL"
        is_confirmed = False
        v_find = None
        s_find = None
        val_explanation = "No anomalous visual or telemetry patterns detected."

        if has_vision and has_anomalies:
            top_det = vision_result.detections[0]
            top_alt = sensor_result.alerts[0]
            v_find = f"Vision: {top_det.target_class} (conf: {top_det.confidence:.2f})"
            s_find = f"Sensor: {top_alt.rule_name} ({top_alt.observed_value} {top_alt.metric})"
            
            # Check semantic correlation (e.g. water detection + water flow alert)
            is_water_corr = ("water" in top_det.target_class.lower() or "leak" in top_det.target_class.lower()) and "water" in top_alt.metric.lower()
            is_bin_corr = ("bin" in top_det.target_class.lower() or "waste" in top_det.target_class.lower()) and "waste" in top_alt.metric.lower()

            if is_water_corr or is_bin_corr:
                status = "CORROBORATED"
                is_confirmed = True
                val_explanation = (
                    f"Physical evidence CORROBORATED: Computer Vision identified '{top_det.target_class}' and "
                    f"IoT sensor {top_alt.sensor_id} independently measured abnormal {top_alt.metric} ({top_alt.observed_value})."
                )
                evidence_items.append(val_explanation)
            else:
                status = "MULTI_DOMAIN_ALERT"
                is_confirmed = False
                val_explanation = f"Concurrent anomalies detected across separate domains ({top_det.target_class} and {top_alt.metric})."
                evidence_items.append(v_find)
                evidence_items.append(s_find)

        elif has_vision and not has_anomalies:
            top_det = vision_result.detections[0]
            v_find = f"Vision: {top_det.target_class} (conf: {top_det.confidence:.2f})"
            status = "UNCONFIRMED_VISUAL_ONLY"
            is_confirmed = False
            val_explanation = (
                f"Visual anomaly detected ('{top_det.target_class}'), but active sensor readings in {req.building_id} "
                f"show normal or unverified telemetry. Photographic evidence alone does NOT confirm an active leak or quantify waste."
            )
            evidence_items.append(v_find)
            evidence_items.append("Notice: Sensor telemetry does not yet confirm active resource loss.")

        elif has_anomalies and not has_vision:
            top_alt = sensor_result.alerts[0]
            s_find = f"Sensor: {top_alt.rule_name} (value: {top_alt.observed_value} {top_alt.metric})"
            status = "TELEMETRY_ANOMALY_ONLY"
            is_confirmed = True
            val_explanation = f"Sensor alert triggered: {top_alt.explanation}"
            evidence_items.append(top_alt.explanation)

        validation_summary = EvidenceValidationSummary(
            status=status,
            is_confirmed=is_confirmed,
            vision_finding=v_find,
            sensor_finding=s_find,
            explanation=val_explanation
        )

        # Step 4: Resource Impact Estimation
        calculated_impact: Optional[EstimatedImpact] = None
        impact_assumptions: List[str] = []

        # Impact is calculated ONLY if quantitative telemetry exists (avoid fabricating numbers)
        if sensor_result and sensor_result.alerts:
            for alt in sensor_result.alerts:
                if "water" in alt.metric.lower() or "flow" in alt.metric.lower():
                    calc_imp, assump = impact_calculator.calculate_water_leak_impact(alt.observed_value)
                    if calc_imp:
                        calculated_impact = calc_imp
                        impact_assumptions.append(assump)
                        break
                elif "energy" in alt.metric.lower() or "power" in alt.metric.lower():
                    baseline = (alt.observed_value - alt.absolute_deviation) if alt.absolute_deviation else alt.threshold_value
                    calc_imp, assump = impact_calculator.calculate_energy_surge_impact(alt.observed_value, baseline)
                    if calc_imp:
                        calculated_impact = calc_imp
                        impact_assumptions.append(assump)
                        break

        # If only visual waste overflow with estimated weight exists and user requested impact
        if calculated_impact is None and vision_result and vision_result.detections:
            top_det = vision_result.detections[0]
            if top_det.estimated_weight_kg:
                calc_imp, assump = impact_calculator.calculate_waste_diversion_impact(top_det.estimated_weight_kg)
                calculated_impact = calc_imp
                impact_assumptions.append(assump)

        # Step 5: Grounded Recommendation via LLM Provider
        context_payload = {
            "building_id": req.building_id,
            "zone_id": req.zone_id,
            "evidence_status": status,
            "is_confirmed": is_confirmed,
            "user_notes": req.user_notes
        }
        if sensor_result and sensor_result.alerts:
            top_alt = sensor_result.alerts[0]
            context_payload["metric"] = top_alt.metric
            context_payload["observed_value"] = top_alt.observed_value
            context_payload["threshold_value"] = top_alt.threshold_value
        elif vision_result and vision_result.detections:
            context_payload["metric"] = vision_result.detections[0].target_class

        recommendation = await llm_provider.generate_recommendation(
            evidence=evidence_items or ["Campus telemetry nominal."],
            context_data=context_payload,
            user_objective=req.user_notes
        )

        # Integrate calculated impact into recommendation
        if calculated_impact:
            recommendation.estimated_impact = calculated_impact
            recommendation.assumptions.extend(impact_assumptions)
        else:
            recommendation.estimated_impact = None
            recommendation.limitations.append(
                "Numerical impact is null because quantitative flow/power telemetry is not currently available."
            )

        exec_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return EcoImpactIntelligenceReport(
            report_id=report_id,
            workflow_status="completed",
            building_id=req.building_id,
            zone_id=req.zone_id,
            timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            total_execution_time_ms=exec_ms,
            vision_analysis=vision_result,
            sensor_evaluation=sensor_result,
            evidence_validation=validation_summary,
            recommendation=recommendation,
            estimated_impact=calculated_impact
        )


intelligence_engine = EcoImpactIntelligenceEngine()
