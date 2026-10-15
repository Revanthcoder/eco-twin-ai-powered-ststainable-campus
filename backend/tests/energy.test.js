import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Energy Monitoring Endpoints', () => {
  let buildingId = '';

  it('GET /api/energy should return readings and pagination', async () => {
    const res = await request(app).get('/api/energy?limit=10');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta.pagination.limit).toBe(10);
    if (res.body.data.length > 0) {
      buildingId = res.body.data[0].buildingId;
    }
  });

  it('GET /api/energy/summary should aggregate consumption and solar generation', async () => {
    const res = await request(app).get('/api/energy/summary');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.unit).toBe('kWh');
    expect(typeof res.body.data.totalConsumptionKwh).toBe('number');
    expect(res.body.data.sourceBreakdown).toBeDefined();
    expect(typeof res.body.data.sourceBreakdown.renewablePercentage).toBe('number');
  });

  it('GET /api/energy/trends should return grouped intervals', async () => {
    const res = await request(app).get('/api/energy/trends?interval=daily');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.datapoints)).toBe(true);
  });

  it('POST /api/energy/readings should record a valid reading', async () => {
    const payload = {
      buildingId,
      timestamp: new Date().toISOString(),
      consumptionKwh: 342.5,
      peakDemandKw: 31.2,
      source: 'GRID',
      notes: 'Test automated reading'
    };

    const res = await request(app).post('/api/energy/readings').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.consumptionKwh).toBe(342.5);
  });

  it('POST /api/energy/readings should reject negative consumption', async () => {
    const invalidPayload = {
      buildingId,
      timestamp: new Date().toISOString(),
      consumptionKwh: -50.0
    };

    const res = await request(app).post('/api/energy/readings').send(invalidPayload);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
