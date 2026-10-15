import { Router } from 'express';
import * as reportController from '../controllers/reportController.js';
import { validateRequest } from '../middleware/validate.js';
import { optionalAuth } from '../middleware/auth.js';
import { createReportSchema, idParamSchema } from '../validators/schemas.js';

const router = Router();

router.get('/', reportController.getReports);
router.post('/', optionalAuth, validateRequest(createReportSchema), reportController.createReport);
router.get('/:id', reportController.getReportById);

export default router;
