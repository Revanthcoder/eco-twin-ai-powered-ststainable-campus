import { Router } from 'express';
import multer from 'multer';
import * as aiController from '../controllers/aiController.js';
import { validateRequest } from '../middleware/validate.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import { aiChatSchema, aiRecommendationsSchema } from '../validators/schemas.js';
import { ValidationError } from '../utils/errors.js';

const router = Router();

// Configure safe in-memory file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new ValidationError('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
    }
    cb(null, true);
  }
});

// AI Endpoints with rate limiting
router.post('/waste-detection', aiLimiter, upload.single('image'), aiController.detectWaste);
router.post('/chat', aiLimiter, validateRequest(aiChatSchema), aiController.chatWithAdvisor);
router.post('/recommendations', aiLimiter, validateRequest(aiRecommendationsSchema), aiController.getRecommendations);

export default router;
