/**
 * Basic Enhanced Context API Tests
 * 
 * Simple tests to validate API structure and basic functionality
 */

import request from 'supertest';
import app from '../index';
import { spreadsheetStorage } from '../routes/upload';
import { SpreadsheetData, DataType } from '../types/spreadsheet';

describe('Enhanced Context API Basic Tests', () => {
  let testSpreadsheetId: string;

  beforeAll(() => {
    testSpreadsheetId = 'sheet_basic_' + Date.now();

    // Create simple test data
    const testData: SpreadsheetData = {
      id: testSpreadsheetId,
      sheets: [{
        name: 'Sheet1',
        data: [
          [
            { value: 'Name', dataType: DataType.TEXT },
            { value: 'Value', dataType: DataType.TEXT }
          ],
          [
            { value: 'Item1', dataType: DataType.TEXT },
            { value: 100, dataType: DataType.NUMBER }
          ],
          [
            { value: 'Item2', dataType: DataType.TEXT },
            { value: 200, dataType: DataType.NUMBER }
          ]
        ],
        dimensions: { rows: 3, cols: 2 },
        formatting: [],
        namedRanges: []
      }],
      metadata: {
        filename: 'test.csv',
        fileSize: 1024,
        mimeType: 'text/csv',
        uploadedAt: new Date()
      },
      formulas: [],
      namedRanges: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    spreadsheetStorage.set(testSpreadsheetId, testData);
  });

  afterAll(() => {
    spreadsheetStorage.delete(testSpreadsheetId);
  });

  describe('Enhanced Context Analyze Endpoint', () => {
    it('should respond with correct API structure', async () => {
      const response = await request(app)
        .post('/api/v1/enhanced-context/analyze')
        .send({
          request: 'Analyze this data',
          spreadsheetId: testSpreadsheetId,
          currentSelection: {
            sheet: 'Sheet1',
            range: 'A1:B3',
            activeCell: 'A1'
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.intelligenceAnalysis).toBeDefined();
      expect(response.body.data.domainIntelligence).toBeDefined();
      expect(response.body.data.intentAnalysis).toBeDefined();
      expect(response.body.data.contextSynthesis).toBeDefined();
      expect(response.body.data.performance).toBeDefined();
      expect(response.body.requestId).toMatch(/^enh_ctx_/);
      expect(response.body.processingTime).toBeGreaterThan(0);
    });

    it('should handle missing spreadsheet', async () => {
      const response = await request(app)
        .post('/api/v1/enhanced-context/analyze')
        .send({
          request: 'Analyze this data',
          spreadsheetId: 'invalid_id',
          currentSelection: {
            sheet: 'Sheet1',
            range: 'A1:B3',
            activeCell: 'A1'
          }
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SPREADSHEET_NOT_FOUND');
    });
  });

  describe('Domain Analysis Endpoint', () => {
    it('should respond with domain analysis structure', async () => {
      const response = await request(app)
        .post('/api/v1/enhanced-context/domain-analysis')
        .send({
          spreadsheetId: testSpreadsheetId
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.domainClassification).toBeDefined();
      expect(response.body.data.domainAnalysis).toBeDefined();
      expect(response.body.requestId).toMatch(/^domain_/);
    });
  });

  describe('Auto-Select Endpoint', () => {
    it('should respond with auto-selection structure', async () => {
      const response = await request(app)
        .post('/api/v1/enhanced-context/auto-select')
        .send({
          query: 'Find all items',
          spreadsheetId: testSpreadsheetId,
          currentSelection: {
            sheet: 'Sheet1',
            range: 'A1:B3',
            activeCell: 'A1'
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.selections).toBeDefined();
      expect(response.body.data.recommendedSelection).toBeDefined();
      expect(response.body.requestId).toMatch(/^autosel_/);
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain existing context endpoint functionality', async () => {
      const response = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          request: 'Analyze this data',
          spreadsheetId: testSpreadsheetId,
          currentSelection: {
            sheet: 'Sheet1',
            range: 'A1:B3',
            activeCell: 'A1'
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.context).toBeDefined();
      expect(response.body.data.naturalLanguageDescription).toBeDefined();
    });
  });
});