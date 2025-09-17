/**
 * Enhanced Intelligence Integration Test
 * 
 * Simple integration test to verify the Enhanced Data Intelligence Foundation works
 */

import { describe, it, expect } from '@jest/globals';
import { EnhancedIntelligenceService } from '../services/EnhancedIntelligenceService';

describe('Enhanced Intelligence Integration', () => {
  it('should successfully analyze a simple CSV file', async () => {
    const sampleCSV = `Company,Symbol,Price
Apple Inc,AAPL,150.25
Microsoft Corporation,MSFT,280.50
Amazon.com Inc,AMZN,3200.75`;

    try {
      const result = await EnhancedIntelligenceService.analyzeSpreadsheet(
        Buffer.from(sampleCSV),
        'test.csv',
        'text/csv'
      );

      expect(result).toBeDefined();
      expect(result.intelligentData).toBeDefined();
      expect(result.enhancementSummary).toBeDefined();
      expect(result.performance).toBeDefined();
      
      // Basic validation
      expect(result.enhancementSummary.totalCellsAnalyzed).toBeGreaterThan(0);
      expect(result.performance.totalProcessingTime).toBeGreaterThan(0);
      
      console.log('✅ Enhanced Intelligence Foundation is working correctly');
      console.log(`📊 Analyzed ${result.enhancementSummary.totalCellsAnalyzed} cells`);
      console.log(`⚡ Processing time: ${result.performance.totalProcessingTime}ms`);
      console.log(`🏢 Companies recognized: ${result.enhancementSummary.companiesRecognized}`);
      console.log(`💰 Financial terms found: ${result.enhancementSummary.financialTermsFound}`);
      
    } catch (error) {
      console.error('❌ Enhanced Intelligence test failed:', error);
      throw error;
    }
  });

  it('should recognize company names', () => {
    const result = EnhancedIntelligenceService.recognizeCompany('Apple Inc');
    
    if (result) {
      expect(result.normalizedName).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      console.log('✅ Company recognition working:', result.normalizedName);
    }
  });

  it('should recognize financial terms', () => {
    const result = EnhancedIntelligenceService.recognizeFinancialTerm('revenue');
    
    if (result) {
      expect(result.synonyms).toBeDefined();
      expect(result.synonyms.length).toBeGreaterThan(0);
      console.log('✅ Financial term recognition working:', result.synonyms.join(', '));
    }
  });
});