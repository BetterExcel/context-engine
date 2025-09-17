/**
 * Integration tests for Enhanced Intent Analysis components
 */

import { EnhancedIntentAnalysisEngine } from '../EnhancedIntentAnalysisEngine';
import { IntentType } from '../../types/context';
import { DomainType, IntelligentSpreadsheetData } from '../../types/enhanced-intelligence';

describe('Enhanced Intent Analysis Integration', () => {
  let engine: EnhancedIntentAnalysisEngine;

  beforeEach(() => {
    engine = new EnhancedIntentAnalysisEngine();
  });

  afterEach(() => {
    engine.cleanupSessions(0);
  });

  it('should perform end-to-end analysis for financial query', async () => {
    const query = 'What is the average revenue for Apple Inc?';
    
    const result = await engine.analyzeQuery(query, undefined, {
      includeEntityResolution: true,
      includeDomainClassification: true,
      includeExplanations: true
    });

    // Verify basic structure
    expect(result.intent).toBeDefined();
    expect(result.intent.query.original).toBe(query);
    expect(result.intent.intent.primary.type).toBe(IntentType.DATA_ANALYSIS);
    
    // Verify entity resolution
    expect(result.entityResolution).toBeDefined();
    expect(result.entityResolution?.entities.length).toBeGreaterThan(0);
    
    // Verify domain classification
    expect(result.domainClassification).toBeDefined();
    expect(result.domainClassification?.domain).toBe(DomainType.FINANCIAL);
    
    // Verify confidence scoring
    expect(result.confidence.overall).toBeGreaterThan(0);
    expect(result.confidence.components.length).toBeGreaterThan(0);
    
    // Verify recommendations
    expect(result.recommendations).toBeDefined();
    expect(Array.isArray(result.recommendations)).toBe(true);
    
    // Verify processing completed successfully
    expect(result.processingTime).toBeGreaterThan(0);
    expect(result.processingTime).toBeLessThan(5000); // Should complete within 5 seconds
  });

  it('should handle complex multi-entity queries', async () => {
    const query = 'Compare Apple and Microsoft revenue and profit margins for Q1 2024';
    
    const result = await engine.analyzeQuery(query, undefined, {
      includeEntityResolution: true,
      includeDomainClassification: true
    });

    // Should detect multiple companies and metrics
    expect(result.entityResolution?.entities.length).toBeGreaterThan(3);
    
    // Should classify as data analysis
    expect(result.intent.intent.primary.type).toBe(IntentType.DATA_ANALYSIS);
    
    // Should detect financial domain
    expect(result.domainClassification?.domain).toBe(DomainType.FINANCIAL);
    
    // Should have reasonable confidence
    expect(result.confidence.overall).toBeGreaterThan(0.5);
  });

  it('should provide helpful recommendations for vague queries', async () => {
    const query = 'show data';
    
    const result = await engine.analyzeQuery(query);

    // Should detect need for clarification
    expect(result.intent.intent.clarificationNeeded).toBe(true);
    
    // Should provide recommendations
    expect(result.recommendations.length).toBeGreaterThan(0);
    
    const clarificationRec = result.recommendations.find(r => r.type === 'clarification');
    expect(clarificationRec).toBeDefined();
    expect(clarificationRec?.priority).toBe('high');
  });

  it('should maintain session context across queries', async () => {
    const sessionId = 'test-session';
    
    // First query
    const result1 = await engine.analyzeQuery('What is Apple revenue?', undefined, {
      sessionId,
      enableConversationFlow: true
    });
    
    // Second query in same session
    const result2 = await engine.analyzeQuery('Show me the profit margins too', undefined, {
      sessionId,
      enableConversationFlow: true
    });

    // Verify session context is maintained
    const sessionContext = engine.getSessionContext(sessionId);
    expect(sessionContext).toBeDefined();
    expect(sessionContext?.queryCount).toBe(2);
    expect(sessionContext?.conversationFlow.length).toBe(2);
  });

  it('should handle errors gracefully', async () => {
    // Test with empty query
    const result1 = await engine.analyzeQuery('');
    expect(result1.intent.intent.primary.type).toBe(IntentType.GENERAL_ASSISTANCE);
    
    // Test with malformed input
    const result2 = await engine.analyzeQuery('!@#$%^&*()');
    expect(result2).toBeDefined();
    expect(result2.confidence.overall).toBeGreaterThanOrEqual(0);
  });

  it('should complete analysis within performance requirements', async () => {
    const complexQuery = 'Analyze comprehensive financial performance including revenue trends, profit margins, ROI calculations for Apple, Microsoft, Google, Amazon, Tesla';
    
    const startTime = Date.now();
    const result = await engine.analyzeQuery(complexQuery, undefined, {
      includeEntityResolution: true,
      includeDomainClassification: true,
      includeExplanations: true
    });
    const endTime = Date.now();

    // Should complete within 10 seconds
    expect(endTime - startTime).toBeLessThan(10000);
    expect(result.processingTime).toBeLessThan(10000);
    
    // Should still provide meaningful results
    expect(result.intent).toBeDefined();
    expect(result.entityResolution?.entities.length).toBeGreaterThan(5);
    expect(result.confidence.overall).toBeGreaterThan(0);
  });
});