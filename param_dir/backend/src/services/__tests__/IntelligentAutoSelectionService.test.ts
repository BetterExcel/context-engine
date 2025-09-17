/**
 * Integration tests for IntelligentAutoSelectionService
 */

import { IntelligentAutoSelectionService } from '../IntelligentAutoSelectionService';
import {
  IntelligentSelectionRequest,
  SelectionScope,
  SelectionPreferences
} from '../../types/intelligent-selection';
import {
  SpreadsheetData,
  Sheet,
  Cell,
  DataType
} from '../../types/spreadsheet';
import { RequestAnalysis, IntentType } from '../../types/context';

describe('IntelligentAutoSelectionService', () => {
  let mockSpreadsheetData: SpreadsheetData;
  let mockRequest: IntelligentSelectionRequest;

  beforeEach(() => {
    // Create mock cell data
    const createCell = (value: any, dataType: DataType = DataType.TEXT): Cell => ({
      value,
      dataType,
      address: 'A1'
    });

    // Create mock sheet with sample data
    const mockSheet: Sheet = {
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
        ]
      ],
      dimensions: {
        rows: 3,
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

    // Create mock request
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

    mockRequest = {
      query: 'What is the price of Apple Inc?',
      intent: mockIntent,
      entities: ['Apple Inc', 'price'],
      sheetName: 'TestSheet',
      scope: mockScope,
      preferences: mockPreferences
    };
  });

  describe('processSelectionRequest', () => {
    it('should process a complete selection request', async () => {
      const response = await IntelligentAutoSelectionService.processSelectionRequest(
        mockRequest,
        mockSpreadsheetData
      );

      expect(response).toBeDefined();
      expect(response.candidates).toBeDefined();
      expect(response.candidates.length).toBeGreaterThan(0);
      expect(response.recommendedSelection).toBeDefined();
      expect(response.relationshipMap).toBeDefined();
      expect(response.confidence).toBeGreaterThan(0);
      expect(response.explanation).toBeDefined();
      expect(response.alternatives).toBeDefined();
    });

    it('should return high confidence for exact matches', async () => {
      const response = await IntelligentAutoSelectionService.processSelectionRequest(
        mockRequest,
        mockSpreadsheetData
      );

      expect(response.confidence).toBeGreaterThan(0.5);
      
      if (response.recommendedSelection) {
        expect(response.recommendedSelection.confidence).toBeGreaterThan(0.3);
      }
    });

    it('should provide meaningful explanations', async () => {
      const response = await IntelligentAutoSelectionService.processSelectionRequest(
        mockRequest,
        mockSpreadsheetData
      );

      expect(response.explanation).toContain('cells');
      expect(response.explanation).toContain('confidence');
    });

    it('should handle requests with relationship analysis disabled', async () => {
      const response = await IntelligentAutoSelectionService.processSelectionRequest(
        mockRequest,
        mockSpreadsheetData,
        { enableRelationshipAnalysis: false }
      );

      expect(response).toBeDefined();
      expect(response.candidates.length).toBeGreaterThan(0);
      expect(response.relationshipMap.columnDependencies).toEqual([]);
    });

    it('should handle requests with confidence explanations disabled', async () => {
      const response = await IntelligentAutoSelectionService.processSelectionRequest(
        mockRequest,
        mockSpreadsheetData,
        { enableConfidenceExplanations: false }
      );

      expect(response).toBeDefined();
      expect(response.candidates.length).toBeGreaterThan(0);
    });
  });

  describe('expandSelection', () => {
    it('should expand a base selection range', async () => {
      const baseRange = {
        startRow: 1,
        endRow: 1,
        startCol: 0,
        endCol: 0,
        sheetName: 'TestSheet'
      };

      const context = {
        query: mockRequest.query,
        intent: mockRequest.intent,
        entities: mockRequest.entities,
        scope: mockRequest.scope!,
        preferences: mockRequest.preferences!
      };

      const expandedCandidate = await IntelligentAutoSelectionService.expandSelection(
        baseRange,
        mockSpreadsheetData,
        context
      );

      expect(expandedCandidate).toBeDefined();
      expect(expandedCandidate.range).toBeDefined();
      
      // Should be at least as large as the original
      const originalSize = (baseRange.endRow - baseRange.startRow + 1) * 
                          (baseRange.endCol - baseRange.startCol + 1);
      const expandedSize = (expandedCandidate.range.endRow - expandedCandidate.range.startRow + 1) * 
                          (expandedCandidate.range.endCol - expandedCandidate.range.startCol + 1);
      
      expect(expandedSize).toBeGreaterThanOrEqual(originalSize);
    });
  });

  describe('optimizeSelectionCandidates', () => {
    it('should optimize and rank candidates', () => {
      const mockCandidates = [
        {
          id: 'candidate-1',
          range: { startRow: 0, endRow: 0, startCol: 0, endCol: 0, sheetName: 'TestSheet' },
          confidence: 0.6,
          explanation: 'Low confidence candidate',
          matchType: 'partial' as any,
          relevantColumns: [],
          relatedSelections: [],
          entityMatches: [],
          score: 0.6,
          selectionType: 'cell_area' as any,
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
          matchType: 'exact' as any,
          relevantColumns: [],
          relatedSelections: [],
          entityMatches: [],
          score: 0.9,
          selectionType: 'row_based' as any,
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

      const context = {
        query: mockRequest.query,
        intent: mockRequest.intent,
        entities: mockRequest.entities,
        scope: mockRequest.scope!,
        preferences: mockRequest.preferences!
      };

      const optimizedCandidates = IntelligentAutoSelectionService.optimizeSelectionCandidates(
        mockCandidates,
        context
      );

      expect(optimizedCandidates).toBeDefined();
      expect(optimizedCandidates.length).toBe(2);
      
      // Should be ranked by score
      expect(optimizedCandidates[0].score).toBeGreaterThanOrEqual(optimizedCandidates[1].score);
    });

    it('should apply optimization constraints', () => {
      const largeCandidates = Array.from({ length: 20 }, (_, i) => ({
        id: `candidate-${i}`,
        range: { startRow: 0, endRow: 0, startCol: 0, endCol: 0, sheetName: 'TestSheet' },
        confidence: Math.random(),
        explanation: `Candidate ${i}`,
        matchType: 'exact' as any,
        relevantColumns: [],
        relatedSelections: [],
        entityMatches: [],
        score: Math.random(),
        selectionType: 'cell_area' as any,
        metadata: {
          cellCount: 1,
          dataQuality: 0.8,
          completeness: 0.8,
          hasFormulas: false,
          hasHeaders: false,
          estimatedProcessingTime: 10
        }
      }));

      const context = {
        query: mockRequest.query,
        intent: mockRequest.intent,
        entities: mockRequest.entities,
        scope: mockRequest.scope!,
        preferences: mockRequest.preferences!
      };

      const optimizedCandidates = IntelligentAutoSelectionService.optimizeSelectionCandidates(
        largeCandidates,
        context,
        { maxCandidates: 5 }
      );

      expect(optimizedCandidates.length).toBeLessThanOrEqual(5);
    });
  });

  describe('error handling', () => {
    it('should handle empty spreadsheet data', async () => {
      const emptySpreadsheetData = {
        ...mockSpreadsheetData,
        sheets: []
      };

      await expect(
        IntelligentAutoSelectionService.processSelectionRequest(
          mockRequest,
          emptySpreadsheetData
        )
      ).rejects.toThrow();
    });

    it('should handle invalid sheet name', async () => {
      const invalidRequest = {
        ...mockRequest,
        sheetName: 'NonExistentSheet'
      };

      await expect(
        IntelligentAutoSelectionService.processSelectionRequest(
          invalidRequest,
          mockSpreadsheetData
        )
      ).rejects.toThrow();
    });
  });

  describe('performance', () => {
    it('should process requests efficiently', async () => {
      const startTime = Date.now();
      
      const response = await IntelligentAutoSelectionService.processSelectionRequest(
        mockRequest,
        mockSpreadsheetData
      );

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(response).toBeDefined();
      expect(processingTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});