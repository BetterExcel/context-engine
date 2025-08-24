import { Request, Response, NextFunction } from 'express';
import { validateRequest, validateFile, validateRateLimit, validateContentType, analyzeContextSchema } from '../validation';
import { ErrorCode } from '../../types/api';

describe('Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {},
      query: {},
      params: {},
      file: undefined,
      ip: '127.0.0.1',
      get: jest.fn()
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
  });

  describe('validateRequest', () => {
    it('should validate valid analyze context request', () => {
      const validRequest = {
        request: 'Calculate the sum of column A',
        currentSelection: {
          sheet: 'Sheet1',
          range: 'A1:A10',
          activeCell: 'A1'
        },
        userContext: {
          sessionId: 'session_123'
        }
      };

      mockRequest.body = validRequest;
      const middleware = validateRequest(analyzeContextSchema);
      
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject request with missing required fields', () => {
      const invalidRequest = {
        request: '', // Empty request
        currentSelection: {
          sheet: 'Sheet1',
          range: 'A1:A10',
          activeCell: 'A1'
        }
      };

      mockRequest.body = invalidRequest;
      const middleware = validateRequest(analyzeContextSchema);
      
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: ErrorCode.INVALID_REQUEST,
            message: 'Request validation failed',
            details: expect.objectContaining({
              validationErrors: expect.arrayContaining([
                expect.objectContaining({
                  field: expect.stringContaining('request'),
                  message: expect.any(String)
                })
              ])
            })
          })
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request with invalid cell range format', () => {
      const invalidRequest = {
        request: 'Calculate the sum',
        currentSelection: {
          sheet: 'Sheet1',
          range: 'invalid-range', // Invalid format
          activeCell: 'A1'
        },
        userContext: {
          sessionId: 'session_123'
        }
      };

      mockRequest.body = invalidRequest;
      const middleware = validateRequest(analyzeContextSchema);
      
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            details: expect.objectContaining({
              validationErrors: expect.arrayContaining([
                expect.objectContaining({
                  field: expect.stringContaining('range'),
                  message: expect.stringContaining('Invalid cell range format')
                })
              ])
            })
          })
        })
      );
    });

    it('should reject request with invalid cell address format', () => {
      const invalidRequest = {
        request: 'Calculate the sum',
        currentSelection: {
          sheet: 'Sheet1',
          range: 'A1:A10',
          activeCell: 'invalid-cell' // Invalid format
        },
        userContext: {
          sessionId: 'session_123'
        }
      };

      mockRequest.body = invalidRequest;
      const middleware = validateRequest(analyzeContextSchema);
      
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            details: expect.objectContaining({
              validationErrors: expect.arrayContaining([
                expect.objectContaining({
                  field: expect.stringContaining('activeCell'),
                  message: expect.stringContaining('Invalid cell address format')
                })
              ])
            })
          })
        })
      );
    });

    it('should reject request with too long text', () => {
      const invalidRequest = {
        request: 'a'.repeat(2001), // Exceeds 2000 character limit
        currentSelection: {
          sheet: 'Sheet1',
          range: 'A1:A10',
          activeCell: 'A1'
        },
        userContext: {
          sessionId: 'session_123'
        }
      };

      mockRequest.body = invalidRequest;
      const middleware = validateRequest(analyzeContextSchema);
      
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            details: expect.objectContaining({
              validationErrors: expect.arrayContaining([
                expect.objectContaining({
                  field: 'request',
                  message: expect.stringContaining('cannot exceed 2000 characters')
                })
              ])
            })
          })
        })
      );
    });
  });

  describe('validateFile', () => {
    it('should accept valid file', () => {
      const mockFile = {
        originalname: 'test.xlsx',
        size: 1024 * 1024, // 1MB
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      } as Express.Multer.File;

      mockRequest.file = mockFile;
      const middleware = validateFile(['.xlsx', '.xls', '.csv'], 50 * 1024 * 1024, true);
      
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject file with unsupported format', () => {
      const mockFile = {
        originalname: 'test.txt',
        size: 1024,
        mimetype: 'text/plain'
      } as Express.Multer.File;

      mockRequest.file = mockFile;
      const middleware = validateFile(['.xlsx', '.xls', '.csv'], 50 * 1024 * 1024, true);
      
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: ErrorCode.INVALID_FILE_FORMAT,
            message: 'Unsupported file format',
            details: expect.objectContaining({
              receivedFormat: '.txt',
              supportedFormats: ['.xlsx', '.xls', '.csv']
            })
          })
        })
      );
    });

    it('should reject file that is too large', () => {
      const mockFile = {
        originalname: 'test.xlsx',
        size: 100 * 1024 * 1024, // 100MB
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      } as Express.Multer.File;

      mockRequest.file = mockFile;
      const middleware = validateFile(['.xlsx', '.xls', '.csv'], 50 * 1024 * 1024, true);
      
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(413);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: ErrorCode.FILE_TOO_LARGE,
            message: 'File size exceeds the maximum allowed limit',
            details: expect.objectContaining({
              receivedSize: '100.00MB',
              maxSize: '50MB'
            })
          })
        })
      );
    });

    it('should reject missing required file', () => {
      mockRequest.file = undefined;
      const middleware = validateFile(['.xlsx', '.xls', '.csv'], 50 * 1024 * 1024, true);
      
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: ErrorCode.MISSING_PARAMETERS,
            message: 'File upload is required'
          })
        })
      );
    });

    it('should allow missing optional file', () => {
      mockRequest.file = undefined;
      const middleware = validateFile(['.xlsx', '.xls', '.csv'], 50 * 1024 * 1024, false);
      
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('validateRateLimit', () => {
    it('should allow requests within rate limit', () => {
      const middleware = validateRateLimit(10, 60000); // 10 requests per minute
      
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': '9'
        })
      );
    });

    it('should reject requests exceeding rate limit', () => {
      const middleware = validateRateLimit(1, 60000); // 1 request per minute
      
      // First request should pass
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
      
      // Reset mocks
      jest.clearAllMocks();
      
      // Second request should be rejected
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: ErrorCode.RATE_LIMIT_EXCEEDED,
            message: 'Rate limit exceeded'
          })
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('validateContentType', () => {
    it('should allow valid content type', () => {
      (mockRequest.get as jest.Mock).mockReturnValue('application/json');
      const middleware = validateContentType(['application/json']);
      
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject invalid content type', () => {
      (mockRequest.get as jest.Mock).mockReturnValue('text/plain');
      const middleware = validateContentType(['application/json']);
      
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: ErrorCode.INVALID_REQUEST,
            message: 'Unsupported content type',
            details: expect.objectContaining({
              receivedContentType: 'text/plain',
              allowedContentTypes: ['application/json']
            })
          })
        })
      );
    });

    it('should skip validation for GET requests', () => {
      mockRequest.method = 'GET';
      (mockRequest.get as jest.Mock).mockReturnValue('text/html');
      const middleware = validateContentType(['application/json']);
      
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should skip validation when no content type is provided', () => {
      (mockRequest.get as jest.Mock).mockReturnValue(undefined);
      const middleware = validateContentType(['application/json']);
      
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });
});