import { config } from '../config/index.js';
import { ExternalServiceError } from '../utils/errors.js';

/**
 * AI Client Adapter for Person 3's Python Computer Vision and Generative AI Microservice.
 * Handles timeouts, network failures, and explicit mock fallbacks in dev mode.
 */
class AIClient {
  constructor() {
    this.baseUrl = config.AI_SERVICE_URL;
    this.timeoutMs = config.AI_SERVICE_TIMEOUT_MS;
    this.mockFallback = config.AI_MOCK_FALLBACK;
  }

  /**
   * Helper to perform fetch with configurable timeout
   */
  async _fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new ExternalServiceError('AI Service', `Request timed out after ${this.timeoutMs}ms`);
      }
      throw new ExternalServiceError('AI Service', `Failed to connect to ${this.baseUrl}: ${err.message}`);
    }
  }

  /**
   * Send image to Person 3's Waste Detection Computer Vision API
   * Endpoint on Person 3 service: POST /detect/waste
   */
  async detectWasteFromImage(fileBuffer, mimeType, originalName) {
    const url = `${this.baseUrl}/detect/waste`;

    try {
      // Build form-data
      const formData = new FormData();
      const blob = new Blob([fileBuffer], { type: mimeType });
      formData.append('file', blob, 'upload.jpg');

      const response = await this._fetchWithTimeout(url, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`AI service returned status ${response.status}`);
      }

      const result = await response.json();
      return {
        wasteCategory: result.category || 'UNKNOWN',
        confidenceScore: result.confidence || 0.0,
        isModelEstimate: true,
        isMockFallback: false,
        estimatedWeightKg: result.estimatedWeightKg || null,
        boundingBox: result.boundingBox || null,
        detectedItems: result.detectedItems || [],
        rawMetadata: result
      };
    } catch (err) {
      if (this.mockFallback && !config.isProd) {
        console.warn(`⚠️ [AIClient] Person 3 AI service unavailable (${err.message}). Returning EXPLICITLY LABELED development mock detection.`);
        return {
          wasteCategory: 'PLASTIC',
          confidenceScore: 0.89,
          isModelEstimate: true,
          isMockFallback: true,
          fallbackReason: `AI Service at ${this.baseUrl} was unreachable (${err.message})`,
          estimatedWeightKg: 0.15,
          boundingBox: { xmin: 140, ymin: 90, xmax: 320, ymax: 380 },
          detectedItems: [{ label: 'plastic_water_bottle', confidence: 0.89 }],
          rawMetadata: { notice: 'Development fallback mock. Start Person 3 Python service to enable live CV inference.' }
        };
      }
      throw err;
    }
  }

  /**
   * Send sustainability prompt to Person 3's GenAI / LLM chat endpoint
   * Endpoint on Person 3 service: POST /chat/sustainability
   */
  async chatWithSustainabilityAdvisor(message, conversationContext = []) {
    const url = `${this.baseUrl}/chat/sustainability`;

    try {
      const response = await this._fetchWithTimeout(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          context: conversationContext
        })
      });

      if (!response.ok) {
        throw new Error(`AI service returned HTTP ${response.status}`);
      }

      const result = await response.json();
      return {
        reply: result.reply,
        isMockFallback: false,
        modelName: result.modelName || 'CampusSustainabilityLLM',
        sources: result.sources || []
      };
    } catch (err) {
      if (this.mockFallback && !config.isProd) {
        console.warn(`⚠️ [AIClient] Person 3 AI chat service unavailable (${err.message}). Returning EXPLICITLY LABELED dev fallback.`);
        return {
          reply: `[DEV MOCK RESPONSE - Person 3 Python microservice not running at ${this.baseUrl}]: Based on campus telemetry, energy consumption peaks between 1 PM and 3 PM in the Science Complex. To optimize sustainability, consider precooling laboratory spaces during early morning hours when grid carbon intensity is lower.`,
          isMockFallback: true,
          fallbackReason: `AI Service at ${this.baseUrl} was unreachable (${err.message})`,
          modelName: 'CampusAdvisor-DevFallback',
          sources: ['Campus Energy Baseline Telemetry']
        };
      }
      throw err;
    }
  }

  /**
   * Request prescriptive AI recommendations for energy/water/waste optimization
   * Endpoint on Person 3 service: POST /recommendations/optimize
   */
  async getSustainabilityRecommendations(buildingId = null, domain = 'ALL') {
    const url = `${this.baseUrl}/recommendations/optimize`;

    try {
      const response = await this._fetchWithTimeout(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buildingId, domain })
      });

      if (!response.ok) {
        throw new Error(`AI service returned HTTP ${response.status}`);
      }

      const result = await response.json();
      return {
        recommendations: result.recommendations,
        isMockFallback: false
      };
    } catch (err) {
      if (this.mockFallback && !config.isProd) {
        console.warn(`⚠️ [AIClient] Person 3 AI recommendations service unavailable (${err.message}). Returning EXPLICITLY LABELED dev fallback.`);
        return {
          recommendations: [
            {
              id: 'REC-01',
              domain: 'ENERGY',
              title: 'Shift Autoclave Run Schedule to Off-Peak Hours',
              impactScore: 8.5,
              estimatedSavingsKwhPerMonth: 1200,
              estimatedCostSavingsUsd: 168.0,
              paybackPeriodMonths: 0,
              implementationDifficulty: 'LOW',
              description: 'Coordinate with lab staff in Science Complex to run sterilizers before 10 AM or after 6 PM.'
            },
            {
              id: 'REC-02',
              domain: 'WATER',
              title: 'Install Smart Flow Limiting Aerators in Dining Commons',
              impactScore: 7.2,
              estimatedSavingsLitresPerMonth: 45000,
              estimatedCostSavingsUsd: 90.0,
              paybackPeriodMonths: 2.5,
              implementationDifficulty: 'LOW',
              description: 'Retrofit dish preparation pre-rinse spray valves with 1.15 GPM low-flow aerators.'
            },
            {
              id: 'REC-03',
              domain: 'WASTE',
              title: 'Deploy AI Contamination Alerts at Student Center Sorting Stations',
              impactScore: 7.8,
              estimatedDiversionIncreasePct: 14.5,
              implementationDifficulty: 'MEDIUM',
              description: 'Provide real-time visual feedback when non-compostable plastics are dropped in organics bins.'
            }
          ],
          isMockFallback: true,
          fallbackReason: `AI Service at ${this.baseUrl} was unreachable (${err.message})`
        };
      }
      throw err;
    }
  }
}

export const aiClient = new AIClient();
