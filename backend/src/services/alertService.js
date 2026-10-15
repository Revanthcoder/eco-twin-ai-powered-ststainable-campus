import { prisma } from '../repositories/prismaClient.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

export async function getAlerts(filters = {}) {
  const { buildingId, severity, status, category, limit = 50, offset = 0 } = filters;
  const where = {};

  if (buildingId) where.buildingId = buildingId;
  if (severity) where.severity = severity;
  if (status) where.status = status;
  if (category) where.category = category;

  const [total, alerts] = await Promise.all([
    prisma.alert.count({ where }),
    prisma.alert.findMany({
      where,
      include: {
        building: { select: { id: true, name: true, code: true } },
        zone: { select: { id: true, name: true } },
        _count: { select: { history: true, maintenanceTasks: true } }
      },
      orderBy: [
        { severity: 'asc' }, // Will sort logically
        { createdAt: 'desc' }
      ],
      take: Number(limit),
      skip: Number(offset)
    })
  ]);

  return {
    alerts: alerts.map((a) => ({
      id: a.id,
      buildingId: a.buildingId,
      buildingName: a.building?.name || null,
      buildingCode: a.building?.code || null,
      zoneId: a.zoneId,
      zoneName: a.zone?.name || null,
      title: a.title,
      description: a.description,
      category: a.category,
      severity: a.severity,
      status: a.status,
      triggerSource: a.triggerSource,
      triggerValue: a.triggerValue,
      thresholdValue: a.thresholdValue,
      unit: a.unit,
      isDemoData: a.isDemoData,
      acknowledgedAt: a.acknowledgedAt?.toISOString() || null,
      acknowledgedBy: a.acknowledgedBy || null,
      resolvedAt: a.resolvedAt?.toISOString() || null,
      resolvedBy: a.resolvedBy || null,
      historyCount: a._count.history,
      maintenanceTasksCount: a._count.maintenanceTasks,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString()
    })),
    pagination: {
      total,
      limit: Number(limit),
      offset: Number(offset),
      hasMore: offset + alerts.length < total
    }
  };
}

export async function getAlertById(id) {
  const alert = await prisma.alert.findUnique({
    where: { id },
    include: {
      building: { select: { id: true, name: true, code: true } },
      zone: { select: { id: true, name: true } },
      history: { orderBy: { createdAt: 'desc' } },
      maintenanceTasks: {
        select: { id: true, title: true, priority: true, status: true, dueDate: true }
      }
    }
  });

  if (!alert) {
    throw new NotFoundError('Alert', id);
  }

  return {
    ...alert,
    history: alert.history.map((h) => ({
      id: h.id,
      previousStatus: h.previousStatus,
      newStatus: h.newStatus,
      changedBy: h.changedBy,
      note: h.note,
      createdAt: h.createdAt.toISOString()
    }))
  };
}

export async function updateAlertStatus(id, { status, note }, user = null) {
  const alert = await prisma.alert.findUnique({ where: { id } });
  if (!alert) {
    throw new NotFoundError('Alert', id);
  }

  const previousStatus = alert.status;
  if (previousStatus === status) {
    return alert; // No change needed
  }

  const updaterName = user ? user.name : 'SustainabilityOperator';
  const now = new Date();

  const updateData = { status };
  if (status === 'ACKNOWLEDGED' && !alert.acknowledgedAt) {
    updateData.acknowledgedAt = now;
    updateData.acknowledgedBy = updaterName;
  } else if (status === 'RESOLVED') {
    updateData.resolvedAt = now;
    updateData.resolvedBy = updaterName;
  }

  const [updatedAlert] = await prisma.$transaction([
    prisma.alert.update({
      where: { id },
      data: updateData
    }),
    prisma.alertHistory.create({
      data: {
        alertId: id,
        previousStatus,
        newStatus: status,
        changedBy: updaterName,
        note: note || `Status transitioned from ${previousStatus} to ${status}`
      }
    })
  ]);

  return updatedAlert;
}

/**
 * Transparent rule evaluation engine: scans recent telemetry against thresholds.
 * Strictly prevents duplicate alerts for existing open or acknowledged issues.
 */
