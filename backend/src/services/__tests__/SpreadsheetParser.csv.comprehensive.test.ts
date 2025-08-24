import { SpreadsheetParser, CSVParseError, CSVErrorCode } from '../SpreadsheetParser';
import { DataType } from '../../types/spreadsheet';

describe('SpreadsheetParser - Comprehensive CSV Tests', () => {
  describe('Delimiter Detection', () => {
    it('should detect semicolon delimiter', async () => {
      const csvContent = 'Name;Age;City\nJohn;25;New York\nJane;30;Boston';
      const result = await SpreadsheetParser.parseFile(csvContent, 'test.csv', 'text/csv');
      
      expect(result.sheets).toHaveLength(1);
      const sheet = result.sheets[0];
      if (!sheet) throw new Error('Sheet should exist');
      
      expect(sheet.data[0]?.[0]?.value).toBe('Name');
      expect(sheet.data[1]?.[1]?.value).toBe(25);
    });

    it('should detect tab delimiter', async () => {
      const csvContent = 'Name\tAge\tCity\nJohn\t25\tNew York\nJane\t30\tBoston';
      const result = await SpreadsheetParser.parseFile(csvContent, 'test.csv', 'text/csv');
      
      expect(result.sheets).toHaveLength(1);
      const sheet = result.sheets[0];
      if (!sheet) throw new Error('Sheet should exist');
      
      expect(sheet.data[0]?.[2]?.value).toBe('City');
      expect(sheet.data[1]?.[2]?.value).toBe('New York');
    });

    it('should detect pipe delimiter', async () => {
      const csvContent = 'Name|Age|City\nJohn|25|New York\nJane|30|Boston';
      const result = await SpreadsheetParser.parseFile(csvContent, 'test.csv', 'text/csv');
      
      expect(result.sheets).toHaveLength(1);
      const sheet = result.sheets[0];
      if (!sheet) throw new Error('Sheet should exist');
      
      expect(sheet.data[1]?.[0]?.value).toBe('John');
      expect(sheet.data[1]?.[1]?.value).toBe(25);
    });
  });

  describe('Quoted Fields and Escapes', () => {
    it('should handle quoted fields with commas', async () => {
      const csvContent = 'Name,Description\n"Smith, John","Software Engineer"\n"Doe, Jane","Data Scientist"';
      const result = await SpreadsheetParser.parseFile(csvContent, 'test.csv', 'text/csv');
      
      expect(result.sheets).toHaveLength(1);
      const sheet = result.sheets[0];
      if (!sheet) throw new Error('Sheet should exist');
      
      expect(sheet.data[1]?.[0]?.value).toBe('Smith, John');
      expect(sheet.data[1]?.[1]?.value).toBe('Software Engineer');
    });

    it('should handle escaped quotes', async () => {
      const csvContent = 'Name,Quote\nJohn,"He said ""Hello"""\nJane,"She said ""Goodbye"""';
      const result = await SpreadsheetParser.parseFile(csvContent, 'test.csv', 'text/csv');
      
      expect(result.sheets).toHaveLength(1);
      const sheet = result.sheets[0];
      if (!sheet) throw new Error('Sheet should exist');
      
      expect(sheet.data[1]?.[1]?.value).toBe('He said "Hello"');
      expect(sheet.data[2]?.[1]?.value).toBe('She said "Goodbye"');
    });
  });

  describe('Data Type Detection', () => {
    it('should detect number data types', async () => {
      const csvContent = 'Name,Age,Salary\nJohn,25,50000.50\nJane,30,75000.75';
      const result = await SpreadsheetParser.parseFile(csvContent, 'test.csv', 'text/csv');
      
      expect(result.sheets).toHaveLength(1);
      const sheet = result.sheets[0];
      if (!sheet) throw new Error('Sheet should exist');
      
      // Age column should be detected as number
      expect(sheet.data[1]?.[1]?.dataType).toBe(DataType.NUMBER);
      // Salary column should be detected as number
      expect(sheet.data[1]?.[2]?.dataType).toBe(DataType.NUMBER);
    });

    it('should detect boolean data types', async () => {
      const csvContent = 'Name,Active,Manager\nJohn,true,yes\nJane,false,no';
      const result = await SpreadsheetParser.parseFile(csvContent, 'test.csv', 'text/csv');
      
      expect(result.sheets).toHaveLength(1);
      const sheet = result.sheets[0];
      if (!sheet) throw new Error('Sheet should exist');
      
      // Active column should be detected as boolean
      expect(sheet.data[1]?.[1]?.dataType).toBe(DataType.BOOLEAN);
      // Manager column should be detected as boolean
      expect(sheet.data[1]?.[2]?.dataType).toBe(DataType.BOOLEAN);
    });

    it('should detect date data types', async () => {
      const csvContent = 'Name,BirthDate,StartDate\nJohn,1990-05-15,01/15/2020\nJane,1985-12-25,03/10/2019';
      const result = await SpreadsheetParser.parseFile(csvContent, 'test.csv', 'text/csv');
      
      expect(result.sheets).toHaveLength(1);
      const sheet = result.sheets[0];
      if (!sheet) throw new Error('Sheet should exist');
      
      // BirthDate column should be detected as date
      expect(sheet.data[1]?.[1]?.dataType).toBe(DataType.DATE);
      // StartDate column should be detected as date  
      expect(sheet.data[1]?.[2]?.dataType).toBe(DataType.DATE);
    });
  });

  describe('Inconsistent Row Lengths', () => {
    it('should normalize rows with different column counts', async () => {
      const csvContent = 'Name,Age,City\nJohn,25\nJane,30,Boston,Extra\nBob';
      const result = await SpreadsheetParser.parseFile(csvContent, 'test.csv', 'text/csv');
      
      expect(result.sheets).toHaveLength(1);
      const sheet = result.sheets[0];
      if (!sheet) throw new Error('Sheet should exist');
      
      // All rows should be normalized to same length (4 columns - longest row)
      expect(sheet.data[1]).toHaveLength(4);
      expect(sheet.data[2]).toHaveLength(4);
      expect(sheet.data[3]).toHaveLength(4);
      
      // Missing values should be empty strings
      expect(sheet.data[1]?.[2]?.value).toBe('');
      expect(sheet.data[3]?.[1]?.value).toBe('');
    });
  });

  describe('Encoding Detection', () => {
    it('should handle UTF-8 encoding', async () => {
      const csvContent = 'Name,Description\nJohn,Café résumé\nJane,Naïve résumé';
      const buffer = Buffer.from(csvContent, 'utf8');
      
      const result = await SpreadsheetParser.parseFile(buffer, 'test.csv', 'text/csv');
      
      expect(result.sheets).toHaveLength(1);
      const sheet = result.sheets[0];
      if (!sheet) throw new Error('Sheet should exist');
      
      expect(sheet.data[1]?.[1]?.value).toBe('Café résumé');
    });

    it('should detect UTF-8 BOM', async () => {
      const csvContent = 'Name,Age\nJohn,25';
      const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
      const buffer = Buffer.concat([bom, Buffer.from(csvContent, 'utf8')]);
      
      const result = await SpreadsheetParser.parseFile(buffer, 'test.csv', 'text/csv');
      
      expect(result.sheets).toHaveLength(1);
      const sheet = result.sheets[0];
      if (!sheet) throw new Error('Sheet should exist');
      
      expect(sheet.data[0]?.[0]?.value).toBe('Name');
    });
  });

  describe('Error Handling', () => {
    it('should throw CSVParseError for empty files', async () => {
      const csvContent = '';
      
      await expect(SpreadsheetParser.parseFile(csvContent, 'test.csv', 'text/csv'))
        .rejects.toThrow(CSVParseError);
    });

    it('should throw CSVParseError for whitespace-only files', async () => {
      const csvContent = '   \n  \n  ';
      
      await expect(SpreadsheetParser.parseFile(csvContent, 'test.csv', 'text/csv'))
        .rejects.toThrow(CSVParseError);
    });

    it('should provide helpful error messages with suggestions', async () => {
      const csvContent = '';
      
      try {
        await SpreadsheetParser.parseFile(csvContent, 'test.csv', 'text/csv');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(CSVParseError);
        const csvError = error as CSVParseError;
        expect(csvError.code).toBe(CSVErrorCode.EMPTY_FILE);
        expect(csvError.details?.suggestions).toBeDefined();
        expect(csvError.details?.suggestions.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle CSV with only headers', async () => {
      const csvContent = 'Name,Age,City';
      
      const result = await SpreadsheetParser.parseFile(csvContent, 'test.csv', 'text/csv');
      
      expect(result.sheets).toHaveLength(1);
      const sheet = result.sheets[0];
      if (!sheet) throw new Error('Sheet should exist');
      
      expect(sheet.data).toHaveLength(1);
      expect(sheet.data[0]?.[0]?.value).toBe('Name');
    });

    it('should handle CSV with empty fields', async () => {
      const csvContent = 'Name,Age,City\nJohn,,New York\n,25,\nBob,,Chicago';
      
      const result = await SpreadsheetParser.parseFile(csvContent, 'test.csv', 'text/csv');
      
      expect(result.sheets).toHaveLength(1);
      const sheet = result.sheets[0];
      if (!sheet) throw new Error('Sheet should exist');
      
      // Check empty fields are handled correctly
      expect(sheet.data[1]?.[1]?.value).toBe(''); // John's age is empty
      expect(sheet.data[2]?.[0]?.value).toBe(''); // Second row name is empty
      expect(sheet.data[2]?.[2]?.value).toBe(''); // Second row city is empty
      expect(sheet.data[3]?.[1]?.value).toBe(''); // Bob's age is empty
    });

    it('should handle CSV with special characters', async () => {
      const csvContent = 'Name,Symbols\nJohn,"@#$%^&*()"\nJane,"<>?:{}[]"';
      
      const result = await SpreadsheetParser.parseFile(csvContent, 'test.csv', 'text/csv');
      
      expect(result.sheets).toHaveLength(1);
      const sheet = result.sheets[0];
      if (!sheet) throw new Error('Sheet should exist');
      
      expect(sheet.data[1]?.[1]?.value).toBe('@#$%^&*()');
      expect(sheet.data[2]?.[1]?.value).toBe('<>?:{}[]');
    });
  });
});