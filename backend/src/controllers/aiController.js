import { aiClient } from '../integrations/aiClient.js';
import * as wasteService from '../services/wasteService.js';
import { successResponse } from '../utils/response.js';
import { ValidationError } from '../utils/errors.js';

export async function detectWaste(req, res, next) {
  try {
    let fileBuffer;
    let mimeType = 'image/jpeg';
    let originalName = 'upload.jpg';

    if (req.file) {
      fileBuffer = req.file.buffer;
      mimeType = req.file.mimetype;
      originalName = req.file.originalname;
    } else if (req.body.imageUrl) {
      // Fetch image from URL safely
      const imgRes = await fetch(req.body.imageUrl);
      if (!imgRes.ok) throw new ValidationError('Could not download image from provided imageUrl');
      fileBuffer = Buffer.from(await imgRes.arrayBuffer());
      mimeType = imgRes.headers.get('content-type') || 'image/jpeg';
    } else {
      throw new ValidationError('Either an image file upload (field name: "image") or an "imageUrl" in request body is required');
    }

    // Call Person 3 AI microservice via adapter
    const aiResult = await aiClient.detectWasteFromImage(fileBuffer, mimeType, originalName);

    // Save detection event into database for campus waste telemetry
    const savedEvent = await wasteService.createWasteDetection({
      buildingId: req.body.buildingId || null,
      zoneId: req.body.zoneId || null,
      wasteCategory: aiResult.wasteCategory,
      confidenceScore: aiResult.confidenceScore,
      isModelEstimate: true,
      estimatedWeightKg: aiResult.estimatedWeightKg,
      boundingBoxJson: aiResult.boundingBox ? JSON.stringify(aiResult.boundingBox) : null,
      imageUrl: req.body.imageUrl || null,
      detectedBy: 'AI_CV',
      rawMetadata: JSON.stringify(aiResult.rawMetadata)
    });

    return successResponse(res, {
      detectionId: savedEvent.id,
      wasteCategory: aiResult.wasteCategory,
      confidenceScore: aiResult.confidenceScore,
      isModelEstimate: aiResult.isModelEstimate,
      isMockFallback: aiResult.isMockFallback,
      fallbackReason: aiResult.fallbackReason || null,
      boundingBox: aiResult.boundingBox,
      detectedItems: aiResult.detectedItems,
      estimatedWeightKg: aiResult.estimatedWeightKg,
      timestamp: savedEvent.timestamp
    }, 201);
  } catch (err) {
    next(err);
  }
}

export async function chatWithAdvisor(req, res, next) {
  try {
    const { message, conversationContext = [] } = req.body;
    const aiResult = await aiClient.chatWithSustainabilityAdvisor(message, conversationContext);
    return successResponse(res, aiResult);
  } catch (err) {
    next(err);
  }
}

export async function getRecommendations(req, res, next) {
  try {
    const { buildingId = null, domain = 'ALL' } = req.body;
    const result = await aiClient.getSustainabilityRecommendations(buildingId, domain);
    return successResponse(res, result);
  } catch (err) {
    next(err);
  }
}
