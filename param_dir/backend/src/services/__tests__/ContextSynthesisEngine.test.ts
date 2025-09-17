/**
 * Tests for Context Synthesis Engine
 */

import { ContextSynthesisEngine } from '../ContextSynthesisEngine';
import { 
  ComprehensiveContext,
  ContextInsight,
  Risk,
  Opportunity,
  DiscoveredPattern,
  InsightType,
  RiskType,
  OpportunityType,
  PatternType,
  ConfidenceLevel
} from '../../types/context-synthesis';
import { EnhancedIntent } from '../../types/intent-analysis';
import { SelectionCandidate } from '../../types/intelligent-selection';
import { DomainEnhancedAnalysis } from '../../types/domain-intelligence';
import { IntelligentSpreadsheetData, DomainType } from '../../types/enhanced-intelligence';

describe('ContextSynthesisEngine', () => {
  let engine: ContextSynthesisEngine;
  let mockData: IntelligentSpreadsheetData;
  let mockIntent: EnhancedIntent;
  let mockSelection: SelectionCandidate;
  let mockDomainAnalysis: DomainEnhancedAnalysis;

  beforeEach(() => {
    engine = new ContextSynthesisEngine();

    // Mock intelligent spreadsheet data
    mockData = {
      sheets: [{
        name: 'Portfolio',
        data: [
          [{ value: 'Company', dataType: 'text' }, { value: 'Price', dataType: 'number' }, { value: 'Shares', dataType: 'number' }],
          [{ value: 'Apple Inc', dataType: 'text' }, { value: 150.25, dataType: 'number' }, { value: 100, dataType: 'number' }],
          [{ value: 'Microsoft', dataType: 'text' }, { value: 280.50, dataType: 'number' }, { value: 50, dataType: 'number' }]
        ]
      }],
      searchIndex: {
        byContent: new Map(),
        byColumn: new Map(),
        byDataType: new Map([
          ['text', []],
          ['number', []]
        ]),
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
        headerPatterns: [{
          row: 0,
          columns: [0, 1, 2],
          confidence: 0.9,
          type: 'main_header',
          content: ['Company', 'Price', 'Shares']
        }],
        dataBlocks: [{
          startRow: 1,
          endRow: 2,
          startCol: 0,
          endCol: 2,
          type: 'data_block' as any,
          confidence: 0.95,
          description: 'Main data block'
        }],
        relationships: [{
          type: 'correlation',
          source: [],
          target: [],
          strength: 0.8,
          description: 'Price-value correlation'
        }],
        hierarchies: [],
        timeSeriesPatterns: [{
          dateColumn: -1,
          valueColumns: [1],
          frequency: 'daily' as any,
          trend: 'increasing' as any,
          confidence: 0.75
        }]
      },
      qualityMetrics: {
        overallScore: 0.85,
        completeness: 0.90,
        consistency: 0.85,
        accuracy: 0.88,
        validity: 0.82,
        uniqueness: 0.95,
        issues: [],
        recommendations: []
      },
      domainContext: {
        domain: DomainType.FINANCIAL,
        confidence: 0.9,
        subDomain: 'portfolio_management',
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
    } as IntelligentSpreadsheetData;

    // Mock enhanced intent
    mockIntent = {
      query: {
        original: 'What is the average price for Apple Inc?',
        normalized: 'average price apple inc',
        entities: [{
          text: 'Apple Inc',
          type: 'company' as any,
          subType: 'public_company',
          confidence: 0.95,
          position: { start: 25, end: 34, tokenIndex: 5 },
          alternatives: [],
          resolvedEntity: {
            canonicalName: 'Apple Inc.',
            aliases: ['AAPL', 'Apple'],
            metadata: {
              type: 'company' as any,
              domain: DomainType.FINANCIAL,
              attributes: { sector: 'technology' },
              relationships: [],
              source: 'entity_resolver'
            },
            confidence: 0.95,
            dataReferences: []
          }
        }],
        tokens: []
      },
      intent: {
        primary: {
          type: 'calculate' as any,
          subType: 'average',
          confidence: 0.9,
          reasoning: ['Query asks for average calculation'],
          matchedPatterns: [],
          domainSpecific: true
        },
        secondary: [],
        confidence: 0.9,
        ambiguities: [],
        clarificationNeeded: false
      },
      scope: {
        dataScope: {
          type: 'specific_cells' as any,
          ranges: [],
          includeRelated: false,
          expansionRules: [],
          confidence: 0.8
        },
        analyticalScope: {
          analysisType: ['descriptive' as any],
          metrics: [{
            name: 'average',
            type: 'average' as any,
            parameters: {},
            priority: 1
          }],
          aggregations: [],
          comparisons: [],
          timeframe: undefined
        },
        temporalScope: {
          type: 'point_in_time' as any
        }
      },
      context: {
        businessContext: {
          domain: DomainType.FINANCIAL,
          useCase: 'financial_analysis' as any,
          stakeholder: 'analyst' as any,
          urgency: 'medium' as any,
          complexity: 'simple' as any
        },
        userContext: {
          expertise: 'intermediate' as any,
          role: 'analyst' as any
        },
        sessionContext: {
          sessionId: 'test_session',
          startTime: new Date(),
          queryCount: 1,
          recentEntities: [],
          conversationFlow: []
        }
      }
    } as EnhancedIntent;

    // Mock selection candidate
    mockSelection = {
      id: 'selection_1',
      range: { sheetName: 'Portfolio', startRow: 1, endRow: 1, startCol: 0, endCol: 2 },
      confidence: 0.85,
      explanation: 'Selected Apple Inc row based on entity match',
      matchType: 'exact' as any,
      relevantColumns: [{
        index: 1,
        header: 'Price',
        dataType: 'number',
        relevanceScore: 0.9,
        relationship: 'primary' as any,
        quality: {
          completeness: 1.0,
          consistency: 1.0,
          accuracy: 1.0,
          validity: 1.0,
          issues: []
        }
      }],
      relatedSelections: [],
      entityMatches: [{
        entity: 'Apple Inc',
        matchedCells: [{
          row: 1,
          col: 0,
          value: 'Apple Inc',
          similarity: 1.0,
          address: 'A2',
          context: {
            surroundingCells: [],
            columnHeader: 'Company',
            dataPattern: 'data_value' as any
          }
        }],
        confidence: 0.95,
        matchType: 'exact' as any,
        synonyms: ['AAPL'],
        context: {
          domain: 'financial' as any,
          category: 'company' as any,
          attributes: []
        }
      }],
      score: 0.85,
      selectionType: 'row_based' as any,
      metadata: {
        cellCount: 3,
        dataQuality: 0.9,
        completeness: 1.0,
        hasFormulas: false,
        hasHeaders: true,
        estimatedProcessingTime: 100
      }
    } as SelectionCandidate;

    // Mock domain analysis
    mockDomainAnalysis = {
      domainClassification: {
        primaryDomain: DomainType.FINANCIAL,
        subDomains: [DomainType.FINANCIAL],
        confidence: 0.9,
        applicableRules: [],
        suggestedMetrics: [],
        detectedPatterns: []
      },
      applicableMetrics: [],
      suggestedFormulas: [],
      kpiRecommendations: [],
      templateMatches: [],
      businessInsights: [{
        type: 'trend',
        title: 'Financial Domain Detected',
        description: 'Financial domain with portfolio management context',
        confidence: 0.9,
        impact: 'medium',
        actionable: true,
        supportingData: []
      }],
      recommendations: [{
        type: 'analysis',
        priority: 'medium',
        title: 'Portfolio Analysis',
        description: 'Consider portfolio performance metrics',
        implementation: 'Calculate portfolio metrics',
        expectedBenefit: 'Better investment insights',
        effort: 'medium'
      }]
    } as DomainEnhancedAnalysis;
  });

  describe('synthesizeContext', () => {
    it('should create comprehensive context successfully', async () => {
      const result = await engine.synthesizeContext(
        mockIntent,
        mockSelection,
        mockDomainAnalysis,
        mockData
      );

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^ctx_/);
      expect(result.query).toBe('What is the average price for Apple Inc?');
      expect(result.dataContext).toBeDefined();
      expect(result.businessContext).toBeDefined();
      expect(result.analyticalContext).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should generate appropriate insights', async () => {
      const result = await engine.synthesizeContext(
        mockIntent,
        mockSelection,
        mockDomainAnalysis,
        mockData
      );

      expect(result.insights).toBeDefined();
      expect(Array.isArray(result.insights)).toBe(true);
      
      // Should have financial domain insight
      const financialInsight = result.insights.find(i => 
        i.category === 'financial' && i.type === InsightType.RECOMMENDATION
      );
      expect(financialInsight).toBeDefined();
      expect(financialInsight?.title).toContain('Financial Analysis');
    });

    it('should identify data quality risks when quality is low', async () => {
      // Modify mock data to have low quality
      mockData.qualityMetrics.overallScore = 0.6;
      mockData.qualityMetrics.completeness = 0.65;

      const result = await engine.synthesizeContext(
        mockIntent,
        mockSelection,
        mockDomainAnalysis,
        mockData
      );

      expect(result.risks).toBeDefined();
      const dataQualityRisk = result.risks.find(r => r.type === RiskType.DATA_QUALITY);
      expect(dataQualityRisk).toBeDefined();
      expect(dataQualityRisk?.title).toContain('Data Quality');
    });

    it('should identify opportunities for data enhancement', async () => {
      // Set completeness below threshold
      mockData.qualityMetrics.completeness = 0.8;

      const result = await engine.synthesizeContext(
        mockIntent,
        mockSelection,
        mockDomainAnalysis,
        mockData,
        { includeOpportunityAnalysis: true }
      );

      expect(result.opportunities).toBeDefined();
      const enhancementOpp = result.opportunities.find(o => 
        o.type === OpportunityType.QUALITY_ENHANCEMENT
      );
      expect(enhancementOpp).toBeDefined();
    });

    it('should discover temporal patterns', async () => {
      const result = await engine.synthesizeContext(
        mockIntent,
        mockSelection,
        mockDomainAnalysis,
        mockData,
        { includePatternDiscovery: true }
      );

      expect(result.patterns).toBeDefined();
      const temporalPattern = result.patterns.find(p => p.type === PatternType.TEMPORAL);
      expect(temporalPattern).toBeDefined();
      expect(temporalPattern?.name).toContain('daily');
    });

    it('should calculate confidence correctly', async () => {
      const result = await engine.synthesizeContext(
        mockIntent,
        mockSelection,
        mockDomainAnalysis,
        mockData
      );

      expect(result.confidence.score).toBeGreaterThan(0);
      expect(result.confidence.score).toBeLessThanOrEqual(1);
      expect(result.confidence.level).toBeDefined();
      expect(result.confidence.components).toHaveLength(5);
      
      // Check component weights sum to 1
      const totalWeight = result.confidence.components.reduce((sum, comp) => sum + comp.weight, 0);
      expect(totalWeight).toBeCloseTo(1.0, 2);
    });

    it('should generate actionable recommendations', async () => {
      const result = await engine.synthesizeContext(
        mockIntent,
        mockSelection,
        mockDomainAnalysis,
        mockData
      );

      expect(result.nextSteps).toBeDefined();
      expect(Array.isArray(result.nextSteps)).toBe(true);
      
      if (result.nextSteps.length > 0) {
        const recommendation = result.nextSteps[0];
        expect(recommendation.title).toBeDefined();
        expect(recommendation.description).toBeDefined();
        expect(recommendation.priority).toBeDefined();
        expect(recommendation.steps).toBeDefined();
      }
    });

    it('should handle options correctly', async () => {
      const options = {
        includeRiskAnalysis: false,
        includeOpportunityAnalysis: false,
        includePatternDiscovery: false,
        confidenceThreshold: 0.8,
        maxInsights: 3,
        maxRecommendations: 2
      };

      const result = await engine.synthesizeContext(
        mockIntent,
        mockSelection,
        mockDomainAnalysis,
        mockData,
        options
      );

      expect(result.risks).toHaveLength(0);
      expect(result.opportunities).toHaveLength(0);
      expect(result.patterns).toHaveLength(0);
      expect(result.insights.length).toBeLessThanOrEqual(3);
      expect(result.nextSteps.length).toBeLessThanOrEqual(2);
    });

    it('should assess complexity correctly', async () => {
      const result = await engine.synthesizeContext(
        mockIntent,
        mockSelection,
        mockDomainAnalysis,
        mockData
      );

      expect(result.complexity).toBeDefined();
      expect(['simple', 'moderate', 'complex', 'very_complex']).toContain(result.complexity);
    });

    it('should handle uncertainty quantification', async () => {
      const result = await engine.synthesizeContext(
        mockIntent,
        mockSelection,
        mockDomainAnalysis,
        mockData,
        { enableUncertaintyQuantification: true }
      );

      expect(result.confidence.uncertainty).toBeDefined();
      expect(result.confidence.uncertainty.overallUncertainty).toBeGreaterThanOrEqual(0);
      expect(result.confidence.uncertainty.overallUncertainty).toBeLessThanOrEqual(1);
      expect(result.confidence.uncertainty.confidenceInterval).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      // Test with null data to force an error
      const invalidData = null;

      await expect(
        engine.synthesizeContext(mockIntent, mockSelection, mockDomainAnalysis, invalidData as any)
      ).rejects.toThrow();
    });
  });

  describe('confidence calculation', () => {
    it('should return high confidence for high-quality inputs', async () => {
      // Set all inputs to high confidence/quality
      mockIntent.intent.confidence = 0.95;
      mockSelection.confidence = 0.9;
      mockDomainAnalysis.domainClassification.confidence = 0.9;
      mockData.qualityMetrics.overallScore = 0.9;

      const result = await engine.synthesizeContext(
        mockIntent,
        mockSelection,
        mockDomainAnalysis,
        mockData
      );

      expect(result.confidence.score).toBeGreaterThan(0.8);
      expect(result.confidence.level).toBe(ConfidenceLevel.HIGH);
    });

    it('should return lower confidence for ambiguous intent', async () => {
      // Add ambiguities to intent
      mockIntent.intent.confidence = 0.5;
      mockIntent.intent.ambiguities = [
        {
          type: 'entity_reference' as any,
          description: 'Multiple possible entities',
          alternatives: [],
          confidence: 0.6,
          resolutionStrategy: { type: 'clarification' }
        }
      ];

      const result = await engine.synthesizeContext(
        mockIntent,
        mockSelection,
        mockDomainAnalysis,
        mockData
      );

      expect(result.confidence.score).toBeLessThan(0.8);
    });
  });

  describe('insight generation', () => {
    it('should generate intent clarity insights for low confidence', async () => {
      mockIntent.intent.confidence = 0.5;

      const result = await engine.synthesizeContext(
        mockIntent,
        mockSelection,
        mockDomainAnalysis,
        mockData
      );

      const clarityInsight = result.insights.find(i => 
        i.title.includes('Intent Clarity')
      );
      expect(clarityInsight).toBeDefined();
      expect(clarityInsight?.type).toBe(InsightType.VALIDATION);
    });

    it('should generate correlation insights when relationships exist', async () => {
      // Add more correlation relationships
      mockData.dataPatterns.relationships.push({
        type: 'correlation',
        source: [],
        target: [],
        strength: 0.9,
        description: 'Strong price-volume correlation'
      });

      const result = await engine.synthesizeContext(
        mockIntent,
        mockSelection,
        mockDomainAnalysis,
        mockData
      );

      const correlationInsight = result.insights.find(i => 
        i.type === InsightType.CORRELATION
      );
      expect(correlationInsight).toBeDefined();
    });
  });
});