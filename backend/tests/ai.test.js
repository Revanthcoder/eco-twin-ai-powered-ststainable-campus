import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { aiClient } from '../src/integrations/aiClient.js';

describe('AI Microservice Integration Endpoints', () => {
  beforeEach(() => {
    aiClient.mockFallback = true;
  });

  it('POST /api/ai/chat should return structured advisor reply with fallback indicator', async () => {
    const res = await request(app).post('/api/ai/chat').send({
      message: 'What actions can reduce daytime HVAC power peaks?'
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reply).toBeDefined();
    expect(res.body.data.isMockFallback).toBe(true);
  });

  it('POST /api/ai/recommendations should return prescriptive sustainability actions', async () => {
    const res = await request(app).post('/api/ai/recommendations').send({
      domain: 'ENERGY'
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.recommendations)).toBe(true);
    expect(res.body.data.recommendations.length).toBeGreaterThan(0);
    expect(res.body.data.recommendations[0].title).toBeDefined();
  });

  it('POST /api/ai/waste-detection should accept image buffer and return detection', async () => {
    const tinyPngBuffer = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2d450000000049454e44ae426082', 'hex');

    const res = await request(app)
      .post('/api/ai/waste-detection')
      .attach('image', tinyPngBuffer, 'sample.png');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.wasteCategory).toBeDefined();
    expect(res.body.data.confidenceScore).toBeGreaterThanOrEqual(0.0);
    expect(res.body.data.confidenceScore).toBeLessThanOrEqual(1.0);
    expect(res.body.data.isModelEstimate).toBe(true);
    expect(res.body.data.isMockFallback).toBe(true);
  });

  it('should return 503 when AI service is unavailable and mock fallback is disabled', async () => {
    aiClient.mockFallback = false;

    const res = await request(app).post('/api/ai/chat').send({
      message: 'Analyze energy peaks'
    });

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('EXTERNAL_SERVICE_ERROR');
  });
});
