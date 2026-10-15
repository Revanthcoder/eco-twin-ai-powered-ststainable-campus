import * as waterService from '../services/waterService.js';
import { successResponse } from '../utils/response.js';

export async function getWaterReadings(req, res, next) {
  try {
    const result = await waterService.getWaterReadings(req.query);
    return successResponse(res, result.readings, 200, { pagination: result.pagination });
  } catch (err) {
    next(err);
  }
}

export async function getWaterSummary(req, res, next) {
  try {
    const summary = await waterService.getWaterSummary(req.query);
    return successResponse(res, summary);
  } catch (err) {
    next(err);
  }
}

export async function getWaterTrends(req, res, next) {
  try {
    const trends = await waterService.getWaterTrends(req.query);
    return successResponse(res, trends);
  } catch (err) {
    next(err);
  }
}

export async function createWaterReading(req, res, next) {
  try {
    const reading = await waterService.createWaterReading(req.body);
    return successResponse(res, reading, 201);
  } catch (err) {
    next(err);
  }
}
