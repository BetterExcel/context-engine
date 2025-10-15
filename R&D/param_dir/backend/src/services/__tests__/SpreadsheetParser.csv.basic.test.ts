import { SpreadsheetParser, CSVParseError } from '../SpreadsheetParser';

describe('SpreadsheetParser - CSV Basic Tests', () => {
  it('should parse simple CSV file', async () => {
    const csvContent = 'Name,Age,City\nJohn,25,New York\nJane,30,Boston';
    const result = await SpreadsheetParser.parseFile(csvContent, 'test.csv', 'text/csv');
    
    expect(result.sheets).toHaveLength(1);
    
    const sheet = result.sheets[0];
    if (!sheet) {
      throw new Error('Sheet should be defined');
    }
    
    expect(sheet.data).toHaveLength(3);
    
    // Check header row exists and has correct length
    const headerRow = sheet.data[0];
    if (!headerRow) {
      throw new Error('Header row should be defined');
    }
    expect(headerRow).toHaveLength(3);
    
    // Check header values
    const nameCell = headerRow[0];
    const ageCell = headerRow[1]; 
    const cityCell = headerRow[2];
    
    expect(nameCell?.value).toBe('Name');
    expect(ageCell?.value).toBe('Age');
    expect(cityCell?.value).toBe('City');
    
    // Check first data row
    const firstDataRow = sheet.data[1];
    if (!firstDataRow) {
      throw new Error('First data row should be defined');
    }
    
    expect(firstDataRow[0]?.value).toBe('John');
    expect(firstDataRow[1]?.value).toBe(25);
    expect(firstDataRow[2]?.value).toBe('New York');
  });

  it('should handle empty CSV file', async () => {
    const csvContent = '';
    
    await expect(SpreadsheetParser.parseFile(csvContent, 'test.csv', 'text/csv'))
      .rejects.toThrow(CSVParseError);
  });

  it('should support different MIME types', async () => {
    const csvContent = 'Name,Age\nJohn,25';
    
    // Test text/csv
    const result1 = await SpreadsheetParser.parseFile(csvContent, 'test.csv', 'text/csv');
    expect(result1.sheets).toHaveLength(1);
    
    // Test application/csv
    const result2 = await SpreadsheetParser.parseFile(csvContent, 'test.csv', 'application/csv');
    expect(result2.sheets).toHaveLength(1);
    
    // Test text/plain with .csv extension
    const result3 = await SpreadsheetParser.parseFile(csvContent, 'test.csv', 'text/plain');
    expect(result3.sheets).toHaveLength(1);
  });

  it('should detect format support correctly', () => {
    expect(SpreadsheetParser.isFormatSupported('text/csv', 'test.csv')).toBe(true);
    expect(SpreadsheetParser.isFormatSupported('application/csv', 'test.csv')).toBe(true);
    expect(SpreadsheetParser.isFormatSupported('text/plain', 'test.csv')).toBe(true);
    expect(SpreadsheetParser.isFormatSupported('text/plain', 'test.txt')).toBe(false);
  });

  it('should provide CSV analysis', async () => {
    const csvContent = 'Name;Age;City\nJohn;25;New York\nJane;30;Boston';
    
    const analysis = await SpreadsheetParser.analyzeCSVFile(csvContent, 'test.csv');
    
    expect(analysis.detectedDelimiter).toBe(';');
    expect(analysis.detectedEncoding).toBe('utf8');
    expect(analysis.sampleData).toHaveLength(3);
    
    const headerRow = analysis.sampleData[0];
    if (headerRow) {
      expect(headerRow).toEqual(['Name', 'Age', 'City']);
    }
  });
});