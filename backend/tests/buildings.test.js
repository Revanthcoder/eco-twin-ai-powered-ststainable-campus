import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Campus & Digital Twin Endpoints', () => {
  let sampleBuildingId = '';

  it('GET /api/buildings should list all campus buildings', async () => {
    const res = await request(app).get('/api/buildings');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    sampleBuildingId = res.body.data[0].id;
    expect(res.body.data[0].code).toBeDefined();
    expect(res.body.data[0].zoneCount).toBeDefined();
  });

  it('GET /api/buildings/:id should return single building details', async () => {
    const res = await request(app).get(`/api/buildings/${sampleBuildingId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(sampleBuildingId);
    expect(Array.isArray(res.body.data.zones)).toBe(true);
  });

  it('GET /api/buildings/:id/metrics should return aggregated consumption metrics', async () => {
    const res = await request(app).get(`/api/buildings/${sampleBuildingId}/metrics`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.energy).toBeDefined();
    expect(res.body.data.water).toBeDefined();
    expect(res.body.data.waste).toBeDefined();
    expect(res.body.data.energy.unit).toBe('kWh');
  });

  it('GET /api/buildings/invalid-id should return 404', async () => {
    const res = await request(app).get('/api/buildings/non-existent-cuid-999');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/zones should return zones list', async () => {
    const res = await request(app).get('/api/zones');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
