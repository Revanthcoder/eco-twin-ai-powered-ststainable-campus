import { Router } from 'express';
import * as buildingController from '../controllers/buildingController.js';
import { validateRequest } from '../middleware/validate.js';
import { getZonesQuerySchema, zoneIdParamSchema } from '../validators/schemas.js';

const router = Router();

router.get('/', validateRequest(getZonesQuerySchema), buildingController.getZones);
router.get('/:id', validateRequest(zoneIdParamSchema), buildingController.getZoneById);

export default router;
