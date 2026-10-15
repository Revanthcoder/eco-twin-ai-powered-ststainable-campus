import * as dashboardService from '../services/dashboardService.js';
import { successResponse } from '../utils/response.js';

export async function getDashboard(req, res, next) {
  try {
    const overview = await dashboardService.getDashboardOverview(req.query);
    return successResponse(res, overview);
  } catch (err) {
    next(err);
  }
}

export async function getDashboardTrends(req, res, next) {
  try {
    const trends = await dashboardService.getDashboardTrends(req.query);
    return successResponse(res, trends);
  } catch (err) {
    next(err);
  }
}

export async function getBuildingComparison(req, res, next) {
  try {
    const comparison = await dashboardService.getBuildingComparison();
    return successResponse(res, comparison);
  } catch (err) {
    next(err);
  }
}
