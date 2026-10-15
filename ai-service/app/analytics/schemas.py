"""
Pydantic schemas for explainable sensor anomaly analytics and forecasting.
"""

from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field
from datetime import datetime, timezone


class SensorReading(BaseModel):
    """Individual telemetry reading from campus IoT sensor."""
    sensor_id: str = Field(..., description="Sensor unique identifier")
    metric: str = Field(..., description="Sensor metric type: 'energy', 'water_flow', 'waste_bin', 'temperature', etc.")
    value: float = Field(..., description="Numerical telemetry value")
    unit: str = Field(..., description="Measurement unit (e.g. kW, L/min, %, C)")
    measured_at: str = Field(..., description="ISO 8601 measurement timestamp")
    building_id: Optional[Union[str, int]] = None
    zone_id: Optional[Union[str, int]] = None
    source: Optional[str] = "iot_telemetry"


class DataCleaningReport(BaseModel):
    """Audit of telemetry cleaning operations performed."""
    total_received: int
    valid_count: int
    duplicates_removed: int = 0
    impossible_values_rejected: int = 0
    missing_intervals_detected: int = 0
    stale_sensors_flagged: List[str] = Field(default_factory=list)
    cleaning_actions: List[str] = Field(default_factory=list)


class AnomalyAlert(BaseModel):
    """Explainable alert triggered by configurable rule or statistical baseline."""
    alert_id: str
    rule_id: str = Field(..., description="Identifier of triggering rule")
    rule_name: str
    severity: str = Field(..., description="'warning' | 'high' | 'critical'")
    sensor_id: str
    metric: str
    observed_value: float
    threshold_value: float
    absolute_deviation: float
    percentage_deviation: float
    explanation: str = Field(..., description="Deterministic, human-readable proof of why rule tripped")
    evidence_readings: List[Dict[str, Any]] = Field(default_factory=list)
    triggered_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    is_stale: bool = False


class SensorEvaluationRequest(BaseModel):
    """Request payload for multi-reading sensor analysis."""
    readings: List[SensorReading]
    baseline_mean: Optional[float] = None
    baseline_std_dev: Optional[float] = None
    building_area_m2: Optional[float] = None
    building_occupancy: Optional[int] = None
    reference_time: Optional[str] = None


class NormalizedMetrics(BaseModel):
    """Normalized campus resource intensities."""
    energy_intensity_kwh_per_m2: Optional[float] = None
    water_intensity_l_per_person: Optional[float] = None
    normalization_basis: str


class SensorEvaluationResponse(BaseModel):
    """Full explainable evaluation of sensor telemetry."""
    anomalies_detected: bool
    alerts_count: int
    alerts: List[AnomalyAlert]
    cleaning_report: DataCleaningReport
    normalized_metrics: Optional[NormalizedMetrics] = None
    sensor_freshness: Dict[str, Any] = Field(default_factory=dict)
    summary: str


class ForecastPoint(BaseModel):
    timestamp: str
    predicted_value: float
    lower_bound: float
    upper_bound: float


class ForecastResponse(BaseModel):
    forecast_available: bool
    model_type: str
    horizon_steps: int
    r_squared: Optional[float] = None
    predictions: List[ForecastPoint] = Field(default_factory=list)
    limitations: List[str] = Field(default_factory=list)
