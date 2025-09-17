import { LearningEngine, LearningEngineError } from '../LearningEngine';
import { FeedbackRepository } from '../../database/repositories/FeedbackRepository';
import { ContextRepository } from '../../database/repositories/ContextRepository';
import { OpenAIService } from '../OpenAIService';
import { Feedback } from '../../database/models/Feedback';

// Mock dependencies
jest.mock('../../database/repositories/FeedbackRepository');
jest.mock('../../database/repositories/ContextRepository');
jest.mock('../OpenAIService');

const MockedFeedbackRepository = FeedbackRepository as jest.MockedClass<typeof FeedbackRepository>;
const MockedContextRepository = ContextRepository as jest.MockedClass<typeof ContextRepository>;
const MockedOpenAIService = OpenAIService as jest.MockedClass<typeof OpenAIService>;

describe('LearningEngine', () => {
  let learningEngine: LearningEngine;
  let mockFeedbackRepository: jest.Mocked<FeedbackRepository>;
  let mockContextRepository: jest.Mocked<ContextRepository>;
  let mockOpenAIService: jest.Mocked<OpenAIService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockFeedbackRepository = new MockedFeedbackRepository() as jest.Mocked<FeedbackRepository>;
    mockContextRepository = new MockedContextRepository() as jest.Mocked<ContextRepository>;
    mockOpenAIService = new MockedOpenAIService({ apiKey: 'test-key' }) as jest.Mocked<OpenAIService>;
    
    learningEngine = new LearningEngine(mockOpenAIService);
    
    // Replace the repositories with mocks
    (learningEngine as any).feedbackRepository = mockFeedbackRepository;
    (learningEngine as any).contextRepository = mockContextRepository;
  });

  describe('processFeedback', () => {
    it('should process feedback with high satisfaction', async () => {
      const feedback: Feedback = {
        id: 'feedback-1',
        request_id: 'request-1',
        predicted_context: { intent: 'formula_assistance', scope: 'current_selection' },
        actual_context: undefined,
        user_satisfaction: 5,
        comments: 'Great context!',
        metadata: {},
        created_at: new Date()
      };

      const result = await learningEngine.processFeedback(feedback);

      expect(result).toBe(true);
    });

    it('should process feedback with corrections', async () => {
      const feedback: Feedback = {
        id: 'feedback-2',
        request_id: 'request-2',
        predicted_context: { intent: 'data_analysis', scope: 'full_sheet' },
        actual_context: { intent: 'formula_assistance', scope: 'current_selection' },
        user_satisfaction: 2,
        comments: 'Wrong intent detected',
        metadata: {
          corrections: [
            {
              field: 'intent',
              expectedValue: 'formula_assistance',
              actualValue: 'data_analysis',
              importance: 'high'
            }
          ]
        },
        created_at: new Date()
      };

      const result = await learningEngine.processFeedback(feedback);

      expect(result).toBe(true);
    });

    it('should handle feedback with no learning signals', async () => {
      const feedback: Feedback = {
        id: 'feedback-3',
        request_id: 'request-3',
        predicted_context: {},
        actual_context: undefined,
        user_satisfaction: undefined,
        comments: undefined,
        metadata: {},
        created_at: new Date()
      };

      const result = await learningEngine.processFeedback(feedback);

      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      const feedback: Feedback = {
        id: 'feedback-4',
        request_id: 'request-4',
        predicted_context: { intent: 'formula_assistance' },
        user_satisfaction: 4,
        metadata: {},
        created_at: new Date()
      };

      // Mock an error in processing
      jest.spyOn(learningEngine as any, 'extractLearningSignals').mockImplementation(() => {
        throw new Error('Processing error');
      });

      await expect(learningEngine.processFeedback(feedback)).rejects.toThrow(LearningEngineError);
    });
  });

  describe('processAccumulatedFeedback', () => {
    it('should process accumulated feedback successfully', async () => {
      const mockFeedback: Feedback[] = [
        {
          id: 'feedback-1',
          request_id: 'request-1',
          predicted_context: { intent: 'formula_assistance' },
          user_satisfaction: 5,
          metadata: {},
          created_at: new Date()
        },
        {
          id: 'feedback-2',
          request_id: 'request-2',
          predicted_context: { intent: 'data_analysis' },
          user_satisfaction: 4,
          metadata: {},
          created_at: new Date()
        }
      ];

      mockFeedbackRepository.findFeedbackForLearning.mockResolvedValue(mockFeedback);

      const options = {
        minFeedbackCount: 2,
        minSatisfactionRating: 3,
        maxPatterns: 10
      };

      const result = await learningEngine.processAccumulatedFeedback(options);

      expect(result.patternsLearned).toBeGreaterThanOrEqual(0);
      expect(result.insightsGenerated).toBeGreaterThanOrEqual(0);
      expect(result.processingTime).toBeGreaterThan(0);
      expect(Array.isArray(result.patterns)).toBe(true);
      expect(Array.isArray(result.insights)).toBe(true);
    });

    it('should throw error when insufficient feedback data', async () => {
      mockFeedbackRepository.findFeedbackForLearning.mockResolvedValue([]);

      const options = {
        minFeedbackCount: 10,
        minSatisfactionRating: 3
      };

      await expect(learningEngine.processAccumulatedFeedback(options))
        .rejects.toThrow(LearningEngineError);
    });

    it('should handle processing errors', async () => {
      mockFeedbackRepository.findFeedbackForLearning.mockRejectedValue(new Error('Database error'));

      const options = {
        minFeedbackCount: 5,
        minSatisfactionRating: 3
      };

      await expect(learningEngine.processAccumulatedFeedback(options))
        .rejects.toThrow(LearningEngineError);
    });
  });

  describe('generateInsights', () => {
    it('should generate insights from feedback statistics', async () => {
      const mockStats = {
        total: 100,
        avgSatisfaction: 3.2,
        satisfactionDistribution: { 1: 10, 2: 15, 3: 20, 4: 30, 5: 25 },
        withComments: 40
      };

      mockFeedbackRepository.getFeedbackStats.mockResolvedValue(mockStats);

      const insights = await learningEngine.generateInsights();

      expect(Array.isArray(insights)).toBe(true);
      expect(insights.length).toBeGreaterThan(0);
      
      // Should generate warning for low satisfaction
      const lowSatisfactionInsight = insights.find(i => i.type === 'warning');
      expect(lowSatisfactionInsight).toBeDefined();
      expect(lowSatisfactionInsight?.title).toContain('Low User Satisfaction');
    });

    it('should generate AI insights when OpenAI service is available', async () => {
      const mockStats = {
        total: 50,
        avgSatisfaction: 4.2,
        satisfactionDistribution: { 4: 20, 5: 30 },
        withComments: 15
      };

      mockFeedbackRepository.getFeedbackStats.mockResolvedValue(mockStats);
      
      const mockAIResponse = JSON.stringify({
        insights: [
          {
            type: 'success',
            title: 'High User Satisfaction',
            description: 'Users are very satisfied with the context quality',
            impact: 'high',
            recommendations: ['Continue current approach', 'Share best practices']
          }
        ]
      });

      (mockOpenAIService as any).generateCompletion = jest.fn().mockResolvedValue(mockAIResponse);

      const insights = await learningEngine.generateInsights();

      expect(insights.length).toBeGreaterThan(0);
      expect((mockOpenAIService as any).generateCompletion).toHaveBeenCalled();
    });

    it('should handle AI service errors gracefully', async () => {
      const mockStats = {
        total: 50,
        avgSatisfaction: 4.0,
        satisfactionDistribution: { 4: 25, 5: 25 },
        withComments: 10
      };

      mockFeedbackRepository.getFeedbackStats.mockResolvedValue(mockStats);
      (mockOpenAIService as any).generateCompletion = jest.fn().mockRejectedValue(new Error('AI service error'));

      const insights = await learningEngine.generateInsights();

      // Should still return insights even if AI fails
      expect(Array.isArray(insights)).toBe(true);
    });

    it('should handle database errors', async () => {
      mockFeedbackRepository.getFeedbackStats.mockRejectedValue(new Error('Database error'));

      await expect(learningEngine.generateInsights()).rejects.toThrow(LearningEngineError);
    });
  });

  describe('learning signal extraction', () => {
    it('should extract correction signals', () => {
      const feedback: Feedback = {
        id: 'feedback-1',
        request_id: 'request-1',
        predicted_context: { intent: 'data_analysis' },
        actual_context: { intent: 'formula_assistance' },
        user_satisfaction: 3,
        metadata: {
          corrections: [
            {
              field: 'intent',
              expectedValue: 'formula_assistance',
              actualValue: 'data_analysis',
              importance: 'high'
            }
          ]
        },
        created_at: new Date()
      };

      const signals = (learningEngine as any).extractLearningSignals(feedback);

      expect(signals).toHaveLength(2); // correction + satisfaction
      expect(signals[0].type).toBe('correction');
      expect(signals[1].type).toBe('satisfaction');
    });

    it('should extract pattern signals from comments', () => {
      const feedback: Feedback = {
        id: 'feedback-1',
        request_id: 'request-1',
        predicted_context: { intent: 'formula_assistance' },
        user_satisfaction: 4,
        comments: 'The context was good but could include more related cells for better understanding',
        metadata: {},
        created_at: new Date()
      };

      const signals = (learningEngine as any).extractLearningSignals(feedback);

      expect(signals).toHaveLength(2); // satisfaction + pattern
      expect(signals.some((s: any) => s.type === 'pattern')).toBe(true);
    });

    it('should handle empty feedback gracefully', () => {
      const feedback: Feedback = {
        id: 'feedback-1',
        request_id: 'request-1',
        predicted_context: {},
        metadata: {},
        created_at: new Date()
      };

      const signals = (learningEngine as any).extractLearningSignals(feedback);

      expect(signals).toHaveLength(0);
    });
  });

  describe('pattern analysis', () => {
    it('should identify high-success patterns', async () => {
      const mockFeedback: Feedback[] = [
        {
          id: 'feedback-1',
          request_id: 'request-1',
          predicted_context: { intent: 'formula_assistance', scope: 'current_selection' },
          user_satisfaction: 5,
          metadata: {},
          created_at: new Date()
        },
        {
          id: 'feedback-2',
          request_id: 'request-2',
          predicted_context: { intent: 'formula_assistance', scope: 'current_selection' },
          user_satisfaction: 4,
          metadata: {},
          created_at: new Date()
        },
        {
          id: 'feedback-3',
          request_id: 'request-3',
          predicted_context: { intent: 'formula_assistance', scope: 'current_selection' },
          user_satisfaction: 5,
          metadata: {},
          created_at: new Date()
        }
      ];

      const patterns = await (learningEngine as any).analyzeSuccessPatterns(mockFeedback, {
        minSatisfactionRating: 4,
        maxPatterns: 10
      });

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].successRate).toBeGreaterThan(0.8);
      expect(patterns[0].sampleSize).toBe(3);
    });

    it('should calculate accuracy improvement', async () => {
      const mockFeedback: Feedback[] = [
        // Earlier feedback (lower satisfaction)
        { id: '1', request_id: '1', predicted_context: {}, user_satisfaction: 2, metadata: {}, created_at: new Date('2023-01-01') },
        { id: '2', request_id: '2', predicted_context: {}, user_satisfaction: 3, metadata: {}, created_at: new Date('2023-01-02') },
        // Later feedback (higher satisfaction)
        { id: '3', request_id: '3', predicted_context: {}, user_satisfaction: 4, metadata: {}, created_at: new Date('2023-01-03') },
        { id: '4', request_id: '4', predicted_context: {}, user_satisfaction: 5, metadata: {}, created_at: new Date('2023-01-04') }
      ];

      const improvement = await (learningEngine as any).calculateAccuracyImprovement(mockFeedback);

      expect(improvement).toBeGreaterThan(0); // Should show improvement
    });
  });
});