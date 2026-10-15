import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('What-If Simulator Endpoints', () => {
  let createdScenarioId = '';

  it('POST /api/simulator should project savings from energy and water reduction', async () => {
    const payload = {
      name: 'Campus 15% LED Retrofit + Rooftop Solar',
      description: 'Test what-if simulation model',
      energyReductionPct: 15,
      waterEfficiencyPct: 10,
      solarAdditionKw: 25,
      tariffPerKwh: 0.15,
      gridEmissionFactor: 0.82
    };

    const res = await request(app).post('/api/simulator').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe(payload.name);
    expect(res.body.data.energyResults.baselineKwh).toBeGreaterThan(0);
    expect(res.body.data.energyResults.projectedKwh).toBeLessThan(res.body.data.energyResults.baselineKwh);
    expect(res.body.data.energyResults.absoluteSavingsKwh).toBeGreaterThan(0);
    expect(res.body.data.financialResults.costSavings).toBeGreaterThan(0);
    expect(res.body.data.carbonResults.co2eSavings).toBeGreaterThan(0);
    expect(Array.isArray(res.body.data.assumptions)).toBe(true);
    createdScenarioId = res.body.data.id;
  });

  it('GET /api/simulator/:id should retrieve stored scenario results', async () => {
    const res = await request(app).get(`/api/simulator/${createdScenarioId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(createdScenarioId);
  });

  it('POST /api/simulator should reject invalid percentage (> 100)', async () => {
    const invalid = {
      name: 'Invalid scenario',
      energyReductionPct: 120 // Invalid (> 100)
    };
    const res = await request(app).post('/api/simulator').send(invalid);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
