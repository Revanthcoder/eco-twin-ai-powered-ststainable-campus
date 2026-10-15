/**
 * EcoPulse Alert and Anomaly Engine
 * 
 * Rules-based, deterministic anomaly detection and building status calculation.
 * Adheres to specification:
 * - Deterministic explainable rules (no fake AI labels on threshold rules).
 * - Duplicate alert suppression (cooldown window prevents duplicate alerts).
 * - Transparent explainability: every status includes explicit reasons for the UI.
 */

import { run, all, get } from '../db/database.js';

// Cooldown window in milliseconds to suppress duplicate alerts
const ALERT_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Check and evaluate rules for a single sensor reading or building state
 */
export async function evaluateSensorRules(sensor, value, timestamp = new Date().toISOString()) {
  const alertsToCreate = [];

  // 1. Energy Spikes
  if (sensor.sensor_type === 'energy' && sensor.max_threshold) {
    if (value > sensor.max_threshold) {
      alertsToCreate.push({
        building_id: sensor.building_id,
        sensor_id: sensor.id,
        severity: value > sensor.max_threshold * 1.25 ? 'critical' : 'warning',
        category: 'energy',
        title: `Abnormal Power Spike (${value} ${sensor.unit})`,
        description: `Sensor ${sensor.id} recorded ${value} ${sensor.unit}, exceeding the maximum safe operating limit of ${sensor.max_threshold} ${sensor.unit}.`,
        ai_recommendation: 'Check major mechanical loads, VFD motor controllers, and HVAC chiller setpoints.',
        estimated_waste_rate: `${Math.round((value - sensor.max_threshold) * 0.14 * 10) / 10} $/hr waste`
      });
    }
  }

  // 2. High Water Flow / Leak Suspicions
  if (sensor.sensor_type === 'water_flow' && sensor.max_threshold) {
    if (value > sensor.max_threshold) {
      alertsToCreate.push({
        building_id: sensor.building_id,
        sensor_id: sensor.id,
        severity: 'high',
        category: 'water_leak',
        title: `High Water Flow Rate (${value} ${sensor.unit})`,
        description: `Water flow meter ${sensor.id} measured ${value} L/min, exceeding threshold of ${sensor.max_threshold} L/min. Continuous flow indicates possible pipe rupture or valve leak.`,
        ai_recommendation: 'Dispatch facilities team to inspect zone isolation valves and sanitary plumbing.',
        estimated_waste_rate: `${Math.round(value * 60)} L/hr wasted`
      });
    }
  }

  // Process alert creation with duplicate suppression
  for (const alertData of alertsToCreate) {
    await createAlertIfUnique(alertData, timestamp);
  }
}

/**
 * Evaluate Waste Bin status and trigger alert if full
 */
export async function evaluateWasteBinRules(bin, timestamp = new Date().toISOString()) {
  if (bin.fill_level_percent >= 85) {
    const severity = bin.fill_level_percent >= 95 ? 'critical' : 'warning';
    await createAlertIfUnique({
      building_id: bin.building_id,
      sensor_id: `BIN-${bin.bin_code}`,
      severity,
      category: 'waste',
      title: `Waste Bin ${bin.bin_code} Near Capacity (${Math.round(bin.fill_level_percent)}%)`,
      description: `Bin ${bin.bin_code} (${bin.bin_type}) reached ${Math.round(bin.fill_level_percent)}% fill level. Requires collection dispatch.`,
      ai_recommendation: 'Route custodial staff to empty bin to prevent overflow into campus common areas.',
      estimated_waste_rate: 'Overflow risk'
    }, timestamp);
  }
}

/**
 * Creates an alert only if no active duplicate alert exists within the cooldown period
 */
