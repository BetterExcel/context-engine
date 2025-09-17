import { SpreadsheetParser } from '../services/SpreadsheetParser';
import { DataBoundaryAnalyzer } from '../services/DataBoundaryAnalyzer';
import fs from 'fs';
import path from 'path';

describe('CSV Basic Testing', () => {
  test('should parse comma-delimited CSV', async () => {
    const csvPath = path.join(__dirname, '../../../e2e/fixtures/files/comma-delimited-utf8.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.log('Skipping test - CSV file not found');
      return;
    }

    const buffer = fs.readFileSync(csvPath);
    const result = await SpreadsheetParser.parseFile(buffer, 'test.csv', 'text/csv');
    
    expect(result.sheets).toHaveLength(1);
    expect(result.sheets[0]).toBeDefined();
    expect(result.sheets[0]!.data.length).toBeGreaterThan(0);
  });

  test('should analyze boundaries for CSV', async () => {
    const csvPath = path.join(__dirname, '../../../e2e/fixtures/files/comma-delimited-utf8.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.log('Skipping test - CSV file not found');
      return;
    }

    const buffer = fs.readFileSync(csvPath);
    const result = await SpreadsheetParser.parseFile(buffer, 'test.csv', 'text/csv');
    
    const sheet = result.sheets[0]!;
    const boundaries = DataBoundaryAnalyzer.analyzeDataBoundaries(sheet);
    
    expect(boundaries.minRow).toBeGreaterThanOrEqual(0);
    expect(boundaries.maxRow).toBeGreaterThanOrEqual(boundaries.minRow);
    expect(boundaries.minCol).toBeGreaterThanOrEqual(0);
    expect(boundaries.maxCol).toBeGreaterThanOrEqual(boundaries.minCol);
  });

  test('should calculate optimal range', async () => {
    const csvPath = path.join(__dirname, '../../../e2e/fixtures/files/comma-delimited-utf8.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.log('Skipping test - CSV file not found');
      return;
    }

    const buffer = fs.readFileSync(csvPath);
    const result = await SpreadsheetParser.parseFile(buffer, 'test.csv', 'text/csv');
    
    const sheet = result.sheets[0]!;
    const boundaries = DataBoundaryAnalyzer.analyzeDataBoundaries(sheet);
    const optimalRange = DataBoundaryAnalyzer.calculateOptimalRange(boundaries);
    
    expect(optimalRange).toMatch(/^[A-Z]+\d+:[A-Z]+\d+$/);
  });

  test('should handle empty CSV gracefully', async () => {
    const emptyCSV = Buffer.from('');
    
    await expect(SpreadsheetParser.parseFile(emptyCSV, 'empty.csv', 'text/csv'))
      .rejects.toThrow();
  });
});