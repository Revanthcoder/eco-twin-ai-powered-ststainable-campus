import * as buildingService from '../services/buildingService.js';
import { successResponse } from '../utils/response.js';

export async function getBuildings(req, res, next) {
  try {
    const buildings = await buildingService.getAllBuildings(req.query);
    return successResponse(res, buildings, 200, { total: buildings.length });
  } catch (err) {
    next(err);
  }
}

export async function getBuildingById(req, res, next) {
  try {
    const building = await buildingService.getBuildingById(req.params.id);
    return successResponse(res, building);
  } catch (err) {
    next(err);
  }
}

export async function getBuildingMetrics(req, res, next) {
  try {
    const metrics = await buildingService.getBuildingMetrics(req.params.id, req.query);
    return successResponse(res, metrics);
  } catch (err) {
    next(err);
  }
}

export async function getZones(req, res, next) {
  try {
    const zones = await buildingService.getAllZones(req.query);
    return successResponse(res, zones, 200, { total: zones.length });
  } catch (err) {
    next(err);
  }
}

export async function getZoneById(req, res, next) {
  try {
    const zone = await buildingService.getZoneById(req.params.id);
    return successResponse(res, zone);
  } catch (err) {
    next(err);
  }
}
