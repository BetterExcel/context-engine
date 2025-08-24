import * as express from 'express';
import { FeedbackRepository } from '../database/repositories/FeedbackRepository';
import { CreateFeedback } from '../database/models/Feedback';
import { LearningEngine } from '../services/LearningEngine';
import { RecommendationService } from '../services/RecommendationService';
import { validateRequest, asyncErrorHandler } from '../middleware';
import { z } from 'zod';
import {
  FeedbackRequest,
  FeedbackResponse,
  ApiError,
  ErrorCode,
  PaginatedResponse
} from '../types/api';

const router = express.Router();
const feedbackRepository = new FeedbackRepository();
const learningEngine = new LearningEngine();
const recommendationService = new RecommendationService();

// Validation schemas
const submitFeedbackSchema = z.object({
  requestId: z.string().uuid(),
  contextId: z.string().uuid(),
  satisfaction: z.number().int().min(1).max(5),
  feedback: z.string().optional(),
  corrections: z.array(z.object({
    field: z.string(),
    expectedValue: z.any(),
    actualValue: z.any(),
    importance: z.enum(['low', 'medium', 'high'])
  })).optional()
});

const getFeedbackSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  minRating: z.number().int().min(1).max(5).optional(),
  maxRating: z.number().int().min(1).max(5).optional(),
  hasComments: z.boolean().optional()
});

/**
 * POST /api/v1/feedback
 * Submit feedback for a context prediction
 */
router.post('/feedback',
  validateRequest(submitFeedbackSchema),
  asyncErrorHandler(async (req, res) => {
    const startTime = Date.now();
    const requestId = `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const feedbackData: FeedbackRequest = req.body;

      // Create feedback record
      const createFeedback: CreateFeedback = {
        request_id: feedbackData.requestId,
        predicted_context: {}, // Will be populated from context history
        actual_context: feedbackData.corrections ? 
          feedbackData.corrections.reduce((acc, correction) => {
            acc[correction.field] = correction.expectedValue;
            return acc;
          }, {} as Record<string, any>) : undefined,
        user_satisfaction: feedbackData.satisfaction,
        comments: feedbackData.feedback,
        metadata: {
          contextId: feedbackData.contextId,
          corrections: feedbackData.corrections,
          submittedAt: new Date().toISOString()
        }
      };

      const feedback = await feedbackRepository.create(createFeedback);

      // Process feedback through learning engine
      const learningApplied = await learningEngine.processFeedback(feedback);

      // Update recommendation system
      await recommendationService.updateFromFeedback(feedback);

      const response: FeedbackResponse = {
        success: true,
        message: 'Feedback submitted successfully',
        learningApplied,
        requestId
      };

      return res.status(200).json(response);

    } catch (error) {
      console.error('Feedback submission error:', error);

      const apiError: ApiError = {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to submit feedback',
        details: { error: error instanceof Error ? error.message : String(error) },
        timestamp: new Date().toISOString()
      };

      const response: FeedbackResponse = {
        success: false,
        message: apiError.message,
        learningApplied: false,
        requestId
      };

      return res.status(500).json(response);
    }
  })
);

/**
 * GET /api/v1/feedback
 * Get feedback entries with filtering and pagination
 */
router.get('/feedback',
  validateRequest(getFeedbackSchema, 'query'),
  asyncErrorHandler(async (req, res) => {
    try {
      const { page, limit, minRating, maxRating, hasComments } = req.query as any;

      // TODO: Implement query method in FeedbackRepository
      // Temporary implementation - return empty results
      const feedback = [];
      const total = 0;

      const response: PaginatedResponse<typeof feedback[0]> = {
        data: feedback,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      };

      return res.status(200).json({
        success: true,
        ...response
      });

    } catch (error) {
      console.error('Feedback retrieval error:', error);

      const apiError: ApiError = {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve feedback',
        details: { error: error instanceof Error ? error.message : String(error) },
        timestamp: new Date().toISOString()
      };

      return res.status(500).json({
        success: false,
        error: apiError
      });
    }
  })
);

/**
 * GET /api/v1/feedback/stats
 * Get feedback statistics for learning insights
 */
router.get('/feedback/stats',
  asyncErrorHandler(async (req, res) => {
    try {
      const stats = await feedbackRepository.getFeedbackStats();
      const learningInsights = await learningEngine.generateInsights();

      return res.status(200).json({
        success: true,
        data: {
          ...stats,
          learningInsights
        }
      });

    } catch (error) {
      console.error('Feedback stats error:', error);

      const apiError: ApiError = {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve feedback statistics',
        details: { error: error instanceof Error ? error.message : String(error) },
        timestamp: new Date().toISOString()
      };

      return res.status(500).json({
        success: false,
        error: apiError
      });
    }
  })
);

/**
 * GET /api/v1/feedback/recommendations
 * Get recommendations based on similar requests
 */
router.get('/feedback/recommendations',
  asyncErrorHandler(async (req, res) => {
    try {
      const { request, intent, contextType } = req.query;

      if (!request || typeof request !== 'string') {
        const apiError: ApiError = {
          code: ErrorCode.MISSING_PARAMETERS,
          message: 'Request parameter is required',
          details: { parameter: 'request' },
          timestamp: new Date().toISOString()
        };

        return res.status(400).json({
          success: false,
          error: apiError
        });
      }

      const recommendations = await recommendationService.getRecommendations({
        request: request as string,
        intent: intent as string,
        contextType: contextType as string
      });

      return res.status(200).json({
        success: true,
        data: {
          recommendations,
          count: recommendations.length
        }
      });

    } catch (error) {
      console.error('Recommendations error:', error);

      const apiError: ApiError = {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve recommendations',
        details: { error: error instanceof Error ? error.message : String(error) },
        timestamp: new Date().toISOString()
      };

      return res.status(500).json({
        success: false,
        error: apiError
      });
    }
  })
);

/**
 * POST /api/v1/feedback/learn
 * Trigger learning process from accumulated feedback
 */
router.post('/feedback/learn',
  asyncErrorHandler(async (req, res) => {
    try {
      const { minFeedbackCount = 10, minSatisfactionRating = 3 } = req.body;

      const learningResults = await learningEngine.processAccumulatedFeedback({
        minFeedbackCount,
        minSatisfactionRating
      });

      return res.status(200).json({
        success: true,
        data: learningResults,
        message: 'Learning process completed successfully'
      });

    } catch (error) {
      console.error('Learning process error:', error);

      const apiError: ApiError = {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to process learning',
        details: { error: error instanceof Error ? error.message : String(error) },
        timestamp: new Date().toISOString()
      };

      return res.status(500).json({
        success: false,
        error: apiError
      });
    }
  })
);

export default router;