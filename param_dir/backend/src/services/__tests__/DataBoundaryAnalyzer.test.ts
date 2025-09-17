/**
 * DataBoundaryAnalyzer Tests
 * 
 * Tests for data boundary detection, header analysis, and intelligent
 * range selection functionality.
 */

import { DataBoundaryAnalyzer, DataBoundaries } from '../DataBoundaryAnalyzer';
import { Sheet, Cell, DataType } from '../../types/spreadsheet';

describe('DataBoundaryAnalyzer', () => {
  
  // Helper function to create a cell
  const createCell = (value: any, dataType: DataType = DataType.TEXT): Cell => ({
    value,
    dataType,
    address: 'A1' // Will be overridden in tests
  });

  // Helper function to create an empty cell
  const createEmptyCell = (): Cell => ({
    value: null,
    dataType: DataType.EMPTY,
    address: 'A1'
  });

  describe('analyzeDataBoundaries', () => {
    it('should handle empty sheet', () => {
      const sheet: Sheet = {
        name: 'Test',
        data: [],
        dimensions: { rows: 0, cols: 0 },
        formatting: [],
        namedRanges: []
      };

      const boundaries = DataBoundaryAnalyzer.analyzeDataBoundaries(sheet);

      expect(boundaries).toEqual({
        minRow: 0,
        maxRow: -1,
        minCol: 0,
        maxCol: -1,
        totalCells: 0,
        emptyCells: 0,
        hasHeaders: false
      });
    });

    it('should find boundaries for simple data', () => {
      const sheet: Sheet = {
        name: 'Test',
        data: [
          [createCell('Name'), createCell('Age'), createEmptyCell()],
          [createCell('John'), createCell(25, DataType.NUMBER), createEmptyCell()],
          [createCell('Jane'), createCell(30, DataType.NUMBER), createEmptyCell()]
        ],
        dimensions: { rows: 3, cols: 3 },
        formatting: [],
        namedRanges: []
      };

      const boundaries = DataBoundaryAnalyzer.analyzeDataBoundaries(sheet);

      expect(boundaries.minRow).toBe(0);
      expect(boundaries.maxRow).toBe(2);
      expect(boundaries.minCol).toBe(0);
      expect(boundaries.maxCol).toBe(1);
      expect(boundaries.totalCells).toBe(9);
      expect(boundaries.emptyCells).toBe(3);
      expect(boundaries.hasHeaders).toBe(true);
    });

    it('should handle sparse data with gaps', () => {
      const sheet: Sheet = {
        name: 'Test',
        data: [
          [createEmptyCell(), createEmptyCell(), createCell('Header')],
          [createEmptyCell(), createEmptyCell(), createEmptyCell()],
          [createCell('Data'), createEmptyCell(), createCell('More Data')]
        ],
        dimensions: { rows: 3, cols: 3 },
        formatting: [],
        namedRanges: []
      };

      const boundaries = DataBoundaryAnalyzer.analyzeDataBoundaries(sheet);

      expect(boundaries.minRow).toBe(0);
      expect(boundaries.maxRow).toBe(2);
      expect(boundaries.minCol).toBe(0);
      expect(boundaries.maxCol).toBe(2);
      expect(boundaries.totalCells).toBe(9);
      expect(boundaries.emptyCells).toBe(6);
    });

    it('should handle sheet with only empty cells', () => {
      const sheet: Sheet = {
        name: 'Test',
        data: [
          [createEmptyCell(), createEmptyCell()],
          [createEmptyCell(), createEmptyCell()]
        ],
        dimensions: { rows: 2, cols: 2 },
        formatting: [],
        namedRanges: []
      };

      const boundaries = DataBoundaryAnalyzer.analyzeDataBoundaries(sheet);

      expect(boundaries.minRow).toBe(0);
      expect(boundaries.maxRow).toBe(-1);
      expect(boundaries.minCol).toBe(0);
      expect(boundaries.maxCol).toBe(-1);
      expect(boundaries.totalCells).toBe(4);
      expect(boundaries.emptyCells).toBe(4);
    });
  });

  describe('detectHeaders', () => {
    it('should detect headers when first row is text and second row is numbers', () => {
      const sheet: Sheet = {
        name: 'Test',
        data: [
          [createCell('Name'), createCell('Age'), createCell('Score')],
          [createCell('John'), createCell(25, DataType.NUMBER), createCell(95, DataType.NUMBER)],
          [createCell('Jane'), createCell(30, DataType.NUMBER), createCell(87, DataType.NUMBER)]
        ],
        dimensions: { rows: 3, cols: 3 },
        formatting: [],
        namedRanges: []
      };

      const headerInfo = DataBoundaryAnalyzer.detectHeaders(sheet);

      expect(headerInfo.hasHeaders).toBe(true);
      expect(headerInfo.headerRow).toBe(0);
      expect(headerInfo.confidence).toBeGreaterThan(0.7);
      expect(headerInfo.reasoning).toContain('First row is 100% text');
    });

    it('should not detect headers when first row contains numbers', () => {
      const sheet: Sheet = {
        name: 'Test',
        data: [
          [createCell(1, DataType.NUMBER), createCell(2, DataType.NUMBER), createCell(3, DataType.NUMBER)],
          [createCell(4, DataType.NUMBER), createCell(5, DataType.NUMBER), createCell(6, DataType.NUMBER)]
        ],
        dimensions: { rows: 2, cols: 3 },
        formatting: [],
        namedRanges: []
      };

      const headerInfo = DataBoundaryAnalyzer.detectHeaders(sheet);

      expect(headerInfo.hasHeaders).toBe(false);
      expect(headerInfo.confidence).toBeLessThan(0.7);
    });

    it('should handle insufficient data', () => {
      const sheet: Sheet = {
        name: 'Test',
        data: [
          [createCell('Only Row')]
        ],
        dimensions: { rows: 1, cols: 1 },
        formatting: [],
        namedRanges: []
      };

      const headerInfo = DataBoundaryAnalyzer.detectHeaders(sheet);

      expect(headerInfo.hasHeaders).toBe(false);
      expect(headerInfo.reasoning).toContain('Insufficient data to determine headers');
    });

    it('should detect headers with mixed data types but header-like patterns', () => {
      const sheet: Sheet = {
        name: 'Test',
        data: [
          [createCell('EMPLOYEE_ID'), createCell('FULL_NAME'), createCell('DEPARTMENT')],
          [createCell(1001, DataType.NUMBER), createCell('John Doe'), createCell('Engineering')],
          [createCell(1002, DataType.NUMBER), createCell('Jane Smith'), createCell('Marketing')]
        ],
        dimensions: { rows: 3, cols: 3 },
        formatting: [],
        namedRanges: []
      };

      const headerInfo = DataBoundaryAnalyzer.detectHeaders(sheet);

      expect(headerInfo.hasHeaders).toBe(true);
      expect(headerInfo.reasoning.some(r => r.includes('header patterns'))).toBe(true);
    });
  });

  describe('calculateOptimalRange', () => {
    it('should return fallback range for empty boundaries', () => {
      const boundaries: DataBoundaries = {
        minRow: 0,
        maxRow: -1,
        minCol: 0,
        maxCol: -1,
        totalCells: 0,
        emptyCells: 0,
        hasHeaders: false
      };

      const range = DataBoundaryAnalyzer.calculateOptimalRange(boundaries);
      expect(range).toBe('A1:J20');
    });

    it('should calculate correct range for normal data', () => {
      const boundaries: DataBoundaries = {
        minRow: 0,
        maxRow: 4,
        minCol: 1,
        maxCol: 3,
        totalCells: 15,
        emptyCells: 5,
        hasHeaders: true
      };

      const range = DataBoundaryAnalyzer.calculateOptimalRange(boundaries);
      expect(range).toBe('B1:D5');
    });

    it('should limit range when it exceeds maximum cells', () => {
      const boundaries: DataBoundaries = {
        minRow: 0,
        maxRow: 50000, // This would create > 100k cells
        minCol: 0,
        maxCol: 5,
        totalCells: 300000,
        emptyCells: 0,
        hasHeaders: false
      };

      const range = DataBoundaryAnalyzer.calculateOptimalRange(boundaries);
      
      // Should be limited to fit within 100k cells
      const expectedMaxRows = Math.floor(100000 / 6); // 6 columns
      const expectedRange = `A1:F${expectedMaxRows}`;
      expect(range).toBe(expectedRange);
    });

    it('should handle single cell data', () => {
      const boundaries: DataBoundaries = {
        minRow: 2,
        maxRow: 2,
        minCol: 3,
        maxCol: 3,
        totalCells: 1,
        emptyCells: 0,
        hasHeaders: false
      };

      const range = DataBoundaryAnalyzer.calculateOptimalRange(boundaries);
      expect(range).toBe('D3:D3');
    });
  });

  describe('validateRangeSize', () => {
    it('should validate normal range', () => {
      const validation = DataBoundaryAnalyzer.validateRangeSize('A1:C10');
      
      expect(validation.isValid).toBe(true);
      expect(validation.cellCount).toBe(30);
      expect(validation.warnings).toHaveLength(0);
    });

    it('should reject range exceeding maximum cells', () => {
      const validation = DataBoundaryAnalyzer.validateRangeSize('A1:Z5000'); // > 100k cells
      
      expect(validation.isValid).toBe(false);
      expect(validation.cellCount).toBeGreaterThan(100000);
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.suggestedRange).toBeDefined();
    });

    it('should warn about large ranges', () => {
      const validation = DataBoundaryAnalyzer.validateRangeSize('A1:Z2000'); // > 50k cells
      
      expect(validation.isValid).toBe(true);
      expect(validation.warnings.some(w => w.includes('performance'))).toBe(true);
    });

    it('should handle invalid range format', () => {
      const validation = DataBoundaryAnalyzer.validateRangeSize('invalid-range');
      
      expect(validation.isValid).toBe(false);
      expect(validation.cellCount).toBe(0);
      expect(validation.warnings.some(w => w.includes('Invalid range format'))).toBe(true);
    });

    it('should validate single cell range', () => {
      const validation = DataBoundaryAnalyzer.validateRangeSize('B5:B5');
      
      expect(validation.isValid).toBe(true);
      expect(validation.cellCount).toBe(1);
      expect(validation.warnings).toHaveLength(0);
    });
  });

  describe('analyzeSelection', () => {
    it('should provide complete analysis for normal sheet', () => {
      const sheet: Sheet = {
        name: 'Test',
        data: [
          [createCell('Product'), createCell('Price'), createCell('Quantity')],
          [createCell('Widget A'), createCell(10.99, DataType.NUMBER), createCell(100, DataType.NUMBER)],
          [createCell('Widget B'), createCell(15.50, DataType.NUMBER), createCell(75, DataType.NUMBER)],
          [createCell('Widget C'), createCell(8.25, DataType.NUMBER), createCell(200, DataType.NUMBER)]
        ],
        dimensions: { rows: 4, cols: 3 },
        formatting: [],
        namedRanges: []
      };

      const analysis = DataBoundaryAnalyzer.analyzeSelection(sheet);

      expect(analysis.recommendedRange).toBe('A1:C4');
      expect(analysis.confidence).toBeGreaterThan(0.8);
      expect(analysis.reasoning.length).toBeGreaterThan(0);
      expect(analysis.boundaries.hasHeaders).toBe(true);
      expect(analysis.warnings).toHaveLength(0);
    });

    it('should provide alternatives for data with headers', () => {
      const sheet: Sheet = {
        name: 'Test',
        data: [
          [createCell('Header1'), createCell('Header2')],
          [createCell('Data1'), createCell('Data2')],
          [createCell('Data3'), createCell('Data4')]
        ],
        dimensions: { rows: 3, cols: 2 },
        formatting: [],
        namedRanges: []
      };

      const analysis = DataBoundaryAnalyzer.analyzeSelection(sheet);

      expect(analysis.alternatives.length).toBeGreaterThan(0);
      expect(analysis.alternatives.some(alt => alt.includes('excluding headers'))).toBe(true);
    });

    it('should handle empty sheet gracefully', () => {
      const sheet: Sheet = {
        name: 'Test',
        data: [],
        dimensions: { rows: 0, cols: 0 },
        formatting: [],
        namedRanges: []
      };

      const analysis = DataBoundaryAnalyzer.analyzeSelection(sheet);

      expect(analysis.recommendedRange).toBe('A1:J20');
      expect(analysis.reasoning).toContain('No data found in sheet');
      expect(analysis.confidence).toBeLessThan(0.9);
    });

    it('should suggest alternatives for large datasets', () => {
      // Create a large dataset
      const data: Cell[][] = [];
      for (let i = 0; i < 2000; i++) {
        data.push([
          createCell(`Row${i}`),
          createCell(i, DataType.NUMBER),
          createCell(`Data${i}`)
        ]);
      }

      const sheet: Sheet = {
        name: 'Test',
        data,
        dimensions: { rows: 2000, cols: 3 },
        formatting: [],
        namedRanges: []
      };

      const analysis = DataBoundaryAnalyzer.analyzeSelection(sheet);

      expect(analysis.alternatives.some(alt => alt.includes('first 1000 rows'))).toBe(true);
    });
  });

  describe('helper methods', () => {
    describe('numberToColumnLetter', () => {
      it('should convert numbers to column letters correctly', () => {
        // Access private method through any cast for testing
        const analyzer = DataBoundaryAnalyzer as any;
        
        expect(analyzer.numberToColumnLetter(0)).toBe('A');
        expect(analyzer.numberToColumnLetter(1)).toBe('B');
        expect(analyzer.numberToColumnLetter(25)).toBe('Z');
        expect(analyzer.numberToColumnLetter(26)).toBe('AA');
        expect(analyzer.numberToColumnLetter(27)).toBe('AB');
        expect(analyzer.numberToColumnLetter(701)).toBe('ZZ');
      });
    });

    describe('parseRange', () => {
      it('should parse valid ranges correctly', () => {
        const analyzer = DataBoundaryAnalyzer as any;
        
        const result = analyzer.parseRange('A1:C5');
        expect(result).toEqual({
          startRow: 0,
          startCol: 0,
          endRow: 4,
          endCol: 2
        });
      });

      it('should handle single cell ranges', () => {
        const analyzer = DataBoundaryAnalyzer as any;
        
        const result = analyzer.parseRange('B3:B3');
        expect(result).toEqual({
          startRow: 2,
          startCol: 1,
          endRow: 2,
          endCol: 1
        });
      });

      it('should throw error for invalid range format', () => {
        const analyzer = DataBoundaryAnalyzer as any;
        
        expect(() => analyzer.parseRange('invalid')).toThrow('Invalid range format');
      });
    });

    describe('parseCellAddress', () => {
      it('should parse cell addresses correctly', () => {
        const analyzer = DataBoundaryAnalyzer as any;
        
        expect(analyzer.parseCellAddress('A1')).toEqual({ row: 0, col: 0 });
        expect(analyzer.parseCellAddress('B5')).toEqual({ row: 4, col: 1 });
        expect(analyzer.parseCellAddress('Z10')).toEqual({ row: 9, col: 25 });
        expect(analyzer.parseCellAddress('AA1')).toEqual({ row: 0, col: 26 });
      });

      it('should throw error for invalid cell address', () => {
        const analyzer = DataBoundaryAnalyzer as any;
        
        expect(() => analyzer.parseCellAddress('invalid')).toThrow('Invalid cell address');
        expect(() => analyzer.parseCellAddress('A')).toThrow('Invalid cell address');
        expect(() => analyzer.parseCellAddress('1')).toThrow('Invalid cell address');
      });
    });
  });

  describe('edge cases', () => {
    it('should handle sheet with null data arrays', () => {
      const sheet: Sheet = {
        name: 'Test',
        data: [null as any, undefined as any, []],
        dimensions: { rows: 3, cols: 0 },
        formatting: [],
        namedRanges: []
      };

      const boundaries = DataBoundaryAnalyzer.analyzeDataBoundaries(sheet);
      expect(boundaries.totalCells).toBe(0);
      expect(boundaries.emptyCells).toBe(0);
    });

    it('should handle cells with various empty values', () => {
      const sheet: Sheet = {
        name: 'Test',
        data: [
          [
            createCell(''),
            createCell('   '),
            createCell(null),
            { value: undefined, dataType: DataType.EMPTY, address: 'D1' },
            createCell('actual data')
          ]
        ],
        dimensions: { rows: 1, cols: 5 },
        formatting: [],
        namedRanges: []
      };

      const boundaries = DataBoundaryAnalyzer.analyzeDataBoundaries(sheet);
      expect(boundaries.minCol).toBe(4); // Only the last cell has data
      expect(boundaries.maxCol).toBe(4);
    });

    it('should handle very large column numbers', () => {
      const boundaries: DataBoundaries = {
        minRow: 0,
        maxRow: 0,
        minCol: 702, // Should be AAA
        maxCol: 702,
        totalCells: 1,
        emptyCells: 0,
        hasHeaders: false
      };

      const range = DataBoundaryAnalyzer.calculateOptimalRange(boundaries);
      expect(range).toBe('AAA1:AAA1');
    });
  });
});