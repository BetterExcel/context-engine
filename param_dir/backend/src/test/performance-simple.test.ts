import { DataBoundaryAnalyzer } from '../services/DataBoundaryAnalyzer';
import { Sheet, Cell, DataType } from '../types/spreadsheet';

describe('Performance Optimizations', () => {
  // Helper function to create test sheets
  const createTestSheet = (rows: number, cols: number, fillRatio: number = 0.5): Sheet => {
    const data: Cell[][] = [];
    
    for (let row = 0; row < rows; row++) {
      data[row] = [];
      for (let col = 0; col < cols; col++) {
        const hasData = Math.random() < fillRatio;
        data[row]![col] = {
          value: hasData ? `R${row}C${col}` : null,
          dataType: hasData ? DataType.TEXT : DataType.EMPTY,
          address: `${String.fromCharCode(65 + (col % 26))}${row + 1}`
        };
      }
    }
    
    return {
      name: `TestSheet_${rows}x${cols}`,
      data,
      dimensions: { rows, cols },
      formatting: [],
      namedRanges: []
    };
  };

  beforeEach(() => {
    // Clear cache before each test
    DataBoundaryAnalyzer.clearCache();
  });

  describe('Boundary Analysis Performance', () => {
    it('should analyze small sheets quickly', () => {
      const sheet = createTestSheet(100, 20, 0.8);
      
      const startTime = performance.now();
      const result = DataBoundaryAnalyzer.analyzeDataBoundaries(sheet);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
      expect(result).toBeDefined();
      expect(result.minRow).toBeGreaterThanOrEqual(0);
      expect(result.maxRow).toBeGreaterThanOrEqual(-1);
    });

    it('should handle large sheets with progressive analysis', () => {
      const sheet = createTestSheet(10000, 50, 0.1); // Large sparse sheet
      
      const startTime = performance.now();
      const result = DataBoundaryAnalyzer.analyzeDataBoundaries(sheet);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(2000); // Should complete in under 2 seconds
      expect(result).toBeDefined();
    });

    it('should benefit from caching', () => {
      const sheet = createTestSheet(1000, 30, 0.5);
      
      // First analysis (cache miss)
      const firstStart = performance.now();
      const firstResult = DataBoundaryAnalyzer.analyzeDataBoundaries(sheet);
      const firstEnd = performance.now();
      const firstTime = firstEnd - firstStart;
      
      // Second analysis (cache hit)
      const secondStart = performance.now();
      const secondResult = DataBoundaryAnalyzer.analyzeDataBoundaries(sheet);
      const secondEnd = performance.now();
      const secondTime = secondEnd - secondStart;
      
      expect(secondTime).toBeLessThan(firstTime * 0.5); // Should be at least 2x faster
      expect(firstResult).toEqual(secondResult);
    });

    it('should handle empty sheets efficiently', () => {
      const sheet = createTestSheet(1000, 100, 0); // All empty
      
      const startTime = performance.now();
      const result = DataBoundaryAnalyzer.analyzeDataBoundaries(sheet);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(50); // Should be very fast
      expect(result.maxRow).toBe(-1);
      expect(result.maxCol).toBe(-1);
    });
  });

  describe('Range Validation Performance', () => {
    it('should validate ranges quickly', () => {
      const ranges = ['A1:Z100', 'A1:ZZ1000', 'A1:AAA5000'];
      
      for (const range of ranges) {
        const startTime = performance.now();
        const result = DataBoundaryAnalyzer.validateRangeSize(range);
        const endTime = performance.now();
        
        expect(endTime - startTime).toBeLessThan(100); // Should be under 100ms
        expect(result).toBeDefined();
        expect(typeof result.isValid).toBe('boolean');
      }
    });

    it('should handle invalid ranges gracefully', () => {
      const invalidRanges = ['invalid', 'A1:ZZZ', '123:456'];
      
      for (const range of invalidRanges) {
        const startTime = performance.now();
        const result = DataBoundaryAnalyzer.validateRangeSize(range);
        const endTime = performance.now();
        
        expect(endTime - startTime).toBeLessThan(5); // Should fail fast
        expect(result.isValid).toBe(false);
        expect(result.warnings.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Cache Management', () => {
    it('should manage cache size properly', () => {
      // Create many different sheets to test cache eviction
      for (let i = 0; i < 150; i++) {
        const sheet = createTestSheet(10 + i, 10, 0.5);
        DataBoundaryAnalyzer.analyzeDataBoundaries(sheet);
      }
      
      const stats = DataBoundaryAnalyzer.getCacheStats();
      expect(stats.size).toBeLessThanOrEqual(stats.maxSize);
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should clear cache when requested', () => {
      const sheet = createTestSheet(100, 20, 0.5);
      DataBoundaryAnalyzer.analyzeDataBoundaries(sheet);
      
      let stats = DataBoundaryAnalyzer.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
      
      DataBoundaryAnalyzer.clearCache();
      
      stats = DataBoundaryAnalyzer.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('Memory Usage', () => {
    it('should not cause excessive memory usage', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform many analyses
      for (let i = 0; i < 50; i++) {
        const sheet = createTestSheet(200, 25, 0.3);
        DataBoundaryAnalyzer.analyzeDataBoundaries(sheet);
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / (1024 * 1024); // Convert to MB
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50);
    });
  });
});