/**
 * Tests for IntelligentAutoSelection service
 */

import { IntelligentAutoSelection } from '../IntelligentAutoSelection';
import {
  SpreadsheetData,
  Sheet,
  Cell,
  DataType,
  Range
} from '../../types/spreadsheet';
import {
  SelectionContext,
  SelectionScope,
  SelectionPreferences,
  MatchType,
  RelationshipType,
  SelectionType,
  SelectionCandidate
} from '../../types/intelligent-selection';
import { RequestAnalysis, IntentType } from '../../types/context';

describe('IntelligentAutoSelection', () => {
  let mockSpreadsheetData: SpreadsheetData;
  let mockSheet: Sheet;
  let mockContext: SelectionContext;

  beforeEach(() => {
    // Create mock cell data
    const createCell = (value: any, dataType: DataType = DataType.TEXT): Cell => ({
      value,
      dataType,
      address: 'A1'
    });

    // Create mock sheet with sample data
    mockSheet = {
      name: 'TestSheet',
      data: [
        // Header row
        [
          createCell('Company', DataType.TEXT),
          createCell('Symbol', DataType.TEXT),
          createCell('Price', DataType.TEXT),
          createCell('Volume', DataType.TEXT)
        ],
        // Data rows
        [
          createCell('Apple Inc', DataType.TEXT),
          createCell('AAPL', DataType.TEXT),
          createCell(150.25, DataType.NUMBER),
          createCell(1000000, DataType.NUMBER)
        ],
        [
          createCell('Microsoft Corp', DataType.TEXT),
          createCell('MSFT', DataType.TEXT),
          createCell(280.50, DataType.NUMBER),
          createCell(800000, DataType.NUMBER)
        ],
        [
          createCell('Google LLC', DataType.TEXT),
          createCell('GOOGL', DataType.TEXT),
          createCell(2500.75, DataType.NUMBER),
          createCell(500000, DataType.NUMBER)
        ]
      ],
      dimensions: {
        rows: 4,
        cols: 4
      },
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

    const mockScope: SelectionScope = {
      includeHeaders: true,
      expandToRelated: true,
      confidenceThreshold: 0.3,
      respectDataBoundaries: true,
      includeCalculatedFields: false
    };

    const mockPreferences: SelectionPreferences = {
      prioritizeExactMatches: true,
      includeCalculatedFields: false,
      expandToDependencies: false,
      respectDataBoundaries: true,
      preferLargerSelections: false,
      optimizeForAnalysis: true,
      includeContextualData: true
    };

    mockContext = {
      query: 'What is the price of Apple Inc?',
      intent: mockIntent,
      entities: ['Apple Inc', 'price'],
      scope: mockScope,
      preferences: mockPreferences
    };
  });

  describe('findRelevantData', () => {
    it('should find exact entity matches', async () => {
      const candidates = await IntelligentAutoSelection.findRelevantData(
        mockSpreadsheetData,
        mockContext,
        'TestSheet'
      );

      expect(candidates).toBeDefined();
      expect(candidates.length).toBeGreaterThan(0);

      // Should find Apple Inc match
      const appleCandidate = candidates.find(c => 
        c.entityMatches.some(em => em.entity.toLowerCase().includes('apple'))
      );
      expect(appleCandidate).toBeDefined();
      expect(appleCandidate?.matchType).toBe(MatchType.EXACT);
    });

    it('should handle fuzzy matching', async () => {
      const fuzzyContext = {
        ...mockContext,
        entities: ['Apple', 'Microsoft'] // Partial matches
      };

      const candidates = await IntelligentAutoSelection.findRelevantData(
        mockSpreadsheetData,
        fuzzyContext,
        'TestSheet'
      );

      expect(candidates).toBeDefined();
      expect(candidates.length).toBeGreaterThan(0);

      // Should find fuzzy matches
      const fuzzyCandidate = candidates.find(c => 
        c.matchType === MatchType.FUZZY || c.matchType === MatchType.PARTIAL
      );
      expect(fuzzyCandidate).toBeDefined();
    });

    it('should generate different selection types', async () => {
      const candidates = await IntelligentAutoSelection.findRelevantData(
        mockSpreadsheetData,
        mockContext,
        'TestSheet'
      );

      // Check that we have different types of candidates
      expect(candidates.length).toBeGreaterThan(1);
    });

    it('should respect confidence threshold', async () => {
      const highThresholdContext = {
        ...mockContext,
        scope: {
          ...mockContext.scope,
          confidenceThreshold: 0.9
        }
      };

      const candidates = await IntelligentAutoSelection.findRelevantData(
        mockSpreadsheetData,
        highThresholdContext,
        'TestSheet'
      );

      // All candidates should meet the high threshold
      candidates.forEach(candidate => {
        expect(candidate.confidence).toBeGreaterThanOrEqual(0.9);
      });
    });
  });

  describe('expandSelection', () => {
    it('should expand selection based on relationships', () => {
      const baseCandidate: SelectionCandidate = {
        id: 'test-candidate',
        range: {
          startRow: 1,
          endRow: 1,
          startCol: 0,
          endCol: 0,
          sheetName: 'TestSheet'
        },
        confidence: 0.8,
        explanation: 'Test candidate',
        matchType: MatchType.EXACT,
        relevantColumns: [],
        relatedSelections: [],
        entityMatches: [],
        score: 0.8,
        selectionType: SelectionType.ROW_BASED,
        metadata: {
          cellCount: 1,
          dataQuality: 0.8,
          completeness: 0.8,
          hasFormulas: false,
          hasHeaders: false,
          estimatedProcessingTime: 10
        }
      };

      const expandedCandidate = IntelligentAutoSelection.expandSelection(
        baseCandidate,
        mockSpreadsheetData,
        mockContext
      );

      expect(expandedCandidate).toBeDefined();
      expect(expandedCandidate.range).toBeDefined();
      
      // Expanded selection should be at least as large as the original
      const originalSize = (baseCandidate.range.endRow - baseCandidate.range.startRow + 1) *
                          (baseCandidate.range.endCol - baseCandidate.range.startCol + 1);
      const expandedSize = (expandedCandidate.range.endRow - expandedCandidate.range.startRow + 1) *
                          (expandedCandidate.range.endCol - expandedCandidate.range.startCol + 1);
      
      expect(expandedSize).toBeGreaterThanOrEqual(originalSize);
    });

    it('should not expand when preferences disable it', () => {
      const noExpandContext = {
        ...mockContext,
        preferences: {
          ...mockContext.preferences,
          expandToDependencies: false
        },
        scope: {
          ...mockContext.scope,
          expandToRelated: false
        }
      };

      const baseCandidate: SelectionCandidate = {
        id: 'test-candidate',
        range: {
          startRow: 1,
          endRow: 1,
          startCol: 0,
          endCol: 0,
          sheetName: 'TestSheet'
        },
        confidence: 0.8,
        explanation: 'Test candidate',
        matchType: MatchType.EXACT,
        relevantColumns: [],
        relatedSelections: [],
        entityMatches: [],
        score: 0.8,
        selectionType: SelectionType.ROW_BASED,
        metadata: {
          cellCount: 1,
          dataQuality: 0.8,
          completeness: 0.8,
          hasFormulas: false,
          hasHeaders: false,
          estimatedProcessingTime: 10
        }
      };

      const expandedCandidate = IntelligentAutoSelection.expandSelection(
        baseCandidate,
        mockSpreadsheetData,
        noExpandContext
      );

      // Should not expand significantly when disabled
      const originalSize = (baseCandidate.range.endRow - baseCandidate.range.startRow + 1) *
                          (baseCandidate.range.endCol - baseCandidate.range.startCol + 1);
      const expandedSize = (expandedCandidate.range.endRow - expandedCandidate.range.startRow + 1) *
                          (expandedCandidate.range.endCol - expandedCandidate.range.startCol + 1);
      
      expect(expandedSize).toBeLessThanOrEqual(originalSize * 2); // Allow minimal expansion
    });
  });

  describe('rankSelectionCandidates', () => {
    it('should rank candidates by score', () => {
      const candidates: SelectionCandidate[] = [
        {
          id: 'candidate-1',
          range: { startRow: 0, endRow: 0, startCol: 0, endCol: 0, sheetName: 'TestSheet' },
          confidence: 0.6,
          explanation: 'Low confidence candidate',
          matchType: MatchType.PARTIAL,
          relevantColumns: [],
          relatedSelections: [],
          entityMatches: [],
          score: 0,
          selectionType: SelectionType.CELL_AREA,
          metadata: {
            cellCount: 1,
            dataQuality: 0.5,
            completeness: 0.5,
            hasFormulas: false,
            hasHeaders: false,
            estimatedProcessingTime: 10
          }
        },
        {
          id: 'candidate-2',
          range: { startRow: 1, endRow: 1, startCol: 0, endCol: 3, sheetName: 'TestSheet' },
          confidence: 0.9,
          explanation: 'High confidence candidate',
          matchType: MatchType.EXACT,
          relevantColumns: [],
          relatedSelections: [],
          entityMatches: [],
          score: 0,
          selectionType: SelectionType.ROW_BASED,
          metadata: {
            cellCount: 4,
            dataQuality: 0.9,
            completeness: 0.9,
            hasFormulas: false,
            hasHeaders: false,
            estimatedProcessingTime: 20
          }
        }
      ];

      const rankedCandidates = IntelligentAutoSelection.rankSelectionCandidates(
        candidates,
        mockContext
      );

      expect(rankedCandidates).toBeDefined();
      expect(rankedCandidates.length).toBe(2);
      
      // Higher confidence candidate should be ranked first
      expect(rankedCandidates[0].confidence).toBeGreaterThan(rankedCandidates[1].confidence);
      expect(rankedCandidates[0].score).toBeGreaterThan(rankedCandidates[1].score);
    });

    it('should filter by confidence threshold', () => {
      const candidates: SelectionCandidate[] = [
        {
          id: 'candidate-1',
          range: { startRow: 0, endRow: 0, startCol: 0, endCol: 0, sheetName: 'TestSheet' },
          confidence: 0.2, // Below threshold
          explanation: 'Low confidence candidate',
          matchType: MatchType.PARTIAL,
          relevantColumns: [],
          relatedSelections: [],
          entityMatches: [],
          score: 0,
          selectionType: SelectionType.CELL_AREA,
          metadata: {
            cellCount: 1,
            dataQuality: 0.5,
            completeness: 0.5,
            hasFormulas: false,
            hasHeaders: false,
            estimatedProcessingTime: 10
          }
        },
        {
          id: 'candidate-2',
          range: { startRow: 1, endRow: 1, startCol: 0, endCol: 3, sheetName: 'TestSheet' },
          confidence: 0.8, // Above threshold
          explanation: 'High confidence candidate',
          matchType: MatchType.EXACT,
          relevantColumns: [],
          relatedSelections: [],
          entityMatches: [],
          score: 0,
          selectionType: SelectionType.ROW_BASED,
          metadata: {
            cellCount: 4,
            dataQuality: 0.9,
            completeness: 0.9,
            hasFormulas: false,
            hasHeaders: false,
            estimatedProcessingTime: 20
          }
        }
      ];

      const rankedCandidates = IntelligentAutoSelection.rankSelectionCandidates(
        candidates,
        mockContext
      );

      // Should only include candidates above threshold
      expect(rankedCandidates.length).toBe(1);
      expect(rankedCandidates[0].confidence).toBeGreaterThanOrEqual(mockContext.scope.confidenceThreshold);
    });
  });

  describe('buildRelationshipMap', () => {
    it('should analyze column dependencies', () => {
      const relationshipMap = IntelligentAutoSelection.buildRelationshipMap(
        mockSheet,
        mockSpreadsheetData
      );

      expect(relationshipMap).toBeDefined();
      expect(relationshipMap.columnDependencies).toBeDefined();
      expect(relationshipMap.dataHierarchies).toBeDefined();
      expect(relationshipMap.calculatedFields).toBeDefined();
      expect(relationshipMap.crossReferences).toBeDefined();
    });

    it('should detect data hierarchies', () => {
      // Create a sheet with hierarchical data
      const hierarchicalSheet: Sheet = {
        ...mockSheet,
        data: [
          [
            { value: 'Region', dataType: DataType.TEXT },
            { value: 'Country', dataType: DataType.TEXT },
            { value: 'Sales', dataType: DataType.TEXT }
          ],
          [
            { value: 'North America', dataType: DataType.TEXT },
            { value: 'USA', dataType: DataType.TEXT },
            { value: 1000, dataType: DataType.NUMBER }
          ],
          [
            { value: 'North America', dataType: DataType.TEXT },
            { value: 'Canada', dataType: DataType.TEXT },
            { value: 500, dataType: DataType.NUMBER }
          ]
        ]
      };

      const relationshipMap = IntelligentAutoSelection.buildRelationshipMap(
        hierarchicalSheet,
        { ...mockSpreadsheetData, sheets: [hierarchicalSheet] }
      );

      expect(relationshipMap.dataHierarchies).toBeDefined();
      // Should detect Region -> Country hierarchy
      const hierarchy = relationshipMap.dataHierarchies.find(h => 
        h.parentColumn === 0 && h.childColumns.includes(1)
      );
      expect(hierarchy).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle missing sheet gracefully', async () => {
      await expect(
        IntelligentAutoSelection.findRelevantData(
          mockSpreadsheetData,
          mockContext,
          'NonExistentSheet'
        )
      ).rejects.toThrow('Sheet not found: NonExistentSheet');
    });

    it('should handle empty data gracefully', async () => {
      const emptySheet: Sheet = {
        name: 'EmptySheet',
        data: [],
        dimensions: { rows: 0, cols: 0 },
        formatting: [],
        namedRanges: []
      };

      const emptySpreadsheetData = {
        ...mockSpreadsheetData,
        sheets: [emptySheet]
      };

      const candidates = await IntelligentAutoSelection.findRelevantData(
        emptySpreadsheetData,
        mockContext,
        'EmptySheet'
      );

      expect(candidates).toBeDefined();
      expect(Array.isArray(candidates)).toBe(true);
    });

    it('should handle invalid ranges gracefully', () => {
      const invalidCandidate: SelectionCandidate = {
        id: 'invalid-candidate',
        range: {
          startRow: -1,
          endRow: -1,
          startCol: -1,
          endCol: -1,
          sheetName: 'TestSheet'
        },
        confidence: 0.8,
        explanation: 'Invalid range candidate',
        matchType: MatchType.EXACT,
        relevantColumns: [],
        relatedSelections: [],
        entityMatches: [],
        score: 0.8,
        selectionType: SelectionType.CELL_AREA,
        metadata: {
          cellCount: 0,
          dataQuality: 0.8,
          completeness: 0.8,
          hasFormulas: false,
          hasHeaders: false,
          estimatedProcessingTime: 10
        }
      };

      expect(() => {
        IntelligentAutoSelection.expandSelection(
          invalidCandidate,
          mockSpreadsheetData,
          mockContext
        );
      }).not.toThrow();
    });
  });

  describe('performance', () => {
    it('should handle large datasets efficiently', async () => {
      // Create a larger dataset
      const largeData: Cell[][] = [];
      for (let row = 0; row < 1000; row++) {
        const rowData: Cell[] = [];
        for (let col = 0; col < 10; col++) {
          rowData.push({
            value: `Cell_${row}_${col}`,
            dataType: DataType.TEXT
          });
        }
        largeData.push(rowData);
      }

      const largeSheet: Sheet = {
        name: 'LargeSheet',
        data: largeData,
        dimensions: { rows: 1000, cols: 10 },
        formatting: [],
        namedRanges: []
      };

      const largeSpreadsheetData = {
        ...mockSpreadsheetData,
        sheets: [largeSheet]
      };

      const startTime = Date.now();
      
      const candidates = await IntelligentAutoSelection.findRelevantData(
        largeSpreadsheetData,
        mockContext,
        'LargeSheet'
      );

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(candidates).toBeDefined();
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});