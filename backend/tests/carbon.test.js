import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Carbon Footprint Endpoints', () => {
  it('GET /api/carbon should return calculated carbon footprint with Scopes 1, 2, and 3', async () => {
    const res = await request(app).get('/api/carbon');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.unit).toBe('kg CO2e');
    expect(res.body.data.scopeBreakdown.scope1.amountKgCo2e).toBeGreaterThanOrEqual(0);
    expect(res.body.data.scopeBreakdown.scope2.amountKgCo2e).toBeGreaterThan(0);
    expect(res.body.data.scopeBreakdown.scope3.amountKgCo2e).toBeGreaterThan(0);
    expect(res.body.data.emissionFactorsUsed.gridEmissionFactor.value).toBeDefined();
    expect(res.body.data.isEstimate).toBe(true);
  });

  it('GET /api/carbon/trends should return historical carbon emissions', async () => {
    const res = await request(app).get('/api/carbon/trends');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.datapoints)).toBe(true);
  });
});
