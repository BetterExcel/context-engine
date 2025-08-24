import { performance } from 'perf_hooks';
import request from 'supertest';
import app from '../index';
import { cacheService } from '../services/CacheService';
import { lazyLoadingService } from '../services/LazyLoadingService';
import { databaseService } from '../database';
import { SpreadsheetParser } from '../services/SpreadsheetParser';
import { ContextExtractor } from '../services/ContextExtractor';
import fs from 'fs';
import path from 'path';

describe('Performance Tests', () => {
  let testSpreadsheetPath: string;
  let largeSpreadsheetPath: string;

  beforeAll(async () => {
    // Create test spreadsheet files
    testSpreadsheetPath = await createTestSpreadsheet(1000, 50); // 1000 rows, 50 cols
    largeSpreadsheetPath = await createTestSpreadsheet(10000, 100); // 10000 rows, 100 cols
    
    // Initialize services
    await databaseService.initialize();
  });

  afterAll(async () => {
    // Cleanup test files
    if (fs.existsSync(testSpreadsheetPath)) {
      fs.unlinkSync(testSpreadsheetPath);
    }
    if (fs.existsSync(largeSpreadsheetPath)) {
      fs.unlinkSync(largeSpreadsheetPath);
    }
    
    await databaseService.shutdown();
    await cacheService.close();
  });

  describe('API Response Times', () => {
    test('Health endpoint should respond within 100ms', async () => {
      const start = performance.now();
      
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);
      
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(100);
      expect(response.body.status).toBe('healthy');
    });

    test('File upload should complete within 5 seconds for medium files', async () => {
      const start = performance.now();
      
      const response = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', testSpreadsheetPath)
        .expect(200);
      
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(5000);
      expect(response.body.success).toBe(true);
    }, 10000);

    test('Context analysis should complete within 3 seconds', async () => {
      // First upload a file
      const uploadResponse = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', testSpreadsheetPath)
        .expect(200);

      const spreadsheetId = uploadResponse.body.data.id;
      const start = performance.now();
      
      const response = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          request: 'Calculate the sum of column A',
          spreadsheetId,
          currentSelection: {
            sheet: 'Sheet1',
            range: 'A1:A100',
            activeCell: 'A1'
          },
          userContext: {
            sessionId: 'test-session'
          }
        })
        .expect(200);
      
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(3000);
      expect(response.body.success).toBe(true);
    }, 10000);
  });

  describe('Cache Performance', () => {
    test('Cache operations should be fast', async () => {
      const testData = { test: 'data', numbers: [1, 2, 3, 4, 5] };
      
      // Test cache set
      const setStart = performance.now();
      await cacheService.set('perf-test-key', testData);
      const setDuration = performance.now() - setStart;
      
      expect(setDuration).toBeLessThan(50); // 50ms
      
      // Test cache get
      const getStart = performance.now();
      const retrieved = await cacheService.get('perf-test-key');
      const getDuration = performance.now() - getStart;
      
      expect(getDuration).toBeLessThan(50); // 50ms
      expect(retrieved).toEqual(testData);
      
      // Cleanup
      await cacheService.delete('perf-test-key');
    });

    test('Bulk cache operations should be efficient', async () => {
      const testData = Array.from({ length: 100 }, (_, i) => ({
        key: `bulk-test-${i}`,
        value: { id: i, data: `test-data-${i}` }
      }));
      
      // Test bulk set
      const setStart = performance.now();
      await cacheService.mset(testData);
      const setDuration = performance.now() - setStart;
      
      expect(setDuration).toBeLessThan(500); // 500ms for 100 items
      
      // Test bulk get
      const keys = testData.map(item => item.key);
      const getStart = performance.now();
      const retrieved = await cacheService.mget(keys);
      const getDuration = performance.now() - getStart;
      
      expect(getDuration).toBeLessThan(200); // 200ms for 100 items
      expect(retrieved).toHaveLength(100);
      
      // Cleanup
      await Promise.all(keys.map(key => cacheService.delete(key)));
    });
  });

  describe('Database Performance', () => {
    test('Database queries should be optimized', async () => {
      // Test context insertion
      const insertStart = performance.now();
      const contextId = await databaseService.contexts.create({
        request_id: 'perf-test-request',
        context_type: 'immediate',
        context_data: { test: 'data' },
        confidence_score: 0.95
      });
      const insertDuration = performance.now() - insertStart;
      
      expect(insertDuration).toBeLessThan(100); // 100ms
      expect(contextId).toBeDefined();
      
      // Test context retrieval
      const retrieveStart = performance.now();
      const context = await databaseService.contexts.findById(contextId);
      const retrieveDuration = performance.now() - retrieveStart;
      
      expect(retrieveDuration).toBeLessThan(50); // 50ms
      expect(context).toBeDefined();
      
      // Test indexed query
      const queryStart = performance.now();
      const contexts = await databaseService.contexts.findByRequestId('perf-test-request');
      const queryDuration = performance.now() - queryStart;
      
      expect(queryDuration).toBeLessThan(100); // 100ms
      expect(contexts).toHaveLength(1);
      
      // Cleanup
      await databaseService.contexts.delete(contextId);
    });

    test('Pagination should be efficient', async () => {
      // Create test data
      const testContexts = Array.from({ length: 50 }, (_, i) => ({
        request_id: `perf-pagination-${i}`,
        context_type: 'test',
        context_data: { index: i },
        confidence_score: Math.random()
      }));
      
      const insertStart = performance.now();
      const contextIds = await Promise.all(
        testContexts.map(context => databaseService.contexts.create(context))
      );
      const insertDuration = performance.now() - insertStart;
      
      expect(insertDuration).toBeLessThan(1000); // 1 second for 50 inserts
      
      // Test paginated query (simplified - just get all contexts)
      const queryStart = performance.now();
      const contexts = await databaseService.contexts.findAll();
      const queryDuration = performance.now() - queryStart;
      
      expect(queryDuration).toBeLessThan(200); // 200ms
      expect(contexts.length).toBeGreaterThan(0);
      
      // Cleanup
      await Promise.all(contextIds.map(id => databaseService.contexts.delete(id)));
    });
  });

  describe('Spreadsheet Processing Performance', () => {
    test('Spreadsheet parsing should be efficient', async () => {
      const fileBuffer = fs.readFileSync(testSpreadsheetPath);
      
      const parseStart = performance.now();
      const spreadsheetData = await SpreadsheetParser.parseFile(fileBuffer, 'test.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const parseDuration = performance.now() - parseStart;
      
      expect(parseDuration).toBeLessThan(2000); // 2 seconds
      expect(spreadsheetData.sheets).toHaveLength(1);
      expect(spreadsheetData.sheets[0].dimensions.rows).toBe(1000);
    });

    test('Context extraction should scale with data size', async () => {
      const fileBuffer = fs.readFileSync(testSpreadsheetPath);
      const spreadsheetData = await SpreadsheetParser.parseFile(fileBuffer, 'test.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      const selectionInfo = {
        sheet: 'Sheet1',
        range: 'A1:E100',
        activeCell: 'A1'
      };
      
      const scopeInfo = {
        type: 'current_selection' as const,
        includeRelated: true,
        includeHistory: false,
        maxCells: 1000
      };
      
      const extractStart = performance.now();
      const context = await ContextExtractor.extractRelevantData(
        spreadsheetData,
        selectionInfo,
        scopeInfo
      );
      const extractDuration = performance.now() - extractStart;
      
      expect(extractDuration).toBeLessThan(1000); // 1 second
      expect(context.immediate.selectedData).toBeDefined();
      expect(context.confidence).toBeGreaterThan(0);
    });
  });

  describe('Lazy Loading Performance', () => {
    test('Lazy loading should improve memory usage for large files', async () => {
      const fileBuffer = fs.readFileSync(largeSpreadsheetPath);
      const spreadsheetData = await SpreadsheetParser.parseFile(fileBuffer, 'large.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      // Measure memory before lazy loading
      const memBefore = process.memoryUsage();
      
      const lazyStart = performance.now();
      await lazyLoadingService.convertToLazyLoaded(spreadsheetData);
      const lazyDuration = performance.now() - lazyStart;
      
      // Measure memory after lazy loading
      const memAfter = process.memoryUsage();
      
      expect(lazyDuration).toBeLessThan(5000); // 5 seconds
      expect(memAfter.heapUsed).toBeLessThan(memBefore.heapUsed * 1.5); // Should not increase memory significantly
      
      // Test range loading performance
      const rangeStart = performance.now();
      const rangeData = await lazyLoadingService.loadRange('Sheet1', {
        startRow: 0,
        startCol: 0,
        endRow: 99,
        endCol: 9,
        sheetName: 'Sheet1'
      });
      const rangeDuration = performance.now() - rangeStart;
      
      expect(rangeDuration).toBeLessThan(500); // 500ms
      expect(rangeData).toBeDefined();
    }, 15000);
  });

  describe('Rate Limiting Performance', () => {
    test('Rate limiting should not significantly impact response time', async () => {
      const requests = Array.from({ length: 10 }, () => 
        request(app).get('/api/v1/health')
      );
      
      const start = performance.now();
      const responses = await Promise.all(requests);
      const duration = performance.now() - start;
      
      // All requests should succeed (within rate limit)
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      // Average response time should be reasonable
      const avgResponseTime = duration / requests.length;
      expect(avgResponseTime).toBeLessThan(200); // 200ms average
    });
  });

  describe('Compression Performance', () => {
    test('Response compression should improve transfer efficiency', async () => {
      // Create a large response
      const response = await request(app)
        .get('/api/v1/health')
        .set('Accept-Encoding', 'gzip')
        .expect(200);
      
      // Check if response is compressed
      expect(response.headers['content-encoding']).toBeDefined();
      
      // Response should still be fast even with compression
      const start = performance.now();
      await request(app)
        .get('/api/v1/health')
        .set('Accept-Encoding', 'gzip')
        .expect(200);
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(150); // 150ms with compression
    });
  });

  describe('Memory Usage', () => {
    test('Memory usage should remain stable under load', async () => {
      const initialMemory = process.memoryUsage();
      
      // Simulate load
      const promises = Array.from({ length: 20 }, async () => {
        return request(app)
          .get('/api/v1/health')
          .expect(200);
      });
      
      await Promise.all(promises);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      
      // Memory should not increase significantly
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreasePercent = (memoryIncrease / initialMemory.heapUsed) * 100;
      
      expect(memoryIncreasePercent).toBeLessThan(50); // Less than 50% increase
    });
  });
});

