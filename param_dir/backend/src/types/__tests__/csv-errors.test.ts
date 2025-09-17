/**
 * Tests for CSV error handling classes and functions
 */

import { CSVError, CSVErrorFactory, CSVErrorCode } from '../csv-errors';

describe('CSVError', () => {
  describe('constructor', () => {
    it('should create a basic CSV error', () => {
      const error = new CSVError(
        'Test error message',
        CSVErrorCode.PARSE_ERROR
      );

      expect(error.message).toBe('Test error message');
      expect(error.code).toBe(CSVErrorCode.PARSE_ERROR);
      expect(error.name).toBe('CSVError');
      expect(error.details.suggestions).toEqual(expect.any(Array));
      expect(error.timestamp).toBeDefined();
    });

    it('should create a CSV error with custom details', () => {
      const details = {
        detectedDelimiter: ',',
        detectedEncoding: 'utf8',
        rowNumber: 5,
        suggestions: ['Custom suggestion']
      };

      const error = new CSVError(
        'Test error with details',
        CSVErrorCode.MALFORMED_CSV,
        details
      );

      expect(error.details.detectedDelimiter).toBe(',');
      expect(error.details.detectedEncoding).toBe('utf8');
      expect(error.details.rowNumber).toBe(5);
      expect(error.details.suggestions).toContain('Custom suggestion');
    });

    it('should add default suggestions based on error code', () => {
      const error = new CSVError(
        'Delimiter detection failed',
        CSVErrorCode.DELIMITER_DETECTION_FAILED
      );

      expect(error.details.suggestions).toContain(
        'Ensure your CSV uses standard delimiters: comma (,), semicolon (;), tab, or pipe (|)'
      );
    });

    it('should merge custom and default suggestions without duplicates', () => {
      const customSuggestion = 'Check the file format';
      const error = new CSVError(
        'Test error',
        CSVErrorCode.EMPTY_FILE,
        { suggestions: [customSuggestion] }
      );

      const suggestions = error.details.suggestions;
      expect(suggestions).toContain(customSuggestion);
      expect(suggestions.length).toBe(new Set(suggestions).size); // No duplicates
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should return basic message when no context info available', () => {
      const error = new CSVError(
        'Basic error',
        CSVErrorCode.PARSE_ERROR
      );

      expect(error.getUserFriendlyMessage()).toBe('Basic error');
    });

    it('should include row number in context', () => {
      const error = new CSVError(
        'Row error',
        CSVErrorCode.ROW_PARSING_FAILED,
        { rowNumber: 10 }
      );

      const message = error.getUserFriendlyMessage();
      expect(message).toContain('Row 10');
    });

    it('should include delimiter information', () => {
      const error = new CSVError(
        'Delimiter error',
        CSVErrorCode.DELIMITER_DETECTION_FAILED,
        { detectedDelimiter: ';' }
      );

      const message = error.getUserFriendlyMessage();
      expect(message).toContain('Detected delimiter: ";"');
    });

    it('should include encoding information', () => {
      const error = new CSVError(
        'Encoding error',
        CSVErrorCode.ENCODING_DETECTION_FAILED,
        { detectedEncoding: 'utf8' }
      );

      const message = error.getUserFriendlyMessage();
      expect(message).toContain('Detected encoding: utf8');
    });

    it('should include column count mismatch information', () => {
      const error = new CSVError(
        'Column mismatch',
        CSVErrorCode.COLUMN_COUNT_MISMATCH,
        { expectedColumns: 5, actualColumns: 3 }
      );

      const message = error.getUserFriendlyMessage();
      expect(message).toContain('Expected 5 columns, found 3');
    });
  });

  describe('toApiError', () => {
    it('should convert to API error format', () => {
      const error = new CSVError(
        'Test error',
        CSVErrorCode.MALFORMED_CSV,
        {
          rowNumber: 5,
          detectedDelimiter: ',',
          suggestions: ['Fix the quotes']
        }
      );

      const apiError = error.toApiError();

      expect(apiError.code).toBe(CSVErrorCode.MALFORMED_CSV);
      expect(apiError.message).toContain('Test error');
      expect(apiError.details['rowNumber']).toBe(5);
      expect(apiError.details['detectedDelimiter']).toBe(',');
      expect(apiError.details['errorType']).toBe('CSV_ERROR');
      expect(apiError.suggestions).toContain('Fix the quotes');
      expect(apiError.timestamp).toBeDefined();
    });
  });
});

