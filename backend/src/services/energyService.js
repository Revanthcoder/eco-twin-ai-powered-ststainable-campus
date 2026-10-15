import { prisma } from '../repositories/prismaClient.js';
import { NotFoundError } from '../utils/errors.js';

export async function getEnergyReadings(filters = {}) {
  const { buildingId, source, startDate, endDate, limit = 50, offset = 0 } = filters;
  const where = {};

  if (buildingId) where.buildingId = buildingId;
  if (source) where.source = source;

  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) where.timestamp.gte = new Date(startDate);
    if (endDate) where.timestamp.lte = new Date(endDate);
  }

  const [total, readings] = await Promise.all([
    prisma.energyReading.count({ where }),
    prisma.energyReading.findMany({
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
      consumptionKwh: r.consumptionKwh,
      peakDemandKw: r.peakDemandKw,
      source: r.source,
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

export async function getEnergySummary(filters = {}) {
  const { buildingId, startDate, endDate } = filters;
  const where = {};

  if (buildingId) where.buildingId = buildingId;

  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) where.timestamp.gte = new Date(startDate);
    if (endDate) where.timestamp.lte = new Date(endDate);
  }

  const [totalAgg, gridAgg, solarAgg] = await Promise.all([
    prisma.energyReading.aggregate({
      where,
      _sum: { consumptionKwh: true },
      _avg: { consumptionKwh: true, peakDemandKw: true },
      _max: { peakDemandKw: true },
      _count: { _all: true }
    }),
    prisma.energyReading.aggregate({
      where: { ...where, source: 'GRID' },
      _sum: { consumptionKwh: true }
    }),
    prisma.energyReading.aggregate({
      where: { ...where, source: 'SOLAR' },
      _sum: { consumptionKwh: true }
    })
  ]);

  const totalKwh = Number((totalAgg._sum.consumptionKwh || 0).toFixed(2));
  const gridKwh = Number((gridAgg._sum.consumptionKwh || 0).toFixed(2));
  const solarKwh = Number((solarAgg._sum.consumptionKwh || 0).toFixed(2));
  const renewableRatio = totalKwh > 0 ? Number(((solarKwh / totalKwh) * 100).toFixed(1)) : 0;

  return {
    unit: 'kWh',
    totalConsumptionKwh: totalKwh,
    sourceBreakdown: {
      gridKwh,
      solarKwh,
      renewablePercentage: renewableRatio
    },
    metrics: {
      averageReadingKwh: Number((totalAgg._avg.consumptionKwh || 0).toFixed(2)),
      averagePeakDemandKw: Number((totalAgg._avg.peakDemandKw || 0).toFixed(2)),
      maxPeakDemandKw: Number((totalAgg._max.peakDemandKw || 0).toFixed(2)),
      sampleCount: totalAgg._count._all
    },
    period: {
      startDate: startDate || null,
      endDate: endDate || null
    }
  };
}

export async function getEnergyTrends(filters = {}) {
  const { buildingId, interval = 'daily', startDate, endDate } = filters;
  const where = {};

  if (buildingId) where.buildingId = buildingId;

  // Default to past 7 days if not provided
  const now = new Date();
  const start = startDate ? new Date(startDate) : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : now;

  where.timestamp = {
    gte: start,
    lte: end
  };

  const readings = await prisma.energyReading.findMany({
    where,
    orderBy: { timestamp: 'asc' },
    select: {
      timestamp: true,
      consumptionKwh: true,
      peakDemandKw: true,
      source: true,
      buildingId: true
    }
  });

  // Group readings by date bucket
  const buckets = {};
  for (const r of readings) {
    const key = interval === 'hourly'
      ? r.timestamp.toISOString().substring(0, 13) + ':00:00Z'
      : r.timestamp.toISOString().substring(0, 10);

    if (!buckets[key]) {
      buckets[key] = {
        period: key,
        totalKwh: 0,
        gridKwh: 0,
        solarKwh: 0,
        count: 0
      };
    }

    buckets[key].totalKwh += r.consumptionKwh;
    if (r.source === 'SOLAR') {
      buckets[key].solarKwh += r.consumptionKwh;
    } else {
      buckets[key].gridKwh += r.consumptionKwh;
    }
    buckets[key].count += 1;
  }

  const trends = Object.values(buckets).map((b) => ({
    period: b.period,
    totalKwh: Number(b.totalKwh.toFixed(2)),
    gridKwh: Number(b.gridKwh.toFixed(2)),
    solarKwh: Number(b.solarKwh.toFixed(2)),
    readingCount: b.count
  }));

  return {
    unit: 'kWh',
    interval,
    timeRange: { start: start.toISOString(), end: end.toISOString() },
    datapoints: trends
  };
}

export async function createEnergyReading(data) {
  const building = await prisma.building.findUnique({
    where: { id: data.buildingId }
  });

  if (!building) {
    throw new NotFoundError('Building', data.buildingId);
  }

  const reading = await prisma.energyReading.create({
    data: {
      buildingId: data.buildingId,
      sensorId: data.sensorId || null,
      timestamp: new Date(data.timestamp),
      consumptionKwh: data.consumptionKwh,
      peakDemandKw: data.peakDemandKw || null,
      source: data.source || 'GRID',
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
