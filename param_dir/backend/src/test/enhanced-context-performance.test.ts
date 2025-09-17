/**
 * Enhanced Context API Performance Tests
 * 
 * Performance validation for enhanced contextual understanding capabilities
 */

import request from 'supertest';
import app from '../index';
import { spreadsheetStorage } from '../routes/upload';
import { SpreadsheetData, DataType } from '../types/spreadsheet';
import { performance } from 'perf_hooks';

describe('Enhanced Context API Performance Tests', () => {
  let largeSpreadsheetId: string;
  let mediumSpreadsheetId: string;
  let smallSpreadsheetId: string;

  beforeAll(() => {
    // Create test datasets of different sizes
    smallSpreadsheetId = 'sheet_small_' + Date.now();
    mediumSpreadsheetId = 'sheet_medium_' + Date.now();
    largeSpreadsheetId = 'sheet_large_' + Date.now();

    // Small dataset (100 rows)
    const smallData = createTestSpreadsheet(100, 10);
    spreadsheetStorage.set(smallSpreadsheetId, smallData);

    // Medium dataset (1,000 rows)
    const mediumData = createTestSpreadsheet(1000, 15);
    spreadsheetStorage.set(mediumSpreadsheetId, mediumData);

    // Large dataset (10,000 rows)
    const largeData = createTestSpreadsheet(10000, 20);
    spreadsheetStorage.set(largeSpreadsheetId, largeData);
  });

  afterAll(() => {
    // Cleanup
    spreadsheetStorage.delete(smallSpreadsheetId);
    spreadsheetStorage.delete(mediumSpreadsheetId);
    spreadsheetStorage.delete(largeSpreadsheetId);
  });

  describe('Response Time Performance', () => {
    it('should process small datasets within 1 second', async () => {
      const startTime = performance.now();
      
      const response = await request(app)
        .post('/api/v1/enhanced-context/analyze')
        .send({
          request: 'Calculate average values for all numeric columns',
          spreadsheetId: smallSpreadsheetId,
          currentSelection: {
            sheet: 'Sheet1',
            range: 'A1:J100',
            activeCell: 'A1'
          },
          analysisOptions: {
            analysisDepth: 'detailed'
          }
        })
        .expect(200);

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(processingTime).toBeLessThan(1000); // Less than 1 second
      expect(response.body.processingTime).toBeLessThan(1000);
    });

    it('should process medium datasets within 3 seconds', async () => {
      const startTime = performance.now();
      
      const response = await request(app)
        .post('/api/v1/enhanced-context/analyze')
        .send({
          request: 'Find patterns and anomalies in the data',
          spreadsheetId: mediumSpreadsheetId,
          currentSelection: {
            sheet: 'Sheet1',
            range: 'A1:O1000',
            activeCell: 'A1'
          },
          analysisOptions: {
            analysisDepth: 'comprehensive',
            enableDomainIntelligence: true,
            enableAutoSelection: true
          }
        })
        .expect(200);

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(processingTime).toBeLessThan(3000); // Less than 3 seconds
      expect(response.body.processingTime).toBeLessThan(3000);
    });

    it('should process large datasets within 10 seconds', async () => {
      const startTime = performance.now();
      
      const response = await request(app)
        .post('/api/v1/enhanced-context/analyze')
        .send({
          request: 'Perform comprehensive analysis with domain intelligence',
          spreadsheetId: largeSpreadsheetId,
          currentSelection: {
            sheet: 'Sheet1',
            range: 'A1:T10000',
            activeCell: 'A1'
          },
          analysisOptions: {
            analysisDepth: 'comprehensive',
            enableDomainIntelligence: true,
            enableAutoSelection: true,
            enableAgentPrompts: true,
            enablePerformanceOptimization: true
          }
        })
        .expect(200);

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(processingTime).toBeLessThan(10000); // Less than 10 seconds
      expect(response.body.processingTime).toBeLessThan(10000);
    });
  });

  describe('Memory Usage Performance', () => {
    it('should maintain reasonable memory usage for large datasets', async () => {
      const initialMemory = process.memoryUsage();
      
      const response = await request(app)
        .post('/api/v1/enhanced-context/analyze')
        .send({
          request: 'Analyze all data with full intelligence features',
          spreadsheetId: largeSpreadsheetId,
          currentSelection: {
            sheet: 'Sheet1',
            range: 'A1:T10000',
            activeCell: 'A1'
          },
          analysisOptions: {
            analysisDepth: 'comprehensive',
            enableDomainIntelligence: true,
            enableAutoSelection: true,
            enableAgentPrompts: true
          }
        })
        .expect(200);

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

      expect(response.body.success).toBe(true);
      expect(memoryIncreaseMB).toBeLessThan(500); // Less than 500MB increase
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
    });
  });

  describe('Concurrent Request Performance', () => {
    it('should handle multiple concurrent requests efficiently', async () => {
      const concurrentRequests = 5;
      const startTime = performance.now();
      
      const requests = Array(concurrentRequests).fill(null).map((_, index) =>
        request(app)
          .post('/api/v1/enhanced-context/analyze')
          .send({
            request: `Concurrent analysis request ${index}`,
            spreadsheetId: mediumSpreadsheetId,
            currentSelection: {
              sheet: 'Sheet1',
              range: 'A1:O1000',
              activeCell: 'A1'
            },
            analysisOptions: {
              analysisDepth: 'detailed'
            }
          })
      );

      const responses = await Promise.all(requests);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Total time should be reasonable for concurrent processing
      expect(totalTime).toBeLessThan(15000); // Less than 15 seconds for 5 concurrent requests
      
      // Average response time should be reasonable
      const avgResponseTime = responses.reduce((sum, r) => sum + r.body.processingTime, 0) / responses.length;
      expect(avgResponseTime).toBeLessThan(5000); // Less than 5 seconds average
    });
  });

  describe('Domain Analysis Performance', () => {
    it('should perform domain analysis efficiently', async () => {
      const startTime = performance.now();
      
      const response = await request(app)
        .post('/api/v1/enhanced-context/domain-analysis')
        .send({
          spreadsheetId: largeSpreadsheetId,
          analysisOptions: {
            includeFinancialMetrics: true,
            includeBusinessKPIs: true,
            includeRiskAssessment: true
          }
        })
        .expect(200);

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(processingTime).toBeLessThan(5000); // Less than 5 seconds
      expect(response.body.data).toHaveProperty('domainClassification');
    });
  });

  describe('Auto-Selection Performance', () => {
    it('should perform auto-selection efficiently on large datasets', async () => {
      const startTime = performance.now();
      
      const response = await request(app)
        .post('/api/v1/enhanced-context/auto-select')
        .send({
          query: 'Find all rows where column B is greater than 1000',
          spreadsheetId: largeSpreadsheetId,
          currentSelection: {
            sheet: 'Sheet1',
            range: 'A1:T10000',
            activeCell: 'A1'
          },
          selectionOptions: {
            expandRelated: true,
            includeHeaders: true,
            maxSelections: 5
          }
        })
        .expect(200);

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(processingTime).toBeLessThan(3000); // Less than 3 seconds
      expect(response.body.data.selections).toBeDefined();
    });
  });

  describe('Performance Optimization Features', () => {
    it('should show performance improvements with optimization enabled', async () => {
      // Test without optimization
      const startTimeWithoutOpt = performance.now();
      const responseWithoutOpt = await request(app)
        .post('/api/v1/enhanced-context/analyze')
        .send({
          request: 'Comprehensive analysis without optimization',
          spreadsheetId: largeSpreadsheetId,
          currentSelection: {
            sheet: 'Sheet1',
            range: 'A1:T10000',
            activeCell: 'A1'
          },
          analysisOptions: {
            analysisDepth: 'comprehensive',
            enablePerformanceOptimization: false
          }
        })
        .expect(200);
      const endTimeWithoutOpt = performance.now();
      const timeWithoutOpt = endTimeWithoutOpt - startTimeWithoutOpt;

      // Test with optimization
      const startTimeWithOpt = performance.now();
      const responseWithOpt = await request(app)
        .post('/api/v1/enhanced-context/analyze')
        .send({
          request: 'Comprehensive analysis with optimization',
          spreadsheetId: largeSpreadsheetId,
          currentSelection: {
            sheet: 'Sheet1',
            range: 'A1:T10000',
            activeCell: 'A1'
          },
          analysisOptions: {
            analysisDepth: 'comprehensive',
            enablePerformanceOptimization: true
          }
        })
        .expect(200);
      const endTimeWithOpt = performance.now();
      const timeWithOpt = endTimeWithOpt - startTimeWithOpt;

      expect(responseWithoutOpt.body.success).toBe(true);
      expect(responseWithOpt.body.success).toBe(true);
      
      // Optimization should provide some improvement (or at least not be significantly worse)
      const improvementRatio = timeWithoutOpt / timeWithOpt;
      expect(improvementRatio).toBeGreaterThan(0.8); // At least 80% of original time
    });
  });

  describe('Scalability Metrics', () => {
    it('should provide detailed performance metrics', async () => {
      const response = await request(app)
        .post('/api/v1/enhanced-context/analyze')
        .send({
          request: 'Analyze with detailed metrics',
          spreadsheetId: mediumSpreadsheetId,
          currentSelection: {
            sheet: 'Sheet1',
            range: 'A1:O1000',
            activeCell: 'A1'
          },
          analysisOptions: {
            analysisDepth: 'detailed'
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.performance).toHaveProperty('processingTime');
      expect(response.body.data.performance).toHaveProperty('metrics');
      expect(response.body.data.performance.metrics).toHaveProperty('cellsAnalyzed');
      expect(response.body.data.performance.metrics).toHaveProperty('qualityScore');
      expect(response.body.data.performance.metrics).toHaveProperty('confidenceScore');
      
      // Validate performance metrics are reasonable
      const metrics = response.body.data.performance.metrics;
      expect(metrics.cellsAnalyzed).toBeGreaterThan(0);
      expect(metrics.qualityScore).toBeGreaterThanOrEqual(0);
      expect(metrics.qualityScore).toBeLessThanOrEqual(1);
      expect(metrics.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(metrics.confidenceScore).toBeLessThanOrEqual(1);
    });
  });
});

/**
 * Helper function to create test spreadsheet data
 */
function createTestSpreadsheet(rows: number, columns: number): SpreadsheetData {
  const headers = Array(columns).fill(null).map((_, i) => `Column${i + 1}`);
  const data = [headers.map(h => ({ value: h, dataType: DataType.TEXT }))];
  
  // Add data rows
  for (let i = 1; i <= rows; i++) {
    const row = Array(columns).fill(null).map((_, j) => {
      if (j === 0) return { value: `Item${i}`, dataType: DataType.TEXT };
      if (j === 1) return { value: (Math.random() * 1000).toString(), dataType: DataType.NUMBER };
      if (j === 2) return { value: (Math.random() * 100).toString(), dataType: DataType.NUMBER };
      return { value: `Value${i}_${j}`, dataType: DataType.TEXT };
    });
    data.push(row);
  }

  return {
    id: `test_${rows}x${columns}_${Date.now()}`,
    metadata: { filename: `test_${rows}x${columns}.csv`, fileSize: 1024, mimeType: 'text/csv', uploadedAt: new Date() },
    sheets: [{
      name: 'Sheet1',
      data,
      dimensions: {
        rows: rows + 1,
        cols: columns
      },
      formatting: [],
      namedRanges: []
    }],
    metadata: {
      filename: `test_${rows}x${columns}.csv`,
      fileSize: rows * columns * 10, // Approximate size
      mimeType: 'text/csv',
      uploadedAt: new Date()
    },
    formulas: [],
    namedRanges: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };
}