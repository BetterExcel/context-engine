/**
 * PatternAnalyzer Tests
 * 
 * Tests for AI-powered pattern analysis functionality including
 * trend detection, anomaly identification, and insight generation.
 */

import { PatternAnalyzer } from '../PatternAnalyzer';
import { OpenAIService } from '../OpenAIService';
import {
  ContextData,
  ImmediateContext,
  StructuralContext,
  RelatedContext,
  HistoricalContext
} from '../../types/context';
import { Cell, DataType } from '../../types/spreadsheet';

// Mock OpenAI Service
jest.mock('../OpenAIService');
const MockedOpenAIService = OpenAIService as jest.MockedClass<typeof OpenAIService>;

describe('PatternAnalyzer', () => {
  let patternAnalyzer: PatternAnalyzer;
  let mockOpenAIService: jest.Mocked<OpenAIService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOpenAIService = new MockedOpenAIService({
      apiKey: 'test-key'
    }) as jest.Mocked<OpenAIService>;
    patternAnalyzer = new PatternAnalyzer(mockOpenAIService);
  });

  describe('constructor', () => {
    it('should create PatternAnalyzer without OpenAI service', () => {
      const analyzer = new PatternAnalyzer();
      expect(analyzer).toBeInstanceOf(PatternAnalyzer);
    });

    it('should create PatternAnalyzer with OpenAI service', () => {
      const analyzer = new PatternAnalyzer(mockOpenAIService);
      expect(analyzer).toBeInstanceOf(PatternAnalyzer);
    });
  });

  describe('analyzePatterns', () => {
    let sampleContextData: ContextData;

    beforeEach(() => {
      sampleContextData = createSampleContextData();
    });

    it('should perform AI analysis when OpenAI service is available', async () => {
      // Mock OpenAI service responses
      mockOpenAIService.isAvailable.mockResolvedValue(true);
      mockOpenAIService.analyzePatterns.mockResolvedValue({
        patterns: [{
          type: 'trend',
          description: 'Increasing trend detected',
          confidence: 0.85,
          affectedRange: 'A1:A10',
          severity: 'medium'
        }],
        relationships: [{
          type: 'correlation',
          source: 'A',
          target: 'B',
          strength: 0.75,
          description: 'Strong positive correlation'
        }],
        anomalies: [{
          type: 'outlier',
          cellAddress: 'A5',
          description: 'Value significantly higher than expected',
          severity: 'medium'
        }],
        insights: [{
          type: 'suggestion',
          title: 'Trend Analysis',
          description: 'Consider forecasting based on trend',
          actionable: true,
          priority: 'medium'
        }],
        confidence: 0.88
      });

      const result = await patternAnalyzer.analyzePatterns(sampleContextData);

      expect(mockOpenAIService.isAvailable).toHaveBeenCalled();
      expect(mockOpenAIService.analyzePatterns).toHaveBeenCalledWith(sampleContextData);
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.dataPatterns.length).toBeGreaterThanOrEqual(1);
      expect(result.relationships).toHaveLength(1);
      expect(result.anomalies).toHaveLength(1);
      expect(result.insights).toHaveLength(1);
    });

    it('should fall back to rule-based analysis when OpenAI is unavailable', async () => {
      mockOpenAIService.isAvailable.mockResolvedValue(false);

      const result = await patternAnalyzer.analyzePatterns(sampleContextData);

      expect(mockOpenAIService.isAvailable).toHaveBeenCalled();
      expect(mockOpenAIService.analyzePatterns).not.toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should fall back to rule-based analysis when AI analysis fails', async () => {
      mockOpenAIService.isAvailable.mockResolvedValue(true);
      mockOpenAIService.analyzePatterns.mockRejectedValue(new Error('API Error'));

      const result = await patternAnalyzer.analyzePatterns(sampleContextData);

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should work without OpenAI service', async () => {
      const analyzerWithoutAI = new PatternAnalyzer();
      
      const result = await analyzerWithoutAI.analyzePatterns(sampleContextData);

      expect(result).toBeDefined();
      expect(result.dataPatterns).toBeDefined();
      expect(result.relationships).toBeDefined();
      expect(result.anomalies).toBeDefined();
      expect(result.insights).toBeDefined();
    });

    it('should respect analysis options', async () => {
      mockOpenAIService.isAvailable.mockResolvedValue(false);

      const options = {
        includeStatistics: false,
        maxSampleSize: 100,
        confidenceThreshold: 0.9,
        enableAIAnalysis: false
      };

      const result = await patternAnalyzer.analyzePatterns(sampleContextData, options);

      expect(result).toBeDefined();
      // Should not attempt AI analysis when disabled
      expect(mockOpenAIService.isAvailable).not.toHaveBeenCalled();
    });
  });

  describe('rule-based pattern detection', () => {
    it('should detect missing data patterns', async () => {
      const contextWithMissingData = createContextWithMissingData();
      const analyzerWithoutAI = new PatternAnalyzer();

      const result = await analyzerWithoutAI.analyzePatterns(contextWithMissingData);

      const missingDataPattern = result.dataPatterns.find(p => p.type === 'missing_data');
      expect(missingDataPattern).toBeDefined();
      expect(missingDataPattern?.severity).toBe('low');
    });

    it('should detect trend patterns in numeric data', async () => {
      const contextWithTrend = createContextWithTrendData();
      const analyzerWithoutAI = new PatternAnalyzer();

      const result = await analyzerWithoutAI.analyzePatterns(contextWithTrend);

      const trendPattern = result.dataPatterns.find(p => p.type === 'trend');
      expect(trendPattern).toBeDefined();
      expect(trendPattern?.confidence).toBeGreaterThan(0.5);
    });

    it('should detect duplicate data patterns', async () => {
      const contextWithDuplicates = createContextWithDuplicateData();
      const analyzerWithoutAI = new PatternAnalyzer();

      const result = await analyzerWithoutAI.analyzePatterns(contextWithDuplicates);

      const duplicatePattern = result.dataPatterns.find(p => p.type === 'duplicate');
      expect(duplicatePattern).toBeDefined();
    });

    it('should detect type inconsistency patterns', async () => {
      const contextWithMixedTypes = createContextWithMixedTypes();
      const analyzerWithoutAI = new PatternAnalyzer();

      const result = await analyzerWithoutAI.analyzePatterns(contextWithMixedTypes);

      const inconsistencyPattern = result.dataPatterns.find(p => p.type === 'outlier');
      expect(inconsistencyPattern).toBeDefined();
    });
  });

  describe('correlation analysis', () => {
    it('should detect strong correlations between numeric columns', async () => {
      const contextWithCorrelation = createContextWithCorrelatedData();
      const analyzerWithoutAI = new PatternAnalyzer();

      const result = await analyzerWithoutAI.analyzePatterns(contextWithCorrelation);

      const correlation = result.relationships.find(r => r.type === 'correlation');
      expect(correlation).toBeDefined();
      expect(correlation?.strength).toBeGreaterThan(0.5);
    });

    it('should not detect correlations in non-numeric data', async () => {
      const contextWithTextData = createContextWithTextData();
      const analyzerWithoutAI = new PatternAnalyzer();

      const result = await analyzerWithoutAI.analyzePatterns(contextWithTextData);

      const correlations = result.relationships.filter(r => r.type === 'correlation');
      expect(correlations).toHaveLength(0);
    });
  });

  describe('anomaly detection', () => {
    it('should detect outliers using IQR method', async () => {
      const contextWithOutliers = createContextWithOutliers();
      const analyzerWithoutAI = new PatternAnalyzer();

      const result = await analyzerWithoutAI.analyzePatterns(contextWithOutliers);

      const outliers = result.anomalies.filter(a => a.type === 'outlier');
      expect(outliers.length).toBeGreaterThan(0);
      expect(outliers[0]?.severity).toBe('medium');
    });

    it('should detect formula errors', async () => {
      const contextWithFormulaErrors = createContextWithFormulaErrors();
      const analyzerWithoutAI = new PatternAnalyzer();

      const result = await analyzerWithoutAI.analyzePatterns(contextWithFormulaErrors);

      const formulaErrors = result.anomalies.filter(a => a.type === 'inconsistent_format');
      expect(formulaErrors.length).toBeGreaterThan(0);
      expect(formulaErrors[0]?.severity).toBe('high');
    });
  });

  describe('insight generation', () => {
    it('should generate actionable insights from patterns', async () => {
      const contextWithPatterns = createSampleContextData();
      const analyzerWithoutAI = new PatternAnalyzer();

      const result = await analyzerWithoutAI.analyzePatterns(contextWithPatterns);

      expect(result.insights.length).toBeGreaterThan(0);
      const actionableInsights = result.insights.filter(i => i.actionable);
      expect(actionableInsights.length).toBeGreaterThan(0);
    });

    it('should prioritize insights correctly', async () => {
      const contextWithSevereAnomalies = createContextWithSevereAnomalies();
      const analyzerWithoutAI = new PatternAnalyzer();

      const result = await analyzerWithoutAI.analyzePatterns(contextWithSevereAnomalies);

      // Check that insights are generated and have priorities
      expect(result.insights.length).toBeGreaterThan(0);
      const prioritizedInsights = result.insights.filter(i => i.priority === 'high' || i.priority === 'medium');
      expect(prioritizedInsights.length).toBeGreaterThan(0);
    });

    it('should include suggested actions in insights', async () => {
      const contextData = createSampleContextData();
      const analyzerWithoutAI = new PatternAnalyzer();

      const result = await analyzerWithoutAI.analyzePatterns(contextData);

      const insightsWithActions = result.insights.filter(i => 
        i.suggestedActions && i.suggestedActions.length > 0
      );
      expect(insightsWithActions.length).toBeGreaterThan(0);
    });
  });

  describe('confidence calculation', () => {
    it('should return low confidence when no patterns are found', async () => {
      const emptyContext = createEmptyContextData();
      const analyzerWithoutAI = new PatternAnalyzer();

      const result = await analyzerWithoutAI.analyzePatterns(emptyContext);

      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should return higher confidence when multiple patterns are found', async () => {
      const richContext = createRichContextData();
      const analyzerWithoutAI = new PatternAnalyzer();

      const result = await analyzerWithoutAI.analyzePatterns(richContext);

      expect(result.confidence).toBeGreaterThan(0.6);
    });
  });

  describe('error handling', () => {
    it('should handle empty data gracefully', async () => {
      const emptyContext = createEmptyContextData();
      const analyzerWithoutAI = new PatternAnalyzer();

      const result = await analyzerWithoutAI.analyzePatterns(emptyContext);

      expect(result).toBeDefined();
      expect(result.dataPatterns).toHaveLength(0);
      expect(result.relationships).toHaveLength(0);
      expect(result.anomalies).toHaveLength(0);
    });

    it('should handle malformed data without throwing', async () => {
      const malformedContext = createMalformedContextData();
      const analyzerWithoutAI = new PatternAnalyzer();

      await expect(analyzerWithoutAI.analyzePatterns(malformedContext)).resolves.toBeDefined();
    });
  });
});

