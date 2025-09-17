#!/usr/bin/env node

/**
 * Performance benchmark script for testing boundary analysis and CSV parsing optimizations
 * 
 * Usage: npm run benchmark
 * or: node dist/test/performance-benchmark.js
 */

import { DataBoundaryAnalyzer } from '../services/DataBoundaryAnalyzer';
import { SpreadsheetParser } from '../services/SpreadsheetParser';
import { PerformanceMonitor } from '../services/PerformanceMonitor';
import { Sheet, Cell, DataType } from '../types/spreadsheet';

interface BenchmarkResult {
  testName: string;
  iterations: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  throughput?: number; // operations per second
  memoryUsage?: number; // MB
}

class PerformanceBenchmark {
  private results: BenchmarkResult[] = [];

  /**
   * Create a test sheet with specified characteristics
   */
  private createTestSheet(
    rows: number,
    cols: number,
    dataPattern: 'dense' | 'sparse' | 'edge' | 'random' = 'dense'
  ): Sheet {
    const data: Cell[][] = [];
    
    for (let row = 0; row < rows; row++) {
      data[row] = [];
      for (let col = 0; col < cols; col++) {
        let hasData = false;
        
        switch (dataPattern) {
          case 'dense':
            hasData = Math.random() > 0.05; // 95% filled
            break;
          case 'sparse':
            hasData = Math.random() > 0.95; // 5% filled
            break;
          case 'edge':
            hasData = row < 10 || row >= rows - 10 || col < 10 || col >= cols - 10;
            break;
          case 'random':
            hasData = Math.random() > 0.5; // 50% filled
            break;
        }
        
        if (data[row]) {
          data[row]![col] = {
          value: hasData ? `R${row}C${col}` : null,
          dataType: hasData ? DataType.TEXT : DataType.EMPTY,
          address: `${String.fromCharCode(65 + (col % 26))}${row + 1}`
          };
        }
      }
    }
    
    return {
      name: `TestSheet_${rows}x${cols}_${dataPattern}`,
      data,
      dimensions: { rows, cols },
      formatting: [],
      namedRanges: []
    };
  }

