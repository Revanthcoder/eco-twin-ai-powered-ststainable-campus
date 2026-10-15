import * as settingService from '../services/settingService.js';
import { successResponse } from '../utils/response.js';

export async function getSettings(req, res, next) {
  try {
    const isAdminOrManager = req.user && ['ADMIN', 'FACILITY_MANAGER'].includes(req.user.role);
    const settings = await settingService.getAllSettings(isAdminOrManager);
    return successResponse(res, settings);
  } catch (err) {
    next(err);
  }
}

export async function updateSettings(req, res, next) {
  try {
    const updated = await settingService.updateSettings(req.body.settings);
    return successResponse(res, updated);
  } catch (err) {
    next(err);
  }
}
