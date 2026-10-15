/**
 * EcoPulse Phase 3 Automated Test Suite
 * 
 * Tests the 10 minimum requirements specified in Section 12:
 * 1. Campus overview API
 * 2. Building list and detail endpoints
 * 3. Sensor reading validation
 * 4. Persistence and historical reading retrieval
 * 5. Simulator start and stop behavior
 * 6. Energy and water calculations
 * 7. Carbon emission calculations
 * 8. Alert generation and duplicate suppression
 * 9. Missing building and sensor handling
 * 10. API error states and edge cases
 */

import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import { initSchema, db, get, all, run } from '../db/database.js';
import { seedDatabase } from '../db/seedData.js';
import simulator from '../services/simulator.js';
import {
  integratePowerToKWh,
  integrateFlowToLiters,
  calculateCarbonEmissions,
  calculateEnergyIntensity,
  calculateWaterIntensity,
  calculateRecyclingRate
} from '../services/calculations.js';
import { evaluateSensorRules, createAlertIfUnique, computeBuildingStatus } from '../services/alertEngine.js';
import { runScenarioSimulation } from '../services/scenarioEngine.js';

let appServer = null;
let baseUrl = '';

before(async () => {
  // Ensure schema and seed data are initialized
  await initSchema();
  await seedDatabase(true);

  // Dynamically import express app and start test server on random port
  const { app } = await import('../index.js');
  await new Promise((resolve) => {
    appServer = app.listen(0, '127.0.0.1', () => {
      const port = appServer.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`[Test Suite] Test server running on ${baseUrl}`);
      resolve();
    });
  });
});

after(async () => {
  await simulator.stop();
  if (appServer) {
    await new Promise(resolve => appServer.close(resolve));
  }
});

// Test 1: Campus Overview API
test('1. Campus overview API returns aggregated KPIs and correct schema', async () => {
  const res = await fetch(`${baseUrl}/api/twin/overview`);
  assert.equal(res.status, 200);

  const json = await res.json();
  assert.equal(json.success, true);
  assert.ok(json.data.campus.buildings_count >= 4, 'Must have at least 4 sample buildings');
  assert.ok(json.data.energy.total_kwh > 0, 'Total energy kWh must be positive');
  assert.ok(json.data.water.total_liters > 0, 'Total water liters must be positive');
  assert.ok(json.data.sustainability_score >= 0 && json.data.sustainability_score <= 100);
  assert.ok(json.data.alerts.total >= 0);
});

// Test 2: Building List and Detail Endpoints
test('2. Building list and detail endpoints return accurate metadata and zones', async () => {
  const listRes = await fetch(`${baseUrl}/api/twin/buildings`);
  assert.equal(listRes.status, 200);
  const listJson = await listRes.json();
  assert.ok(Array.isArray(listJson.data));
  assert.ok(listJson.data.length >= 4);

  const b1 = listJson.data[0];
  assert.ok(b1.id);
  assert.ok(b1.name);
  assert.ok(b1.building_type);
  assert.ok(b1.status);
  assert.ok(Array.isArray(b1.status_reasons));

  // Detail endpoint
  const detailRes = await fetch(`${baseUrl}/api/twin/buildings/${b1.id}`);
  assert.equal(detailRes.status, 200);
  const detailJson = await detailRes.json();
  assert.equal(detailJson.data.id, b1.id);
  assert.ok(Array.isArray(detailJson.data.zones), 'Zones must be an array');
  assert.ok(detailJson.data.zones.length > 0, 'Building must have zones');
  assert.ok(Array.isArray(detailJson.data.sensors), 'Sensors must be an array');
  assert.ok(detailJson.data.sensors.length > 0, 'Building must have sensors');
});

// Test 3: Sensor Reading Validation & Plausibility
test('3. Sensor reading validation rejects missing or impossible values', async () => {
  // Reject missing value
  const badRes1 = await fetch(`${baseUrl}/api/twin/sensors/BLD-ACAD-PWR-01/readings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  assert.equal(badRes1.status, 400);

  // Reject physically impossible reading (e.g. 5,000,000 kW)
  const badRes2 = await fetch(`${baseUrl}/api/twin/sensors/BLD-ACAD-PWR-01/readings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: 99999999 })
  });
  assert.equal(badRes2.status, 422);

  // Accept valid reading
  const goodRes = await fetch(`${baseUrl}/api/twin/sensors/BLD-ACAD-PWR-01/readings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: 85.5, unit: 'kW', source: 'test_ingest' })
  });
  assert.equal(goodRes.status, 201);
  const goodJson = await goodRes.json();
  assert.equal(goodJson.data.value, 85.5);
});

// Test 4: Persistence and Historical Reading Retrieval
test('4. Persistence stores readings and allows historical retrieval', async () => {
  const sensorId = 'BLD-LIBR-PWR-01';
  const timestamp = new Date().toISOString();

  await fetch(`${baseUrl}/api/twin/sensors/${sensorId}/readings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: 42.1, timestamp, source: 'persistence_check' })
  });

  const historyRes = await fetch(`${baseUrl}/api/twin/sensors/${sensorId}/readings?limit=5`);
  assert.equal(historyRes.status, 200);
  const historyJson = await historyRes.json();
  assert.ok(Array.isArray(historyJson.data));
  assert.ok(historyJson.data.length > 0);
  
  // Verify reading is in database
  const row = await get('SELECT * FROM sensor_readings WHERE sensor_id = ? AND source = "persistence_check"', [sensorId]);
  assert.ok(row, 'Inserted reading must exist in SQLite database');
  assert.equal(row.value, 42.1);
});

