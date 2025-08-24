/**
 * Tests for ContextFormatter service
 */

import { ContextFormatter, FormattingOptions } from '../ContextFormatter';
import { OpenAIService } from '../OpenAIService';
import {
  ContextData,
  IntentType,
  RequestAnalysis,
  ImmediateContext,
  RelatedContext,
  StructuralContext,
  HistoricalContext,
  PatternInsights,
  DataSummary
} from '../../types/context';
import {
  SelectionInfo,
  DataType,
  Cell
} from '../../types/spreadsheet';

// Mock OpenAI service
jest.mock('../OpenAIService');

describe('ContextFormatter', () => {
  let formatter: ContextFormatter;
  let mockOpenAIService: jest.Mocked<OpenAIService>;
  let sampleContextData: ContextData;
  let sampleRequestAnalysis: RequestAnalysis;
  let sampleSelectionInfo: SelectionInfo;

  beforeEach(() => {
    // Create mock OpenAI service
    mockOpenAIService = {
      client: {
        chat: {
          completions: {
            create: jest.fn()
          }
        }
      }
    } as any;

    formatter = new ContextFormatter(mockOpenAIService);

    // Create sample data
    sampleContextData = createSampleContextData();
    sampleRequestAnalysis = createSampleRequestAnalysis();
    sampleSelectionInfo = createSampleSelectionInfo();
  });

  describe('formatContext', () => {
    it('should format context with all components enabled', async () => {
      const options: FormattingOptions = {
        includeStructuredData: true,
        includeNaturalLanguage: true,
        enableAIGeneration: false, // Use rule-based for predictable testing
        optimizeForLLM: true
      };

      const result = await formatter.formatContext(
        sampleContextData,
        sampleRequestAnalysis,
        sampleSelectionInfo,
        options
      );

      expect(result).toBeDefined();
      expect(result.structured).toBeDefined();
      expect(result.naturalLanguage).toBeDefined();
      expect(result.relevanceScore).toBeDefined();
      expect(result.filteredData).toBeDefined();
      expect(result.llmOptimized).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.generatedAt).toBeInstanceOf(Date);
    });

    it('should calculate relevance scores correctly for formula assistance', async () => {
      const formulaRequest = {
        ...sampleRequestAnalysis,
        intent: IntentType.FORMULA_ASSISTANCE
      };

      const result = await formatter.formatContext(
        sampleContextData,
        formulaRequest,
        sampleSelectionInfo
      );

      expect(result.relevanceScore.immediate).toBeGreaterThan(0.8);
      expect(result.relevanceScore.related).toBeGreaterThan(0.5); // Should be boosted for formulas
      expect(result.relevanceScore.overall).toBeGreaterThan(0.6);
    });

    it('should calculate relevance scores correctly for data analysis', async () => {
      const analysisRequest = {
        ...sampleRequestAnalysis,
        intent: IntentType.DATA_ANALYSIS
      };

      const result = await formatter.formatContext(
        sampleContextData,
        analysisRequest,
        sampleSelectionInfo
      );

      expect(result.relevanceScore.patterns).toBeGreaterThan(0.6); // Should be boosted for analysis
      expect(result.relevanceScore.structural).toBeGreaterThan(0.7);
    });

    it('should filter context based on relevance threshold', async () => {
      const options: FormattingOptions = {
        relevanceThreshold: 0.8 // High threshold
      };

      const result = await formatter.formatContext(
        sampleContextData,
        sampleRequestAnalysis,
        sampleSelectionInfo,
        options
      );

      // With high threshold, some context should be filtered out
      expect(result.filteredData.related.dependentCells.length)
        .toBeLessThanOrEqual(sampleContextData.related.dependentCells.length);
      expect(result.filteredData.historical.recentActions.length)
        .toBeLessThanOrEqual(sampleContextData.historical.recentActions.length);
    });

    it('should generate structured format correctly', async () => {
      const result = await formatter.formatContext(
        sampleContextData,
        sampleRequestAnalysis,
        sampleSelectionInfo
      );

      const structured = result.structured;
      expect(structured.requestAnalysis).toBeDefined();
      expect(structured.requestAnalysis.intent).toBe(sampleRequestAnalysis.intent);
      expect(structured.requestAnalysis.confidence).toBe(sampleRequestAnalysis.confidence);

      expect(structured.spreadsheetContext).toBeDefined();
      expect(structured.spreadsheetContext.currentSelection.range).toBe(sampleSelectionInfo.range);
      expect(structured.spreadsheetContext.currentSelection.data).toBeDefined();

      expect(structured.actionableInfo).toBeDefined();
      expect(structured.actionableInfo.targetCells).toContain(sampleSelectionInfo.activeCell);
      expect(structured.actionableInfo.suggestedOperations.length).toBeGreaterThan(0);
    });

    it('should generate rule-based natural language description', async () => {
      const options: FormattingOptions = {
        enableAIGeneration: false
      };

      const result = await formatter.formatContext(
        sampleContextData,
        sampleRequestAnalysis,
        sampleSelectionInfo,
        options
      );

      expect(result.naturalLanguage).toBeDefined();
      expect(result.naturalLanguage.length).toBeGreaterThan(0);
      expect(result.naturalLanguage).toContain('user wants to');
      expect(result.naturalLanguage).toContain(sampleSelectionInfo.range);
    });

    it('should generate LLM-optimized format', async () => {
      const result = await formatter.formatContext(
        sampleContextData,
        sampleRequestAnalysis,
        sampleSelectionInfo
      );

      const llmOptimized = result.llmOptimized;
      expect(llmOptimized.context).toBeDefined();
      expect(llmOptimized.instructions).toBeDefined();
      expect(llmOptimized.constraints).toBeDefined();
      expect(llmOptimized.expectedFormat).toBeDefined();

      expect(llmOptimized.constraints.length).toBeGreaterThan(0);
      expect(llmOptimized.instructions).toContain('formula'); // For formula assistance intent
    });

    it('should handle AI generation when OpenAI service is available', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'AI-generated natural language description of the context.'
          }
        }]
      };

      const mockCreate = jest.fn().mockResolvedValue(mockResponse);
      mockOpenAIService.client = {
        chat: {
          completions: {
            create: mockCreate
          }
        }
      } as any;

      const options: FormattingOptions = {
        enableAIGeneration: true
      };

      const result = await formatter.formatContext(
        sampleContextData,
        sampleRequestAnalysis,
        sampleSelectionInfo,
        options
      );

      expect(mockCreate).toHaveBeenCalled();
      expect(result.naturalLanguage).toBe('AI-generated natural language description of the context.');
    });

    it('should fallback to rule-based when AI generation fails', async () => {
      const mockCreate = jest.fn().mockRejectedValue(new Error('API Error'));
      mockOpenAIService.client = {
        chat: {
          completions: {
            create: mockCreate
          }
        }
      } as any;

      const options: FormattingOptions = {
        enableAIGeneration: true
      };

      const result = await formatter.formatContext(
        sampleContextData,
        sampleRequestAnalysis,
        sampleSelectionInfo,
        options
      );

      expect(result.naturalLanguage).toBeDefined();
      expect(result.naturalLanguage.length).toBeGreaterThan(0);
      // Should contain rule-based content
      expect(result.naturalLanguage).toContain('user wants to');
    });

    it('should respect max context length', async () => {
      const options: FormattingOptions = {
        maxContextLength: 500
      };

      const result = await formatter.formatContext(
        sampleContextData,
        sampleRequestAnalysis,
        sampleSelectionInfo,
        options
      );

      expect(result.llmOptimized.context.length).toBeLessThanOrEqual(300); // 60% of max length
    });

    it('should handle empty context data gracefully', async () => {
      const emptyContextData = createEmptyContextData();

      const result = await formatter.formatContext(
        emptyContextData,
        sampleRequestAnalysis,
        sampleSelectionInfo
      );

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.naturalLanguage).toBeDefined();
    });

    it('should generate appropriate suggestions for different intents', async () => {
      const intents = [
        IntentType.FORMULA_ASSISTANCE,
        IntentType.DATA_ANALYSIS,
        IntentType.FORMATTING,
        IntentType.DATA_MANIPULATION,
        IntentType.TROUBLESHOOTING
      ];

      for (const intent of intents) {
        const request = { ...sampleRequestAnalysis, intent };
        const result = await formatter.formatContext(
          sampleContextData,
          request,
          sampleSelectionInfo
        );

        expect(result.structured.actionableInfo.suggestedOperations.length).toBeGreaterThan(0);
        expect(result.llmOptimized.instructions).toBeDefined();
        expect(result.llmOptimized.expectedFormat).toBeDefined();
      }
    });

    it('should include examples for formula assistance', async () => {
      const formulaRequest = {
        ...sampleRequestAnalysis,
        intent: IntentType.FORMULA_ASSISTANCE
      };

      // Add numeric data to trigger examples
      const contextWithNumbers = {
        ...sampleContextData,
        summary: {
          ...sampleContextData.summary,
          dataTypes: { [DataType.NUMBER]: 5, [DataType.TEXT]: 2 }
        }
      };

      const result = await formatter.formatContext(
        contextWithNumbers,
        formulaRequest,
        sampleSelectionInfo
      );

      expect(result.llmOptimized.examples).toBeDefined();
      expect(result.llmOptimized.examples!.length).toBeGreaterThan(0);
      expect(result.llmOptimized.examples![0]).toContain('SUM');
    });

    it('should handle high-priority anomalies correctly', async () => {
      const contextWithAnomalies = {
        ...sampleContextData,
        patterns: {
          ...sampleContextData.patterns,
          anomalies: [
            {
              type: 'outlier' as const,
              cellAddress: 'B5',
              description: 'Extreme outlier value detected',
              severity: 'high' as const,
              suggestedFix: 'Review and validate the value'
            }
          ]
        }
      };

      const result = await formatter.formatContext(
        contextWithAnomalies,
        sampleRequestAnalysis,
        sampleSelectionInfo
      );

      expect(result.naturalLanguage).toContain('high-priority');
      expect(result.llmOptimized.constraints).toContain('Address high-priority data quality issues');
    });

    it('should calculate confidence correctly', async () => {
      // High confidence scenario
      const highConfidenceRequest = {
        ...sampleRequestAnalysis,
        confidence: 0.95
      };

      const highConfidenceContext = {
        ...sampleContextData,
        confidence: 0.9
      };

      const result = await formatter.formatContext(
        highConfidenceContext,
        highConfidenceRequest,
        sampleSelectionInfo
      );

      expect(result.confidence).toBeGreaterThan(0.8);

      // Low confidence scenario
      const lowConfidenceRequest = {
        ...sampleRequestAnalysis,
        confidence: 0.3
      };

      const lowConfidenceContext = {
        ...sampleContextData,
        confidence: 0.4
      };

      const result2 = await formatter.formatContext(
        lowConfidenceContext,
        lowConfidenceRequest,
        sampleSelectionInfo
      );

      expect(result2.confidence).toBeLessThan(0.7);
    });
  });

  describe('without OpenAI service', () => {
    beforeEach(() => {
      formatter = new ContextFormatter(); // No OpenAI service
    });

    it('should work without OpenAI service', async () => {
      const result = await formatter.formatContext(
        sampleContextData,
        sampleRequestAnalysis,
        sampleSelectionInfo
      );

      expect(result).toBeDefined();
      expect(result.naturalLanguage).toBeDefined();
      expect(result.naturalLanguage.length).toBeGreaterThan(0);
    });

    it('should use rule-based generation when AI is requested but unavailable', async () => {
      const options: FormattingOptions = {
        enableAIGeneration: true // This should fallback to rule-based
      };

      const result = await formatter.formatContext(
        sampleContextData,
        sampleRequestAnalysis,
        sampleSelectionInfo,
        options
      );

      expect(result.naturalLanguage).toBeDefined();
      expect(result.naturalLanguage).toContain('user wants to');
    });
  });
});

