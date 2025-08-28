/**
 * Enhanced Context API Integration Tests
 * 
 * Comprehensive test suite for enhanced contextual understanding API endpoints
 */

import request from 'supertest';
import app from '../../index';
import { spreadsheetStorage } from '../upload';
import { SpreadsheetData, DataType } from '../../types/spreadsheet';

// Mock enhanced services
jest.mock('../../services/EnhancedIntelligenceService');
jest.mock('../../services/DomainIntelligenceEngine');
jest.mock('../../services/EnhancedIntentAnalyzer');
jest.mock('../../services/ContextSynthesisEngine');
jest.mock('../../services/EnhancedAgentPromptGenerator');
jest.mock('../../services/IntelligentAutoSelectionService');

describe('Enhanced Context API Integration', () => {
  const mockSpreadsheetId = 'sheet_123_abc123';
  const mockSpreadsheetData: SpreadsheetData = {
    id: mockSpreadsheetId,
    sheets: [{
      name: 'Sheet1',
      data: [
        [
          { value: 'Company', dataType: DataType.TEXT },
          { value: 'Price', dataType: DataType.TEXT },
          { value: 'Volume', dataType: DataType.TEXT }
        ],
        [
          { value: 'Apple Inc', dataType: DataType.TEXT },
          { value: 150.00, dataType: DataType.NUMBER },
          { value: 1000000, dataType: DataType.NUMBER }
        ],
        [
          { value: 'Microsoft', dataType: DataType.TEXT },
          { value: 300.00, dataType: DataType.NUMBER },
          { value: 800000, dataType: DataType.NUMBER }
        ],
        [
          { value: 'Google', dataType: DataType.TEXT },
          { value: 2500.00, dataType: DataType.NUMBER },
          { value: 500000, dataType: DataType.NUMBER }
        ]
      ],
      dimensions: {
        rows: 4,
        cols: 3
      },
      formatting: [],
      namedRanges: []
    }],
    metadata: {
      filename: 'test.csv',
      fileSize: 1024,
      mimeType: 'text/csv',
      uploadedAt: new Date()
    },
    formulas: [],
    namedRanges: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    // Setup mock spreadsheet data
    spreadsheetStorage.set(mockSpreadsheetId, mockSpreadsheetData);
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up
    spreadsheetStorage.delete(mockSpreadsheetId);
  });

  describe('POST /api/v1/enhanced-context/analyze', () => {
    const validRequest = {
      request: 'What is the average price of all companies?',
      spreadsheetId: mockSpreadsheetId,
      currentSelection: {
        sheet: 'Sheet1',
        range: 'A1:C4',
        activeCell: 'B2'
      },
      analysisOptions: {
        enableDomainIntelligence: true,
        enableAutoSelection: true,
        enableAgentPrompts: true,
        analysisDepth: 'detailed'
      }
    };

    it('should perform comprehensive enhanced context analysis', async () => {
      const response = await request(app)
        .post('/api/v1/enhanced-context/analyze')
        .send(validRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('intelligenceAnalysis');
      expect(response.body.data).toHaveProperty('domainIntelligence');
      expect(response.body.data).toHaveProperty('intentAnalysis');
      expect(response.body.data).toHaveProperty('contextSynthesis');
      expect(response.body.data).toHaveProperty('performance');
      expect(response.body.requestId).toMatch(/^enh_ctx_/);
    });

    it('should handle missing spreadsheet gracefully', async () => {
      const invalidRequest = {
        ...validRequest,
        spreadsheetId: 'sheet_999_invalid'
      };

      const response = await request(app)
        .post('/api/v1/enhanced-context/analyze')
        .send(invalidRequest)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SPREADSHEET_NOT_FOUND');
    });

    it('should validate request schema', async () => {
      const invalidRequest = {
        request: '', // Empty request
        spreadsheetId: 'invalid-format',
        currentSelection: {
          sheet: '',
          range: '',
          activeCell: ''
        }
      };

      const response = await request(app)
        .post('/api/v1/enhanced-context/analyze')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle service errors gracefully', async () => {
      // Mock service to throw error
      const { EnhancedIntelligenceService } = require('../../services/EnhancedIntelligenceService');
      EnhancedIntelligenceService.prototype.analyzeSpreadsheet = jest.fn()
        .mockRejectedValue(new Error('Service unavailable'));

      const response = await request(app)
        .post('/api/v1/enhanced-context/analyze')
        .send(validRequest)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('should respect analysis options', async () => {
      const minimalRequest = {
        ...validRequest,
        analysisOptions: {
          enableDomainIntelligence: false,
          enableAutoSelection: false,
          enableAgentPrompts: false,
          analysisDepth: 'basic'
        }
      };

      const response = await request(app)
        .post('/api/v1/enhanced-context/analyze')
        .send(minimalRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.autoSelection).toBeUndefined();
      expect(response.body.data.agentPrompt).toBeUndefined();
    });
  });

  describe('POST /api/v1/enhanced-context/domain-analysis', () => {
    const validRequest = {
      spreadsheetId: mockSpreadsheetId,
      analysisOptions: {
        includeFinancialMetrics: true,
        includeBusinessKPIs: true,
        includeRiskAssessment: true
      }
    };

    it('should perform domain-specific analysis', async () => {
      const response = await request(app)
        .post('/api/v1/enhanced-context/domain-analysis')
        .send(validRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('domainClassification');
      expect(response.body.data).toHaveProperty('domainAnalysis');
      expect(response.body.data).toHaveProperty('applicableMetrics');
      expect(response.body.requestId).toMatch(/^domain_/);
    });

    it('should handle missing spreadsheet', async () => {
      const invalidRequest = {
        ...validRequest,
        spreadsheetId: 'sheet_999_invalid'
      };

      const response = await request(app)
        .post('/api/v1/enhanced-context/domain-analysis')
        .send(invalidRequest)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/enhanced-context/auto-select', () => {
    const validRequest = {
      query: 'Find companies with price above 200',
      spreadsheetId: mockSpreadsheetId,
      currentSelection: {
        sheet: 'Sheet1',
        range: 'A1:C4',
        activeCell: 'A1'
      },
      selectionOptions: {
        expandRelated: true,
        includeHeaders: true,
        maxSelections: 3
      }
    };

    it('should perform intelligent auto-selection', async () => {
      const response = await request(app)
        .post('/api/v1/enhanced-context/auto-select')
        .send(validRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('query');
      expect(response.body.data).toHaveProperty('intentAnalysis');
      expect(response.body.data).toHaveProperty('selections');
      expect(response.body.data).toHaveProperty('recommendedSelection');
      expect(response.body.requestId).toMatch(/^autosel_/);
    });

    it('should validate selection options', async () => {
      const invalidRequest = {
        ...validRequest,
        selectionOptions: {
          maxSelections: 15 // Exceeds maximum
        }
      };

      const response = await request(app)
        .post('/api/v1/enhanced-context/auto-select')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain compatibility with existing context endpoint', async () => {
      const legacyRequest = {
        request: 'Analyze this data',
        spreadsheetId: mockSpreadsheetId,
        currentSelection: {
          sheet: 'Sheet1',
          range: 'A1:C4',
          activeCell: 'A1'
        }
      };

      const response = await request(app)
        .post('/api/v1/analyze-context')
        .send(legacyRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('context');
      expect(response.body.data).toHaveProperty('naturalLanguageDescription');
    });

    it('should enable enhanced features when requested in legacy endpoint', async () => {
      const enhancedLegacyRequest = {
        request: 'Analyze this data',
        spreadsheetId: mockSpreadsheetId,
        currentSelection: {
          sheet: 'Sheet1',
          range: 'A1:C4',
          activeCell: 'A1'
        },
        userContext: {
          preferences: {
            enableEnhancedAnalysis: true
          }
        }
      };

      const response = await request(app)
        .post('/api/v1/analyze-context')
        .send(enhancedLegacyRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should include enhanced analysis indicators
      expect(response.body.data.requestAnalysis).toHaveProperty('enhanced');
    });
  });

  describe('Performance and Rate Limiting', () => {
    it('should respect rate limits', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(app)
          .post('/api/v1/enhanced-context/analyze')
          .send({
            request: 'Test request',
            spreadsheetId: mockSpreadsheetId,
            currentSelection: {
              sheet: 'Sheet1',
              range: 'A1:C4',
              activeCell: 'A1'
            }
          })
      );

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should include performance metrics in response', async () => {
      const response = await request(app)
        .post('/api/v1/enhanced-context/analyze')
        .send({
          request: 'Analyze performance',
          spreadsheetId: mockSpreadsheetId,
          currentSelection: {
            sheet: 'Sheet1',
            range: 'A1:C4',
            activeCell: 'A1'
          }
        })
        .expect(200);

      expect(response.body.processingTime).toBeGreaterThan(0);
      expect(response.body.data.performance).toHaveProperty('processingTime');
      expect(response.body.data.performance).toHaveProperty('metrics');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed requests gracefully', async () => {
      const response = await request(app)
        .post('/api/v1/enhanced-context/analyze')
        .send({
          invalid: 'request'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('message');
    });

    it('should provide helpful error suggestions', async () => {
      const response = await request(app)
        .post('/api/v1/enhanced-context/analyze')
        .send({
          request: 'Test',
          spreadsheetId: 'invalid-format',
          currentSelection: {
            sheet: 'Sheet1',
            range: 'A1:C4',
            activeCell: 'A1'
          }
        })
        .expect(400);

      expect(response.body.error).toHaveProperty('suggestions');
      expect(Array.isArray(response.body.error.suggestions)).toBe(true);
    });
  });
});