describe('CSVErrorFactory', () => {
  describe('delimiterDetectionFailed', () => {
    it('should create delimiter detection error with attempted delimiters', () => {
      const attemptedDelimiters = [',', ';', '\t'];
      const error = CSVErrorFactory.delimiterDetectionFailed(attemptedDelimiters);

      expect(error.code).toBe(CSVErrorCode.DELIMITER_DETECTION_FAILED);
      expect(error.message).toContain('Could not automatically detect the CSV delimiter');
      expect(error.details.fallbackOptions?.delimiters).toEqual(attemptedDelimiters);
      expect(error.details.suggestions).toContain('Tried delimiters: ,, ;, \t');
    });
  });

  describe('encodingDetectionFailed', () => {
    it('should create encoding detection error with attempted encodings', () => {
      const attemptedEncodings = ['utf8', 'latin1'];
      const error = CSVErrorFactory.encodingDetectionFailed(attemptedEncodings);

      expect(error.code).toBe(CSVErrorCode.ENCODING_DETECTION_FAILED);
      expect(error.message).toContain('Could not detect the file encoding');
      expect(error.details.fallbackOptions?.encodings).toEqual(attemptedEncodings);
      expect(error.details.suggestions).toContain('Tried encodings: utf8, latin1');
    });
  });

  describe('malformedCSV', () => {
    it('should create malformed CSV error with row and issue details', () => {
      const rowNumber = 10;
      const issue = 'Unmatched quotes';
      const error = CSVErrorFactory.malformedCSV(rowNumber, issue);

      expect(error.code).toBe(CSVErrorCode.MALFORMED_CSV);
      expect(error.message).toContain(issue);
      expect(error.details.rowNumber).toBe(rowNumber);
      expect(error.details.suggestions).toContain(`Issue found at row ${rowNumber}: ${issue}`);
    });
  });

  describe('inconsistentColumns', () => {
    it('should create inconsistent columns error with column count details', () => {
      const rowNumber = 5;
      const expected = 10;
      const actual = 7;
      const error = CSVErrorFactory.inconsistentColumns(rowNumber, expected, actual);

      expect(error.code).toBe(CSVErrorCode.INCONSISTENT_COLUMNS);
      expect(error.message).toContain('Inconsistent number of columns detected');
      expect(error.details.rowNumber).toBe(rowNumber);
      expect(error.details.expectedColumns).toBe(expected);
      expect(error.details.actualColumns).toBe(actual);
      expect(error.details.suggestions).toContain(
        `Row ${rowNumber} has ${actual} columns, but expected ${expected}`
      );
    });
  });

  describe('emptyFile', () => {
    it('should create empty file error', () => {
      const error = CSVErrorFactory.emptyFile();

      expect(error.code).toBe(CSVErrorCode.EMPTY_FILE);
      expect(error.message).toContain('The CSV file is empty or contains no valid data');
      expect(error.details.suggestions).toContain('Ensure the CSV file contains data');
    });
  });

  describe('parseError', () => {
    it('should create parse error from original error', () => {
      const originalError = new Error('Original parsing failed');
      const error = CSVErrorFactory.parseError(originalError);

      expect(error.code).toBe(CSVErrorCode.PARSE_ERROR);
      expect(error.message).toContain('Failed to parse CSV file: Original parsing failed');
      expect(error.details.suggestions).toContain('Original parsing failed');
    });
  });

  describe('rowParsingFailed', () => {
    it('should create row parsing error with row number and original error', () => {
      const rowNumber = 15;
      const originalError = new Error('Invalid character');
      const error = CSVErrorFactory.rowParsingFailed(rowNumber, originalError);

      expect(error.code).toBe(CSVErrorCode.ROW_PARSING_FAILED);
      expect(error.message).toContain(`Failed to parse row ${rowNumber}`);
      expect(error.details.rowNumber).toBe(rowNumber);
      expect(error.details.suggestions).toContain(`Error in row ${rowNumber}: Invalid character`);
    });
  });
});

describe('Error code suggestions', () => {
  it('should provide appropriate suggestions for each error code', () => {
    const errorCodes = Object.values(CSVErrorCode);
    
    errorCodes.forEach(code => {
      const error = new CSVError('Test message', code);
      expect(error.details.suggestions.length).toBeGreaterThan(0);
      expect(error.details.suggestions.every(s => typeof s === 'string')).toBe(true);
    });
  });

  it('should provide specific suggestions for delimiter detection failure', () => {
    const error = new CSVError('Test', CSVErrorCode.DELIMITER_DETECTION_FAILED);
    const suggestions = error.details.suggestions;
    
    expect(suggestions).toContain(
      'Ensure your CSV uses standard delimiters: comma (,), semicolon (;), tab, or pipe (|)'
    );
    expect(suggestions).toContain(
      'Check if the file is properly formatted with consistent delimiters'
    );
  });

  it('should provide specific suggestions for encoding detection failure', () => {
    const error = new CSVError('Test', CSVErrorCode.ENCODING_DETECTION_FAILED);
    const suggestions = error.details.suggestions;
    
    expect(suggestions).toContain('Save the CSV file with UTF-8 encoding');
    expect(suggestions).toContain('If using Excel, use "Save As" and select "CSV UTF-8" format');
  });

  it('should provide specific suggestions for malformed CSV', () => {
    const error = new CSVError('Test', CSVErrorCode.MALFORMED_CSV);
    const suggestions = error.details.suggestions;
    
    expect(suggestions).toContain('Check for unmatched quotes in your CSV data');
    expect(suggestions).toContain('Ensure all quoted fields are properly closed');
  });

  it('should provide specific suggestions for inconsistent columns', () => {
    const error = new CSVError('Test', CSVErrorCode.INCONSISTENT_COLUMNS);
    const suggestions = error.details.suggestions;
    
    expect(suggestions).toContain('Ensure all rows have the same number of columns');
    expect(suggestions).toContain('Check for missing commas or extra delimiters in some rows');
  });

  it('should provide specific suggestions for empty file', () => {
    const error = new CSVError('Test', CSVErrorCode.EMPTY_FILE);
    const suggestions = error.details.suggestions;
    
    expect(suggestions).toContain('Ensure the CSV file contains data');
    expect(suggestions).toContain('Check if the file was saved properly');
  });
});