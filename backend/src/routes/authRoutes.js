import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { validateRequest } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { loginSchema } from '../validators/schemas.js';

const router = Router();

router.post('/login', authLimiter, validateRequest(loginSchema), authController.login);
router.get('/me', authenticate, authController.getCurrentUser);

export default router;
