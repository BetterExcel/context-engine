import { Request, Response, NextFunction } from 'express';
import { ApiError, ErrorCode } from '../types/api';
import { SpreadsheetParseError } from '../services/SpreadsheetParser';
import { RequestAnalyzerError } from '../services/RequestAnalyzer';
import { ContextExtractionError } from '../services/ContextExtractor';

/**
 * Global error handler middleware for Express
 * Handles all errors and formats them consistently
 */
export const globalErrorHandler = (
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log error details for debugging
  console.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    timestamp: new Date().toISOString()
  });

  // Generate request ID for tracking
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  let apiError: ApiError;

  // Handle known error types
  if (error instanceof SpreadsheetParseError) {
    apiError = {
      code: error.code as ErrorCode,
      message: error.message,
      details: {
        ...error.details,
        errorType: 'SpreadsheetParseError'
      },
      suggestions: generateErrorSuggestions(error.code),
      timestamp: new Date().toISOString()
    };
  } else if (error instanceof RequestAnalyzerError) {
    apiError = {
      code: ErrorCode.INVALID_REQUEST,
      message: `Request analysis failed: ${error.message}`,
      details: {
        analyzerError: error.code,
        errorType: 'RequestAnalyzerError'
      },
      suggestions: [
        'Try rephrasing your request more clearly',
        'Provide more specific details about what you want to accomplish',
        'Check if your request contains the necessary context'
      ],
      timestamp: new Date().toISOString()
    };
  } else if (error instanceof ContextExtractionError) {
    apiError = {
      code: ErrorCode.CONTEXT_EXTRACTION_FAILED,
      message: `Context extraction failed: ${error.message}`,
      details: {
        extractorError: error.code,
        errorType: 'ContextExtractionError'
      },
      suggestions: [
        'Check if your selection range is valid',
        'Ensure the spreadsheet contains the expected data',
        'Try with a smaller selection range',
        'Verify that the spreadsheet is not corrupted'
      ],
      timestamp: new Date().toISOString()
    };
  } else if (error.name === 'ValidationError') {
    // Handle validation errors (from Zod or custom validation)
    apiError = {
      code: ErrorCode.INVALID_REQUEST,
      message: 'Request validation failed',
      details: {
        validationError: error.message,
        errorType: 'ValidationError'
      },
      suggestions: [
        'Check that all required parameters are provided',
        'Verify that parameter types match the expected format',
        'Review the API documentation for correct request format'
      ],
      timestamp: new Date().toISOString()
    };
  } else if (error.name === 'MulterError') {
    // Handle file upload errors
    const multerError = error as any;
    if (multerError.code === 'LIMIT_FILE_SIZE') {
      apiError = {
        code: ErrorCode.FILE_TOO_LARGE,
        message: 'File size exceeds the maximum allowed limit',
        details: {
          maxSize: '50MB',
          multerCode: multerError.code,
          errorType: 'MulterError'
        },
        suggestions: [
          'Try compressing your spreadsheet file',
          'Remove unnecessary data or sheets',
          'Save as a more efficient format (e.g., .xlsx instead of .xls)'
        ],
        timestamp: new Date().toISOString()
      };
    } else if (multerError.code === 'LIMIT_FILE_COUNT') {
      apiError = {
        code: ErrorCode.INVALID_REQUEST,
        message: 'Only one file can be uploaded at a time',
        details: {
          multerCode: multerError.code,
          errorType: 'MulterError'
        },
        suggestions: [
          'Upload only one file per request',
          'If you need to upload multiple files, make separate requests'
        ],
        timestamp: new Date().toISOString()
      };
    } else {
      apiError = {
        code: ErrorCode.INVALID_REQUEST,
        message: `File upload error: ${multerError.message}`,
        details: {
          multerCode: multerError.code,
          errorType: 'MulterError'
        },
        suggestions: [
          'Check that you are uploading a valid file',
          'Ensure the file format is supported',
          'Try uploading the file again'
        ],
        timestamp: new Date().toISOString()
      };
    }
  } else if (error.message === 'UNSUPPORTED_FORMAT') {
    apiError = {
      code: ErrorCode.INVALID_FILE_FORMAT,
      message: 'Unsupported file format',
      details: {
        supportedFormats: ['xlsx', 'xls', 'csv'],
        errorType: 'FileFormatError'
      },
      suggestions: [
        'Convert your file to Excel format (.xlsx or .xls)',
        'Save as CSV if working with simple tabular data',
        'Ensure the file extension matches the actual file format'
      ],
      timestamp: new Date().toISOString()
    };
  } else if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
    // Handle JSON parsing errors
    apiError = {
      code: ErrorCode.INVALID_REQUEST,
      message: 'Invalid JSON in request body',
      details: {
        parseError: error.message,
        errorType: 'JSONSyntaxError'
      },
      suggestions: [
        'Check that your request body contains valid JSON',
        'Ensure all strings are properly quoted',
        'Verify that brackets and braces are properly closed'
      ],
      timestamp: new Date().toISOString()
    };
  } else if (error.name === 'TypeError') {
    // Handle type errors
    apiError = {
      code: ErrorCode.INVALID_REQUEST,
      message: 'Invalid parameter type',
      details: {
        typeError: error.message,
        errorType: 'TypeError'
      },
      suggestions: [
        'Check that all parameters are of the correct type',
        'Review the API documentation for expected parameter formats',
        'Ensure required parameters are not null or undefined'
      ],
      timestamp: new Date().toISOString()
    };
  } else if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
    // Handle network/database connection errors
    apiError = {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: 'Service temporarily unavailable',
      details: {
        connectionError: 'Unable to connect to required services',
        errorType: 'ConnectionError'
      },
      suggestions: [
        'Try your request again in a few moments',
        'Check your internet connection',
        'Contact support if the problem persists'
      ],
      timestamp: new Date().toISOString()
    };
  } else if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
    // Handle timeout errors
    apiError = {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: 'Request timeout',
      details: {
        timeoutError: 'The request took too long to process',
        errorType: 'TimeoutError'
      },
      suggestions: [
        'Try with a smaller file or dataset',
        'Reduce the complexity of your request',
        'Try again as the service may be experiencing high load'
      ],
      timestamp: new Date().toISOString()
    };
  } else {
    // Handle unexpected errors
    apiError = {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred',
      details: {
        error: error.message,
        errorType: error.name || 'UnknownError'
      },
      suggestions: [
        'Try your request again',
        'Check if all parameters are valid',
        'Contact support if the problem persists'
      ],
      timestamp: new Date().toISOString()
    };
  }

  // Set appropriate HTTP status code
  const statusCode = getStatusCodeForError(apiError.code);

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: apiError,
    requestId
  });
};

