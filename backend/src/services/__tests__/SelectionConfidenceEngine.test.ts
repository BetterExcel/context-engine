/**
 * Tests for SelectionConfidenceEngine service
 */

import { SelectionConfidenceEngine } from '../SelectionConfidenceEngine';
import {
  SelectionCandidate,
  SelectionContext,
  ConfidenceBreakdown,
  EntityMatch,
  MatchType,
  RelationshipMap,
  DependencyType,
  EntityDomain,
  EntityCategory,
  RelationshipType,
  SelectionType
} from '../../types/intelligent-selection';
import {
  SpreadsheetData,
  Sheet,
  Cell,
  DataType
} from '../../types/spreadsheet';
import { RequestAnalysis, IntentType } from '../../types/context';

describe('SelectionConfidenceEngine', () => {
  let mockSpreadsheetData: SpreadsheetData;
  let mockContext: SelectionContext;
  let mockRelationshipMap: RelationshipMap;
  let mockCandidate: SelectionCandidate;

  beforeEach(() => {
    // Create mock spreadsheet data
    const mockSheet: Sheet = {
      name: 'TestSheet',
      data: [
        [
          { value: 'Company', dataType: DataType.TEXT },
          { value: 'Price', dataType: DataType.TEXT },
          { value: 'Volume', dataType: DataType.TEXT }
        ],
        [
          { value: 'Apple Inc', dataType: DataType.TEXT },
          { value: 150.25, dataType: DataType.NUMBER },
          { value: 1000000, dataType: DataType.NUMBER }
        ],
        [
          { value: 'Microsoft Corp', dataType: DataType.TEXT },
          { value: 280.50, dataType: DataType.NUMBER },
          { value: 800000, dataType: DataType.NUMBER }
        ]
      ],
      dimensions: { rows: 3, cols: 3 },
      formatting: [],
      namedRanges: []
    };

    mockSpreadsheetData = {
      id: 'test-spreadsheet',
      sheets: [mockSheet],
      metadata: {
        filename: 'test.xlsx',
        fileSize: 1024,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        uploadedAt: new Date()
      },
      formulas: [],
      namedRanges: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Create mock context
    const mockIntent: RequestAnalysis = {
      intent: IntentType.DATA_ANALYSIS,
      scope: 'sheet',
      confidence: 0.8,
      keywords: ['Apple', 'price']
    };

    mockContext = {
      query: 'What is the price of Apple Inc?',
      intent: mockIntent,
      entities: ['Apple Inc', 'price'],
      scope: {
        includeHeaders: true,
        expandToRelated: true,
        confidenceThreshold: 0.3,
        respectDataBoundaries: true,
        includeCalculatedFields: false
      },
      preferences: {
        prioritizeExactMatches: true,
        includeCalculatedFields: false,
        expandToDependencies: false,
        respectDataBoundaries: true,
        preferLargerSelections: false,
        optimizeForAnalysis: true,
        includeContextualData: true
      }
    };

    // Create mock relationship map
    mockRelationshipMap = {
      columnDependencies: [
        {
          sourceColumn: 0,
          targetColumn: 1,
          dependencyType: DependencyType.REFERENCE,
          strength: 0.8,
          description: 'Company to Price relationship',
          isDirectDependency: true
        }
      ],
      dataHierarchies: [],
      calculatedFields: [],
      crossReferences: [],
      semanticRelationships: []
    };

    // Create mock entity match
    const mockEntityMatch: EntityMatch = {
      entity: 'Apple Inc',
      matchedCells: [
        {
          row: 1,
          col: 0,
          value: 'Apple Inc',
          similarity: 1.0,
          address: 'A2',
          context: {
            surroundingCells: [],
            columnHeader: 'Company'
          }
        }
      ],
      confidence: 0.95,
      matchType: MatchType.EXACT,
      synonyms: ['Apple', 'AAPL'],
      context: {
        domain: EntityDomain.FINANCIAL,
        category: EntityCategory.COMPANY,
        attributes: []
      }
    };

    // Create mock candidate
    mockCandidate = {
      id: 'test-candidate',
      range: {
        startRow: 1,
        endRow: 1,
        startCol: 0,
        endCol: 2,
        sheetName: 'TestSheet'
      },
      confidence: 0.8,
      explanation: 'Row containing Apple Inc data',
      matchType: MatchType.EXACT,
      relevantColumns: [
        {
          index: 0,
          header: 'Company',
          dataType: 'text',
          relevanceScore: 0.9,
          relationship: RelationshipType.PRIMARY,
          quality: {
            completeness: 0.9,
            consistency: 0.9,
            accuracy: 0.9,
            validity: 0.9,
            issues: []
          }
        },
        {
          index: 1,
          header: 'Price',
          dataType: 'number',
          relevanceScore: 0.8,
          relationship: RelationshipType.RELATED,
          quality: {
            completeness: 0.8,
            consistency: 0.8,
            accuracy: 0.8,
            validity: 0.8,
            issues: []
          }
        }
      ],
      relatedSelections: [],
      entityMatches: [mockEntityMatch],
      score: 0.8,
      selectionType: SelectionType.ROW_BASED,
      metadata: {
        cellCount: 3,
        dataQuality: 0.9,
        completeness: 0.95,
        hasFormulas: false,
        hasHeaders: true,
        estimatedProcessingTime: 15
      }
    };
  });

  describe('calculateConfidence', () => {
    it('should calculate comprehensive confidence breakdown', () => {
      const confidenceBreakdown = SelectionConfidenceEngine.calculateConfidence(
        mockCandidate,
        mockContext,
        mockSpreadsheetData,
        mockRelationshipMap
      );

      expect(confidenceBreakdown).toBeDefined();
      expect(confidenceBreakdown.overall).toBeGreaterThan(0);
      expect(confidenceBreakdown.overall).toBeLessThanOrEqual(1);
      
      expect(confidenceBreakdown.entityMatching).toBeGreaterThan(0);
      expect(confidenceBreakdown.dataQuality).toBeGreaterThan(0);
      expect(confidenceBreakdown.relationshipMapping).toBeGreaterThan(0);
      expect(confidenceBreakdown.contextualRelevance).toBeGreaterThan(0);
      
      expect(confidenceBreakdown.factors).toBeDefined();
      expect(confidenceBreakdown.factors.length).toBeGreaterThan(0);
    });

    it('should boost confidence for exact matches', () => {
      const exactMatchCandidate = {
        ...mockCandidate,
        matchType: MatchType.EXACT,
        entityMatches: [
          {
            ...mockCandidate.entityMatches[0],
            matchType: MatchType.EXACT,
            confidence: 1.0
          }
        ]
      };

      const fuzzyMatchCandidate = {
        ...mockCandidate,
        matchType: MatchType.FUZZY,
        entityMatches: [
          {
            ...mockCandidate.entityMatches[0],
            matchType: MatchType.FUZZY,
            confidence: 0.7
          }
        ]
      };

      const exactConfidence = SelectionConfidenceEngine.calculateConfidence(
        exactMatchCandidate,
        mockContext,
        mockSpreadsheetData,
        mockRelationshipMap
      );

      const fuzzyConfidence = SelectionConfidenceEngine.calculateConfidence(
        fuzzyMatchCandidate,
        mockContext,
        mockSpreadsheetData,
        mockRelationshipMap
      );

      expect(exactConfidence.entityMatching).toBeGreaterThan(fuzzyConfidence.entityMatching);
    });

    it('should factor in data quality', () => {
      const highQualityCandidate = {
        ...mockCandidate,
        metadata: {
          ...mockCandidate.metadata,
          dataQuality: 0.95,
          completeness: 0.98
        }
      };

      const lowQualityCandidate = {
        ...mockCandidate,
        metadata: {
          ...mockCandidate.metadata,
          dataQuality: 0.4,
          completeness: 0.5
        }
      };

      const highQualityConfidence = SelectionConfidenceEngine.calculateConfidence(
        highQualityCandidate,
        mockContext,
        mockSpreadsheetData,
        mockRelationshipMap
      );

      const lowQualityConfidence = SelectionConfidenceEngine.calculateConfidence(
        lowQualityCandidate,
        mockContext,
        mockSpreadsheetData,
        mockRelationshipMap
      );

      expect(highQualityConfidence.dataQuality).toBeGreaterThan(lowQualityConfidence.dataQuality);
    });

    it('should consider relationship strength', () => {
      const strongRelationshipMap = {
        ...mockRelationshipMap,
        columnDependencies: [
          {
            sourceColumn: 0,
            targetColumn: 1,
            dependencyType: DependencyType.FORMULA,
            strength: 0.95,
            description: 'Strong dependency',
            isDirectDependency: true
          }
        ]
      };

      const weakRelationshipMap = {
        ...mockRelationshipMap,
        columnDependencies: [
          {
            sourceColumn: 0,
            targetColumn: 1,
            dependencyType: DependencyType.REFERENCE,
            strength: 0.3,
            description: 'Weak dependency',
            isDirectDependency: false
          }
        ]
      };

      const strongRelationshipConfidence = SelectionConfidenceEngine.calculateConfidence(
        mockCandidate,
        mockContext,
        mockSpreadsheetData,
        strongRelationshipMap
      );

      const weakRelationshipConfidence = SelectionConfidenceEngine.calculateConfidence(
        mockCandidate,
        mockContext,
        mockSpreadsheetData,
        weakRelationshipMap
      );

      expect(strongRelationshipConfidence.relationshipMapping)
        .toBeGreaterThan(weakRelationshipConfidence.relationshipMapping);
    });
  });

  describe('rankCandidates', () => {
    it('should rank multiple candidates correctly', () => {
      const candidates = [
        {
          ...mockCandidate,
          id: 'candidate-1',
          confidence: 0.6,
          entityMatches: [
            {
              ...mockCandidate.entityMatches[0],
              confidence: 0.6,
              matchType: MatchType.PARTIAL
            }
          ]
        },
        {
          ...mockCandidate,
          id: 'candidate-2',
          confidence: 0.9,
          entityMatches: [
            {
              ...mockCandidate.entityMatches[0],
              confidence: 0.95,
              matchType: MatchType.EXACT
            }
          ]
        },
        {
          ...mockCandidate,
          id: 'candidate-3',
          confidence: 0.75,
          entityMatches: [
            {
              ...mockCandidate.entityMatches[0],
              confidence: 0.8,
              matchType: MatchType.FUZZY
            }
          ]
        }
      ];

      const rankingResult = SelectionConfidenceEngine.rankCandidates(
        candidates,
        mockContext,
        mockSpreadsheetData,
        mockRelationshipMap
      );

      expect(rankingResult.rankedCandidates).toBeDefined();
      expect(rankingResult.rankedCandidates.length).toBe(3);
      
      // Should be ranked by score (highest first)
      for (let i = 0; i < rankingResult.rankedCandidates.length - 1; i++) {
        expect(rankingResult.rankedCandidates[i].score)
          .toBeGreaterThanOrEqual(rankingResult.rankedCandidates[i + 1].score);
      }

      expect(rankingResult.confidenceBreakdowns.size).toBe(3);
      expect(rankingResult.explanations.size).toBe(3);
    });

    it('should generate explanations when requested', () => {
      const rankingResult = SelectionConfidenceEngine.rankCandidates(
        [mockCandidate],
        mockContext,
        mockSpreadsheetData,
        mockRelationshipMap,
        { explainReasoning: true, includeDataQuality: true, includeRelationships: true, includeUserHistory: false, weightings: {} }
      );

      expect(rankingResult.explanations.size).toBe(1);
      
      const explanation = rankingResult.explanations.get(mockCandidate.id);
      expect(explanation).toBeDefined();
      expect(explanation?.summary).toBeDefined();
      expect(explanation?.reasoning).toBeDefined();
      expect(explanation?.reasoning.length).toBeGreaterThan(0);
    });

    it('should generate recommendations', () => {
      const lowConfidenceCandidate = {
        ...mockCandidate,
        confidence: 0.4,
        entityMatches: [
          {
            ...mockCandidate.entityMatches[0],
            confidence: 0.3
          }
        ]
      };

      const rankingResult = SelectionConfidenceEngine.rankCandidates(
        [lowConfidenceCandidate],
        mockContext,
        mockSpreadsheetData,
        mockRelationshipMap
      );

      expect(rankingResult.recommendations).toBeDefined();
      expect(rankingResult.recommendations.length).toBeGreaterThan(0);
      
      // Should recommend improvements for low confidence
      const improvementRecommendation = rankingResult.recommendations.find(r => 
        r.type === 'improve_quality' || r.type === 'add_context'
      );
      expect(improvementRecommendation).toBeDefined();
    });
  });

  describe('generateSelectionExplanation', () => {
    it('should generate comprehensive explanation', () => {
      const confidenceBreakdown: ConfidenceBreakdown = {
        overall: 0.85,
        entityMatching: 0.9,
        dataQuality: 0.8,
        relationshipMapping: 0.75,
        contextualRelevance: 0.85,
        factors: [
          {
            name: 'Entity Matching',
            value: 0.9,
            weight: 0.6,
            description: 'High quality entity matches'
          }
        ]
      };

      const explanation = SelectionConfidenceEngine.generateSelectionExplanation(
        mockCandidate,
        mockContext,
        confidenceBreakdown,
        [mockCandidate]
      );

      expect(explanation).toBeDefined();
      expect(explanation.summary).toBeDefined();
      expect(explanation.reasoning).toBeDefined();
      expect(explanation.reasoning.length).toBeGreaterThan(0);
      expect(explanation.confidence).toBe(confidenceBreakdown);
      expect(explanation.alternatives).toBeDefined();
      expect(explanation.recommendations).toBeDefined();
    });

    it('should include reasoning steps', () => {
      const confidenceBreakdown: ConfidenceBreakdown = {
        overall: 0.85,
        entityMatching: 0.9,
        dataQuality: 0.8,
        relationshipMapping: 0.75,
        contextualRelevance: 0.85,
        factors: []
      };

      const explanation = SelectionConfidenceEngine.generateSelectionExplanation(
        mockCandidate,
        mockContext,
        confidenceBreakdown,
        [mockCandidate]
      );

      expect(explanation.reasoning.length).toBeGreaterThan(0);
      
      // Should have entity identification step
      const entityStep = explanation.reasoning.find(step => 
        step.description.toLowerCase().includes('entity')
      );
      expect(entityStep).toBeDefined();
      
      // Should have data quality step
      const qualityStep = explanation.reasoning.find(step => 
        step.description.toLowerCase().includes('quality')
      );
      expect(qualityStep).toBeDefined();
    });

    it('should provide alternative explanations', () => {
      const alternativeCandidate = {
        ...mockCandidate,
        id: 'alternative-candidate',
        confidence: 0.7,
        selectionType: SelectionType.COLUMN_BASED
      };

      const explanation = SelectionConfidenceEngine.generateSelectionExplanation(
        mockCandidate,
        mockContext,
        {
          overall: 0.85,
          entityMatching: 0.9,
          dataQuality: 0.8,
          relationshipMapping: 0.75,
          contextualRelevance: 0.85,
          factors: []
        },
        [mockCandidate, alternativeCandidate]
      );

      expect(explanation.alternatives).toBeDefined();
      expect(explanation.alternatives.length).toBeGreaterThan(0);
      
      const alternative = explanation.alternatives[0];
      expect(alternative.alternative).toBeDefined();
      expect(alternative.reason).toBeDefined();
      expect(alternative.tradeoffs).toBeDefined();
      expect(alternative.suitability).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle candidates with no entity matches', () => {
      const noEntityCandidate = {
        ...mockCandidate,
        entityMatches: []
      };

      const confidenceBreakdown = SelectionConfidenceEngine.calculateConfidence(
        noEntityCandidate,
        mockContext,
        mockSpreadsheetData,
        mockRelationshipMap
      );

      expect(confidenceBreakdown).toBeDefined();
      expect(confidenceBreakdown.overall).toBeGreaterThan(0);
      expect(confidenceBreakdown.entityMatching).toBeGreaterThan(0); // Should have base score
    });

    it('should handle empty relationship map', () => {
      const emptyRelationshipMap: RelationshipMap = {
        columnDependencies: [],
        dataHierarchies: [],
        calculatedFields: [],
        crossReferences: [],
        semanticRelationships: []
      };

      const confidenceBreakdown = SelectionConfidenceEngine.calculateConfidence(
        mockCandidate,
        mockContext,
        mockSpreadsheetData,
        emptyRelationshipMap
      );

      expect(confidenceBreakdown).toBeDefined();
      expect(confidenceBreakdown.overall).toBeGreaterThan(0);
    });

    it('should handle candidates with no relevant columns', () => {
      const noColumnsCandidate = {
        ...mockCandidate,
        relevantColumns: []
      };

      const confidenceBreakdown = SelectionConfidenceEngine.calculateConfidence(
        noColumnsCandidate,
        mockContext,
        mockSpreadsheetData,
        mockRelationshipMap
      );

      expect(confidenceBreakdown).toBeDefined();
      expect(confidenceBreakdown.contextualRelevance).toBeGreaterThan(0); // Should have base score
    });
  });

  describe('performance', () => {
    it('should handle large numbers of candidates efficiently', () => {
      const candidates = Array.from({ length: 100 }, (_, i) => ({
        ...mockCandidate,
        id: `candidate-${i}`,
        confidence: Math.random()
      }));

      const startTime = Date.now();
      
      const rankingResult = SelectionConfidenceEngine.rankCandidates(
        candidates,
        mockContext,
        mockSpreadsheetData,
        mockRelationshipMap
      );

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(rankingResult.rankedCandidates).toBeDefined();
      expect(rankingResult.rankedCandidates.length).toBe(100);
      expect(processingTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});