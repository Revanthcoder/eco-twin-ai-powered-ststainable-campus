import * as reportService from '../services/reportService.js';
import { successResponse } from '../utils/response.js';

export async function getReports(req, res, next) {
  try {
    const result = await reportService.getReports(req.query);
    return successResponse(res, result.reports, 200, { pagination: result.pagination });
  } catch (err) {
    next(err);
  }
}

export async function getReportById(req, res, next) {
  try {
    const report = await reportService.getReportById(req.params.id);
    return successResponse(res, report);
  } catch (err) {
    next(err);
  }
}

export async function createReport(req, res, next) {
  try {
    const report = await reportService.generateReport(req.body, req.user);
    return successResponse(res, report, 201);
  } catch (err) {
    next(err);
  }
}
