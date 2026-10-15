/**
 * EcoPulse Real-Time Campus Sensor Simulator
 * 
 * Simulates edge telemetry for 5 campus buildings, 14 zones, and 20 sensors.
 * Features:
 * - Configurable interval (default 10 seconds).
 * - Smooth diurnal profiles (morning ramp, midday peak, evening reduction).
 * - Prevents duplicate simulator loops.
 * - Integrates energy (kWh) and water (Liters) correctly over elapsed time.
 * - Saves persistent readings to SQLite database.
 * - Anomaly injection support for hackathon demonstration.
 */

import { run, all, get } from '../db/database.js';
import { integratePowerToKWh, integrateFlowToLiters } from './calculations.js';
import { evaluateSensorRules, evaluateWasteBinRules, computeBuildingStatus } from './alertEngine.js';
import { seedDatabase } from '../db/seedData.js';

class SensorSimulator {
  constructor() {
    this.timerId = null;
    this.intervalSeconds = 10;
    this.isRunning = false;
    this.tickCount = 0;
    this.lastTickTime = null;
    this.lastError = null;
  }

  /**
   * Start the simulation loop
   */
  async start(interval = 10) {
    if (this.isRunning) {
      return { message: 'Simulator is already running', intervalSeconds: this.intervalSeconds };
    }

    this.intervalSeconds = Math.max(2, Math.min(60, Number(interval) || 10));
    this.isRunning = true;
    this.lastError = null;

    await run(`
      UPDATE simulator_state
      SET is_running = 1, interval_seconds = ?, error_message = NULL
      WHERE id = 1
    `, [this.intervalSeconds]);

    console.log(`[Simulator] Started sensor simulation loop every ${this.intervalSeconds}s`);

    // Execute first tick immediately, then set interval
    this.step().catch(err => console.error('[Simulator] Error in initial tick:', err));

    this.timerId = setInterval(() => {
      this.step().catch(err => {
        this.lastError = err.message;
        console.error('[Simulator] Tick execution error:', err);
      });
    }, this.intervalSeconds * 1000);

    return {
      status: 'started',
      intervalSeconds: this.intervalSeconds,
      isRunning: true
    };
  }

  /**
   * Stop the simulation loop
   */
  async stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isRunning = false;

    await run(`
      UPDATE simulator_state
      SET is_running = 0
      WHERE id = 1
    `);

