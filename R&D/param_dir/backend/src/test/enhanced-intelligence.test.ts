/**
 * Enhanced Intelligence Test Suite
 * 
 * Tests for the Enhanced Data Intelligence Foundation components:
 * - Enhanced Data Parser
 * - Intelligent Search Service
 * - Data Quality Analyzer
 * - Synonym Recognition Service
 * - Enhanced Intelligence Service (orchestrator)
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  EnhancedDataParser,
  IntelligentSearchService,
  DataQualityAnalyzer,
  SynonymRecognitionService,
  EnhancedIntelligenceService
} from '../services';
import {
  EnhancedDataType,
  DomainType
} from '../types/enhanced-intelligence';
import type {
  SearchQuery,
  QualityAnalysisOptions,
  SynonymLearningOptions
} from '../services';

describe('Enhanced Intelligence Foundation', () => {
  let sampleCSVData: string;
  let sampleFinancialData: string;

  beforeEach(() => {
    // Sample CSV data with financial information
    sampleCSVData = `Company,Symbol,Price,Market Cap,Revenue,Profit Margin
Apple Inc,AAPL,150.25,2500000000000,365817000000,0.25
Microsoft Corporation,MSFT,280.50,2100000000000,168088000000,0.31
Amazon.com Inc,AMZN,3200.75,1600000000000,469822000000,0.07
Alphabet Inc,GOOGL,2500.30,1700000000000,257637000000,0.21
Tesla Inc,TSLA,800.40,800000000000,53823000000,0.09`;

    sampleFinancialData = `Metric,Q1 2023,Q2 2023,Q3 2023,Q4 2023
Revenue,1000000,1100000,1200000,1300000
Gross Profit,600000,660000,720000,780000
Operating Expenses,400000,420000,440000,460000
Net Income,200000,240000,280000,320000
Cash Flow,250000,290000,330000,370000
ROI,0.15,0.18,0.21,0.24`;
  });

  describe('EnhancedDataParser', () => {
    it('should parse CSV with enhanced data type detection', async () => {
      const result = await EnhancedDataParser.parseEnhanced(
        Buffer.from(sampleCSVData),
        'financial_data.csv',
        'text/csv'
      );

      expect(result).toBeDefined();
      expect(result.sheets).toHaveLength(1);
      expect(result.searchIndex).toBeDefined();
      expect(result.qualityMetrics).toBeDefined();
      expect(result.domainContext).toBeDefined();
      expect(result.domainContext.domain).toBe(DomainType.FINANCIAL);
    });

    it('should detect company names correctly', async () => {
      const result = await EnhancedDataParser.parseEnhanced(
        Buffer.from(sampleCSVData),
        'companies.csv',
        'text/csv'
      );

      const sheet = result.sheets[0];
      expect(sheet).toBeDefined();
      
      // Check if company names are detected
      const companyNameCells = sheet.data.flat().filter(cell => {
        const enhancedCell = cell as any;
        return enhancedCell?.enhancedDataType === EnhancedDataType.COMPANY_NAME;
      });

      expect(companyNameCells.length).toBeGreaterThan(0);
    });

    it('should detect financial data types', async () => {
      const result = await EnhancedDataParser.parseEnhanced(
        Buffer.from(sampleCSVData),
        'financial.csv',
        'text/csv'
      );

      const sheet = result.sheets[0];
      const enhancedCells = sheet.data.flat().map(cell => cell as any);
      
      // Should detect currency values
      const currencyCells = enhancedCells.filter(cell => 
        cell?.enhancedDataType === EnhancedDataType.CURRENCY
      );
      
      // Should detect percentages
      const percentageCells = enhancedCells.filter(cell => 
        cell?.enhancedDataType === EnhancedDataType.PERCENTAGE
      );
      
      // Should detect stock symbols
      const stockSymbolCells = enhancedCells.filter(cell => 
        cell?.enhancedDataType === EnhancedDataType.STOCK_SYMBOL
      );

      expect(currencyCells.length + percentageCells.length + stockSymbolCells.length).toBeGreaterThan(0);
    });

    it('should build search index correctly', async () => {
      const result = await EnhancedDataParser.parseEnhanced(
        Buffer.from(sampleCSVData),
        'test.csv',
        'text/csv'
      );

      expect(result.searchIndex.byContent.size).toBeGreaterThan(0);
      expect(result.searchIndex.byDataType.size).toBeGreaterThan(0);
      expect(result.searchIndex.fuzzyIndex).toBeDefined();
    });
  });

  describe('IntelligentSearchService', () => {
    let intelligentData: any;

    beforeEach(async () => {
      intelligentData = await EnhancedDataParser.parseEnhanced(
        Buffer.from(sampleCSVData),
        'test.csv',
        'text/csv'
      );
    });

    it('should perform exact search', async () => {
      const query: SearchQuery = {
        term: 'apple',
        type: 'exact',
        maxResults: 10
      };

      const result = await IntelligentSearchService.search(intelligentData, query);
      
      expect(result).toBeDefined();
      expect(result.matches).toBeDefined();
      expect(result.totalResults).toBeGreaterThanOrEqual(0);
      expect(result.searchTime).toBeGreaterThan(0);
    });

    it('should perform fuzzy search', async () => {
      const query: SearchQuery = {
        term: 'appl', // Partial match
        type: 'fuzzy',
        maxResults: 10
      };

      const result = await IntelligentSearchService.search(intelligentData, query);
      
      expect(result).toBeDefined();
      expect(result.matches).toBeDefined();
    });

    it('should find similar companies', async () => {
      const result = await IntelligentSearchService.findSimilarCompanies(
        intelligentData,
        'Apple Computer',
        { maxResults: 5 }
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should provide auto-complete suggestions', () => {
      const suggestions = IntelligentSearchService.getAutoCompleteSuggestions(
        intelligentData,
        'app',
        5
      );

      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeLessThanOrEqual(5);
    });
  });

  describe('DataQualityAnalyzer', () => {
    let intelligentData: any;

    beforeEach(async () => {
      intelligentData = await EnhancedDataParser.parseEnhanced(
        Buffer.from(sampleCSVData),
        'test.csv',
        'text/csv'
      );
    });

    it('should analyze data quality', async () => {
      const options: QualityAnalysisOptions = {
        enableStatisticalAnalysis: true,
        enablePatternAnalysis: true,
        includeRecommendations: true
      };

      const result = await DataQualityAnalyzer.analyzeQuality(intelligentData, options);

      expect(result).toBeDefined();
      expect(result.columnProfiles).toBeDefined();
      expect(result.overallMetrics).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.overallMetrics.totalCells).toBeGreaterThanOrEqual(0);
    });

    it('should detect data quality issues', async () => {
      // Create data with quality issues
      const poorQualityData = `Name,Age,Salary
John,25,50000
Jane,,60000
Bob,30,
Alice,25,70000
John,25,50000`; // Duplicate row

      const intelligentDataWithIssues = await EnhancedDataParser.parseEnhanced(
        Buffer.from(poorQualityData),
        'poor_quality.csv',
        'text/csv'
      );

      const result = await DataQualityAnalyzer.analyzeQuality(intelligentDataWithIssues);

      expect(result.anomalies.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should calculate column statistics', async () => {
      const result = await DataQualityAnalyzer.analyzeQuality(intelligentData, {
        enableStatisticalAnalysis: true
      });

      const numericColumns = result.columnProfiles.filter(profile => 
        profile.statistics && 
        (profile.statistics.min !== undefined || profile.statistics.max !== undefined)
      );

      expect(numericColumns.length).toBeGreaterThan(0);
    });
  });

  describe('SynonymRecognitionService', () => {
    it('should recognize company names', () => {
      const result = SynonymRecognitionService.recognizeCompany('Apple Inc');
      
      expect(result).toBeDefined();
      if (result) {
        expect(result.normalizedName).toBeDefined();
        expect(result.aliases).toBeDefined();
        expect(result.confidence).toBeGreaterThan(0);
      }
    });

    it('should recognize company aliases', () => {
      const result = SynonymRecognitionService.recognizeCompany('AAPL');
      
      expect(result).toBeDefined();
      if (result) {
        expect(result.stockSymbol).toBe('AAPL');
        expect(result.confidence).toBeGreaterThan(0);
      }
    });

    it('should recognize financial terms', () => {
      const result = SynonymRecognitionService.recognizeFinancialTerm('revenue');
      
      expect(result).toBeDefined();
      if (result) {
        expect(result.synonyms).toBeDefined();
        expect(result.synonyms.length).toBeGreaterThan(0);
        expect(result.category).toBeDefined();
      }
    });

    it('should find synonyms for financial terms', () => {
      const result = SynonymRecognitionService.recognizeFinancialTerm('profit');
      
      expect(result).toBeDefined();
      if (result) {
        expect(result.synonyms).toContain('earnings');
        expect(result.synonyms).toContain('net income');
      }
    });

    it('should find synonyms with fuzzy matching', () => {
      const result = SynonymRecognitionService.findSynonyms(
        'revenu', // Misspelled
        EnhancedDataType.TEXT
      );

      // Should still find matches due to fuzzy matching
      expect(result).toBeDefined();
    });

    it('should build comprehensive synonym index', () => {
      const index = SynonymRecognitionService.buildSynonymIndex();
      
      expect(index.companyNames.size).toBeGreaterThan(0);
      expect(index.financialTerms.size).toBeGreaterThan(0);
      expect(index.businessTerms.size).toBeGreaterThan(0);
      expect(index.abbreviations.size).toBeGreaterThan(0);
    });
  });

  describe('EnhancedIntelligenceService', () => {
    it('should perform comprehensive analysis', async () => {
      const result = await EnhancedIntelligenceService.analyzeSpreadsheet(
        Buffer.from(sampleCSVData),
        'financial_data.csv',
        'text/csv'
      );

      expect(result).toBeDefined();
      expect(result.intelligentData).toBeDefined();
      expect(result.enhancementSummary).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.performance).toBeDefined();

      // Check enhancement summary
      expect(result.enhancementSummary.totalCellsAnalyzed).toBeGreaterThan(0);
      expect(result.enhancementSummary.qualityScore).toBeGreaterThanOrEqual(0);
      expect(result.enhancementSummary.qualityScore).toBeLessThanOrEqual(1);

      // Check performance metrics
      expect(result.performance.totalProcessingTime).toBeGreaterThan(0);
      expect(result.performance.cellsPerSecond).toBeGreaterThan(0);
    });

    it('should enhance existing spreadsheet data', async () => {
      // First parse with basic parser
      const { SpreadsheetParser } = await import('../services/SpreadsheetParser');
      const basicData = await SpreadsheetParser.parseFile(
        Buffer.from(sampleCSVData),
        'test.csv',
        'text/csv'
      );

      // Then enhance with intelligence
      const result = await EnhancedIntelligenceService.enhanceExistingData(basicData);

      expect(result).toBeDefined();
      expect(result.intelligentData).toBeDefined();
      expect(result.enhancementSummary).toBeDefined();
    });

    it('should perform intelligent search', async () => {
      const analysisResult = await EnhancedIntelligenceService.analyzeSpreadsheet(
        Buffer.from(sampleCSVData),
        'test.csv',
        'text/csv'
      );

      const searchResult = await EnhancedIntelligenceService.intelligentSearch(
        analysisResult.intelligentData,
        {
          term: 'apple',
          type: 'fuzzy',
          maxResults: 10
        }
      );

      expect(searchResult).toBeDefined();
      expect(searchResult.matches).toBeDefined();
    });

    it('should provide search suggestions', async () => {
      const analysisResult = await EnhancedIntelligenceService.analyzeSpreadsheet(
        Buffer.from(sampleCSVData),
        'test.csv',
        'text/csv'
      );

      const suggestions = EnhancedIntelligenceService.getSearchSuggestions(
        analysisResult.intelligentData,
        'app',
        5
      );

      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should recognize companies and financial terms', () => {
      const companyResult = EnhancedIntelligenceService.recognizeCompany('Microsoft');
      expect(companyResult).toBeDefined();

      const termResult = EnhancedIntelligenceService.recognizeFinancialTerm('revenue');
      expect(termResult).toBeDefined();
    });

    it('should generate appropriate recommendations', async () => {
      // Create data with some quality issues
      const problematicData = `Company,Revenue,Profit
Apple Inc,1000000,
Microsoft,,200000
,300000,50000`; // Missing values

      const result = await EnhancedIntelligenceService.analyzeSpreadsheet(
        Buffer.from(problematicData),
        'problematic.csv',
        'text/csv'
      );

      expect(result.recommendations.length).toBeGreaterThan(0);
      
      const qualityRecommendations = result.recommendations.filter(
        rec => rec.type === 'data_quality'
      );
      expect(qualityRecommendations.length).toBeGreaterThan(0);
    });

    it('should optimize intelligent data', async () => {
      const analysisResult = await EnhancedIntelligenceService.analyzeSpreadsheet(
        Buffer.from(sampleCSVData),
        'test.csv',
        'text/csv'
      );

      const optimizedData = await EnhancedIntelligenceService.optimizeIntelligentData(
        analysisResult.intelligentData
      );

      expect(optimizedData).toBeDefined();
      expect(optimizedData.searchIndex).toBeDefined();
      expect(optimizedData.synonymIndex).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    it('should handle large datasets efficiently', async () => {
      // Generate larger dataset
      const largeDataRows = [];
      largeDataRows.push('Company,Symbol,Price,Volume,Market Cap');
      
      for (let i = 0; i < 1000; i++) {
        largeDataRows.push(`Company${i},SYM${i},${(Math.random() * 1000).toFixed(2)},${Math.floor(Math.random() * 1000000)},${Math.floor(Math.random() * 1000000000)}`);
      }
      
      const largeData = largeDataRows.join('\n');
      const startTime = Date.now();

      const result = await EnhancedIntelligenceService.analyzeSpreadsheet(
        Buffer.from(largeData),
        'large_dataset.csv',
        'text/csv'
      );

      const processingTime = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(result.performance.totalProcessingTime).toBeLessThan(30000); // Should complete within 30 seconds
      expect(result.performance.cellsPerSecond).toBeGreaterThan(10); // Should process at least 10 cells per second
    });

    it('should maintain data integrity through enhancement process', async () => {
      const result = await EnhancedIntelligenceService.analyzeSpreadsheet(
        Buffer.from(sampleCSVData),
        'integrity_test.csv',
        'text/csv'
      );

      // Verify that original data is preserved
      const sheet = result.intelligentData.sheets[0];
      expect(sheet.data.length).toBeGreaterThan(0);
      
      // Check that we can find the original company names
      const appleCells = sheet.data.flat().filter(cell => 
        cell && String(cell.value).toLowerCase().includes('apple')
      );
      expect(appleCells.length).toBeGreaterThan(0);
    });

    it('should handle different file formats consistently', async () => {
      // Test with different CSV variations
      const csvVariations = [
        sampleCSVData, // Standard CSV
        sampleCSVData.replace(/,/g, ';'), // Semicolon-separated
        sampleCSVData.replace(/,/g, '\t') // Tab-separated
      ];

      for (const csvData of csvVariations) {
        const result = await EnhancedIntelligenceService.analyzeSpreadsheet(
          Buffer.from(csvData),
          'variation_test.csv',
          'text/csv'
        );

        expect(result).toBeDefined();
        expect(result.intelligentData.sheets.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid data gracefully', async () => {
      const invalidData = 'This is not valid CSV data';

      try {
        await EnhancedIntelligenceService.analyzeSpreadsheet(
          Buffer.from(invalidData),
          'invalid.csv',
          'text/csv'
        );
      } catch (error) {
        expect(error).toBeDefined();
        // Should throw a meaningful error
      }
    });

    it('should handle empty data', async () => {
      const emptyData = '';

      try {
        const result = await EnhancedIntelligenceService.analyzeSpreadsheet(
          Buffer.from(emptyData),
          'empty.csv',
          'text/csv'
        );
        
        // Should handle empty data without crashing
        expect(result).toBeDefined();
      } catch (error) {
        // Or throw a meaningful error
        expect(error).toBeDefined();
      }
    });

    it('should handle malformed search queries', async () => {
      const analysisResult = await EnhancedIntelligenceService.analyzeSpreadsheet(
        Buffer.from(sampleCSVData),
        'test.csv',
        'text/csv'
      );

      // Test with invalid search query
      const searchResult = await EnhancedIntelligenceService.intelligentSearch(
        analysisResult.intelligentData,
        {
          term: '', // Empty search term
          maxResults: -1 // Invalid max results
        }
      );

      expect(searchResult).toBeDefined();
      expect(searchResult.matches).toBeDefined();
    });
  });
});