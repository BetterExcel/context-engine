import { DataBoundaryAnalyzer } from '../services/DataBoundaryAnalyzer';
import { Sheet, Cell, DataType } from '../types/spreadsheet';

describe('DataBoundaryAnalyzer Performance Tests', () => {
  // Helper function to create test sheets with various sizes and patterns
  const createTestSheet = (
    rows: number, 
    cols: number, 
    dataPattern: 'dense' | 'sparse' | 'edge' | 'random' = 'dense'
  ): Sheet => {
    const data: Cell[][] = [];
    
    for (let row = 0; row < rows; row++) {
      data[row] = [];
      for (let col = 0; col < cols; col++) {
        let hasData = false;
        
        switch (dataPattern) {
          case 'dense':
            hasData = Math.random() > 0.1; // 90% filled
            break;
          case 'sparse':
            hasData = Math.random() > 0.9; // 10% filled
            break;
          case 'edge':
            // Data only in corners and edges
            hasData = row < 5 || row >= rows - 5 || col < 5 || col >= cols - 5;
            break;
          case 'random':
            hasData = Math.random() > 0.5; // 50% filled
            break;
        }
        
        data[row]![col] = {
          value: hasData ? `Cell_${row}_${col}` : null,
          dataType: hasData ? DataType.TEXT : DataType.EMPTY,
          address: `${String.fromCharCode(65 + (col % 26))}${row + 1}`
        };
      }
    }
    
    return {
      name: `TestSheet_${rows}x${cols}_${dataPattern}`,
      data,
      dimensions: { rows, cols },
      formatting: [],
      namedRanges: []
    };
  };

  // Performance benchmark helper
  const benchmarkAnalysis = async (sheet: Sheet, iterations: number = 1): Promise<{
    avgTime: number;
    minTime: number;
    maxTime: number;
    totalTime: number;
  }> => {
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      // Clear cache to ensure fair testing
      DataBoundaryAnalyzer.clearCache();
      
      const startTime = performance.now();
      DataBoundaryAnalyzer.analyzeDataBoundaries(sheet);
      const endTime = performance.now();
      
      times.push(endTime - startTime);
    }
    
    return {
      avgTime: times.reduce((a, b) => a + b, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      totalTime: times.reduce((a, b) => a + b, 0)
    };
  };

  beforeEach(() => {
    // Clear cache before each test
    DataBoundaryAnalyzer.clearCache();
  });

  describe('Small Dataset Performance', () => {
    it('should analyze small dense sheets quickly', async () => {
      const sheet = createTestSheet(100, 50, 'dense');
      const benchmark = await benchmarkAnalysis(sheet, 5);
      
      expect(benchmark.avgTime).toBeLessThan(50); // Should complete in under 50ms
      expect(benchmark.maxTime).toBeLessThan(100); // No single run should exceed 100ms
    });

    it('should analyze small sparse sheets efficiently', async () => {
      const sheet = createTestSheet(100, 50, 'sparse');
      const benchmark = await benchmarkAnalysis(sheet, 5);
      
      // Sparse sheets should be faster due to early termination
      expect(benchmark.avgTime).toBeLessThan(30);
    });
  });

  describe('Medium Dataset Performance', () => {
    it('should handle medium-sized sheets within reasonable time', async () => {
      const sheet = createTestSheet(1000, 100, 'dense');
      const benchmark = await benchmarkAnalysis(sheet, 3);
      
      expect(benchmark.avgTime).toBeLessThan(200); // Should complete in under 200ms
      expect(benchmark.maxTime).toBeLessThan(500);
    });

    it('should benefit from early termination on edge data pattern', async () => {
      const sheet = createTestSheet(1000, 100, 'edge');
      const benchmark = await benchmarkAnalysis(sheet, 3);
      
      // Edge pattern should be much faster due to early boundary detection
      expect(benchmark.avgTime).toBeLessThan(100);
    });
  });

  describe('Large Dataset Performance', () => {
    it('should use progressive analysis for very large sheets', async () => {
      const sheet = createTestSheet(10000, 50, 'sparse');
      const benchmark = await benchmarkAnalysis(sheet, 1);
      
      // Even large sheets should complete in reasonable time with progressive analysis
      expect(benchmark.avgTime).toBeLessThan(1000); // Under 1 second
    });

    it('should handle extremely wide sheets efficiently', async () => {
      const sheet = createTestSheet(100, 1000, 'sparse');
      const benchmark = await benchmarkAnalysis(sheet, 1);
      
      expect(benchmark.avgTime).toBeLessThan(500);
    });
  });

  describe('Caching Performance', () => {
    it('should provide significant speedup on cache hits', async () => {
      const sheet = createTestSheet(1000, 100, 'dense');
      
      // First analysis (cache miss)
      const firstRun = await benchmarkAnalysis(sheet, 1);
      
      // Second analysis (cache hit)
      const startTime = performance.now();
      DataBoundaryAnalyzer.analyzeDataBoundaries(sheet);
      const endTime = performance.now();
      const cachedTime = endTime - startTime;
      
      // Cached result should be much faster
      expect(cachedTime).toBeLessThan(firstRun.avgTime * 0.1); // At least 10x faster
      expect(cachedTime).toBeLessThan(5); // Should be under 5ms
    });

    it('should manage cache size properly', () => {
      // Create many different sheets to test cache eviction
      for (let i = 0; i < 150; i++) {
        const sheet = createTestSheet(10 + i, 10, 'dense');
        DataBoundaryAnalyzer.analyzeDataBoundaries(sheet);
      }
      
      const stats = DataBoundaryAnalyzer.getCacheStats();
      expect(stats.size).toBeLessThanOrEqual(stats.maxSize);
    });
  });

  describe('Range Validation Performance', () => {
    it('should validate small ranges quickly', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        DataBoundaryAnalyzer.validateRangeSize('A1:Z100');
      }
      
      const endTime = performance.now();
      const avgTime = (endTime - startTime) / 1000;
      
      expect(avgTime).toBeLessThan(1); // Should be under 1ms per validation
    });

    it('should handle complex range formats efficiently', () => {
      const ranges = [
        'A1:ZZ1000',
        'AA1:ZZ9999',
        'A1:A100000',
        'A1:ZZZZ1'
      ];
      
      const startTime = performance.now();
      
      ranges.forEach(range => {
        for (let i = 0; i < 100; i++) {
          DataBoundaryAnalyzer.validateRangeSize(range);
        }
      });
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      expect(totalTime).toBeLessThan(100); // Should complete all validations in under 100ms
    });
  });

  describe('Memory Usage', () => {
    it('should not cause memory leaks with repeated analysis', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform many analyses
      for (let i = 0; i < 100; i++) {
        const sheet = createTestSheet(100, 50, 'random');
        DataBoundaryAnalyzer.analyzeDataBoundaries(sheet);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Edge Cases Performance', () => {
    it('should handle empty sheets quickly', () => {
      const sheet = createTestSheet(0, 0, 'dense');
      const startTime = performance.now();
      
      const result = DataBoundaryAnalyzer.analyzeDataBoundaries(sheet);
      
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(1);
      expect(result.maxRow).toBe(-1);
      expect(result.maxCol).toBe(-1);
    });

    it('should handle sheets with only empty cells efficiently', async () => {
      const sheet = createTestSheet(1000, 100, 'sparse');
      // Make all cells empty
      sheet.data.forEach(row => {
        row.forEach(cell => {
          cell.value = null;
          cell.dataType = DataType.EMPTY;
        });
      });
      
      const benchmark = await benchmarkAnalysis(sheet, 1);
      
      // Should be very fast due to early termination
      expect(benchmark.avgTime).toBeLessThan(50);
    });

    it('should handle single-cell data efficiently', async () => {
      const sheet = createTestSheet(1000, 100, 'sparse');
      // Only put data in one cell
      sheet.data.forEach(row => {
        row.forEach(cell => {
          cell.value = null;
          cell.dataType = DataType.EMPTY;
        });
      });
      
      if (sheet.data[500] && sheet.data[500]![50]) {
        sheet.data[500]![50] = {
          value: 'Single Cell',
          dataType: DataType.TEXT,
          address: 'AY501'
        };
      }
      
      const benchmark = await benchmarkAnalysis(sheet, 1);
      
      expect(benchmark.avgTime).toBeLessThan(100);
    });
  });
});