export async function evaluateSustainabilityRules({ buildingId } = {}) {
  const createdAlerts = [];
  const evaluatedChecks = [];

  const buildingFilter = buildingId ? { id: buildingId } : {};
  const buildings = await prisma.building.findMany({ where: buildingFilter });

  // 1. Fetch system thresholds
  const [waterLeakSetting, binFullSetting] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: 'WATER_FLOW_LEAK_THRESHOLD_LPM' } }),
    prisma.systemSetting.findUnique({ where: { key: 'WASTE_BIN_OVERFLOW_PERCENT' } })
  ]);

  const waterLeakThreshold = waterLeakSetting ? parseFloat(waterLeakSetting.value) : 30.0;
  const binOverflowThreshold = binFullSetting ? parseFloat(binFullSetting.value) : 85.0;

  for (const b of buildings) {
    // Check A: Water flow rate
    const latestWater = await prisma.waterReading.findFirst({
      where: { buildingId: b.id },
      orderBy: { timestamp: 'desc' }
    });

    if (latestWater && latestWater.flowRateLpm) {
      evaluatedChecks.push({
        building: b.name,
        type: 'WATER_FLOW',
        measured: latestWater.flowRateLpm,
        threshold: waterLeakThreshold
      });

      if (latestWater.flowRateLpm > waterLeakThreshold) {
        // Duplicate check
        const existingAlert = await prisma.alert.findFirst({
          where: {
            buildingId: b.id,
            triggerSource: 'UNUSUAL_WATER_FLOW',
            status: { in: ['OPEN', 'ACKNOWLEDGED'] }
          }
        });

        if (!existingAlert) {
          const newAlert = await prisma.alert.create({
            data: {
              buildingId: b.id,
              title: `High Water Flow Rate Anomaly: ${b.name}`,
              description: `Measured continuous flow rate of ${latestWater.flowRateLpm} L/min exceeds safety threshold of ${waterLeakThreshold} L/min.`,
              category: 'WATER',
              severity: 'HIGH',
              status: 'OPEN',
              triggerSource: 'UNUSUAL_WATER_FLOW',
              triggerValue: latestWater.flowRateLpm,
              thresholdValue: waterLeakThreshold,
              unit: 'L/min',
              isDemoData: latestWater.isDemoData,
              history: {
                create: {
                  previousStatus: 'NEW',
                  newStatus: 'OPEN',
                  changedBy: 'SustainabilityGuardianEngine',
                  note: 'Automated evaluation detected flow rate excursion above threshold.'
                }
              }
            }
          });
          createdAlerts.push(newAlert);
        }
      }
    }

    // Check B: Waste bin overflow
    const latestWaste = await prisma.wasteRecord.findFirst({
      where: { buildingId: b.id },
      orderBy: { timestamp: 'desc' }
    });

    if (latestWaste) {
      evaluatedChecks.push({
        building: b.name,
        type: 'BIN_FULLNESS',
        measured: latestWaste.fullnessPercent,
        threshold: binOverflowThreshold
      });

      if (latestWaste.fullnessPercent >= binOverflowThreshold) {
        // Duplicate check
        const existingAlert = await prisma.alert.findFirst({
          where: {
            buildingId: b.id,
            triggerSource: 'BIN_FULLNESS',
            status: { in: ['OPEN', 'ACKNOWLEDGED'] }
          }
        });

        if (!existingAlert) {
          const newAlert = await prisma.alert.create({
            data: {
              buildingId: b.id,
              title: `Waste Bin Capacity Overflow Warning: ${b.name}`,
              description: `Bin fullness reached ${latestWaste.fullnessPercent}% exceeding action threshold of ${binOverflowThreshold}%.`,
              category: 'WASTE',
              severity: 'MEDIUM',
              status: 'OPEN',
              triggerSource: 'BIN_FULLNESS',
              triggerValue: latestWaste.fullnessPercent,
              thresholdValue: binOverflowThreshold,
              unit: '%',
              isDemoData: latestWaste.isDemoData,
              history: {
                create: {
                  previousStatus: 'NEW',
                  newStatus: 'OPEN',
                  changedBy: 'SustainabilityGuardianEngine',
                  note: 'Automated evaluation detected bin volume exceeding service threshold.'
                }
              }
            }
          });
          createdAlerts.push(newAlert);
        }
      }
    }
  }

  return {
    evaluatedChecksCount: evaluatedChecks.length,
    newAlertsCreatedCount: createdAlerts.length,
    createdAlerts: createdAlerts.map((a) => ({
      id: a.id,
      title: a.title,
      severity: a.severity,
      category: a.category
    })),
    evaluatedChecks
  };
}
