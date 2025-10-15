import request from 'supertest';
import express from 'express';
import feedbackRoutes from '../feedback';
import { FeedbackRepository } from '../../database/repositories/FeedbackRepository';
import { LearningEngine } from '../../services/LearningEngine';
import { RecommendationService } from '../../services/RecommendationService';

// Mock dependencies
jest.mock('../../database/repositories/FeedbackRepository');
jest.mock('../../services/LearningEngine');
jest.mock('../../services/RecommendationService');

const MockedFeedbackRepository = FeedbackRepository as jest.MockedClass<typeof FeedbackRepository>;
const MockedLearningEngine = LearningEngine as jest.MockedClass<typeof LearningEngine>;
const MockedRecommendationService = RecommendationService as jest.MockedClass<typeof RecommendationService>;

describe('Feedback Routes', () => {
  let app: express.Application;
  let mockFeedbackRepository: jest.Mocked<FeedbackRepository>;
  let mockLearningEngine: jest.Mocked<LearningEngine>;
  let mockRecommendationService: jest.Mocked<RecommendationService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    app = express();
    app.use(express.json());
    app.use('/api/v1', feedbackRoutes);

    // Setup mocks
    mockFeedbackRepository = new MockedFeedbackRepository() as jest.Mocked<FeedbackRepository>;
    mockLearningEngine = new MockedLearningEngine() as jest.Mocked<LearningEngine>;
    mockRecommendationService = new MockedRecommendationService() as jest.Mocked<RecommendationService>;
  });

  describe('POST /api/v1/feedback', () => {
    it('should submit feedback successfully', async () => {
      const feedbackData = {
        requestId: '123e4567-e89b-12d3-a456-426614174000',
        contextId: '123e4567-e89b-12d3-a456-426614174001',
        satisfaction: 5,
        feedback: 'Great context!',
        corrections: []
      };

      const mockCreatedFeedback = {
        id: '123e4567-e89b-12d3-a456-426614174002',
        request_id: feedbackData.requestId,
        predicted_context: {},
        user_satisfaction: feedbackData.satisfaction,
        comments: feedbackData.feedback,
        metadata: {
          contextId: feedbackData.contextId,
          corrections: feedbackData.corrections,
          submittedAt: expect.any(String)
        },
        created_at: new Date()
      };

      mockFeedbackRepository.create.mockResolvedValue(mockCreatedFeedback);
      mockLearningEngine.processFeedback.mockResolvedValue(true);
      mockRecommendationService.updateFromFeedback.mockResolvedValue();

      const response = await request(app)
        .post('/api/v1/feedback')
        .send(feedbackData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Feedback submitted successfully');
      expect(response.body.learningApplied).toBe(true);
      expect(mockFeedbackRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          request_id: feedbackData.requestId,
          user_satisfaction: feedbackData.satisfaction,
          comments: feedbackData.feedback
        })
      );
      expect(mockLearningEngine.processFeedback).toHaveBeenCalledWith(mockCreatedFeedback);
      expect(mockRecommendationService.updateFromFeedback).toHaveBeenCalledWith(mockCreatedFeedback);
    });

    it('should submit feedback with corrections', async () => {
      const feedbackData = {
        requestId: '123e4567-e89b-12d3-a456-426614174000',
        contextId: '123e4567-e89b-12d3-a456-426614174001',
        satisfaction: 2,
        feedback: 'Wrong intent detected',
        corrections: [
          {
            field: 'intent',
            expectedValue: 'formula_assistance',
            actualValue: 'data_analysis',
            importance: 'high' as const
          }
        ]
      };

      const mockCreatedFeedback = {
        id: '123e4567-e89b-12d3-a456-426614174002',
        request_id: feedbackData.requestId,
        predicted_context: {},
        actual_context: { intent: 'formula_assistance' },
        user_satisfaction: feedbackData.satisfaction,
        comments: feedbackData.feedback,
        metadata: {
          contextId: feedbackData.contextId,
          corrections: feedbackData.corrections,
          submittedAt: expect.any(String)
        },
        created_at: new Date()
      };

      mockFeedbackRepository.create.mockResolvedValue(mockCreatedFeedback);
      mockLearningEngine.processFeedback.mockResolvedValue(true);
      mockRecommendationService.updateFromFeedback.mockResolvedValue();

      const response = await request(app)
        .post('/api/v1/feedback')
        .send(feedbackData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockFeedbackRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actual_context: { intent: 'formula_assistance' }
        })
      );
    });

    it('should validate required fields', async () => {
      const invalidData = {
        requestId: 'invalid-uuid',
        satisfaction: 6, // Invalid range
        contextId: '123e4567-e89b-12d3-a456-426614174001'
      };

      await request(app)
        .post('/api/v1/feedback')
        .send(invalidData)
        .expect(400);
    });

    it('should handle database errors', async () => {
      const feedbackData = {
        requestId: '123e4567-e89b-12d3-a456-426614174000',
        contextId: '123e4567-e89b-12d3-a456-426614174001',
        satisfaction: 4
      };

      mockFeedbackRepository.create.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/v1/feedback')
        .send(feedbackData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.learningApplied).toBe(false);
    });
  });

  describe('GET /api/v1/feedback', () => {
    it('should retrieve feedback with pagination', async () => {
      const mockFeedback = [
        {
          id: '1',
          request_id: 'req-1',
          user_satisfaction: 5,
          comments: 'Great!',
          created_at: new Date()
        },
        {
          id: '2',
          request_id: 'req-2',
          user_satisfaction: 4,
          comments: 'Good',
          created_at: new Date()
        }
      ];

      // Mock the query builder chain
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        whereNotNull: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        clone: jest.fn().mockReturnThis(),
        count: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ count: '2' }),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue(mockFeedback)
      };

      (mockFeedbackRepository as any).query = jest.fn().mockReturnValue(mockQuery);

      const response = await request(app)
        .get('/api/v1/feedback?page=1&limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockFeedback);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      });
    });

    it('should filter feedback by rating', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        whereNotNull: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        clone: jest.fn().mockReturnThis(),
        count: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ count: '1' }),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue([])
      };

      (mockFeedbackRepository as any).query = jest.fn().mockReturnValue(mockQuery);

      await request(app)
        .get('/api/v1/feedback?minRating=4&maxRating=5')
        .expect(200);

      expect(mockQuery.where).toHaveBeenCalledWith('user_satisfaction', '>=', 4);
      expect(mockQuery.where).toHaveBeenCalledWith('user_satisfaction', '<=', 5);
    });

    it('should filter feedback by comments', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        whereNotNull: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        clone: jest.fn().mockReturnThis(),
        count: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ count: '1' }),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue([])
      };

      (mockFeedbackRepository as any).query = jest.fn().mockReturnValue(mockQuery);

      await request(app)
        .get('/api/v1/feedback?hasComments=true')
        .expect(200);

      expect(mockQuery.whereNotNull).toHaveBeenCalledWith('comments');
      expect(mockQuery.where).toHaveBeenCalledWith('comments', '!=', '');
    });
  });

  describe('GET /api/v1/feedback/stats', () => {
    it('should return feedback statistics', async () => {
      const mockStats = {
        total: 100,
        avgSatisfaction: 4.2,
        satisfactionDistribution: { 1: 5, 2: 10, 3: 15, 4: 35, 5: 35 },
        withComments: 60
      };

      const mockInsights = [
        {
          type: 'success' as const,
          title: 'High User Satisfaction',
          description: 'Users are satisfied with context quality',
          impact: 'high' as const,
          actionable: true,
          recommendations: ['Continue current approach']
        }
      ];

      mockFeedbackRepository.getFeedbackStats.mockResolvedValue(mockStats);
      mockLearningEngine.generateInsights.mockResolvedValue(mockInsights);

      const response = await request(app)
        .get('/api/v1/feedback/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        ...mockStats,
        learningInsights: mockInsights
      });
    });

    it('should handle stats retrieval errors', async () => {
      mockFeedbackRepository.getFeedbackStats.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/v1/feedback/stats')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/feedback/recommendations', () => {
    it('should return recommendations for a request', async () => {
      const mockRecommendations = [
        {
          id: 'rec-1',
          type: 'context_suggestion' as const,
          title: 'Include Cell References',
          description: 'Include all referenced cells for better context',
          confidence: 0.9,
          relevanceScore: 0.8,
          source: 'rule_based' as const,
          metadata: {},
          actionable: true,
          suggestions: ['Include cell references', 'Show data types']
        }
      ];

      mockRecommendationService.getRecommendations.mockResolvedValue(mockRecommendations);

      const response = await request(app)
        .get('/api/v1/feedback/recommendations?request=create sum formula&intent=formula_assistance')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.recommendations).toEqual(mockRecommendations);
      expect(response.body.data.count).toBe(1);
      expect(mockRecommendationService.getRecommendations).toHaveBeenCalledWith({
        request: 'create sum formula',
        intent: 'formula_assistance',
        contextType: undefined
      });
    });

    it('should require request parameter', async () => {
      const response = await request(app)
        .get('/api/v1/feedback/recommendations')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_PARAMETERS');
    });

    it('should handle recommendation service errors', async () => {
      mockRecommendationService.getRecommendations.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get('/api/v1/feedback/recommendations?request=test')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/feedback/learn', () => {
    it('should trigger learning process', async () => {
      const mockLearningResults = {
        patternsLearned: 5,
        insightsGenerated: 3,
        accuracyImprovement: 0.15,
        processingTime: 1500,
        patterns: [],
        insights: []
      };

      mockLearningEngine.processAccumulatedFeedback.mockResolvedValue(mockLearningResults);

      const response = await request(app)
        .post('/api/v1/feedback/learn')
        .send({ minFeedbackCount: 10, minSatisfactionRating: 3 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockLearningResults);
      expect(response.body.message).toBe('Learning process completed successfully');
      expect(mockLearningEngine.processAccumulatedFeedback).toHaveBeenCalledWith({
        minFeedbackCount: 10,
        minSatisfactionRating: 3
      });
    });

    it('should use default parameters', async () => {
      const mockLearningResults = {
        patternsLearned: 2,
        insightsGenerated: 1,
        accuracyImprovement: 0.05,
        processingTime: 800,
        patterns: [],
        insights: []
      };

      mockLearningEngine.processAccumulatedFeedback.mockResolvedValue(mockLearningResults);

      const response = await request(app)
        .post('/api/v1/feedback/learn')
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockLearningEngine.processAccumulatedFeedback).toHaveBeenCalledWith({
        minFeedbackCount: 10,
        minSatisfactionRating: 3
      });
    });

    it('should handle learning process errors', async () => {
      mockLearningEngine.processAccumulatedFeedback.mockRejectedValue(new Error('Learning error'));

      const response = await request(app)
        .post('/api/v1/feedback/learn')
        .send({})
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });
});