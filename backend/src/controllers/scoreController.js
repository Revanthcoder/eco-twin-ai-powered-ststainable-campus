import * as scoreService from '../services/scoreService.js';
import { successResponse } from '../utils/response.js';

export async function getCurrentScore(req, res, next) {
  try {
    const period = req.query.period || 'DAILY';
    const score = await scoreService.getCurrentSustainabilityScore(period);
    return successResponse(res, score);
  } catch (err) {
    next(err);
  }
}

export async function getScoreHistory(req, res, next) {
  try {
    const result = await scoreService.getSustainabilityScoreHistory(req.query);
    return successResponse(res, result.history, 200, { pagination: result.pagination });
  } catch (err) {
    next(err);
  }
}
