import express from 'express';
import { all, get, run } from '../db/database.js';
import simulator from '../services/simulator.js';
import { calculateCarbonEmissions, calculateEnergyIntensity, calculateWaterIntensity, calculateRecyclingRate, calculateCampusCompositeScore } from '../services/calculations.js';
import { computeBuildingStatus, evaluateSensorRules } from '../services/alertEngine.js';
import { runScenarioSimulation } from '../services/scenarioEngine.js';

const router = express.Router();

/**
 * GET /api/twin/overview
 * Overall campus digital-twin metrics and aggregated KPIs
 */
router.get('/overview', async (req, res) => {
  try {
    const campus = await get('SELECT * FROM campuses LIMIT 1') || { name: 'EcoPulse Campus', total_area_m2: 22850 };
    const buildings = await all('SELECT * FROM buildings WHERE active = 1');
    const alerts = await all('SELECT severity, status FROM alerts WHERE status = "open"');
    const simStatus = await simulator.getStatus();

    let totalKW = 0;
    let totalKWh = 0;
    let totalWaterLPM = 0;
    let totalWaterLiters = 0;
    let totalOccupancy = 0;
    let totalCapacity = 0;
    let totalSolarKW = 0;

    for (const b of buildings) {
      totalKW += b.current_kw || 0;
      totalKWh += b.total_kwh || 0;
      totalWaterLPM += b.current_water_lpm || 0;
      totalWaterLiters += b.total_water_liters || 0;
      totalOccupancy += b.occupancy_count || 0;
      totalCapacity += b.occupancy_capacity || 0;
      totalSolarKW += b.solar_kw || 0;
    }

    const totalCO2Kg = calculateCarbonEmissions(totalKWh);
    const energyIntensity = calculateEnergyIntensity(totalKWh, campus.total_area_m2);
    const waterIntensity = calculateWaterIntensity(totalWaterLiters, totalOccupancy);

    const alertCounts = {
      total: alerts.length,
      critical: alerts.filter(a => a.severity === 'critical').length,
      high: alerts.filter(a => a.severity === 'high').length,
      warning: alerts.filter(a => a.severity === 'warning').length,
      medium: alerts.filter(a => a.severity === 'medium').length,
      low: alerts.filter(a => a.severity === 'low').length
    };

    const compositeScore = calculateCampusCompositeScore({
      energyScore: 84,
      waterScore: 72,
      wasteScore: 86,
      solarScore: 79
    });

    res.json({
      success: true,
      data: {
        campus: {
          id: campus.id || 'CAMPUS-01',
          name: campus.name,
          total_area_m2: campus.total_area_m2,
          buildings_count: buildings.length
        },
        energy: {
          current_kw: Math.round(totalKW * 10) / 10,
          total_kwh: Math.round(totalKWh * 10) / 10,
          solar_kw: Math.round(totalSolarKW * 10) / 10,
          solar_offset_percent: totalKW > 0 ? Math.round((totalSolarKW / totalKW) * 100 * 10) / 10 : 0,
          carbon_emissions_kg_co2e: totalCO2Kg,
          energy_intensity_kwh_per_m2: energyIntensity,
          unit_power: 'kW',
          unit_energy: 'kWh'
        },
        water: {
          current_flow_lpm: Math.round(totalWaterLPM * 10) / 10,
          total_liters: Math.round(totalWaterLiters * 10) / 10,
          water_intensity_l_per_person: waterIntensity,
          rainwater_reserve_liters: 45000,
          unit_flow: 'L/min',
          unit_volume: 'L'
        },
        waste: {
          total_kg: 420.0,
          diverted_kg: 345.0,
          recycling_rate_percent: 82.1,
          bins_tracked: 8
        },
        occupancy: {
          current_count: totalOccupancy,
          total_capacity: totalCapacity,
          occupancy_rate_percent: totalCapacity > 0 ? Math.round((totalOccupancy / totalCapacity) * 100) : 0
        },
        sustainability_score: compositeScore,
        score_target: 90,
        alerts: alertCounts,
        simulator: simStatus,
        last_updated: new Date().toISOString(),
        data_source: simStatus.isRunning ? 'Simulator (Live Generated Telemetry)' : 'Database Persistent Cache'
      }
    });
  } catch (err) {
    console.error('Error in /api/twin/overview:', err);
    res.status(500).json({ success: false, error: 'Internal server error retrieving campus overview' });
  }
});

