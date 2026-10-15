import * as maintenanceService from '../services/maintenanceService.js';
import { successResponse } from '../utils/response.js';

export async function getMaintenanceTasks(req, res, next) {
  try {
    const result = await maintenanceService.getMaintenanceTasks(req.query);
    return successResponse(res, result.tasks, 200, { pagination: result.pagination });
  } catch (err) {
    next(err);
  }
}

export async function getMaintenanceTaskById(req, res, next) {
  try {
    const task = await maintenanceService.getMaintenanceTaskById(req.params.id);
    return successResponse(res, task);
  } catch (err) {
    next(err);
  }
}

export async function createMaintenanceTask(req, res, next) {
  try {
    const task = await maintenanceService.createMaintenanceTask(req.body, req.user);
    return successResponse(res, task, 201);
  } catch (err) {
    next(err);
  }
}

export async function updateMaintenanceTask(req, res, next) {
  try {
    const updated = await maintenanceService.updateMaintenanceTask(req.params.id, req.body, req.user);
    return successResponse(res, updated);
  } catch (err) {
    next(err);
  }
}
