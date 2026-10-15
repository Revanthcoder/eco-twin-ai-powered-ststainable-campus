import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Authentication and RBAC Endpoints', () => {
  let adminToken = '';

  it('POST /api/auth/login should authenticate seeded admin and return JWT', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@campus.edu',
      password: 'CampusPass2026!'
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('ADMIN');
    adminToken = res.body.data.token;
  });

  it('POST /api/auth/login should reject incorrect password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@campus.edu',
      password: 'WrongPassword123!'
    });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/auth/me should return authenticated user profile', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('admin@campus.edu');
  });

  it('PATCH /api/settings should reject unauthorized access without token', async () => {
    const res = await request(app).patch('/api/settings').send({
      settings: [{ key: 'GRID_EMISSION_FACTOR', value: '0.78' }]
    });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('PATCH /api/settings should allow authorized ADMIN to update setting', async () => {
    const res = await request(app)
      .patch('/api/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        settings: [{ key: 'GRID_EMISSION_FACTOR', value: '0.85' }]
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
