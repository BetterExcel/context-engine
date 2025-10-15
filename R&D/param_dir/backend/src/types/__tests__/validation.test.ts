/**
 * Unit tests for data model validation schemas
 */

import { z } from 'zod';
import {
  CellSchema,
  FormulaSchema,
  SelectionInfoSchema,
  SpreadsheetDataSchema,
  AnalyzeContextRequestSchema,
  FeedbackRequestSchema,
  FileValidationSchema,
  ValidationError,
  validateCellAddress,
  validateRange,
  validateSheetName
} from '../validation';
import { DataType } from '../index';

describe('Data Model Validation', () => {
  describe('CellSchema', () => {
    it('should validate a valid cell', () => {
      const validCell = {
        value: 'Hello World',
        dataType: DataType.TEXT,
        address: 'A1'
      };

      expect(() => CellSchema.parse(validCell)).not.toThrow();
    });

    it('should validate a cell with formula', () => {
      const cellWithFormula = {
        value: 100,
        formula: '=SUM(A1:A10)',
        dataType: DataType.FORMULA,
        dependencies: ['A1', 'A2', 'A3'],
        address: 'B1'
      };

      expect(() => CellSchema.parse(cellWithFormula)).not.toThrow();
    });

    it('should validate cell formatting', () => {
      const formattedCell = {
        value: 42,
        dataType: DataType.NUMBER,
        formatting: {
          bold: true,
          fontSize: 12,
          fontColor: '#FF0000',
          backgroundColor: '#FFFFFF',
          alignment: 'center' as const
        },
        address: 'C1'
      };

      expect(() => CellSchema.parse(formattedCell)).not.toThrow();
    });

    it('should reject invalid cell address', () => {
      const invalidCell = {
        value: 'test',
        dataType: DataType.TEXT,
        address: 'invalid'
      };

      expect(() => CellSchema.parse(invalidCell)).toThrow();
    });

    it('should reject invalid color format', () => {
      const invalidCell = {
        value: 'test',
        dataType: DataType.TEXT,
        formatting: {
          fontColor: 'red' // should be hex format
        }
      };

      expect(() => CellSchema.parse(invalidCell)).toThrow();
    });
  });

  describe('FormulaSchema', () => {
    it('should validate a valid formula', () => {
      const validFormula = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        cellAddress: 'A1',
        formula: '=SUM(B1:B10)',
        dependencies: ['B1', 'B2', 'B3'],
        precedents: ['C1'],
        isValid: true
      };

      expect(() => FormulaSchema.parse(validFormula)).not.toThrow();
    });

    it('should reject invalid UUID', () => {
      const invalidFormula = {
        id: 'invalid-uuid',
        cellAddress: 'A1',
        formula: '=SUM(B1:B10)',
        dependencies: [],
        precedents: [],
        isValid: true
      };

      expect(() => FormulaSchema.parse(invalidFormula)).toThrow();
    });

    it('should reject empty formula', () => {
      const invalidFormula = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        cellAddress: 'A1',
        formula: '',
        dependencies: [],
        precedents: [],
        isValid: true
      };

      expect(() => FormulaSchema.parse(invalidFormula)).toThrow();
    });
  });

  describe('SelectionInfoSchema', () => {
    it('should validate valid selection info', () => {
      const validSelection = {
        sheet: 'Sheet1',
        range: 'A1:C10',
        activeCell: 'B5',
        visibleRange: 'A1:Z100'
      };

      expect(() => SelectionInfoSchema.parse(validSelection)).not.toThrow();
    });

    it('should reject invalid range format', () => {
      const invalidSelection = {
        sheet: 'Sheet1',
        range: 'A1-C10', // should use colon
        activeCell: 'B5'
      };

      expect(() => SelectionInfoSchema.parse(invalidSelection)).toThrow();
    });

    it('should reject invalid active cell format', () => {
      const invalidSelection = {
        sheet: 'Sheet1',
        range: 'A1:C10',
        activeCell: '5B' // should be B5
      };

      expect(() => SelectionInfoSchema.parse(invalidSelection)).toThrow();
    });
  });

  describe('AnalyzeContextRequestSchema', () => {
    const validRequest = {
      request: 'Help me create a sum formula',
      currentSelection: {
        sheet: 'Sheet1',
        range: 'A1:C10',
        activeCell: 'D1'
      },
      userContext: {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        recentActions: [],
        preferences: {
          preferredFormats: ['xlsx'],
          defaultScope: {
            type: 'current_selection' as const,
            includeRelated: true,
            includeHistory: false
          },
          aiAssistanceLevel: 'moderate' as const,
          privacySettings: {
            allowDataStorage: true,
            allowLearning: true,
            anonymizeData: false,
            retentionDays: 30
          }
        },
        interactionHistory: []
      }
    };

    it('should validate a complete valid request', () => {
      expect(() => AnalyzeContextRequestSchema.parse(validRequest)).not.toThrow();
    });

    it('should reject request that is too long', () => {
      const longRequest = {
        ...validRequest,
        request: 'a'.repeat(1001) // exceeds 1000 char limit
      };

      expect(() => AnalyzeContextRequestSchema.parse(longRequest)).toThrow();
    });

    it('should reject empty request', () => {
      const emptyRequest = {
        ...validRequest,
        request: ''
      };

      expect(() => AnalyzeContextRequestSchema.parse(emptyRequest)).toThrow();
    });

    it('should reject invalid session ID', () => {
      const invalidRequest = {
        ...validRequest,
        userContext: {
          ...validRequest.userContext,
          sessionId: 'invalid-uuid'
        }
      };

      expect(() => AnalyzeContextRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should reject too many recent actions', () => {
      const tooManyActions = Array(51).fill({
        type: 'cell_edit',
        timestamp: new Date(),
        cellAddress: 'A1'
      });

      const invalidRequest = {
        ...validRequest,
        userContext: {
          ...validRequest.userContext,
          recentActions: tooManyActions
        }
      };

      expect(() => AnalyzeContextRequestSchema.parse(invalidRequest)).toThrow();
    });
  });

  describe('FeedbackRequestSchema', () => {
    it('should validate valid feedback', () => {
      const validFeedback = {
        requestId: '123e4567-e89b-12d3-a456-426614174000',
        contextId: '123e4567-e89b-12d3-a456-426614174001',
        satisfaction: 4,
        feedback: 'The context was mostly accurate',
        corrections: [
          {
            field: 'intent',
            expectedValue: 'formula_assistance',
            actualValue: 'data_analysis',
            importance: 'high' as const
          }
        ]
      };

      expect(() => FeedbackRequestSchema.parse(validFeedback)).not.toThrow();
    });

    it('should reject invalid satisfaction score', () => {
      const invalidFeedback = {
        requestId: '123e4567-e89b-12d3-a456-426614174000',
        contextId: '123e4567-e89b-12d3-a456-426614174001',
        satisfaction: 6 // should be 1-5
      };

      expect(() => FeedbackRequestSchema.parse(invalidFeedback)).toThrow();
    });

    it('should reject feedback that is too long', () => {
      const invalidFeedback = {
        requestId: '123e4567-e89b-12d3-a456-426614174000',
        contextId: '123e4567-e89b-12d3-a456-426614174001',
        satisfaction: 3,
        feedback: 'a'.repeat(1001) // exceeds 1000 char limit
      };

      expect(() => FeedbackRequestSchema.parse(invalidFeedback)).toThrow();
    });
  });

  describe('FileValidationSchema', () => {
    it('should validate Excel file', () => {
      const excelFile = {
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: 1024 * 1024, // 1MB
        originalname: 'test.xlsx'
      };

      expect(() => FileValidationSchema.parse(excelFile)).not.toThrow();
    });

    it('should validate CSV file', () => {
      const csvFile = {
        mimetype: 'text/csv',
        size: 512 * 1024, // 512KB
        originalname: 'data.csv'
      };

      expect(() => FileValidationSchema.parse(csvFile)).not.toThrow();
    });

    it('should reject unsupported file type', () => {
      const invalidFile = {
        mimetype: 'application/pdf',
        size: 1024,
        originalname: 'document.pdf'
      };

      expect(() => FileValidationSchema.parse(invalidFile)).toThrow();
    });

    it('should reject file that is too large', () => {
      const largeFile = {
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: 60 * 1024 * 1024, // 60MB (exceeds 50MB limit)
        originalname: 'large.xlsx'
      };

      expect(() => FileValidationSchema.parse(largeFile)).toThrow();
    });

    it('should reject file with invalid extension', () => {
      const invalidFile = {
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: 1024,
        originalname: 'test.txt'
      };

      expect(() => FileValidationSchema.parse(invalidFile)).toThrow();
    });
  });

  describe('Utility validation functions', () => {
    describe('validateCellAddress', () => {
      it('should validate correct cell addresses', () => {
        expect(validateCellAddress('A1')).toBe(true);
        expect(validateCellAddress('Z99')).toBe(true);
        expect(validateCellAddress('AA100')).toBe(true);
        expect(validateCellAddress('XFD1048576')).toBe(true);
      });

      it('should reject invalid cell addresses', () => {
        expect(validateCellAddress('1A')).toBe(false);
        expect(validateCellAddress('A')).toBe(false);
        expect(validateCellAddress('1')).toBe(false);
        expect(validateCellAddress('A1B')).toBe(false);
        expect(validateCellAddress('')).toBe(false);
      });
    });

    describe('validateRange', () => {
      it('should validate correct ranges', () => {
        expect(validateRange('A1:B2')).toBe(true);
        expect(validateRange('A1:Z99')).toBe(true);
        expect(validateRange('AA1:ZZ100')).toBe(true);
      });

      it('should reject invalid ranges', () => {
        expect(validateRange('A1-B2')).toBe(false);
        expect(validateRange('A1:B')).toBe(false);
        expect(validateRange('A1')).toBe(false);
        expect(validateRange('A1:B2:C3')).toBe(false);
        expect(validateRange('')).toBe(false);
      });
    });

    describe('validateSheetName', () => {
      it('should validate correct sheet names', () => {
        expect(validateSheetName('Sheet1')).toBe(true);
        expect(validateSheetName('Data Analysis')).toBe(true);
        expect(validateSheetName('Q1-2024')).toBe(true);
      });

      it('should reject invalid sheet names', () => {
        expect(validateSheetName('')).toBe(false);
        expect(validateSheetName('a'.repeat(32))).toBe(false); // too long
        expect(validateSheetName('Sheet[1]')).toBe(false); // contains brackets
        expect(validateSheetName('Sheet/1')).toBe(false); // contains slash
        expect(validateSheetName('Sheet*1')).toBe(false); // contains asterisk
      });
    });
  });

  describe('ValidationError', () => {
    it('should format validation errors correctly', () => {
      try {
        CellSchema.parse({
          value: 'test',
          dataType: 'invalid_type',
          address: 'invalid_address'
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          const validationError = new ValidationError(error);
          const formattedErrors = validationError.getFormattedErrors();
          
          expect(formattedErrors).toHaveProperty('dataType');
          expect(formattedErrors).toHaveProperty('address');
          expect(validationError.name).toBe('ValidationError');
          expect(validationError.message).toBe('Validation failed');
        }
      }
    });
  });

  describe('Complex nested validation', () => {
    it('should validate complete spreadsheet data structure', () => {
      const validSpreadsheetData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        sheets: [
          {
            name: 'Sheet1',
            data: [
              [
                {
                  value: 'Header 1',
                  dataType: DataType.TEXT,
                  address: 'A1'
                },
                {
                  value: 'Header 2',
                  dataType: DataType.TEXT,
                  address: 'B1'
                }
              ],
              [
                {
                  value: 100,
                  dataType: DataType.NUMBER,
                  address: 'A2'
                },
                {
                  value: 200,
                  formula: '=A2*2',
                  dataType: DataType.FORMULA,
                  address: 'B2',
                  dependencies: ['A2']
                }
              ]
            ],
            dimensions: {
              rows: 2,
              cols: 2
            },
            formatting: [],
            namedRanges: []
          }
        ],
        metadata: {
          filename: 'test.xlsx',
          fileSize: 1024,
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          uploadedAt: new Date()
        },
        formulas: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            cellAddress: 'B2',
            formula: '=A2*2',
            dependencies: ['A2'],
            precedents: [],
            isValid: true
          }
        ],
        namedRanges: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(() => SpreadsheetDataSchema.parse(validSpreadsheetData)).not.toThrow();
    });
  });
});