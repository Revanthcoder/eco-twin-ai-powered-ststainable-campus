import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Alerts and Sustainability Guardian Endpoints', () => {
  let sampleAlertId = '';

  it('GET /api/alerts should list active alerts', async () => {
    const res = await request(app).get('/api/alerts');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    sampleAlertId = res.body.data[0].id;
  });

  it('GET /api/alerts/:id should return alert details with history', async () => {
    const res = await request(app).get(`/api/alerts/${sampleAlertId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(sampleAlertId);
    expect(Array.isArray(res.body.data.history)).toBe(true);
  });

  it('PATCH /api/alerts/:id should update alert status and record history', async () => {
    const res = await request(app)
      .patch(`/api/alerts/${sampleAlertId}`)
      .send({ status: 'ACKNOWLEDGED', note: 'Staff acknowledged warning' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ACKNOWLEDGED');
  });

  it('POST /api/alerts/evaluate should execute rule engine and prevent duplicate active alerts', async () => {
    const firstEval = await request(app).post('/api/alerts/evaluate').send({});
    expect(firstEval.status).toBe(200);
    expect(firstEval.body.success).toBe(true);
    expect(firstEval.body.data.evaluatedChecksCount).toBeGreaterThan(0);

    // Second evaluation immediately following should NOT produce duplicate alerts
    const secondEval = await request(app).post('/api/alerts/evaluate').send({});
    expect(secondEval.status).toBe(200);
    expect(secondEval.body.data.newAlertsCreatedCount).toBe(0);
  });
});
