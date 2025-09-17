/**
 * Tests for Enhanced Intent Analyzer
 */

import { EnhancedIntentAnalyzer } from '../EnhancedIntentAnalyzer';
import { IntentType } from '../../types/context';
import { DomainType, IntelligentSpreadsheetData } from '../../types/enhanced-intelligence';
import { TokenType, SemanticRole, EntityType, DataScopeType, AnalysisType } from '../../types/intent-analysis';

describe('EnhancedIntentAnalyzer', () => {
  let analyzer: EnhancedIntentAnalyzer;

  beforeEach(() => {
    analyzer = new EnhancedIntentAnalyzer();
  });

  describe('analyzeIntent', () => {
    it('should analyze a simple financial query', async () => {
      const query = 'What is the average revenue for Apple Inc?';
      
      const result = await analyzer.analyzeIntent(query);
      
      expect(result.intent.query.original).toBe(query);
      expect(result.intent.query.normalized).toBe('what is the average revenue for apple inc');
      expect(result.intent.query.tokens).toHaveLength(8);
      expect(result.intent.intent.primary.type).toBe(IntentType.DATA_ANALYSIS);
      expect(result.intent.intent.confidence).toBeGreaterThan(0.5);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should tokenize query correctly', async () => {
      const query = 'Calculate total sales for Q1 2024';
      
      const result = await analyzer.analyzeIntent(query);
      
      const tokens = result.intent.query.tokens;
      expect(tokens).toHaveLength(6);
      
      // Check specific token classifications
      const calculateToken = tokens.find(t => t.text === 'calculate');
      expect(calculateToken?.type).toBe(TokenType.ACTION);
      
      const totalToken = tokens.find(t => t.text === 'total');
      expect(totalToken?.type).toBe(TokenType.MODIFIER);
      
      const salesToken = tokens.find(t => t.text === 'sales');
      expect(salesToken?.type).toBe(TokenType.ENTITY);
    });

    it('should detect entities in query', async () => {
      const query = 'Show me Apple revenue and Microsoft profit margins';
      
      const result = await analyzer.analyzeIntent(query);
      
      expect(result.intent.query.entities.length).toBeGreaterThan(0);
      
      const appleEntity = result.intent.query.entities.find(e => e.text === 'apple');
      expect(appleEntity?.type).toBe('company');
      
      const revenueEntity = result.intent.query.entities.find(e => e.text === 'revenue');
      expect(revenueEntity?.type).toBe('metric');
    });

    it('should handle multi-layered intent classification', async () => {
      const query = 'Create a formula to calculate ROI and analyze trends';
      
      const result = await analyzer.analyzeIntent(query, undefined, {
        enableDomainSpecific: true,
        enableSemanticAnalysis: true
      });
      
      expect(result.intent.intent.primary.type).toBeOneOf([
        IntentType.FORMULA_ASSISTANCE,
        IntentType.DATA_ANALYSIS
      ]);
      expect(result.intent.intent.secondary.length).toBeGreaterThanOrEqual(0);
      expect(result.intent.intent.confidence).toBeGreaterThan(0.6);
    });

    it('should detect ambiguities', async () => {
      const query = 'Show data'; // Intentionally ambiguous
      
      const result = await analyzer.analyzeIntent(query);
      
      expect(result.intent.intent.clarificationNeeded).toBe(true);
      expect(result.intent.intent.ambiguities.length).toBeGreaterThan(0);
    });

    it('should determine scope correctly', async () => {
      const query = 'Analyze all revenue data for the entire sheet';
      
      const result = await analyzer.analyzeIntent(query);
      
      expect(result.intent.scope.dataScope.type).toBe(DataScopeType.ENTIRE_SHEET);
      expect(result.intent.scope.analyticalScope.analysisType).toContain(AnalysisType.DESCRIPTIVE);
    });

    it('should analyze business context', async () => {
      const query = 'Calculate quarterly profit margins for executive review';
      
      const result = await analyzer.analyzeIntent(query);
      
      expect(result.intent.context.businessContext.domain).toBe(DomainType.FINANCIAL);
      expect(result.intent.context.businessContext.urgency).toBeDefined();
      expect(result.intent.context.businessContext.complexity).toBeDefined();
    });

    it('should provide confidence scoring with explanations', async () => {
      const query = 'What is the total revenue?';
      
      const result = await analyzer.analyzeIntent(query, undefined, {
        includeExplanations: true
      });
      
      expect(result.debugInfo).toBeDefined();
      expect(result.debugInfo?.tokenization).toBeDefined();
      expect(result.debugInfo?.patternMatches).toBeDefined();
      expect(result.debugInfo?.scoringBreakdown).toBeDefined();
    });

    it('should handle data context for enhanced analysis', async () => {
      const mockDataContext: Partial<IntelligentSpreadsheetData> = {
        domainContext: {
          domain: DomainType.FINANCIAL,
          confidence: 0.9,
          subDomain: 'Investment Management',
          businessRules: [],
          suggestedMetrics: []
        },
        searchIndex: {
          byContent: new Map([
            ['apple', [{ sheet: 'Sheet1', row: 1, col: 0, address: 'A1', value: 'Apple Inc.' }]],
            ['revenue', [{ sheet: 'Sheet1', row: 0, col: 1, address: 'B1', value: 'Revenue' }]]
          ]),
          byColumn: new Map(),
          byDataType: new Map(),
          byPattern: new Map(),
          byDomain: new Map(),
          fuzzyIndex: {
            companyNames: new Map(),
            financialTerms: new Map(),
            generalTerms: new Map(),
            phoneticIndex: new Map()
          }
        }
      };

      const query = 'What is Apple revenue?';
      
      const result = await analyzer.analyzeIntent(query, mockDataContext as IntelligentSpreadsheetData);
      
      expect(result.intent.context.businessContext.domain).toBe(DomainType.FINANCIAL);
      expect(result.intent.intent.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('confidence calculation', () => {
    it('should provide detailed confidence breakdown', async () => {
      const query = 'Calculate average profit margin for Apple Inc';
      
      const result = await analyzer.analyzeIntent(query, undefined, {
        includeExplanations: true
      });
      
      expect(result.debugInfo?.confidenceBreakdown).toBeDefined();
      expect(typeof result.debugInfo?.confidenceBreakdown['Intent Classification']).toBe('number');
    });

    it('should adjust confidence based on ambiguities', async () => {
      const ambiguousQuery = 'Show me the data';
      const clearQuery = 'Calculate total revenue for Apple Inc';
      
      const ambiguousResult = await analyzer.analyzeIntent(ambiguousQuery);
      const clearResult = await analyzer.analyzeIntent(clearQuery);
      
      expect(clearResult.intent.intent.confidence).toBeGreaterThan(ambiguousResult.intent.intent.confidence);
    });
  });

  describe('error handling', () => {
    it('should handle empty queries gracefully', async () => {
      const result = await analyzer.analyzeIntent('');
      
      expect(result.intent.intent.primary.type).toBe(IntentType.GENERAL_ASSISTANCE);
      expect(result.intent.intent.clarificationNeeded).toBe(true);
    });

    it('should handle invalid input gracefully', async () => {
      const result = await analyzer.analyzeIntent('!@#$%^&*()');
      
      expect(result.intent.intent.primary.type).toBe(IntentType.GENERAL_ASSISTANCE);
      expect(result.intent.intent.confidence).toBeLessThan(0.5);
    });

    it('should handle analysis errors gracefully', async () => {
      // Test with malformed data context
      const malformedContext = {} as IntelligentSpreadsheetData;
      
      await expect(analyzer.analyzeIntent('test query', malformedContext)).resolves.toBeDefined();
    });
  });

  describe('performance', () => {
    it('should complete analysis within reasonable time', async () => {
      const query = 'Analyze quarterly revenue trends for all companies in the portfolio';
      
      const startTime = Date.now();
      const result = await analyzer.analyzeIntent(query);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds max
      expect(result.processingTime).toBeLessThan(5000);
    });

    it('should handle complex queries efficiently', async () => {
      const complexQuery = 'Create a comprehensive financial analysis including revenue trends, profit margins, ROI calculations, and risk assessments for Apple, Microsoft, and Google across Q1-Q4 2023 with comparative benchmarking';
      
      const result = await analyzer.analyzeIntent(complexQuery, undefined, {
        enableDomainSpecific: true,
        enableSemanticAnalysis: true,
        includeExplanations: true
      });
      
      expect(result.processingTime).toBeLessThan(10000); // 10 seconds max for complex analysis
      expect(result.intent.intent.primary).toBeDefined();
    });
  });
});

// Helper function for test expectations
expect.extend({
  toBeOneOf(received, expected) {
    const pass = expected.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expected}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${expected}`,
        pass: false,
      };
    }
  },
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(expected: any[]): R;
    }
  }
}