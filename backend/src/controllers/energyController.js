import * as energyService from '../services/energyService.js';
import { successResponse } from '../utils/response.js';

export async function getEnergyReadings(req, res, next) {
  try {
    const result = await energyService.getEnergyReadings(req.query);
    return successResponse(res, result.readings, 200, { pagination: result.pagination });
  } catch (err) {
    next(err);
  }
}

export async function getEnergySummary(req, res, next) {
  try {
    const summary = await energyService.getEnergySummary(req.query);
    return successResponse(res, summary);
  } catch (err) {
    next(err);
  }
}

export async function getEnergyTrends(req, res, next) {
  try {
    const trends = await energyService.getEnergyTrends(req.query);
    return successResponse(res, trends);
  } catch (err) {
    next(err);
  }
}

export async function createEnergyReading(req, res, next) {
  try {
    const reading = await energyService.createEnergyReading(req.body);
    return successResponse(res, reading, 201);
  } catch (err) {
    next(err);
  }
}
