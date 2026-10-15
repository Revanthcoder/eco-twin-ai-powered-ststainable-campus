import { Router } from 'express';
import * as maintenanceController from '../controllers/maintenanceController.js';
import { validateRequest } from '../middleware/validate.js';
import { optionalAuth } from '../middleware/auth.js';
import {
  maintenanceFilterQuerySchema,
  idParamSchema,
  createMaintenanceTaskSchema,
  updateMaintenanceTaskSchema
} from '../validators/schemas.js';

const router = Router();

router.get('/', validateRequest(maintenanceFilterQuerySchema), maintenanceController.getMaintenanceTasks);
router.post('/', optionalAuth, validateRequest(createMaintenanceTaskSchema), maintenanceController.createMaintenanceTask);
router.get('/:id', maintenanceController.getMaintenanceTaskById);
router.patch('/:id', optionalAuth, validateRequest(updateMaintenanceTaskSchema), maintenanceController.updateMaintenanceTask);

export default router;
