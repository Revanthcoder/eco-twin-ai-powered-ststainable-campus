import { prisma } from '../repositories/prismaClient.js';
import * as energyService from './energyService.js';
import * as waterService from './waterService.js';
import * as wasteService from './wasteService.js';
import * as carbonService from './carbonService.js';

export async function getDashboardOverview(filters = {}) {
  const { startDate, endDate } = filters;

  // Run aggregate queries concurrently
  const [
    energySummary,
    waterSummary,
    wasteSummary,
    carbonSummary,
    latestScore,
    openAlertsCount,
    criticalAlertsCount,
    demoDataReadingCount
  ] = await Promise.all([
    energyService.getEnergySummary(filters),
    waterService.getWaterSummary(filters),
    wasteService.getWasteSummary(filters),
    carbonService.getCarbonFootprint(filters),
    prisma.sustainabilityScore.findFirst({
      orderBy: { periodEnd: 'desc' }
    }),
    prisma.alert.count({ where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] } } }),
    prisma.alert.count({ where: { status: 'OPEN', severity: 'CRITICAL' } }),
    prisma.energyReading.count({ where: { isDemoData: true } })
  ]);

  const isDemoMode = demoDataReadingCount > 0;

  return {
    campusOverview: {
      dataMode: isDemoMode ? 'SIMULATED_DEMO_DATA' : 'LIVE_TELEMETRY',
      dataModeExplanation: isDemoMode 
        ? 'Measurements include seeded benchmark scenarios for hackathon evaluation and demonstration.' 
        : 'Telemetry fed live from connected campus IoT gateways.'
    },
    sustainabilityScore: {
      currentScore: latestScore ? latestScore.totalScore : 80.0,
      scaleMax: 100,
      categoryScores: latestScore ? {
        energy: latestScore.energyScore,
        water: latestScore.waterScore,
        waste: latestScore.wasteScore,
        carbon: latestScore.carbonScore
      } : { energy: 78, water: 82, waste: 75, carbon: 80 },
      lastCalculated: latestScore ? latestScore.periodEnd.toISOString() : new Date().toISOString()
    },
    energy: {
      totalConsumptionKwh: energySummary.totalConsumptionKwh,
      renewablePercentage: energySummary.sourceBreakdown.renewablePercentage,
      averagePeakDemandKw: energySummary.metrics.averagePeakDemandKw,
      unit: 'kWh'
    },
    water: {
      totalVolumeLitres: waterSummary.totalVolumeLitres,
      recycledPercentage: waterSummary.categoryBreakdown.recycledPercentage,
      flowRateStatus: waterSummary.flowRateMetrics.anomalyStatus,
      unit: 'Litres'
    },
    waste: {
      totalWeightKg: wasteSummary.totalWasteWeightKg,
      diversionRatePercent: wasteSummary.diversionRatePercent,
      averageBinFullnessPercent: wasteSummary.averageBinFullnessPercent,
      unit: 'kg'
    },
    carbon: {
      totalKgCo2e: carbonSummary.totalKgCo2e,
      totalMetricTonsCo2e: carbonSummary.totalMetricTonsCo2e,
      unit: 'kg CO2e'
    },
    alerts: {
      totalActive: openAlertsCount,
      criticalCount: criticalAlertsCount,
      status: criticalAlertsCount > 0 ? 'ATTENTION_REQUIRED' : openAlertsCount > 0 ? 'MONITORING' : 'OPTIMAL'
    },
    period: {
      startDate: startDate || null,
      endDate: endDate || null
    }
  };
}

export async function getDashboardTrends(filters = {}) {
  const [energyTrends, waterTrends] = await Promise.all([
    energyService.getEnergyTrends(filters),
    waterService.getWaterTrends(filters)
  ]);

  // Combine trends by matching period
  const trendMap = {};
  for (const e of energyTrends.datapoints) {
    trendMap[e.period] = {
      period: e.period,
      energyKwh: e.totalKwh,
      solarKwh: e.solarKwh,
      waterLitres: 0
    };
  }

  for (const w of waterTrends.datapoints) {
    if (!trendMap[w.period]) {
      trendMap[w.period] = {
        period: w.period,
        energyKwh: 0,
        solarKwh: 0,
        waterLitres: w.totalLitres
      };
    } else {
      trendMap[w.period].waterLitres = w.totalLitres;
    }
  }

  const combined = Object.values(trendMap).sort((a, b) => a.period.localeCompare(b.period));

  return {
    datapoints: combined
  };
}

export async function getBuildingComparison() {
  const buildings = await prisma.building.findMany({
    include: {
      _count: {
        select: {
          alerts: { where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] } } }
        }
      }
    }
  });

  const comparisons = [];

  for (const b of buildings) {
    const [energyAgg, waterAgg, wasteAgg] = await Promise.all([
      prisma.energyReading.aggregate({
        where: { buildingId: b.id },
        _sum: { consumptionKwh: true }
      }),
      prisma.waterReading.aggregate({
        where: { buildingId: b.id },
        _sum: { volumeLitres: true }
      }),
      prisma.wasteRecord.aggregate({
        where: { buildingId: b.id },
        _sum: { weightKg: true }
      })
    ]);

    const totalKwh = energyAgg._sum.consumptionKwh || 0;
    const totalLitres = waterAgg._sum.volumeLitres || 0;
    const totalWasteKg = wasteAgg._sum.weightKg || 0;

    // Intensity metrics
    const energyIntensityKwhPerSqFt = b.totalAreaSqFt > 0 ? Number((totalKwh / b.totalAreaSqFt).toFixed(3)) : 0;
    const waterPerOccupantLitres = b.occupancyCapacity > 0 ? Number((totalLitres / b.occupancyCapacity).toFixed(1)) : 0;

    // Performance tier
    let performanceTier = 'A';
    if (energyIntensityKwhPerSqFt > 0.05) performanceTier = 'B';
    if (energyIntensityKwhPerSqFt > 0.08) performanceTier = 'C';

    comparisons.push({
      buildingId: b.id,
      buildingName: b.name,
      buildingCode: b.code,
      type: b.type,
      totalAreaSqFt: b.totalAreaSqFt,
      occupancyCapacity: b.occupancyCapacity,
      totalEnergyKwh: Number(totalKwh.toFixed(2)),
      energyIntensityKwhPerSqFt,
      totalWaterLitres: Number(totalLitres.toFixed(1)),
      waterPerOccupantLitres,
      totalWasteKg: Number(totalWasteKg.toFixed(2)),
      activeAlertsCount: b._count.alerts,
      performanceTier
    });
  }

  return {
    buildingCount: comparisons.length,
    rankings: comparisons.sort((a, b) => a.energyIntensityKwhPerSqFt - b.energyIntensityKwhPerSqFt)
  };
}