    console.log('[Simulator] Stopped sensor simulation loop');
    return {
      status: 'stopped',
      isRunning: false,
      tickCount: this.tickCount
    };
  }

  /**
   * Execute a single simulation step
   */
  async step() {
    const now = new Date();
    const timestamp = now.toISOString();
    const hourOfDay = now.getUTCHours();
    this.lastTickTime = timestamp;
    this.tickCount++;

    // Diurnal factor: higher during campus operating hours (08:00 - 18:00 UTC)
    let campusActivity = 0.25;
    if (hourOfDay >= 8 && hourOfDay <= 18) {
      campusActivity = 0.65 + 0.35 * Math.sin(((hourOfDay - 8) / 10) * Math.PI);
    }

    // 1. Fetch all active sensors
    const sensors = await all(`
      SELECT s.*, b.building_type, b.occupancy_capacity
      FROM sensors s
      JOIN buildings b ON s.building_id = b.id
      WHERE b.active = 1
    `);

    // Group updates by building
    const buildingDeltas = {};

    for (const s of sensors) {
      if (s.status === 'offline') continue;

      let newValue = s.latest_reading;
      // Smooth noise between -3% and +3%
      const jitter = 1 + (Math.random() * 0.06 - 0.03);

      if (s.sensor_type === 'energy') {
        const base = s.min_threshold + (s.max_threshold - s.min_threshold) * 0.5 * campusActivity;
        newValue = Math.max(s.min_threshold, Math.round((base * jitter) * 10) / 10);
      } else if (s.sensor_type === 'water_flow') {
        const base = s.min_threshold + (s.max_threshold - s.min_threshold) * 0.45 * campusActivity;
        newValue = Math.max(s.min_threshold, Math.round((base * jitter) * 10) / 10);
      } else if (s.sensor_type === 'occupancy') {
        const baseOcc = (s.max_threshold || 500) * campusActivity * 0.8;
        newValue = Math.min(s.max_threshold, Math.max(0, Math.round(baseOcc * jitter)));
      } else if (s.sensor_type === 'temperature') {
        const tempBase = 21.5 + 2.0 * Math.sin((hourOfDay / 24) * 2 * Math.PI);
        newValue = Math.round((tempBase + (Math.random() * 0.6 - 0.3)) * 10) / 10;
      }

      // Update sensor record
      await run(`
        UPDATE sensors
        SET latest_reading = ?, last_updated_at = ?
        WHERE id = ?
      `, [newValue, timestamp, s.id]);

      // Record reading in history
      await run(`
        INSERT INTO sensor_readings (
          sensor_id, building_id, zone_id, metric, value, unit, measured_at, source, quality
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'simulated', 'good')
      `, [s.id, s.building_id, s.zone_id, s.sensor_type, newValue, s.unit, timestamp]);

      // Evaluate alert rules for this sensor
      await evaluateSensorRules(s, newValue, timestamp);

      // Accumulate building metrics
      if (!buildingDeltas[s.building_id]) {
        buildingDeltas[s.building_id] = {
          current_kw: 0,
          current_water_lpm: 0,
          occupancy_count: 0
        };
      }

      if (s.sensor_type === 'energy') {
        buildingDeltas[s.building_id].current_kw += newValue;
      } else if (s.sensor_type === 'water_flow') {
        buildingDeltas[s.building_id].current_water_lpm += newValue;
      } else if (s.sensor_type === 'occupancy') {
        buildingDeltas[s.building_id].occupancy_count = newValue;
      }
    }

    // 2. Update waste bins fill levels (slow gradual increase 0.1% - 0.4% per tick)
    const bins = await all('SELECT * FROM waste_bins');
    for (const bin of bins) {
      let newFill = bin.fill_level_percent + (0.1 + Math.random() * 0.3);
      if (newFill > 100) newFill = 100;
      newFill = Math.round(newFill * 10) / 10;

      await run(`
        UPDATE waste_bins
        SET fill_level_percent = ?, status = ?
        WHERE id = ?
      `, [newFill, newFill >= 90 ? 'warning' : 'normal', bin.id]);

      await evaluateWasteBinRules({ ...bin, fill_level_percent: newFill }, timestamp);
    }

    // 3. Update building totals and compute explainable status
    for (const [bIdStr, delta] of Object.entries(buildingDeltas)) {
      const bId = Number(bIdStr);
      const b = await get('SELECT total_kwh, total_water_liters FROM buildings WHERE id = ?', [bId]);
      if (!b) continue;

      const deltaKWh = integratePowerToKWh(delta.current_kw, this.intervalSeconds);
      const deltaLiters = integrateFlowToLiters(delta.current_water_lpm, this.intervalSeconds);

      const newTotalKWh = Math.round((b.total_kwh + deltaKWh) * 10) / 10;
      const newTotalLiters = Math.round((b.total_water_liters + deltaLiters) * 10) / 10;

      await run(`
        UPDATE buildings
        SET current_kw = ?, total_kwh = ?, current_water_lpm = ?, total_water_liters = ?,
            occupancy_count = ?, last_updated_at = ?
        WHERE id = ?
      `, [
        Math.round(delta.current_kw * 10) / 10,
        newTotalKWh,
        Math.round(delta.current_water_lpm * 10) / 10,
        newTotalLiters,
        delta.occupancy_count,
        timestamp,
        bId
      ]);

      // Recompute building health status
      await computeBuildingStatus(bId);
    }

    // Update simulator state
    await run(`
      UPDATE simulator_state
      SET tick_count = ?, last_tick_at = ?
      WHERE id = 1
    `, [this.tickCount, timestamp]);

    return {
      status: 'tick_completed',
      timestamp,
      tickCount: this.tickCount,
      activeSensorsUpdated: sensors.length
    };
  }

  /**
   * Inject a controlled anomaly for testing and live evaluation
   */
  async injectAnomaly(buildingId, anomalyType) {
    const timestamp = new Date().toISOString();
    const bId = Number(buildingId);

    if (anomalyType === 'water_leak') {
      // Spike water sensor in building
      const sensor = await get(`
        SELECT id FROM sensors
        WHERE building_id = ? AND sensor_type = 'water_flow'
        LIMIT 1
      `, [bId]);

      if (sensor) {
        await run(`UPDATE sensors SET latest_reading = 85.0, last_updated_at = ? WHERE id = ?`, [timestamp, sensor.id]);
        await run(`
          INSERT INTO alerts (
            building_id, sensor_id, severity, category, title, description,
            ai_recommendation, status, source, created_at, estimated_waste_rate
          ) VALUES (?, ?, 'high', 'water_leak', 'Simulated Pipe Leak Anomaly (85.0 L/min)',
                    'Simulated rapid water pressure drop and excessive flow surge detected.',
                    'Dispatch emergency plumbing technician immediately.', 'open', 'manual_injection', ?, '320 L/hr wasted')
        `, [bId, sensor.id, timestamp]);
      }
    } else if (anomalyType === 'energy_surge') {
      const sensor = await get(`
        SELECT id FROM sensors
        WHERE building_id = ? AND sensor_type = 'energy'
        LIMIT 1
      `, [bId]);

      if (sensor) {
        await run(`UPDATE sensors SET latest_reading = 310.0, last_updated_at = ? WHERE id = ?`, [timestamp, sensor.id]);
        await run(`
          INSERT INTO alerts (
            building_id, sensor_id, severity, category, title, description,
            ai_recommendation, status, source, created_at, estimated_waste_rate
          ) VALUES (?, ?, 'critical', 'energy', 'Simulated Power Demand Surge (310.0 kW)',
                    'Simulated mechanical overload or compressor lockup caused critical electrical surge.',
                    'Initiate HVAC load shedding sequence.', 'open', 'manual_injection', ?, '$43.40/hr waste')
        `, [bId, sensor.id, timestamp]);
      }
    } else if (anomalyType === 'bin_overflow') {
      const bin = await get(`SELECT id, bin_code FROM waste_bins WHERE building_id = ? LIMIT 1`, [bId]);
      if (bin) {
        await run(`UPDATE waste_bins SET fill_level_percent = 98.0, status = 'critical' WHERE id = ?`, [bin.id]);
        await run(`
          INSERT INTO alerts (
            building_id, sensor_id, severity, category, title, description,
            ai_recommendation, status, source, created_at, estimated_waste_rate
          ) VALUES (?, ?, 'warning', 'waste', 'Simulated Waste Bin Overflow (98%)',
                    'Ultrasonic fill sensor indicates bin has reached critical 98% fullness.',
                    'Prioritize custodial route to clear bin.', 'open', 'manual_injection', ?, 'Overflow risk')
        `, [bId, `BIN-${bin.bin_code}`, timestamp]);
      }
    }

    await computeBuildingStatus(bId);
    return { status: 'anomaly_injected', buildingId: bId, anomalyType, timestamp };
  }

  /**
   * Reset the database to clean seed demo baseline
   */
  async resetDemoData() {
    await seedDatabase(true);
    this.tickCount = 0;
    return { status: 'demo_data_reset_complete', timestamp: new Date().toISOString() };
  }

  /**
   * Get current simulator status
   */
  async getStatus() {
    const state = await get('SELECT * FROM simulator_state WHERE id = 1');
    return {
      isRunning: this.isRunning,
      intervalSeconds: this.intervalSeconds,
      tickCount: this.tickCount,
      lastTickTime: this.lastTickTime || state?.last_tick_at || null,
      lastError: this.lastError
    };
  }
}

export const simulator = new SensorSimulator();
export default simulator;
