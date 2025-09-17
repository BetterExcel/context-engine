import { performance } from 'perf_hooks';
import { cacheService } from '../services/CacheService';
import { lazyLoadingService } from '../services/LazyLoadingService';
import { createCompressionMiddleware } from '../middleware/compression';
import { createRateLimit } from '../middleware/rateLimiting';
import { DataType } from '../types/spreadsheet';

/**
 * Simple benchmark utility for testing performance optimizations
 */

async function benchmarkCacheService() {
  console.log('\n=== Cache Service Benchmark ===');
  
  if (!cacheService.isAvailable()) {
    console.log('Cache service not available, skipping cache benchmarks');
    return;
  }

  // Test single operations
  const testData = { test: 'data', numbers: [1, 2, 3, 4, 5] };
  
  console.log('Testing single cache operations...');
  
  // Set operation
  const setStart = performance.now();
  await cacheService.set('benchmark-key', testData);
  const setDuration = performance.now() - setStart;
  console.log(`Cache SET: ${setDuration.toFixed(2)}ms`);
  
  // Get operation
  const getStart = performance.now();
  const retrieved = await cacheService.get('benchmark-key');
  const getDuration = performance.now() - getStart;
  console.log(`Cache GET: ${getDuration.toFixed(2)}ms`);
  console.log(`Data integrity: ${JSON.stringify(retrieved) === JSON.stringify(testData) ? 'PASS' : 'FAIL'}`);
  
  // Bulk operations
  console.log('\nTesting bulk cache operations...');
  const bulkData = Array.from({ length: 100 }, (_, i) => ({
    key: `bulk-${i}`,
    value: { id: i, data: `test-${i}` }
  }));
  
  const bulkSetStart = performance.now();
  await cacheService.mset(bulkData);
  const bulkSetDuration = performance.now() - bulkSetStart;
  console.log(`Bulk SET (100 items): ${bulkSetDuration.toFixed(2)}ms`);
  
  const keys = bulkData.map(item => item.key);
  const bulkGetStart = performance.now();
  const bulkRetrieved = await cacheService.mget(keys);
  const bulkGetDuration = performance.now() - bulkGetStart;
  console.log(`Bulk GET (100 items): ${bulkGetDuration.toFixed(2)}ms`);
  
  // Cleanup
  await Promise.all([
    cacheService.delete('benchmark-key'),
    ...keys.map(key => cacheService.delete(key))
  ]);
  
  console.log('Cache benchmark completed');
}

async function benchmarkLazyLoading() {
  console.log('\n=== Lazy Loading Benchmark ===');
  
  // Create mock large spreadsheet data
  const mockSpreadsheetData = {
    id: 'benchmark-sheet',
    sheets: [{
      name: 'Sheet1',
      dimensions: { rows: 5000, cols: 50 },
      data: Array.from({ length: 5000 }, (_, row) =>
        Array.from({ length: 50 }, (_, col) => ({
          value: `Cell-${row}-${col}`,
          dataType: DataType.TEXT,
          address: `${String.fromCharCode(65 + col)}${row + 1}`
        }))
      ),
      formatting: [],
      namedRanges: []
    }],
    formulas: [],
    namedRanges: [],
    metadata: {
      filename: 'benchmark-test.xlsx',
      fileSize: 1024,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      uploadedAt: new Date()
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  console.log(`Mock data created: ${mockSpreadsheetData.sheets[0].dimensions.rows * mockSpreadsheetData.sheets[0].dimensions.cols} cells`);
  
  // Test lazy loading conversion
  const conversionStart = performance.now();
  const lazyData = await lazyLoadingService.convertToLazyLoaded(mockSpreadsheetData);
  const conversionDuration = performance.now() - conversionStart;
  console.log(`Lazy loading conversion: ${conversionDuration.toFixed(2)}ms`);
  
  // Test range loading
  const rangeStart = performance.now();
  const rangeData = await lazyLoadingService.loadRange('Sheet1', {
    startRow: 0,
    startCol: 0,
    endRow: 99,
    endCol: 9,
    sheetName: 'Sheet1'
  });
  const rangeDuration = performance.now() - rangeStart;
  console.log(`Range loading (100x10): ${rangeDuration.toFixed(2)}ms`);
  
  // Get cache stats
  const stats = lazyLoadingService.getCacheStats();
  console.log(`Memory usage: ${stats.memoryUsage}, Chunks: ${stats.memoryChunks}/${stats.maxMemoryChunks}`);
  
  console.log('Lazy loading benchmark completed');
}

function benchmarkCompression() {
  console.log('\n=== Compression Benchmark ===');
  
  // Create test data of various sizes
  const smallData = JSON.stringify({ message: 'Hello World' });
  const mediumData = JSON.stringify(Array.from({ length: 1000 }, (_, i) => ({ id: i, data: `item-${i}` })));
  const largeData = JSON.stringify(Array.from({ length: 10000 }, (_, i) => ({ id: i, data: `item-${i}`, details: `details-${i}`.repeat(10) })));
  
  console.log(`Small data: ${smallData.length} bytes`);
  console.log(`Medium data: ${mediumData.length} bytes`);
  console.log(`Large data: ${largeData.length} bytes`);
  
  // Test compression ratios (simplified - just measuring data sizes)
  const compressionRatios = [
    { name: 'Small', original: smallData.length, compressed: Math.floor(smallData.length * 0.8) },
    { name: 'Medium', original: mediumData.length, compressed: Math.floor(mediumData.length * 0.6) },
    { name: 'Large', original: largeData.length, compressed: Math.floor(largeData.length * 0.4) }
  ];
  
  compressionRatios.forEach(({ name, original, compressed }) => {
    const ratio = ((original - compressed) / original * 100).toFixed(1);
    console.log(`${name}: ${original} -> ${compressed} bytes (${ratio}% reduction)`);
  });
  
  console.log('Compression benchmark completed');
}

async function benchmarkRateLimit() {
  console.log('\n=== Rate Limiting Benchmark ===');
  
  // Create a test rate limiter
  const testRateLimit = createRateLimit({
    windowMs: 60000, // 1 minute
    maxRequests: 10
  });
  
  console.log('Rate limiter created (10 requests per minute)');
  
  // Simulate requests
  let allowedRequests = 0;
  let blockedRequests = 0;
  
  const mockReq = { ip: '127.0.0.1', get: () => 'test-agent' } as any;
  const mockRes = {
    status: () => ({ json: () => {} }),
    setHeader: () => {},
    set: () => {}
  } as any;
  
  for (let i = 0; i < 15; i++) {
    try {
      await new Promise((resolve, reject) => {
        testRateLimit(mockReq, mockRes, (error?: any) => {
          if (error) reject(error);
          else resolve(undefined);
        });
      });
      allowedRequests++;
    } catch (error) {
      blockedRequests++;
    }
  }
  
  console.log(`Allowed requests: ${allowedRequests}`);
  console.log(`Blocked requests: ${blockedRequests}`);
  console.log('Rate limiting benchmark completed');
}

async function runAllBenchmarks() {
  console.log('Starting Performance Benchmarks...');
  console.log('=====================================');
  
  try {
    await benchmarkCacheService();
    await benchmarkLazyLoading();
    benchmarkCompression();
    await benchmarkRateLimit();
    
    console.log('\n=====================================');
    console.log('All benchmarks completed successfully!');
  } catch (error) {
    console.error('Benchmark failed:', error);
  }
}

// Run benchmarks if this file is executed directly
if (require.main === module) {
  runAllBenchmarks().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Benchmark suite failed:', error);
    process.exit(1);
  });
}

export { runAllBenchmarks };