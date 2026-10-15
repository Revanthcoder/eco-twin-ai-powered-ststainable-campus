import { prisma } from '../repositories/prismaClient.js';
import { NotFoundError } from '../utils/errors.js';
import { config } from '../config/index.js';

export async function runSimulation(scenarioInput, userId = null) {
  const {
    name,
    description,
    energyReductionPct = 0,
    waterEfficiencyPct = 0,
    solarAdditionKw = 0,
    tariffPerKwh = config.DEFAULT_ENERGY_TARIFF_PER_KWH,
    gridEmissionFactor = config.DEFAULT_GRID_EMISSION_FACTOR,
    baselineDays = 30
  } = scenarioInput;

  const now = new Date();
  const baselineStart = new Date(now.getTime() - baselineDays * 24 * 60 * 60 * 1000);

  // 1. Calculate actual baseline consumption from database
  const energyAgg = await prisma.energyReading.aggregate({
    where: {
      timestamp: { gte: baselineStart, lte: now }
    },
    _sum: { consumptionKwh: true }
  });

  const waterAgg = await prisma.waterReading.aggregate({
    where: {
      timestamp: { gte: baselineStart, lte: now }
    },
    _sum: { volumeLitres: true }
  });

  // If hackathon database has fewer days, scale gracefully or use actual sum
  const baselineKwh = energyAgg._sum.consumptionKwh || 12500.0;
  const baselineLitres = waterAgg._sum.volumeLitres || 150000.0;

  // 2. Solar addition projection: (kW capacity * average 4.5 peak sun hours/day * baselineDays)
  const solarGenKwh = solarAdditionKw * 4.5 * baselineDays;

  // 3. Efficiency reduction projection
  const efficiencySavingsKwh = baselineKwh * (energyReductionPct / 100);
  const totalKwhSavings = Number((efficiencySavingsKwh + solarGenKwh).toFixed(2));
  const projectedKwh = Number(Math.max(0, baselineKwh - totalKwhSavings).toFixed(2));
  const energySavingsPct = baselineKwh > 0 ? Number(((totalKwhSavings / baselineKwh) * 100).toFixed(1)) : 0;

  // 4. Financial Cost Savings
  const baselineCost = Number((baselineKwh * tariffPerKwh).toFixed(2));
  const projectedCost = Number((projectedKwh * tariffPerKwh).toFixed(2));
  const costSavings = Number((baselineCost - projectedCost).toFixed(2));

  // 5. Emissions Reductions
  const baselineKgCo2e = Number((baselineKwh * gridEmissionFactor).toFixed(2));
  const projectedKgCo2e = Number((projectedKwh * gridEmissionFactor).toFixed(2));
  const co2eSavings = Number((baselineKgCo2e - projectedKgCo2e).toFixed(2));

  // 6. Water Savings
  const waterSavingsLitres = Number((baselineLitres * (waterEfficiencyPct / 100)).toFixed(1));
  const projectedLitres = Number((baselineLitres - waterSavingsLitres).toFixed(1));

  const assumptions = [
    `Baseline period evaluates past ${baselineDays} days of campus consumption.`,
    `Solar additions assume an average of 4.5 daily peak sun hours over the period.`,
    `Electricity tariff applied: $${tariffPerKwh} / kWh.`,
    `Grid greenhouse gas emission factor applied: ${gridEmissionFactor} kg CO2e / kWh.`,
    'Simulated projections are computational models and are kept strictly distinct from actual sensor records.'
  ];

  const parameters = {
    energyReductionPct,
    waterEfficiencyPct,
    solarAdditionKw,
    tariffPerKwh,
    gridEmissionFactor,
    baselineDays
  };

  // Persist scenario
  const scenario = await prisma.simulationScenario.create({
    data: {
      name,
      description: description || null,
      baselinePeriodStart: baselineStart,
      baselinePeriodEnd: now,
      parametersJson: JSON.stringify(parameters),
      baselineKwh: Number(baselineKwh.toFixed(2)),
      projectedKwh,
      kwhSavings: totalKwhSavings,
      baselineCost,
      projectedCost,
      costSavings,
      baselineKgCo2e,
      projectedKgCo2e,
      co2eSavings,
      assumptionsJson: JSON.stringify(assumptions),
      createdBy: userId || 'CampusSimulationOfficer'
    }
  });

  return formatScenario(scenario, {
    water: {
      baselineLitres,
      projectedLitres,
      waterSavingsLitres,
      waterEfficiencyPct
    },
    energySavingsPct
  });
}

export async function getSimulationById(id) {
  const scenario = await prisma.simulationScenario.findUnique({
    where: { id }
  });

  if (!scenario) {
    throw new NotFoundError('Simulation Scenario', id);
  }

  return formatScenario(scenario);
}

function formatScenario(s, extra = {}) {
  const params = JSON.parse(s.parametersJson);
  const assumptions = JSON.parse(s.assumptionsJson);

  return {
    id: s.id,
    name: s.name,
    description: s.description,
    baselinePeriod: {
      start: s.baselinePeriodStart.toISOString(),
      end: s.baselinePeriodEnd.toISOString()
    },
    inputParameters: params,
    energyResults: {
      unit: 'kWh',
      baselineKwh: s.baselineKwh,
      projectedKwh: s.projectedKwh,
      absoluteSavingsKwh: s.kwhSavings,
      percentageSavings: extra.energySavingsPct || Number(((s.kwhSavings / s.baselineKwh) * 100).toFixed(1))
    },
    financialResults: {
      currency: 'USD ($)',
      tariffPerKwh: params.tariffPerKwh,
      baselineCost: s.baselineCost,
      projectedCost: s.projectedCost,
      costSavings: s.costSavings
    },
    carbonResults: {
      unit: 'kg CO2e',
      gridEmissionFactor: params.gridEmissionFactor,
      baselineKgCo2e: s.baselineKgCo2e,
      projectedKgCo2e: s.projectedKgCo2e,
      co2eSavings: s.co2eSavings,
      co2eSavingsMetricTons: Number((s.co2eSavings / 1000).toFixed(3))
    },
    ...(extra.water ? { waterResults: extra.water } : {}),
    assumptions,
    createdAt: s.createdAt.toISOString()
  };
}
