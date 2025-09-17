import * as express from 'express';
// @ts-ignore
import multer from 'multer';
import { SpreadsheetParser, SpreadsheetParseError } from '../services/SpreadsheetParser';
import { CSVError, CSVErrorCode } from '../types/csv-errors';
import { LazyLoadingService } from '../services/LazyLoadingService';
import { UploadSpreadsheetResponse, UploadResult, ApiError, ErrorCode } from '../types/api';
import { SpreadsheetData } from '../types/spreadsheet';
import { SpreadsheetPreview } from '../types/api';
import { asyncErrorHandler, validateFile, validateRequest, uploadSpreadsheetSchema, uploadRateLimit } from '../middleware';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 1 // Only allow one file at a time
  },
  fileFilter: (_req: any, file: any, cb: any) => {
    // Enhanced file format validation with better CSV MIME type handling
    if (SpreadsheetParser.isFormatSupported(file.mimetype, file.originalname)) {
      cb(null, true);
    } else {
      // Create detailed error for unsupported formats
      const error = new Error('UNSUPPORTED_FORMAT');
      (error as any).details = {
        receivedMimeType: file.mimetype,
        filename: file.originalname,
        supportedFormats: ['xlsx', 'xls', 'csv'],
        supportedMimeTypes: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
          'application/csv',
          'text/plain (for CSV files only)'
        ]
      };
      cb(error);
    }
  }
});

// Temporary storage for parsed spreadsheet data
// In production, this would be replaced with a proper database or cache
const spreadsheetStorage = new Map<string, SpreadsheetData>();

/**
 * POST /api/v1/upload-spreadsheet
 * Upload and parse a spreadsheet file
 */
