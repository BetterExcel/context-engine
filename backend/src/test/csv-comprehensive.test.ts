import { SpreadsheetParser } from '../services/SpreadsheetParser';
import { DataBoundaryAnalyzer } from '../services/DataBoundaryAnalyzer';
import fs from 'fs';
import path from 'path';

describe('CSV Comprehensive Testing', () => {
  // Using static methods, no need for instances

  describe('Delimiter Detection', () => {
    test('should detect comma delimiter', async () => {
      const csvPath = path.join(__dirname, '../../../e2e/fixtures/files/comma-delimited-utf8.csv');
      const buffer = fs.readFileSync(csvPath);
      
      const result = await SpreadsheetParser.parseFile(buffer, 'comma-test.csv', 'text/csv');
      
      expect(result.sheets).toHaveLength(1);
      const sheet = result.sheets[0]!;
      expect(sheet).toBeDefined();
      expect(sheet.data).toHaveLength(6); // 5 data rows + 1 header
      expect(sheet.data[0]?.[0]?.value).toBe('Name');
      expect(sheet.data[1]?.[0]?.value).toBe('John Doe');
    });

    test('should detect semicolon delimiter', async () => {
      const csvPath = path.join(__dirname, '../../../e2e/fixtures/files/semicolon-delimited-utf8.csv');
      const buffer = fs.readFileSync(csvPath);
      
      const result = await SpreadsheetParser.parseFile(buffer, 'semicolon-test.csv', 'text/csv');
      
      expect(result.sheets).toHaveLength(1);
      const sheet = result.sheets[0];
      expect(sheet).toBeDefined();
      expect(sheet.data).toHaveLength(6);
      expect(sheet.data[0]?.[0]?.value).toBe('Name');
      expect(sheet.data[1]?.[0]?.value).toBe('John Doe');
    });

    test('should detect tab delimiter', async () => {
      const csvPath = path.join(__dirname, '../../../e2e/fixtures/files/tab-delimited-utf8.csv');
      const buffer = fs.readFileSync(csvPath);
      
      const result = await SpreadsheetParser.parseFile(buffer, 'tab-test.csv', 'text/csv');
      
      expect(result.sheets).toHaveLength(1);
      const sheet = result.sheets[0];
      expect(sheet).toBeDefined();
      expect(sheet.data).toHaveLength(6);
      expect(sheet.data[0]?.[0]?.value).toBe('Name');
      expect(sheet.data[1]?.[0]?.value).toBe('John Doe');
    });
  });

  describe('Data Type Detection', () => {
    test('should correctly identify data types in CSV', async () => {
      const csvPath = path.join(__dirname, '../../../e2e/fixtures/files/comma-delimited-utf8.csv');
      const buffer = fs.readFileSync(csvPath);
      
      const result = await SpreadsheetParser.parseFile(buffer, 'types-test.csv', 'text/csv');
      const sheet = result.sheets[0];
      expect(sheet).toBeDefined();
      
      // Check that numeric values are properly detected
      expect(typeof sheet.data[1]?.[1]?.value).toBe('number'); // Age
      expect(typeof sheet.data[1]?.[3]?.value).toBe('number'); // Salary
      expect(typeof sheet.data[1]?.[0]?.value).toBe('string'); // Name
      expect(typeof sheet.data[1]?.[2]?.value).toBe('string'); // City
    });
  });

  describe('Boundary Detection', () => {
    test('should detect correct boundaries for regular data', async () => {
      const csvPath = path.join(__dirname, '../../../e2e/fixtures/files/comma-delimited-utf8.csv');
      const buffer = fs.readFileSync(csvPath);
      
      const result = await SpreadsheetParser.parseFile(buffer, 'boundary-test.csv', 'text/csv');
      const sheet = result.sheets[0];
      expect(sheet).toBeDefined();
      const boundaries = DataBoundaryAnalyzer.analyzeDataBoundaries(sheet);
      
      expect(boundaries.minRow).toBe(0);
      expect(boundaries.maxRow).toBe(5); // 0-indexed, so row 5 is the last data row
      expect(boundaries.minCol).toBe(0);
      expect(boundaries.maxCol).toBe(3); // 4 columns (0-3)
      expect(boundaries.hasHeaders).toBe(true);
    });

    test('should handle sparse data correctly', async () => {
      const csvPath = path.join(__dirname, '../../../e2e/fixtures/files/sparse-data.csv');
      const buffer = fs.readFileSync(csvPath);
      
      const result = await SpreadsheetParser.parseFile(buffer, 'sparse-test.csv', 'text/csv');
      const sheet = result.sheets[0];
      expect(sheet).toBeDefined();
      const boundaries = DataBoundaryAnalyzer.analyzeDataBoundaries(sheet);
      
      expect(boundaries.minRow).toBe(0);
      expect(boundaries.maxRow).toBeGreaterThan(5); // Should include all rows with any data
      expect(boundaries.minCol).toBe(0);
      expect(boundaries.maxCol).toBe(4); // 5 columns (0-4)
    });

    test('should detect headers-only file', async () => {
      const csvPath = path.join(__dirname, '../../../e2e/fixtures/files/headers-only.csv');
      const buffer = fs.readFileSync(csvPath);
      
      const result = await SpreadsheetParser.parseFile(buffer, 'headers-only-test.csv', 'text/csv');
      const sheet = result.sheets[0];
      expect(sheet).toBeDefined();
      const boundaries = DataBoundaryAnalyzer.analyzeDataBoundaries(sheet);
      
      expect(boundaries.minRow).toBe(0);
      expect(boundaries.maxRow).toBe(0); // Only header row
      expect(boundaries.hasHeaders).toBe(true);
    });

    test('should handle no-headers file', async () => {
      const csvPath = path.join(__dirname, '../../../e2e/fixtures/files/no-headers.csv');
      const buffer = fs.readFileSync(csvPath);
      
      const result = await SpreadsheetParser.parseFile(buffer, 'no-headers-test.csv', 'text/csv');
      const sheet = result.sheets[0];
      expect(sheet).toBeDefined();
      const boundaries = DataBoundaryAnalyzer.analyzeDataBoundaries(sheet);
      
      expect(boundaries.minRow).toBe(0);
      expect(boundaries.maxRow).toBe(3); // 4 data rows (0-3)
      expect(boundaries.hasHeaders).toBe(false);
    });
  });

  describe('Default Selection Calculation', () => {
    test('should calculate optimal range for regular data', async () => {
      const csvPath = path.join(__dirname, '../../../e2e/fixtures/files/comma-delimited-utf8.csv');
      const buffer = fs.readFileSync(csvPath);
      
      const result = await SpreadsheetParser.parseFile(buffer, 'selection-test.csv', 'text/csv');
      const sheet = result.sheets[0];
      expect(sheet).toBeDefined();
      const boundaries = DataBoundaryAnalyzer.analyzeDataBoundaries(sheet);
      const optimalRange = DataBoundaryAnalyzer.calculateOptimalRange(boundaries);
      
      expect(optimalRange).toBe('A1:D6'); // A1 to D6 covers all data including headers
    });

    test('should handle sparse data selection', async () => {
      const csvPath = path.join(__dirname, '../../../e2e/fixtures/files/sparse-data.csv');
      const buffer = fs.readFileSync(csvPath);
      
      const result = await SpreadsheetParser.parseFile(buffer, 'sparse-selection-test.csv', 'text/csv');
      const sheet = result.sheets[0];
      expect(sheet).toBeDefined();
      const boundaries = DataBoundaryAnalyzer.analyzeDataBoundaries(sheet);
      const optimalRange = DataBoundaryAnalyzer.calculateOptimalRange(boundaries);
      
      // Should include the full rectangular range that encompasses all data
      expect(optimalRange).toMatch(/^A1:[A-Z]+\d+$/);
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed CSV gracefully', async () => {
      const malformedCSV = Buffer.from('Name,Age\nJohn,30\nJane,25,Extra,Field\nBob');
      
      const result = await SpreadsheetParser.parseFile(malformedCSV, 'malformed.csv', 'text/csv');
      
      // Should still parse what it can
      expect(result.sheets).toHaveLength(1);
      const sheet = result.sheets[0];
      expect(sheet).toBeDefined();
      expect(sheet.data.length).toBeGreaterThan(0);
    });

    test('should handle empty CSV file', async () => {
      const emptyCSV = Buffer.from('');
      
      await expect(SpreadsheetParser.parseFile(emptyCSV, 'empty.csv', 'text/csv'))
        .rejects.toThrow();
    });

    test('should handle CSV with only headers', async () => {
      const csvPath = path.join(__dirname, '../../../e2e/fixtures/files/headers-only.csv');
      const buffer = fs.readFileSync(csvPath);
      
      const result = await SpreadsheetParser.parseFile(buffer, 'headers-only.csv', 'text/csv');
      
      expect(result.sheets).toHaveLength(1);
      const sheet = result.sheets[0];
      expect(sheet).toBeDefined();
      expect(sheet.data).toHaveLength(1); // Only header row
    });
  });
});