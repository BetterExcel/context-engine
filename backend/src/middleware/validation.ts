import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ApiError, ErrorCode } from '../types/api';

/**
 * Validation schemas using Zod
 */

// Common schemas
const cellRangeSchema = z.string().regex(
  /^[A-Z]+\d+(:[A-Z]+\d+)?$/,
  'Invalid cell range format. Use format like A1 or A1:C10'
);

const cellAddressSchema = z.string().regex(
  /^[A-Z]+\d+$/,
  'Invalid cell address format. Use format like A1'
);

const sessionIdSchema = z.string().min(1, 'Session ID cannot be empty');

// Selection info schema
const selectionInfoSchema = z.object({
  sheet: z.string().min(1, 'Sheet name is required'),
  range: cellRangeSchema,
  activeCell: cellAddressSchema,
  visibleRange: cellRangeSchema.optional()
});

// User context schema
const userContextSchema = z.object({
  sessionId: sessionIdSchema,
  recentActions: z.array(z.any()).optional().default([]),
  preferences: z.record(z.any()).optional().default({}),
  interactionHistory: z.array(z.any()).optional().default([])
});

// Analysis options schema
const analysisOptionsSchema = z.object({
  includePatterns: z.boolean().optional().default(true),
  includeHistory: z.boolean().optional().default(false),
  includeRelated: z.boolean().optional().default(true),
  maxContextSize: z.number().min(1).max(10000).optional().default(1000),
  aiEnhanced: z.boolean().optional().default(true),
  responseFormat: z.enum(['json', 'natural_language', 'both']).optional().default('both')
});

// Upload options schema
const uploadOptionsSchema = z.object({
  parseFormulas: z.boolean().optional().default(true),
  extractPatterns: z.boolean().optional().default(true),
  generatePreview: z.boolean().optional().default(true)
});

// Main request schemas
export const analyzeContextSchema = z.object({
  request: z.string()
    .min(1, 'Request text is required')
    .max(2000, 'Request text cannot exceed 2000 characters')
    .refine(text => text.trim().length > 0, 'Request text cannot be empty or only whitespace'),
  spreadsheetId: z.string().min(1, 'Spreadsheet ID is required').optional(),
  currentSelection: selectionInfoSchema,
  userContext: userContextSchema,
  options: analysisOptionsSchema.optional().default({})
});

export const uploadSpreadsheetSchema = z.object({
  options: uploadOptionsSchema.optional().default({})
});

export const feedbackSchema = z.object({
  requestId: z.string().min(1, 'Request ID is required'),
  contextId: z.string().min(1, 'Context ID is required'),
  satisfaction: z.number().min(1).max(5, 'Satisfaction must be between 1 and 5'),
  feedback: z.string().max(1000, 'Feedback cannot exceed 1000 characters').optional(),
  corrections: z.array(z.object({
    field: z.string().min(1, 'Field name is required'),
    expectedValue: z.any(),
    actualValue: z.any(),
    importance: z.enum(['low', 'medium', 'high'])
  })).optional().default([])
});

// Pagination schema
export const paginationSchema = z.object({
  page: z.number().min(1, 'Page must be at least 1').optional().default(1),
  limit: z.number().min(1).max(100, 'Limit must be between 1 and 100').optional().default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

// History query schema
export const historyQuerySchema = z.object({
  sessionId: sessionIdSchema.optional(),
  startDate: z.string().datetime('Invalid start date format').optional(),
  endDate: z.string().datetime('Invalid end date format').optional(),
  intentType: z.string().optional(),
  pagination: paginationSchema.optional().default({})
});

/**
 * Generic validation middleware factory
 */
export function validateRequest<T>(schema: z.ZodSchema<T>, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = source === 'body' ? req.body : 
                   source === 'query' ? req.query : 
                   req.params;

      // Parse and validate the data
      const validatedData = schema.parse(data);
      
      // Replace the original data with validated data
      if (source === 'body') {
        req.body = validatedData;
      } else if (source === 'query') {
        req.query = validatedData as any;
      } else {
        req.params = validatedData as any;
      }

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const apiError: ApiError = {
          code: ErrorCode.INVALID_REQUEST,
          message: 'Request validation failed',
          details: {
            validationErrors: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
              code: err.code,
              received: (err as any).received
            })),
            source
          },
          suggestions: [
            'Check that all required parameters are provided',
            'Verify that parameter types match the expected format',
            'Review the API documentation for correct request format'
          ],
          timestamp: new Date().toISOString()
        };

        res.status(400).json({
          success: false,
          error: apiError,
          requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });
        return;
      }

      // Pass other errors to global error handler
      next(error);
    }
  };
}

/**
 * File validation middleware
 */