/**
 * GET /api/twin/buildings
 * List all campus buildings with detailed KPIs and health status
 */
router.get('/buildings', async (req, res) => {
  try {
    const buildings = await all('SELECT * FROM buildings WHERE active = 1 ORDER BY id ASC');

    const formatted = buildings.map(b => {
      let reasons = [];
      try {
        reasons = b.status_reasons ? JSON.parse(b.status_reasons) : [];
      } catch {
        reasons = [b.status_reasons || 'Operational'];
      }

      return {
        id: b.id,
        campus_id: b.campus_id,
        name: b.name,
        code: b.code,
        building_type: b.building_type,
        location: b.location,
        area_m2: b.area_m2,
        floors: b.floors,
        occupancy_capacity: b.occupancy_capacity,
        occupancy_count: b.occupancy_count,
        occupancy_rate: b.occupancy_capacity > 0 ? Math.round((b.occupancy_count / b.occupancy_capacity) * 100) : 0,
        sustainabilityScore: b.sustainability_score,
        current_kw: b.current_kw,
        total_kwh: b.total_kwh,
        current_water_lpm: b.current_water_lpm,
        total_water_liters: b.total_water_liters,
        carbon_emissions_kg_co2e: calculateCarbonEmissions(b.total_kwh),
        solar_generation_kw: b.solar_kw,
        status: b.status,
        status_reasons: reasons,
        last_updated: b.last_updated_at || new Date().toISOString()
      };
    });

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (err) {
    console.error('Error in /api/twin/buildings:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch campus buildings' });
  }
});

/**
 * GET /api/twin/buildings/:id
 * Single building deep inspection details
 */
router.get('/buildings/:id', async (req, res) => {
  try {
    const bId = Number(req.params.id);
    const building = await get('SELECT * FROM buildings WHERE id = ?', [bId]);

    if (!building) {
      return res.status(404).json({ success: false, error: `Building with ID ${bId} not found` });
    }

    const zones = await all('SELECT * FROM zones WHERE building_id = ? ORDER BY floor ASC, id ASC', [bId]);
    const sensors = await all('SELECT * FROM sensors WHERE building_id = ? ORDER BY id ASC', [bId]);
    const wasteBins = await all('SELECT * FROM waste_bins WHERE building_id = ? ORDER BY id ASC', [bId]);
    const alerts = await all('SELECT * FROM alerts WHERE building_id = ? ORDER BY id DESC LIMIT 10', [bId]);

    let reasons = [];
    try {
      reasons = building.status_reasons ? JSON.parse(building.status_reasons) : [];
    } catch {
      reasons = [building.status_reasons || 'Operational'];
    }

    res.json({
      success: true,
      data: {
        ...building,
        status_reasons: reasons,
        carbon_emissions_kg_co2e: calculateCarbonEmissions(building.total_kwh),
        energy_intensity_kwh_per_m2: calculateEnergyIntensity(building.total_kwh, building.area_m2),
        water_intensity_l_per_person: calculateWaterIntensity(building.total_water_liters, building.occupancy_count),
        zones,
        sensors,
        waste_bins: wasteBins,
        alerts
      }
    });
  } catch (err) {
    console.error(`Error in /api/twin/buildings/${req.params.id}:`, err);
    res.status(500).json({ success: false, error: 'Failed to fetch building details' });
  }
});

/**
 * GET /api/twin/buildings/:id/readings
 * Historical telemetry readings for a building
 */
router.get('/buildings/:id/readings', async (req, res) => {
  try {
    const bId = Number(req.params.id);
    const { metric, limit = 50 } = req.query;

    let query = 'SELECT * FROM sensor_readings WHERE building_id = ?';
    const params = [bId];

    if (metric) {
      query += ' AND metric = ?';
      params.push(metric);
    }

    query += ' ORDER BY measured_at DESC LIMIT ?';
    params.push(Number(limit) || 50);

    const readings = await all(query, params);
    res.json({ success: true, count: readings.length, data: readings.reverse() });
  } catch (err) {
    console.error(`Error in /api/twin/buildings/${req.params.id}/readings:`, err);
    res.status(500).json({ success: false, error: 'Failed to fetch building readings' });
  }
});

/**
 * GET /api/twin/sensors
 * List all campus sensors with status and latest values
 */
