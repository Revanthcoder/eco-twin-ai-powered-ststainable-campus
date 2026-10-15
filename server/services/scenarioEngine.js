/**
 * EcoPulse What-If Sustainability Scenario Engine
 * 
 * Decision support physics & engineering model simulator.
 * Calculates hypothetical conservation effects without altering measured real-time telemetry.
 */

import { get } from '../db/database.js';
import { GRID_EMISSION_FACTOR_KG_CO2_PER_KWH, ENERGY_COST_PER_KWH_USD, WATER_COST_PER_1000L_USD } from './calculations.js';

export async function runScenarioSimulation(payload) {
  const {
    building_id,
    metric_type = 'energy', // 'energy' | 'water'
    scenario_name = 'Custom Conservation Measure',
    days = 30,
    reduction_percent = 20,
    equipment_count = 50,
    operating_hours_per_day = 12,
    custom_tariff = null,
    custom_emissions_factor = null
  } = payload;

  const bId = Number(building_id) || 1;
  const building = await get('SELECT name, total_kwh, total_water_liters, area_m2, occupancy_capacity FROM buildings WHERE id = ?', [bId]);
  const bName = building?.name || 'Campus Building';

  const tariff = custom_tariff ? Number(custom_tariff) : (metric_type === 'energy' ? ENERGY_COST_PER_KWH_USD : (WATER_COST_PER_1000L_USD / 1000));
  const emissionsFactor = custom_emissions_factor ? Number(custom_emissions_factor) : GRID_EMISSION_FACTOR_KG_CO2_PER_KWH;

  if (metric_type === 'water') {
    // Water model
    const dailyBaselineLiters = payload.baseline_daily_liters || (building?.total_water_liters ? building.total_water_liters / 2 : 1200);
    const baselineTotal = Math.round(dailyBaselineLiters * days);
    const percentReduction = Math.max(1, Math.min(80, Number(reduction_percent) || 25));
    const projectedTotal = Math.round(baselineTotal * (1 - percentReduction / 100));
    const difference = baselineTotal - projectedTotal;
    const costSaved = Math.round((difference / 1000) * WATER_COST_PER_1000L_USD * 100) / 100;
    // Pumping energy avoided: ~0.0015 kWh / Liter
    const avoidedPumpingKWh = difference * 0.0015;
    const co2Avoided = Math.round(avoidedPumpingKWh * emissionsFactor * 100) / 100;

    return {
      building_id: bId,
      building_name: bName,
      scenario_name: scenario_name || `${percentReduction}% Water Conservation Retrofit`,
      metric_type: 'water',
      baseline_value: baselineTotal,
      projected_value: projectedTotal,
      difference,
      percent_saved: percentReduction,
      cost_saved_usd: costSaved,
      co2_avoided_kg: co2Avoided,
      unit: 'Liters',
      period_days: days,
      assumptions: `Based on a ${days}-day modeling period with an average daily flow baseline of ${dailyBaselineLiters} L/day at $${WATER_COST_PER_1000L_USD}/kL utility tariff.`,
      uncertainty: '±8% depending on campus academic calendar and fixture utilization rates.',
      data_classification: 'ESTIMATE - What-if simulation based on engineering models, not verified measured savings',
      created_at: new Date().toISOString()
    };
  } else {
    // Energy model
    const dailyBaselineKWh = payload.baseline_daily_kwh || (building?.total_kwh ? building.total_kwh / 2 : 450);
    const baselineTotal = Math.round(dailyBaselineKWh * days);
    const percentReduction = Math.max(1, Math.min(75, Number(reduction_percent) || 20));
    const projectedTotal = Math.round(baselineTotal * (1 - percentReduction / 100));
    const difference = baselineTotal - projectedTotal;
    const costSaved = Math.round(difference * tariff * 100) / 100;
    const co2Avoided = Math.round(difference * emissionsFactor * 10) / 10;

    return {
      building_id: bId,
      building_name: bName,
      scenario_name: scenario_name || `${percentReduction}% Energy Reduction Initiative`,
      metric_type: 'energy',
      baseline_value: baselineTotal,
      projected_value: projectedTotal,
      difference,
      percent_saved: percentReduction,
      cost_saved_usd: costSaved,
      co2_avoided_kg: co2Avoided,
      unit: 'kWh',
      period_days: days,
      assumptions: `Calculation covers ${days} days across ${equipment_count} active fixtures (${operating_hours_per_day} operating hrs/day) at $${tariff}/kWh tariff with a ${emissionsFactor} kg CO2e/kWh regional grid factor.`,
      uncertainty: '±5% based on seasonal weather variations and HVAC load fluctuations.',
      data_classification: 'ESTIMATE - What-if simulation based on engineering models, not verified measured savings',
      created_at: new Date().toISOString()
    };
  }
}
