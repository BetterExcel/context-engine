import { RecommendationService, RecommendationServiceError } from '../RecommendationService';
import { FeedbackRepository } from '../../database/repositories/FeedbackRepository';
import { ContextRepository } from '../../database/repositories/ContextRepository';
import { OpenAIService } from '../OpenAIService';
import { Feedback } from '../../database/models/Feedback';
import { IntentType } from '../../types/context';

// Mock dependencies
jest.mock('../../database/repositories/FeedbackRepository');
jest.mock('../../database/repositories/ContextRepository');
jest.mock('../OpenAIService');

const MockedFeedbackRepository = FeedbackRepository as jest.MockedClass<typeof FeedbackRepository>;
const MockedContextRepository = ContextRepository as jest.MockedClass<typeof ContextRepository>;
const MockedOpenAIService = OpenAIService as jest.MockedClass<typeof OpenAIService>;

describe('RecommendationService', () => {
  let recommendationService: RecommendationService;
  let mockFeedbackRepository: jest.Mocked<FeedbackRepository>;
  let mockContextRepository: jest.Mocked<ContextRepository>;
  let mockOpenAIService: jest.Mocked<OpenAIService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockFeedbackRepository = new MockedFeedbackRepository() as jest.Mocked<FeedbackRepository>;
    mockContextRepository = new MockedContextRepository() as jest.Mocked<ContextRepository>;
    mockOpenAIService = new MockedOpenAIService({ apiKey: 'test-key' }) as jest.Mocked<OpenAIService>;
    
    recommendationService = new RecommendationService(mockOpenAIService);
    
    // Replace the repositories with mocks
    (recommendationService as any).feedbackRepository = mockFeedbackRepository;
    (recommendationService as any).contextRepository = mockContextRepository;
  });

  describe('getRecommendations', () => {
    it('should return recommendations for a formula assistance request', async () => {
      const request = {
        request: 'Help me create a SUM formula',
        intent: IntentType.FORMULA_ASSISTANCE,
        contextType: 'immediate',
        dataTypes: ['number']
      };

      mockFeedbackRepository.findHighSatisfactionFeedback.mockResolvedValue([]);

      const recommendations = await recommendationService.getRecommendations(request);

      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      
      // Should include rule-based recommendations
      const ruleBasedRec = recommendations.find(r => r.source === 'rule_based');
      expect(ruleBasedRec).toBeDefined();
    });

    it('should return pattern-based recommendations from successful feedback', async () => {
      const request = {
        request: 'Calculate average of selected cells',
        intent: IntentType.FORMULA_ASSISTANCE,
        contextType: 'current_selection'
      };

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

      mockFeedbackRepository.findHighSatisfactionFeedback.mockResolvedValue(mockFeedback);

      const recommendations = await recommendationService.getRecommendations(request);

      expect(recommendations.length).toBeGreaterThan(0);
      
      // Should include pattern-based recommendations
      const patternRec = recommendations.find(r => r.source === 'learned_pattern');
      expect(patternRec).toBeDefined();
    });

    it('should return AI-generated recommendations when OpenAI is available', async () => {
      const request = {
        request: 'Analyze sales data trends',
        intent: IntentType.DATA_ANALYSIS,
        contextType: 'full_sheet'
      };

      mockFeedbackRepository.findHighSatisfactionFeedback.mockResolvedValue([]);

      const mockAIResponse = JSON.stringify({
        recommendations: [
          {
            type: 'approach_suggestion',
            title: 'Statistical Analysis Approach',
            description: 'Use statistical functions to analyze trends in your sales data',
            suggestions: ['Apply TREND function', 'Calculate moving averages', 'Identify seasonal patterns']
          }
        ]
      });

      (mockOpenAIService as any).generateCompletion = jest.fn().mockResolvedValue(mockAIResponse);

      const recommendations = await recommendationService.getRecommendations(request);

      expect(recommendations.length).toBeGreaterThan(0);
      
      // Should include AI-generated recommendations
      const aiRec = recommendations.find(r => r.source === 'ai_generated');
      expect(aiRec).toBeDefined();
      expect((mockOpenAIService as any).generateCompletion).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const request = {
        request: 'Test request',
        intent: IntentType.GENERAL_ASSISTANCE
      };

      mockFeedbackRepository.findHighSatisfactionFeedback.mockRejectedValue(new Error('Database error'));

      await expect(recommendationService.getRecommendations(request))
        .rejects.toThrow(RecommendationServiceError);
    });

    it('should use cache for repeated requests', async () => {
      const request = {
        request: 'Create formula',
        intent: IntentType.FORMULA_ASSISTANCE
      };

      mockFeedbackRepository.findHighSatisfactionFeedback.mockResolvedValue([]);

      // First call
      const recommendations1 = await recommendationService.getRecommendations(request);
      
      // Second call (should use cache)
      const recommendations2 = await recommendationService.getRecommendations(request);

      expect(recommendations1).toEqual(recommendations2);
      // Should only call repository once due to caching
      expect(mockFeedbackRepository.findHighSatisfactionFeedback).toHaveBeenCalledTimes(1);
    });
  });

  describe('findSimilarRequests', () => {
    it('should find similar requests based on text similarity', async () => {
      const mockFeedback: Feedback[] = [
        {
          id: 'feedback-1',
          request_id: 'request-1',
          predicted_context: { intent: 'formula_assistance' },
          user_satisfaction: 5,
          metadata: { request: 'Help me create a SUM formula for column A' },
          created_at: new Date()
        },
        {
          id: 'feedback-2',
          request_id: 'request-2',
          predicted_context: { intent: 'formula_assistance' },
          user_satisfaction: 4,
          metadata: { request: 'I need to sum values in a range' },
          created_at: new Date()
        }
      ];

      mockFeedbackRepository.findHighSatisfactionFeedback.mockResolvedValue(mockFeedback);

      const similarRequests = await recommendationService.findSimilarRequests(
        'Create SUM formula',
        IntentType.FORMULA_ASSISTANCE,
        3
      );

      expect(Array.isArray(similarRequests)).toBe(true);
      expect(similarRequests.length).toBeGreaterThan(0);
      expect(similarRequests[0]?.similarity).toBeGreaterThan(0);
    });

    it('should filter by minimum similarity threshold', async () => {
      const mockFeedback: Feedback[] = [
        {
          id: 'feedback-1',
          request_id: 'request-1',
          predicted_context: { intent: 'data_analysis' },
          user_satisfaction: 5,
          metadata: { request: 'Completely different request about data visualization' },
          created_at: new Date()
        }
      ];

      mockFeedbackRepository.findHighSatisfactionFeedback.mockResolvedValue(mockFeedback);

      const similarRequests = await recommendationService.findSimilarRequests(
        'Create SUM formula',
        IntentType.FORMULA_ASSISTANCE,
        3
      );

      // Should return empty array due to low similarity
      expect(similarRequests).toHaveLength(0);
    });

    it('should use cache for repeated similarity searches', async () => {
      mockFeedbackRepository.findHighSatisfactionFeedback.mockResolvedValue([]);

      // First call
      await recommendationService.findSimilarRequests('test request', undefined, 5);
      
      // Second call (should use cache)
      await recommendationService.findSimilarRequests('test request', undefined, 5);

      // Should only call repository once due to caching
      expect(mockFeedbackRepository.findHighSatisfactionFeedback).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateFromFeedback', () => {
    it('should update recommendation system from new feedback', async () => {
      const feedback: Feedback = {
        id: 'feedback-1',
        request_id: 'request-1',
        predicted_context: { intent: 'formula_assistance' },
        user_satisfaction: 5,
        metadata: {},
        created_at: new Date()
      };

      // Should not throw error
      await expect(recommendationService.updateFromFeedback(feedback))
        .resolves.not.toThrow();
    });

    it('should handle update errors gracefully', async () => {
      const feedback: Feedback = {
        id: 'feedback-1',
        request_id: 'request-1',
        predicted_context: { intent: 'formula_assistance' },
        user_satisfaction: 5,
        metadata: {},
        created_at: new Date()
      };

      // Mock an error in cache clearing
      jest.spyOn(recommendationService as any, 'clearRelevantCaches').mockImplementation(() => {
        throw new Error('Cache error');
      });

      // Should not throw error (errors are handled gracefully)
      await expect(recommendationService.updateFromFeedback(feedback))
        .resolves.not.toThrow();
    });
  });

  describe('intent-based recommendations', () => {
    it('should provide formula assistance recommendations', () => {
      const request = {
        request: 'Help with formulas',
        intent: IntentType.FORMULA_ASSISTANCE
      };

      const recommendations = (recommendationService as any).getIntentBasedRecommendations(
        IntentType.FORMULA_ASSISTANCE,
        request
      );

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].title).toContain('Formula');
      expect(recommendations[0].suggestions).toContain('Include all referenced cells in the context');
    });

    it('should provide data analysis recommendations', () => {
      const request = {
        request: 'Analyze my data',
        intent: IntentType.DATA_ANALYSIS
      };

      const recommendations = (recommendationService as any).getIntentBasedRecommendations(
        IntentType.DATA_ANALYSIS,
        request
      );

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].title).toContain('Data Analysis');
      expect(recommendations[0].suggestions).toContain('Include statistical summaries (mean, median, range)');
    });

    it('should provide formatting recommendations', () => {
      const request = {
        request: 'Format my cells',
        intent: IntentType.FORMATTING
      };

      const recommendations = (recommendationService as any).getIntentBasedRecommendations(
        IntentType.FORMATTING,
        request
      );

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].title).toContain('Formatting');
      expect(recommendations[0].suggestions).toContain('Include current cell formatting information');
    });
  });

  describe('data type-based recommendations', () => {
    it('should provide numeric data recommendations', () => {
      const request = {
        request: 'Work with numbers',
        dataTypes: ['number']
      };

      const recommendations = (recommendationService as any).getDataTypeBasedRecommendations(
        ['number'],
        request
      );

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].title).toContain('Numeric Data');
      expect(recommendations[0].suggestions).toContain('Include min, max, average, and sum statistics');
    });

    it('should provide date data recommendations', () => {
      const request = {
        request: 'Work with dates',
        dataTypes: ['date']
      };

      const recommendations = (recommendationService as any).getDataTypeBasedRecommendations(
        ['date'],
        request
      );

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].title).toContain('Date Data');
      expect(recommendations[0].suggestions).toContain('Include date range and temporal patterns');
    });

    it('should handle multiple data types', () => {
      const request = {
        request: 'Work with mixed data',
        dataTypes: ['number', 'date', 'text']
      };

      const recommendations = (recommendationService as any).getDataTypeBasedRecommendations(
        ['number', 'date', 'text'],
        request
      );

      expect(recommendations.length).toBe(2); // number and date recommendations
    });
  });

  describe('text similarity calculation', () => {
    it('should calculate similarity between similar texts', () => {
      const similarity = (recommendationService as any).calculateTextSimilarity(
        'create sum formula',
        'help me create a SUM formula'
      );

      expect(similarity).toBeGreaterThan(0.3);
    });

    it('should return low similarity for different texts', () => {
      const similarity = (recommendationService as any).calculateTextSimilarity(
        'create sum formula',
        'analyze data patterns and trends'
      );

      expect(similarity).toBeLessThan(0.3);
    });

    it('should handle empty strings', () => {
      const similarity = (recommendationService as any).calculateTextSimilarity('', '');
      expect(similarity).toBe(0);
    });
  });
});