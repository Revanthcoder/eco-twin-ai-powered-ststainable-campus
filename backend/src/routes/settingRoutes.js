import { Router } from 'express';
import * as settingController from '../controllers/settingController.js';
import { validateRequest } from '../middleware/validate.js';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.js';
import { updateSettingsSchema } from '../validators/schemas.js';

const router = Router();

router.get('/', optionalAuth, settingController.getSettings);
router.patch(
  '/',
  authenticate,
  authorize(['ADMIN', 'FACILITY_MANAGER']),
  validateRequest(updateSettingsSchema),
  settingController.updateSettings
);

export default router;
