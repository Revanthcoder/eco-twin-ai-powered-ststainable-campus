import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Health and System Endpoints', () => {
  it('GET /api/health should return 200 and healthy status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('HEALTHY');
    expect(res.body.data.database.status).toBe('CONNECTED');
    expect(res.body.meta.timestamp).toBeDefined();
  });

  it('GET /api/system/status should return 200 with campus data coverage', async () => {
    const res = await request(app).get('/api/system/status');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.dataCoverage).toBeDefined();
    expect(res.body.data.dataCoverage.buildings).toBeGreaterThan(0);
    expect(res.body.data.dataCoverage.activeSensors).toBeGreaterThan(0);
  });

  it('GET /api/non-existent-route should return 404 with standard error format', async () => {
    const res = await request(app).get('/api/non-existent-route');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
