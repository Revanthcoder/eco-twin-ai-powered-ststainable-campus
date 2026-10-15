import { prisma } from '../repositories/prismaClient.js';
import { config } from '../config/index.js';

export async function getCarbonFootprint(filters = {}) {
  const { buildingId, startDate, endDate } = filters;
  const where = {};

  if (buildingId) where.buildingId = buildingId;

  if (startDate || endDate) {
    where.periodStart = {};
    if (startDate) where.periodStart.gte = new Date(startDate);
    if (endDate) where.periodStart.lte = new Date(endDate);
  }

  // Get emission factor settings
  const [gridFactorSetting, waterFactorSetting] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: 'GRID_EMISSION_FACTOR' } }),
    prisma.systemSetting.findUnique({ where: { key: 'WATER_EMISSION_FACTOR' } })
  ]);

  const gridEmissionFactor = gridFactorSetting ? parseFloat(gridFactorSetting.value) : config.DEFAULT_GRID_EMISSION_FACTOR;
  const waterEmissionFactor = waterFactorSetting ? parseFloat(waterFactorSetting.value) : config.DEFAULT_WATER_EMISSION_FACTOR;
  const wasteEmissionFactor = 0.45; // kg CO2e per kg mixed landfill waste

  // Calculate live emissions from current readings in period
  const energyWhere = {};
  const waterWhere = {};
  const wasteWhere = {};

  if (buildingId) {
    energyWhere.buildingId = buildingId;
    waterWhere.buildingId = buildingId;
    wasteWhere.buildingId = buildingId;
  }

  if (startDate || endDate) {
    const dateRange = {};
    if (startDate) dateRange.gte = new Date(startDate);
    if (endDate) dateRange.lte = new Date(endDate);
    energyWhere.timestamp = dateRange;
    waterWhere.timestamp = dateRange;
    wasteWhere.timestamp = dateRange;
  }

  const [energySum, waterSum, wasteSum] = await Promise.all([
    prisma.energyReading.aggregate({
      where: { ...energyWhere, source: 'GRID' },
      _sum: { consumptionKwh: true }
    }),
    prisma.waterReading.aggregate({
      where: waterWhere,
      _sum: { volumeLitres: true }
    }),
    prisma.wasteRecord.aggregate({
      where: { ...wasteWhere, binType: 'GENERAL' },
      _sum: { weightKg: true }
    })
  ]);

  const gridKwh = energySum._sum.consumptionKwh || 0;
  const waterLitres = waterSum._sum.volumeLitres || 0;
  const wasteKg = wasteSum._sum.weightKg || 0;

  // Scope 1: On-campus direct combustion (e.g. baseline backup generation/boilers, 5% of grid equiv or demo baseline)
  const scope1KgCo2e = Number((gridKwh * 0.05).toFixed(2));
  // Scope 2: Indirect from purchased electricity
  const scope2KgCo2e = Number((gridKwh * gridEmissionFactor).toFixed(2));
  // Scope 3: Supply chain, water pumping, landfill waste
  const scope3KgCo2e = Number(((waterLitres * waterEmissionFactor) + (wasteKg * wasteEmissionFactor)).toFixed(2));
  const totalKgCo2e = Number((scope1KgCo2e + scope2KgCo2e + scope3KgCo2e).toFixed(2));
  const totalMetricTonsCo2e = Number((totalKgCo2e / 1000).toFixed(3));

  return {
    unit: 'kg CO2e',
    metricTonsUnit: 'MT CO2e',
    totalKgCo2e,
    totalMetricTonsCo2e,
    scopeBreakdown: {
      scope1: {
        amountKgCo2e: scope1KgCo2e,
        description: 'Direct emissions from stationary campus boilers and backup generation'
      },
      scope2: {
        amountKgCo2e: scope2KgCo2e,
        description: 'Indirect emissions from purchased electricity via regional grid'
      },
      scope3: {
        amountKgCo2e: scope3KgCo2e,
        description: 'Indirect supply chain emissions from municipal water pumping and landfill waste decomposition'
      }
    },
    inputQuantitiesEvaluated: {
      gridElectricityKwh: Number(gridKwh.toFixed(2)),
      waterVolumeLitres: Number(waterLitres.toFixed(1)),
      landfillWasteKg: Number(wasteKg.toFixed(2))
    },
    emissionFactorsUsed: {
      gridEmissionFactor: { value: gridEmissionFactor, unit: 'kg CO2e / kWh', source: 'System Setting / Config' },
      waterEmissionFactor: { value: waterEmissionFactor, unit: 'kg CO2e / Litre', source: 'System Setting / Config' },
      wasteEmissionFactor: { value: wasteEmissionFactor, unit: 'kg CO2e / kg', source: 'EPA WARM Model Standard' }
    },
    isEstimate: true,
    assumptions: [
      'Scope 2 calculation uses location-based average grid emission factor for the campus regional interconnection.',
      'Scope 3 includes municipal water treatment pumping energy and General Landfill waste methane equivalents.',
      'Solar energy self-generation is assigned zero direct Scope 2 emissions factor.'
    ],
    period: {
      startDate: startDate || 'all-time',
      endDate: endDate || 'present'
    }
  };
}

export async function getCarbonTrends(filters = {}) {
  const { buildingId, interval = 'daily', startDate, endDate } = filters;
  const where = {};

  if (buildingId) where.buildingId = buildingId;

  const now = new Date();
  const start = startDate ? new Date(startDate) : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : now;

  where.periodStart = {
    gte: start,
    lte: end
  };

  const records = await prisma.carbonEmission.findMany({
    where,
    orderBy: { periodStart: 'asc' }
  });

  const datapoints = records.map((r) => ({
    period: r.periodStart.toISOString().substring(0, 10),
    scope1KgCo2e: r.scope1KgCo2e,
    scope2KgCo2e: r.scope2KgCo2e,
    scope3KgCo2e: r.scope3KgCo2e,
    totalKgCo2e: r.totalKgCo2e,
    isEstimate: r.isEstimate
  }));

  return {
    unit: 'kg CO2e',
    interval,
    timeRange: { start: start.toISOString(), end: end.toISOString() },
    datapoints
  };
}
