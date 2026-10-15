import * as carbonService from '../services/carbonService.js';
import { successResponse } from '../utils/response.js';

export async function getCarbonFootprint(req, res, next) {
  try {
    const footprint = await carbonService.getCarbonFootprint(req.query);
    return successResponse(res, footprint);
  } catch (err) {
    next(err);
  }
}

export async function getCarbonTrends(req, res, next) {
  try {
    const trends = await carbonService.getCarbonTrends(req.query);
    return successResponse(res, trends);
  } catch (err) {
    next(err);
  }
}
