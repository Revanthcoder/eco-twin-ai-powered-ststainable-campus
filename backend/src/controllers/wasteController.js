import * as wasteService from '../services/wasteService.js';
import { successResponse } from '../utils/response.js';

export async function getWasteRecords(req, res, next) {
  try {
    const result = await wasteService.getWasteRecords(req.query);
    return successResponse(res, result.records, 200, { pagination: result.pagination });
  } catch (err) {
    next(err);
  }
}

export async function getWasteSummary(req, res, next) {
  try {
    const summary = await wasteService.getWasteSummary(req.query);
    return successResponse(res, summary);
  } catch (err) {
    next(err);
  }
}

export async function getWasteDetections(req, res, next) {
  try {
    const result = await wasteService.getWasteDetections(req.query);
    return successResponse(res, result.detections, 200, { pagination: result.pagination });
  } catch (err) {
    next(err);
  }
}

export async function createWasteDetection(req, res, next) {
  try {
    const detection = await wasteService.createWasteDetection(req.body);
    return successResponse(res, detection, 201);
  } catch (err) {
    next(err);
  }
}