export const validateFile = (
  requiredFormats: string[] = ['.xlsx', '.xls', '.csv'],
  maxSize: number = 50 * 1024 * 1024, // 50MB
  required: boolean = true
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const file = req.file;

    // Check if file is required
    if (required && !file) {
      const apiError: ApiError = {
        code: ErrorCode.MISSING_PARAMETERS,
        message: 'File upload is required',
        details: {
          parameter: 'file',
          supportedFormats: requiredFormats,
          maxSize: `${Math.round(maxSize / (1024 * 1024))}MB`
        },
        suggestions: [
          'Ensure you are sending a file with the key "file"',
          `Upload a file in one of these formats: ${requiredFormats.join(', ')}`,
          `Ensure the file size is under ${Math.round(maxSize / (1024 * 1024))}MB`
        ],
        timestamp: new Date().toISOString()
      };

      res.status(400).json({
        success: false,
        error: apiError,
        requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });
      return;
    }

    // If file is not required and not provided, continue
    if (!required && !file) {
      next();
      return;
    }

    // Validate file format
    if (file) {
      const fileExtension = '.' + file.originalname.split('.').pop()?.toLowerCase();
      if (!requiredFormats.includes(fileExtension)) {
        const apiError: ApiError = {
          code: ErrorCode.INVALID_FILE_FORMAT,
          message: 'Unsupported file format',
          details: {
            receivedFormat: fileExtension,
            supportedFormats: requiredFormats,
            filename: file.originalname
          },
          suggestions: [
            `Convert your file to one of these formats: ${requiredFormats.join(', ')}`,
            'Ensure the file extension matches the actual file format',
            'Check that the file is not corrupted'
          ],
          timestamp: new Date().toISOString()
        };

        res.status(400).json({
          success: false,
          error: apiError,
          requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });
        return;
      }

      // Validate file size
      if (file.size > maxSize) {
        const apiError: ApiError = {
          code: ErrorCode.FILE_TOO_LARGE,
          message: 'File size exceeds the maximum allowed limit',
          details: {
            receivedSize: `${(file.size / (1024 * 1024)).toFixed(2)}MB`,
            maxSize: `${Math.round(maxSize / (1024 * 1024))}MB`,
            filename: file.originalname
          },
          suggestions: [
            'Try compressing your spreadsheet file',
            'Remove unnecessary data or sheets',
            'Save as a more efficient format (e.g., .xlsx instead of .xls)',
            'Split large datasets into smaller files'
          ],
          timestamp: new Date().toISOString()
        };

        res.status(413).json({
          success: false,
          error: apiError,
          requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });
        return;
      }
    }

    next();
  };
};

/**
 * Rate limiting validation
 */
export const validateRateLimit = (
  maxRequests: number = 100,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up old entries
    for (const [key, value] of requests.entries()) {
      if (value.resetTime < windowStart) {
        requests.delete(key);
      }
    }

    // Get or create client record
    let clientRecord = requests.get(clientId);
    if (!clientRecord || clientRecord.resetTime < windowStart) {
      clientRecord = { count: 0, resetTime: now + windowMs };
      requests.set(clientId, clientRecord);
    }

    // Check rate limit
    if (clientRecord.count >= maxRequests) {
      const apiError: ApiError = {
        code: ErrorCode.RATE_LIMIT_EXCEEDED,
        message: 'Rate limit exceeded',
        details: {
          maxRequests,
          windowMs,
          resetTime: new Date(clientRecord.resetTime).toISOString()
        },
        suggestions: [
          'Wait before making another request',
          'Reduce the frequency of your requests',
          'Contact support if you need higher rate limits'
        ],
        timestamp: new Date().toISOString()
      };

      res.status(429).json({
        success: false,
        error: apiError,
        requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });
      return;
    }

    // Increment counter
    clientRecord.count++;

    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': (maxRequests - clientRecord.count).toString(),
      'X-RateLimit-Reset': new Date(clientRecord.resetTime).toISOString()
    });

    next();
  };
};

/**
 * Content type validation
 */
export const validateContentType = (allowedTypes: string[] = ['application/json']) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentType = req.get('Content-Type');
    
    // Skip validation for GET requests or requests without body
    if (req.method === 'GET' || !contentType) {
      next();
      return;
    }

    const isAllowed = allowedTypes.some(type => 
      contentType.toLowerCase().includes(type.toLowerCase())
    );

    if (!isAllowed) {
      const apiError: ApiError = {
        code: ErrorCode.INVALID_REQUEST,
        message: 'Unsupported content type',
        details: {
          receivedContentType: contentType,
          allowedContentTypes: allowedTypes
        },
        suggestions: [
          `Set Content-Type header to one of: ${allowedTypes.join(', ')}`,
          'Ensure you are sending data in the correct format',
          'For file uploads, use multipart/form-data'
        ],
        timestamp: new Date().toISOString()
      };

      res.status(400).json({
        success: false,
        error: apiError,
        requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });
      return;
    }

    next();
  };
};