// Helper functions to create test data

function createSampleContextData(): ContextData {
  const selectedData: Cell[][] = [
    [
      { value: 'Date', dataType: DataType.TEXT, address: 'A1' },
      { value: 'Sales', dataType: DataType.TEXT, address: 'B1' }
    ],
    [
      { value: '2024-01-01', dataType: DataType.DATE, address: 'A2' },
      { value: 100, dataType: DataType.NUMBER, address: 'B2' }
    ],
    [
      { value: '2024-01-02', dataType: DataType.DATE, address: 'A3' },
      { value: 120, dataType: DataType.NUMBER, address: 'B3' }
    ],
    [
      { value: '2024-01-03', dataType: DataType.DATE, address: 'A4' },
      { value: 140, dataType: DataType.NUMBER, address: 'B4' }
    ]
  ];

  return {
    immediate: {
      selectedData,
      activeCell: selectedData[0]?.[0] || { value: null, dataType: DataType.EMPTY, address: 'A1' },
      visibleData: selectedData,
      currentFormulas: [],
      selectionInfo: {
        sheet: 'Sheet1',
        range: 'A1:B4',
        activeCell: 'A1'
      }
    } as ImmediateContext,
    related: {
      dependentCells: [],
      precedentCells: [],
      relatedFormulas: [],
      namedRanges: [],
      crossSheetReferences: []
    } as RelatedContext,
    structural: {
      headers: ['Date', 'Sales'],
      dataTypes: [DataType.DATE, DataType.NUMBER],
      columnCount: 2,
      rowCount: 4,
      hasFormulas: false,
      hasNamedRanges: false,
      sheetStructure: {
        hasHeaders: true,
        headerRow: 0,
        dataStartRow: 1,
        dataEndRow: 3,
        dataColumns: []
      }
    } as StructuralContext,
    historical: {
      recentActions: [],
      previousRequests: [],
      sessionDuration: 0,
      interactionCount: 0
    } as HistoricalContext,
    patterns: {
      dataPatterns: [],
      relationships: [],
      anomalies: [],
      insights: [],
      confidence: 0.5
    },
    summary: {
      rowCount: 4,
      columnCount: 2,
      cellCount: 8,
      formulaCount: 0,
      emptyCount: 0,
      dataTypes: { [DataType.TEXT]: 2, [DataType.DATE]: 3, [DataType.NUMBER]: 3 },
      patterns: []
    },
    confidence: 0.8,
    generatedAt: new Date()
  };
}

