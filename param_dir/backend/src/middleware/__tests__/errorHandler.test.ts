import { Request, Response, NextFunction } from 'express';
import { globalErrorHandler, notFoundHandler, asyncErrorHandler } from '../errorHandler';
import { SpreadsheetParseError } from '../../services/SpreadsheetParser';
import { RequestAnalyzerError } from '../../services/RequestAnalyzer';
import { ContextExtractionError } from '../../services/ContextExtractor';
import { ErrorCode } from '../../types/api';

// Mock console.error to avoid noise in tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      url: '/test',
      method: 'POST',
      body: { test: 'data' },
      params: {},
      query: {}
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
  });

  describe('globalErrorHandler', () => {
    it('should handle SpreadsheetParseError correctly', () => {
      const error = new SpreadsheetParseError('Test parse error', 'PARSE_ERROR', { detail: 'test' });
      
      globalErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'PARSE_ERROR',
            message: 'Test parse error',
            details: expect.objectContaining({
              detail: 'test',
              errorType: 'SpreadsheetParseError'
            }),
            suggestions: expect.arrayContaining([
              'Check if the file is corrupted',
              'Try opening the file in Excel to verify it works',
              'Save the file in a different format and try again'
            ])
          }),
          requestId: expect.any(String)
        })
      );
    });

    it('should handle RequestAnalyzerError correctly', () => {
      const error = new RequestAnalyzerError('Test analyzer error', 'INVALID_INTENT');
      
      globalErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: ErrorCode.INVALID_REQUEST,
            message: 'Request analysis failed: Test analyzer error',
            details: expect.objectContaining({
              analyzerError: 'INVALID_INTENT',
              errorType: 'RequestAnalyzerError'
            })
          })
        })
      );
    });

    it('should handle ContextExtractionError correctly', () => {
      const error = new ContextExtractionError('Test extraction error', 'INVALID_RANGE');
      
      globalErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(422);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: ErrorCode.CONTEXT_EXTRACTION_FAILED,
            message: 'Context extraction failed: Test extraction error',
            details: expect.objectContaining({
              extractorError: 'INVALID_RANGE',
              errorType: 'ContextExtractionError'
            })
          })
        })
      );
    });

    it('should handle MulterError for file size limit', () => {
      const error = new Error('File too large') as any;
      error.name = 'MulterError';
      error.code = 'LIMIT_FILE_SIZE';
      
      globalErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(413);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: ErrorCode.FILE_TOO_LARGE,
            message: 'File size exceeds the maximum allowed limit',
            suggestions: expect.arrayContaining([
              'Try compressing your spreadsheet file',
              'Remove unnecessary data or sheets',
              'Save as a more efficient format (e.g., .xlsx instead of .xls)'
            ])
          })
        })
      );
    });

    it('should handle JSON syntax errors', () => {
      const error = new SyntaxError('Unexpected token in JSON at position 0');
      
      globalErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: ErrorCode.INVALID_REQUEST,
            message: 'Invalid JSON in request body',
            suggestions: expect.arrayContaining([
              'Check that your request body contains valid JSON',
              'Ensure all strings are properly quoted',
              'Verify that brackets and braces are properly closed'
            ])
          })
        })
      );
    });

    it('should handle connection errors', () => {
      const error = new Error('ECONNREFUSED: Connection refused');
      
      globalErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: ErrorCode.INTERNAL_SERVER_ERROR,
            message: 'Service temporarily unavailable',
            details: expect.objectContaining({
              connectionError: 'Unable to connect to required services',
              errorType: 'ConnectionError'
            })
          })
        })
      );
    });

    it('should handle timeout errors', () => {
      const error = new Error('Request timeout after 30000ms');
      
      globalErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: ErrorCode.INTERNAL_SERVER_ERROR,
            message: 'Request timeout',
            suggestions: expect.arrayContaining([
              'Try with a smaller file or dataset',
              'Reduce the complexity of your request',
              'Try again as the service may be experiencing high load'
            ])
          })
        })
      );
    });

    it('should handle unknown errors', () => {
      const error = new Error('Unknown error occurred');
      
      globalErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: ErrorCode.INTERNAL_SERVER_ERROR,
            message: 'An unexpected error occurred',
            details: expect.objectContaining({
              error: 'Unknown error occurred',
              errorType: 'Error'
            })
          })
        })
      );
    });
  });

  describe('notFoundHandler', () => {
    it('should handle 404 errors correctly', () => {
      mockRequest.method = 'GET';
      (mockRequest as any).path = '/api/v1/nonexistent';
      
      notFoundHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'The requested endpoint GET /api/v1/nonexistent was not found',
            details: expect.objectContaining({
              method: 'GET',
              path: '/api/v1/nonexistent',
              availableEndpoints: expect.arrayContaining([
                'POST /api/v1/upload-spreadsheet',
                'POST /api/v1/analyze-context',
                'GET /api/v1/health'
              ])
            })
          }),
          requestId: expect.any(String)
        })
      );
    });
  });

  describe('asyncErrorHandler', () => {
    it('should catch async errors and pass to next', async () => {
      const asyncFunction = jest.fn().mockRejectedValue(new Error('Async error'));
      const wrappedFunction = asyncErrorHandler(asyncFunction);

      await wrappedFunction(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Async error'
      }));
    });

    it('should handle successful async functions', async () => {
      const asyncFunction = jest.fn().mockResolvedValue('success');
      const wrappedFunction = asyncErrorHandler(asyncFunction);

      await wrappedFunction(mockRequest as Request, mockResponse as Response, mockNext);

      expect(asyncFunction).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle sync functions that throw', async () => {
      const syncFunction = jest.fn().mockImplementation(() => {
        throw new Error('Sync error');
      });
      const wrappedFunction = asyncErrorHandler(syncFunction);

      // Call the wrapped function - it should catch the error internally
      await wrappedFunction(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Sync error'
      }));
    });
  });
});