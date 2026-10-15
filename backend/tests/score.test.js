import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Sustainability Score Endpoints', () => {
  it('GET /api/sustainability-score should return score out of 100 with component weights', async () => {
    const res = await request(app).get('/api/sustainability-score');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalScore).toBeGreaterThanOrEqual(0);
    expect(res.body.data.totalScore).toBeLessThanOrEqual(100);
    expect(res.body.data.scaleMax).toBe(100);
    expect(res.body.data.componentScores.energy).toBeDefined();
    expect(res.body.data.componentScores.water).toBeDefined();
    expect(res.body.data.componentScores.waste).toBeDefined();
    expect(res.body.data.componentScores.carbon).toBeDefined();
    expect(res.body.data.weights.energy).toBe(0.35);
  });

  it('GET /api/sustainability-score/history should return historical calculation records', async () => {
    const res = await request(app).get('/api/sustainability-score/history?limit=5');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
