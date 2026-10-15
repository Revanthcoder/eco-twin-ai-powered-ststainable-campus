import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Water Monitoring Endpoints', () => {
  let buildingId = '';

  it('GET /api/water should return water readings with pagination', async () => {
    const res = await request(app).get('/api/water?limit=10');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    if (res.body.data.length > 0) {
      buildingId = res.body.data[0].buildingId;
    }
  });

  it('GET /api/water/summary should return volume and anomaly thresholds', async () => {
    const res = await request(app).get('/api/water/summary');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.unit).toBe('Litres');
    expect(res.body.data.categoryBreakdown).toBeDefined();
    expect(res.body.data.flowRateMetrics.configuredAnomalyThresholdLpm).toBeDefined();
  });

  it('POST /api/water/readings should record a valid water reading', async () => {
    const res = await request(app).post('/api/water/readings').send({
      buildingId,
      volumeLitres: 4500.5,
      flowRateLpm: 18.2,
      category: 'POTABLE',
      notes: 'Water test injection'
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.volumeLitres).toBe(4500.5);
  });
});
