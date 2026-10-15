import { prisma } from '../repositories/prismaClient.js';
import { NotFoundError } from '../utils/errors.js';

export async function getWasteRecords(filters = {}) {
  const { buildingId, binType, startDate, endDate, limit = 50, offset = 0 } = filters;
  const where = {};

  if (buildingId) where.buildingId = buildingId;
  if (binType) where.binType = binType;

  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) where.timestamp.gte = new Date(startDate);
    if (endDate) where.timestamp.lte = new Date(endDate);
  }

  const [total, records] = await Promise.all([
    prisma.wasteRecord.count({ where }),
    prisma.wasteRecord.findMany({
      where,
      include: {
        building: {
          select: { id: true, name: true, code: true }
        },
        zone: {
          select: { id: true, name: true, floor: true }
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
    records: records.map((r) => ({
      id: r.id,
      buildingId: r.buildingId,
      buildingName: r.building.name,
      buildingCode: r.building.code,
      zoneId: r.zoneId,
      zoneName: r.zone?.name || null,
      sensorId: r.sensorId,
      sensorCode: r.sensor?.code || null,
      timestamp: r.timestamp.toISOString(),
      binType: r.binType,
      fullnessPercent: r.fullnessPercent,
      weightKg: r.weightKg,
      isDemoData: r.isDemoData,
      notes: r.notes
    })),
    pagination: {
      total,
      limit: Number(limit),
      offset: Number(offset),
      hasMore: offset + records.length < total
    }
  };
}

export async function getWasteSummary(filters = {}) {
  const { buildingId, startDate, endDate } = filters;
  const where = {};

  if (buildingId) where.buildingId = buildingId;

  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) where.timestamp.gte = new Date(startDate);
    if (endDate) where.timestamp.lte = new Date(endDate);
  }

  // Aggregate by bin type
  const records = await prisma.wasteRecord.findMany({
    where,
    select: {
      binType: true,
      fullnessPercent: true,
      weightKg: true
    }
  });

  let totalWeightKg = 0;
  let recycledWeightKg = 0;
  let compostWeightKg = 0;
  let generalWeightKg = 0;
  let totalFullness = 0;

  const binBreakdown = {};

  for (const r of records) {
    const weight = r.weightKg || 0;
    totalWeightKg += weight;
    totalFullness += r.fullnessPercent;

    if (!binBreakdown[r.binType]) {
      binBreakdown[r.binType] = { count: 0, totalWeightKg: 0, avgFullness: 0 };
    }
    binBreakdown[r.binType].count += 1;
    binBreakdown[r.binType].totalWeightKg += weight;
    binBreakdown[r.binType].avgFullness += r.fullnessPercent;

    if (r.binType === 'RECYCLING') recycledWeightKg += weight;
    else if (r.binType === 'COMPOST') compostWeightKg += weight;
    else generalWeightKg += weight;
  }

  const divertedWeightKg = recycledWeightKg + compostWeightKg;
  const diversionRate = totalWeightKg > 0 ? Number(((divertedWeightKg / totalWeightKg) * 100).toFixed(1)) : 0;
  const avgFullnessPercent = records.length > 0 ? Number((totalFullness / records.length).toFixed(1)) : 0;

  // Normalize breakdown averages
  for (const type of Object.keys(binBreakdown)) {
    binBreakdown[type].totalWeightKg = Number(binBreakdown[type].totalWeightKg.toFixed(2));
    binBreakdown[type].avgFullness = Number((binBreakdown[type].avgFullness / binBreakdown[type].count).toFixed(1));
  }

  return {
    unit: 'kg',
    totalWasteWeightKg: Number(totalWeightKg.toFixed(2)),
    divertedWeightKg: Number(divertedWeightKg.toFixed(2)),
    landfillWeightKg: Number(generalWeightKg.toFixed(2)),
    diversionRatePercent: diversionRate,
    averageBinFullnessPercent: avgFullnessPercent,
    recordsEvaluated: records.length,
    binTypeBreakdown: binBreakdown,
    period: {
      startDate: startDate || null,
      endDate: endDate || null
    }
  };
}

export async function getWasteDetections(filters = {}) {
  const { buildingId, wasteCategory, limit = 50, offset = 0 } = filters;
  const where = {};

  if (buildingId) where.buildingId = buildingId;
  if (wasteCategory) where.wasteCategory = wasteCategory;

  const [total, events] = await Promise.all([
    prisma.wasteDetectionEvent.count({ where }),
    prisma.wasteDetectionEvent.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: Number(limit),
      skip: Number(offset)
    })
  ]);

  return {
    detections: events.map((e) => ({
      id: e.id,
      buildingId: e.buildingId,
      zoneId: e.zoneId,
      timestamp: e.timestamp.toISOString(),
      wasteCategory: e.wasteCategory,
      confidenceScore: e.confidenceScore,
      isModelEstimate: e.isModelEstimate,
      estimatedWeightKg: e.estimatedWeightKg,
      boundingBox: e.boundingBoxJson ? JSON.parse(e.boundingBoxJson) : null,
      imageUrl: e.imageUrl,
      detectedBy: e.detectedBy,
      rawMetadata: e.rawMetadata ? JSON.parse(e.rawMetadata) : null
    })),
    pagination: {
      total,
      limit: Number(limit),
      offset: Number(offset),
      hasMore: offset + events.length < total
    }
  };
}

export async function createWasteDetection(data) {
  if (data.buildingId) {
    const building = await prisma.building.findUnique({ where: { id: data.buildingId } });
    if (!building) {
      throw new NotFoundError('Building', data.buildingId);
    }
  }

  const detection = await prisma.wasteDetectionEvent.create({
    data: {
      buildingId: data.buildingId || null,
      zoneId: data.zoneId || null,
      wasteCategory: data.wasteCategory,
      confidenceScore: data.confidenceScore,
      isModelEstimate: data.isModelEstimate ?? true,
      estimatedWeightKg: data.estimatedWeightKg || null,
      boundingBoxJson: data.boundingBoxJson || null,
      imageUrl: data.imageUrl || null,
      detectedBy: data.detectedBy || 'AI_CV',
      rawMetadata: data.rawMetadata || null
    }
  });

  return {
    ...detection,
    timestamp: detection.timestamp.toISOString(),
    boundingBox: detection.boundingBoxJson ? JSON.parse(detection.boundingBoxJson) : null
  };
}
