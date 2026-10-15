import * as alertService from '../services/alertService.js';
import { successResponse } from '../utils/response.js';

export async function getAlerts(req, res, next) {
  try {
    const result = await alertService.getAlerts(req.query);
    return successResponse(res, result.alerts, 200, { pagination: result.pagination });
  } catch (err) {
    next(err);
  }
}

export async function getAlertById(req, res, next) {
  try {
    const alert = await alertService.getAlertById(req.params.id);
    return successResponse(res, alert);
  } catch (err) {
    next(err);
  }
}

export async function updateAlert(req, res, next) {
  try {
    const updated = await alertService.updateAlertStatus(req.params.id, req.body, req.user);
    return successResponse(res, updated);
  } catch (err) {
    next(err);
  }
}

export async function evaluateAlerts(req, res, next) {
  try {
    const result = await alertService.evaluateSustainabilityRules(req.body);
    return successResponse(res, result);
  } catch (err) {
    next(err);
  }
}
