import { SpreadsheetParser } from '../services/SpreadsheetParser';
import { DataBoundaryAnalyzer } from '../services/DataBoundaryAnalyzer';
import fs from 'fs';
import path from 'path';

describe('Excel Regression Testing', () => {
  // Using static methods, no need for instances

  describe('Excel File Processing', () => {
    test('should still parse simple Excel files correctly', async () => {
      const excelPath = path.join(__dirname, '../../../e2e/fixtures/files/simple-spreadsheet.xlsx');
      
      if (!fs.existsSync(excelPath)) {
        console.log('Skipping Excel test - file not found');
        return;
      }

      const buffer = fs.readFileSync(excelPath);
      const result = await SpreadsheetParser.parseFile(buffer, 'simple-test.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      expect(result.sheets).toHaveLength(1);
      expect(result.sheets[0].data.length).toBeGreaterThan(0);
      expect(result.sheets[0].name).toBeDefined();
    });

    test('should parse complex Excel files with multiple sheets', async () => {
      const excelPath = path.join(__dirname, '../../../e2e/fixtures/files/complex-spreadsheet.xlsx');
      
      if (!fs.existsSync(excelPath)) {
        console.log('Skipping complex Excel test - file not found');
        return;
      }

      const buffer = fs.readFileSync(excelPath);
      const result = await SpreadsheetParser.parseFile(buffer, 'complex-test.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      expect(result.sheets.length).toBeGreaterThanOrEqual(1);
      result.sheets.forEach(sheet => {
        expect(sheet.name).toBeDefined();
        expect(sheet.data).toBeDefined();
      });
    });

    test('should parse large Excel datasets efficiently', async () => {
      const excelPath = path.join(__dirname, '../../../e2e/fixtures/files/large-dataset.xlsx');
      
      if (!fs.existsSync(excelPath)) {
        console.log('Skipping large Excel test - file not found');
        return;
      }

      const buffer = fs.readFileSync(excelPath);
      const startTime = Date.now();
      
      const result = await SpreadsheetParser.parseFile(buffer, 'large-excel-test.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      const parseTime = Date.now() - startTime;
      
      expect(result.sheets).toHaveLength(1);
      expect(result.sheets[0].data.length).toBeGreaterThan(0);
      expect(parseTime).toBeLessThan(15000); // Should parse within 15 seconds
      
      console.log(`Large Excel parsing took ${parseTime}ms for ${result.sheets[0].data.length} rows`);
    }, 20000);
  });

  describe('Excel Boundary Detection', () => {
    test('should detect boundaries correctly for Excel files', async () => {
      const excelPath = path.join(__dirname, '../../../e2e/fixtures/files/simple-spreadsheet.xlsx');
      
      if (!fs.existsSync(excelPath)) {
        console.log('Skipping Excel boundary test - file not found');
        return;
      }

      const buffer = fs.readFileSync(excelPath);
      const result = await SpreadsheetParser.parseFile(buffer, 'boundary-excel-test.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      const boundaries = DataBoundaryAnalyzer.analyzeDataBoundaries(result.sheets[0]);
      
      expect(boundaries.minRow).toBeGreaterThanOrEqual(0);
      expect(boundaries.maxRow).toBeGreaterThanOrEqual(boundaries.minRow);
      expect(boundaries.minCol).toBeGreaterThanOrEqual(0);
      expect(boundaries.maxCol).toBeGreaterThanOrEqual(boundaries.minCol);
      expect(typeof boundaries.hasHeaders).toBe('boolean');
    });

    test('should calculate optimal range for Excel files', async () => {
      const excelPath = path.join(__dirname, '../../../e2e/fixtures/files/simple-spreadsheet.xlsx');
      
      if (!fs.existsSync(excelPath)) {
        console.log('Skipping Excel range test - file not found');
        return;
      }

      const buffer = fs.readFileSync(excelPath);
      const result = await SpreadsheetParser.parseFile(buffer, 'range-excel-test.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      const boundaries = DataBoundaryAnalyzer.analyzeDataBoundaries(result.sheets[0]);
      const optimalRange = DataBoundaryAnalyzer.calculateOptimalRange(boundaries);
      
      expect(optimalRange).toMatch(/^[A-Z]+\d+:[A-Z]+\d+$/);
    });
  });

  describe('Excel vs CSV Consistency', () => {
    test('should produce consistent boundary analysis for similar data', async () => {
      // Test with CSV version
      const csvPath = path.join(__dirname, '../../../e2e/fixtures/files/simple-spreadsheet.csv');
      const excelPath = path.join(__dirname, '../../../e2e/fixtures/files/simple-spreadsheet.xlsx');
      
      if (!fs.existsSync(csvPath) || !fs.existsSync(excelPath)) {
        console.log('Skipping consistency test - files not found');
        return;
      }

      const csvBuffer = fs.readFileSync(csvPath);
      const excelBuffer = fs.readFileSync(excelPath);
      
      const csvResult = await SpreadsheetParser.parseFile(csvBuffer, 'consistency-test.csv', 'text/csv');
      const excelResult = await SpreadsheetParser.parseFile(excelBuffer, 'consistency-test.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      const csvBoundaries = DataBoundaryAnalyzer.analyzeDataBoundaries(csvResult.sheets[0]);
      const excelBoundaries = DataBoundaryAnalyzer.analyzeDataBoundaries(excelResult.sheets[0]);
      
      // Should have similar row/column counts (allowing for minor differences)
      expect(Math.abs(csvBoundaries.maxRow - excelBoundaries.maxRow)).toBeLessThanOrEqual(1);
      expect(Math.abs(csvBoundaries.maxCol - excelBoundaries.maxCol)).toBeLessThanOrEqual(1);
    });
  });

  describe('Excel Data Type Preservation', () => {
    test('should preserve Excel data types correctly', async () => {
      const excelPath = path.join(__dirname, '../../../e2e/fixtures/files/simple-spreadsheet.xlsx');
      
      if (!fs.existsSync(excelPath)) {
        console.log('Skipping Excel data type test - file not found');
        return;
      }

      const buffer = fs.readFileSync(excelPath);
      const result = await SpreadsheetParser.parseFile(buffer, 'datatype-test.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      const sheet = result.sheets[0];
      expect(sheet.data.length).toBeGreaterThan(0);
      
      // Check that data types are preserved
      sheet.data.forEach(row => {
        row.forEach(cell => {
          expect(cell).toHaveProperty('value');
          expect(cell).toHaveProperty('type');
        });
      });
    });
  });
});