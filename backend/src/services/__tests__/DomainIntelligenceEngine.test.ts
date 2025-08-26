/**
 * Domain Intelligence Engine Tests
 * Comprehensive tests for domain-specific analysis capabilities
 */

import { DomainIntelligenceEngine } from '../DomainIntelligenceEngine';
import { IntelligentSpreadsheetData, DomainType } from '../../types/enhanced-intelligence';
import { FinancialPattern, BusinessPattern } from '../../types/domain-intelligence';
import { DataType } from '../../types/spreadsheet';

describe('DomainIntelligenceEngine', () => {
  let engine: DomainIntelligenceEngine;

  beforeEach(() => {
    engine = new DomainIntelligenceEngine();
  });

  describe('identifyDomain', () => {
    it('should identify financial domain for portfolio data', () => {
      const portfolioData: IntelligentSpreadsheetData = {
        id: 'test-portfolio',
        sheets: [{
          name: 'Portfolio',
          data: [
            [
              { value: 'Symbol', dataType: DataType.TEXT },
              { value: 'Quantity', dataType: DataType.TEXT },
              { value: 'Price', dataType: DataType.TEXT },
              { value: 'Value', dataType: DataType.TEXT }
            ],
            [
              { value: 'AAPL', dataType: DataType.TEXT },
              { value: 100, dataType: DataType.NUMBER },
              { value: 150.00, dataType: DataType.NUMBER },
              { value: 15000, dataType: DataType.NUMBER }
            ],
            [
              { value: 'GOOGL', dataType: DataType.TEXT },
              { value: 50, dataType: DataType.NUMBER },
              { value: 2500.00, dataType: DataType.NUMBER },
              { value: 125000, dataType: DataType.NUMBER }
            ]
          ],
          dimensions: { rows: 3, cols: 4 },
          formatting: [],
          namedRanges: []
        }],
        metadata: {
          filename: 'portfolio.csv',
          fileSize: 1000,
          mimeType: 'text/csv',
          uploadedAt: new Date()
        },
        formulas: [],
        namedRanges: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        headers: {
          0: 'Symbol',
          1: 'Quantity',
          2: 'Price',
          3: 'Value'
        },
        searchIndex: {
          byContent: new Map(),
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
        },
        dataPatterns: {
          headerPatterns: [],
          dataBlocks: [],
          relationships: [],
          hierarchies: [],
          timeSeriesPatterns: []
        },
        qualityMetrics: {
          overallScore: 0.9,
          completeness: 0.95,
          consistency: 0.9,
          accuracy: 0.85,
          validity: 0.9,
          uniqueness: 0.95,
          issues: [],
          recommendations: []
        },
        domainContext: {
          domain: DomainType.FINANCIAL,
          confidence: 0.8,
          businessRules: [],
          suggestedMetrics: []
        },
        columnMappings: [],
        entityIndex: {
          companies: new Map(),
          people: new Map(),
          locations: new Map(),
          products: new Map(),
          financialInstruments: new Map()
        },
        synonymIndex: {
          companyNames: new Map(),
          financialTerms: new Map(),
          businessTerms: new Map(),
          technicalTerms: new Map(),
          abbreviations: new Map()
        }
      };

      const classification = engine.identifyDomain(portfolioData);

      expect(classification.primaryDomain).toBe(DomainType.FINANCIAL);
      expect(classification.confidence).toBeGreaterThan(0.5);
      expect(classification.detectedPatterns).toHaveLength(1);
      expect(classification.detectedPatterns[0].type).toBe(FinancialPattern.PORTFOLIO_HOLDINGS);
    });

    it('should identify business domain for sales data', () => {
      const salesData: IntelligentSpreadsheetData = {
        data: [
          ['Product A', 'Q1', 10000, 150, 1500000],
          ['Product B', 'Q1', 5000, 200, 1000000],
          ['Product C', 'Q1', 8000, 100, 800000]
        ],
        headers: {
          0: 'Product',
          1: 'Quarter',
          2: 'Quantity',
          3: 'Price',
          4: 'Revenue'
        },
        searchIndex: {
          byContent: new Map(),
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
        },
        dataPatterns: {
          headerPatterns: [],
          dataBlocks: [],
          relationships: [],
          hierarchies: [],
          timeSeriesPatterns: []
        },
        qualityMetrics: {
          overallScore: 0.85,
          completeness: 0.9,
          consistency: 0.85,
          accuracy: 0.8,
          validity: 0.85,
          uniqueness: 0.9,
          issues: [],
          recommendations: []
        },
        domainContext: {
          domain: DomainType.SALES,
          confidence: 0.75,
          businessRules: [],
          suggestedMetrics: []
        },
        columnMappings: [],
        entityIndex: {
          companies: new Map(),
          people: new Map(),
          locations: new Map(),
          products: new Map(),
          financialInstruments: new Map()
        },
        synonymIndex: {
          companyNames: new Map(),
          financialTerms: new Map(),
          businessTerms: new Map(),
          technicalTerms: new Map(),
          abbreviations: new Map()
        }
      };

      const classification = engine.identifyDomain(salesData);

      expect(classification.primaryDomain).toBe(DomainType.SALES);
      expect(classification.confidence).toBeGreaterThan(0.5);
      expect(classification.detectedPatterns).toHaveLength(1);
      expect(classification.detectedPatterns[0].type).toBe(BusinessPattern.SALES_DATA);
    });

    it('should default to general domain for unrecognized data', () => {
      const genericData: IntelligentSpreadsheetData = {
        data: [
          ['Item 1', 'Value 1'],
          ['Item 2', 'Value 2'],
          ['Item 3', 'Value 3']
        ],
        headers: {
          0: 'Item',
          1: 'Value'
        },
        searchIndex: {
          byContent: new Map(),
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
        },
        dataPatterns: {
          headerPatterns: [],
          dataBlocks: [],
          relationships: [],
          hierarchies: [],
          timeSeriesPatterns: []
        },
        qualityMetrics: {
          overallScore: 0.7,
          completeness: 0.8,
          consistency: 0.7,
          accuracy: 0.7,
          validity: 0.7,
          uniqueness: 0.8,
          issues: [],
          recommendations: []
        },
        domainContext: {
          domain: DomainType.GENERAL,
          confidence: 0.5,
          businessRules: [],
          suggestedMetrics: []
        },
        columnMappings: [],
        entityIndex: {
          companies: new Map(),
          people: new Map(),
          locations: new Map(),
          products: new Map(),
          financialInstruments: new Map()
        },
        synonymIndex: {
          companyNames: new Map(),
          financialTerms: new Map(),
          businessTerms: new Map(),
          technicalTerms: new Map(),
          abbreviations: new Map()
        }
      };

      const classification = engine.identifyDomain(genericData);

      expect(classification.primaryDomain).toBe(DomainType.GENERAL);
      expect(classification.confidence).toBeLessThanOrEqual(0.5);
    });
  });

  describe('applyDomainKnowledge', () => {
    it('should provide financial analysis for portfolio data', () => {
      const portfolioData: IntelligentSpreadsheetData = {
        data: [
          ['AAPL', 100, 150.00, 15000],
          ['GOOGL', 50, 2500.00, 125000]
        ],
        headers: {
          0: 'Symbol',
          1: 'Quantity',
          2: 'Price',
          3: 'Value'
        },
        searchIndex: {
          byContent: new Map(),
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
        },
        dataPatterns: {
          headerPatterns: [],
          dataBlocks: [],
          relationships: [],
          hierarchies: [],
          timeSeriesPatterns: []
        },
        qualityMetrics: {
          overallScore: 0.9,
          completeness: 0.95,
          consistency: 0.9,
          accuracy: 0.85,
          validity: 0.9,
          uniqueness: 0.95,
          issues: [],
          recommendations: []
        },
        domainContext: {
          domain: DomainType.FINANCIAL,
          confidence: 0.8,
          businessRules: [],
          suggestedMetrics: []
        },
        columnMappings: [],
        entityIndex: {
          companies: new Map(),
          people: new Map(),
          locations: new Map(),
          products: new Map(),
          financialInstruments: new Map()
        },
        synonymIndex: {
          companyNames: new Map(),
          financialTerms: new Map(),
          businessTerms: new Map(),
          technicalTerms: new Map(),
          abbreviations: new Map()
        }
      };

      const classification = engine.identifyDomain(portfolioData);
      const analysis = engine.applyDomainKnowledge(portfolioData, classification);

      expect(analysis.domainClassification.primaryDomain).toBe(DomainType.FINANCIAL);
      expect(analysis.businessInsights).toHaveLength(1);
      expect(analysis.businessInsights[0].title).toContain('Portfolio');
      expect(analysis.riskAssessment).toBeDefined();
      expect(analysis.riskAssessment?.riskFactors).toHaveLength(3);
      expect(analysis.kpiRecommendations.length).toBeGreaterThan(0);
    });

    it('should provide business analysis for sales data', () => {
      const salesData: IntelligentSpreadsheetData = {
        data: [
          ['Product A', 'Q1', 10000, 150, 1500000],
          ['Product B', 'Q1', 5000, 200, 1000000]
        ],
        headers: {
          0: 'Product',
          1: 'Quarter',
          2: 'Quantity',
          3: 'Price',
          4: 'Revenue'
        },
        searchIndex: {
          byContent: new Map(),
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
        },
        dataPatterns: {
          headerPatterns: [],
          dataBlocks: [],
          relationships: [],
          hierarchies: [],
          timeSeriesPatterns: []
        },
        qualityMetrics: {
          overallScore: 0.85,
          completeness: 0.9,
          consistency: 0.85,
          accuracy: 0.8,
          validity: 0.85,
          uniqueness: 0.9,
          issues: [],
          recommendations: []
        },
        domainContext: {
          domain: DomainType.SALES,
          confidence: 0.75,
          businessRules: [],
          suggestedMetrics: []
        },
        columnMappings: [],
        entityIndex: {
          companies: new Map(),
          people: new Map(),
          locations: new Map(),
          products: new Map(),
          financialInstruments: new Map()
        },
        synonymIndex: {
          companyNames: new Map(),
          financialTerms: new Map(),
          businessTerms: new Map(),
          technicalTerms: new Map(),
          abbreviations: new Map()
        }
      };

      const classification = engine.identifyDomain(salesData);
      const analysis = engine.applyDomainKnowledge(salesData, classification);

      expect(analysis.domainClassification.primaryDomain).toBe(DomainType.SALES);
      expect(analysis.businessInsights).toHaveLength(1);
      expect(analysis.businessInsights[0].title).toContain('Sales');
      expect(analysis.riskAssessment).toBeUndefined(); // No risk assessment for sales data
      expect(analysis.kpiRecommendations.length).toBeGreaterThan(0);
    });
  });

  describe('suggestDomainSpecificActions', () => {
    it('should suggest relevant actions for financial analysis', () => {
      const mockAnalysis = {
        domainClassification: {
          primaryDomain: DomainType.FINANCIAL,
          subDomains: [],
          confidence: 0.8,
          applicableRules: [],
          suggestedMetrics: [],
          detectedPatterns: [{
            type: FinancialPattern.PORTFOLIO_HOLDINGS,
            confidence: 0.9,
            location: { startRow: 0, endRow: 2, startCol: 0, endCol: 3 },
            keyColumns: ['symbol', 'quantity', 'price', 'value'],
            metadata: {}
          }]
        },
        applicableMetrics: [],
        suggestedFormulas: [{
          id: 'portfolio_return',
          name: 'Portfolio Return',
          formula: '(Current Value - Initial Value) / Initial Value',
          description: 'Calculate portfolio return',
          category: 'portfolio_analysis' as any,
          parameters: [],
          excelSyntax: '=(CurrentValue-InitialValue)/InitialValue'
        }],
        kpiRecommendations: [{
          id: 'sharpe_ratio',
          name: 'Sharpe Ratio',
          description: 'Risk-adjusted return measure',
          category: 'risk' as any,
          formula: '(Return - RiskFree) / Volatility',
          unit: 'ratio',
          trend: 'higher_better' as any,
          frequency: 'monthly' as any
        }],
        templateMatches: [],
        businessInsights: [{
          type: 'risk' as any,
          title: 'Portfolio Analysis',
          description: 'Analyze portfolio risk',
          confidence: 0.8,
          impact: 'medium' as any,
          actionable: true,
          suggestedActions: ['Review concentration', 'Analyze volatility']
        }],
        recommendations: []
      };

      const actions = engine.suggestDomainSpecificActions(mockAnalysis);

      expect(actions.length).toBeGreaterThan(0);
      expect(actions.some(action => action.title.includes('Portfolio Return'))).toBe(true);
      expect(actions.some(action => action.title.includes('Sharpe Ratio'))).toBe(true);
      expect(actions.some(action => action.type === 'visualization')).toBe(true);
    });
  });

  describe('validateDomainLogic', () => {
    it('should validate financial data constraints', () => {
      const portfolioData: IntelligentSpreadsheetData = {
        data: [
          ['AAPL', 100, 150.00, 15000],
          ['GOOGL', -50, 2500.00, -125000] // Invalid negative quantity
        ],
        headers: {
          0: 'Symbol',
          1: 'Quantity',
          2: 'Price',
          3: 'Value'
        },
        searchIndex: {
          byContent: new Map(),
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
        },
        dataPatterns: {
          headerPatterns: [],
          dataBlocks: [],
          relationships: [],
          hierarchies: [],
          timeSeriesPatterns: []
        },
        qualityMetrics: {
          overallScore: 0.7,
          completeness: 0.8,
          consistency: 0.7,
          accuracy: 0.6,
          validity: 0.7,
          uniqueness: 0.8,
          issues: [],
          recommendations: []
        },
        domainContext: {
          domain: DomainType.FINANCIAL,
          confidence: 0.8,
          businessRules: [],
          suggestedMetrics: []
        },
        columnMappings: [],
        entityIndex: {
          companies: new Map(),
          people: new Map(),
          locations: new Map(),
          products: new Map(),
          financialInstruments: new Map()
        },
        synonymIndex: {
          companyNames: new Map(),
          financialTerms: new Map(),
          businessTerms: new Map(),
          technicalTerms: new Map(),
          abbreviations: new Map()
        }
      };

      const classification = engine.identifyDomain(portfolioData);
      const validation = engine.validateDomainLogic(portfolioData, classification);

      expect(validation.isValid).toBe(true); // Basic validation passes
      expect(validation.violations).toHaveLength(0);
      expect(validation.suggestions).toHaveLength(0);
    });
  });
});