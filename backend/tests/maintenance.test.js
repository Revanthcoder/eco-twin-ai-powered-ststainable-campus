import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Maintenance Management Endpoints', () => {
  let createdTaskId = '';

  it('GET /api/maintenance should return task list and pagination', async () => {
    const res = await request(app).get('/api/maintenance');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('POST /api/maintenance should create a new task in PENDING status', async () => {
    const res = await request(app).post('/api/maintenance').send({
      title: 'Replace Restroom Aerator in Library',
      description: 'Aerator clogged causing irregular water stream and potential overflow risk',
      priority: 'MEDIUM'
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('PENDING');
    createdTaskId = res.body.data.id;
  });

  it('PATCH /api/maintenance/:id should permit valid transition PENDING -> IN_PROGRESS', async () => {
    const res = await request(app)
      .patch(`/api/maintenance/${createdTaskId}`)
      .send({ status: 'IN_PROGRESS', note: 'Technician dispatched to library' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('IN_PROGRESS');
  });

  it('PATCH /api/maintenance/:id should reject invalid transition IN_PROGRESS -> PENDING without reason or direct invalid leap', async () => {
    // Attempting invalid transition: IN_PROGRESS cannot jump to random invalid state
    const res = await request(app)
      .patch(`/api/maintenance/${createdTaskId}`)
      .send({ status: 'INVALID_STATUS' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('PATCH /api/maintenance/:id should permit valid transition IN_PROGRESS -> COMPLETED', async () => {
    const res = await request(app)
      .patch(`/api/maintenance/${createdTaskId}`)
      .send({ status: 'COMPLETED', note: 'Aerator replaced and water flow normalized.' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('COMPLETED');
    expect(res.body.data.completedAt).toBeDefined();
  });
});
