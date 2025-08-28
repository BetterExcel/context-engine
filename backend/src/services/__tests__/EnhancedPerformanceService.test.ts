import { EnhancedPerformanceService } from '../EnhancedPerformanceService';
import { SpreadsheetData, DataType } from '../../types/spreadsheet';

describe('EnhancedPerformanceService', () => {
  let performanceService: EnhancedPerformanceService;
  let mockSpreadsheetData: SpreadsheetData;

  beforeEach(() => {
    performanceService = new EnhancedPerformanceService({
      enableCaching: true,
      enableStreaming: true,
      enableParallelProcessing: true,
      enableLazyLoading: true,
      cacheStrategy: 'balanced',
      processingThreshold: 1000,
      streamingThreshold: 500
    });

    // Create mock spreadsheet data
    mockSpreadsheetData = {
      id: 'test-spreadsheet-1',
      sheets: [{
        name: 'Sheet1',
        dimensions: { rows: 1000, cols: 10 },
        data: Array(1000).fill(null).map((_, rowIndex) =>
          Array(10).fill(null).map((_, colIndex) => ({
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
        fileSize: 1024 * 1024, // 1MB
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

  describe('optimizeSpreadsheetProcessing', () => {
    it('should select appropriate optimization strategy based on data size', async () => {
      const result = await performanceService.optimizeSpreadsheetProcessing(
        mockSpreadsheetData,
        'analysis',
        'test-session'
      );

      expect(result.optimizedData).toBeDefined();
      expect(result.optimizationResult).toBeDefined();
      expect(result.optimizationResult.strategy).toBeDefined();
      expect(result.optimizationResult.performance.optimizedTime).toBeGreaterThan(0);
    });

    it('should use streaming for medium-sized datasets', async () => {
      // Create medium-sized dataset
      const mediumData = {
        ...mockSpreadsheetData,
        sheets: [{
          ...mockSpreadsheetData.sheets[0]!,
          dimensions: { rows: 5000, cols: 10 },
          data: Array(5000).fill(null).map((_, rowIndex) =>
            Array(10).fill(null).map((_, colIndex) => ({
              value: `Cell_${rowIndex}_${colIndex}`,
              dataType: DataType.TEXT,
              address: `${String.fromCharCode(65 + colIndex)}${rowIndex + 1}`
            }))
          )
        }]
      };

      const result = await performanceService.optimizeSpreadsheetProcessing(
        mediumData,
        'analysis',
        'test-session'
      );

      expect(result.streamId).toBeDefined();
      expect(['streaming', 'parallel-processing', 'hybrid']).toContain(
        result.optimizationResult.strategy
      );
    });

    it('should use lazy loading for smaller datasets', async () => {
      // Create smaller dataset
      const smallData = {
        ...mockSpreadsheetData,
        sheets: [{
          ...mockSpreadsheetData.sheets[0]!,
          dimensions: { rows: 100, cols: 5 },
          data: Array(100).fill(null).map((_, rowIndex) =>
            Array(5).fill(null).map((_, colIndex) => ({
              value: `Cell_${rowIndex}_${colIndex}`,
              dataType: DataType.TEXT,
              address: `${String.fromCharCode(65 + colIndex)}${rowIndex + 1}`
            }))
          )
        }]
      };

      const result = await performanceService.optimizeSpreadsheetProcessing(
        smallData,
        'analysis',
        'test-session'
      );

      expect(['lazy-loading', 'caching-only']).toContain(
        result.optimizationResult.strategy
      );
    });
  });

  describe('processLargeDataset', () => {
    it('should process dataset with appropriate optimization', async () => {
      const dataset = Array(1000).fill(null).map((_, i) => ({ id: i, value: `item_${i}` }));
      
      const processor = async (item: any) => ({
        ...item,
        processed: true,
        timestamp: Date.now()
      });

      const result = await performanceService.processLargeDataset(
        dataset,
        processor,
        {
          chunkSize: 100,
          maxConcurrency: 2,
          enableProgressUpdates: true,
          cacheIntermediateResults: true,
          streamResults: true
        }
      );

      expect(result.results).toHaveLength(1000);
      expect(result.metrics.totalTime).toBeGreaterThan(0);
      expect(result.metrics.itemsPerSecond).toBeGreaterThan(0);
      expect(result.results[0]).toHaveProperty('processed', true);
    });

    it('should handle processing errors gracefully', async () => {
      const dataset = Array(10).fill(null).map((_, i) => ({ id: i, value: `item_${i}` }));
      
      const processor = async (item: any) => {
        if (item.id === 5) {
          throw new Error('Processing error');
        }
        return { ...item, processed: true };
      };

      const result = await performanceService.processLargeDataset(
        dataset,
        processor
      );

      // Should still process other items successfully
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.metrics.totalTime).toBeGreaterThan(0);
    });

    it('should use sequential processing for small datasets', async () => {
      const smallDataset = Array(10).fill(null).map((_, i) => ({ id: i, value: `item_${i}` }));
      
      const processor = async (item: any) => ({ ...item, processed: true });

      const result = await performanceService.processLargeDataset(
        smallDataset,
        processor,
        { streamResults: false }
      );

      expect(result.results).toHaveLength(10);
      expect(result.streamId).toBeUndefined();
    });
  });

  describe('getPerformanceAnalytics', () => {
    it('should return comprehensive performance analytics', () => {
      const analytics = performanceService.getPerformanceAnalytics();

      expect(analytics).toHaveProperty('systemMetrics');
      expect(analytics).toHaveProperty('optimizationHistory');
      expect(analytics).toHaveProperty('recommendations');
      expect(Array.isArray(analytics.recommendations)).toBe(true);
    });

    it('should provide meaningful recommendations', () => {
      const analytics = performanceService.getPerformanceAnalytics();
      
      // Should have some form of recommendations
      expect(analytics.recommendations).toBeDefined();
    });
  });

  describe('optimization strategy selection', () => {
    it('should select hybrid strategy for very large datasets', async () => {
      const veryLargeData = {
        ...mockSpreadsheetData,
        sheets: [{
          ...mockSpreadsheetData.sheets[0]!,
          dimensions: { rows: 100000, cols: 20 },
          data: [] // Empty data for performance - just testing strategy selection
        }]
      };

      const result = await performanceService.optimizeSpreadsheetProcessing(
        veryLargeData,
        'complex-analysis',
        'test-session'
      );

      expect(result.optimizationResult.strategy).toBe('hybrid');
    });

    it('should select parallel processing for large datasets', async () => {
      const largeData = {
        ...mockSpreadsheetData,
        sheets: [{
          ...mockSpreadsheetData.sheets[0]!,
          dimensions: { rows: 60000, cols: 10 },
          data: [] // Empty data for performance - just testing strategy selection
        }]
      };

      const result = await performanceService.optimizeSpreadsheetProcessing(
        largeData,
        'analysis',
        'test-session'
      );

      expect(result.optimizationResult.strategy).toBe('parallel-processing');
    });
  });

  describe('performance metrics', () => {
    it('should track optimization performance over time', async () => {
      // Process multiple operations to build history
      for (let i = 0; i < 3; i++) {
        await performanceService.optimizeSpreadsheetProcessing(
          mockSpreadsheetData,
          `operation_${i}`,
          'test-session'
        );
      }

      const analytics = performanceService.getPerformanceAnalytics();
      expect(analytics.optimizationHistory.size).toBeGreaterThan(0);
    });

    it('should calculate performance improvements', async () => {
      const result = await performanceService.optimizeSpreadsheetProcessing(
        mockSpreadsheetData,
        'test-operation',
        'test-session'
      );

      expect(result.optimizationResult.performance.optimizedTime).toBeGreaterThan(0);
      expect(result.optimizationResult.performance.improvement).toBeGreaterThanOrEqual(0);
    });
  });

  describe('error handling', () => {
    it('should handle invalid spreadsheet data gracefully', async () => {
      const invalidData = {
        ...mockSpreadsheetData,
        sheets: []
      };

      const result = await performanceService.optimizeSpreadsheetProcessing(
        invalidData,
        'analysis',
        'test-session'
      );

      expect(result.optimizedData).toBeDefined();
      expect(result.optimizationResult).toBeDefined();
    });

    it('should handle processing failures gracefully', async () => {
      const dataset = [{ id: 1, value: 'test' }];
      
      const failingProcessor = async () => {
        throw new Error('Processing failed');
      };

      const result = await performanceService.processLargeDataset(
        dataset,
        failingProcessor
      );

      expect(result.results).toBeDefined();
      expect(result.metrics).toBeDefined();
    });
  });
});