router.post('/upload-spreadsheet', 
  uploadRateLimit, // Apply upload-specific rate limiting
  validateFile(['.xlsx', '.xls', '.csv'], 50 * 1024 * 1024, false), // File validation will be handled by multer
  validateRequest(uploadSpreadsheetSchema),
  asyncErrorHandler((req, res) => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Handle multer upload with error handling
  upload.single('file')(req, res, async (uploadError: any) => {
    if (uploadError) {
      console.error('Upload error:', uploadError);

      let apiError: ApiError;

      if (uploadError && uploadError.name === 'MulterError') {
        // Handle multer errors
        if (uploadError.code === 'LIMIT_FILE_SIZE') {
          apiError = {
            code: ErrorCode.FILE_TOO_LARGE,
            message: 'File size exceeds the maximum allowed limit of 50MB',
            details: {
              maxSize: '50MB',
              receivedSize: req.file?.size ? `${(req.file.size / (1024 * 1024)).toFixed(2)}MB` : 'unknown'
            },
            suggestions: [
              'Try compressing your spreadsheet file',
              'Remove unnecessary data or sheets',
              'Save as a more efficient format (e.g., .xlsx instead of .xls)'
            ],
            timestamp: new Date().toISOString()
          };
        } else if (uploadError.code === 'LIMIT_FILE_COUNT') {
          apiError = {
            code: ErrorCode.INVALID_REQUEST,
            message: 'Only one file can be uploaded at a time',
            details: { multerError: uploadError.code },
            suggestions: [
              'Upload only one file per request',
              'If you need to upload multiple files, make separate requests'
            ],
            timestamp: new Date().toISOString()
          };
        } else {
          apiError = {
            code: ErrorCode.INVALID_REQUEST,
            message: `File upload error: ${uploadError.message}`,
            details: { multerError: uploadError.code },
            timestamp: new Date().toISOString()
          };
        }
      } else if (uploadError.message === 'UNSUPPORTED_FORMAT') {
        // Handle unsupported format from multer fileFilter with enhanced details
        const errorDetails = (uploadError as any).details || {};
        apiError = {
          code: ErrorCode.INVALID_FILE_FORMAT,
          message: 'Unsupported file format',
          details: {
            supportedFormats: ['xlsx', 'xls', 'csv'],
            receivedFormat: errorDetails.receivedMimeType || req.file?.mimetype || 'unknown',
            filename: errorDetails.filename || req.file?.originalname || 'unknown',
            supportedMimeTypes: errorDetails.supportedMimeTypes || [
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'application/vnd.ms-excel',
              'text/csv',
              'application/csv'
            ]
          },
          suggestions: [
            'Convert your file to Excel format (.xlsx or .xls)',
            'Save as CSV if working with simple tabular data',
            'Ensure the file extension matches the actual file format',
            'For CSV files, try saving with UTF-8 encoding'
          ],
          timestamp: new Date().toISOString()
        };
      } else {
        // Handle unexpected errors
        apiError = {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          message: 'An unexpected error occurred while processing the file',
          details: {
            error: uploadError.message
          },
          suggestions: [
            'Try uploading the file again',
            'Check if the file is corrupted',
            'Contact support if the problem persists'
          ],
          timestamp: new Date().toISOString()
        };
      }

      const response: UploadSpreadsheetResponse = {
        success: false,
        error: apiError,
        requestId
      };

      // Set appropriate HTTP status code
      const statusCode = getStatusCodeForError(apiError.code);
      return res.status(statusCode).json(response);
    }

    // Continue with normal processing
    try {
    // Validate file upload
    if (!req.file) {
      const error: ApiError = {
        code: ErrorCode.MISSING_PARAMETERS,
        message: 'No file uploaded. Please select a spreadsheet file.',
        details: {
          expectedParameter: 'file',
          supportedFormats: ['xlsx', 'xls', 'csv']
        },
        suggestions: [
          'Ensure you are sending a file with the key "file"',
          'Check that the file is in a supported format (Excel or CSV)'
        ],
        timestamp: new Date().toISOString()
      };

      const response: UploadSpreadsheetResponse = {
        success: false,
        error,
        requestId
      };

      return res.status(400).json(response);
    }

    // Parse upload options from request body
    const options = {
      parseFormulas: req.body.parseFormulas === 'true' || req.body.parseFormulas === true,
      extractPatterns: req.body.extractPatterns === 'true' || req.body.extractPatterns === true,
      generatePreview: req.body.generatePreview !== 'false' && req.body.generatePreview !== false
    };

    // Parse the spreadsheet file
    console.log('About to parse file:', req.file.originalname, 'MIME:', req.file.mimetype);
    const spreadsheetData = await SpreadsheetParser.parseFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      {
        includeFormulas: options.parseFormulas,
        includeDependencies: options.parseFormulas,
        maxRows: 10000,
        maxCols: 1000
      }
    );
    console.log('File parsed successfully, ID:', spreadsheetData.id);

    // Collect any warnings
    const warnings: string[] = [];

    // Get lazy loading service
    const lazyLoadingService = req.app.locals['lazyLoadingService'] as LazyLoadingService;

    // Convert to lazy-loaded format for large spreadsheets
    let processedSpreadsheetData = spreadsheetData;
    const totalCells = spreadsheetData.sheets.reduce((total, sheet) => 
      total + (sheet.dimensions.rows * sheet.dimensions.cols), 0
    );

    if (totalCells > 50000 && lazyLoadingService) { // 50k cells threshold
      try {
        processedSpreadsheetData = await lazyLoadingService.convertToLazyLoaded(spreadsheetData);
        warnings.push('Large dataset detected. Using lazy loading for optimal performance.');
      } catch (error) {
        console.warn('Failed to convert to lazy loading:', error);
        // Continue with regular data
      }
    }

    // Store processed data temporarily
    spreadsheetStorage.set(processedSpreadsheetData.id, processedSpreadsheetData);

    // Generate preview (use original data for preview to avoid lazy loading complexity)
    const preview = generateSpreadsheetPreview(spreadsheetData);
    
    // Check for large file warning
    if (req.file.size > 10 * 1024 * 1024) { // 10MB
      warnings.push('Large file detected. Processing may take longer for complex operations.');
    }

    // Check for many sheets warning
    if (spreadsheetData.sheets.length > 10) {
      warnings.push('Multiple sheets detected. Some operations may be limited to the active sheet.');
    }

    // Check for formulas warning
    if (spreadsheetData.formulas.length > 100) {
      warnings.push('Many formulas detected. Formula dependency analysis may take additional time.');
    }

    const processingTime = Math.max(1, Date.now() - startTime); // Ensure at least 1ms

    const uploadResult: UploadResult = {
      spreadsheetId: processedSpreadsheetData.id,
      spreadsheetData: processedSpreadsheetData,
      preview,
      warnings,
      processingTime,
      ...(processedSpreadsheetData.boundaryAnalysis && { 
        boundaryAnalysis: processedSpreadsheetData.boundaryAnalysis 
      }),
      ...(processedSpreadsheetData.recommendedSelection && { 
        recommendedSelection: processedSpreadsheetData.recommendedSelection 
      })
    };

    const response: UploadSpreadsheetResponse = {
      success: true,
      data: uploadResult,
      requestId
    };

      return res.status(200).json(response);

    } catch (error) {
      console.error('Processing error:', error);

      let apiError: ApiError;

      if (error instanceof CSVError) {
        // Handle CSV-specific parsing errors with detailed information
        const csvApiError = error.toApiError();
        apiError = {
          code: csvApiError.code as ErrorCode,
          message: csvApiError.message,
          details: {
            ...csvApiError.details,
            fileType: 'CSV'
          },
          suggestions: csvApiError.suggestions,
          timestamp: csvApiError.timestamp
        };
      } else if (error instanceof SpreadsheetParseError) {
        // Handle known parsing errors
        apiError = {
          code: error.code as ErrorCode,
          message: error.message,
          details: error.details,
          suggestions: generateErrorSuggestions(error.code),
          timestamp: new Date().toISOString()
        };
      } else {
        // Handle unexpected errors
        apiError = {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          message: 'An unexpected error occurred while processing the file',
          details: {
            error: error instanceof Error ? error.message : String(error)
          },
          suggestions: [
            'Try uploading the file again',
            'Check if the file is corrupted',
            'Contact support if the problem persists'
          ],
          timestamp: new Date().toISOString()
        };
      }

      const response: UploadSpreadsheetResponse = {
        success: false,
        error: apiError,
        requestId
      };

      // Set appropriate HTTP status code
      const statusCode = getStatusCodeForError(apiError.code);
      return res.status(statusCode).json(response);
    }
  });
}));