function createContextWithMissingData(): ContextData {
  const contextData = createSampleContextData();
  // Add empty cells to simulate missing data
  contextData.immediate.selectedData.push([
    { value: '2024-01-04', dataType: DataType.DATE, address: 'A5' },
    { value: null, dataType: DataType.EMPTY, address: 'B5' }
  ]);
  contextData.immediate.selectedData.push([
    { value: null, dataType: DataType.EMPTY, address: 'A6' },
    { value: 180, dataType: DataType.NUMBER, address: 'B6' }
  ]);
  return contextData;
}

function createContextWithTrendData(): ContextData {
  const selectedData: Cell[][] = [
    [{ value: 'Value', dataType: DataType.TEXT, address: 'A1' }],
    [{ value: 10, dataType: DataType.NUMBER, address: 'A2' }],
    [{ value: 20, dataType: DataType.NUMBER, address: 'A3' }],
    [{ value: 30, dataType: DataType.NUMBER, address: 'A4' }],
    [{ value: 40, dataType: DataType.NUMBER, address: 'A5' }],
    [{ value: 50, dataType: DataType.NUMBER, address: 'A6' }]
  ];

  const contextData = createSampleContextData();
  contextData.immediate.selectedData = selectedData;
  return contextData;
}

function createContextWithDuplicateData(): ContextData {
  const selectedData: Cell[][] = [
    [{ value: 'Product', dataType: DataType.TEXT, address: 'A1' }],
    [{ value: 'Apple', dataType: DataType.TEXT, address: 'A2' }],
    [{ value: 'Apple', dataType: DataType.TEXT, address: 'A3' }],
    [{ value: 'Banana', dataType: DataType.TEXT, address: 'A4' }],
    [{ value: 'Apple', dataType: DataType.TEXT, address: 'A5' }]
  ];

  const contextData = createSampleContextData();
  contextData.immediate.selectedData = selectedData;
  return contextData;
}

