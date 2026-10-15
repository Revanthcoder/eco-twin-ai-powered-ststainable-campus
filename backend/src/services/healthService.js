import { prisma } from '../repositories/prismaClient.js';
import { config } from '../config/index.js';

export async function getHealthStatus() {
  let dbStatus = 'CONNECTED';
  let dbLatencyMs = 0;

  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - start;
  } catch (err) {
    dbStatus = 'DISCONNECTED';
  }

  const memory = process.memoryUsage();

  return {
    status: dbStatus === 'CONNECTED' ? 'HEALTHY' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
      type: 'SQLite'
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      memoryUsageMb: {
        rss: Math.round(memory.rss / 1024 / 1024),
        heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memory.heapTotal / 1024 / 1024)
      }
    }
  };
}

export async function getDetailedSystemStatus() {
  const [
    buildingCount,
    zoneCount,
    sensorCount,
    energyCount,
    waterCount,
    wasteCount,
    openAlertsCount,
    latestEnergyReading,
    latestWaterReading
  ] = await Promise.all([
    prisma.building.count(),
    prisma.zone.count(),
    prisma.sensor.count(),
    prisma.energyReading.count(),
    prisma.waterReading.count(),
    prisma.wasteRecord.count(),
    prisma.alert.count({ where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] } } }),
    prisma.energyReading.findFirst({ orderBy: { timestamp: 'desc' }, select: { timestamp: true } }),
    prisma.waterReading.findFirst({ orderBy: { timestamp: 'desc' }, select: { timestamp: true } })
  ]);

  return {
    environment: config.NODE_ENV,
    apiPrefix: config.API_PREFIX,
    dataCoverage: {
      buildings: buildingCount,
      zones: zoneCount,
      activeSensors: sensorCount,
      totalEnergyReadings: energyCount,
      totalWaterReadings: waterCount,
      totalWasteRecords: wasteCount,
      activeAlerts: openAlertsCount
    },
    dataFreshness: {
      latestEnergyTimestamp: latestEnergyReading?.timestamp || null,
      latestWaterTimestamp: latestWaterReading?.timestamp || null
    },
    aiIntegration: {
      serviceUrl: config.AI_SERVICE_URL,
      mockFallbackEnabled: config.AI_MOCK_FALLBACK
    }
  };
}
