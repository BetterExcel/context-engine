import { SpreadsheetParser } from '../services/SpreadsheetParser';
import { DataBoundaryAnalyzer } from '../services/DataBoundaryAnalyzer';
import fs from 'fs';
import path from 'path';

describe('CSV Performance Testing', () => {
  // Using static methods, no need for instances

  describe('Large File Performance', () => {
    test('should parse large CSV file within reasonable time', async () => {
      const csvPath = path.join(__dirname, '../../../e2e/fixtures/files/large-performance-test.csv');
      
      // Skip if file doesn't exist (might not be generated in CI)
      if (!fs.existsSync(csvPath)) {
        console.log('Skipping large file test - file not found');
        return;
      }

      const buffer = fs.readFileSync(csvPath);
      const startTime = Date.now();
      
      const result = await SpreadsheetParser.parseFile(buffer, 'large-test.csv', 'text/csv');
      
      const parseTime = Date.now() - startTime;
      
      expect(result.sheets).toHaveLength(1);
      expect(result.sheets[0].data.length).toBeGreaterThan(1000);
      expect(parseTime).toBeLessThan(10000); // Should parse within 10 seconds
      
      console.log(`Large CSV parsing took ${parseTime}ms for ${result.sheets[0].data.length} rows`);
    }, 15000); // 15 second timeout

    test('should analyze boundaries for large file efficiently', async () => {
      const csvPath = path.join(__dirname, '../../../e2e/fixtures/files/large-performance-test.csv');
      
      if (!fs.existsSync(csvPath)) {
        console.log('Skipping large boundary analysis test - file not found');
        return;
      }

      const buffer = fs.readFileSync(csvPath);
      const result = await SpreadsheetParser.parseFile(buffer, 'large-boundary-test.csv', 'text/csv');
      
      const startTime = Date.now();
      const boundaries = DataBoundaryAnalyzer.analyzeDataBoundaries(result.sheets[0]);
      const analysisTime = Date.now() - startTime;
      
      expect(boundaries.minRow).toBe(0);
      expect(boundaries.maxRow).toBeGreaterThan(1000);
      expect(boundaries.hasHeaders).toBe(true);
      expect(analysisTime).toBeLessThan(5000); // Should analyze within 5 seconds
      
      console.log(`Boundary analysis took ${analysisTime}ms for ${boundaries.maxRow + 1} rows`);
    }, 10000);

    test('should calculate optimal range for large dataset', async () => {
      const csvPath = path.join(__dirname, '../../../e2e/fixtures/files/large-performance-test.csv');
      
      if (!fs.existsSync(csvPath)) {
        console.log('Skipping large range calculation test - file not found');
        return;
      }

      const buffer = fs.readFileSync(csvPath);
      const result = await SpreadsheetParser.parseFile(buffer, 'large-range-test.csv', 'text/csv');
      const boundaries = DataBoundaryAnalyzer.analyzeDataBoundaries(result.sheets[0]);
      
      const startTime = Date.now();
      const optimalRange = DataBoundaryAnalyzer.calculateOptimalRange(boundaries);
      const calculationTime = Date.now() - startTime;
      
      expect(optimalRange).toMatch(/^A1:[A-Z]+\d+$/);
      expect(calculationTime).toBeLessThan(1000); // Should calculate within 1 second
      
      console.log(`Range calculation took ${calculationTime}ms, result: ${optimalRange}`);
    });
  });

  describe('Memory Usage', () => {
    test('should not exceed memory limits for large files', async () => {
      const csvPath = path.join(__dirname, '../../../e2e/fixtures/files/large-performance-test.csv');
      
      if (!fs.existsSync(csvPath)) {
        console.log('Skipping memory usage test - file not found');
        return;
      }

      const initialMemory = process.memoryUsage().heapUsed;
      
      const buffer = fs.readFileSync(csvPath);
      const result = await SpreadsheetParser.parseFile(buffer, 'memory-test.csv', 'text/csv');
      
      const afterParseMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = afterParseMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 500MB for a 10k row file)
      expect(memoryIncrease).toBeLessThan(500 * 1024 * 1024);
      
      console.log(`Memory increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB for ${result.sheets[0].data.length} rows`);
    });
  });

  describe('Concurrent Processing', () => {
    test('should handle multiple CSV files concurrently', async () => {
      const csvPath = path.join(__dirname, '../../../e2e/fixtures/files/comma-delimited-utf8.csv');
      const buffer = fs.readFileSync(csvPath);
      
      const startTime = Date.now();
      
      // Process 5 files concurrently
      const promises = Array.from({ length: 5 }, (_, i) => 
        SpreadsheetParser.parseFile(buffer, `concurrent-test-${i}.csv`, 'text/csv')
      );
      
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.sheets).toHaveLength(1);
        expect(result.sheets[0].data.length).toBe(6);
      });
      
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      console.log(`Concurrent processing of 5 files took ${totalTime}ms`);
    });
  });
});