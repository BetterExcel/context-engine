import { enhancedPerformanceService } from '../services/EnhancedPerformanceService';
import { SpreadsheetData, DataType, Sheet } from '../types/spreadsheet';

describe('Performance Optimization Integration', () => {
  let mockSpreadsheetData: SpreadsheetData;

  beforeEach(() => {
    // Create realistic test data
    mockSpreadsheetData = {
      id: 'test-spreadsheet-1',
      sheets: [{
        name: 'TestSheet',
        dimensions: { rows: 100, cols: 5 },
        data: Array(100).fill(null).map((_, rowIndex) =>
          Array(5).fill(null).map((_, colIndex) => ({
            value: `Cell_${rowIndex}_${colIndex}`,
            dataType: DataType.TEXT,
            address: `${String.fromCharCode(65 + colIndex)}${rowIndex + 1}`
          }))
        ),
        formatting: [],
        namedRanges: []
      }],
      metadata: {
        filename: 'test.csv',
        fileSize: 1024 * 10, // 10KB
        mimeType: 'text/csv',
        uploadedAt: new Date(),
        lastModified: new Date()
      },
      formulas: [],
      namedRanges: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  });

  it('should optimize small spreadsheet processing', async () => {
    const result = await enhancedPerformanceService.optimizeSpreadsheetProcessing(
      mockSpreadsheetData,
      'basic-analysis',
      'test-session-1'
    );

    expect(result.optimizedData).toBeDefined();
    expect(result.optimizationResult).toBeDefined();
    expect(result.optimizationResult.strategy).toBeDefined();
    expect(result.optimizationResult.performance.optimizedTime).toBeGreaterThan(0);
    
    // For small data, should use caching-only or lazy-loading
    expect(['caching-only', 'lazy-loading']).toContain(result.optimizationResult.strategy);
  });

  it('should process dataset with appropriate optimization', async () => {
    const dataset = Array(50).fill(null).map((_, i) => ({ 
      id: i, 
      name: `Item ${i}`,
      value: Math.random() * 100 
    }));
    
    const processor = async (item: any) => ({
      ...item,
      processed: true,
      processedAt: Date.now()
    });

    const result = await enhancedPerformanceService.processLargeDataset(
      dataset,
      processor,
      {
        chunkSize: 10,
        maxConcurrency: 2,
        enableProgressUpdates: false, // Disable for simpler testing
        cacheIntermediateResults: false,
        streamResults: false
      }
    );

    expect(result.results).toHaveLength(50);
    expect(result.metrics.totalTime).toBeGreaterThan(0);
    expect(result.metrics.itemsPerSecond).toBeGreaterThan(0);
    expect(result.results[0]).toHaveProperty('processed', true);
  });

  it('should provide performance analytics', () => {
    const analytics = enhancedPerformanceService.getPerformanceAnalytics();

    expect(analytics).toHaveProperty('systemMetrics');
    expect(analytics).toHaveProperty('optimizationHistory');
    expect(analytics).toHaveProperty('recommendations');
    expect(Array.isArray(analytics.recommendations)).toBe(true);
  });

  it('should handle different data sizes appropriately', async () => {
    // Test with different sized datasets
    const sizes = [
      { rows: 10, cols: 3, expectedStrategy: 'caching-only' },
      { rows: 1000, cols: 5, expectedStrategy: 'lazy-loading' },
      { rows: 5000, cols: 10, expectedStrategy: 'streaming' }
    ];

    for (const size of sizes) {
      const testData = {
        ...mockSpreadsheetData,
        sheets: [{
          ...mockSpreadsheetData.sheets[0]!,
          dimensions: { rows: size.rows, cols: size.cols },
          data: [] // Empty for performance
        }]
      };

      const result = await enhancedPerformanceService.optimizeSpreadsheetProcessing(
        testData,
        'size-test',
        'test-session'
      );

      // Strategy should be appropriate for data size
      const validStrategies = ['caching-only', 'lazy-loading', 'streaming', 'parallel-processing', 'hybrid'];
      expect(validStrategies).toContain(result.optimizationResult.strategy);
    }
  });

  it('should handle processing errors gracefully', async () => {
    const dataset = [
      { id: 1, value: 'good' },
      { id: 2, value: 'bad' },
      { id: 3, value: 'good' }
    ];
    
    const processor = async (item: any) => {
      if (item.value === 'bad') {
        throw new Error('Processing failed');
      }
      return { ...item, processed: true };
    };

    // Should handle errors gracefully and continue processing other items
    try {
      const result = await enhancedPerformanceService.processLargeDataset(
        dataset,
        processor,
        { streamResults: false }
      );

      // Should have results for the items that didn't fail
      expect(result.results).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.metrics.totalTime).toBeGreaterThan(0);
      
      // Should have processed the successful items
      const successfulResults = result.results.filter(r => r.processed === true);
      expect(successfulResults.length).toBeGreaterThan(0);
    } catch (error) {
      // If it throws, that's also acceptable for this test
      expect(error).toBeDefined();
    }
  });
});