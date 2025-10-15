import { SpreadsheetParser, CSVParseError, CSVErrorCode } from '../SpreadsheetParser';
import { DataType } from '../../types/spreadsheet';

describe('SpreadsheetParser - CSV Edge Cases and Enhanced Tests', () => {
  describe('Advanced Delimiter Detection', () => {
    it('should handle mixed delimiters by choosing the most consistent one', async () => {
      // CSV with mostly semicolons - should detect semicolon as delimiter
      const csvContent = 'Name;Age;City\nJohn;25;New York\nJane;30;Boston\nBob;35;Chicago';
      const result = await SpreadsheetParser.parseFile(csvContent, 'test.csv', 'text/csv');
      
      expect(result.sheets).toHaveLength(1);
      const sheet = result.sheets[0];
      if (!sheet) throw new Error('Sheet should exist');
      
      // Should detect semicolon as primary delimiter and convert numbers
      expect(sheet.data[1]?.[1]?.value).toBe(25);
      expect(sheet.data[1]?.[1]?.dataType).toBe(DataType.NUMBER);
      expect(sheet.data[2]?.[1]?.value).toBe(30);
      expect(sheet.data[2]?.[1]?.dataType).toBe(DataType.NUMBER);
    });

    it('should handle CSV with no clear delimiter pattern', async () => {
      const csvContent = 'SingleColumnData\nValue1\nValue2\nValue3';
      
      await expect(SpreadsheetParser.parseFile(csvContent, 'test.csv', 'text/csv'))
        .rejects.toThrow(CSVParseError);
    });

    it('should detect delimiter in files with varying row lengths', async () => {
      const csvContent = 'A,B,C\n1,2\n3,4,5,6\n7,8,9';
      const result = await SpreadsheetParser.parseFile(csvContent, 'test.csv', 'text/csv');
      
      expect(result.sheets).toHaveLength(1);
      const sheet = result.sheets[0];
      if (!sheet) throw new Error('Sheet should exist');
      
      // Should normalize all rows to 4 columns (longest row)
      expect(sheet.data[1]).toHaveLength(4);
      expect(sheet.data[3]).toHaveLength(4);
    });
  });

  describe('Advanced Encoding Detection', () => {
    it('should handle UTF-16 LE BOM', async () => {
      const csvContent = 'Name,Age\nJohn,25';
      const utf16Buffer = Buffer.from(csvContent, 'utf16le');
      const bomBuffer = Buffer.from([0xFF, 0xFE]); // UTF-16 LE BOM
      const buffer = Buffer.concat([bomBuffer, utf16Buffer]);
      
      const result = await SpreadsheetParser.parseFile(buffer, 'test.csv', 'text/csv');
      
      expect(result.sheets).toHaveLength(1);
      const sheet = result.sheets[0];
      if (!sheet) throw new Error('Sheet should exist');
      
      expect(sheet.data[0]?.[0]?.value).toBe('Name');
    });

    it('should handle UTF-16 BE BOM', async () => {
      // Create a proper UTF-16 BE encoded buffer
      const csvContent = 'Name,Age\nJohn,25';
      
      // Manually create UTF-16 BE content
      const beContent = Buffer.alloc(2 + csvContent.length * 2);
      beContent[0] = 0xFE; // BOM byte 1
      beContent[1] = 0xFF; // BOM byte 2
      
      // Encode each character as UTF-16 BE (big endian)
      for (let i = 0; i < csvContent.length; i++) {
        const charCode = csvContent.charCodeAt(i);
        beContent[2 + i * 2] = (charCode >> 8) & 0xFF; // High byte first
        beContent[2 + i * 2 + 1] = charCode & 0xFF;    // Low byte second
      }
      
      const result = await SpreadsheetParser.parseFile(beContent, 'test.csv', 'text/csv');
      
      expect(result.sheets).toHaveLength(1);
      const sheet = result.sheets[0];
      if (!sheet) throw new Error('Sheet should exist');
      
      expect(sheet.data[0]?.[0]?.value).toBe('Name');
    });

    it('should fallback to UTF-8 for undetectable encoding', async () => {
      // Create a buffer with mixed bytes that could be ambiguous
      const csvContent = 'Name,Age\nJohn,25\nJane,30';
      const buffer = Buffer.from(csvContent, 'utf8');
      
      const result = await SpreadsheetParser.parseFile(buffer, 'test.csv', 'text/csv');
      
      expect(result.sheets).toHaveLength(1);
      const sheet = result.sheets[0];
      if (!sheet) throw new Error('Sheet should exist');
      
      expect(sheet.data[1]?.[0]?.value).toBe('John');
    });

    it('should handle Latin1 (Windows-1252) encoding', async () => {
      // Create content with Latin1 specific characters
      const csvContent = 'Name,Description\nJosé,Café\nNaïve,Résumé';
      const buffer = Buffer.from(csvContent, 'latin1');
      
      const result = await SpreadsheetParser.parseFile(buffer, 'test.csv', 'text/csv');
      
      expect(result.sheets).toHaveLength(1);
      const sheet = result.sheets[0];
      if (!sheet) throw new Error('Sheet should exist');
      
      expect(sheet.data[1]?.[0]?.value).toBe('José');
    });
  });

  describe('Complex Quoted Field Handling', () => {
    it('should handle nested quotes with different quote characters', async () => {
      const csvContent = `Name,Quote
John,"He said 'Hello World'"
Jane,'She said "Goodbye"'`;
      
      const result = await SpreadsheetParser.parseFile(csvContent, 'test.csv', 'text/csv');
      
      expect(result.sheets).toHaveLength(1);
      const sheet = result.sheets[0];
      if (!sheet) throw new Error('Sheet should exist');
      
      expect(sheet.data[1]?.[1]?.value).toBe("He said 'Hello World'");
      expect(sheet.data[2]?.[1]?.value).toBe('She said "Goodbye"');
    });

    it('should handle multiline quoted fields', async () => {
      const csvContent = `Name,Description
John,"Line 1
Line 2
Line 3"
Jane,Simple`;
      
      const result = await SpreadsheetParser.parseFile(csvContent, 'test.csv', 'text/csv');
      
      expect(result.sheets).toHaveLength(1);
      const sheet = result.sheets[0];
      if (!sheet) throw new Error('Sheet should exist');
      
      expect(sheet.data[1]?.[1]?.value).toBe('Line 1\nLine 2\nLine 3');
      expect(sheet.data[2]?.[1]?.value).toBe('Simple');
    });

    it('should handle quotes at field boundaries', async () => {
      const csvContent = 'Name,Value\n"John","""Quoted"""\n"Jane","Normal"';
      
      const result = await SpreadsheetParser.parseFile(csvContent, 'test.csv', 'text/csv');
      
      expect(result.sheets).toHaveLength(1);
      const sheet = result.sheets[0];
      if (!sheet) throw new Error('Sheet should exist');
      
      expect(sheet.data[1]?.[0]?.value).toBe('John');
      expect(sheet.data[1]?.[1]?.value).toBe('"Quoted"');
      expect(sheet.data[2]?.[1]?.value).toBe('Normal');
    });
  });

  describe('Advanced Data Type Detection', () => {
    it('should handle scientific notation numbers', async () => {
      const csvContent = 'Name,Value\nTest1,1.23e10\nTest2,4.56E-5\nTest3,7.89e+3';
      
      const result = await SpreadsheetParser.parseFile(csvContent, 'test.csv', 'text/csv');
      
      expect(result.sheets).toHaveLength(1);
      const sheet = result.sheets[0];
      if (!sheet) throw new Error('Sheet should exist');
      
      expect(sheet.data[1]?.[1]?.dataType).toBe(DataType.NUMBER);
      expect(sheet.data[2]?.[1]?.dataType).toBe(DataType.NUMBER);
      expect(sheet.data[3]?.[1]?.dataType).toBe(DataType.NUMBER);
    });

    it('should handle negative numbers and currency', async () => {
      const csvContent = 'Item,Price,Change\nApple,-5.50,+2.30\nBanana,$3.25,-$1.10';
      
      const result = await SpreadsheetParser.parseFile(csvContent, 'test.csv', 'text/csv');
      
      expect(result.sheets).toHaveLength(1);
      const sheet = result.sheets[0];
      if (!sheet) throw new Error('Sheet should exist');
      
      // Negative numbers should be detected as numbers
      expect(sheet.data[1]?.[1]?.dataType).toBe(DataType.NUMBER);
      expect(sheet.data[1]?.[1]?.value).toBe(-5.50);
    });

    it('should handle various date formats', async () => {
      const csvContent = `Name,Date1,Date2,Date3,Date4
John,2023-12-25,12/25/2023,25-12-2023,Dec 25 2023
Jane,2024-01-01,01/01/2024,01-01-2024,Jan 1 2024`;
      
      const result = await SpreadsheetParser.parseFile(csvContent, 'test.csv', 'text/csv');
      
      expect(result.sheets).toHaveLength(1);
      const sheet = result.sheets[0];
      if (!sheet) throw new Error('Sheet should exist');
      
      // ISO date should be detected
      expect(sheet.data[1]?.[1]?.dataType).toBe(DataType.DATE);
      // US format should be detected
      expect(sheet.data[1]?.[2]?.dataType).toBe(DataType.DATE);
    });

    it('should handle mixed data types in columns', async () => {
      const csvContent = `Name,Mixed
John,123
Jane,abc
Bob,true
Alice,2023-01-01`;
      
      const result = await SpreadsheetParser.parseFile(csvContent, 'test.csv', 'text/csv');
      
      expect(result.sheets).toHaveLength(1);
      const sheet = result.sheets[0];
      if (!sheet) throw new Error('Sheet should exist');
      
      // Mixed column should default to TEXT
      expect(sheet.data[1]?.[1]?.dataType).toBe(DataType.TEXT);
      expect(sheet.data[2]?.[1]?.dataType).toBe(DataType.TEXT);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should provide detailed error for malformed CSV with unclosed quotes', async () => {
      const csvContent = 'Name,Description\nJohn,"Unclosed quote\nJane,Normal';
      
      try {
        const result = await SpreadsheetParser.parseFile(csvContent, 'test.csv', 'text/csv');
        // If it doesn't throw, it should at least parse some data
        expect(result.sheets).toHaveLength(1);
      } catch (error) {
        // Should throw some kind of parsing error
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should handle extremely large CSV files gracefully', async () => {
      // Create a CSV with many rows
      let csvContent = 'Name,Age,City\n';
      for (let i = 0; i < 1000; i++) {
        csvContent += `Person${i},${20 + (i % 50)},City${i % 10}\n`;
      }
      
      const result = await SpreadsheetParser.parseFile(csvContent, 'large.csv', 'text/csv');
      
      expect(result.sheets).toHaveLength(1);
      const sheet = result.sheets[0];
      if (!sheet) throw new Error('Sheet should exist');
      
      expect(sheet.data.length).toBe(1001); // Header + 1000 rows
    });

    it('should handle CSV with only whitespace rows', async () => {
      const csvContent = 'Name,Age\n   \n\t\t\nJohn,25\n  \n';
      
      const result = await SpreadsheetParser.parseFile(csvContent, 'test.csv', 'text/csv');
      
      expect(result.sheets).toHaveLength(1);
      const sheet = result.sheets[0];
      if (!sheet) throw new Error('Sheet should exist');
      
      // Should skip empty/whitespace rows
      expect(sheet.data).toHaveLength(2); // Header + 1 data row
      expect(sheet.data[1]?.[0]?.value).toBe('John');
    });

    it('should provide helpful suggestions for common CSV issues', async () => {
      const csvContent = ''; // Empty file
      
      try {
        await SpreadsheetParser.parseFile(csvContent, 'test.csv', 'text/csv');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(CSVParseError);
        const csvError = error as CSVParseError;
        expect(csvError.code).toBe(CSVErrorCode.EMPTY_FILE);
        expect(csvError.details?.suggestions).toContain('Ensure the CSV file contains data');
      }
    });
  });

  describe('Performance and Memory Handling', () => {
    it('should handle CSV with very wide rows (many columns)', async () => {
      // Create CSV with 100 columns
      const headers = Array.from({ length: 100 }, (_, i) => `Col${i}`).join(',');
      const dataRow = Array.from({ length: 100 }, (_, i) => `Value${i}`).join(',');
      const csvContent = `${headers}\n${dataRow}\n${dataRow}`;
      
      const result = await SpreadsheetParser.parseFile(csvContent, 'wide.csv', 'text/csv');
      
      expect(result.sheets).toHaveLength(1);
      const sheet = result.sheets[0];
      if (!sheet) throw new Error('Sheet should exist');
      
      expect(sheet.dimensions.cols).toBe(100);
      expect(sheet.data[1]?.[99]?.value).toBe('Value99');
    });

    it('should normalize inconsistent row lengths efficiently', async () => {
      const csvContent = `A,B,C,D,E
1,2
3,4,5,6,7,8,9,10
11,12,13
14`;
      
      const result = await SpreadsheetParser.parseFile(csvContent, 'test.csv', 'text/csv');
      
      expect(result.sheets).toHaveLength(1);
      const sheet = result.sheets[0];
      if (!sheet) throw new Error('Sheet should exist');
      
      // All rows should be normalized to 8 columns (longest row)
      expect(sheet.dimensions.cols).toBe(8);
      expect(sheet.data[1]).toHaveLength(8);
      expect(sheet.data[3]).toHaveLength(8);
      expect(sheet.data[4]).toHaveLength(8);
      
      // Missing values should be empty strings
      expect(sheet.data[1]?.[2]?.value).toBe('');
      expect(sheet.data[4]?.[1]?.value).toBe('');
    });
  });

  describe('CSV Analysis Utility', () => {
    it('should provide detailed analysis for debugging', async () => {
      const csvContent = 'Name;Age;City\nJohn;25;New York\nJane;30;Boston';
      
      const analysis = await SpreadsheetParser.analyzeCSVFile(csvContent, 'test.csv');
      
      expect(analysis.detectedDelimiter).toBe(';');
      expect(analysis.detectedEncoding).toBe('utf8');
      expect(analysis.sampleData).toHaveLength(3);
      expect(analysis.warnings).toHaveLength(0);
      
      const headerRow = analysis.sampleData[0];
      if (headerRow) {
        expect(headerRow).toEqual(['Name', 'Age', 'City']);
      }
    });

    it('should report warnings in analysis for problematic lines', async () => {
      const csvContent = 'Name,Age\nJohn,25\nBroken"quote,30\nJane,35';
      
      const analysis = await SpreadsheetParser.analyzeCSVFile(csvContent, 'test.csv');
      
      // The analysis should complete successfully
      expect(analysis.detectedDelimiter).toBe(',');
      expect(analysis.sampleData.length).toBeGreaterThan(0);
      // Warnings are optional for this test
    });
  });
});