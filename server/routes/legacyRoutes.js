import express from 'express';
import { all, get, run } from '../db/database.js';
import { calculateCarbonEmissions } from '../services/calculations.js';
import { runScenarioSimulation } from '../services/scenarioEngine.js';

const router = express.Router();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8001';

/**
 * Health check endpoints
 */
router.get(['/health', '/api/health'], async (req, res) => {
  try {
    // Quick test query to verify SQLite connection
    const test = await get('SELECT 1 as connected');
    res.json({
      status: 'healthy',
      database: test?.connected ? 'connected' : 'disconnected',
      service: 'EcoTwin AI & Digital Twin Engine',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ status: 'unhealthy', database: 'error', error: err.message });
  }
});

/**
 * GET /api/metrics/summary
 * Direct compatibility with Phase 1 EcoPulse dashboard
 */
router.get('/metrics/summary', async (req, res) => {
  try {
    const buildings = await all('SELECT * FROM buildings WHERE active = 1');
    const alerts = await all('SELECT severity, status FROM alerts WHERE status = "open"');

    let totalKW = 0;
    let totalKWh = 0;
    let totalWaterLPM = 0;
    let totalWaterLiters = 0;
    let totalSolarKW = 0;

    for (const b of buildings) {
      totalKW += b.current_kw || 0;
      totalKWh += b.total_kwh || 0;
      totalWaterLPM += b.current_water_lpm || 0;
      totalWaterLiters += b.total_water_liters || 0;
      totalSolarKW += b.solar_kw || 0;
    }

    const payload = {
      sustainabilityScore: 82,
      scoreTarget: 90,
      scoreDelta: "+4.2% vs baseline",
      subScores: {
        energy: 84,
        water: 72,
        waste: 86,
        carbonOffset: 79
      },
      electricity: {
        totalKWh: Math.round(totalKWh * 10) / 10,
        deltaPercent: -6.4,
        peakDemandKW: Math.round(totalKW * 10) / 10,
        solarOffsetPercent: totalKW > 0 ? Math.round((totalSolarKW / totalKW) * 100 * 10) / 10 : 24.8,
        unit: "kWh"
      },
      water: {
        totalLiters: Math.round(totalWaterLiters * 10) / 10,
        deltaPercent: +12.3,
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
        total: alerts.length,
        critical: alerts.filter(a => a.severity === 'critical').length,
        high: alerts.filter(a => a.severity === 'high').length,
        medium: alerts.filter(a => a.severity === 'medium').length,
        low: alerts.filter(a => a.severity === 'low').length
      }
    };

    res.json(payload);
  } catch (err) {
    console.error('Error in /api/metrics/summary:', err);
    res.status(500).json({ error: 'Failed to compute metrics summary' });
  }
});

/**
 * GET /api/buildings
 * Compatibility building endpoint
 */
router.get('/buildings', async (req, res) => {
  try {
    const buildings = await all('SELECT * FROM buildings WHERE active = 1 ORDER BY id ASC');

    const mapped = buildings.map(b => ({
      id: b.id,
      name: b.name,
      type: b.building_type,
      description: `${b.floors}-floor facility located at ${b.location}.`,
      map_position: b.location,
      status: b.status === 'healthy' ? 'optimal' : b.status, // map 'healthy' to 'optimal' for Phase 1 badge
      sustainabilityScore: b.sustainability_score,
      energyUsageKWh: b.total_kwh,
      waterUsageL: b.total_water_liters,
      solarGenerationKWh: b.solar_kw * 4.5,
      occupancyRate: b.occupancy_capacity > 0 ? Math.round((b.occupancy_count / b.occupancy_capacity) * 100) : 0,
      activeIssuesCount: 1,
      lastUpdated: b.last_updated_at ? 'Just now' : '2 mins ago'
    }));

    res.json(mapped);
  } catch (err) {
    console.error('Error in /api/buildings:', err);
    res.status(500).json({ error: 'Failed to retrieve buildings' });
  }
});

/**
 * GET /api/issues
 */
router.get('/issues', async (req, res) => {
  try {
    const alerts = await all(`
      SELECT a.*, b.name as building_name
      FROM alerts a
      JOIN buildings b ON a.building_id = b.id
      ORDER BY a.created_at DESC
    `);

    const mapped = alerts.map(a => ({
      id: a.id,
      building_id: a.building_id,
      building_name: a.building_name,
      category: a.category,
      description: a.description,
      severity: a.severity,
      status: a.status,
      source: a.source,
      created_at: a.created_at,
      estimatedWasteCostPerHour: a.estimated_waste_rate || '$12.00/hr',
      aiRecommendation: a.ai_recommendation || 'Inspect sensor telemetry and verify calibration.'
    }));

    res.json(mapped);
  } catch (err) {
    console.error('Error in /api/issues:', err);
    res.status(500).json({ error: 'Failed to retrieve issues' });
  }
});

/**
 * PATCH /api/issues/:id
 */
router.patch('/issues/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    await run('UPDATE alerts SET status = ? WHERE id = ?', [status, id]);
    res.json({ id, status, updatedLocally: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/simulations/water
 */
router.post('/simulations/water', async (req, res) => {
  try {
    const sim = await runScenarioSimulation({ ...req.body, metric_type: 'water' });
    res.json(sim);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/simulations/energy
 */
router.post('/simulations/energy', async (req, res) => {
  try {
    const sim = await runScenarioSimulation({ ...req.body, metric_type: 'energy' });
    res.json(sim);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/vision/analyze
 * Proxies to Python AI Service if running, otherwise returns rule-based diagnostic
 */
router.post('/vision/analyze', async (req, res) => {
  try {
    // Attempt to contact Python AI Service
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const aiRes = await fetch(`${AI_SERVICE_URL}/predict`, {
      method: 'POST',
      body: req.body,
      signal: controller.signal
    }).catch(() => null);

    clearTimeout(timeout);

    if (aiRes && aiRes.ok) {
      const data = await aiRes.json();
      return res.json({ ...data, isLiveModel: true });
    }
  } catch {
    // AI service offline
  }

  // Labeled fallback
  res.json({
    analysisStatus: 'simulated_heuristic',
    isLiveModel: false,
    disclaimer: 'HEURISTIC PREVIEW: Backend vision neural network not active at port 8001. This is a deterministic rule-based demonstration.',
    detections: [
      {
        class: 'Water Dripping / Pipe Leak',
        confidence: 0.94,
        severity: 'high',
        suggestedLocation: 'Cafeteria - Utility Pipe Wall',
        recommendation: 'Potential valve gasket degradation detected. Recommend maintenance dispatch.',
        boundingBox: { x: 32, y: 48, width: 28, height: 35 }
      }
    ]
  });
});

export default router;
