"""
Pydantic schemas for the Computer Vision Service.
Adheres strictly to the AI-Powered Sustainable Campus specification.
"""

from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, timezone


class BoundingBox(BaseModel):
    """Normalized bounding box coordinates (0-100 percentage or pixel values)."""
    x: float = Field(..., description="Top-left X coordinate percentage")
    y: float = Field(..., description="Top-left Y coordinate percentage")
    width: float = Field(..., description="Box width percentage")
    height: float = Field(..., description="Box height percentage")
    xmin: Optional[float] = None
    ymin: Optional[float] = None
    xmax: Optional[float] = None
    ymax: Optional[float] = None


class VisionDetection(BaseModel):
    """Individual object or condition detected in an uploaded image."""
    model_config = ConfigDict(populate_by_name=True)

    detection_id: str = Field(..., description="Unique UUID for this detection event")
    target_class: str = Field(..., alias="class", description="Identified class label")
    category: str = Field(default="Infrastructure Diagnostic", description="Taxonomic category")
    evidence: str = Field(default="", description="Concrete visual evidence observed in the image pixels")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score [0.0, 1.0]")
    confidence_meaning: str = Field(default="Model detection confidence score", alias="confidenceMeaning", description="Explicit definition of what the confidence score represents")
    is_uncertain: bool = Field(default=False, alias="isUncertain", description="Flagged true if prediction is low-confidence or ambiguous")
    requires_human_review: bool = Field(default=False, alias="requiresHumanReview", description="Requires facility manager manual review")
    severity: str = Field(..., description="Candidate severity: 'low', 'medium', 'high', 'critical'")
    severity_rule: str = Field(default="", alias="severityRule", description="Deterministic rule or condition used to assign this severity")
    suggested_location: Optional[str] = Field("Location not provided", alias="suggestedLocation")
    recommendation: str = Field(..., description="Actionable immediate maintenance recommendation")
    bounding_box: Optional[BoundingBox] = Field(None, alias="boundingBox")
    estimated_weight_kg: Optional[float] = Field(None, alias="estimatedWeightKg")


class VisionAnalysisResponse(BaseModel):
    """Standardized response from Computer Vision inference."""
    model_config = ConfigDict(populate_by_name=True)

    analysis_status: str = Field(..., alias="analysisStatus", description="'completed' | 'no_anomaly_detected' | 'outside_scope' | 'uncertain' | 'rejected'")
    model_name: str = Field(default="MobileNetV2-ONNX + Calibrated Anomaly Engine", alias="modelName")
    model_version: str = Field(default="2.4.0", alias="modelVersion")
    is_live_model: bool = Field(default=True, alias="isLiveModel")
    is_demo_mode: bool = Field(default=False, alias="isDemoMode")
    inference_time_ms: float = Field(..., alias="inferenceTimeMs")
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    image_metadata: Dict[str, Any] = Field(default_factory=dict, alias="imageMetadata")
    detections_count: int = Field(default=0, alias="detectionsCount")
    detections: List[VisionDetection] = Field(default_factory=list)
    location_assigned: str = Field(default="Location not provided", alias="locationAssigned")
    limitations: List[str] = Field(
        default_factory=lambda: [
            "Photographic classification evaluates 2D visible surface optical patterns only.",
            "Visual indication does NOT confirm internal plumbing rupture or pressurized pipe failure without flow sensor telemetry.",
            "Specular reflections, glossy paint, and directional glare can trigger false positive moisture warnings.",
            "Physical inspection and acoustic/sensor cross-validation required before intrusive maintenance."
        ]
    )
    disclaimer: str = Field(
        default="AI Computer Vision diagnostic inference. Confidence reflects visual feature alignment, not verified hydraulic ground truth. Outputs are strictly advisory.",
        description="Responsible AI advisory notice"
    )


class WasteDetectionResponse(BaseModel):
    """Compatibility response schema for backend/src/integrations/aiClient.js."""
    category: str
    confidence: float
    is_model_estimate: bool = True
    is_mock_fallback: bool = False
    estimated_weight_kg: Optional[float] = None
    bounding_box: Optional[Dict[str, float]] = None
    detected_items: List[Dict[str, Any]] = Field(default_factory=list)
    limitations: List[str] = Field(default_factory=list)