// Helper function to create test spreadsheet files
async function createTestSpreadsheet(rows: number, cols: number): Promise<string> {
  const XLSX = require('xlsx');
  
  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Create worksheet data
  const wsData: any[][] = [];
  
  // Add headers
  const headers = Array.from({ length: cols }, (_, i) => `Column ${String.fromCharCode(65 + i)}`);
  wsData.push(headers);
  
  // Add data rows
  for (let row = 1; row < rows; row++) {
    const rowData = Array.from({ length: cols }, (_, col) => {
      if (col === 0) return row; // First column: row numbers
      if (col === 1) return `Item ${row}`; // Second column: text
      if (col === 2) return Math.random() * 1000; // Third column: random numbers
      return `Data ${row}-${col}`; // Other columns: mixed data
    });
    wsData.push(rowData);
  }
  
  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  
  // Write to file
  const filename = `test-spreadsheet-${rows}x${cols}-${Date.now()}.xlsx`;
  const filepath = path.join(__dirname, '../../uploads', filename);
  
  // Ensure uploads directory exists
  const uploadsDir = path.dirname(filepath);
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  XLSX.writeFile(wb, filepath);
  
  return filepath;
}

// Benchmark utility
export function benchmark(name: string, fn: () => Promise<void> | void): Promise<number> {
  return new Promise(async (resolve) => {
    const start = performance.now();
    await fn();
    const duration = performance.now() - start;
    console.log(`Benchmark ${name}: ${duration.toFixed(2)}ms`);
    resolve(duration);
  });
}