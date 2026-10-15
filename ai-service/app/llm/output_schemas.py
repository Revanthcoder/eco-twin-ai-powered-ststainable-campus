"""
Strict Pydantic Output Schemas for Grounded Generative AI.
Matches the specification in Page 2 of the technical specification.
"""

from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field


class EstimatedImpact(BaseModel):
    """Resource and financial impact estimation with explicit metrics."""
    metric: str = Field(..., description="e.g. 'water_saved', 'energy_saved', 'carbon_avoided'")
    quantity: float = Field(..., description="Estimated numerical quantity")
    unit: str = Field(..., description="Measurement unit (e.g. kWh, Liters, kg CO2e)")
    cost_usd: Optional[float] = Field(None, description="Monetary impact in USD based on configured tariff")
    emissions_kg_co2e: Optional[float] = Field(None, description="Carbon impact in kg CO2e")
    timeframe: str = Field(default="per_day", description="Time horizon of impact")


class GroundedRecommendation(BaseModel):
    """
    Structured recommendation output strictly matching specification format:
    {
      "title": str,
      "priority": "low" | "medium" | "high" | "critical",
      "evidence": List[str],
      "action_steps": List[str],
      "estimated_impact": Optional[Dict[str, Any]],
      "assumptions": List[str],
      "confidence": "low" | "medium" | "high" | "verified",
      "limitations": List[str]
    }
    """
    title: str = Field(..., description="Concise headline of recommended action")
    priority: str = Field(..., description="'low' | 'medium' | 'high' | 'critical'")
    evidence: List[str] = Field(..., description="Explicit sensor readings and rules supporting recommendation")
    action_steps: List[str] = Field(..., description="Concrete, chronological maintenance actions")
    estimated_impact: Optional[EstimatedImpact] = Field(
        None,
        description="Calculated impact if data supports it; MUST be null if data is insufficient"
    )
    assumptions: List[str] = Field(
        default_factory=list,
        description="Explicit assumptions behind recommendation and impact calculation"
    )
    confidence: str = Field(..., description="'low' | 'medium' | 'high' | 'verified'")
    limitations: List[str] = Field(..., description="Explicit uncertainties or confirmation requirements")
    advisory_notice: str = Field(
        default="AI recommendation is advisory. Human engineering confirmation required.",
        description="Responsible AI safety notice"
    )


class RankedActionItem(BaseModel):
    """Action ranked by urgency, likely benefit, cost, effort, and confidence."""
    id: str
    domain: str = Field(..., description="'ENERGY' | 'WATER' | 'WASTE' | 'GENERAL'")
    title: str
    urgency: str = Field(..., description="'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'")
    likely_benefit: str
    estimated_cost_usd: Optional[float] = None
    estimated_savings_annual_usd: Optional[float] = None
    payback_months: Optional[float] = None
    effort_level: str = Field(..., description="'LOW' | 'MEDIUM' | 'HIGH'")
    confidence: str
    action_steps: List[str]
    evidence: List[str]


class SustainabilityChatResponse(BaseModel):
    """Response schema for interactive sustainability advisor."""
    reply: str
    citations: List[str] = Field(default_factory=list)
    confidence: str = Field(default="High")
    uncertainty_notice: Optional[str] = None
    missing_data_notes: Optional[str] = None
    limitations: List[str] = Field(default_factory=list)
    is_grounded: bool = True
    provider: str = "EcoImpact AI Provider"


class SimulatorExplanationResponse(BaseModel):
    """Explanation of What-If scenario results matching backend calculations."""
    scenario_name: str
    metric_type: str
    baseline_value: float
    projected_value: float
    reduction_percent: float
    difference: float
    cost_saved_usd: float
    co2_avoided_kg: float
    unit: str
    verified_consistent_with_backend: bool = True
    explanation: str
    assumptions: List[str]
    limitations: List[str]


class CampusReportResponse(BaseModel):
    """Aggregate campus sustainability summary report."""
    period: str
    title: str
    composite_sustainability_score: float
    energy_kpis: Dict[str, Any]
    water_kpis: Dict[str, Any]
    waste_kpis: Dict[str, Any]
    active_alerts_summary: Dict[str, int]
    key_observations: List[str]
    priority_maintenance_actions: List[GroundedRecommendation]
    data_freshness_summary: str
    limitations: List[str]
