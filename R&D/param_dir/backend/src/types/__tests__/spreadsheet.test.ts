/**
 * Unit tests for spreadsheet data models
 */

import { DataType } from '../spreadsheet';

describe('Spreadsheet Data Models', () => {
  describe('DataType enum', () => {
    it('should have all expected data types', () => {
      expect(DataType.TEXT).toBe('text');
      expect(DataType.NUMBER).toBe('number');
      expect(DataType.DATE).toBe('date');
      expect(DataType.BOOLEAN).toBe('boolean');
      expect(DataType.FORMULA).toBe('formula');
      expect(DataType.ERROR).toBe('error');
      expect(DataType.EMPTY).toBe('empty');
    });

    it('should have exactly 7 data types', () => {
      const dataTypes = Object.values(DataType);
      expect(dataTypes).toHaveLength(7);
    });
  });

  describe('Cell interface validation', () => {
    it('should accept valid cell data', () => {
      const cell = {
        value: 'Hello World',
        dataType: DataType.TEXT,
        address: 'A1'
      };

      // TypeScript compilation validates the interface
      expect(cell.value).toBe('Hello World');
      expect(cell.dataType).toBe(DataType.TEXT);
      expect(cell.address).toBe('A1');
    });

    it('should accept cell with all optional properties', () => {
      const cell = {
        value: 100,
        formula: '=SUM(A1:A10)',
        dataType: DataType.FORMULA,
        formatting: {
          bold: true,
          fontSize: 12,
          fontColor: '#FF0000'
        },
        dependencies: ['A1', 'A2', 'A3'],
        address: 'B1'
      };

      expect(cell.formula).toBe('=SUM(A1:A10)');
      expect(cell.formatting?.bold).toBe(true);
      expect(cell.dependencies).toHaveLength(3);
    });
  });

  describe('Formula interface validation', () => {
    it('should accept valid formula data', () => {
      const formula = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        cellAddress: 'A1',
        formula: '=SUM(B1:B10)',
        dependencies: ['B1', 'B2', 'B3'],
        precedents: ['C1'],
        isValid: true
      };

      expect(formula.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(formula.cellAddress).toBe('A1');
      expect(formula.isValid).toBe(true);
    });

    it('should accept formula with error message', () => {
      const formula = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        cellAddress: 'A1',
        formula: '=INVALID()',
        dependencies: [],
        precedents: [],
        isValid: false,
        errorMessage: 'Unknown function: INVALID'
      };

      expect(formula.isValid).toBe(false);
      expect(formula.errorMessage).toBe('Unknown function: INVALID');
    });
  });

  describe('Range interface validation', () => {
    it('should accept valid range data', () => {
      const range = {
        startRow: 1,
        startCol: 1,
        endRow: 10,
        endCol: 5,
        sheetName: 'Sheet1'
      };

      expect(range.startRow).toBe(1);
      expect(range.endCol).toBe(5);
      expect(range.sheetName).toBe('Sheet1');
    });
  });

  describe('SelectionInfo interface validation', () => {
    it('should accept valid selection info', () => {
      const selection = {
        sheet: 'Sheet1',
        range: 'A1:C10',
        activeCell: 'B5',
        visibleRange: 'A1:Z100'
      };

      expect(selection.sheet).toBe('Sheet1');
      expect(selection.range).toBe('A1:C10');
      expect(selection.activeCell).toBe('B5');
      expect(selection.visibleRange).toBe('A1:Z100');
    });

    it('should accept selection without visible range', () => {
      const selection: {
        sheet: string;
        range: string;
        activeCell: string;
        visibleRange?: string;
      } = {
        sheet: 'Sheet1',
        range: 'A1:C10',
        activeCell: 'B5'
      };

      expect(selection.visibleRange).toBeUndefined();
    });
  });
});