/**
 * GET /api/v1/spreadsheet/:id
 * Retrieve a previously uploaded spreadsheet
 */
router.get('/spreadsheet/:id', asyncErrorHandler((req, res) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const spreadsheetId = req.params.id;

  if (!spreadsheetId) {
    const error: ApiError = {
      code: ErrorCode.MISSING_PARAMETERS,
      message: 'Spreadsheet ID is required',
      timestamp: new Date().toISOString()
    };

    return res.status(400).json({
      success: false,
      error,
      requestId
    });
  }

  const spreadsheetData = spreadsheetStorage.get(spreadsheetId);

  if (!spreadsheetData) {
    const error: ApiError = {
      code: ErrorCode.SPREADSHEET_NOT_FOUND,
      message: 'Spreadsheet not found or has expired',
      details: { spreadsheetId },
      suggestions: [
        'Check if the spreadsheet ID is correct',
        'Upload the file again if it has expired',
        'Ensure you are using the correct endpoint'
      ],
      timestamp: new Date().toISOString()
    };

    return res.status(404).json({
      success: false,
      error,
      requestId
    });
  }

  return res.json({
    success: true,
    data: {
      spreadsheetData,
      preview: generateSpreadsheetPreview(spreadsheetData)
    },
    requestId
  });
}));

/**
 * DELETE /api/v1/spreadsheet/:id
 * Delete a previously uploaded spreadsheet from temporary storage
 */
router.delete('/spreadsheet/:id', asyncErrorHandler((req, res) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const spreadsheetId = req.params.id;

  if (!spreadsheetId) {
    const error: ApiError = {
      code: ErrorCode.MISSING_PARAMETERS,
      message: 'Spreadsheet ID is required',
      timestamp: new Date().toISOString()
    };

    return res.status(400).json({
      success: false,
      error,
      requestId
    });
  }

  const existed = spreadsheetStorage.delete(spreadsheetId);

  if (!existed) {
    const error: ApiError = {
      code: ErrorCode.SPREADSHEET_NOT_FOUND,
      message: 'Spreadsheet not found',
      details: { spreadsheetId },
      timestamp: new Date().toISOString()
    };

    return res.status(404).json({
      success: false,
      error,
      requestId
    });
  }

  return res.json({
    success: true,
    message: 'Spreadsheet deleted successfully',
    requestId
  });
}));

/**
 * Generate a preview of the spreadsheet data
 */
function generateSpreadsheetPreview(spreadsheetData: SpreadsheetData): SpreadsheetPreview {
  const sheetNames = spreadsheetData.sheets.map(sheet => sheet.name);
  const totalRows = spreadsheetData.sheets.reduce((sum, sheet) => sum + sheet.dimensions.rows, 0);
  const totalColumns = Math.max(...spreadsheetData.sheets.map(sheet => sheet.dimensions.cols));
  const hasFormulas = spreadsheetData.formulas.length > 0;
  
  // Extract unique data types
  const dataTypes = new Set<string>();
  spreadsheetData.sheets.forEach(sheet => {
    sheet.data.forEach(row => {
      row.forEach(cell => {
        if (cell.dataType) {
          dataTypes.add(cell.dataType);
        }
      });
    });
  });

  // Generate sample data from the first sheet (first 5 rows, first 10 columns)
  const sampleData: any[][] = [];
  if (spreadsheetData.sheets.length > 0) {
    const firstSheet = spreadsheetData.sheets[0];
    if (firstSheet) {
      const maxRows = Math.min(5, firstSheet.dimensions.rows);
      const maxCols = Math.min(10, firstSheet.dimensions.cols);

      for (let row = 0; row < maxRows; row++) {
        const sampleRow: any[] = [];
        for (let col = 0; col < maxCols; col++) {
          const cell = firstSheet.data[row]?.[col];
          sampleRow.push(cell?.value || null);
        }
        sampleData.push(sampleRow);
      }
    }
  }

  return {
    sheetNames,
    totalRows,
    totalColumns,
    hasFormulas,
    dataTypes: Array.from(dataTypes),
    sampleData
  };
}

