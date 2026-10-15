import { Router } from 'express';
import * as waterController from '../controllers/waterController.js';
import { validateRequest } from '../middleware/validate.js';
import {
  waterFilterQuerySchema,
  trendsQuerySchema,
  createWaterReadingSchema
} from '../validators/schemas.js';

const router = Router();

router.get('/', validateRequest(waterFilterQuerySchema), waterController.getWaterReadings);
router.get('/summary', validateRequest(waterFilterQuerySchema), waterController.getWaterSummary);
router.get('/trends', validateRequest(trendsQuerySchema), waterController.getWaterTrends);
router.post('/readings', validateRequest(createWaterReadingSchema), waterController.createWaterReading);

export default router;
