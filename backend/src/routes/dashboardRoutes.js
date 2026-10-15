import { Router } from 'express';
import * as dashboardController from '../controllers/dashboardController.js';
import { validateRequest } from '../middleware/validate.js';
import { energyFilterQuerySchema, trendsQuerySchema } from '../validators/schemas.js';

const router = Router();

router.get('/', validateRequest(energyFilterQuerySchema), dashboardController.getDashboard);
router.get('/trends', validateRequest(trendsQuerySchema), dashboardController.getDashboardTrends);
router.get('/building-comparison', dashboardController.getBuildingComparison);

export default router;