/**
 * Generate helpful suggestions based on error code
 */
function generateErrorSuggestions(errorCode: string): string[] {
  switch (errorCode) {
    case 'UNSUPPORTED_FORMAT':
      return [
        'Convert your file to Excel format (.xlsx or .xls)',
        'Save as CSV if working with simple tabular data',
        'Ensure the file extension matches the actual file format'
      ];
    case 'FILE_TOO_LARGE':
      return [
        'Try compressing your spreadsheet file',
        'Remove unnecessary data or sheets',
        'Split large datasets into smaller files'
      ];
    case 'PARSE_ERROR':
      return [
        'Check if the file is corrupted',
        'Try opening the file in Excel to verify it works',
        'Save the file in a different format and try again'
      ];
    case 'NO_SHEETS_FOUND':
      return [
        'Ensure the file contains at least one worksheet',
        'Check if the file is password protected',
        'Verify the file is a valid spreadsheet'
      ];
    default:
      return [
        'Try uploading the file again',
        'Contact support if the problem persists'
      ];
  }
}

/**
 * Generate CSV-specific error suggestions
 */
function generateCSVErrorSuggestions(errorCode: CSVErrorCode): string[] {
  switch (errorCode) {
    case CSVErrorCode.DELIMITER_DETECTION_FAILED:
      return [
        'Ensure your CSV uses standard delimiters (comma, semicolon, tab, or pipe)',
        'Check that the delimiter is consistent throughout the file',
        'Try manually specifying the delimiter if possible',
        'Verify the file is properly formatted CSV'
      ];
    case CSVErrorCode.ENCODING_DETECTION_FAILED:
      return [
        'Save your CSV file with UTF-8 encoding',
        'Try opening the file in a text editor and re-saving with UTF-8',
        'Check for special characters that might cause encoding issues',
        'Use a CSV editor to fix encoding problems'
      ];
    case CSVErrorCode.MALFORMED_CSV:
      return [
        'Check for unmatched quotes in your CSV data',
        'Ensure all fields with commas or quotes are properly quoted',
        'Remove any extra line breaks within data fields',
        'Verify the CSV structure is consistent'
      ];
    case CSVErrorCode.INCONSISTENT_COLUMNS:
      return [
        'Ensure all rows have the same number of columns',
        'Check for missing commas or extra delimiters',
        'Remove empty rows that might cause column count issues',
        'Verify the header row matches the data rows'
      ];
    case CSVErrorCode.EMPTY_FILE:
      return [
        'Ensure the CSV file contains data',
        'Check that the file is not corrupted',
        'Verify the file was saved properly',
        'Try creating a new CSV file with sample data'
      ];
    case CSVErrorCode.PARSE_ERROR:
    default:
      return [
        'Check if the CSV file is properly formatted',
        'Try opening the file in Excel or a text editor to verify content',
        'Save the file with UTF-8 encoding',
        'Remove any special characters that might cause parsing issues'
      ];
  }
}

/**
 * Get appropriate HTTP status code for error
 */
function getStatusCodeForError(errorCode: string): number {
  switch (errorCode) {
    case ErrorCode.MISSING_PARAMETERS:
    case ErrorCode.INVALID_REQUEST:
    case ErrorCode.INVALID_FILE_FORMAT:
    case ErrorCode.CSV_DELIMITER_DETECTION_FAILED:
    case ErrorCode.CSV_ENCODING_DETECTION_FAILED:
    case ErrorCode.CSV_MALFORMED:
    case ErrorCode.CSV_INCONSISTENT_COLUMNS:
    case ErrorCode.CSV_EMPTY_FILE:
    case ErrorCode.CSV_PARSE_ERROR:
      return 400;
    case ErrorCode.SPREADSHEET_NOT_FOUND:
      return 404;
    case ErrorCode.FILE_TOO_LARGE:
      return 413;
    case ErrorCode.RATE_LIMIT_EXCEEDED:
      return 429;
    case ErrorCode.INTERNAL_SERVER_ERROR:
    default:
      return 500;
  }
}

export default router;
export { spreadsheetStorage }; // Export for testing purposes