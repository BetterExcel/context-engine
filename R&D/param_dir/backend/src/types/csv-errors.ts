/**
 * CSV-specific error handling types and classes
 */

export enum CSVErrorCode {
  DELIMITER_DETECTION_FAILED = 'CSV_DELIMITER_DETECTION_FAILED',
  ENCODING_DETECTION_FAILED = 'CSV_ENCODING_DETECTION_FAILED',
  MALFORMED_CSV = 'CSV_MALFORMED',
  INCONSISTENT_COLUMNS = 'CSV_INCONSISTENT_COLUMNS',
  EMPTY_FILE = 'CSV_EMPTY_FILE',
  PARSE_ERROR = 'CSV_PARSE_ERROR',
  INVALID_DELIMITER = 'CSV_INVALID_DELIMITER',
  ENCODING_CONVERSION_FAILED = 'CSV_ENCODING_CONVERSION_FAILED',
  ROW_PARSING_FAILED = 'CSV_ROW_PARSING_FAILED',
  COLUMN_COUNT_MISMATCH = 'CSV_COLUMN_COUNT_MISMATCH'
}

export interface CSVErrorDetails {
  detectedDelimiter?: string;
  detectedEncoding?: string;
  rowNumber?: number;
  columnCount?: number;
  expectedColumns?: number;
  actualColumns?: number;
  suggestions: string[];
  fallbackOptions?: {
    delimiters?: string[];
    encodings?: string[];
  };
}

export class CSVError extends Error {
  public readonly code: CSVErrorCode;
  public readonly details: CSVErrorDetails;
  public readonly timestamp: string;

  constructor(
    message: string,
    code: CSVErrorCode,
    details: Partial<CSVErrorDetails> = {}
  ) {
    super(message);
    this.name = 'CSVError';
    this.code = code;
    this.timestamp = new Date().toISOString();
    
    // Ensure suggestions array exists
    this.details = {
      suggestions: [],
      ...details
    };

    // Add default suggestions based on error code
    this.addDefaultSuggestions();
  }

  private addDefaultSuggestions(): void {
    const defaultSuggestions = this.getDefaultSuggestions(this.code);
    
    // Merge with existing suggestions, avoiding duplicates
    const existingSuggestions = this.details.suggestions || [];
    const allSuggestions = [...existingSuggestions, ...defaultSuggestions];
    this.details.suggestions = Array.from(new Set(allSuggestions));
  }

  private getDefaultSuggestions(code: CSVErrorCode): string[] {
    switch (code) {
      case CSVErrorCode.DELIMITER_DETECTION_FAILED:
        return [
          'Ensure your CSV uses standard delimiters: comma (,), semicolon (;), tab, or pipe (|)',
          'Check if the file is properly formatted with consistent delimiters',
          'Try opening the file in a text editor to verify the delimiter',
          'Consider manually specifying the delimiter if auto-detection fails'
        ];

      case CSVErrorCode.ENCODING_DETECTION_FAILED:
        return [
          'Save the CSV file with UTF-8 encoding',
          'If using Excel, use "Save As" and select "CSV UTF-8" format',
          'Check if the file contains special characters that require specific encoding',
          'Try converting the file encoding using a text editor'
        ];

      case CSVErrorCode.MALFORMED_CSV:
        return [
          'Check for unmatched quotes in your CSV data',
          'Ensure all quoted fields are properly closed',
          'Look for line breaks within quoted fields',
          'Verify that special characters are properly escaped'
        ];

      case CSVErrorCode.INCONSISTENT_COLUMNS:
        return [
          'Ensure all rows have the same number of columns',
          'Check for missing commas or extra delimiters in some rows',
          'Look for merged cells or irregular data structure',
          'Consider adding empty values for missing columns'
        ];

      case CSVErrorCode.EMPTY_FILE:
        return [
          'Ensure the CSV file contains data',
          'Check if the file was saved properly',
          'Verify the file is not corrupted',
          'Make sure there are data rows beyond just headers'
        ];

      case CSVErrorCode.PARSE_ERROR:
        return [
          'Check the CSV file format and structure',
          'Ensure the file is not corrupted',
          'Try opening the file in a spreadsheet application to verify it loads correctly',
          'Consider re-saving the file in standard CSV format'
        ];

      case CSVErrorCode.INVALID_DELIMITER:
        return [
          'Use standard CSV delimiters: comma, semicolon, tab, or pipe',
          'Avoid using delimiters that appear in your data values',
          'Consider using quotes around fields that contain delimiter characters'
        ];

      case CSVErrorCode.ENCODING_CONVERSION_FAILED:
        return [
          'The file encoding could not be converted to UTF-8',
          'Try saving the file with UTF-8 encoding',
          'Check if the file contains unsupported characters',
          'Consider using a different text encoding'
        ];

      case CSVErrorCode.ROW_PARSING_FAILED:
        return [
          'Check the specific row for formatting issues',
          'Look for unmatched quotes or special characters',
          'Ensure the row follows the same structure as other rows',
          'Consider removing or fixing the problematic row'
        ];

      case CSVErrorCode.COLUMN_COUNT_MISMATCH:
        return [
          'Ensure all rows have the same number of columns as the header',
          'Check for missing or extra delimiters in the problematic row',
          'Look for data that spans multiple columns incorrectly',
          'Consider padding short rows with empty values'
        ];

      default:
        return [
          'Check the CSV file format and structure',
          'Ensure the file follows standard CSV conventions',
          'Try re-saving the file in a standard CSV format'
        ];
    }
  }

