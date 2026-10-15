import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for AI-Powered Sustainable Campus...');

  // 1. Clean existing records in reverse dependency order
  await prisma.maintenanceHistory.deleteMany();
  await prisma.maintenanceTask.deleteMany();
  await prisma.alertHistory.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.wasteDetectionEvent.deleteMany();
  await prisma.wasteRecord.deleteMany();
  await prisma.waterReading.deleteMany();
  await prisma.energyReading.deleteMany();
  await prisma.sensor.deleteMany();
  await prisma.zone.deleteMany();
  await prisma.carbonEmission.deleteMany();
  await prisma.simulationScenario.deleteMany();
  await prisma.report.deleteMany();
  await prisma.sustainabilityScore.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.building.deleteMany();
  await prisma.user.deleteMany();

  // 2. Users & Roles
  const passwordHash = await bcrypt.hash('CampusPass2026!', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'Dr. Jane Vance (Admin)',
      email: 'admin@campus.edu',
      passwordHash,
      role: 'ADMIN'
    }
  });

  const manager = await prisma.user.create({
    data: {
      name: 'Marcus Brody (Facility Manager)',
      email: 'manager@campus.edu',
      passwordHash,
      role: 'FACILITY_MANAGER'
    }
  });

  const viewer = await prisma.user.create({
    data: {
      name: 'Elena Rostova (Student Officer)',
      email: 'viewer@campus.edu',
      passwordHash,
      role: 'VIEWER'
    }
  });

  console.log('✅ Seeded users: Admin, Facility Manager, Viewer');

  // 3. Buildings (Campus Digital Twin Entities)
  const buildingsData = [
    {
      name: 'Engineering & Technology Hall',
      code: 'ENG-01',
      type: 'ACADEMIC',
      totalAreaSqFt: 75000,
      floors: 4,
      yearBuilt: 2018,
      occupancyCapacity: 1200,
      status: 'ACTIVE',
      coordinatesJson: JSON.stringify({ x: 25.5, y: 0.0, z: 12.0, length: 60, width: 40, height: 20 })
    },
    {
      name: 'Science & Innovation Complex',
      code: 'SCI-01',
      type: 'LAB',
      totalAreaSqFt: 62000,
      floors: 3,
      yearBuilt: 2021,
      occupancyCapacity: 850,
      status: 'ACTIVE',
      coordinatesJson: JSON.stringify({ x: -40.0, y: 0.0, z: 35.0, length: 50, width: 45, height: 16 })
    },
    {
      name: 'Campus Central Library',
      code: 'LIB-01',
      type: 'ACADEMIC',
      totalAreaSqFt: 48000,
      floors: 3,
      yearBuilt: 2012,
      occupancyCapacity: 950,
      status: 'ACTIVE',
      coordinatesJson: JSON.stringify({ x: 0.0, y: 0.0, z: -20.0, length: 45, width: 35, height: 15 })
    },
    {
      name: 'Student Activity & Dining Center',
      code: 'STU-01',
      type: 'DINING',
      totalAreaSqFt: 38000,
      floors: 2,
      yearBuilt: 2016,
      occupancyCapacity: 650,
      status: 'ACTIVE',
      coordinatesJson: JSON.stringify({ x: 45.0, y: 0.0, z: -50.0, length: 40, width: 30, height: 12 })
    },
    {
      name: 'Green Valley Eco-Residence',
      code: 'RES-01',
      type: 'RESIDENTIAL',
      totalAreaSqFt: 92000,
      floors: 5,
      yearBuilt: 2022,
      occupancyCapacity: 720,
      status: 'ACTIVE',
      coordinatesJson: JSON.stringify({ x: -65.0, y: 0.0, z: -30.0, length: 70, width: 45, height: 25 })
    }
  ];

  const buildings = [];
  for (const b of buildingsData) {
    const created = await prisma.building.create({ data: b });
    buildings.push(created);
  }
  console.log(`✅ Seeded ${buildings.length} campus buildings`);

  // 4. Zones for Buildings
  const zones = [];
  const zoneConfigs = [
    { bIdx: 0, name: 'Robotics & AI Research Wing', floor: 1, zoneType: 'LAB' },
    { bIdx: 0, name: 'Main Lecture Auditorium', floor: 1, zoneType: 'CLASSROOM' },
    { bIdx: 0, name: 'Computer Science Labs', floor: 3, zoneType: 'LAB' },
    { bIdx: 1, name: 'Biochemistry Research Suite', floor: 2, zoneType: 'LAB' },
    { bIdx: 1, name: 'Materials Science Foundry', floor: 1, zoneType: 'LAB' },
    { bIdx: 2, name: 'Main Reading Floor', floor: 1, zoneType: 'REST_AREA' },
    { bIdx: 2, name: 'Digital Archives & Study Pods', floor: 2, zoneType: 'OFFICE' },
    { bIdx: 3, name: 'Food Court & Dining Commons', floor: 1, zoneType: 'CAFETERIA' },
    { bIdx: 3, name: 'Student Union Lounge', floor: 2, zoneType: 'REST_AREA' },
    { bIdx: 4, name: 'Residential Tower East', floor: 3, zoneType: 'OFFICE' }
  ];

  for (const zc of zoneConfigs) {
    const zone = await prisma.zone.create({
      data: {
        buildingId: buildings[zc.bIdx].id,
        name: zc.name,
        floor: zc.floor,
        zoneType: zc.zoneType,
        status: 'ACTIVE'
      }
    });
    zones.push(zone);
  }
  console.log(`✅ Seeded ${zones.length} zones`);

  // 5. Sensors
  const sensors = [];
  for (let i = 0; i < buildings.length; i++) {
    const b = buildings[i];
    const energySensor = await prisma.sensor.create({
      data: {
        buildingId: b.id,
        code: `EM-${b.code}`,
        name: `${b.name} Main Grid Meter`,
        sensorType: 'ENERGY_METER',
        unit: 'kWh',
        status: 'ONLINE',
        lastPingAt: new Date()
      }
    });
    const waterSensor = await prisma.sensor.create({
      data: {
        buildingId: b.id,
        code: `WM-${b.code}`,
        name: `${b.name} Main Water Flowmeter`,
        sensorType: 'WATER_METER',
        unit: 'L',
        status: 'ONLINE',
        lastPingAt: new Date()
      }
    });
    sensors.push(energySensor, waterSensor);
  }

  // Waste Sensors in select zones
  for (let z of zones.slice(0, 4)) {
    const wasteSensor = await prisma.sensor.create({
      data: {
        buildingId: z.buildingId,
        zoneId: z.id,
        code: `WS-${z.name.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`,
        name: `${z.name} Smart Waste Bin`,
        sensorType: 'WASTE_SENSOR',
        unit: '%',
        status: 'ONLINE',
        lastPingAt: new Date()
      }
    });
    sensors.push(wasteSensor);
  }
  console.log(`✅ Seeded ${sensors.length} sensors`);

  // 6. Time-series Seed Readings (Past 7 Days)
  const now = new Date();
  const days = 7;

  for (let d = days; d >= 0; d--) {
    const dayDate = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

    for (const b of buildings) {
      // Energy: Base consumption depends on building type
      const baseKwh = b.type === 'LAB' ? 450 : b.type === 'ACADEMIC' ? 320 : b.type === 'DINING' ? 260 : 290;
      const variation = Math.sin(d) * 40 + (Math.random() * 30 - 15);
      const totalKwh = Number((baseKwh + variation).toFixed(2));
      const peakKw = Number((totalKwh / 14 + Math.random() * 5).toFixed(2));

      await prisma.energyReading.create({
        data: {
          buildingId: b.id,
          timestamp: dayDate,
          consumptionKwh: totalKwh,
          peakDemandKw: peakKw,
          source: 'GRID',
          isDemoData: true,
          notes: 'Standard seeded daily automated meter interval'
        }
      });

      // Rooftop solar reading for Science Complex
      if (b.code === 'SCI-01') {
        const solarGen = Number((85 + Math.random() * 20).toFixed(2));
        await prisma.energyReading.create({
          data: {
            buildingId: b.id,
            timestamp: dayDate,
            consumptionKwh: solarGen,
            peakDemandKw: 15.2,
            source: 'SOLAR',
            isDemoData: true,
            notes: 'Solar PV rooftop generation'
          }
        });
      }

      // Water readings: Litres and flow rate
      const baseLitres = b.type === 'DINING' ? 5200 : b.type === 'RESIDENTIAL' ? 8400 : 3100;
      const waterVar = (Math.random() * 600 - 300);
      const volume = Number((baseLitres + waterVar).toFixed(1));
      const avgFlow = Number((volume / (12 * 60)).toFixed(2)); // L/min during active hours

      await prisma.waterReading.create({
        data: {
          buildingId: b.id,
          timestamp: dayDate,
          volumeLitres: volume,
          flowRateLpm: avgFlow,
          category: 'POTABLE',
          isDemoData: true,
          notes: 'Municipal potable line'
        }
      });

      // Recycled greywater for Academic & Residential
      if (b.type === 'ACADEMIC' || b.type === 'RESIDENTIAL') {
        await prisma.waterReading.create({
          data: {
            buildingId: b.id,
            timestamp: dayDate,
            volumeLitres: Number((volume * 0.28).toFixed(1)),
            flowRateLpm: Number((avgFlow * 0.28).toFixed(2)),
            category: 'RECYCLED',
            isDemoData: true,
            notes: 'Greywater cooling and toilet flushing'
          }
        });
      }

      // Waste records: General, Recycling, Compost
      const generalFullness = Math.min(100, Math.floor(45 + Math.random() * 45));
      const generalWeight = Number((generalFullness * 0.42).toFixed(2));
      await prisma.wasteRecord.create({
        data: {
          buildingId: b.id,
          timestamp: dayDate,
          binType: 'GENERAL',
          fullnessPercent: generalFullness,
          weightKg: generalWeight,
          isDemoData: true,
          notes: 'Standard central hallway general waste'
        }
      });

      const recyclingFullness = Math.min(100, Math.floor(35 + Math.random() * 50));
      const recyclingWeight = Number((recyclingFullness * 0.25).toFixed(2));
      await prisma.wasteRecord.create({
        data: {
          buildingId: b.id,
          timestamp: dayDate,
          binType: 'RECYCLING',
          fullnessPercent: recyclingFullness,
          weightKg: recyclingWeight,
          isDemoData: true,
          notes: 'Segregated paper and plastic recycling station'
        }
      });

      if (b.type === 'DINING') {
        const compostFullness = Math.min(100, Math.floor(60 + Math.random() * 35));
        const compostWeight = Number((compostFullness * 0.65).toFixed(2));
        await prisma.wasteRecord.create({
          data: {
            buildingId: b.id,
            timestamp: dayDate,
            binType: 'COMPOST',
            fullnessPercent: compostFullness,
            weightKg: compostWeight,
            isDemoData: true,
            notes: 'Kitchen organic and food scraps'
          }
        });
      }
    }
  }
  console.log('✅ Seeded 7 days of energy, water, and waste readings (explicitly marked as demo data)');

  // 7. Waste Detection Events (Simulated AI Model Estimates)
  const detectionEvents = [
    {
      buildingId: buildings[0].id,
      wasteCategory: 'PLASTIC',
      confidenceScore: 0.94,
      isModelEstimate: true,
      estimatedWeightKg: 0.18,
      boundingBoxJson: JSON.stringify({ xmin: 120, ymin: 80, xmax: 340, ymax: 420 }),
      imageUrl: '/uploads/sample-bottle-detection.jpg',
      detectedBy: 'AI_CV',
      rawMetadata: JSON.stringify({ model: 'yolov8-waste-v2', inferenceMs: 42, classesDetected: ['pet_bottle'] })
    },
    {
      buildingId: buildings[1].id,
      wasteCategory: 'PAPER',
      confidenceScore: 0.88,
      isModelEstimate: true,
      estimatedWeightKg: 0.35,
      boundingBoxJson: JSON.stringify({ xmin: 50, ymin: 60, xmax: 280, ymax: 310 }),
      imageUrl: '/uploads/sample-cardboard-detection.jpg',
      detectedBy: 'AI_CV',
      rawMetadata: JSON.stringify({ model: 'yolov8-waste-v2', inferenceMs: 38, classesDetected: ['cardboard'] })
    },
    {
      buildingId: buildings[3].id,
      wasteCategory: 'ORGANIC',
      confidenceScore: 0.91,
      isModelEstimate: true,
      estimatedWeightKg: 0.72,
      boundingBoxJson: JSON.stringify({ xmin: 90, ymin: 110, xmax: 400, ymax: 450 }),
      imageUrl: '/uploads/sample-food-detection.jpg',
      detectedBy: 'AI_CV',
      rawMetadata: JSON.stringify({ model: 'yolov8-waste-v2', inferenceMs: 46, classesDetected: ['food_waste'] })
    }
  ];

  for (const de of detectionEvents) {
    await prisma.wasteDetectionEvent.create({ data: de });
  }
  console.log(`✅ Seeded ${detectionEvents.length} AI waste detection events`);

  // 8. Alerts & History
  const alert1 = await prisma.alert.create({
    data: {
      buildingId: buildings[3].id, // Dining Center
      title: 'Unusual Nighttime Water Flow Rate Detected',
      description: 'Continuous water flow of 42.5 L/min detected between 02:00 AM and 04:30 AM in Dining Center. Indicates potential pipe failure or stuck flush valve.',
      category: 'WATER',
      severity: 'HIGH',
      status: 'OPEN',
      triggerSource: 'UNUSUAL_WATER_FLOW',
      triggerValue: 42.5,
      thresholdValue: 15.0,
      unit: 'L/min',
      isDemoData: true,
      history: {
        create: {
          previousStatus: 'NEW',
          newStatus: 'OPEN',
          changedBy: 'SustainabilityGuardianEngine',
          note: 'Rule evaluation triggered automatically on abnormal off-hours flow rate.'
        }
      }
    }
  });

  const alert2 = await prisma.alert.create({
    data: {
      buildingId: buildings[1].id, // Science Complex
      title: 'Peak Energy Demand Exceeded Threshold',
      description: 'HVAC and autoclave systems synchronized peak demand reached 48.2 kW exceeding safe target limit of 40.0 kW.',
      category: 'ENERGY',
      severity: 'MEDIUM',
      status: 'ACKNOWLEDGED',
      triggerSource: 'ENERGY_THRESHOLD',
      triggerValue: 48.2,
      thresholdValue: 40.0,
      unit: 'kW',
      isDemoData: true,
      acknowledgedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      acknowledgedBy: 'Marcus Brody',
      history: {
        createMany: {
          data: [
            {
              previousStatus: 'NEW',
              newStatus: 'OPEN',
              changedBy: 'SustainabilityGuardianEngine',
              note: 'Threshold exceeded.'
            },
            {
              previousStatus: 'OPEN',
              newStatus: 'ACKNOWLEDGED',
              changedBy: 'Marcus Brody',
              note: 'Investigating laboratory autoclave schedule with lab supervisor.'
            }
          ]
        }
      }
    }
  });

  const alert3 = await prisma.alert.create({
    data: {
      buildingId: buildings[0].id, // Engineering Hall
      title: 'Waste Bin Capacity Near Overflow',
      description: 'Main atrium smart recycling station reached 96% volume capacity. Scheduled pickup required.',
      category: 'WASTE',
      severity: 'LOW',
      status: 'RESOLVED',
      triggerSource: 'BIN_FULLNESS',
      triggerValue: 96.0,
      thresholdValue: 85.0,
      unit: '%',
      isDemoData: true,
      resolvedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      resolvedBy: 'Marcus Brody',
      history: {
        create: {
          previousStatus: 'OPEN',
          newStatus: 'RESOLVED',
          changedBy: 'Marcus Brody',
          note: 'Custodial team cleared and replaced bin liner.'
        }
      }
    }
  });

  console.log('✅ Seeded Alerts and Alert History');

  // 9. Maintenance Tasks & History
  await prisma.maintenanceTask.create({
    data: {
      buildingId: buildings[3].id,
      alertId: alert1.id,
      assignedToId: manager.id,
      title: 'Inspect Dining Center Restroom Valves & Pipe Joints',
      description: 'Verify flush valves on 1st floor restrooms and grease-trap rinse line for continuous water leaks.',
      priority: 'URGENT',
      status: 'IN_PROGRESS',
      dueDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      history: {
        create: {
          previousStatus: 'PENDING',
          newStatus: 'IN_PROGRESS',
          changedBy: 'Marcus Brody',
          note: 'Dispatched plumbing specialist on-site.'
        }
      }
    }
  });

  await prisma.maintenanceTask.create({
    data: {
      buildingId: buildings[1].id,
      alertId: alert2.id,
      assignedToId: manager.id,
      title: 'Reschedule Autoclave Cycles to Stagger Peak Load',
      description: 'Coordinate with biology lab staff to avoid concurrent 2 PM run times with main HVAC chiller cycles.',
      priority: 'HIGH',
      status: 'PENDING',
      dueDate: new Date(now.getTime() + 48 * 60 * 60 * 1000)
    }
  });

  console.log('✅ Seeded Maintenance Tasks and Status History');

  // 10. Historical Sustainability Scores
  for (let i = 6; i >= 0; i--) {
    const scoreDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const energyScore = Number((78 + (i % 3) * 3 - Math.random() * 4).toFixed(1));
    const waterScore = Number((82 - (i % 2) * 5 + Math.random() * 3).toFixed(1));
    const wasteScore = Number((75 + (i * 2) - Math.random() * 3).toFixed(1));
    const carbonScore = Number((80 + Math.random() * 4).toFixed(1));

    // Weights: Energy 35%, Water 25%, Waste 20%, Carbon 20%
    const totalScore = Number(
      (energyScore * 0.35 + waterScore * 0.25 + wasteScore * 0.20 + carbonScore * 0.20).toFixed(1)
    );

    await prisma.sustainabilityScore.create({
      data: {
        calculationPeriod: 'DAILY',
        periodStart: new Date(scoreDate.setHours(0, 0, 0, 0)),
        periodEnd: new Date(scoreDate.setHours(23, 59, 59, 999)),
        totalScore,
        energyScore,
        waterScore,
        wasteScore,
        carbonScore,
        componentWeightsJson: JSON.stringify({ energy: 0.35, water: 0.25, waste: 0.20, carbon: 0.20 }),
        dataFreshnessHours: 1.2,
        missingDataPenalty: 0.0,
        detailsJson: JSON.stringify({
          benchmarkComparison: '+4.2% vs prior month',
          highestPerforming: 'Campus Central Library',
          highestConsumer: 'Engineering & Technology Hall'
        })
      }
    });
  }
  console.log('✅ Seeded 7 days of Sustainability Scores');

  // 11. Carbon Emissions Records
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const scope1 = Number((120 + Math.random() * 20).toFixed(1));
    const scope2 = Number((850 + Math.random() * 60).toFixed(1)); // purchased electricity
    const scope3 = Number((75 + Math.random() * 15).toFixed(1)); // waste + water distribution
    const total = Number((scope1 + scope2 + scope3).toFixed(1));

    await prisma.carbonEmission.create({
      data: {
        periodStart: new Date(date.setHours(0, 0, 0, 0)),
        periodEnd: new Date(date.setHours(23, 59, 59, 999)),
        scope1KgCo2e: scope1,
        scope2KgCo2e: scope2,
        scope3KgCo2e: scope3,
        totalKgCo2e: total,
        gridEmissionFactor: 0.82,
        waterEmissionFactor: 0.0003,
        wasteEmissionFactor: 0.45,
        isEstimate: true,
        calculationAssumptionsJson: JSON.stringify({
          sourceGrid: 'Regional Electric Interconnection Grid 2025 Standard',
          gridFactorUnit: 'kg CO2e / kWh',
          waterPumpingFactorUnit: 'kg CO2e / Litre',
          landfillFactorUnit: 'kg CO2e / kg waste'
        })
      }
    });
  }
  console.log('✅ Seeded Carbon Emissions Estimates');

  // 12. System Settings
  const settings = [
    { key: 'CAMPUS_NAME', value: 'GreenTech University Demonstration Campus', dataType: 'STRING', description: 'Institutional title displayed on dashboard', isPublic: true },
    { key: 'ENERGY_ANOMALY_PERCENT_SPIKE', value: '25.0', dataType: 'FLOAT', description: 'Percentage above rolling 7-day average to trigger energy alert', isPublic: false },
    { key: 'WATER_FLOW_LEAK_THRESHOLD_LPM', value: '30.0', dataType: 'FLOAT', description: 'Nighttime sustained flow rate threshold in L/min', isPublic: false },
    { key: 'WASTE_BIN_OVERFLOW_PERCENT', value: '85.0', dataType: 'FLOAT', description: 'Bin fullness percentage that triggers custodial task', isPublic: false },
    { key: 'GRID_EMISSION_FACTOR', value: '0.82', dataType: 'FLOAT', description: 'kg CO2e emissions per kWh consumed', isPublic: true },
    { key: 'WATER_EMISSION_FACTOR', value: '0.0003', dataType: 'FLOAT', description: 'kg CO2e emissions per litre of municipal water treated and pumped', isPublic: true },
    { key: 'DEFAULT_ENERGY_TARIFF_KWH', value: '0.14', dataType: 'FLOAT', description: 'Tariff cost in USD ($) per kWh', isPublic: true }
  ];

  for (const s of settings) {
    await prisma.systemSetting.create({ data: s });
  }
  console.log(`✅ Seeded ${settings.length} system settings`);

  console.log('🚀 Campus database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
