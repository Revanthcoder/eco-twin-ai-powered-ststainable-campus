import { Router } from 'express';
import * as carbonController from '../controllers/carbonController.js';
import { validateRequest } from '../middleware/validate.js';
import { energyFilterQuerySchema, trendsQuerySchema } from '../validators/schemas.js';

const router = Router();

router.get('/', validateRequest(energyFilterQuerySchema), carbonController.getCarbonFootprint);
router.get('/trends', validateRequest(trendsQuerySchema), carbonController.getCarbonTrends);

export default router;
