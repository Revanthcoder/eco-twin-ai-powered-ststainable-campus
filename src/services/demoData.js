/**
 * EcoPulse AI — Demo & Baseline Telemetry Data
 * Matches the 5 fictional campus locations from ecotwin-backend SQLite database.
 * Every piece of synthetic data is explicitly labeled with data_source: 'synthetic_demo'.
 */

export const DEMO_BUILDINGS = [
  {
    id: 1,
    name: "Academic Block",
    type: "academic",
    description: "Multi-floor lecture halls, faculty offices, and seminar rooms.",
    map_position: "Zone A - North Quad",
    status: "optimal", // 'optimal' | 'warning' | 'critical'
    sustainabilityScore: 88,
    energyUsageKWh: 480.0,
    waterUsageL: 1200.0,
    solarGenerationKWh: 165.0,
    occupancyRate: 78,
    activeIssuesCount: 1,
    lastUpdated: "2 mins ago"
  },
  {
    id: 2,
    name: "Library",
    type: "library",
    description: "Central campus library, digital research commons, and silent study zones.",
    map_position: "Zone B - Central Plaza",
    status: "optimal",
    sustainabilityScore: 94,
    energyUsageKWh: 220.0,
    waterUsageL: 450.0,
    solarGenerationKWh: 80.0,
    occupancyRate: 62,
    activeIssuesCount: 0,
    lastUpdated: "Just now"
  },
  {
    id: 3,
    name: "Cafeteria",
    type: "cafeteria",
    description: "Student dining hall, commercial kitchen, and food preparation facilities.",
    map_position: "Zone C - South Courtyard",
    status: "warning",
    sustainabilityScore: 68,
    energyUsageKWh: 650.0,
    waterUsageL: 4800.0,
    solarGenerationKWh: 45.0,
    occupancyRate: 85,
    activeIssuesCount: 1,
    lastUpdated: "4 mins ago"
  },
  {
    id: 4,
    name: "Laboratory",
    type: "laboratory",
    description: "Chemistry and computer labs with high-power computing clusters and ventilation.",
    map_position: "Zone D - Science Park",
    status: "critical",
    sustainabilityScore: 54,
    energyUsageKWh: 1350.0,
    waterUsageL: 950.0,
    solarGenerationKWh: 110.0,
    occupancyRate: 44,
    activeIssuesCount: 1,
    lastUpdated: "1 min ago"
  },
  {
    id: 5,
    name: "Water Tank",
    type: "utility",
    description: "Primary campus water distribution reservoir and pump house.",
    map_position: "Zone E - Infrastructure Yard",
    status: "warning",
    sustainabilityScore: 71,
    energyUsageKWh: 85.0,
    waterUsageL: 18500.0,
    solarGenerationKWh: 0.0,
    occupancyRate: 0,
    activeIssuesCount: 1,
    lastUpdated: "5 mins ago"
  }
];

export const DEMO_CAMPUS_METRICS = {
  sustainabilityScore: 82,
  scoreTarget: 90,
  scoreDelta: "+4.2% vs last month",
  subScores: {
    energy: 84,
    water: 72,
    waste: 86,
    carbonOffset: 79
  },
  electricity: {
    totalKWh: 2785.0,
    deltaPercent: -6.4, // negative is good (reduced consumption)
    peakDemandKW: 420.5,
    solarOffsetPercent: 24.8,
    unit: "kWh"
  },
  water: {
    totalLiters: 25900.0,
    deltaPercent: +12.3, // positive is elevated (leak in cafeteria)
    leakEstimatedLitersPerHr: 140.0,
    rainwaterReserveLiters: 45000.0,
    unit: "L"
  },
  waste: {
    totalKg: 420.0,
    divertedKg: 345.0,
    compostedKg: 190.0,
    landfillKg: 75.0,
    unit: "kg"
  },
  recyclingRate: {
    percentage: 82.1,
    target: 85.0,
    deltaPercent: +3.5
  },
  activeAlerts: {
    total: 4,
    critical: 1,
    high: 1,
    medium: 1,
    low: 1
  }
};

export const DEMO_ISSUES = [
  {
    id: 101,
    building_id: 4,
    building_name: "Laboratory",
    category: "hvac",
    description: "Cleanroom chiller compressor running continuously at maximum load without setback.",
    severity: "critical",
    status: "open",
    source: "seed_data",
    created_at: "2026-10-14T09:15:00Z",
    estimatedWasteCostPerHour: "$18.50/hr",
    aiRecommendation: "Apply automatic scheduling setback and inspect temperature differential thermostat."
  },
  {
    id: 102,
    building_id: 3,
    building_name: "Cafeteria",
    category: "water_leak",
    description: "Commercial dishwasher inlet pipe valve dripping continuously under kitchen sink.",
    severity: "high",
    status: "open",
    source: "vision_ai",
    created_at: "2026-10-14T15:30:00Z",
    estimatedWasteCostPerHour: "140 Liters/hr wasted",
    aiRecommendation: "Dispatch plumbing technician to replace silicone valve seat seal."
  },
  {
    id: 103,
    building_id: 5,
    building_name: "Water Tank",
    category: "equipment",
    description: "Mechanical float valve level sensor exhibits intermittent calibration drift.",
    severity: "medium",
    status: "in_progress",
    source: "seed_data",
    created_at: "2026-10-13T11:00:00Z",
    estimatedWasteCostPerHour: "Sensor jitter +/- 6%",
    aiRecommendation: "Recalibrate pressure transducer and verify overflow safety latch."
  },
  {
    id: 104,
    building_id: 1,
    building_name: "Academic Block",
    category: "lighting",
    description: "Hallway 3A automated motion sensor failed in always-on position.",
    severity: "low",
    status: "open",
    source: "sensor_alert",
    created_at: "2026-10-12T18:40:00Z",
    estimatedWasteCostPerHour: "0.8 kWh/day wasted",
    aiRecommendation: "Power-cycle PIR relay and replace PIR sensor cap."
  }
];

export const DEMO_CONSUMPTION_HOURLY = [
  { time: "00:00", energy: 110, water: 650, solar: 0 },
  { time: "02:00", energy: 95, water: 400, solar: 0 },
  { time: "04:00", energy: 90, water: 350, solar: 0 },
  { time: "06:00", energy: 160, water: 1200, solar: 20 },
  { time: "08:00", energy: 380, water: 3400, solar: 95 },
  { time: "10:00", energy: 520, water: 4100, solar: 220 },
  { time: "12:00", energy: 580, water: 4900, solar: 280 },
  { time: "14:00", energy: 540, water: 3800, solar: 240 },
  { time: "16:00", energy: 460, water: 2900, solar: 150 },
  { time: "18:00", energy: 320, water: 2400, solar: 35 },
  { time: "20:00", energy: 240, water: 1600, solar: 0 },
  { time: "22:00", energy: 150, water: 900, solar: 0 }
];
