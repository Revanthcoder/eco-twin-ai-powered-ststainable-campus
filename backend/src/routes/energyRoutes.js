import { Router } from 'express';
import * as energyController from '../controllers/energyController.js';
import { validateRequest } from '../middleware/validate.js';
import {
  energyFilterQuerySchema,
  trendsQuerySchema,
  createEnergyReadingSchema
} from '../validators/schemas.js';

const router = Router();

router.get('/', validateRequest(energyFilterQuerySchema), energyController.getEnergyReadings);
router.get('/summary', validateRequest(energyFilterQuerySchema), energyController.getEnergySummary);
router.get('/trends', validateRequest(trendsQuerySchema), energyController.getEnergyTrends);
router.post('/readings', validateRequest(createEnergyReadingSchema), energyController.createEnergyReading);

export default router;
