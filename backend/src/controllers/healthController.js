import * as healthService from '../services/healthService.js';
import { successResponse } from '../utils/response.js';

export async function getHealth(req, res, next) {
  try {
    const health = await healthService.getHealthStatus();
    const statusCode = health.status === 'HEALTHY' ? 200 : 503;
    return successResponse(res, health, statusCode);
  } catch (err) {
    next(err);
  }
}

export async function getSystemStatus(req, res, next) {
  try {
    const status = await healthService.getDetailedSystemStatus();
    return successResponse(res, status);
  } catch (err) {
    next(err);
  }
}