  /**
   * Get user-friendly error message with context
   */
  public getUserFriendlyMessage(): string {
    const baseMessage = this.message;
    const contextInfo = this.getContextInfo();
    
    if (contextInfo) {
      return `${baseMessage} ${contextInfo}`;
    }
    
    return baseMessage;
  }

  private getContextInfo(): string {
    const parts: string[] = [];
    
    if (this.details.rowNumber) {
      parts.push(`(Row ${this.details.rowNumber})`);
    }
    
    if (this.details.detectedDelimiter) {
      parts.push(`Detected delimiter: "${this.details.detectedDelimiter}"`);
    }
    
    if (this.details.detectedEncoding) {
      parts.push(`Detected encoding: ${this.details.detectedEncoding}`);
    }
    
    if (this.details.expectedColumns && this.details.actualColumns) {
      parts.push(`Expected ${this.details.expectedColumns} columns, found ${this.details.actualColumns}`);
    }
    
    return parts.length > 0 ? `- ${parts.join(', ')}` : '';
  }

  /**
   * Convert to API error format
   */
  public toApiError(): {
    code: string;
    message: string;
    details: Record<string, any>;
    suggestions: string[];
    timestamp: string;
  } {
    return {
      code: this.code,
      message: this.getUserFriendlyMessage(),
      details: {
        ...this.details,
        errorType: 'CSV_ERROR'
      },
      suggestions: this.details.suggestions,
      timestamp: this.timestamp
    };
  }
}

/**
 * Factory functions for creating specific CSV errors
 */
export class CSVErrorFactory {
  static delimiterDetectionFailed(attemptedDelimiters: string[]): CSVError {
    return new CSVError(
      'Could not automatically detect the CSV delimiter',
      CSVErrorCode.DELIMITER_DETECTION_FAILED,
      {
        fallbackOptions: {
          delimiters: attemptedDelimiters
        },
        suggestions: [
          `Tried delimiters: ${attemptedDelimiters.join(', ')}`,
          'The file may use an uncommon delimiter or have inconsistent formatting'
        ]
      }
    );
  }

  static encodingDetectionFailed(attemptedEncodings: string[]): CSVError {
    return new CSVError(
      'Could not detect the file encoding',
      CSVErrorCode.ENCODING_DETECTION_FAILED,
      {
        fallbackOptions: {
          encodings: attemptedEncodings
        },
        suggestions: [
          `Tried encodings: ${attemptedEncodings.join(', ')}`,
          'The file may contain characters not supported by common encodings'
        ]
      }
    );
  }

  static malformedCSV(rowNumber: number, issue: string): CSVError {
    return new CSVError(
      `CSV format error: ${issue}`,
      CSVErrorCode.MALFORMED_CSV,
      {
        rowNumber,
        suggestions: [
          `Issue found at row ${rowNumber}: ${issue}`,
          'Check for unmatched quotes or special characters in this row'
        ]
      }
    );
  }

  static inconsistentColumns(rowNumber: number, expected: number, actual: number): CSVError {
    return new CSVError(
      'Inconsistent number of columns detected',
      CSVErrorCode.INCONSISTENT_COLUMNS,
      {
        rowNumber,
        expectedColumns: expected,
        actualColumns: actual,
        suggestions: [
          `Row ${rowNumber} has ${actual} columns, but expected ${expected}`,
          'Check for missing or extra delimiters in this row'
        ]
      }
    );
  }

  static emptyFile(): CSVError {
    return new CSVError(
      'The CSV file is empty or contains no valid data',
      CSVErrorCode.EMPTY_FILE
    );
  }

  static parseError(originalError: Error): CSVError {
    return new CSVError(
      `Failed to parse CSV file: ${originalError.message}`,
      CSVErrorCode.PARSE_ERROR,
      {
        suggestions: [
          'The file may be corrupted or in an unsupported format',
          originalError.message
        ]
      }
    );
  }

  static rowParsingFailed(rowNumber: number, originalError: Error): CSVError {
    return new CSVError(
      `Failed to parse row ${rowNumber}`,
      CSVErrorCode.ROW_PARSING_FAILED,
      {
        rowNumber,
        suggestions: [
          `Error in row ${rowNumber}: ${originalError.message}`,
          'This row may have formatting issues or special characters'
        ]
      }
    );
  }
}