  /**
   * Generate CSV content for testing
   */
  private generateCSVContent(
    rows: number,
    cols: number,
    delimiter: string = ',',
    complexity: 'simple' | 'complex' = 'simple'
  ): string {
    const lines: string[] = [];
    
    // Add header row
    const headers = Array.from({ length: cols }, (_, i) => `Column_${i + 1}`);
    lines.push(headers.join(delimiter));
    
    // Add data rows
    for (let row = 0; row < rows; row++) {
      const rowData: string[] = [];
      
      for (let col = 0; col < cols; col++) {
        let value: string;
        
        if (complexity === 'simple') {
          value = `R${row}C${col}`;
        } else {
          // Mix of data types for complex testing
          if (col % 4 === 0) {
            value = (Math.random() * 1000).toFixed(2);
          } else if (col % 4 === 1) {
            value = new Date(2020, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
              .toISOString().split('T')[0]!;
          } else if (col % 4 === 2) {
            value = Math.random() > 0.5 ? 'true' : 'false';
          } else {
            value = `Text_${row}_${col}_${Math.random().toString(36).substring(7)}`;
          }
        }
        
        rowData.push(value);
      }
      
      lines.push(rowData.join(delimiter));
    }
    
    return lines.join('\n');
  }

  /**
   * Run a benchmark test
   */
  private async runBenchmark<T>(
    testName: string,
    testFn: () => Promise<T> | T,
    iterations: number = 5
  ): Promise<BenchmarkResult> {
    const times: number[] = [];
    const initialMemory = process.memoryUsage().heapUsed;
    
    console.log(`Running ${testName} (${iterations} iterations)...`);
    
    for (let i = 0; i < iterations; i++) {
      // Clear caches to ensure fair testing
      DataBoundaryAnalyzer.clearCache();
      
      const startTime = performance.now();
      await testFn();
      const endTime = performance.now();
      
      times.push(endTime - startTime);
      
      // Force garbage collection between iterations if available
      if (global.gc && i < iterations - 1) {
        global.gc();
      }
    }
    
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryUsage = (finalMemory - initialMemory) / (1024 * 1024); // Convert to MB
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const result: BenchmarkResult = {
      testName,
      iterations,
      avgTime,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      throughput: 1000 / avgTime, // operations per second
      memoryUsage
    };
    
    this.results.push(result);
    console.log(`  Average: ${avgTime.toFixed(2)}ms, Min: ${result.minTime.toFixed(2)}ms, Max: ${result.maxTime.toFixed(2)}ms`);
    
    return result;
  }

  /**
   * Boundary analysis benchmarks
   */
  async runBoundaryAnalysisBenchmarks(): Promise<void> {
    console.log('\n=== Boundary Analysis Benchmarks ===');
    
    // Small dense sheet
    await this.runBenchmark(
      'Small Dense Sheet (100x20)',
      () => {
        const sheet = this.createTestSheet(100, 20, 'dense');
        return DataBoundaryAnalyzer.analyzeDataBoundaries(sheet);
      }
    );
    
    // Small sparse sheet
    await this.runBenchmark(
      'Small Sparse Sheet (100x20)',
      () => {
        const sheet = this.createTestSheet(100, 20, 'sparse');
        return DataBoundaryAnalyzer.analyzeDataBoundaries(sheet);
      }
    );
    
    // Medium sheet
    await this.runBenchmark(
      'Medium Sheet (1000x50)',
      () => {
        const sheet = this.createTestSheet(1000, 50, 'random');
        return DataBoundaryAnalyzer.analyzeDataBoundaries(sheet);
      }
    );
    
    // Large sheet (should trigger progressive analysis)
    await this.runBenchmark(
      'Large Sheet (5000x100)',
      () => {
        const sheet = this.createTestSheet(5000, 100, 'sparse');
        return DataBoundaryAnalyzer.analyzeDataBoundaries(sheet);
      },
      3 // Fewer iterations for large tests
    );
    
    // Edge pattern (should benefit from early termination)
    await this.runBenchmark(
      'Edge Pattern Sheet (2000x80)',
      () => {
        const sheet = this.createTestSheet(2000, 80, 'edge');
        return DataBoundaryAnalyzer.analyzeDataBoundaries(sheet);
      },
      3
    );
    
    // Cache performance test
    const cachedSheet = this.createTestSheet(1000, 50, 'dense');
    await this.runBenchmark(
      'Cached Analysis (1000x50)',
      () => {
        // First call will populate cache, subsequent calls should be much faster
        return DataBoundaryAnalyzer.analyzeDataBoundaries(cachedSheet);
      }
    );
  }

  /**
   * CSV parsing benchmarks
   */
  async runCSVParsingBenchmarks(): Promise<void> {
    console.log('\n=== CSV Parsing Benchmarks ===');
    
    // Small CSV
    await this.runBenchmark(
      'Small CSV (100x10)',
      async () => {
        const csvContent = this.generateCSVContent(100, 10, ',', 'simple');
        const buffer = Buffer.from(csvContent, 'utf8');
        return SpreadsheetParser.parseFile(buffer, 'small.csv', 'text/csv');
      }
    );
    
    // Medium CSV with complex data
    await this.runBenchmark(
      'Medium Complex CSV (1000x20)',
      async () => {
        const csvContent = this.generateCSVContent(1000, 20, ',', 'complex');
        const buffer = Buffer.from(csvContent, 'utf8');
        return SpreadsheetParser.parseFile(buffer, 'medium.csv', 'text/csv');
      }
    );
    
    // Large CSV
    await this.runBenchmark(
      'Large CSV (5000x15)',
      async () => {
        const csvContent = this.generateCSVContent(5000, 15, ',', 'simple');
        const buffer = Buffer.from(csvContent, 'utf8');
        return SpreadsheetParser.parseFile(buffer, 'large.csv', 'text/csv');
      },
      3
    );
    
    // Different delimiters
    const delimiters = [';', '\t', '|'];
    for (const delimiter of delimiters) {
      await this.runBenchmark(
        `CSV with ${delimiter === '\t' ? 'tab' : delimiter} delimiter (500x12)`,
        async () => {
          const csvContent = this.generateCSVContent(500, 12, delimiter, 'simple');
          const buffer = Buffer.from(csvContent, 'utf8');
          return SpreadsheetParser.parseFile(buffer, `test_${delimiter}.csv`, 'text/csv');
        }
      );
    }
  }

  /**
   * Range validation benchmarks
   */
  async runRangeValidationBenchmarks(): Promise<void> {
    console.log('\n=== Range Validation Benchmarks ===');
    
    const testRanges = [
      'A1:Z100',
      'A1:ZZ1000',
      'A1:AAA10000',
      'A1:Z100000'
    ];
    
    for (const range of testRanges) {
      await this.runBenchmark(
        `Range Validation (${range})`,
        () => DataBoundaryAnalyzer.validateRangeSize(range),
        10 // More iterations for quick operations
      );
    }
  }

  /**
   * Memory usage benchmarks
   */
  async runMemoryBenchmarks(): Promise<void> {
    console.log('\n=== Memory Usage Benchmarks ===');
    
    const initialMemory = process.memoryUsage().heapUsed / (1024 * 1024);
    console.log(`Initial memory usage: ${initialMemory.toFixed(2)} MB`);
    
    // Test memory usage with repeated operations
    for (let i = 0; i < 50; i++) {
      const sheet = this.createTestSheet(500, 25, 'random');
      DataBoundaryAnalyzer.analyzeDataBoundaries(sheet);
      
      const csvContent = this.generateCSVContent(200, 15, ',', 'complex');
      const buffer = Buffer.from(csvContent, 'utf8');
      await SpreadsheetParser.parseFile(buffer, `test_${i}.csv`, 'text/csv');
    }
    
    const peakMemory = process.memoryUsage().heapUsed / (1024 * 1024);
    console.log(`Peak memory usage: ${peakMemory.toFixed(2)} MB`);
    
    // Force garbage collection
    if (global.gc) {
      global.gc();
    }
    
    const finalMemory = process.memoryUsage().heapUsed / (1024 * 1024);
    console.log(`Final memory usage: ${finalMemory.toFixed(2)} MB`);
    console.log(`Memory increase: ${(finalMemory - initialMemory).toFixed(2)} MB`);
  }

  /**
   * Print benchmark results
   */
  printResults(): void {
    console.log('\n=== Benchmark Results Summary ===');
    console.log('Test Name'.padEnd(40) + 'Avg Time'.padEnd(12) + 'Min Time'.padEnd(12) + 'Max Time'.padEnd(12) + 'Throughput'.padEnd(15) + 'Memory');
    console.log('-'.repeat(100));
    
    for (const result of this.results) {
      const avgTime = `${result.avgTime.toFixed(2)}ms`;
      const minTime = `${result.minTime.toFixed(2)}ms`;
      const maxTime = `${result.maxTime.toFixed(2)}ms`;
      const throughput = `${result.throughput?.toFixed(2) || 'N/A'} ops/s`;
      const memory = `${result.memoryUsage?.toFixed(2) || 'N/A'} MB`;
      
      console.log(
        result.testName.padEnd(40) +
        avgTime.padEnd(12) +
        minTime.padEnd(12) +
        maxTime.padEnd(12) +
        throughput.padEnd(15) +
        memory
      );
    }
    
    // Performance monitor summary
    console.log('\n=== Performance Monitor Summary ===');
    const systemSummary = PerformanceMonitor.getSystemSummary();
    console.log(`Total operations: ${systemSummary.totalOperations}`);
    console.log(`Average response time: ${systemSummary.averageResponseTime.toFixed(2)}ms`);
    
    if (systemSummary.slowestOperations.length > 0) {
      console.log('\nSlowest operations:');
      systemSummary.slowestOperations.forEach(op => {
        console.log(`  ${op.operation}: ${op.averageTime.toFixed(2)}ms`);
      });
    }
  }

  /**
   * Run all benchmarks
   */
  async runAll(): Promise<void> {
    console.log('Starting Performance Benchmarks...');
    console.log(`Node.js version: ${process.version}`);
    console.log(`Platform: ${process.platform} ${process.arch}`);
    
    const startTime = Date.now();
    
    await this.runBoundaryAnalysisBenchmarks();
    await this.runCSVParsingBenchmarks();
    await this.runRangeValidationBenchmarks();
    await this.runMemoryBenchmarks();
    
    const totalTime = Date.now() - startTime;
    console.log(`\nTotal benchmark time: ${(totalTime / 1000).toFixed(2)} seconds`);
    
    this.printResults();
  }
}

// Run benchmarks if this file is executed directly
if (require.main === module) {
  const benchmark = new PerformanceBenchmark();
  benchmark.runAll().catch(console.error);
}

export { PerformanceBenchmark };