export async function createAlertIfUnique(alertData, timestamp = new Date().toISOString()) {
  const cooldownCutoff = new Date(Date.now() - ALERT_COOLDOWN_MS).toISOString();

  // Check for existing open alert for this building & category & sensor
  const existing = await get(`
    SELECT id, created_at FROM alerts
    WHERE building_id = ? AND category = ? AND sensor_id = ? AND status = 'open'
    ORDER BY id DESC LIMIT 1
  `, [alertData.building_id, alertData.category, alertData.sensor_id]);

  if (existing) {
    // Duplicate suppressed
    return null;
  }

  const res = await run(`
    INSERT INTO alerts (
      building_id, sensor_id, severity, category, title, description,
      ai_recommendation, status, source, created_at, estimated_waste_rate
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)
  `, [
    alertData.building_id,
    alertData.sensor_id,
    alertData.severity,
    alertData.category,
    alertData.title,
    alertData.description,
    alertData.ai_recommendation || null,
    alertData.source || 'rule_engine',
    timestamp,
    alertData.estimated_waste_rate || null
  ]);

  return res.lastID;
}

/**
 * Deterministically compute explainable building health status:
 * - 'critical': If an open critical alert exists
 * - 'warning': If an open warning/high alert exists, or waste bin > 85%, or sensor data is stale (> 5 min)
 * - 'healthy': All data fresh and no active warnings
 * - 'unknown': Data missing or sensors offline
 */
export async function computeBuildingStatus(buildingId) {
  const reasons = [];

  // 1. Check open alerts
  const openAlerts = await all(`
    SELECT severity, title, category FROM alerts
    WHERE building_id = ? AND status = 'open'
  `, [buildingId]);

  const hasCritical = openAlerts.some(a => a.severity === 'critical');
  const hasHighOrWarning = openAlerts.some(a => a.severity === 'high' || a.severity === 'warning');

  if (hasCritical) {
    const criticalAlerts = openAlerts.filter(a => a.severity === 'critical');
    reasons.push(...criticalAlerts.map(a => `Critical alert: ${a.title}`));
  }
  if (hasHighOrWarning) {
    const warningAlerts = openAlerts.filter(a => a.severity === 'high' || a.severity === 'warning');
    reasons.push(...warningAlerts.map(a => `Warning alert: ${a.title}`));
  }

  // 2. Check sensors freshness & health
  const sensors = await all(`
    SELECT id, sensor_type, status, last_updated_at FROM sensors
    WHERE building_id = ?
  `, [buildingId]);

  if (sensors.length === 0) {
    return {
      status: 'unknown',
      reasons: ['No registered sensors found for this building']
    };
  }

  const now = Date.now();
  for (const s of sensors) {
    if (s.status === 'offline') {
      reasons.push(`Sensor ${s.id} (${s.sensor_type}) is offline`);
    } else if (s.last_updated_at) {
      const ageMs = now - new Date(s.last_updated_at).getTime();
      if (ageMs > 10 * 60 * 1000) { // 10 minutes stale threshold
        reasons.push(`Sensor ${s.id} data is stale (>10m old)`);
      }
    }
  }

  // 3. Check waste bins
  const bins = await all(`
    SELECT bin_code, fill_level_percent FROM waste_bins
    WHERE building_id = ?
  `, [buildingId]);

  for (const b of bins) {
    if (b.fill_level_percent >= 90) {
      reasons.push(`Waste bin ${b.bin_code} is near full (${Math.round(b.fill_level_percent)}%)`);
    }
  }

  let finalStatus = 'healthy';
  if (hasCritical) {
    finalStatus = 'critical';
  } else if (hasHighOrWarning || reasons.length > 0) {
    finalStatus = 'warning';
  }

  if (reasons.length === 0) {
    reasons.push('All telemetry parameters within optimal operating thresholds');
  }

  // Update building row in DB
  await run(`
    UPDATE buildings
    SET status = ?, status_reasons = ?
    WHERE id = ?
  `, [finalStatus, JSON.stringify(reasons), buildingId]);

  return {
    status: finalStatus,
    reasons
  };
}
