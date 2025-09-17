import * as XLSX from 'xlsx';
import { 
  SpreadsheetData, 
  Sheet, 
  Cell, 
  DataType, 
  Formula, 
  NamedRange, 
  FileMetadata,
  DataBoundaries
} from '../types/spreadsheet';
import { DataBoundaryAnalyzer } from './DataBoundaryAnalyzer';

// CSV-specific interfaces and types
export interface CSVParseConfig {
  delimiter?: string;
  encoding?: string;
  hasHeaders?: boolean;
  skipEmptyLines?: boolean;
  trimWhitespace?: boolean;
  maxRows?: number;
  fallbackDelimiters?: string[];
}

export interface CSVParseResult {
  data: any[][];
  delimiter: string;
  encoding: string;
  headers?: string[];
  dataTypes: DataType[];
  warnings: string[];
  rowCount: number;
  columnCount: number;
}

import { CSVError, CSVErrorFactory, CSVErrorCode } from '../types/csv-errors';

export interface ParseOptions {
  includeFormulas?: boolean;
  includeDependencies?: boolean;
  maxRows?: number;
  maxCols?: number;
}

export class SpreadsheetParseError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = 'SpreadsheetParseError';
  }
}

export class SpreadsheetParser {
  private static readonly SUPPORTED_FORMATS = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv', // .csv
    'application/csv', // .csv alternative
    'application/x-csv', // .csv alternative
    'text/x-csv', // .csv alternative
    'text/comma-separated-values' // .csv alternative
    // Note: text/plain and application/octet-stream are handled specially for CSV files only
  ];

  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private static readonly DEFAULT_MAX_ROWS = 10000;
  private static readonly DEFAULT_MAX_COLS = 1000;

  // CSV-specific constants
  private static readonly CSV_DELIMITERS = [',', ';', '\t', '|'];
  private static readonly DELIMITER_ANALYSIS_ROWS = 10;

  /**
   * Parse a spreadsheet file and return structured data
   */
  public static async parseFile(
    file: Buffer | string, 
    filename: string, 
    mimeType: string,
    options: ParseOptions = {}
  ): Promise<SpreadsheetData> {
    try {
      // Validate file
      this.validateFile(file, filename, mimeType);

      // Parse based on file type
      const workbook = this.parseWorkbook(file, filename, mimeType);
      
      // Extract data
      const sheets = this.extractSheets(workbook, options);
      const formulas = options.includeFormulas ? this.extractFormulas(workbook) : [];
      const namedRanges = this.extractNamedRanges(workbook);

      // Create metadata
      const metadata: FileMetadata = {
        filename,
        fileSize: Buffer.isBuffer(file) ? file.length : Buffer.byteLength(file),
        mimeType,
        uploadedAt: new Date(),
        ...(workbook.Props?.ModifiedDate && { lastModified: workbook.Props.ModifiedDate }),
        ...(workbook.Props?.Author && { creator: workbook.Props.Author }),
        ...(workbook.Props?.AppVersion && { version: workbook.Props.AppVersion })
      };

      // Perform boundary analysis on the first sheet (or active sheet)
      let boundaryAnalysis: DataBoundaries | undefined;
      let recommendedSelection: string | undefined;

      if (sheets.length > 0) {
        const primarySheet = sheets[0]; // Use first sheet for boundary analysis
        if (primarySheet) {
          const selectionAnalysis = DataBoundaryAnalyzer.analyzeSelection(primarySheet);
          boundaryAnalysis = selectionAnalysis.boundaries;
          recommendedSelection = selectionAnalysis.recommendedRange;
        }
      }

      const spreadsheetData: SpreadsheetData = {
        id: this.generateId(),
        sheets,
        metadata,
        formulas,
        namedRanges,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...(recommendedSelection && { recommendedSelection }),
        ...(boundaryAnalysis && { boundaryAnalysis })
      };

      return spreadsheetData;
    } catch (error) {
      if (error instanceof SpreadsheetParseError || error instanceof CSVError) {
        throw error;
      }
      throw new SpreadsheetParseError(
        `Failed to parse spreadsheet: ${error instanceof Error ? error.message : String(error)}`,
        'PARSE_ERROR',
        { originalError: error }
      );
    }
  }

  /**
   * Validate file format and size
   */
  private static validateFile(file: Buffer | string, filename: string, mimeType: string): void {
    // Check file size
    const fileSize = Buffer.isBuffer(file) ? file.length : Buffer.byteLength(file);
    if (fileSize > this.MAX_FILE_SIZE) {
      throw new SpreadsheetParseError(
        `File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`,
        'FILE_TOO_LARGE',
        { fileSize, maxSize: this.MAX_FILE_SIZE }
      );
    }

    // Check file format - be more lenient with CSV files
    const extension = filename.toLowerCase().split('.').pop();
    const isValidMimeType = this.SUPPORTED_FORMATS.includes(mimeType);
    const isValidExtension = ['xlsx', 'xls', 'csv'].includes(extension || '');
    
    // Special handling for CSV files which can have various MIME types
    const isCSVFile = extension === 'csv' || 
                      mimeType.includes('csv') || 
                      (mimeType === 'text/plain' && extension === 'csv');

    if (!isValidMimeType && !isValidExtension && !isCSVFile) {
      throw new SpreadsheetParseError(
        `Unsupported file format: ${extension || mimeType}`,
        'UNSUPPORTED_FORMAT',
        { 
          supportedFormats: ['xlsx', 'xls', 'csv'],
          receivedFormat: extension || mimeType,
          suggestions: [
            'Ensure the file has a .xlsx, .xls, or .csv extension',
            'For CSV files, save with UTF-8 encoding if possible'
          ]
        }
      );
    }
  }

  /**
   * Parse workbook using SheetJS
   */
  private static parseWorkbook(file: Buffer | string, filename: string, mimeType: string): XLSX.WorkBook {
    try {
      const extension = filename.toLowerCase().split('.').pop();
      
      if (extension === 'csv' || mimeType.includes('csv') || mimeType === 'text/plain') {
        // Handle CSV files with enhanced parsing
        return this.parseCSVFile(file, filename);
      } else {
        // Handle Excel files
        return XLSX.read(file, { 
          type: Buffer.isBuffer(file) ? 'buffer' : 'string',
          cellFormula: true,
          cellStyles: true,
          cellDates: true,
          raw: false
        });
      }
    } catch (error) {
      if (error instanceof CSVError) {
        throw error;
      }
      if (error instanceof SpreadsheetParseError) {
        throw error;
      }
      throw new SpreadsheetParseError(
        `Failed to parse workbook structure: ${error instanceof Error ? error.message : String(error)}`,
        'WORKBOOK_PARSE_ERROR',
        { originalError: error }
      );
    }
  }

  /**
   * Enhanced CSV file parsing with delimiter and encoding detection and fallback strategies
   */
  private static parseCSVFile(file: Buffer | string, filename: string): XLSX.WorkBook {
    const errors: CSVError[] = [];
    
    try {
      let buffer = Buffer.isBuffer(file) ? file : Buffer.from(file);
      
      // Try multiple encoding strategies
      const encodingStrategies = ['auto', 'utf8', 'latin1', 'utf16le'];
      let csvContent: string | null = null;
      let detectedEncoding = 'utf8';
      
      for (const encodingStrategy of encodingStrategies) {
        try {
          if (encodingStrategy === 'auto') {
            detectedEncoding = this.detectEncoding(buffer);
            
            // Handle UTF-16 BE BOM by swapping bytes
            if (buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
              const beBuffer = buffer.slice(2);
              const leBuffer = Buffer.alloc(beBuffer.length + 2);
              
              // Add UTF-16 LE BOM
              leBuffer[0] = 0xFF;
              leBuffer[1] = 0xFE;
              
              // Swap byte pairs
              for (let i = 0; i < beBuffer.length; i += 2) {
                if (i + 1 < beBuffer.length) {
                  const byte1 = beBuffer[i + 1];
                  const byte2 = beBuffer[i];
                  if (byte1 !== undefined && byte2 !== undefined) {
                    leBuffer[i + 2] = byte1;
                    leBuffer[i + 3] = byte2;
                  }
                } else if (i < beBuffer.length) {
                  const byte = beBuffer[i];
                  if (byte !== undefined) {
                    leBuffer[i + 2] = byte;
                  }
                }
              }
              buffer = leBuffer;
            }
          } else {
            detectedEncoding = encodingStrategy;
          }
          
          // Convert to string with encoding
          csvContent = buffer.toString(detectedEncoding as BufferEncoding);
          
          // Remove BOM characters if present
          csvContent = csvContent.replace(/^\uFEFF/, ''); // UTF-8 BOM
          csvContent = csvContent.replace(/^\uFFFE/, ''); // UTF-16 LE BOM
          
          // Check if content looks valid (no replacement characters)
          if (!csvContent.includes('\uFFFD') && csvContent.trim()) {
            break; // Successfully decoded
          }
          
          csvContent = null; // Reset for next attempt
        } catch (encodingError) {
          errors.push(CSVErrorFactory.encodingDetectionFailed([detectedEncoding]));
          continue;
        }
      }
      
      if (!csvContent || !csvContent.trim()) {
        throw CSVErrorFactory.emptyFile();
      }

      // Try multiple delimiter strategies
      const delimiterStrategies = ['auto', ',', ';', '\t', '|'];
      let parseResult: CSVParseResult | null = null;
      
      for (const delimiterStrategy of delimiterStrategies) {
        try {
          let delimiter: string;
          
          if (delimiterStrategy === 'auto') {
            delimiter = this.detectDelimiter(csvContent);
          } else {
            delimiter = delimiterStrategy;
          }
          
          // Attempt to parse with this delimiter
          parseResult = this.parseCSVContent(csvContent, delimiter, detectedEncoding);
          
          // Validate the parse result
          if (parseResult.data.length > 0 && parseResult.columnCount > 0) {
            // Check for reasonable column consistency
            const firstRowColumns = parseResult.data[0]?.length || 0;
            const inconsistentRows = parseResult.data.filter(row => 
              Math.abs(row.length - firstRowColumns) > 1
            ).length;
            
            // If less than 20% of rows are inconsistent, consider it successful
            if (inconsistentRows / parseResult.data.length < 0.2) {
              break; // Successfully parsed
            }
          }
          
          parseResult = null; // Reset for next attempt
        } catch (delimiterError) {
          if (delimiterError instanceof CSVError) {
            errors.push(delimiterError);
          }
          continue;
        }
      }
      
      if (!parseResult) {
        // All strategies failed, throw the most relevant error
        const delimiterError = errors.find(e => e.code === CSVErrorCode.DELIMITER_DETECTION_FAILED);
        if (delimiterError) {
          throw delimiterError;
        }
        
        throw CSVErrorFactory.parseError(new Error('All parsing strategies failed'));
      }
      
      // Convert to XLSX workbook format
      return this.convertCSVToWorkbook(parseResult, filename);
      
    } catch (error) {
      if (error instanceof CSVError) {
        throw error;
      }
      throw CSVErrorFactory.parseError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Detect CSV delimiter by analyzing first few rows
   */
  private static detectDelimiter(csvContent: string): string {
    const lines = csvContent.split('\n').slice(0, this.DELIMITER_ANALYSIS_ROWS);
    const delimiterScores: { [key: string]: number } = {};
    
    // Initialize scores
    this.CSV_DELIMITERS.forEach(delimiter => {
      delimiterScores[delimiter] = 0;
    });

    // Analyze each line
    for (const line of lines) {
      if (!line.trim()) continue;
      
      for (const delimiter of this.CSV_DELIMITERS) {
        // Count occurrences, but be smart about quoted content
        const count = this.countDelimiterOccurrences(line, delimiter);
        const currentScore = delimiterScores[delimiter];
        if (currentScore !== undefined) {
          delimiterScores[delimiter] = currentScore + count;
        }
      }
    }

    // Find delimiter with highest consistent score
    let bestDelimiter = ','; // default
    let bestScore = 0;
    
    for (const [delimiter, score] of Object.entries(delimiterScores)) {
      if (score > bestScore) {
        bestScore = score;
        bestDelimiter = delimiter;
      }
    }

    // Validate that the detected delimiter actually works
    if (bestScore === 0) {
      throw CSVErrorFactory.delimiterDetectionFailed(this.CSV_DELIMITERS);
    }

    return bestDelimiter;
  }

  /**
   * Count delimiter occurrences while respecting quoted fields
   */
  private static countDelimiterOccurrences(line: string, delimiter: string): number {
    let count = 0;
    let inQuotes = false;
    let quoteChar = '';
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (!inQuotes && (char === '"' || char === "'")) {
        inQuotes = true;
        quoteChar = char;
      } else if (inQuotes && char === quoteChar) {
        // Check for escaped quotes
        if (i + 1 < line.length && line[i + 1] === quoteChar) {
          i++; // Skip escaped quote
        } else {
          inQuotes = false;
          quoteChar = '';
        }
      } else if (!inQuotes && char === delimiter) {
        count++;
      }
    }
    
    return count;
  }

  /**
   * Detect file encoding using character frequency analysis
   */
  private static detectEncoding(buffer: Buffer): string {
    // Check for BOM (Byte Order Mark)
    if (buffer.length >= 3) {
      // UTF-8 BOM
      if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
        return 'utf8';
      }
    }
    
    if (buffer.length >= 2) {
      // UTF-16 LE BOM
      if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
        return 'utf16le';
      }
      // UTF-16 BE BOM - handle byte order conversion
      if (buffer[0] === 0xFE && buffer[1] === 0xFF) {
        return 'utf16le'; // We'll handle BE conversion in parseCSVFile
      }
    }

    // Analyze character patterns for encoding detection
    const sample = buffer.slice(0, Math.min(1024, buffer.length));
    
    // Try UTF-8 first
    try {
      const utf8Text = sample.toString('utf8');
      // Check for replacement characters which indicate invalid UTF-8
      if (!utf8Text.includes('\uFFFD')) {
        return 'utf8';
      }
    } catch (error) {
      // UTF-8 failed, continue with other encodings
    }

    // Try Latin1 (Windows-1252) for Western European characters
    try {
      const latin1Text = sample.toString('latin1');
      // Check for common Latin1 characters that would be garbled in UTF-8
      const hasLatin1Chars = /[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]/.test(latin1Text);
      const validChars = /^[\x20-\x7E\x80-\xFF]*$/.test(latin1Text);
      
      // If we detect Latin1 specific characters or if UTF-8 failed and this looks valid
      if (hasLatin1Chars || validChars) {
        return 'latin1';
      }
    } catch (error) {
      // Latin1 failed
    }

    // Default to UTF-8 if detection fails
    return 'utf8';
  }

  /**
   * Parse CSV content with specified delimiter
   */
  private static parseCSVContent(csvContent: string, delimiter: string, encoding: string): CSVParseResult {
    const data: any[][] = [];
    const warnings: string[] = [];
    let maxColumns = 0;
    let expectedColumns = 0;
    
    try {
      // Handle multiline parsing by processing the entire content as a stream
      const rows = this.parseCSVRows(csvContent, delimiter);
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.every(cell => !cell || !cell.trim())) continue; // Skip empty rows
        
        try {
          // Set expected columns from first data row
          if (data.length === 0) {
            expectedColumns = row.length;
          }
          
          // Check for significant column count mismatches
          if (expectedColumns > 0 && Math.abs(row.length - expectedColumns) > 2) {
            warnings.push(`Row ${i + 1}: Expected ${expectedColumns} columns, found ${row.length}`);
            
            // If this is a severe mismatch (more than 50% difference), it might indicate wrong delimiter
            if (Math.abs(row.length - expectedColumns) / expectedColumns > 0.5) {
              throw CSVErrorFactory.inconsistentColumns(i + 1, expectedColumns, row.length);
            }
          }
          
          data.push(row);
          maxColumns = Math.max(maxColumns, row.length);
        } catch (error) {
          if (error instanceof CSVError) {
            throw error; // Re-throw CSV errors
          }
          
          const rowError = CSVErrorFactory.rowParsingFailed(i + 1, error instanceof Error ? error : new Error(String(error)));
          warnings.push(rowError.getUserFriendlyMessage());
          
          // If too many rows fail, this might indicate a fundamental parsing issue
          if (warnings.length > Math.max(10, rows.length * 0.1)) {
            throw CSVErrorFactory.malformedCSV(i + 1, 'Too many rows failed to parse - possible delimiter or encoding issue');
          }
        }
      }

      if (data.length === 0) {
        throw CSVErrorFactory.emptyFile();
      }

      // Normalize row lengths and ensure empty values are empty strings
      data.forEach((row, rowIndex) => {
        // Convert null/undefined values to empty strings
        for (let i = 0; i < row.length; i++) {
          if (row[i] === null || row[i] === undefined) {
            row[i] = '';
          }
        }
        
        // Pad short rows to max columns
        while (row.length < maxColumns) {
          row.push('');
        }
        
        // Warn about rows that were significantly padded
        if (maxColumns - row.length > 2) {
          warnings.push(`Row ${rowIndex + 1}: Padded ${maxColumns - row.length} missing columns`);
        }
      });

      // Detect data types for each column
      const dataTypes = this.detectCSVDataTypes(data);

      return {
        data,
        delimiter,
        encoding,
        dataTypes,
        warnings,
        rowCount: data.length,
        columnCount: maxColumns
      };
    } catch (error) {
      if (error instanceof CSVError) {
        throw error;
      }
      throw CSVErrorFactory.parseError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Parse CSV rows handling multiline fields properly
   */
  private static parseCSVRows(csvContent: string, delimiter: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let inQuotes = false;
    let quoteChar = '';
    let i = 0;
    
    while (i < csvContent.length) {
      const char = csvContent[i];
      
      if (!inQuotes) {
        if (char === '"' || char === "'") {
          inQuotes = true;
          quoteChar = char;
        } else if (char === delimiter) {
          currentRow.push(currentField.trim());
          currentField = '';
        } else if (char === '\n' || char === '\r') {
          // End of row
          currentRow.push(currentField.trim());
          if (currentRow.length > 0) {
            rows.push(currentRow);
          }
          currentRow = [];
          currentField = '';
          
          // Handle \r\n
          if (char === '\r' && i + 1 < csvContent.length && csvContent[i + 1] === '\n') {
            i++; // Skip the \n
          }
        } else {
          currentField += char;
        }
      } else {
        if (char === quoteChar) {
          // Check for escaped quotes (double quotes)
          if (i + 1 < csvContent.length && csvContent[i + 1] === quoteChar) {
            currentField += char;
            i++; // Skip the next quote
          } else {
            inQuotes = false;
            quoteChar = '';
          }
        } else {
          currentField += char;
        }
      }
      
      i++;
    }
    
    // Add the last field and row if there's content
    if (currentField || currentRow.length > 0) {
      currentRow.push(currentField.trim());
      if (currentRow.length > 0) {
        rows.push(currentRow);
      }
    }
    
    return rows;
  }



  /**
   * Detect data types for CSV columns
   */
  private static detectCSVDataTypes(data: any[][]): DataType[] {
    if (data.length === 0) return [];
    
    const firstRow = data[0];
    if (!firstRow) return [];
    
    const columnCount = firstRow.length;
    const dataTypes: DataType[] = new Array(columnCount).fill(DataType.TEXT);
    
    for (let col = 0; col < columnCount; col++) {
      // Skip the first row (header) for data type analysis
      const columnValues = data.slice(1).map(row => row[col]).filter(val => val !== null && val !== '');
      
      if (columnValues.length === 0) {
        dataTypes[col] = DataType.EMPTY;
        continue;
      }
      
      // Sample up to 100 values for type detection
      const sample = columnValues.slice(0, 100);
      
      let numberCount = 0;
      let dateCount = 0;
      let booleanCount = 0;
      
      for (const value of sample) {
        const strValue = String(value).trim();
        
        // Check for boolean
        if (/^(true|false|yes|no|1|0)$/i.test(strValue)) {
          booleanCount++;
        }
        // Enhanced number detection including currency, negative numbers, and scientific notation
        else if (this.isNumericString(strValue)) {
          numberCount++;
        }
        // Check for date
        else if (this.isDateString(strValue)) {
          dateCount++;
        }
      }
      
      const total = sample.length;
      const threshold = 0.8; // 80% of values must match type
      
      if (booleanCount / total >= threshold) {
        dataTypes[col] = DataType.BOOLEAN;
      } else if (numberCount / total >= threshold) {
        dataTypes[col] = DataType.NUMBER;
      } else if (dateCount / total >= threshold) {
        dataTypes[col] = DataType.DATE;
      } else {
        dataTypes[col] = DataType.TEXT;
      }
    }
    
    return dataTypes;
  }

  /**
   * Enhanced numeric string detection
   */
  private static isNumericString(value: string): boolean {
    // Remove common currency symbols and whitespace
    const cleaned = value.replace(/[$€£¥₹,\s]/g, '');
    
    // Check for various number formats
    const patterns = [
      /^-?\d*\.?\d+([eE][+-]?\d+)?$/, // Standard numbers and scientific notation
      /^-?\d{1,3}(,\d{3})*(\.\d+)?$/, // Numbers with thousand separators
      /^\(\d*\.?\d+\)$/, // Accounting format for negative numbers
      /^-?\d+%$/ // Percentages
    ];
    
    return patterns.some(pattern => pattern.test(cleaned));
  }

  /**
   * Check if a string represents a date
   */
  private static isDateString(value: string): boolean {
    // Common date patterns
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
      /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
      /^\d{1,2}\/\d{1,2}\/\d{2,4}$/, // M/D/YY or MM/DD/YYYY
    ];
    
    if (datePatterns.some(pattern => pattern.test(value))) {
      const date = new Date(value);
      return !isNaN(date.getTime());
    }
    
    return false;
  }

  /**
   * Convert CSV parse result to XLSX workbook format
   */
  private static convertCSVToWorkbook(parseResult: CSVParseResult, filename: string): XLSX.WorkBook {
    const worksheet = XLSX.utils.aoa_to_sheet(parseResult.data);
    const workbook = XLSX.utils.book_new();
    
    // Use filename without extension as sheet name, or default to 'Sheet1'
    const sheetName = filename.replace(/\.[^/.]+$/, '') || 'Sheet1';
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    // Store CSV-specific metadata for later use in extractSheets
    (workbook as any)._csvParseResult = parseResult;
    
    return workbook;
  }

  /**
   * Extract sheets from workbook
   */
  private static extractSheets(workbook: XLSX.WorkBook, options: ParseOptions): Sheet[] {
    const sheets: Sheet[] = [];
    const maxRows = options.maxRows || this.DEFAULT_MAX_ROWS;
    const maxCols = options.maxCols || this.DEFAULT_MAX_COLS;

    // Check if this is a CSV workbook with parse result metadata
    const csvParseResult = (workbook as any)._csvParseResult as CSVParseResult | undefined;

    for (const sheetName of workbook.SheetNames) {
      try {
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) {
          console.warn(`Worksheet "${sheetName}" not found`);
          continue;
        }
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
        
        // Limit range if necessary
        const actualEndRow = Math.min(range.e.r, maxRows - 1);
        const actualEndCol = Math.min(range.e.c, maxCols - 1);
        
        const data: Cell[][] = [];
        
        // Initialize data array
        for (let row = 0; row <= actualEndRow; row++) {
          data[row] = [];
          for (let col = 0; col <= actualEndCol; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
            const xlsxCell = worksheet[cellAddress];
            
            const rowData = data[row];
            if (rowData) {
              if (csvParseResult) {
                // Use CSV-specific cell conversion
                rowData[col] = this.convertCSVCell(xlsxCell, cellAddress, csvParseResult, row, col);
              } else {
                // Use standard Excel cell conversion
                rowData[col] = this.convertCell(xlsxCell, cellAddress);
              }
            }
          }
        }

        const sheet: Sheet = {
          name: sheetName,
          data,
          dimensions: {
            rows: actualEndRow + 1,
            cols: actualEndCol + 1
          },
          formatting: [], // TODO: Extract formatting in future enhancement
          namedRanges: [] // Will be populated from workbook level
        };

        sheets.push(sheet);
      } catch (error) {
        console.warn(`Failed to parse sheet "${sheetName}": ${error instanceof Error ? error.message : String(error)}`);
        // Continue with other sheets
      }
    }

    if (sheets.length === 0) {
      throw new SpreadsheetParseError(
        'No valid sheets found in the workbook',
        'NO_SHEETS_FOUND'
      );
    }

    return sheets;
  }

  /**
   * Convert XLSX cell to our Cell interface
   */
  private static convertCell(xlsxCell: XLSX.CellObject | undefined, address: string): Cell {
    if (!xlsxCell || xlsxCell.v === undefined || xlsxCell.v === null || xlsxCell.v === '') {
      return {
        value: null,
        dataType: DataType.EMPTY,
        address
      };
    }

    const cell: Cell = {
      value: xlsxCell.v,
      dataType: this.detectDataType(xlsxCell),
      address
    };

    // Add formula if present
    if (xlsxCell.f) {
      cell.formula = xlsxCell.f;
      cell.dataType = DataType.FORMULA;
    }

    return cell;
  }

  /**
   * Convert CSV cell using CSV-specific data type information
   */
  private static convertCSVCell(
    xlsxCell: XLSX.CellObject | undefined, 
    address: string, 
    csvParseResult: CSVParseResult, 
    _row: number, 
    col: number
  ): Cell {
    // Handle empty cells
    if (!xlsxCell || xlsxCell.v === undefined || xlsxCell.v === null || xlsxCell.v === '') {
      return {
        value: '', // Use empty string instead of null for CSV
        dataType: DataType.EMPTY,
        address
      };
    }

    // Get the data type from CSV analysis
    const dataType = csvParseResult.dataTypes[col] || DataType.TEXT;
    
    let value = xlsxCell.v;
    
    // Convert value based on detected data type
    switch (dataType) {
      case DataType.NUMBER:
        const numValue = this.parseNumericValue(String(value));
        if (numValue !== null) {
          value = numValue;
        }
        break;
      case DataType.BOOLEAN:
        const strValue = String(value).toLowerCase();
        if (['true', 'yes', '1'].includes(strValue)) {
          value = true;
        } else if (['false', 'no', '0'].includes(strValue)) {
          value = false;
        }
        break;
      case DataType.DATE:
        // Try to parse as date
        const dateValue = new Date(String(value));
        if (!isNaN(dateValue.getTime())) {
          value = dateValue;
        }
        break;
      default:
        // Keep as string for TEXT and other types
        value = String(value);
    }

    return {
      value,
      dataType,
      address
    };
  }

  /**
   * Parse numeric value from string, handling currency and formatting
   */
  private static parseNumericValue(value: string): number | null {
    // Remove common currency symbols, whitespace, and thousand separators
    let cleaned = value.replace(/[$€£¥₹,\s]/g, '');
    
    // Handle accounting format (parentheses for negative)
    if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
      cleaned = '-' + cleaned.slice(1, -1);
    }
    
    // Handle percentages
    if (cleaned.endsWith('%')) {
      const num = parseFloat(cleaned.slice(0, -1));
      return isNaN(num) ? null : num / 100;
    }
    
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }

  /**
   * Detect data type from XLSX cell
   */
  private static detectDataType(xlsxCell: XLSX.CellObject): DataType {
    if (xlsxCell.f) {
      return DataType.FORMULA;
    }

    switch (xlsxCell.t) {
      case 'n': // number
        return DataType.NUMBER;
      case 's': // string
        return DataType.TEXT;
      case 'b': // boolean
        return DataType.BOOLEAN;
      case 'd': // date
        return DataType.DATE;
      case 'e': // error
        return DataType.ERROR;
      default:
        // Additional date detection for numbers that are dates
        // Note: xlsxCell.z is the number format, but TypeScript doesn't know this
        // We'll skip this advanced date detection for now to avoid type issues
        return DataType.TEXT;
    }
  }

  /**
   * Extract formulas from workbook
   */
  private static extractFormulas(workbook: XLSX.WorkBook): Formula[] {
    const formulas: Formula[] = [];

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      
      for (const cellAddress in worksheet) {
        if (cellAddress.startsWith('!')) continue; // Skip metadata
        
        const cell = worksheet[cellAddress];
        if (cell.f) {
          const formula: Formula = {
            id: `${sheetName}_${cellAddress}`,
            cell: cellAddress,
            sheet: sheetName,
            formula: cell.f,
            dependencies: this.extractFormulaDependencies(cell.f),
            precedents: [], // Will be calculated later if needed
            isValid: !cell.t || cell.t !== 'e'
          };

          if (cell.t === 'e') {
            formula.errorMessage = cell.v?.toString();
          }

          formulas.push(formula);
        }
      }
    }

    return formulas;
  }

  /**
   * Extract cell dependencies from formula
   */
  private static extractFormulaDependencies(formula: string): string[] {
    const dependencies: string[] = [];
    
    // Simple regex to find cell references (A1, B2, etc.)
    const cellRefRegex = /\b[A-Z]+\d+\b/g;
    const matches = formula.match(cellRefRegex);
    
    if (matches) {
      dependencies.push(...matches);
    }

    // Find range references (A1:B10)
    const rangeRefRegex = /\b[A-Z]+\d+:[A-Z]+\d+\b/g;
    const rangeMatches = formula.match(rangeRefRegex);
    
    if (rangeMatches) {
      dependencies.push(...rangeMatches);
    }

    return Array.from(new Set(dependencies)); // Remove duplicates
  }

  /**
   * Extract named ranges from workbook
   */
  private static extractNamedRanges(workbook: XLSX.WorkBook): NamedRange[] {
    const namedRanges: NamedRange[] = [];

    if (workbook.Workbook?.Names) {
      for (const name of workbook.Workbook.Names) {
        if (name.Name && name.Ref) {
          const sheetName = typeof name.Sheet === 'string' ? name.Sheet : (workbook.SheetNames[0] || 'Sheet1');
          const namedRange: NamedRange = {
            name: name.Name,
            range: name.Ref,
            sheetName,
            ...(name.Ref.startsWith('=') && { formula: name.Ref })
          };
          namedRanges.push(namedRange);
        }
      }
    }

    return namedRanges;
  }

  /**
   * Generate unique ID for spreadsheet
   */
  private static generateId(): string {
    return `sheet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get supported file formats
   */
  public static getSupportedFormats(): string[] {
    return [...this.SUPPORTED_FORMATS];
  }

  /**
   * Check if file format is supported with enhanced CSV MIME type handling
   */
  public static isFormatSupported(mimeType: string, filename?: string): boolean {
    const isValidMimeType = this.SUPPORTED_FORMATS.includes(mimeType);
    
    if (filename) {
      const extension = filename.toLowerCase().split('.').pop();
      
      // Check for standard supported extensions with their expected MIME types
      if (extension === 'xlsx') {
        // Accept various Excel MIME types and generic binary types
        return isValidMimeType || 
               mimeType === 'application/octet-stream' ||
               mimeType === 'application/zip';
      }
      
      if (extension === 'xls') {
        // Accept various legacy Excel MIME types
        return isValidMimeType || 
               mimeType === 'application/octet-stream' ||
               mimeType === 'application/msexcel';
      }
      
      // Enhanced CSV file detection - CSV files can have many different MIME types
      if (extension === 'csv') {
        return isValidMimeType || 
               mimeType === 'text/plain' ||
               mimeType === 'application/octet-stream' ||
               mimeType.includes('csv') ||
               mimeType.includes('comma-separated') ||
               mimeType === 'text/x-comma-separated-values';
      }
      
      return isValidMimeType;
    }
    
    return isValidMimeType;
  }

  /**
   * Get detailed CSV parsing information for debugging
   */
  public static async analyzeCSVFile(file: Buffer | string, _filename: string): Promise<{
    detectedDelimiter: string;
    detectedEncoding: string;
    sampleData: any[][];
    warnings: string[];
  }> {
    try {
      let buffer = Buffer.isBuffer(file) ? file : Buffer.from(file);
      const encoding = this.detectEncoding(buffer);
      
      // Handle UTF-16 BE BOM by swapping bytes
      if (buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
        const beBuffer = buffer.slice(2);
        const leBuffer = Buffer.alloc(beBuffer.length + 2);
        leBuffer[0] = 0xFF;
        leBuffer[1] = 0xFE;
        
        for (let i = 0; i < beBuffer.length; i += 2) {
          if (i + 1 < beBuffer.length) {
            const byte1 = beBuffer[i + 1];
            const byte2 = beBuffer[i];
            if (byte1 !== undefined && byte2 !== undefined) {
              leBuffer[i + 2] = byte1;
              leBuffer[i + 3] = byte2;
            }
          } else if (i < beBuffer.length) {
            const byte = beBuffer[i];
            if (byte !== undefined) {
              leBuffer[i + 2] = byte;
            }
          }
        }
        buffer = Buffer.concat([Buffer.from([0xFF, 0xFE]), leBuffer]);
      }
      
      let csvContent = buffer.toString(encoding as BufferEncoding);
      csvContent = csvContent.replace(/^\uFEFF/, ''); // Remove BOM
      
      const delimiter = this.detectDelimiter(csvContent);
      
      // Parse first few rows as sample using the enhanced parser
      const allRows = this.parseCSVRows(csvContent, delimiter);
      const sampleData = allRows.slice(0, 5);
      const warnings: string[] = [];
      
      // Check for potential issues
      for (let i = 0; i < Math.min(10, allRows.length); i++) {
        const row = allRows[i];
        if (row && row.some(cell => cell.includes('\n'))) {
          // Don't warn about multiline fields as they're valid
        }
        if (row && row.some(cell => cell.includes('"') && !cell.startsWith('"'))) {
          warnings.push(`Line ${i + 1}: Potential unescaped quotes detected`);
        }
      }
      
      return {
        detectedDelimiter: delimiter,
        detectedEncoding: encoding,
        sampleData,
        warnings
      };
    } catch (error) {
      throw CSVErrorFactory.parseError(error instanceof Error ? error : new Error(String(error)));
    }
  }
}