router.get('/sensors', async (req, res) => {
  try {
    const sensors = await all(`
      SELECT s.*, b.name as building_name, b.code as building_code, z.name as zone_name
      FROM sensors s
      JOIN buildings b ON s.building_id = b.id
      LEFT JOIN zones z ON s.zone_id = z.id
      ORDER BY s.building_id ASC, s.id ASC
    `);

    res.json({ success: true, count: sensors.length, data: sensors });
  } catch (err) {
    console.error('Error in /api/twin/sensors:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch sensors' });
  }
});

/**
 * GET /api/twin/sensors/:id/readings
 * Historical telemetry readings for a specific sensor
 */
router.get('/sensors/:id/readings', async (req, res) => {
  try {
    const sensorId = req.params.id;
    const { limit = 50 } = req.query;

    const sensor = await get('SELECT * FROM sensors WHERE id = ?', [sensorId]);
    if (!sensor) {
      return res.status(404).json({ success: false, error: `Sensor ${sensorId} not found` });
    }

    const readings = await all(`
      SELECT * FROM sensor_readings
      WHERE sensor_id = ?
      ORDER BY measured_at DESC
      LIMIT ?
    `, [sensorId, Number(limit) || 50]);

    res.json({
      success: true,
      sensor: {
        id: sensor.id,
        sensor_type: sensor.sensor_type,
        unit: sensor.unit,
        status: sensor.status
      },
      count: readings.length,
      data: readings.reverse()
    });
  } catch (err) {
    console.error(`Error in /api/twin/sensors/${req.params.id}/readings:`, err);
    res.status(500).json({ success: false, error: 'Failed to fetch sensor readings' });
  }
});

/**
 * POST /api/twin/sensors/:id/readings
 * Ingest and validate external or physical sensor reading
 */
router.post('/sensors/:id/readings', async (req, res) => {
  try {
    const sensorId = req.params.id;
    const { value, unit, timestamp, source = 'measured' } = req.body;

    if (value === undefined || isNaN(Number(value))) {
      return res.status(400).json({ success: false, error: 'Invalid or missing sensor reading value' });
    }

    const numValue = Number(value);

    // Range validation to prevent impossible values
    if (numValue < -100 || numValue > 100000) {
      return res.status(422).json({ success: false, error: 'Reading value outside physically plausible sensor bounds' });
    }

    const sensor = await get('SELECT * FROM sensors WHERE id = ?', [sensorId]);
    if (!sensor) {
      return res.status(404).json({ success: false, error: `Sensor ${sensorId} does not exist` });
    }

    const measuredAt = timestamp || new Date().toISOString();
    const readingUnit = unit || sensor.unit;

    // Persist reading
    const insertRes = await run(`
      INSERT INTO sensor_readings (
        sensor_id, building_id, zone_id, metric, value, unit, measured_at, source, quality
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'good')
    `, [sensor.id, sensor.building_id, sensor.zone_id, sensor.sensor_type, numValue, readingUnit, measuredAt, source]);

    // Update sensor latest reading
    await run(`
      UPDATE sensors
      SET latest_reading = ?, last_updated_at = ?, source_type = ?
      WHERE id = ?
    `, [numValue, measuredAt, source, sensor.id]);

    // Evaluate rules
    await evaluateSensorRules(sensor, numValue, measuredAt);
    await computeBuildingStatus(sensor.building_id);

    res.status(201).json({
      success: true,
      message: 'Reading ingested and evaluated successfully',
      data: {
        id: insertRes.lastID,
        sensor_id: sensor.id,
        value: numValue,
        unit: readingUnit,
        measured_at: measuredAt,
        source
      }
    });
  } catch (err) {
    console.error(`Error in POST /api/twin/sensors/${req.params.id}/readings:`, err);
    res.status(500).json({ success: false, error: 'Failed to ingest sensor reading' });
  }
});

/**
 * GET /api/twin/alerts
 * List campus alerts with optional filter
 */
router.get('/alerts', async (req, res) => {
  try {
    const { status, building_id } = req.query;
    let query = `
      SELECT a.*, b.name as building_name, b.code as building_code
      FROM alerts a
      JOIN buildings b ON a.building_id = b.id
    `;
    const params = [];
    const conditions = [];

    if (status) {
      conditions.push('a.status = ?');
      params.push(status);
    }
    if (building_id) {
      conditions.push('a.building_id = ?');
      params.push(Number(building_id));
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY a.created_at DESC';
    const alerts = await all(query, params);

    res.json({ success: true, count: alerts.length, data: alerts });
  } catch (err) {
    console.error('Error in /api/twin/alerts:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch alerts' });
  }
});