// Helper functions to create test data

function createSampleContextData(): ContextData {
  const immediate: ImmediateContext = {
    selectedData: [
      [
        createCell('A1', 'Product', DataType.TEXT),
        createCell('B1', 'Price', DataType.TEXT),
        createCell('C1', 'Quantity', DataType.TEXT)
      ],
      [
        createCell('A2', 'Widget', DataType.TEXT),
        createCell('B2', 10.99, DataType.NUMBER),
        createCell('C2', 5, DataType.NUMBER)
      ],
      [
        createCell('A3', 'Gadget', DataType.TEXT),
        createCell('B3', 25.50, DataType.NUMBER),
        createCell('C3', 3, DataType.NUMBER)
      ]
    ],
    activeCell: createCell('B2', 10.99, DataType.NUMBER),
    visibleData: [], // Simplified for testing
    currentFormulas: [
      {
        id: 'f1',
        cell: 'D2',
        formula: '=B2*C2',
        sheet: 'Sheet1',
        dependencies: ['B2', 'C2'],
        precedents: ['B2', 'C2'],
        isValid: true
      }
    ],
    selectionInfo: createSampleSelectionInfo()
  };

  const related: RelatedContext = {
    dependentCells: [createCell('D2', 54.95, DataType.FORMULA)],
    precedentCells: [createCell('B2', 10.99, DataType.NUMBER), createCell('C2', 5, DataType.NUMBER)],
    relatedFormulas: [
      {
        id: 'f1',
        cell: 'D2',
        formula: '=B2*C2',
        sheet: 'Sheet1',
        dependencies: ['B2', 'C2'],
        precedents: ['B2', 'C2'],
        isValid: true
      }
    ],
    namedRanges: [],
    crossSheetReferences: []
  };

  const structural: StructuralContext = {
    headers: ['Product', 'Price', 'Quantity'],
    dataTypes: [DataType.TEXT, DataType.NUMBER],
    columnCount: 3,
    rowCount: 3,
    hasFormulas: true,
    hasNamedRanges: false,
    sheetStructure: {
      hasHeaders: true,
      headerRow: 0,
      dataStartRow: 1,
      dataEndRow: 2,
      dataColumns: [
        {
          index: 0,
          header: 'Product',
          dataType: DataType.TEXT,
          hasFormulas: false,
          isEmpty: false,
          uniqueValues: 2
        },
        {
          index: 1,
          header: 'Price',
          dataType: DataType.NUMBER,
          hasFormulas: false,
          isEmpty: false,
          uniqueValues: 2
        },
        {
          index: 2,
          header: 'Quantity',
          dataType: DataType.NUMBER,
          hasFormulas: false,
          isEmpty: false,
          uniqueValues: 2
        }
      ]
    }
  };

  const historical: HistoricalContext = {
    recentActions: [
      {
        type: 'cell_edit',
        timestamp: new Date(),
        cellAddress: 'B2',
        oldValue: 9.99,
        newValue: 10.99
      }
    ],
    previousRequests: ['Calculate total for each product'],
    sessionDuration: 300,
    interactionCount: 5
  };

  const patterns: PatternInsights = {
    dataPatterns: [
      {
        type: 'correlation',
        description: 'Price and quantity show inverse correlation',
        confidence: 0.8,
        affectedRange: 'B2:C3',
        severity: 'medium'
      }
    ],
    relationships: [
      {
        type: 'dependency',
        source: 'B2',
        target: 'D2',
        strength: 1.0,
        description: 'D2 depends on B2 for calculation'
      }
    ],
    anomalies: [
      {
        type: 'outlier',
        cellAddress: 'B3',
        description: 'Price significantly higher than average',
        severity: 'low',
        suggestedFix: 'Verify price accuracy'
      }
    ],
    insights: [
      {
        type: 'suggestion',
        title: 'Add total calculation',
        description: 'Consider adding a SUM formula to calculate totals',
        actionable: true,
        priority: 'medium',
        suggestedActions: ['Add =SUM(D2:D3) in cell D4']
      }
    ],
    confidence: 0.75
  };

  const summary: DataSummary = {
    rowCount: 3,
    columnCount: 3,
    cellCount: 9,
    formulaCount: 1,
    emptyCount: 0,
    dataTypes: {
      [DataType.TEXT]: 4,
      [DataType.NUMBER]: 4,
      [DataType.FORMULA]: 1
    },
    patterns: ['has_headers', 'contains_formulas'],
    statistics: {
      hasNumericData: true,
      count: 4,
      sum: 44.48,
      mean: 11.12,
      min: 3,
      max: 25.50
    }
  };

  return {
    immediate,
    related,
    structural,
    historical,
    patterns,
    summary,
    confidence: 0.85,
    generatedAt: new Date()
  };
}

