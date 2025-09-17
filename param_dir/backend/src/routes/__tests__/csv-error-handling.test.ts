/**
 * Integration tests for CSV error handling in upload routes
 */

import request from 'supertest';
import path from 'path';
import fs from 'fs';
import app from '../../index';
import { CSVErrorCode } from '../../types/csv-errors';

describe('CSV Error Handling Integration Tests', () => {
  const testFilesDir = path.join(__dirname, '../../test/fixtures/csv-error-tests');

  beforeAll(async () => {
    // Create test fixtures directory if it doesn't exist
    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true });
    }

    // Create test CSV files for error scenarios
    createTestCSVFiles();
  });

  afterAll(async () => {
    // Clean up test files
    if (fs.existsSync(testFilesDir)) {
      fs.rmSync(testFilesDir, { recursive: true, force: true });
    }
  });

  describe('Empty CSV file handling', () => {
    it('should return CSV_EMPTY_FILE error for completely empty file', async () => {
      const response = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', path.join(testFilesDir, 'empty.csv'))
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe(CSVErrorCode.EMPTY_FILE);
      expect(response.body.error.message).toContain('empty');
      expect(response.body.error.suggestions).toBeInstanceOf(Array);
      expect(response.body.error.suggestions.length).toBeGreaterThan(0);
      expect(response.body.error.details.errorType).toBe('CSV_ERROR');
    });

    it('should return CSV_EMPTY_FILE error for file with only whitespace', async () => {
      const response = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', path.join(testFilesDir, 'whitespace-only.csv'))
        .expect(400);

      expect(response.body.error.code).toBe(CSVErrorCode.EMPTY_FILE);
    });
  });

  describe('Malformed CSV handling', () => {
    it('should return CSV_MALFORMED error for unmatched quotes', async () => {
      const response = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', path.join(testFilesDir, 'unmatched-quotes.csv'))
        .expect(400);

      expect(response.body.error.code).toBe(CSVErrorCode.MALFORMED_CSV);
      expect(response.body.error.message).toContain('format error');
      expect(response.body.error.details.rowNumber).toBeDefined();
      expect(response.body.error.suggestions).toContain(
        expect.stringMatching(/quotes/i)
      );
    });

    it('should return CSV_MALFORMED error for invalid escape sequences', async () => {
      const response = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', path.join(testFilesDir, 'invalid-escapes.csv'))
        .expect(400);

      expect(response.body.error.code).toBe(CSVErrorCode.MALFORMED_CSV);
    });
  });

  describe('Inconsistent columns handling', () => {
    it('should return CSV_INCONSISTENT_COLUMNS error for varying column counts', async () => {
      const response = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', path.join(testFilesDir, 'inconsistent-columns.csv'))
        .expect(400);

      expect(response.body.error.code).toBe(CSVErrorCode.INCONSISTENT_COLUMNS);
      expect(response.body.error.details.expectedColumns).toBeDefined();
      expect(response.body.error.details.actualColumns).toBeDefined();
      expect(response.body.error.details.rowNumber).toBeDefined();
      expect(response.body.error.suggestions).toContain(
        expect.stringMatching(/columns/i)
      );
    });
  });

  describe('Delimiter detection failure handling', () => {
    it('should return CSV_DELIMITER_DETECTION_FAILED for unusual delimiters', async () => {
      const response = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', path.join(testFilesDir, 'unusual-delimiter.csv'))
        .expect(400);

      expect(response.body.error.code).toBe(CSVErrorCode.DELIMITER_DETECTION_FAILED);
      expect(response.body.error.details.fallbackOptions?.delimiters).toBeDefined();
      expect(response.body.error.suggestions).toContain(
        expect.stringMatching(/delimiter/i)
      );
    });
  });

  describe('Encoding detection failure handling', () => {
    it('should handle encoding issues gracefully with fallback', async () => {
      // This test might succeed with fallback encoding or fail with encoding error
      const response = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', path.join(testFilesDir, 'bad-encoding.csv'));

      if (response.status === 400) {
        expect(response.body.error.code).toBe(CSVErrorCode.ENCODING_DETECTION_FAILED);
        expect(response.body.error.details.fallbackOptions?.encodings).toBeDefined();
        expect(response.body.error.suggestions).toContain(
          expect.stringMatching(/encoding/i)
        );
      } else {
        // Fallback succeeded
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      }
    });
  });

  describe('Row parsing failure handling', () => {
    it('should return CSV_ROW_PARSING_FAILED for severely malformed rows', async () => {
      const response = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', path.join(testFilesDir, 'malformed-rows.csv'))
        .expect(400);

      expect(response.body.error.code).toBe(CSVErrorCode.ROW_PARSING_FAILED);
      expect(response.body.error.details.rowNumber).toBeDefined();
      expect(response.body.error.suggestions).toContain(
        expect.stringMatching(/row/i)
      );
    });
  });

  describe('Fallback strategies', () => {
    it('should successfully parse CSV with semicolon delimiter using fallback', async () => {
      const response = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', path.join(testFilesDir, 'semicolon-fallback.csv'))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.spreadsheetData).toBeDefined();
      // Should have detected semicolon delimiter
      expect(response.body.data.spreadsheetData.sheets[0].data.length).toBeGreaterThan(0);
    });

    it('should successfully parse CSV with tab delimiter using fallback', async () => {
      const response = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', path.join(testFilesDir, 'tab-fallback.csv'))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.spreadsheetData).toBeDefined();
    });

    it('should successfully parse CSV with different encoding using fallback', async () => {
      const response = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', path.join(testFilesDir, 'latin1-fallback.csv'))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.spreadsheetData).toBeDefined();
    });
  });

  describe('Error message quality', () => {
    it('should provide helpful suggestions for CSV errors', async () => {
      const response = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', path.join(testFilesDir, 'empty.csv'))
        .expect(400);

      const suggestions = response.body.error.suggestions;
      expect(suggestions).toBeInstanceOf(Array);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.every((s: any) => typeof s === 'string')).toBe(true);
      expect(suggestions.some((s: string) => s.includes('CSV'))).toBe(true);
    });

    it('should include context information in error details', async () => {
      const response = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', path.join(testFilesDir, 'inconsistent-columns.csv'))
        .expect(400);

      const details = response.body.error.details;
      expect(details.errorType).toBe('CSV_ERROR');
      expect(details.fileType).toBe('CSV');
    });

    it('should provide timestamp for error tracking', async () => {
      const response = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', path.join(testFilesDir, 'empty.csv'))
        .expect(400);

      expect(response.body.error.timestamp).toBeDefined();
      expect(new Date(response.body.error.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('Performance with error handling', () => {
    it('should fail fast for obviously malformed files', async () => {
      const startTime = Date.now();
      
      await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', path.join(testFilesDir, 'empty.csv'))
        .expect(400);

      const processingTime = Date.now() - startTime;
      expect(processingTime).toBeLessThan(1000); // Should fail quickly
    });

    it('should not hang on severely malformed files', async () => {
      const response = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', path.join(testFilesDir, 'malformed-rows.csv'))
        .timeout(5000) // 5 second timeout
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });
});

/**
 * Create test CSV files for error scenarios
 */
function createTestCSVFiles() {
  const testFilesDir = path.join(__dirname, '../../test/fixtures/csv-error-tests');

  // Empty file
  fs.writeFileSync(path.join(testFilesDir, 'empty.csv'), '');

  // File with only whitespace
  fs.writeFileSync(path.join(testFilesDir, 'whitespace-only.csv'), '   \n  \n  ');

  // File with unmatched quotes
  fs.writeFileSync(path.join(testFilesDir, 'unmatched-quotes.csv'), 
    'name,value\n"John Doe,123\n"Jane Smith",456');

  // File with invalid escape sequences
  fs.writeFileSync(path.join(testFilesDir, 'invalid-escapes.csv'), 
    'name,value\n"John\\nDoe",123\n"Jane\\tSmith",456');

  // File with inconsistent column counts
  fs.writeFileSync(path.join(testFilesDir, 'inconsistent-columns.csv'), 
    'name,age,city\nJohn,25,NYC\nJane,30\nBob,35,LA,Extra');

  // File with unusual delimiter (using @ symbol)
  fs.writeFileSync(path.join(testFilesDir, 'unusual-delimiter.csv'), 
    'name@age@city\nJohn@25@NYC\nJane@30@Boston');

  // File with bad encoding (binary data that's not valid text)
  const badEncodingBuffer = Buffer.from([0xFF, 0xFE, 0x00, 0x00, 0x41, 0x42, 0x43]);
  fs.writeFileSync(path.join(testFilesDir, 'bad-encoding.csv'), badEncodingBuffer);

  // File with severely malformed rows
  fs.writeFileSync(path.join(testFilesDir, 'malformed-rows.csv'), 
    'name,age,city\nJohn,25,NYC\n"Broken\nrow\nwith\nlinebreaks",30,Boston\nJane,35,LA');

  // File with semicolon delimiter for fallback testing
  fs.writeFileSync(path.join(testFilesDir, 'semicolon-fallback.csv'), 
    'name;age;city\nJohn;25;NYC\nJane;30;Boston\nBob;35;LA');

  // File with tab delimiter for fallback testing
  fs.writeFileSync(path.join(testFilesDir, 'tab-fallback.csv'), 
    'name\tage\tcity\nJohn\t25\tNYC\nJane\t30\tBoston\nBob\t35\tLA');

  // File with Latin1 encoding for fallback testing
  const latin1Content = 'name,city\nJosé,São Paulo\nFrançois,Montréal';
  fs.writeFileSync(path.join(testFilesDir, 'latin1-fallback.csv'), 
    Buffer.from(latin1Content, 'latin1'));
}