/**
 * Async error wrapper to catch async errors in route handlers
 */
export const asyncErrorHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = fn(req, res, next);
      if (result && typeof result.catch === 'function') {
        result.catch(next);
      }
    } catch (error) {
      next(error);
    }
  };
};

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
    case 'INVALID_RANGE':
      return [
        'Check that the cell range format is correct (e.g., A1:C10)',
        'Ensure the range exists within the spreadsheet',
        'Verify that the sheet name is correct'
      ];
    case 'EMPTY_SELECTION':
      return [
        'Select a range that contains data',
        'Check if the specified cells have values',
        'Try selecting a larger range'
      ];
    default:
      return [
        'Try your request again',
        'Contact support if the problem persists'
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
      return 400;
    case ErrorCode.SPREADSHEET_NOT_FOUND:
      return 404;
    case ErrorCode.FILE_TOO_LARGE:
      return 413;
    case ErrorCode.RATE_LIMIT_EXCEEDED:
      return 429;
    case ErrorCode.CONTEXT_EXTRACTION_FAILED:
    case ErrorCode.AI_SERVICE_UNAVAILABLE:
      return 422;
    case ErrorCode.INTERNAL_SERVER_ERROR:
    default:
      return 500;
  }
}

/**
 * 404 handler for unmatched routes
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  const apiError: ApiError = {
    code: ErrorCode.SPREADSHEET_NOT_FOUND, // Using existing enum value
    message: `The requested endpoint ${req.method} ${req.path} was not found`,
    details: {
      method: req.method,
      path: req.path,
      availableEndpoints: [
        'POST /api/v1/upload-spreadsheet',
        'POST /api/v1/analyze-context',
        'GET /api/v1/health',
        'GET /api/v1/spreadsheet/:id',
        'DELETE /api/v1/spreadsheet/:id'
      ]
    },
    suggestions: [
      'Check the endpoint URL for typos',
      'Verify you are using the correct HTTP method',
      'Review the API documentation for available endpoints'
    ],
    timestamp: new Date().toISOString()
  };

  res.status(404).json({
    success: false,
    error: apiError,
    requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  });
};