function createSampleRequestAnalysis(): RequestAnalysis {
  return {
    intent: IntentType.FORMULA_ASSISTANCE,
    scope: 'current_selection',
    confidence: 0.9,
    keywords: ['calculate', 'total', 'formula'],
    clarificationNeeded: false,
    suggestedQuestions: []
  };
}

function createSampleSelectionInfo(): SelectionInfo {
  return {
    sheet: 'Sheet1',
    range: 'A1:C3',
    activeCell: 'B2',
    visibleRange: 'A1:E10'
  };
}

function createCell(address: string, value: any, dataType: DataType): Cell {
  const cell: Cell = {
    value,
    dataType,
    address
  };
  
  if (dataType === DataType.FORMULA) {
    cell.formula = '=B2*C2';
  }
  
  return cell;
}

function createEmptyContextData(): ContextData {
  return {
    immediate: {
      selectedData: [],
      activeCell: createCell('A1', null, DataType.EMPTY),
      visibleData: [],
      currentFormulas: [],
      selectionInfo: createSampleSelectionInfo()
    },
    related: {
      dependentCells: [],
      precedentCells: [],
      relatedFormulas: [],
      namedRanges: [],
      crossSheetReferences: []
    },
    structural: {
      headers: [],
      dataTypes: [],
      columnCount: 0,
      rowCount: 0,
      hasFormulas: false,
      hasNamedRanges: false,
      sheetStructure: {
        hasHeaders: false,
        dataStartRow: 0,
        dataEndRow: 0,
        dataColumns: []
      }
    },
    historical: {
      recentActions: [],
      previousRequests: [],
      sessionDuration: 0,
      interactionCount: 0
    },
    patterns: {
      dataPatterns: [],
      relationships: [],
      anomalies: [],
      insights: [],
      confidence: 0.5
    },
    summary: {
      rowCount: 0,
      columnCount: 0,
      cellCount: 0,
      formulaCount: 0,
      emptyCount: 0,
      dataTypes: {},
      patterns: []
    },
    confidence: 0.3,
    generatedAt: new Date()
  };
}