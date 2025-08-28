import * as express from 'express';
import { LLMResponseService } from '../services/LLMResponseService';
import { OpenAIService } from '../services/OpenAIService';
import { asyncErrorHandler, validateRequest, aiRateLimit } from '../middleware';
import { ApiError, ErrorCode } from '../types/api';
import { z } from 'zod';

const router = express.Router();

// Validation schema for LLM response requests
const llmResponseSchema = z.object({
  userRequest: z.string().min(1, 'User request is required').max(1000, 'Request too long'),
  contextAnalysis: z.any(), // More flexible validation for context analysis
  responseType: z.enum(['explanation', 'formula', 'steps', 'analysis', 'general']).optional(),
  includeCode: z.boolean().optional(),
  includeExamples: z.boolean().optional()
});

/**
 * POST /api/v1/generate-response
 * Generates an LLM response based on context and user request
 */
router.post('/generate-response',
  aiRateLimit, // Apply AI-specific rate limiting
  validateRequest(llmResponseSchema),
  asyncErrorHandler(async (req, res) => {
    const startTime = Date.now();
    const requestId = `llm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      console.log('Generating LLM response for request:', req.body.userRequest);

      // Get OpenAI service
      const openAIService = req.app.locals['openAIService'] as OpenAIService | undefined;
      
      if (!openAIService) {
        const error: ApiError = {
          code: ErrorCode.AI_SERVICE_UNAVAILABLE,
          message: 'OpenAI service is not available',
          details: { reason: 'OpenAI service not initialized' },
          suggestions: [
            'Check if OpenAI API key is configured',
            'Verify OpenAI service is running',
            'Try again later'
          ],
          timestamp: new Date().toISOString()
        };

        return res.status(503).json({
          success: false,
          error,
          requestId,
          processingTime: Date.now() - startTime
        });
      }

      // Initialize LLM Response Service
      const llmResponseService = new LLMResponseService(openAIService);

      // Generate response
      const llmResponse = await llmResponseService.generateResponse({
        userRequest: req.body.userRequest,
        contextAnalysis: req.body.contextAnalysis,
        responseType: req.body.responseType || 'general',
        includeCode: req.body.includeCode || true,
        includeExamples: req.body.includeExamples || true
      });

      const processingTime = Date.now() - startTime;

      console.log('LLM response generated successfully');

      return res.status(200).json({
        success: true,
        data: {
          ...llmResponse,
          requestId,
          processingTime
        },
        requestId,
        processingTime
      });

    } catch (error) {
      console.error('LLM response generation error:', error);

      let apiError: ApiError;

      if (error.message?.includes('rate limit')) {
        apiError = {
          code: ErrorCode.RATE_LIMIT_EXCEEDED,
          message: 'OpenAI API rate limit exceeded',
          details: { error: error.message },
          suggestions: [
            'Wait a moment before trying again',
            'Try a shorter or simpler request'
          ],
          timestamp: new Date().toISOString()
        };
      } else if (error.message?.includes('API key')) {
        apiError = {
          code: ErrorCode.AI_SERVICE_UNAVAILABLE,
          message: 'OpenAI API authentication failed',
          details: { error: error.message },
          suggestions: [
            'Check if OpenAI API key is valid',
            'Verify API key has sufficient credits'
          ],
          timestamp: new Date().toISOString()
        };
      } else {
        apiError = {
          code: ErrorCode.AI_SERVICE_UNAVAILABLE,
          message: 'Failed to generate response',
          details: { error: error.message },
          suggestions: [
            'Try rephrasing your request',
            'Check your internet connection',
            'Try again in a moment'
          ],
          timestamp: new Date().toISOString()
        };
      }

      return res.status(503).json({
        success: false,
        error: apiError,
        requestId,
        processingTime: Date.now() - startTime
      });
    }
  })
);

export default router;