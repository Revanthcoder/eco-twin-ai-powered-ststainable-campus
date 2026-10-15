import { prisma } from '../repositories/prismaClient.js';
import * as energyService from './energyService.js';
import * as waterService from './waterService.js';
import * as wasteService from './wasteService.js';

export async function getCurrentSustainabilityScore(period = 'DAILY') {
  // Check if a score exists for today
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const existing = await prisma.sustainabilityScore.findFirst({
    where: {
      calculationPeriod: period,
      periodEnd: { gte: startOfDay }
    },
    orderBy: { createdAt: 'desc' }
  });

  if (existing) {
    return formatScoreRecord(existing);
  }

  // Calculate live dynamic score
  const score = await calculateCampusSustainabilityScore(period);
  return score;
}

export async function calculateCampusSustainabilityScore(period = 'DAILY') {
  const now = new Date();
  const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const filters = { startDate: start.toISOString(), endDate: now.toISOString() };

  const [energySummary, waterSummary, wasteSummary, latestReading] = await Promise.all([
    energyService.getEnergySummary(filters),
    waterService.getWaterSummary(filters),
    wasteService.getWasteSummary(filters),
    prisma.energyReading.findFirst({ orderBy: { timestamp: 'desc' } })
  ]);

  // 1. Energy Score (0 - 100) -> Weight: 35%
  // Baseline: Renewable ratio gives up to 50 pts; consumption stability gives up to 50 pts
  let energyRawScore = 50.0;
  if (energySummary.metrics.sampleCount > 0) {
    energyRawScore = Math.min(100, Math.max(0,
      50 + (energySummary.sourceBreakdown.renewablePercentage * 1.5)
    ));
  } else {
    energyRawScore = 30.0; // penalty for missing data
  }

  // 2. Water Score (0 - 100) -> Weight: 25%
  // Recycled water % and absence of leak anomalies
  let waterRawScore = 70.0;
  if (waterSummary.categoryBreakdown.recycledPercentage > 0) {
    waterRawScore += (waterSummary.categoryBreakdown.recycledPercentage * 0.8);
  }
  if (waterSummary.flowRateMetrics.anomalyStatus === 'POTENTIAL_ANOMALY_DETECTED') {
    waterRawScore -= 20.0;
  }
  waterRawScore = Math.min(100, Math.max(0, waterRawScore));

  // 3. Waste Score (0 - 100) -> Weight: 20%
  // Direct reflection of waste diversion rate (recycling + composting)
  let wasteRawScore = 60.0;
  if (wasteSummary.recordsEvaluated > 0) {
    wasteRawScore = Math.min(100, Math.max(0,
      40 + (wasteSummary.diversionRatePercent * 0.8) - (wasteSummary.averageBinFullnessPercent > 85 ? 10 : 0)
    ));
  }

  // 4. Carbon Score (0 - 100) -> Weight: 20%
  // Inversely proportional to grid dependence
  const carbonRawScore = Math.min(100, Math.max(0,
    65 + (energySummary.sourceBreakdown.renewablePercentage * 0.7)
  ));

  // Data Freshness & Penalty Calculation
  let dataFreshnessHours = 24.0;
  if (latestReading) {
    dataFreshnessHours = Math.max(0.1, Number(((now.getTime() - latestReading.timestamp.getTime()) / (1000 * 60 * 60)).toFixed(1)));
  }

  let missingDataPenalty = 0.0;
  if (energySummary.metrics.sampleCount === 0) missingDataPenalty += 10.0;
  if (wasteSummary.recordsEvaluated === 0) missingDataPenalty += 5.0;
  if (dataFreshnessHours > 48.0) missingDataPenalty += 15.0;

  // Weighted Component Aggregation
  const weights = { energy: 0.35, water: 0.25, waste: 0.20, carbon: 0.20 };
  const rawWeightedScore = (
    energyRawScore * weights.energy +
    waterRawScore * weights.water +
    wasteRawScore * weights.waste +
    carbonRawScore * weights.carbon
  );

  const finalScore = Number(Math.max(0, Math.min(100, rawWeightedScore - missingDataPenalty)).toFixed(1));

  const details = {
    methodology: 'Weighted multi-criteria campus sustainability index (CSI-100)',
    freshnessAssessment: dataFreshnessHours <= 2.0 ? 'OPTIMAL' : dataFreshnessHours <= 12.0 ? 'ACCEPTABLE' : 'STALE',
    notes: 'Missing data receives explicit penalty deductions to prevent unearned perfect ratings.'
  };

  // Persist record to database
  const created = await prisma.sustainabilityScore.create({
    data: {
      calculationPeriod: period,
      periodStart: start,
      periodEnd: now,
      totalScore: finalScore,
      energyScore: Number(energyRawScore.toFixed(1)),
      waterScore: Number(waterRawScore.toFixed(1)),
      wasteScore: Number(wasteRawScore.toFixed(1)),
      carbonScore: Number(carbonRawScore.toFixed(1)),
      componentWeightsJson: JSON.stringify(weights),
      dataFreshnessHours,
      missingDataPenalty,
      detailsJson: JSON.stringify(details)
    }
  });

  return formatScoreRecord(created);
}

export async function getSustainabilityScoreHistory({ limit = 30, offset = 0 } = {}) {
  const [total, records] = await Promise.all([
    prisma.sustainabilityScore.count(),
    prisma.sustainabilityScore.findMany({
      orderBy: { periodEnd: 'desc' },
      take: Number(limit),
      skip: Number(offset)
    })
  ]);

  return {
    history: records.map(formatScoreRecord),
    pagination: {
      total,
      limit: Number(limit),
      offset: Number(offset),
      hasMore: offset + records.length < total
    }
  };
}

function formatScoreRecord(record) {
  return {
    id: record.id,
    period: record.calculationPeriod,
    periodStart: record.periodStart.toISOString(),
    periodEnd: record.periodEnd.toISOString(),
    totalScore: record.totalScore,
    scaleMax: 100,
    componentScores: {
      energy: record.energyScore,
      water: record.waterScore,
      waste: record.wasteScore,
      carbon: record.carbonScore
    },
    weights: JSON.parse(record.componentWeightsJson),
    dataFreshnessHours: record.dataFreshnessHours,
    missingDataPenalty: record.missingDataPenalty,
    details: record.detailsJson ? JSON.parse(record.detailsJson) : null,
    calculatedAt: record.createdAt.toISOString()
  };
}