/**
 * PATCH /api/twin/alerts/:id
 * Triage or resolve alert status
 */
router.patch('/alerts/:id', async (req, res) => {
  try {
    const alertId = Number(req.params.id);
    const { status } = req.body;

    if (!['open', 'in_progress', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid alert status value' });
    }

    const alert = await get('SELECT * FROM alerts WHERE id = ?', [alertId]);
    if (!alert) {
      return res.status(404).json({ success: false, error: `Alert with ID ${alertId} not found` });
    }

    const resolvedAt = (status === 'resolved' || status === 'dismissed') ? new Date().toISOString() : null;

    await run(`
      UPDATE alerts
      SET status = ?, resolved_at = ?
      WHERE id = ?
    `, [status, resolvedAt, alertId]);

    // Recompute building status after alert resolution
    await computeBuildingStatus(alert.building_id);

    res.json({
      success: true,
      message: `Alert #${alertId} status updated to ${status}`,
      data: { id: alertId, status, resolved_at: resolvedAt }
    });
  } catch (err) {
    console.error(`Error in PATCH /api/twin/alerts/${req.params.id}:`, err);
    res.status(500).json({ success: false, error: 'Failed to update alert' });
  }
});

/**
 * GET /api/twin/simulator/status
 */
router.get('/simulator/status', async (req, res) => {
  try {
    const status = await simulator.getStatus();
    res.json({ success: true, data: status });
  } catch (err) {
    console.error('Error in /api/twin/simulator/status:', err);
    res.status(500).json({ success: false, error: 'Failed to check simulator status' });
  }
});

/**
 * POST /api/twin/simulator/start
 */
router.post('/simulator/start', async (req, res) => {
  try {
    const interval = req.body?.interval_seconds || 10;
    const result = await simulator.start(interval);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Error starting simulator:', err);
    res.status(500).json({ success: false, error: 'Failed to start simulator' });
  }
});

/**
 * POST /api/twin/simulator/stop
 */
router.post('/simulator/stop', async (req, res) => {
  try {
    const result = await simulator.stop();
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Error stopping simulator:', err);
    res.status(500).json({ success: false, error: 'Failed to stop simulator' });
  }
});

/**
 * POST /api/twin/simulator/step
 */
router.post('/simulator/step', async (req, res) => {
  try {
    const result = await simulator.step();
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Error in simulator manual tick:', err);
    res.status(500).json({ success: false, error: 'Failed to execute simulation step' });
  }
});

/**
 * POST /api/twin/simulator/reset
 * Reset demo data back to clean seed state
 */
router.post('/simulator/reset', async (req, res) => {
  try {
    const result = await simulator.resetDemoData();
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Error resetting demo data:', err);
    res.status(500).json({ success: false, error: 'Failed to reset demo data' });
  }
});

/**
 * POST /api/twin/simulator/inject-anomaly
 */
router.post('/simulator/inject-anomaly', async (req, res) => {
  try {
    const { building_id, anomaly_type } = req.body;
    if (!building_id || !anomaly_type) {
      return res.status(400).json({ success: false, error: 'building_id and anomaly_type are required' });
    }

    const result = await simulator.injectAnomaly(building_id, anomaly_type);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Error injecting anomaly:', err);
    res.status(500).json({ success: false, error: 'Failed to inject anomaly' });
  }
});

/**
 * POST /api/twin/scenarios/simulate
 * What-if resource simulation calculator
 */
router.post('/scenarios/simulate', async (req, res) => {
  try {
    const simulationResult = await runScenarioSimulation(req.body);

    // Save scenario record
    await run(`
      INSERT INTO scenarios (
        building_id, scenario_name, metric_type, baseline_value, proposed_value,
        difference, percent_saved, cost_saved_usd, co2_avoided_kg, unit, assumptions, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      simulationResult.building_id,
      simulationResult.scenario_name,
      simulationResult.metric_type,
      simulationResult.baseline_value,
      simulationResult.projected_value,
      simulationResult.difference,
      simulationResult.percent_saved,
      simulationResult.cost_saved_usd,
      simulationResult.co2_avoided_kg,
      simulationResult.unit,
      simulationResult.assumptions,
      simulationResult.created_at
    ]);

    res.json({ success: true, data: simulationResult });
  } catch (err) {
    console.error('Error simulating scenario:', err);
    res.status(500).json({ success: false, error: 'Failed to run what-if scenario' });
  }
});

export default router;