function createContextWithMixedTypes(): ContextData {
  const selectedData: Cell[][] = [
    [{ value: 'Mixed', dataType: DataType.TEXT, address: 'A1' }],
    [{ value: 100, dataType: DataType.NUMBER, address: 'A2' }],
    [{ value: 'Text', dataType: DataType.TEXT, address: 'A3' }],
    [{ value: 200, dataType: DataType.NUMBER, address: 'A4' }],
    [{ value: '2024-01-01', dataType: DataType.DATE, address: 'A5' }]
  ];

  const contextData = createSampleContextData();
  contextData.immediate.selectedData = selectedData;
  return contextData;
}

function createContextWithCorrelatedData(): ContextData {
  const selectedData: Cell[][] = [
    [
      { value: 'X', dataType: DataType.TEXT, address: 'A1' },
      { value: 'Y', dataType: DataType.TEXT, address: 'B1' }
    ],
    [
      { value: 1, dataType: DataType.NUMBER, address: 'A2' },
      { value: 2, dataType: DataType.NUMBER, address: 'B2' }
    ],
    [
      { value: 2, dataType: DataType.NUMBER, address: 'A3' },
      { value: 4, dataType: DataType.NUMBER, address: 'B3' }
    ],
    [
      { value: 3, dataType: DataType.NUMBER, address: 'A4' },
      { value: 6, dataType: DataType.NUMBER, address: 'B4' }
    ],
    [
      { value: 4, dataType: DataType.NUMBER, address: 'A5' },
      { value: 8, dataType: DataType.NUMBER, address: 'B5' }
    ]
  ];

  const contextData = createSampleContextData();
  contextData.immediate.selectedData = selectedData;
  return contextData;
}

