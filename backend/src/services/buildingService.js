import { prisma } from '../repositories/prismaClient.js';
import { NotFoundError } from '../utils/errors.js';

export async function getAllBuildings(filters = {}) {
  const where = {};
  if (filters.status) where.status = filters.status;
  if (filters.type) where.type = filters.type;

  const buildings = await prisma.building.findMany({
    where,
    include: {
      _count: {
        select: {
          zones: true,
          sensors: true,
          alerts: { where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] } } }
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  return buildings.map((b) => ({
    id: b.id,
    name: b.name,
    code: b.code,
    type: b.type,
    totalAreaSqFt: b.totalAreaSqFt,
    floors: b.floors,
    yearBuilt: b.yearBuilt,
    occupancyCapacity: b.occupancyCapacity,
    status: b.status,
    digitalTwinCoordinates: b.coordinatesJson ? JSON.parse(b.coordinatesJson) : null,
    zoneCount: b._count.zones,
    sensorCount: b._count.sensors,
    openAlertsCount: b._count.alerts,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt
  }));
}

export async function getBuildingById(id) {
  const building = await prisma.building.findUnique({
    where: { id },
    include: {
      zones: {
        orderBy: { floor: 'asc' }
      },
      sensors: {
        select: {
          id: true,
          code: true,
          name: true,
          sensorType: true,
          unit: true,
          status: true,
          lastPingAt: true
        }
      },
      _count: {
        select: {
          alerts: { where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] } } }
        }
      }
    }
  });

  if (!building) {
    throw new NotFoundError('Building', id);
  }

  return {
    ...building,
    digitalTwinCoordinates: building.coordinatesJson ? JSON.parse(building.coordinatesJson) : null,
    openAlertsCount: building._count.alerts
  };
}

export async function getBuildingMetrics(id, { startDate, endDate } = {}) {
  const building = await prisma.building.findUnique({ where: { id } });
  if (!building) {
    throw new NotFoundError('Building', id);
  }

  const dateFilter = {};
  if (startDate) dateFilter.gte = new Date(startDate);
  if (endDate) dateFilter.lte = new Date(endDate);

  const energyWhere = { buildingId: id };
  const waterWhere = { buildingId: id };
  const wasteWhere = { buildingId: id };

  if (startDate || endDate) {
    energyWhere.timestamp = dateFilter;
    waterWhere.timestamp = dateFilter;
    wasteWhere.timestamp = dateFilter;
  }

  // Aggregate Energy
  const energyAgg = await prisma.energyReading.aggregate({
    where: energyWhere,
    _sum: { consumptionKwh: true },
    _avg: { consumptionKwh: true, peakDemandKw: true },
    _count: { _all: true }
  });

  // Aggregate Water
  const waterAgg = await prisma.waterReading.aggregate({
    where: waterWhere,
    _sum: { volumeLitres: true },
    _avg: { volumeLitres: true, flowRateLpm: true },
    _count: { _all: true }
  });

  // Aggregate Waste
  const wasteAgg = await prisma.wasteRecord.aggregate({
    where: wasteWhere,
    _sum: { weightKg: true },
    _avg: { fullnessPercent: true },
    _count: { _all: true }
  });

  // Active alerts for this building
  const activeAlerts = await prisma.alert.findMany({
    where: {
      buildingId: id,
      status: { in: ['OPEN', 'ACKNOWLEDGED'] }
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  return {
    buildingId: id,
    buildingName: building.name,
    buildingCode: building.code,
    type: building.type,
    totalAreaSqFt: building.totalAreaSqFt,
    period: {
      startDate: startDate || 'all-time',
      endDate: endDate || 'present'
    },
    energy: {
      totalKwh: Number((energyAgg._sum.consumptionKwh || 0).toFixed(2)),
      averageKwh: Number((energyAgg._avg.consumptionKwh || 0).toFixed(2)),
      averagePeakKw: Number((energyAgg._avg.peakDemandKw || 0).toFixed(2)),
      readingsCount: energyAgg._count._all,
      unit: 'kWh'
    },
    water: {
      totalLitres: Number((waterAgg._sum.volumeLitres || 0).toFixed(1)),
      averageLitres: Number((waterAgg._avg.volumeLitres || 0).toFixed(1)),
      averageFlowRateLpm: Number((waterAgg._avg.flowRateLpm || 0).toFixed(2)),
      readingsCount: waterAgg._count._all,
      unit: 'Litres'
    },
    waste: {
      totalWeightKg: Number((wasteAgg._sum.weightKg || 0).toFixed(2)),
      averageBinFullnessPercent: Number((wasteAgg._avg.fullnessPercent || 0).toFixed(1)),
      recordsCount: wasteAgg._count._all,
      unit: 'kg'
    },
    activeAlerts: activeAlerts.map((a) => ({
      id: a.id,
      title: a.title,
      severity: a.severity,
      category: a.category,
      createdAt: a.createdAt
    }))
  };
}

export async function getAllZones(filters = {}) {
  const where = {};
  if (filters.buildingId) where.buildingId = filters.buildingId;
  if (filters.zoneType) where.zoneType = filters.zoneType;

  return prisma.zone.findMany({
    where,
    include: {
      building: {
        select: {
          id: true,
          name: true,
          code: true
        }
      },
      _count: {
        select: { sensors: true }
      }
    },
    orderBy: [{ buildingId: 'asc' }, { floor: 'asc' }]
  });
}

export async function getZoneById(id) {
  const zone = await prisma.zone.findUnique({
    where: { id },
    include: {
      building: {
        select: {
          id: true,
          name: true,
          code: true,
          type: true
        }
      },
      sensors: true
    }
  });

  if (!zone) {
    throw new NotFoundError('Zone', id);
  }

  return zone;
}
