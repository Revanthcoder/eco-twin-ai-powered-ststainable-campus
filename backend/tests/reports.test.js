import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Reports and Analytics Endpoints', () => {
  let createdReportId = '';

  it('POST /api/reports should generate summary report from stored database records', async () => {
    const payload = {
      title: 'Q1 Campus Comprehensive Sustainability Audit',
      reportType: 'CAMPUS_SUMMARY',
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString()
    };

    const res = await request(app).post('/api/reports').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe(payload.title);
    expect(res.body.data.dataCoveragePercent).toBeGreaterThan(0);
    expect(res.body.data.summaryMetrics.energy).toBeDefined();
    expect(res.body.data.summaryMetrics.water).toBeDefined();
    expect(res.body.data.summaryMetrics.waste).toBeDefined();
    expect(Array.isArray(res.body.data.assumptions)).toBe(true);
    createdReportId = res.body.data.id;
  });

  it('GET /api/reports should list generated reports with pagination', async () => {
    const res = await request(app).get('/api/reports');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('GET /api/reports/:id should retrieve specific report details', async () => {
    const res = await request(app).get(`/api/reports/${createdReportId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(createdReportId);
  });
});
