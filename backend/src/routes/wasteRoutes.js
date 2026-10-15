import { Router } from 'express';
import * as wasteController from '../controllers/wasteController.js';
import { validateRequest } from '../middleware/validate.js';
import {
  wasteFilterQuerySchema,
  wasteDetectionsQuerySchema,
  createWasteDetectionSchema
} from '../validators/schemas.js';

const router = Router();

router.get('/', validateRequest(wasteFilterQuerySchema), wasteController.getWasteRecords);
router.get('/summary', validateRequest(wasteFilterQuerySchema), wasteController.getWasteSummary);
router.get('/detections', validateRequest(wasteDetectionsQuerySchema), wasteController.getWasteDetections);
router.post('/detections', validateRequest(createWasteDetectionSchema), wasteController.createWasteDetection);

export default router;
