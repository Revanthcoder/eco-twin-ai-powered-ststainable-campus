import { z } from 'zod';

// Common helpers
export const idParamSchema = z.object({
  id: z.string().min(1, 'ID parameter is required')
});

const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});

const dateRangeQuerySchema = paginationQuerySchema.extend({
  buildingId: z.string().optional(),
  startDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  endDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional()
});

// Auth
export const loginSchema = {
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters')
  })
};

// Buildings & Zones
export const getBuildingsQuerySchema = {
  query: z.object({
    status: z.enum(['ACTIVE', 'MAINTENANCE', 'INACTIVE']).optional(),
    type: z.enum(['ACADEMIC', 'RESIDENTIAL', 'ADMINISTRATIVE', 'DINING', 'SPORTS', 'LAB']).optional()
  })
};

export const buildingIdParamSchema = {
  params: idParamSchema
};

export const zoneIdParamSchema = {
  params: idParamSchema
};

export const getZonesQuerySchema = {
  query: z.object({
    buildingId: z.string().optional(),
    zoneType: z.string().optional()
  })
};

// Energy
export const createEnergyReadingSchema = {
  body: z.object({
    buildingId: z.string().min(1, 'buildingId is required'),
    sensorId: z.string().optional(),
    timestamp: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).default(() => new Date().toISOString()),
    consumptionKwh: z.number().min(0, 'consumptionKwh must be non-negative'),
    peakDemandKw: z.number().min(0).optional(),
    source: z.enum(['GRID', 'SOLAR', 'GENERATOR']).default('GRID'),
    isDemoData: z.boolean().default(false),
    notes: z.string().max(500).optional()
  })
};

export const energyFilterQuerySchema = {
  query: dateRangeQuerySchema.extend({
    source: z.enum(['GRID', 'SOLAR', 'GENERATOR']).optional()
  })
};

export const trendsQuerySchema = {
  query: z.object({
    buildingId: z.string().optional(),
    interval: z.enum(['hourly', 'daily', 'monthly']).default('daily'),
    startDate: z.string().optional(),
    endDate: z.string().optional()
  })
};

// Water
export const createWaterReadingSchema = {
  body: z.object({
    buildingId: z.string().min(1, 'buildingId is required'),
    sensorId: z.string().optional(),
    timestamp: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).default(() => new Date().toISOString()),
    volumeLitres: z.number().min(0, 'volumeLitres must be non-negative'),
    flowRateLpm: z.number().min(0).optional(),
    category: z.enum(['POTABLE', 'RECYCLED', 'IRRIGATION']).default('POTABLE'),
    isDemoData: z.boolean().default(false),
    notes: z.string().max(500).optional()
  })
};

export const waterFilterQuerySchema = {
  query: dateRangeQuerySchema.extend({
    category: z.enum(['POTABLE', 'RECYCLED', 'IRRIGATION']).optional()
  })
};

// Waste
export const createWasteDetectionSchema = {
  body: z.object({
    buildingId: z.string().optional(),
    zoneId: z.string().optional(),
    wasteCategory: z.enum(['PLASTIC', 'PAPER', 'ORGANIC', 'METAL', 'GLASS', 'E_WASTE', 'UNKNOWN']),
    confidenceScore: z.number().min(0.0).max(1.0, 'confidenceScore must be between 0.0 and 1.0'),
    isModelEstimate: z.boolean().default(true),
    estimatedWeightKg: z.number().min(0).optional(),
    boundingBoxJson: z.string().optional(),
    imageUrl: z.string().optional(),
    detectedBy: z.enum(['AI_CV', 'SENSOR', 'MANUAL']).default('AI_CV'),
    rawMetadata: z.string().optional()
  })
};

export const wasteFilterQuerySchema = {
  query: dateRangeQuerySchema.extend({
    binType: z.enum(['GENERAL', 'RECYCLING', 'COMPOST', 'HAZARDOUS', 'E_WASTE']).optional()
  })
};

export const wasteDetectionsQuerySchema = {
  query: paginationQuerySchema.extend({
    buildingId: z.string().optional(),
    wasteCategory: z.enum(['PLASTIC', 'PAPER', 'ORGANIC', 'METAL', 'GLASS', 'E_WASTE', 'UNKNOWN']).optional()
  })
};

// Alerts
export const alertFilterQuerySchema = {
  query: paginationQuerySchema.extend({
    buildingId: z.string().optional(),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    status: z.enum(['OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED']).optional(),
    category: z.enum(['ENERGY', 'WATER', 'WASTE', 'AIR_QUALITY', 'SYSTEM']).optional()
  })
};

export const alertIdParamSchema = {
  params: idParamSchema
};

export const updateAlertSchema = {
  params: idParamSchema,
  body: z.object({
    status: z.enum(['OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED']),
    note: z.string().max(500).optional()
  })
};

export const evaluateAlertsSchema = {
  body: z.object({
    buildingId: z.string().optional()
  })
};

// Simulator
export const runSimulationSchema = {
  body: z.object({
    name: z.string().min(2, 'Scenario name is required'),
    description: z.string().optional(),
    energyReductionPct: z.number().min(0).max(100).default(0),
    waterEfficiencyPct: z.number().min(0).max(100).default(0),
    solarAdditionKw: z.number().min(0).default(0),
    tariffPerKwh: z.number().min(0).optional(),
    gridEmissionFactor: z.number().min(0).optional(),
    baselineDays: z.number().int().min(1).max(90).default(30)
  })
};

// Maintenance
export const createMaintenanceTaskSchema = {
  body: z.object({
    buildingId: z.string().optional(),
    zoneId: z.string().optional(),
    alertId: z.string().optional(),
    title: z.string().min(3, 'Title is required'),
    description: z.string().min(5, 'Description is required'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
    dueDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
    assignedToId: z.string().optional()
  })
};

export const updateMaintenanceTaskSchema = {
  params: idParamSchema,
  body: z.object({
    status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    assignedToId: z.string().nullable().optional(),
    note: z.string().max(500).optional()
  })
};

export const maintenanceFilterQuerySchema = {
  query: paginationQuerySchema.extend({
    buildingId: z.string().optional(),
    status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional()
  })
};

// Reports
export const createReportSchema = {
  body: z.object({
    title: z.string().min(3, 'Title is required'),
    reportType: z.enum(['CAMPUS_SUMMARY', 'ENERGY_AUDIT', 'WATER_CONSERVATION', 'WASTE_DIVERSION', 'CARBON_ACCOUNTING']),
    startDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
    endDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/))
  })
};

// Settings
export const updateSettingsSchema = {
  body: z.object({
    settings: z.array(
      z.object({
        key: z.string().min(1),
        value: z.string()
      })
    ).min(1, 'At least one setting must be provided')
  })
};

// AI
export const aiChatSchema = {
  body: z.object({
    message: z.string().min(1, 'Message cannot be empty'),
    conversationContext: z.array(z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string()
    })).optional()
  })
};

export const aiRecommendationsSchema = {
  body: z.object({
    buildingId: z.string().optional(),
    domain: z.enum(['ENERGY', 'WATER', 'WASTE', 'ALL']).default('ALL')
  })
};
