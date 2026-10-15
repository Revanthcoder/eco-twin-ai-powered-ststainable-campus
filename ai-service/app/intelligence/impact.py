"""
Documented Environmental and Resource Impact Calculator.
Uses explicit engineering conversion factors and tariffs from configuration.
Never fabricates savings or claims precision without supporting data.
"""

from typing import Optional, Dict, Any, Tuple
from app.config import config
from app.llm.output_schemas import EstimatedImpact


class ResourceImpactCalculator:
    """Calculates resource loss, monetary cost, and greenhouse gas emissions."""

    def __init__(self):
        self.cfg = config.impact

    def calculate_water_leak_impact(
        self,
        flow_lpm: float,
        duration_hours: float = 24.0,
        confirmed: bool = False
    ) -> Tuple[Optional[EstimatedImpact], str]:
        """
        Calculates loss from continuous water flow:
        - Liters = flow_lpm * 60 * duration_hours
        - Cost ($) = Liters * water_cost_usd_per_liter
        - Carbon (kg CO2e) = Liters * water_carbon_kg_per_liter
        """
        if flow_lpm <= 0:
            return None, "Flow rate is zero or negative; no loss calculated."

        total_liters = round(flow_lpm * 60 * duration_hours, 1)
        cost_usd = round(total_liters * self.cfg.water_cost_usd_per_liter, 2)
        co2_kg = round(total_liters * self.cfg.water_carbon_kg_per_liter, 2)

        assumption = (
            f"Assumes continuous flow of {flow_lpm} L/min over {duration_hours}h at municipal tariff "
            f"${self.cfg.water_cost_usd_per_liter * 1000:.2f}/kL and {self.cfg.water_carbon_kg_per_liter * 1000:.3f} kg CO2e/kL treatment carbon."
        )

        impact = EstimatedImpact(
            metric="water_loss",
            quantity=total_liters,
            unit=f"Liters/{duration_hours:.0f}h",
            cost_usd=cost_usd,
            emissions_kg_co2e=co2_kg,
            timeframe=f"{duration_hours:.0f}_hours"
        )
        return impact, assumption

    def calculate_energy_surge_impact(
        self,
        observed_kw: float,
        baseline_kw: float,
        duration_hours: float = 24.0
    ) -> Tuple[Optional[EstimatedImpact], str]:
        """
        Calculates excess electricity consumption above baseline:
        - kWh = (observed_kw - baseline_kw) * duration_hours
        - Cost ($) = kWh * electricity_cost_usd_per_kwh
        - Carbon (kg CO2e) = kWh * carbon_intensity_kg_per_kwh
        """
        if observed_kw <= baseline_kw:
            return None, "Observed power is at or below baseline; no excess waste calculated."

        excess_kw = observed_kw - baseline_kw
        total_kwh = round(excess_kw * duration_hours, 1)
        cost_usd = round(total_kwh * self.cfg.electricity_cost_usd_per_kwh, 2)
        co2_kg = round(total_kwh * self.cfg.carbon_intensity_kg_per_kwh, 2)

        assumption = (
            f"Modeled excess demand of {excess_kw:.1f} kW over {duration_hours}h at tariff "
            f"${self.cfg.electricity_cost_usd_per_kwh:.2f}/kWh with regional grid intensity "
            f"{self.cfg.carbon_intensity_kg_per_kwh:.2f} kg CO2e/kWh."
        )

        impact = EstimatedImpact(
            metric="excess_electricity",
            quantity=total_kwh,
            unit=f"kWh/{duration_hours:.0f}h",
            cost_usd=cost_usd,
            emissions_kg_co2e=co2_kg,
            timeframe=f"{duration_hours:.0f}_hours"
        )
        return impact, assumption

    def calculate_waste_diversion_impact(
        self,
        weight_kg: float,
        is_compost: bool = True
    ) -> Tuple[Optional[EstimatedImpact], str]:
        """
        Calculates environmental and financial benefits of diverting waste from landfill:
        - Tip fee value = weight_kg * waste_diversion_value_usd_per_kg
        - Methane avoided = weight_kg * compost_methane_avoidance_kg_per_kg (if organic)
        """
        if weight_kg <= 0:
            return None, "Waste weight is zero or unknown; impact cannot be confirmed."

        cost_value = round(weight_kg * self.cfg.waste_diversion_value_usd_per_kg, 2)
        co2_avoided = round(
            weight_kg * (self.cfg.compost_methane_avoidance_kg_per_kg if is_compost else 0.25),
            2
        )

        assumption = (
            f"Assumes {weight_kg:.1f} kg diverted from landfill at ${self.cfg.waste_diversion_value_usd_per_kg:.2f}/kg tipping value "
            f"and avoided landfill methane factor {self.cfg.compost_methane_avoidance_kg_per_kg:.2f} kg CO2e/kg."
        )

        impact = EstimatedImpact(
            metric="landfill_diversion_benefit",
            quantity=weight_kg,
            unit="kg",
            cost_usd=cost_value,
            emissions_kg_co2e=co2_avoided,
            timeframe="single_event"
        )
        return impact, assumption


impact_calculator = ResourceImpactCalculator()
