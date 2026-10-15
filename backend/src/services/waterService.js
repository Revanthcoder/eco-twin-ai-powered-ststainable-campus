import { prisma } from '../repositories/prismaClient.js';
import { NotFoundError } from '../utils/errors.js';

export async function getWaterReadings(filters = {}) {
  const { buildingId, category, startDate, endDate, limit = 50, offset = 0 } = filters;
  const where = {};

  if (buildingId) where.buildingId = buildingId;
  if (category) where.category = category;

  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) where.timestamp.gte = new Date(startDate);
    if (endDate) where.timestamp.lte = new Date(endDate);
  }

  const [total, readings] = await Promise.all([
    prisma.waterReading.count({ where }),
    prisma.waterReading.findMany({
      where,
      include: {
        building: {
          select: { id: true, name: true, code: true }
        },
        sensor: {
          select: { id: true, code: true, name: true }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: Number(limit),
      skip: Number(offset)
    })
  ]);

  return {
    readings: readings.map((r) => ({
      id: r.id,
      buildingId: r.buildingId,
      buildingName: r.building.name,
      buildingCode: r.building.code,
      sensorId: r.sensorId,
      sensorCode: r.sensor?.code || null,
      timestamp: r.timestamp.toISOString(),
      volumeLitres: r.volumeLitres,
      flowRateLpm: r.flowRateLpm,
      category: r.category,
      isDemoData: r.isDemoData,
      notes: r.notes
    })),
    pagination: {
      total,
      limit: Number(limit),
      offset: Number(offset),
      hasMore: offset + readings.length < total
    }
  };
}

export async function getWaterSummary(filters = {}) {
  const { buildingId, startDate, endDate } = filters;
  const where = {};

  if (buildingId) where.buildingId = buildingId;

  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) where.timestamp.gte = new Date(startDate);
    if (endDate) where.timestamp.lte = new Date(endDate);
  }

  const [totalAgg, potableAgg, recycledAgg] = await Promise.all([
    prisma.waterReading.aggregate({
      where,
      _sum: { volumeLitres: true },
      _avg: { volumeLitres: true, flowRateLpm: true },
      _max: { flowRateLpm: true },
      _count: { _all: true }
    }),
    prisma.waterReading.aggregate({
      where: { ...where, category: 'POTABLE' },
      _sum: { volumeLitres: true }
    }),
    prisma.waterReading.aggregate({
      where: { ...where, category: 'RECYCLED' },
      _sum: { volumeLitres: true }
    })
  ]);

  const totalLitres = Number((totalAgg._sum.volumeLitres || 0).toFixed(1));
  const potableLitres = Number((potableAgg._sum.volumeLitres || 0).toFixed(1));
  const recycledLitres = Number((recycledAgg._sum.volumeLitres || 0).toFixed(1));
  const recycledRatio = totalLitres > 0 ? Number(((recycledLitres / totalLitres) * 100).toFixed(1)) : 0;

  // Retrieve water flow anomaly threshold from system settings if present
  const thresholdSetting = await prisma.systemSetting.findUnique({
    where: { key: 'WATER_FLOW_LEAK_THRESHOLD_LPM' }
  });
  const anomalyThresholdLpm = thresholdSetting ? parseFloat(thresholdSetting.value) : 30.0;

  return {
    unit: 'Litres',
    totalVolumeLitres: totalLitres,
    categoryBreakdown: {
      potableLitres,
      recycledLitres,
      recycledPercentage: recycledRatio
    },
    flowRateMetrics: {
      averageFlowRateLpm: Number((totalAgg._avg.flowRateLpm || 0).toFixed(2)),
      peakFlowRateLpm: Number((totalAgg._max.flowRateLpm || 0).toFixed(2)),
      configuredAnomalyThresholdLpm: anomalyThresholdLpm,
      anomalyStatus: (totalAgg._max.flowRateLpm || 0) > anomalyThresholdLpm ? 'POTENTIAL_ANOMALY_DETECTED' : 'NORMAL'
    },
    period: {
      startDate: startDate || null,
      endDate: endDate || null
    }
  };
}

export async function getWaterTrends(filters = {}) {
  const { buildingId, interval = 'daily', startDate, endDate } = filters;
  const where = {};

  if (buildingId) where.buildingId = buildingId;

  const now = new Date();
  const start = startDate ? new Date(startDate) : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : now;

  where.timestamp = {
    gte: start,
    lte: end
  };

  const readings = await prisma.waterReading.findMany({
    where,
    orderBy: { timestamp: 'asc' },
    select: {
      timestamp: true,
      volumeLitres: true,
      flowRateLpm: true,
      category: true
    }
  });

  const buckets = {};
  for (const r of readings) {
    const key = interval === 'hourly'
      ? r.timestamp.toISOString().substring(0, 13) + ':00:00Z'
      : r.timestamp.toISOString().substring(0, 10);

    if (!buckets[key]) {
      buckets[key] = {
        period: key,
        totalLitres: 0,
        potableLitres: 0,
        recycledLitres: 0,
        avgFlowLpm: 0,
        count: 0
      };
    }

    buckets[key].totalLitres += r.volumeLitres;
    if (r.category === 'RECYCLED') {
      buckets[key].recycledLitres += r.volumeLitres;
    } else {
      buckets[key].potableLitres += r.volumeLitres;
    }
    if (r.flowRateLpm) {
      buckets[key].avgFlowLpm += r.flowRateLpm;
    }
    buckets[key].count += 1;
  }

  const trends = Object.values(buckets).map((b) => ({
    period: b.period,
    totalLitres: Number(b.totalLitres.toFixed(1)),
    potableLitres: Number(b.potableLitres.toFixed(1)),
    recycledLitres: Number(b.recycledLitres.toFixed(1)),
    averageFlowRateLpm: b.count > 0 ? Number((b.avgFlowLpm / b.count).toFixed(2)) : 0,
    readingCount: b.count
  }));

  return {
    unit: 'Litres',
    interval,
    timeRange: { start: start.toISOString(), end: end.toISOString() },
    datapoints: trends
  };
}

export async function createWaterReading(data) {
  const building = await prisma.building.findUnique({
    where: { id: data.buildingId }
  });

  if (!building) {
    throw new NotFoundError('Building', data.buildingId);
  }

  const reading = await prisma.waterReading.create({
    data: {
      buildingId: data.buildingId,
      sensorId: data.sensorId || null,
      timestamp: new Date(data.timestamp),
      volumeLitres: data.volumeLitres,
      flowRateLpm: data.flowRateLpm || null,
      category: data.category || 'POTABLE',
      isDemoData: data.isDemoData ?? false,
      notes: data.notes || null
    },
    include: {
      building: {
        select: { id: true, name: true, code: true }
      }
    }
  });

  return {
    ...reading,
    timestamp: reading.timestamp.toISOString()
  };
}
