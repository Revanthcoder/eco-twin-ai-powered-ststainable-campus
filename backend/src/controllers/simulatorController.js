import * as simulatorService from '../services/simulatorService.js';
import { successResponse } from '../utils/response.js';

export async function runSimulation(req, res, next) {
  try {
    const userId = req.user?.id || null;
    const result = await simulatorService.runSimulation(req.body, userId);
    return successResponse(res, result, 201);
  } catch (err) {
    next(err);
  }
}

export async function getSimulationById(req, res, next) {
  try {
    const scenario = await simulatorService.getSimulationById(req.params.id);
    return successResponse(res, scenario);
  } catch (err) {
    next(err);
  }
}
