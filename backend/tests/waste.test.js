import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Waste Monitoring Endpoints', () => {
  it('GET /api/waste should return waste records and fullness levels', async () => {
    const res = await request(app).get('/api/waste?limit=5');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/waste/summary should calculate diversion rate and bin breakdown', async () => {
    const res = await request(app).get('/api/waste/summary');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.unit).toBe('kg');
    expect(typeof res.body.data.diversionRatePercent).toBe('number');
    expect(res.body.data.binTypeBreakdown).toBeDefined();
  });

  it('GET /api/waste/detections should return AI/Sensor detection events', async () => {
    const res = await request(app).get('/api/waste/detections');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('POST /api/waste/detections should validate confidence score between 0 and 1', async () => {
    const invalidRes = await request(app).post('/api/waste/detections').send({
      wasteCategory: 'PLASTIC',
      confidenceScore: 1.5 // Invalid (> 1.0)
    });
    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.success).toBe(false);

    const validRes = await request(app).post('/api/waste/detections').send({
      wasteCategory: 'PLASTIC',
      confidenceScore: 0.95,
      isModelEstimate: true,
      estimatedWeightKg: 0.12
    });
    expect(validRes.status).toBe(201);
    expect(validRes.body.success).toBe(true);
    expect(validRes.body.data.isModelEstimate).toBe(true);
  });
});
