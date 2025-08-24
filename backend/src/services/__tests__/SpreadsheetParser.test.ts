import * as XLSX from 'xlsx';
import { SpreadsheetParser, SpreadsheetParseError } from '../SpreadsheetParser';
import { DataType } from '../../types/spreadsheet';

describe('SpreadsheetParser', () => {
  describe('parseFile', () => {
    it('should parse a simple Excel file with basic data types', async () => {
      // Create a simple workbook with test data
      const testData = [
        ['Name', 'Age', 'Date', 'Active'],
        ['John Doe', 30, new Date('2023-01-01'), true],
        ['Jane Smith', 25, new Date('2023-02-01'), false],
        ['Bob Johnson', 35, new Date('2023-03-01'), true]
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(testData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      const result = await SpreadsheetParser.parseFile(
        buffer, 
        'test.xlsx', 
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

      expect(result.sheets).toHaveLength(1);
      
      const sheet = result.sheets[0];
      if (!sheet) {
        throw new Error('Sheet should be defined');
      }
      
      expect(sheet.name).toBe('Sheet1');
      expect(sheet.dimensions.rows).toBe(4);
      expect(sheet.dimensions.cols).toBe(4);
      
      // Check header row
      const headerCell = sheet.data[0]?.[0];
      expect(headerCell).toBeDefined();
      expect(headerCell?.value).toBe('Name');
      expect(headerCell?.dataType).toBe(DataType.TEXT);
      
      // Check data types
      const ageCell = sheet.data[1]?.[1];
      const activeCell = sheet.data[1]?.[3];
      expect(ageCell?.dataType).toBe(DataType.NUMBER); // Age
      expect(activeCell?.dataType).toBe(DataType.BOOLEAN); // Active
      
      // Check metadata
      expect(result.metadata.filename).toBe('test.xlsx');
      expect(result.metadata.mimeType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(result.id).toMatch(/^sheet_\d+_[a-z0-9]+$/);
    });

    it('should parse CSV files correctly', async () => {
      const csvData = `Name,Age,Salary
John Doe,30,50000
Jane Smith,25,45000
Bob Johnson,35,60000`;

      const result = await SpreadsheetParser.parseFile(
        csvData,
        'test.csv',
        'text/csv'
      );

      expect(result.sheets).toHaveLength(1);
      
      const sheet = result.sheets[0];
      if (!sheet) {
        throw new Error('Sheet should be defined');
      }
      
      expect(sheet.dimensions.rows).toBe(4);
      expect(sheet.dimensions.cols).toBe(3);
      
      // Check CSV parsing
      expect(sheet.data[0]?.[0]?.value).toBe('Name');
      expect(sheet.data[1]?.[0]?.value).toBe('John Doe');
      expect(sheet.data[1]?.[1]?.value).toBe(30);
      expect(sheet.data[1]?.[1]?.dataType).toBe(DataType.NUMBER);
    });

    it('should handle formulas correctly', async () => {
      const worksheet = XLSX.utils.aoa_to_sheet([
        ['A', 'B', 'Sum'],
        [10, 20, { f: 'A2+B2' }],
        [15, 25, { f: 'A3+B3' }]
      ]);
      
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      const result = await SpreadsheetParser.parseFile(
        buffer,
        'formulas.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        { includeFormulas: true }
      );

      const sheet = result.sheets[0];
      if (!sheet) {
        throw new Error('Sheet should be defined');
      }
      
      // Check formula cells
      const formulaCell = sheet.data[1]?.[2];
      expect(formulaCell?.dataType).toBe(DataType.FORMULA);
      expect(formulaCell?.formula).toBe('A2+B2');
      
      // Check extracted formulas
      expect(result.formulas).toHaveLength(2);
      expect(result.formulas[0]?.formula).toBe('A2+B2');
      expect(result.formulas[0]?.dependencies).toContain('A2');
      expect(result.formulas[0]?.dependencies).toContain('B2');
    });

    it('should handle empty cells correctly', async () => {
      const testData = [
        ['A', '', 'C'],
        ['', 'B', ''],
        ['X', 'Y', 'Z']
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(testData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      const result = await SpreadsheetParser.parseFile(
        buffer,
        'empty_cells.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

      const sheet = result.sheets[0];
      if (!sheet) {
        throw new Error('Sheet should be defined');
      }
      
      // Check empty cells
      expect(sheet.data[0]?.[1]?.dataType).toBe(DataType.EMPTY);
      expect(sheet.data[1]?.[0]?.dataType).toBe(DataType.EMPTY);
      expect(sheet.data[1]?.[2]?.dataType).toBe(DataType.EMPTY);
      
      // Check non-empty cells
      expect(sheet.data[0]?.[0]?.value).toBe('A');
      expect(sheet.data[2]?.[0]?.value).toBe('X');
    });

    it('should handle multiple sheets', async () => {
      const workbook = XLSX.utils.book_new();
      
      // Sheet 1
      const sheet1Data = [['Sheet1 Data', 'Value'], ['Item1', 100]];
      const worksheet1 = XLSX.utils.aoa_to_sheet(sheet1Data);
      XLSX.utils.book_append_sheet(workbook, worksheet1, 'Sheet1');
      
      // Sheet 2
      const sheet2Data = [['Sheet2 Data', 'Count'], ['Item2', 200]];
      const worksheet2 = XLSX.utils.aoa_to_sheet(sheet2Data);
      XLSX.utils.book_append_sheet(workbook, worksheet2, 'Sheet2');
      
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      const result = await SpreadsheetParser.parseFile(
        buffer,
        'multi_sheet.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

      expect(result.sheets).toHaveLength(2);
      expect(result.sheets[0]?.name).toBe('Sheet1');
      expect(result.sheets[1]?.name).toBe('Sheet2');
      expect(result.sheets[0]?.data[0]?.[0]?.value).toBe('Sheet1 Data');
      expect(result.sheets[1]?.data[0]?.[0]?.value).toBe('Sheet2 Data');
    });
  });

  describe('error handling', () => {
    it('should throw error for unsupported file format', async () => {
      await expect(
        SpreadsheetParser.parseFile(
          Buffer.from('invalid data'),
          'test.txt',
          'text/plain'
        )
      ).rejects.toThrow(SpreadsheetParseError);
    });

    it('should throw error for file too large', async () => {
      const largeBuffer = Buffer.alloc(60 * 1024 * 1024); // 60MB
      
      await expect(
        SpreadsheetParser.parseFile(
          largeBuffer,
          'large.xlsx',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
      ).rejects.toThrow(SpreadsheetParseError);
    });

    it('should throw error for corrupted Excel file', async () => {
      // Create a buffer that looks like a zip file but is corrupted
      const corruptedBuffer = Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x00, 0x00]); // PK header but incomplete
      
      await expect(
        SpreadsheetParser.parseFile(
          corruptedBuffer,
          'corrupted.xlsx',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
      ).rejects.toThrow(SpreadsheetParseError);
    });

    it('should handle empty workbook gracefully', async () => {
      // Create a workbook with an empty sheet
      const workbook = XLSX.utils.book_new();
      const emptySheet = XLSX.utils.aoa_to_sheet([]);
      XLSX.utils.book_append_sheet(workbook, emptySheet, 'EmptySheet');
      
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      const result = await SpreadsheetParser.parseFile(
        buffer,
        'empty.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      
      // Should handle empty sheet gracefully
      expect(result.sheets).toHaveLength(1);
      expect(result.sheets[0]?.name).toBe('EmptySheet');
      expect(result.sheets[0]?.dimensions.rows).toBe(1);
      expect(result.sheets[0]?.dimensions.cols).toBe(1);
    });
  });

  describe('utility methods', () => {
    it('should return supported formats', () => {
      const formats = SpreadsheetParser.getSupportedFormats();
      expect(formats).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(formats).toContain('application/vnd.ms-excel');
      expect(formats).toContain('text/csv');
    });

    it('should check format support correctly', () => {
      expect(SpreadsheetParser.isFormatSupported('text/csv')).toBe(true);
      expect(SpreadsheetParser.isFormatSupported('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe(true);
      expect(SpreadsheetParser.isFormatSupported('text/plain')).toBe(false);
      
      // Test with filename
      expect(SpreadsheetParser.isFormatSupported('application/octet-stream', 'test.xlsx')).toBe(true);
      expect(SpreadsheetParser.isFormatSupported('application/octet-stream', 'test.txt')).toBe(false);
    });
  });

  describe('data type detection', () => {
    it('should correctly detect various data types', async () => {
      const testData = [
        ['Text', 'Number', 'Date', 'Boolean', 'Formula'],
        ['Hello World', 42, new Date('2023-01-01'), true, { f: '2+2' }],
        ['Another text', 3.14, new Date('2023-12-31'), false, { f: 'A2*2' }]
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(testData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'DataTypes');
      
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      const result = await SpreadsheetParser.parseFile(
        buffer,
        'datatypes.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

      const sheet = result.sheets[0];
      if (!sheet) {
        throw new Error('Sheet should be defined');
      }
      
      const row1 = sheet.data[1];
      if (!row1) {
        throw new Error('Row should be defined');
      }
      
      expect(row1[0]?.dataType).toBe(DataType.TEXT);
      expect(row1[1]?.dataType).toBe(DataType.NUMBER);
      expect(row1[3]?.dataType).toBe(DataType.BOOLEAN);
      expect(row1[4]?.dataType).toBe(DataType.FORMULA);
    });
  });

  describe('formula dependency extraction', () => {
    it('should extract simple cell references', async () => {
      const worksheet = XLSX.utils.aoa_to_sheet([
        ['A', 'B', 'Sum'],
        [10, 20, { f: 'A2+B2' }],
        [15, 25, { f: 'SUM(A2:B3)' }]
      ]);
      
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Dependencies');
      
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      const result = await SpreadsheetParser.parseFile(
        buffer,
        'dependencies.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        { includeFormulas: true }
      );

      expect(result.formulas).toHaveLength(2);
      
      // First formula: A2+B2
      expect(result.formulas[0]?.dependencies).toContain('A2');
      expect(result.formulas[0]?.dependencies).toContain('B2');
      
      // Second formula: SUM(A2:B3)
      expect(result.formulas[1]?.dependencies).toContain('A2:B3');
    });
  });
});