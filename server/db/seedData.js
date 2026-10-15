import { run, get, all, exec } from './database.js';

export async function seedDatabase(force = false) {
  // Check if buildings already exist
  const existing = await get('SELECT COUNT(*) as count FROM buildings');
  if (existing && existing.count > 0 && !force) {
    console.log(`[DB Seed] Database already seeded with ${existing.count} buildings.`);
    return;
  }

  console.log('[DB Seed] Seeding clean campus digital twin database...');

  // Clear tables if force reset
  if (force) {
    await exec(`
      DELETE FROM sensor_readings;
      DELETE FROM sensors;
      DELETE FROM waste_bins;
      DELETE FROM alerts;
      DELETE FROM scenarios;
      DELETE FROM zones;
      DELETE FROM buildings;
      DELETE FROM campuses;
      DELETE FROM simulator_state;
    `);
  }

  // 1. Campus
  await run(`
    INSERT OR REPLACE INTO campuses (id, name, timezone, code, total_area_m2)
    VALUES (?, ?, ?, ?, ?)
  `, ['CAMPUS-01', 'EcoPulse University Campus', 'UTC', 'EPGC', 22850]);

  // 2. Buildings
  const buildings = [
    {
      id: 1,
      campus_id: 'CAMPUS-01',
      name: 'Academic Block',
      code: 'BLD-ACAD',
      building_type: 'academic',
      location: 'Zone A - North Quad',
      area_m2: 8500.0,
      floors: 4,
      occupancy_capacity: 1200,
      sustainability_score: 88.0,
      current_kw: 78.5,
      total_kwh: 480.0,
      current_water_lpm: 12.0,
      total_water_liters: 1200.0,
      occupancy_count: 480,
      solar_kw: 35.0,
      status: 'warning',
      status_reasons: JSON.stringify(['Waste bin 91% capacity in Quad']),
      last_updated_at: new Date().toISOString()
    },
    {
      id: 2,
      campus_id: 'CAMPUS-01',
      name: 'Central Library',
      code: 'BLD-LIBR',
      building_type: 'library',
      location: 'Zone B - Central Plaza',
      area_m2: 4200.0,
      floors: 3,
      occupancy_capacity: 600,
      sustainability_score: 94.0,
      current_kw: 32.0,
      total_kwh: 220.0,
      current_water_lpm: 4.5,
      total_water_liters: 450.0,
      occupancy_count: 295,
      solar_kw: 18.0,
      status: 'healthy',
      status_reasons: JSON.stringify(['Operating within optimal energy and water baselines']),
      last_updated_at: new Date().toISOString()
    },
    {
      id: 3,
      campus_id: 'CAMPUS-01',
      name: 'Campus Cafeteria',
      code: 'BLD-CAFE',
      building_type: 'cafeteria',
      location: 'Zone C - South Courtyard',
      area_m2: 2800.0,
      floors: 2,
      occupancy_capacity: 450,
      sustainability_score: 68.0,
      current_kw: 110.0,
      total_kwh: 650.0,
      current_water_lpm: 48.0,
      total_water_liters: 4800.0,
      occupancy_count: 210,
      solar_kw: 12.0,
      status: 'warning',
      status_reasons: JSON.stringify(['High water flow rate detected (suspected valve leak)']),
      last_updated_at: new Date().toISOString()
    },
    {
      id: 4,
      campus_id: 'CAMPUS-01',
      name: 'Science & Tech Laboratory',
      code: 'BLD-LABS',
      building_type: 'laboratory',
      location: 'Zone D - Science Park',
      area_m2: 6400.0,
      floors: 3,
      occupancy_capacity: 350,
      sustainability_score: 54.0,
      current_kw: 225.0,
      total_kwh: 1350.0,
      current_water_lpm: 9.8,
      total_water_liters: 950.0,
      occupancy_count: 88,
      solar_kw: 25.0,
      status: 'critical',
      status_reasons: JSON.stringify(['Cleanroom chiller compressor overload / continuous maximum load']),
      last_updated_at: new Date().toISOString()
    },
    {
      id: 5,
      campus_id: 'CAMPUS-01',
      name: 'Water Tank & Pump House',
      code: 'BLD-UTIL',
      building_type: 'utility',
      location: 'Zone E - Infrastructure Yard',
      area_m2: 950.0,
      floors: 1,
      occupancy_capacity: 20,
      sustainability_score: 71.0,
      current_kw: 14.2,
      total_kwh: 85.0,
      current_water_lpm: 145.0,
      total_water_liters: 18500.0,
      occupancy_count: 2,
      solar_kw: 0.0,
      status: 'warning',
      status_reasons: JSON.stringify(['Sensor calibration drift on primary distribution transducer']),
      last_updated_at: new Date().toISOString()
    }
  ];

  for (const b of buildings) {
    await run(`
      INSERT OR REPLACE INTO buildings (
        id, campus_id, name, code, building_type, location, area_m2, floors,
        occupancy_capacity, active, sustainability_score, current_kw, total_kwh,
        current_water_lpm, total_water_liters, occupancy_count, solar_kw, status, status_reasons, last_updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      b.id, b.campus_id, b.name, b.code, b.building_type, b.location, b.area_m2, b.floors,
      b.occupancy_capacity, 1, b.sustainability_score, b.current_kw, b.total_kwh,
      b.current_water_lpm, b.total_water_liters, b.occupancy_count, b.solar_kw, b.status, b.status_reasons, b.last_updated_at
    ]);
  }

  // 3. Zones
  const zones = [
    { id: 101, building_id: 1, name: 'Ground Floor Atrium', floor: 0, zone_type: 'atrium', area_m2: 2000 },
    { id: 102, building_id: 1, name: 'Lecture Hall North (101-108)', floor: 1, zone_type: 'lecture_hall', area_m2: 3200 },
    { id: 103, building_id: 1, name: 'Faculty Offices 2F', floor: 2, zone_type: 'office', area_m2: 3300 },

    { id: 201, building_id: 2, name: 'Ground Floor Commons', floor: 0, zone_type: 'study_hall', area_m2: 1400 },
    { id: 202, building_id: 2, name: 'Main Reading Room 2F', floor: 1, zone_type: 'study_hall', area_m2: 1500 },
    { id: 203, building_id: 2, name: 'Archive & Special Stacks 3F', floor: 2, zone_type: 'archive', area_m2: 1300 },

    { id: 301, building_id: 3, name: 'Main Dining Hall', floor: 0, zone_type: 'dining', area_m2: 1600 },
    { id: 302, building_id: 3, name: 'Commercial Kitchen', floor: 0, zone_type: 'kitchen', area_m2: 700 },
    { id: 303, building_id: 3, name: 'Cold Storage & Inventory', floor: 1, zone_type: 'storage', area_m2: 500 },

    { id: 401, building_id: 4, name: 'HPC Computing Cluster', floor: 0, zone_type: 'server_room', area_m2: 1800 },
    { id: 402, building_id: 4, name: 'Chemistry Cleanroom Lab', floor: 1, zone_type: 'cleanroom', area_m2: 2400 },
    { id: 403, building_id: 4, name: 'Advanced Robotics Lab', floor: 2, zone_type: 'robotics', area_m2: 2200 },

    { id: 501, building_id: 5, name: 'Primary Distribution Pump Station', floor: 0, zone_type: 'pump_station', area_m2: 450 },
    { id: 502, building_id: 5, name: 'Rainwater Cistern & Reservoir', floor: 0, zone_type: 'reservoir', area_m2: 500 }
  ];

  for (const z of zones) {
    await run(`
      INSERT OR REPLACE INTO zones (id, building_id, name, floor, zone_type, area_m2)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [z.id, z.building_id, z.name, z.floor, z.zone_type, z.area_m2]);
  }

  // 4. Sensors
  const sensors = [
    // Building 1: Academic Block
    { id: 'BLD-ACAD-PWR-01', building_id: 1, zone_id: 101, sensor_type: 'energy', unit: 'kW', min: 20, max: 200, latest: 78.5 },
    { id: 'BLD-ACAD-WTR-01', building_id: 1, zone_id: 101, sensor_type: 'water_flow', unit: 'L/min', min: 2, max: 40, latest: 12.0 },
    { id: 'BLD-ACAD-OCC-01', building_id: 1, zone_id: 102, sensor_type: 'occupancy', unit: 'people', min: 0, max: 1200, latest: 480 },
    { id: 'BLD-ACAD-TMP-01', building_id: 1, zone_id: 102, sensor_type: 'temperature', unit: '°C', min: 18, max: 28, latest: 22.4 },

    // Building 2: Central Library
    { id: 'BLD-LIBR-PWR-01', building_id: 2, zone_id: 201, sensor_type: 'energy', unit: 'kW', min: 10, max: 100, latest: 32.0 },
    { id: 'BLD-LIBR-WTR-01', building_id: 2, zone_id: 201, sensor_type: 'water_flow', unit: 'L/min', min: 1, max: 25, latest: 4.5 },
    { id: 'BLD-LIBR-OCC-01', building_id: 2, zone_id: 202, sensor_type: 'occupancy', unit: 'people', min: 0, max: 600, latest: 295 },
    { id: 'BLD-LIBR-TMP-01', building_id: 2, zone_id: 202, sensor_type: 'temperature', unit: '°C', min: 18, max: 26, latest: 21.8 },

    // Building 3: Cafeteria (Water leak anomaly)
    { id: 'BLD-CAFE-PWR-01', building_id: 3, zone_id: 301, sensor_type: 'energy', unit: 'kW', min: 30, max: 250, latest: 110.0 },
    { id: 'BLD-CAFE-WTR-01', building_id: 3, zone_id: 302, sensor_type: 'water_flow', unit: 'L/min', min: 5, max: 80, latest: 48.0 },
    { id: 'BLD-CAFE-OCC-01', building_id: 3, zone_id: 301, sensor_type: 'occupancy', unit: 'people', min: 0, max: 450, latest: 210 },
    { id: 'BLD-CAFE-TMP-01', building_id: 3, zone_id: 302, sensor_type: 'temperature', unit: '°C', min: 18, max: 32, latest: 24.2 },

    // Building 4: Laboratory (Chiller energy anomaly)
    { id: 'BLD-LABS-PWR-01', building_id: 4, zone_id: 401, sensor_type: 'energy', unit: 'kW', min: 50, max: 300, latest: 225.0 },
    { id: 'BLD-LABS-WTR-01', building_id: 4, zone_id: 402, sensor_type: 'water_flow', unit: 'L/min', min: 2, max: 40, latest: 9.8 },
    { id: 'BLD-LABS-OCC-01', building_id: 4, zone_id: 403, sensor_type: 'occupancy', unit: 'people', min: 0, max: 350, latest: 88 },
    { id: 'BLD-LABS-TMP-01', building_id: 4, zone_id: 401, sensor_type: 'temperature', unit: '°C', min: 15, max: 25, latest: 19.5 },

    // Building 5: Water Tank & Pump House
    { id: 'BLD-UTIL-PWR-01', building_id: 5, zone_id: 501, sensor_type: 'energy', unit: 'kW', min: 5, max: 40, latest: 14.2 },
    { id: 'BLD-UTIL-WTR-01', building_id: 5, zone_id: 501, sensor_type: 'water_flow', unit: 'L/min', min: 10, max: 250, latest: 145.0 },
    { id: 'BLD-UTIL-OCC-01', building_id: 5, zone_id: 501, sensor_type: 'occupancy', unit: 'people', min: 0, max: 20, latest: 2 },
    { id: 'BLD-UTIL-TMP-01', building_id: 5, zone_id: 502, sensor_type: 'temperature', unit: '°C', min: 10, max: 35, latest: 20.0 }
  ];

  const now = new Date();
  for (const s of sensors) {
    await run(`
      INSERT OR REPLACE INTO sensors (
        id, building_id, zone_id, sensor_type, unit, status, source_type,
        min_threshold, max_threshold, latest_reading, last_updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      s.id, s.building_id, s.zone_id, s.sensor_type, s.unit, 'online', 'simulated',
      s.min, s.max, s.latest, now.toISOString()
    ]);
  }

  // 5. Waste Bins (PDF Page 3: "one bin alert")
  const wasteBins = [
    { id: 1, building_id: 1, zone_id: 101, bin_code: 'BIN-ACAD-01', bin_type: 'recyclables', capacity_liters: 150, fill_level: 91.0, status: 'warning' },
    { id: 2, building_id: 1, zone_id: 102, bin_code: 'BIN-ACAD-02', bin_type: 'general', capacity_liters: 120, fill_level: 64.0, status: 'normal' },
    { id: 3, building_id: 2, zone_id: 201, bin_code: 'BIN-LIBR-01', bin_type: 'paper', capacity_liters: 120, fill_level: 42.0, status: 'normal' },
    { id: 4, building_id: 2, zone_id: 202, bin_code: 'BIN-LIBR-02', bin_type: 'general', capacity_liters: 120, fill_level: 38.0, status: 'normal' },
    { id: 5, building_id: 3, zone_id: 301, bin_code: 'BIN-CAFE-01', bin_type: 'organic_compost', capacity_liters: 200, fill_level: 78.0, status: 'normal' },
    { id: 6, building_id: 3, zone_id: 302, bin_code: 'BIN-CAFE-02', bin_type: 'general', capacity_liters: 150, fill_level: 55.0, status: 'normal' },
    { id: 7, building_id: 4, zone_id: 401, bin_code: 'BIN-LABS-01', bin_type: 'electronic', capacity_liters: 100, fill_level: 28.0, status: 'normal' },
    { id: 8, building_id: 4, zone_id: 402, bin_code: 'BIN-LABS-02', bin_type: 'general', capacity_liters: 120, fill_level: 45.0, status: 'normal' }
  ];

  for (const bin of wasteBins) {
    await run(`
      INSERT OR REPLACE INTO waste_bins (
        id, building_id, zone_id, bin_code, bin_type, capacity_liters, fill_level_percent, last_collection_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      bin.id, bin.building_id, bin.zone_id, bin.bin_code, bin.bin_type, bin.capacity_liters,
      bin.fill_level, now.toISOString(), bin.status
    ]);
  }

  // 6. Benchmark Alerts (PDF Page 3: "Include one controlled water anomaly, one energy spike, and one bin alert")
  const alerts = [
    {
      id: 101,
      building_id: 4,
      sensor_id: 'BLD-LABS-PWR-01',
      severity: 'critical',
      category: 'energy',
      title: 'Laboratory Cleanroom Chiller Overload',
      description: 'Chiller compressor running continuously at maximum 225 kW load without setback schedule.',
      ai_recommendation: 'Apply automatic setback cooling curve and inspect thermal expansion valve sensor.',
      status: 'open',
      source: 'anomaly_detection',
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      estimated_waste_rate: '$18.50/hr'
    },
    {
      id: 102,
      building_id: 3,
      sensor_id: 'BLD-CAFE-WTR-01',
      severity: 'high',
      category: 'water_leak',
      title: 'Commercial Dishwasher Inlet Valve Leak',
      description: 'Continuous 48.0 L/min flow recorded during low dining hours indicates high-volume pipe leak.',
      ai_recommendation: 'Dispatch facilities team to isolate cafeteria shutoff valve and replace gasket.',
      status: 'open',
      source: 'flow_threshold_rule',
      created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
      estimated_waste_rate: '140 L/hr wasted'
    },
    {
      id: 103,
      building_id: 1,
      sensor_id: 'BLD-ACAD-PWR-01',
      severity: 'warning',
      category: 'waste',
      title: 'Academic Quad Recyclables Bin Overflow Alert',
      description: 'BIN-ACAD-01 has reached 91% capacity. Waste bin nearing capacity threshold (>85%).',
      ai_recommendation: 'Route smart custodial dispatch to empty quad recyclables bin before lunch rush.',
      status: 'open',
      source: 'bin_ultrasonic_sensor',
      created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
      estimated_waste_rate: 'Bin full risk'
    },
    {
      id: 104,
      building_id: 5,
      sensor_id: 'BLD-UTIL-WTR-01',
      severity: 'medium',
      category: 'sensor',
      title: 'Water Distribution Pressure Sensor Drift',
      description: 'Intermittent pressure variance +/-6% detected across utility distribution loop.',
      ai_recommendation: 'Recalibrate piezo-resistive transducer and check zero-baseline signal.',
      status: 'in_progress',
      source: 'telemetry_diagnostics',
      created_at: new Date(Date.now() - 3600000 * 14).toISOString(),
      estimated_waste_rate: 'Sensor uncertainty'
    }
  ];

  for (const a of alerts) {
    await run(`
      INSERT OR REPLACE INTO alerts (
        id, building_id, sensor_id, severity, category, title, description,
        ai_recommendation, status, source, created_at, estimated_waste_rate
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      a.id, a.building_id, a.sensor_id, a.severity, a.category, a.title,
      a.description, a.ai_recommendation, a.status, a.source, a.created_at, a.estimated_waste_rate
    ]);
  }

  // 7. Historical Readings for each sensor (past 24 hours)
  console.log('[DB Seed] Generating 24h historical telemetry log for all sensors...');
  for (const s of sensors) {
    for (let h = 24; h >= 0; h--) {
      const timestamp = new Date(Date.now() - h * 3600000).toISOString();
      const hourOfDay = new Date(timestamp).getUTCHours();

      // Diurnal activity factor: peak between 9:00 and 17:00
      let activityFactor = 0.3;
      if (hourOfDay >= 8 && hourOfDay <= 18) {
        activityFactor = 0.6 + 0.4 * Math.sin(((hourOfDay - 8) / 10) * Math.PI);
      }

      let val = s.latest;
      if (s.sensor_type === 'energy') {
        const base = s.min + (s.max - s.min) * 0.4 * activityFactor;
        const noise = (Math.sin(h * 1.5) * 0.08) * base;
        val = Math.max(s.min, Math.round((base + noise) * 10) / 10);
      } else if (s.sensor_type === 'water_flow') {
        const base = s.min + (s.max - s.min) * 0.5 * activityFactor;
        val = Math.max(s.min, Math.round(base * 10) / 10);
      } else if (s.sensor_type === 'occupancy') {
        val = Math.round(s.max * activityFactor * 0.85);
      } else if (s.sensor_type === 'temperature') {
        val = Math.round((21 + 2.5 * Math.sin((hourOfDay / 24) * 2 * Math.PI)) * 10) / 10;
      }

      await run(`
        INSERT INTO sensor_readings (
          sensor_id, building_id, zone_id, metric, value, unit, measured_at, source, quality
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [s.id, s.building_id, s.zone_id, s.sensor_type, val, s.unit, timestamp, 'simulated', 'good']);
    }
  }

  // 8. Simulator Initial State
  await run(`
    INSERT OR REPLACE INTO simulator_state (id, is_running, interval_seconds, tick_count, last_tick_at, error_message)
    VALUES (1, 0, 10, 0, ?, NULL)
  `, [now.toISOString()]);

  console.log('[DB Seed] Database seeding complete! 5 buildings, 14 zones, 20 sensors, 8 waste bins, 4 alerts, 500+ readings.');
}
