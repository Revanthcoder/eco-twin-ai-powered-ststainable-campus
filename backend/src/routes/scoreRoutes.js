import { Router } from 'express';
import * as scoreController from '../controllers/scoreController.js';

const router = Router();

router.get('/', scoreController.getCurrentScore);
router.get('/history', scoreController.getScoreHistory);

export default router;
