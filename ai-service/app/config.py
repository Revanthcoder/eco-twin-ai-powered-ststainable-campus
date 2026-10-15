"""
EcoNexus AI Configuration Module
Centralized, explainable configuration for Computer Vision, Sensor Anomaly Detection,
and Grounded Generative AI services.
No hardcoded magic values scattered across modules.
"""

import os
from typing import Dict, Any, List
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load environment variables from .env if present
load_dotenv()


class VisionConfig(BaseModel):
    """Configuration for Computer Vision inference and validation."""
    model_name: str = Field(default="ecopulse-cv-yolo-v8.2", description="Model identifier")
    model_version: str = Field(default="2.4.0", description="Model semantic version")
    supported_formats: List[str] = Field(
        default=["image/jpeg", "image/png", "image/webp"],
        description="MIME types permitted for image upload"
    )
    max_file_size_bytes: int = Field(
        default=10 * 1024 * 1024, # 10 MB
        description="Maximum permitted upload size in bytes"
    )
    min_dimension: int = Field(default=32, description="Minimum width/height in pixels")
    max_dimension: int = Field(default=4096, description="Maximum width/height in pixels")
    default_confidence_threshold: float = Field(
        default=0.45,
        description="Threshold below which detections are omitted or marked low confidence"
    )
    low_confidence_boundary: float = Field(
        default=0.60,
        description="Detections between default and this value are labeled uncertain"
    )
    supported_classes: List[str] = Field(
        default=[
            "overflowing_bin",
            "plastic_waste",
            "paper_cardboard",
            "metal_can",
            "glass_bottle",
            "organic_waste",
            "water_leak_sign",
            "pipe_joint_moisture",
            "thermal_insulation_gap",
            "solar_panel_dust_debris"
        ],
        description="Permitted detection targets for sustainable campus audit"
    )
    demo_mode: bool = Field(
        default=os.getenv("DEMO_MODE", "false").lower() in ("true", "1", "yes"),
        description="Explicit demo mode flag"
    )


class AnomalyThresholdConfig(BaseModel):
    """Configurable thresholds for explainable telemetry anomaly detection."""
    # Water rules
    water_flow_max_lpm: float = Field(default=25.0, description="Max expected water flow in L/min")
    water_flow_consecutive_readings: int = Field(
        default=3,
        description="Number of consecutive readings above threshold required for alert"
    )
    
    # Energy rules
    energy_baseline_deviation_fraction: float = Field(
        default=0.25, # 25% deviation from baseline
        description="Fractional deviation from rolling baseline mean"
    )
    energy_min_absolute_deviation_kw: float = Field(
        default=10.0,
        description="Minimum absolute deviation in kW required to trigger an alert"
    )
    
    # Waste rules
    bin_fullness_warning_percent: float = Field(default=80.0, description="Warning threshold %")
    bin_fullness_critical_percent: float = Field(default=95.0, description="Critical threshold %")
    
    # Sensor health rules
    stale_after_minutes: int = Field(
        default=15,
        description="Sensor readings older than this are flagged as stale"
    )
    z_score_threshold: float = Field(default=2.5, description="Statistical z-score outlier threshold")
    
    # Physical sensor limits for impossible-value filtering
    sensor_physical_limits: Dict[str, Dict[str, float]] = Field(
        default={
            "energy": {"min": 0.0, "max": 10000.0, "unit": "kW"},
            "water_flow": {"min": 0.0, "max": 2000.0, "unit": "L/min"},
            "waste_bin": {"min": 0.0, "max": 100.0, "unit": "%"},
            "temperature": {"min": -20.0, "max": 65.0, "unit": "C"},
            "humidity": {"min": 0.0, "max": 100.0, "unit": "%"},
            "solar_generation": {"min": 0.0, "max": 5000.0, "unit": "kW"}
        }
    )


class EnvironmentalImpactConfig(BaseModel):
    """Documented conversion factors and tariffs for resource impact calculation."""
    # Electricity grid emission factor (EPA eGRID / Regional Average in kg CO2e / kWh)
    carbon_intensity_kg_per_kwh: float = Field(
        default=0.42,
        description="Regional electricity emission factor in kg CO2e per kWh"
    )
    # Electricity tariff rate ($ / kWh)
    electricity_cost_usd_per_kwh: float = Field(
        default=0.14,
        description="Commercial campus electricity tariff in USD / kWh"
    )
    # Potable water utility tariff rate ($ / 1000 Liters = $ / kL)
    water_cost_usd_per_liter: float = Field(
        default=0.00275, # $2.75 per 1,000 Liters
        description="Potable water municipal tariff in USD / Liter"
    )
    # Water distribution and treatment carbon intensity (kg CO2e / Liter)
    water_carbon_kg_per_liter: float = Field(
        default=0.00063, # ~0.63 kg CO2e per m3 = 0.00063 kg / L
        description="Embedded pumping and treatment carbon per Liter of water"
    )
    # Landfill diversion benefit ($ / kg diverted)
    waste_diversion_value_usd_per_kg: float = Field(
        default=0.08,
        description="Tip fee avoidance and scrap recovery credit per kg diverted"
    )
    # Landfill methane avoidance factor (kg CO2e / kg organic waste composted)
    compost_methane_avoidance_kg_per_kg: float = Field(
        default=0.62,
        description="Avoided landfill methane per kg organic waste diverted to compost"
    )


class LLMConfig(BaseModel):
    """Configuration for Provider-Independent Generative AI Adapter."""
    provider: str = Field(
        default=os.getenv("LLM_PROVIDER", "mock").lower(),
        description="Provider identifier: 'gemini', 'openai', 'anthropic', or 'mock'"
    )
    gemini_api_key: str = Field(default=os.getenv("GEMINI_API_KEY", ""))
    openai_api_key: str = Field(default=os.getenv("OPENAI_API_KEY", ""))
    anthropic_api_key: str = Field(default=os.getenv("ANTHROPIC_API_KEY", ""))
    model_name: str = Field(
        default=os.getenv("LLM_MODEL_NAME", "gemini-1.5-flash"),
        description="Model identifier for API"
    )
    timeout_seconds: float = Field(default=8.0, description="HTTP request timeout in seconds")
    max_retries: int = Field(default=2, description="Safe retries on transient network failures")
    temperature: float = Field(default=0.1, description="Low temperature for strictly grounded facts")


class AppConfig(BaseModel):
    """Master application configuration."""
    service_name: str = "EcoNexus AI Intelligence Service"
    version: str = "2.4.0"
    port: int = int(os.getenv("PORT", "8001"))
    host: str = os.getenv("HOST", "0.0.0.0")
    demo_mode: bool = os.getenv("DEMO_MODE", "false").lower() in ("true", "1", "yes")
    
    vision: VisionConfig = Field(default_factory=VisionConfig)
    anomaly: AnomalyThresholdConfig = Field(default_factory=AnomalyThresholdConfig)
    impact: EnvironmentalImpactConfig = Field(default_factory=EnvironmentalImpactConfig)
    llm: LLMConfig = Field(default_factory=LLMConfig)


# Global configuration singleton
config = AppConfig()