function createContextWithTextData(): ContextData {
  const selectedData: Cell[][] = [
    [
      { value: 'Name', dataType: DataType.TEXT, address: 'A1' },
      { value: 'City', dataType: DataType.TEXT, address: 'B1' }
    ],
    [
      { value: 'John', dataType: DataType.TEXT, address: 'A2' },
      { value: 'New York', dataType: DataType.TEXT, address: 'B2' }
    ],
    [
      { value: 'Jane', dataType: DataType.TEXT, address: 'A3' },
      { value: 'Boston', dataType: DataType.TEXT, address: 'B3' }
    ]
  ];

  const contextData = createSampleContextData();
  contextData.immediate.selectedData = selectedData;
  return contextData;
}

function createContextWithOutliers(): ContextData {
  const selectedData: Cell[][] = [
    [{ value: 'Values', dataType: DataType.TEXT, address: 'A1' }],
    [{ value: 10, dataType: DataType.NUMBER, address: 'A2' }],
    [{ value: 12, dataType: DataType.NUMBER, address: 'A3' }],
    [{ value: 11, dataType: DataType.NUMBER, address: 'A4' }],
    [{ value: 100, dataType: DataType.NUMBER, address: 'A5' }], // Outlier
    [{ value: 13, dataType: DataType.NUMBER, address: 'A6' }]
  ];

  const contextData = createSampleContextData();
  contextData.immediate.selectedData = selectedData;
  return contextData;
}

function createContextWithFormulaErrors(): ContextData {
  const contextData = createSampleContextData();
  contextData.immediate.currentFormulas = [
    {
      id: '1',
      cell: 'C1',
      formula: '=A1/0', // Division by zero
      sheet: 'Sheet1',
      precedents: ['A1'],
      dependencies: ['A1'],
      isValid: false
    },
    {
      id: '2',
      cell: 'C2',
      formula: '=INVALID_FUNCTION(A2)', // Invalid function
      sheet: 'Sheet1',
      precedents: ['A2'],
      dependencies: ['A2'],
      isValid: false
    }
  ];
  return contextData;
}

function createContextWithSevereAnomalies(): ContextData {
  const contextData = createContextWithOutliers();
  // Add more severe anomalies
  contextData.immediate.selectedData.push([
    { value: -1000, dataType: DataType.NUMBER, address: 'A7' } // Extreme outlier
  ]);
  return contextData;
}

function createEmptyContextData(): ContextData {
  const contextData = createSampleContextData();
  contextData.immediate.selectedData = [];
  contextData.immediate.visibleData = [];
  return contextData;
}

function createRichContextData(): ContextData {
  const contextData = createSampleContextData();
  
  // Add more data with various patterns
  const additionalData: Cell[][] = [
    [
      { value: '2024-01-04', dataType: DataType.DATE, address: 'A5' },
      { value: 160, dataType: DataType.NUMBER, address: 'B5' }
    ],
    [
      { value: '2024-01-05', dataType: DataType.DATE, address: 'A6' },
      { value: 180, dataType: DataType.NUMBER, address: 'B6' }
    ],
    [
      { value: '2024-01-06', dataType: DataType.DATE, address: 'A7' },
      { value: null, dataType: DataType.EMPTY, address: 'B7' } // Missing data
    ]
  ];
  
  contextData.immediate.selectedData.push(...additionalData);
  contextData.immediate.visibleData.push(...additionalData);
  
  return contextData;
}

function createMalformedContextData(): ContextData {
  const contextData = createSampleContextData();
  
  // Add malformed data
  contextData.immediate.selectedData.push([
    { value: undefined, dataType: DataType.TEXT, address: 'A8' } as any,
    { value: 'not a number', dataType: DataType.NUMBER, address: 'B8' } as any
  ]);
  
  return contextData;
}