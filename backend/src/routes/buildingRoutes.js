import { Router } from 'express';
import * as buildingController from '../controllers/buildingController.js';
import { validateRequest } from '../middleware/validate.js';
import { getBuildingsQuerySchema, buildingIdParamSchema } from '../validators/schemas.js';

const router = Router();

router.get('/', validateRequest(getBuildingsQuerySchema), buildingController.getBuildings);
router.get('/:id', validateRequest(buildingIdParamSchema), buildingController.getBuildingById);
router.get('/:id/metrics', validateRequest(buildingIdParamSchema), buildingController.getBuildingMetrics);

export default router;
