import { Router } from 'express';
import * as alertController from '../controllers/alertController.js';
import { validateRequest } from '../middleware/validate.js';
import { optionalAuth } from '../middleware/auth.js';
import {
  alertFilterQuerySchema,
  alertIdParamSchema,
  updateAlertSchema,
  evaluateAlertsSchema
} from '../validators/schemas.js';

const router = Router();

router.get('/', validateRequest(alertFilterQuerySchema), alertController.getAlerts);
router.get('/:id', validateRequest(alertIdParamSchema), alertController.getAlertById);
router.patch('/:id', optionalAuth, validateRequest(updateAlertSchema), alertController.updateAlert);
router.post('/evaluate', validateRequest(evaluateAlertsSchema), alertController.evaluateAlerts);

export default router;
