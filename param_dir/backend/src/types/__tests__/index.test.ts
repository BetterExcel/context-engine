/**
 * Integration tests for type exports
 */

import * as Types from '../index';

describe('Type Exports', () => {
  it('should export all spreadsheet types', () => {
    expect(Types.DataType).toBeDefined();
    expect(Types.DataType.TEXT).toBe('text');
    expect(Types.DataType.NUMBER).toBe('number');
    expect(Types.DataType.FORMULA).toBe('formula');
  });

  it('should export all context types', () => {
    expect(Types.IntentType).toBeDefined();
    expect(Types.IntentType.FORMULA_ASSISTANCE).toBe('formula_assistance');
    expect(Types.IntentType.DATA_ANALYSIS).toBe('data_analysis');
  });

  it('should export all API types', () => {
    expect(Types.ErrorCode).toBeDefined();
    expect(Types.ErrorCode.INVALID_FILE_FORMAT).toBe('INVALID_FILE_FORMAT');
    expect(Types.ErrorCode.PARSING_ERROR).toBe('PARSING_ERROR');
  });

  it('should export validation schemas', () => {
    expect(Types.CellSchema).toBeDefined();
    expect(Types.FormulaSchema).toBeDefined();
    expect(Types.SpreadsheetDataSchema).toBeDefined();
    expect(Types.AnalyzeContextRequestSchema).toBeDefined();
  });

  it('should export validation utilities', () => {
    expect(Types.validateCellAddress).toBeDefined();
    expect(Types.validateRange).toBeDefined();
    expect(Types.validateSheetName).toBeDefined();
    expect(Types.ValidationError).toBeDefined();
  });

  it('should validate cell address using exported function', () => {
    expect(Types.validateCellAddress('A1')).toBe(true);
    expect(Types.validateCellAddress('invalid')).toBe(false);
  });

  it('should validate range using exported function', () => {
    expect(Types.validateRange('A1:B2')).toBe(true);
    expect(Types.validateRange('invalid')).toBe(false);
  });

  it('should validate sheet name using exported function', () => {
    expect(Types.validateSheetName('Sheet1')).toBe(true);
    expect(Types.validateSheetName('')).toBe(false);
  });

  it('should create ValidationError instance', () => {
    const zodError = {
      issues: [
        {
          path: ['field'],
          message: 'Invalid value',
          code: 'invalid_type' as const
        }
      ]
    } as any;

    const validationError = new Types.ValidationError(zodError);
    expect(validationError).toBeInstanceOf(Error);
    expect(validationError.name).toBe('ValidationError');
    expect(validationError.message).toBe('Validation failed');
  });

  it('should validate a cell using exported schema', () => {
    const validCell = {
      value: 'Test',
      dataType: Types.DataType.TEXT,
      address: 'A1'
    };

    expect(() => Types.CellSchema.parse(validCell)).not.toThrow();
  });

  it('should validate a formula using exported schema', () => {
    const validFormula = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      cellAddress: 'A1',
      formula: '=SUM(B1:B10)',
      dependencies: ['B1', 'B2'],
      precedents: [],
      isValid: true
    };

    expect(() => Types.FormulaSchema.parse(validFormula)).not.toThrow();
  });
});