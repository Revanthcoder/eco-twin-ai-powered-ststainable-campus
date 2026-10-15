import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Overview Dashboard Endpoints', () => {
  it('GET /api/dashboard should return unified metrics and data mode', async () => {
    const res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.campusOverview.dataMode).toBeDefined();
    expect(res.body.data.sustainabilityScore.currentScore).toBeGreaterThan(0);
    expect(res.body.data.energy.totalConsumptionKwh).toBeGreaterThan(0);
    expect(res.body.data.water.totalVolumeLitres).toBeGreaterThan(0);
    expect(res.body.data.waste.totalWeightKg).toBeGreaterThan(0);
    expect(res.body.data.carbon.totalKgCo2e).toBeGreaterThan(0);
    expect(res.body.data.alerts.totalActive).toBeGreaterThanOrEqual(0);
  });

  it('GET /api/dashboard/trends should return cross-domain trends', async () => {
    const res = await request(app).get('/api/dashboard/trends');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.datapoints)).toBe(true);
  });

  it('GET /api/dashboard/building-comparison should compare buildings', async () => {
    const res = await request(app).get('/api/dashboard/building-comparison');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.buildingCount).toBeGreaterThan(0);
    expect(Array.isArray(res.body.data.rankings)).toBe(true);
    expect(res.body.data.rankings[0].performanceTier).toBeDefined();
  });
});
