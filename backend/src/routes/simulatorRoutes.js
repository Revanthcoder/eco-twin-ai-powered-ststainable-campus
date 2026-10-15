import { Router } from 'express';
import * as simulatorController from '../controllers/simulatorController.js';
import { validateRequest } from '../middleware/validate.js';
import { optionalAuth } from '../middleware/auth.js';
import { runSimulationSchema, idParamSchema } from '../validators/schemas.js';

const router = Router();

router.post('/', optionalAuth, validateRequest(runSimulationSchema), simulatorController.runSimulation);
router.get('/:id', simulatorController.getSimulationById);

export default router;
