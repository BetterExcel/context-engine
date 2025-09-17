import { OpenAIService, OpenAIConfig } from '../OpenAIService';
import OpenAI from 'openai';

// Mock OpenAI
jest.mock('openai');
const MockedOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

describe('OpenAIService', () => {
  let openAIService: OpenAIService;
  let mockCreate: jest.Mock;

  const mockConfig: OpenAIConfig = {
    apiKey: 'test-api-key',
    maxRetries: 2,
    timeout: 10000,
    model: 'gpt-4'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock function for chat completions
    mockCreate = jest.fn();
    
    // Mock the OpenAI constructor to return our mock client
    MockedOpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate
        }
      }
    } as any));
    
    openAIService = new OpenAIService(mockConfig);
  });

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      expect(MockedOpenAI).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        timeout: 10000,
        maxRetries: 2
      });
    });

    it('should use default values when not provided', () => {
      const minimalConfig = { apiKey: 'test-key' };
      new OpenAIService(minimalConfig);
      
      expect(MockedOpenAI).toHaveBeenCalledWith({
        apiKey: 'test-key',
        timeout: 30000,
        maxRetries: 3
      });
    });
  });

  describe('classifyIntent', () => {
    it('should classify intent successfully', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              intent: 'formula_assistance',
              confidence: 0.95,
              reasoning: 'User is asking for help with creating a formula'
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse as any);

      const result = await openAIService.classifyIntent('Help me create a SUM formula');

      expect(result).toEqual({
        intent: 'formula_assistance',
        confidence: 0.95,
        reasoning: 'User is asking for help with creating a formula'
      });

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: expect.stringContaining('You are an expert at analyzing spreadsheet user requests')
          },
          {
            role: 'user',
            content: 'User request: "Help me create a SUM formula"'
          }
        ],
        temperature: 0.1,
        max_tokens: 200
      });
    });

    it('should include context when provided', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              intent: 'formula_assistance',
              confidence: 0.95,
              reasoning: 'User is asking for help with creating a formula'
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse as any);

      const context = {
        currentSelection: 'A1:B10',
        activeCell: 'A1',
        dataTypes: ['number', 'text'],
        hasFormulas: false
      };

      await openAIService.classifyIntent('Help me create a SUM formula', context);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            expect.any(Object),
            {
              role: 'user',
              content: expect.stringContaining('Current selection: A1:B10')
            }
          ]
        })
      );
    });

    it('should handle OpenAI API errors', async () => {
      const error = new Error('API Error');
      mockCreate.mockRejectedValue(error);

      await expect(openAIService.classifyIntent('test request'))
        .rejects.toThrow('Intent classification failed: API Error');
    });

    it('should handle empty response content', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: null
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse as any);

      await expect(openAIService.classifyIntent('test request'))
        .rejects.toThrow('Intent classification failed: No response content from OpenAI');
    });
  });

  describe('analyzePatterns', () => {
    it('should analyze patterns successfully', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              patterns: [{
                type: 'trend',
                description: 'Increasing trend in column A',
                strength: 0.85,
                columns: ['A']
              }],
              relationships: [{
                type: 'correlation',
                source: 'column_A',
                target: 'column_B',
                strength: 0.92,
                description: 'Strong positive correlation'
              }],
              anomalies: [{
                type: 'outlier',
                location: 'B5',
                description: 'Value significantly higher than others',
                severity: 'medium'
              }],
              insights: [{
                type: 'recommendation',
                description: 'Consider using a trendline',
                priority: 'medium'
              }],
              confidence: 0.88
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse as any);

      const contextData = {
        immediate: {
          selectedData: [[{ value: 1 }, { value: 2 }]],
          activeCell: { value: 1 },
          visibleData: [],
          currentFormulas: [],
          selectionInfo: { sheet: 'Sheet1', range: 'A1:B1', activeCell: 'A1' }
        },
        structural: {
          headers: ['Column A', 'Column B'],
          dataTypes: ['number'],
          rowCount: 1,
          columnCount: 2
        }
      } as any;

      const result = await openAIService.analyzePatterns(contextData);

      expect(result.patterns).toHaveLength(1);
      expect(result.patterns[0]?.type).toBe('trend');
      expect(result.relationships).toHaveLength(1);
      expect(result.anomalies).toHaveLength(1);
      expect(result.insights).toHaveLength(1);
      expect(result.confidence).toBe(0.88);
    });

    it('should handle pattern analysis errors', async () => {
      const error = new Error('Pattern analysis failed');
      mockCreate.mockRejectedValue(error);

      const contextData = {} as any;

      await expect(openAIService.analyzePatterns(contextData))
        .rejects.toThrow('Pattern analysis failed: Pattern analysis failed');
    });
  });

  describe('generateClarificationQuestions', () => {
    it('should generate clarification questions successfully', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify([
              'What specific calculation do you want to perform?',
              'Which columns should be included in the analysis?',
              'Do you want to include empty cells in the calculation?'
            ])
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse as any);

      const result = await openAIService.generateClarificationQuestions('help with data');

      expect(result).toHaveLength(3);
      expect(result[0]).toBe('What specific calculation do you want to perform?');
      expect(result[1]).toBe('Which columns should be included in the analysis?');
      expect(result[2]).toBe('Do you want to include empty cells in the calculation?');
    });

    it('should handle clarification generation errors', async () => {
      const error = new Error('Clarification failed');
      mockCreate.mockRejectedValue(error);

      await expect(openAIService.generateClarificationQuestions('test request'))
        .rejects.toThrow('Clarification generation failed: Clarification failed');
    });
  });

  describe('isAvailable', () => {
    it('should return true when service is available', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'test'
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse as any);

      const result = await openAIService.isAvailable();

      expect(result).toBe(true);
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1
      });
    });

    it('should return false when service is unavailable', async () => {
      const error = new Error('Service unavailable');
      mockCreate.mockRejectedValue(error);

      const result = await openAIService.isAvailable();

      expect(result).toBe(false);
    });
  });
});