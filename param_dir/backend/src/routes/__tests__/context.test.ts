/**
 * Integration tests for context analysis API endpoint
 */

import request from 'supertest';
import app from '../../index';
import { SpreadsheetData, DataType } from '../../types/spreadsheet';
import { IntentType } from '../../types/context';
import { ErrorCode } from '../../types/api';
import { spreadsheetStorage } from '../upload';
// Test imports removed as they're not needed

describe('POST /api/v1/analyze-context', () => {
  // Clean up storage before each test
  beforeEach(() => {
    spreadsheetStorage.clear();
  });

  describe('Request Validation', () => {
    it('should return 400 when request text is missing', async () => {
      const response = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          currentSelection: {
            sheet: 'Sheet1',
            range: 'A1:C10',
            activeCell: 'A1'
          },
          userContext: {
            sessionId: 'test-session-123',
            recentActions: [],
            preferences: {},
            interactionHistory: []
          }
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(ErrorCode.MISSING_PARAMETERS);
      expect(response.body.error.message).toContain('Request text is required');
    });

    it('should return 400 when request text is empty', async () => {
      const response = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          request: '   ',
          currentSelection: {
            sheet: 'Sheet1',
            range: 'A1:C10',
            activeCell: 'A1'
          },
          userContext: {
            sessionId: 'test-session-123',
            recentActions: [],
            preferences: {},
            interactionHistory: []
          }
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(ErrorCode.MISSING_PARAMETERS);
    });

    it('should return 400 when currentSelection is missing', async () => {
      const response = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          request: 'Help me create a formula',
          userContext: {
            sessionId: 'test-session-123',
            recentActions: [],
            preferences: {},
            interactionHistory: []
          }
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(ErrorCode.MISSING_PARAMETERS);
      expect(response.body.error.message).toContain('Current selection information is required');
    });

    it('should return 400 when currentSelection fields are invalid', async () => {
      const response = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          request: 'Help me create a formula',
          currentSelection: {
            sheet: '',
            range: 'A1:C10',
            activeCell: 'A1'
          },
          userContext: {
            sessionId: 'test-session-123',
            recentActions: [],
            preferences: {},
            interactionHistory: []
          }
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(ErrorCode.INVALID_REQUEST);
    });

    it('should return 400 when userContext is missing', async () => {
      const response = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          request: 'Help me create a formula',
          currentSelection: {
            sheet: 'Sheet1',
            range: 'A1:C10',
            activeCell: 'A1'
          }
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(ErrorCode.MISSING_PARAMETERS);
      expect(response.body.error.message).toContain('User context is required');
    });

    it('should return 400 when sessionId is missing', async () => {
      const response = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          request: 'Help me create a formula',
          currentSelection: {
            sheet: 'Sheet1',
            range: 'A1:C10',
            activeCell: 'A1'
          },
          userContext: {
            recentActions: [],
            preferences: {},
            interactionHistory: []
          }
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(ErrorCode.INVALID_REQUEST);
      expect(response.body.error.message).toContain('Session ID is required');
    });

    it('should return 400 when neither file nor spreadsheetId is provided', async () => {
      const response = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          request: 'Help me create a formula',
          currentSelection: {
            sheet: 'Sheet1',
            range: 'A1:C10',
            activeCell: 'A1'
          },
          userContext: {
            sessionId: 'test-session-123',
            recentActions: [],
            preferences: {},
            interactionHistory: []
          }
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(ErrorCode.MISSING_PARAMETERS);
      expect(response.body.error.message).toContain('Either a file or spreadsheetId must be provided');
    });
  });

  describe('Spreadsheet Data Handling', () => {
    it('should return 404 when spreadsheetId does not exist', async () => {
      const response = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          request: 'Help me create a formula',
          spreadsheetId: 'non-existent-id',
          currentSelection: {
            sheet: 'Sheet1',
            range: 'A1:C10',
            activeCell: 'A1'
          },
          userContext: {
            sessionId: 'test-session-123',
            recentActions: [],
            preferences: {},
            interactionHistory: []
          }
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(ErrorCode.SPREADSHEET_NOT_FOUND);
    });

    it('should successfully analyze context with existing spreadsheetId', async () => {
      // First, create mock spreadsheet data
      const mockSpreadsheetData: SpreadsheetData = {
        id: 'test-spreadsheet-123',
        sheets: [{
          name: 'Sheet1',
          data: [
            [
              { value: 'Name', dataType: DataType.TEXT, address: 'A1' },
              { value: 'Age', dataType: DataType.TEXT, address: 'B1' },
              { value: 'Salary', dataType: DataType.TEXT, address: 'C1' }
            ],
            [
              { value: 'John', dataType: DataType.TEXT, address: 'A2' },
              { value: 25, dataType: DataType.NUMBER, address: 'B2' },
              { value: 50000, dataType: DataType.NUMBER, address: 'C2' }
            ],
            [
              { value: 'Jane', dataType: DataType.TEXT, address: 'A3' },
              { value: 30, dataType: DataType.NUMBER, address: 'B3' },
              { value: 60000, dataType: DataType.NUMBER, address: 'C3' }
            ]
          ],
          dimensions: { rows: 3, cols: 3 },
          formatting: [],
          namedRanges: []
        }],
        formulas: [],
        namedRanges: [],
        metadata: {
          filename: 'test.xlsx',
          fileSize: 1024,
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          uploadedAt: new Date(),
          lastModified: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store the mock data
      spreadsheetStorage.set(mockSpreadsheetData.id, mockSpreadsheetData);

      const response = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          request: 'Calculate the average salary',
          spreadsheetId: mockSpreadsheetData.id,
          currentSelection: {
            sheet: 'Sheet1',
            range: 'C2:C3',
            activeCell: 'C2'
          },
          userContext: {
            sessionId: 'test-session-123',
            recentActions: [],
            preferences: {},
            interactionHistory: []
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.requestAnalysis).toBeDefined();
      expect(response.body.data.context).toBeDefined();
      expect(response.body.data.naturalLanguageDescription).toBeDefined();
      expect(response.body.data.actionableInfo).toBeDefined();
      expect(response.body.data.suggestions).toBeDefined();
      expect(response.body.requestId).toBeDefined();
      expect(response.body.processingTime).toBeGreaterThan(0);
    });
  });

  describe('Intent Classification', () => {
    let mockSpreadsheetData: SpreadsheetData;

    beforeEach(() => {
      mockSpreadsheetData = {
        id: 'test-spreadsheet-123',
        sheets: [{
          name: 'Sheet1',
          data: [
            [
              { value: 'Product', dataType: DataType.TEXT, address: 'A1' },
              { value: 'Sales', dataType: DataType.TEXT, address: 'B1' },
              { value: 'Profit', dataType: DataType.TEXT, address: 'C1' }
            ],
            [
              { value: 'Widget A', dataType: DataType.TEXT, address: 'A2' },
              { value: 1000, dataType: DataType.NUMBER, address: 'B2' },
              { value: 200, dataType: DataType.NUMBER, address: 'C2' }
            ],
            [
              { value: 'Widget B', dataType: DataType.TEXT, address: 'A3' },
              { value: 1500, dataType: DataType.NUMBER, address: 'B3' },
              { value: 300, dataType: DataType.NUMBER, address: 'C3' }
            ]
          ],
          dimensions: { rows: 3, cols: 3 },
          formatting: [],
          namedRanges: []
        }],
        formulas: [],
        namedRanges: [],
        metadata: {
          filename: 'test.xlsx',
          fileSize: 1024,
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          uploadedAt: new Date(),
          lastModified: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      spreadsheetStorage.set(mockSpreadsheetData.id, mockSpreadsheetData);
    });

    it('should classify formula assistance requests correctly', async () => {
      const response = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          request: 'Create a SUM formula to calculate total sales',
          spreadsheetId: mockSpreadsheetData.id,
          currentSelection: {
            sheet: 'Sheet1',
            range: 'B2:B3',
            activeCell: 'B4'
          },
          userContext: {
            sessionId: 'test-session-123',
            recentActions: [],
            preferences: {},
            interactionHistory: []
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.requestAnalysis.intent).toBe(IntentType.FORMULA_ASSISTANCE);
      expect(response.body.data.requestAnalysis.confidence).toBeGreaterThan(0.5);
      expect(response.body.data.actionableInfo.suggestedOperations).toContain('SUM');
    });

    it('should classify data analysis requests correctly', async () => {
      const response = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          request: 'Analyze the sales trends and patterns in this data',
          spreadsheetId: mockSpreadsheetData.id,
          currentSelection: {
            sheet: 'Sheet1',
            range: 'A1:C3',
            activeCell: 'A1'
          },
          userContext: {
            sessionId: 'test-session-123',
            recentActions: [],
            preferences: {},
            interactionHistory: []
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.requestAnalysis.intent).toBe(IntentType.DATA_ANALYSIS);
      expect(response.body.data.actionableInfo.suggestedOperations).toContain('ANALYZE');
    });

    it('should classify formatting requests correctly', async () => {
      const response = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          request: 'Format these cells with bold headers and currency formatting',
          spreadsheetId: mockSpreadsheetData.id,
          currentSelection: {
            sheet: 'Sheet1',
            range: 'A1:C3',
            activeCell: 'A1'
          },
          userContext: {
            sessionId: 'test-session-123',
            recentActions: [],
            preferences: {},
            interactionHistory: []
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.requestAnalysis.intent).toBe(IntentType.FORMATTING);
      expect(response.body.data.actionableInfo.suggestedOperations).toContain('FORMAT');
    });

    it('should classify data manipulation requests correctly', async () => {
      const response = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          request: 'Sort this data by sales amount in descending order',
          spreadsheetId: mockSpreadsheetData.id,
          currentSelection: {
            sheet: 'Sheet1',
            range: 'A1:C3',
            activeCell: 'A1'
          },
          userContext: {
            sessionId: 'test-session-123',
            recentActions: [],
            preferences: {},
            interactionHistory: []
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.requestAnalysis.intent).toBe(IntentType.DATA_MANIPULATION);
      expect(response.body.data.actionableInfo.suggestedOperations).toContain('SORT');
      expect(response.body.data.actionableInfo.riskLevel).toBe('medium');
    });

    it('should classify troubleshooting requests correctly', async () => {
      const response = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          request: 'Fix this #DIV/0! error in my formula',
          spreadsheetId: mockSpreadsheetData.id,
          currentSelection: {
            sheet: 'Sheet1',
            range: 'C2',
            activeCell: 'C2'
          },
          userContext: {
            sessionId: 'test-session-123',
            recentActions: [],
            preferences: {},
            interactionHistory: []
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.requestAnalysis.intent).toBe(IntentType.TROUBLESHOOTING);
      expect(response.body.data.actionableInfo.suggestedOperations).toContain('DEBUG');
    });
  });

  describe('Context Extraction', () => {
    let mockSpreadsheetData: SpreadsheetData;

    beforeEach(() => {
      mockSpreadsheetData = {
        id: 'test-spreadsheet-123',
        sheets: [{
          name: 'Sheet1',
          data: [
            [
              { value: 'Date', dataType: DataType.TEXT, address: 'A1' },
              { value: 'Revenue', dataType: DataType.TEXT, address: 'B1' },
              { value: 'Expenses', dataType: DataType.TEXT, address: 'C1' },
              { value: 'Profit', dataType: DataType.TEXT, address: 'D1' }
            ],
            [
              { value: '2024-01-01', dataType: DataType.DATE, address: 'A2' },
              { value: 10000, dataType: DataType.NUMBER, address: 'B2' },
              { value: 7000, dataType: DataType.NUMBER, address: 'C2' },
              { value: '=B2-C2', dataType: DataType.FORMULA, address: 'D2', formula: '=B2-C2' }
            ],
            [
              { value: '2024-01-02', dataType: DataType.DATE, address: 'A3' },
              { value: 12000, dataType: DataType.NUMBER, address: 'B3' },
              { value: 8000, dataType: DataType.NUMBER, address: 'C3' },
              { value: '=B3-C3', dataType: DataType.FORMULA, address: 'D3', formula: '=B3-C3' }
            ]
          ],
          dimensions: { rows: 3, cols: 4 },
          formatting: [],
          namedRanges: []
        }],
        formulas: [
          { 
            id: 'formula-1',
            cellAddress: 'Sheet1!D2', 
            formula: '=B2-C2', 
            dependencies: ['B2', 'C2'],
            precedents: ['B2', 'C2'],
            isValid: true
          },
          { 
            id: 'formula-2',
            cellAddress: 'Sheet1!D3', 
            formula: '=B3-C3', 
            dependencies: ['B3', 'C3'],
            precedents: ['B3', 'C3'],
            isValid: true
          }
        ],
        namedRanges: [],
        metadata: {
          filename: 'test.xlsx',
          fileSize: 1024,
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          uploadedAt: new Date(),
          lastModified: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      spreadsheetStorage.set(mockSpreadsheetData.id, mockSpreadsheetData);
    });

    it('should extract immediate context correctly', async () => {
      const response = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          request: 'Help me understand this data',
          spreadsheetId: mockSpreadsheetData.id,
          currentSelection: {
            sheet: 'Sheet1',
            range: 'B2:C3',
            activeCell: 'B2'
          },
          userContext: {
            sessionId: 'test-session-123',
            recentActions: [],
            preferences: {},
            interactionHistory: []
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      const context = response.body.data.context;
      expect(context.immediate).toBeDefined();
      expect(context.immediate.selectedData).toBeDefined();
      expect(context.immediate.activeCell).toBeDefined();
      expect(context.immediate.activeCell.address).toBe('B2');
      expect(context.immediate.selectedData.length).toBe(2); // 2 rows
      expect(context.immediate.selectedData[0].length).toBe(2); // 2 columns
    });

    it('should extract structural context correctly', async () => {
      const response = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          request: 'Analyze this financial data',
          spreadsheetId: mockSpreadsheetData.id,
          currentSelection: {
            sheet: 'Sheet1',
            range: 'A1:D3',
            activeCell: 'A1'
          },
          userContext: {
            sessionId: 'test-session-123',
            recentActions: [],
            preferences: {},
            interactionHistory: []
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      const context = response.body.data.context;
      expect(context.structural).toBeDefined();
      expect(context.structural.headers).toEqual(['Date', 'Revenue', 'Expenses', 'Profit']);
      expect(context.structural.hasFormulas).toBe(true);
      expect(context.structural.rowCount).toBe(3);
      expect(context.structural.columnCount).toBe(4);
      expect(context.structural.dataTypes).toContain(DataType.NUMBER);
      expect(context.structural.dataTypes).toContain(DataType.FORMULA);
    });

    it('should generate data summary correctly', async () => {
      const response = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          request: 'Summarize this data',
          spreadsheetId: mockSpreadsheetData.id,
          currentSelection: {
            sheet: 'Sheet1',
            range: 'A1:D3',
            activeCell: 'A1'
          },
          userContext: {
            sessionId: 'test-session-123',
            recentActions: [],
            preferences: {},
            interactionHistory: []
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      const summary = response.body.data.context.summary;
      expect(summary).toBeDefined();
      expect(summary.rowCount).toBe(3);
      expect(summary.columnCount).toBe(4);
      expect(summary.cellCount).toBe(12);
      expect(summary.formulaCount).toBe(2);
      expect(summary.dataTypes).toBeDefined();
      expect(summary.patterns).toBeDefined();
    });
  });

  describe('Natural Language Description', () => {
    let mockSpreadsheetData: SpreadsheetData;

    beforeEach(() => {
      mockSpreadsheetData = {
        id: 'test-spreadsheet-123',
        sheets: [{
          name: 'Sheet1',
          data: [
            [
              { value: 'Product', dataType: DataType.TEXT, address: 'A1' },
              { value: 'Price', dataType: DataType.TEXT, address: 'B1' }
            ],
            [
              { value: 'Widget', dataType: DataType.TEXT, address: 'A2' },
              { value: 29.99, dataType: DataType.NUMBER, address: 'B2' }
            ]
          ],
          dimensions: { rows: 2, cols: 2 },
          formatting: [],
          namedRanges: []
        }],
        formulas: [],
        namedRanges: [],
        metadata: {
          filename: 'test.xlsx',
          fileSize: 1024,
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          uploadedAt: new Date(),
          lastModified: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      spreadsheetStorage.set(mockSpreadsheetData.id, mockSpreadsheetData);
    });

    it('should generate meaningful natural language description', async () => {
      const response = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          request: 'Create a formula to calculate tax',
          spreadsheetId: mockSpreadsheetData.id,
          currentSelection: {
            sheet: 'Sheet1',
            range: 'B2',
            activeCell: 'B2'
          },
          userContext: {
            sessionId: 'test-session-123',
            recentActions: [],
            preferences: {},
            interactionHistory: []
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      const description = response.body.data.naturalLanguageDescription;
      expect(description).toBeDefined();
      expect(typeof description).toBe('string');
      expect(description.length).toBeGreaterThan(0);
      expect(description).toContain('formula');
      expect(description).toContain('Sheet1');
      expect(description).toContain('B2');
    });
  });

  describe('Actionable Information', () => {
    let mockSpreadsheetData: SpreadsheetData;

    beforeEach(() => {
      mockSpreadsheetData = {
        id: 'test-spreadsheet-123',
        sheets: [{
          name: 'Sheet1',
          data: [
            [
              { value: 'Amount', dataType: DataType.TEXT, address: 'A1' },
              { value: 'Tax Rate', dataType: DataType.TEXT, address: 'B1' }
            ],
            [
              { value: 100, dataType: DataType.NUMBER, address: 'A2' },
              { value: 0.08, dataType: DataType.NUMBER, address: 'B2' }
            ]
          ],
          dimensions: { rows: 2, cols: 2 },
          formatting: [],
          namedRanges: []
        }],
        formulas: [],
        namedRanges: [],
        metadata: {
          filename: 'test.xlsx',
          fileSize: 1024,
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          uploadedAt: new Date(),
          lastModified: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      spreadsheetStorage.set(mockSpreadsheetData.id, mockSpreadsheetData);
    });

    it('should generate appropriate actionable information for formula requests', async () => {
      const response = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          request: 'Calculate tax amount using the rate',
          spreadsheetId: mockSpreadsheetData.id,
          currentSelection: {
            sheet: 'Sheet1',
            range: 'A2:B2',
            activeCell: 'C2'
          },
          userContext: {
            sessionId: 'test-session-123',
            recentActions: [],
            preferences: {},
            interactionHistory: []
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      const actionableInfo = response.body.data.actionableInfo;
      expect(actionableInfo).toBeDefined();
      expect(actionableInfo.targetCells).toContain('C2');
      expect(actionableInfo.suggestedOperations).toBeDefined();
      expect(actionableInfo.constraints).toBeDefined();
      expect(actionableInfo.expectedOutcome).toBeDefined();
      expect(actionableInfo.riskLevel).toBeDefined();
    });

    it('should set appropriate risk level for data manipulation', async () => {
      const response = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          request: 'Delete all rows with zero values',
          spreadsheetId: mockSpreadsheetData.id,
          currentSelection: {
            sheet: 'Sheet1',
            range: 'A1:B2',
            activeCell: 'A1'
          },
          userContext: {
            sessionId: 'test-session-123',
            recentActions: [],
            preferences: {},
            interactionHistory: []
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.actionableInfo.riskLevel).toBe('medium');
    });
  });

  describe('Response Format', () => {
    let mockSpreadsheetData: SpreadsheetData;

    beforeEach(() => {
      mockSpreadsheetData = {
        id: 'test-spreadsheet-123',
        sheets: [{
          name: 'Sheet1',
          data: [
            [{ value: 'Test', dataType: DataType.TEXT, address: 'A1' }]
          ],
          dimensions: { rows: 1, cols: 1 },
          formatting: [],
          namedRanges: []
        }],
        formulas: [],
        namedRanges: [],
        metadata: {
          filename: 'test.xlsx',
          fileSize: 1024,
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          uploadedAt: new Date(),
          lastModified: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      spreadsheetStorage.set(mockSpreadsheetData.id, mockSpreadsheetData);
    });

    it('should return properly structured response', async () => {
      const response = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          request: 'Help me with this cell',
          spreadsheetId: mockSpreadsheetData.id,
          currentSelection: {
            sheet: 'Sheet1',
            range: 'A1',
            activeCell: 'A1'
          },
          userContext: {
            sessionId: 'test-session-123',
            recentActions: [],
            preferences: {},
            interactionHistory: []
          }
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('requestId');
      expect(response.body).toHaveProperty('processingTime');
      
      const data = response.body.data;
      expect(data).toHaveProperty('requestAnalysis');
      expect(data).toHaveProperty('context');
      expect(data).toHaveProperty('naturalLanguageDescription');
      expect(data).toHaveProperty('actionableInfo');
      expect(data).toHaveProperty('suggestions');
      expect(data).toHaveProperty('confidence');

      // Validate request analysis structure
      expect(data.requestAnalysis).toHaveProperty('intent');
      expect(data.requestAnalysis).toHaveProperty('scope');
      expect(data.requestAnalysis).toHaveProperty('confidence');
      expect(data.requestAnalysis).toHaveProperty('keywords');

      // Validate context structure
      expect(data.context).toHaveProperty('immediate');
      expect(data.context).toHaveProperty('related');
      expect(data.context).toHaveProperty('structural');
      expect(data.context).toHaveProperty('historical');
      expect(data.context).toHaveProperty('patterns');
      expect(data.context).toHaveProperty('summary');
      expect(data.context).toHaveProperty('confidence');

      // Validate actionable info structure
      expect(data.actionableInfo).toHaveProperty('targetCells');
      expect(data.actionableInfo).toHaveProperty('suggestedOperations');
      expect(data.actionableInfo).toHaveProperty('constraints');
      expect(data.actionableInfo).toHaveProperty('riskLevel');
    });

    it('should include processing time and request ID', async () => {
      const response = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          request: 'Test request',
          spreadsheetId: mockSpreadsheetData.id,
          currentSelection: {
            sheet: 'Sheet1',
            range: 'A1',
            activeCell: 'A1'
          },
          userContext: {
            sessionId: 'test-session-123',
            recentActions: [],
            preferences: {},
            interactionHistory: []
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(response.body.processingTime).toBeGreaterThanOrEqual(0);
      expect(typeof response.body.processingTime).toBe('number');
    });
  });

  describe('Error Handling', () => {
    it('should handle context extraction errors gracefully', async () => {
      const mockSpreadsheetData: SpreadsheetData = {
        id: 'test-spreadsheet-123',
        sheets: [{
          name: 'Sheet1',
          data: [],
          dimensions: { rows: 0, cols: 0 },
          formatting: [],
          namedRanges: []
        }],
        formulas: [],
        namedRanges: [],
        metadata: {
          filename: 'test.xlsx',
          fileSize: 1024,
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          uploadedAt: new Date(),
          lastModified: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      spreadsheetStorage.set(mockSpreadsheetData.id, mockSpreadsheetData);

      const response = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          request: 'Analyze this data',
          spreadsheetId: mockSpreadsheetData.id,
          currentSelection: {
            sheet: 'NonExistentSheet',
            range: 'A1:C10',
            activeCell: 'A1'
          },
          userContext: {
            sessionId: 'test-session-123',
            recentActions: [],
            preferences: {},
            interactionHistory: []
          }
        });

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(ErrorCode.CONTEXT_EXTRACTION_FAILED);
    });

    it('should handle unexpected errors gracefully', async () => {
      // This test simulates an unexpected error by providing malformed data
      const response = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          request: 'Test request',
          spreadsheetId: 'test-id',
          currentSelection: {
            sheet: 'Sheet1',
            range: 'INVALID_RANGE_FORMAT',
            activeCell: 'A1'
          },
          userContext: {
            sessionId: 'test-session-123',
            recentActions: [],
            preferences: {},
            interactionHistory: []
          }
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.requestId).toBeDefined();
      expect(response.body.processingTime).toBeGreaterThanOrEqual(0);
    });
  });
});