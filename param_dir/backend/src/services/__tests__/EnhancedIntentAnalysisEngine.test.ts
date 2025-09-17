/**
 * Tests for Enhanced Intent Analysis Engine
 */

import { EnhancedIntentAnalysisEngine } from '../EnhancedIntentAnalysisEngine';
import { IntentType } from '../../types/context';
import { DomainType, IntelligentSpreadsheetData, EnhancedDataType } from '../../types/enhanced-intelligence';
import { EntityType } from '../../types/intent-analysis';

describe('EnhancedIntentAnalysisEngine', () => {
  let engine: EnhancedIntentAnalysisEngine;

  beforeEach(() => {
    engine = new EnhancedIntentAnalysisEngine();
  });

  afterEach(() => {
    // Clean up sessions after each test
    engine.cleanupSessions(0);
  });

  describe('analyzeQuery', () => {
    it('should perform comprehensive analysis', async () => {
      const query = 'What is the average revenue for Apple Inc in Q1 2024?';
      
      const result = await engine.analyzeQuery(query);
      
      expect(result.intent.query.original).toBe(query);
      expect(result.intent.intent.primary.type).toBe(IntentType.DATA_ANALYSIS);
      expect(result.processingTime).toBeGreaterThan(0);
      expect(result.confidence.overall).toBeGreaterThan(0);
      expect(result.recommendations).toBeDefined();
    });

    it('should include entity resolution when enabled', async () => {
      const query = 'Calculate Apple and Microsoft profit margins';
      
      const result = await engine.analyzeQuery(query, undefined, {
        includeEntityResolution: true
      });
      
      expect(result.entityResolution).toBeDefined();
      expect(result.entityResolution?.entities.length).toBeGreaterThan(0);
      
      const companyEntities = result.entityResolution?.entities.filter(e => e.type === EntityType.COMPANY);
      expect(companyEntities?.length).toBeGreaterThan(0);
    });

    it('should include domain classification when enabled', async () => {
      const query = 'Analyze quarterly financial performance and ROI trends';
      
      const result = await engine.analyzeQuery(query, undefined, {
        includeDomainClassification: true
      });
      
      expect(result.domainClassification).toBeDefined();
      expect(result.domainClassification?.domain).toBe(DomainType.FINANCIAL);
      expect(result.domainClassification?.confidence).toBeGreaterThan(0);
    });

    it('should enhance intent classification with domain expertise', async () => {
      const mockDataContext: Partial<IntelligentSpreadsheetData> = {
        domainContext: {
          domain: DomainType.FINANCIAL,
          confidence: 0.9,
          businessRules: [],
          suggestedMetrics: []
        },
        searchIndex: {
          byContent: new Map([
            ['revenue', [{ sheet: 'Sheet1', row: 0, col: 1, address: 'B1', value: 'Revenue' }]],
            ['profit', [{ sheet: 'Sheet1', row: 0, col: 2, address: 'C1', value: 'Profit' }]]
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

      const query = 'Calculate profit margins and analyze financial trends';
      
      const result = await engine.analyzeQuery(
        query, 
        mockDataContext as IntelligentSpreadsheetData,
        {
          includeDomainClassification: true,
          includeEntityResolution: true
        }
      );
      
      expect(result.intent.intent.primary.domainSpecific).toBe(true);
      expect(result.intent.context.businessContext.domain).toBe(DomainType.FINANCIAL);
      expect(result.confidence.overall).toBeGreaterThan(0.6);
    });

    it('should manage session context', async () => {
      const sessionId = 'test-session-123';
      const query1 = 'What is Apple revenue?';
      const query2 = 'Show me the profit margins too';
      
      // First query
      const result1 = await engine.analyzeQuery(query1, undefined, {
        sessionId,
        enableConversationFlow: true
      });
      
      // Second query in same session
      const result2 = await engine.analyzeQuery(query2, undefined, {
        sessionId,
        enableConversationFlow: true
      });
      
      const sessionContext = engine.getSessionContext(sessionId);
      expect(sessionContext).toBeDefined();
      expect(sessionContext?.queryCount).toBe(2);
      expect(sessionContext?.conversationFlow.length).toBe(2);
      expect(sessionContext?.recentEntities.length).toBeGreaterThan(0);
    });

    it('should provide comprehensive confidence scoring', async () => {
      const query = 'Calculate quarterly revenue growth for Apple Inc';
      
      const result = await engine.analyzeQuery(query, undefined, {
        includeEntityResolution: true,
        includeDomainClassification: true
      });
      
      expect(result.confidence.overall).toBeGreaterThan(0);
      expect(result.confidence.components.length).toBeGreaterThan(1);
      expect(result.confidence.explanation).toBeDefined();
      expect(result.confidence.reliability).toBeDefined();
      
      // Should have components for intent, entity resolution, and domain classification
      const componentNames = result.confidence.components.map(c => c.name);
      expect(componentNames).toContain('Intent Analysis');
    });

    it('should generate actionable recommendations', async () => {
      const ambiguousQuery = 'Show me the data'; // Intentionally vague
      
      const result = await engine.analyzeQuery(ambiguousQuery);
      
      expect(result.recommendations.length).toBeGreaterThan(0);
      
      const clarificationRec = result.recommendations.find(r => r.type === 'clarification');
      expect(clarificationRec).toBeDefined();
      expect(clarificationRec?.priority).toBe('high');
    });

    it('should handle complex multi-entity queries', async () => {
      const complexQuery = 'Compare Apple, Microsoft, and Google revenue, profit margins, and ROI for Q1-Q4 2023';
      
      const result = await engine.analyzeQuery(complexQuery, undefined, {
        includeEntityResolution: true,
        includeDomainClassification: true,
        enableConversationFlow: true
      });
      
      expect(result.entityResolution?.entities.length).toBeGreaterThan(5); // 3 companies + metrics
      expect(result.intent.intent.primary.type).toBe(IntentType.DATA_ANALYSIS);
      expect(result.intent.context.businessContext.complexity).toBe('complex');
    });

    it('should provide debug information when requested', async () => {
      const query = 'Calculate Apple revenue trends';
      
      const result = await engine.analyzeQuery(query, undefined, {
        includeExplanations: true,
        includeEntityResolution: true,
        includeDomainClassification: true
      });
      
      expect(result.debugInfo).toBeDefined();
      expect(result.debugInfo?.tokenization).toBeDefined();
      expect(result.debugInfo?.intentAnalysis).toBeDefined();
      expect(result.debugInfo?.processingSteps).toBeDefined();
      expect(result.debugInfo?.confidenceBreakdown).toBeDefined();
    });
  });

  describe('session management', () => {
    it('should create new session context', async () => {
      const query = 'Test query';
      
      const result = await engine.analyzeQuery(query, undefined, {
        enableConversationFlow: true
      });
      
      const sessionId = result.intent.context.sessionContext.sessionId;
      expect(sessionId).toBeDefined();
      
      const sessionContext = engine.getSessionContext(sessionId);
      expect(sessionContext).toBeDefined();
      expect(sessionContext?.queryCount).toBe(1);
    });

    it('should maintain conversation flow', async () => {
      const sessionId = 'conversation-test';
      
      await engine.analyzeQuery('What is Apple revenue?', undefined, {
        sessionId,
        enableConversationFlow: true
      });
      
      await engine.analyzeQuery('Show me the profit too', undefined, {
        sessionId,
        enableConversationFlow: true
      });
      
      await engine.analyzeQuery('Calculate the margin', undefined, {
        sessionId,
        enableConversationFlow: true
      });
      
      const sessionContext = engine.getSessionContext(sessionId);
      expect(sessionContext?.conversationFlow.length).toBe(3);
      expect(sessionContext?.queryCount).toBe(3);
    });

    it('should clean up old sessions', async () => {
      const oldSessionId = 'old-session';
      
      // Create a session
      await engine.analyzeQuery('test', undefined, { sessionId: oldSessionId });
      
      // Verify session exists
      expect(engine.getSessionContext(oldSessionId)).toBeDefined();
      
      // Clean up sessions older than 0ms (all sessions)
      engine.cleanupSessions(0);
      
      // Verify session is cleaned up
      expect(engine.getSessionContext(oldSessionId)).toBeUndefined();
    });
  });

  describe('performance optimization', () => {
    it('should complete analysis within reasonable time', async () => {
      const query = 'Analyze comprehensive financial performance including revenue trends, profit margins, ROI calculations, and risk assessments for Apple, Microsoft, Google, Amazon, and Tesla';
      
      const startTime = Date.now();
      const result = await engine.analyzeQuery(query, undefined, {
        includeEntityResolution: true,
        includeDomainClassification: true,
        includeExplanations: true
      });
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(10000); // 10 seconds max
      expect(result.processingTime).toBeLessThan(10000);
      expect(result.intent).toBeDefined();
    });

    it('should handle concurrent queries efficiently', async () => {
      const queries = [
        'Apple revenue analysis',
        'Microsoft profit margins',
        'Google stock performance',
        'Amazon quarterly results',
        'Tesla financial metrics'
      ];
      
      const startTime = Date.now();
      const results = await Promise.all(
        queries.map(query => engine.analyzeQuery(query, undefined, {
          includeEntityResolution: true,
          includeDomainClassification: true
        }))
      );
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(15000); // 15 seconds for 5 concurrent queries
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.intent).toBeDefined();
        expect(result.confidence.overall).toBeGreaterThan(0);
      });
    });
  });

  describe('error handling', () => {
    it('should handle empty queries gracefully', async () => {
      const result = await engine.analyzeQuery('');
      
      expect(result.intent.intent.primary.type).toBe(IntentType.GENERAL_ASSISTANCE);
      expect(result.intent.intent.clarificationNeeded).toBe(true);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle malformed data context', async () => {
      const malformedContext = {} as IntelligentSpreadsheetData;
      
      await expect(engine.analyzeQuery('test query', malformedContext)).resolves.toBeDefined();
    });

    it('should handle analysis component failures gracefully', async () => {
      // Test with options that might cause component failures
      const result = await engine.analyzeQuery('test query', undefined, {
        includeEntityResolution: true,
        includeDomainClassification: true,
        confidenceThreshold: 2.0, // Invalid threshold
        maxAlternatives: -1 // Invalid max alternatives
      });
      
      expect(result).toBeDefined();
      expect(result.intent).toBeDefined();
    });
  });

  describe('recommendation generation', () => {
    it('should recommend clarification for low confidence', async () => {
      const vagueQuery = 'show data';
      
      const result = await engine.analyzeQuery(vagueQuery);
      
      const clarificationRec = result.recommendations.find(r => r.type === 'clarification');
      expect(clarificationRec).toBeDefined();
      expect(clarificationRec?.priority).toBe('high');
    });

    it('should recommend data enhancement when no entities found', async () => {
      const query = 'XYZ Corp financial data'; // Non-existent company
      
      const result = await engine.analyzeQuery(query, undefined, {
        includeEntityResolution: true
      });
      
      const enhancementRec = result.recommendations.find(r => r.type === 'data_enhancement');
      expect(enhancementRec).toBeDefined();
    });

    it('should recommend scope refinement for uncertain scope', async () => {
      const query = 'analyze the numbers';
      
      const result = await engine.analyzeQuery(query);
      
      const scopeRec = result.recommendations.find(r => r.type === 'scope_refinement');
      expect(scopeRec).toBeDefined();
    });

    it('should suggest alternative approaches based on domain', async () => {
      const mockDataContext: Partial<IntelligentSpreadsheetData> = {
        domainContext: {
          domain: DomainType.FINANCIAL,
          confidence: 0.9,
          businessRules: [],
          suggestedMetrics: []
        }
      };

      const query = 'basic analysis';
      
      const result = await engine.analyzeQuery(
        query, 
        mockDataContext as IntelligentSpreadsheetData,
        { includeDomainClassification: true }
      );
      
      // Should suggest domain-specific alternatives
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('integration with data context', () => {
    it('should leverage existing domain context', async () => {
      const mockDataContext: Partial<IntelligentSpreadsheetData> = {
        domainContext: {
          domain: DomainType.FINANCIAL,
          confidence: 0.95,
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

      const query = 'Apple revenue analysis';
      
      const result = await engine.analyzeQuery(
        query, 
        mockDataContext as IntelligentSpreadsheetData,
        {
          includeEntityResolution: true,
          includeDomainClassification: true
        }
      );
      
      expect(result.intent.context.businessContext.domain).toBe(DomainType.FINANCIAL);
      expect(result.confidence.overall).toBeGreaterThan(0.7);
      expect(result.entityResolution?.resolutions.length).toBeGreaterThan(0);
    });
  });
});