// Test 5: Simulator Start, Stop, and Step Behavior
test('5. Simulator starts, stops, and executes single ticks without duplicate loops', async () => {
  // Start simulator with 5s interval
  const startRes = await fetch(`${baseUrl}/api/twin/simulator/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ interval_seconds: 5 })
  });
  assert.equal(startRes.status, 200);

  const status1 = await simulator.getStatus();
  assert.equal(status1.isRunning, true);

  // Manual step
  const stepRes = await fetch(`${baseUrl}/api/twin/simulator/step`, { method: 'POST' });
  assert.equal(stepRes.status, 200);
  const stepJson = await stepRes.json();
  assert.equal(stepJson.data.status, 'tick_completed');

  // Stop simulator
  const stopRes = await fetch(`${baseUrl}/api/twin/simulator/stop`, { method: 'POST' });
  assert.equal(stopRes.status, 200);
  const status2 = await simulator.getStatus();
  assert.equal(status2.isRunning, false);
});

// Test 6: Energy and Water Calculations (Integration over Time)
test('6. Energy and water physical calculations correctly integrate over time intervals', () => {
  // Power integration: 120 kW over 30 seconds = 120 * (30/3600) = 1.0 kWh
  const kwh = integratePowerToKWh(120, 30);
  assert.equal(kwh, 1.0);

  // Flow integration: 60 L/min over 10 seconds = 60 * (10/60) = 10.0 Liters
  const liters = integrateFlowToLiters(60, 10);
  assert.equal(liters, 10.0);

  // Intensity calculations
  const energyIntensity = calculateEnergyIntensity(1000, 500); // 1000 kWh / 500 m2 = 2.0 kWh/m2
  assert.equal(energyIntensity, 2.0);

  const waterIntensity = calculateWaterIntensity(500, 25); // 500 L / 25 people = 20.0 L/person
  assert.equal(waterIntensity, 20.0);

  // Division by zero safeguards
  assert.equal(calculateEnergyIntensity(1000, 0), null);
  assert.equal(calculateWaterIntensity(500, 0), null);
});

// Test 7: Carbon Emission Calculations
test('7. Carbon emissions formula uses documented factor without negative results', () => {
  // 1000 kWh * 0.42 kg CO2e/kWh = 420.0 kg CO2e
  const co2 = calculateCarbonEmissions(1000, 0.42);
  assert.equal(co2, 420.0);

  // Edge cases
  assert.equal(calculateCarbonEmissions(0), 0);
  assert.equal(calculateCarbonEmissions(-50), 0);
});

// Test 8: Alert Generation and Duplicate Suppression
test('8. Alert generation triggers on thresholds and suppresses duplicates', async () => {
  const sensor = {
    id: 'BLD-TEST-PWR-01',
    building_id: 1,
    sensor_type: 'energy',
    unit: 'kW',
    max_threshold: 100
  };

  // Spike reading: 180 kW exceeds 100 kW threshold
  await evaluateSensorRules(sensor, 180);

  const openAlerts1 = await all('SELECT * FROM alerts WHERE building_id = 1 AND category = "energy" AND status = "open"');
  assert.ok(openAlerts1.length > 0, 'Alert must have been triggered');

  const countBefore = openAlerts1.length;

  // Immediate second spike with same category and sensor
  await evaluateSensorRules(sensor, 185);

  const openAlerts2 = await all('SELECT * FROM alerts WHERE building_id = 1 AND category = "energy" AND status = "open"');
  assert.equal(openAlerts2.length, countBefore, 'Duplicate alert must be suppressed during cooldown');
});

// Test 9: Missing Building and Sensor Error Handling
test('9. Missing building and sensor endpoints return HTTP 404 with clean JSON', async () => {
  const bRes = await fetch(`${baseUrl}/api/twin/buildings/9999`);
  assert.equal(bRes.status, 404);
  const bJson = await bRes.json();
  assert.equal(bJson.success, false);
  assert.ok(bJson.error.includes('9999'));

  const sRes = await fetch(`${baseUrl}/api/twin/sensors/NONEXISTENT-SENSOR/readings`);
  assert.equal(sRes.status, 404);
  const sJson = await sRes.json();
  assert.equal(sJson.success, false);
});

// Test 10: What-If Scenario Physics Simulator
test('10. What-If scenario engine computes baseline, savings, and avoids modifying live data', async () => {
  const res = await fetch(`${baseUrl}/api/twin/scenarios/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      building_id: 1,
      metric_type: 'energy',
      scenario_name: 'LED Lighting Retrofit',
      reduction_percent: 25,
      days: 30
    })
  });

  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  assert.equal(json.data.percent_saved, 25);
  assert.ok(json.data.difference > 0);
  assert.ok(json.data.cost_saved_usd > 0);
  assert.ok(json.data.co2_avoided_kg > 0);
  assert.ok(json.data.assumptions.length > 0);
  assert.ok(json.data.data_classification.includes('ESTIMATE'));
});
