import { Router } from 'express';
import * as healthController from '../controllers/healthController.js';

const router = Router();

router.get('/health', healthController.getHealth);
router.get('/system/status', healthController.getSystemStatus);

export default router;
