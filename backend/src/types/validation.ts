/**
 * Zod validation schemas for data models
 */

import { z } from 'zod';
import { DataType, IntentType, ErrorCode } from './index';

// Enum schemas
export const DataTypeSchema = z.nativeEnum(DataType);
export const IntentTypeSchema = z.nativeEnum(IntentType);
export const ErrorCodeSchema = z.nativeEnum(ErrorCode);

// Basic validation schemas
export const CellFormatSchema = z.object({
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  underline: z.boolean().optional(),
  fontSize: z.number().min(6).max(72).optional(),
  fontColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  numberFormat: z.string().optional(),
  alignment: z.enum(['left', 'center', 'right']).optional()
});

export const CellSchema = z.object({
  value: z.any(),
  formula: z.string().optional(),
  dataType: DataTypeSchema,
  formatting: CellFormatSchema.optional(),
  dependencies: z.array(z.string()).optional(),
  address: z.string().regex(/^[A-Z]+\d+$/).optional()
});

export const FormulaSchema = z.object({
  id: z.string().uuid(),
  cellAddress: z.string().regex(/^[A-Z]+\d+$/),
  formula: z.string().min(1),
  dependencies: z.array(z.string()),
  precedents: z.array(z.string()),
  isValid: z.boolean(),
  errorMessage: z.string().optional()
});

export const NamedRangeSchema = z.object({
  name: z.string().min(1).max(255),
  range: z.string().min(1),
  sheetName: z.string().min(1),
  formula: z.string().optional()
});

export const SelectionInfoSchema = z.object({
  sheet: z.string().min(1),
  range: z.string().regex(/^[A-Z]+\d+:[A-Z]+\d+$/),
  activeCell: z.string().regex(/^[A-Z]+\d+$/),
  visibleRange: z.string().regex(/^[A-Z]+\d+:[A-Z]+\d+$/).optional()
});

export const FileMetadataSchema = z.object({
  filename: z.string().min(1),
  fileSize: z.number().positive(),
  mimeType: z.string().min(1),
  uploadedAt: z.date(),
  lastModified: z.date().optional(),
  creator: z.string().optional(),
  version: z.string().optional()
});

export const SheetSchema = z.object({
  name: z.string().min(1),
  data: z.array(z.array(CellSchema)),
  dimensions: z.object({
    rows: z.number().min(0),
    cols: z.number().min(0)
  }),
  formatting: z.array(z.object({
    range: z.string(),
    format: CellFormatSchema
  })),
  namedRanges: z.array(NamedRangeSchema)
});

export const SpreadsheetDataSchema = z.object({
  id: z.string().uuid(),
  sheets: z.array(SheetSchema).min(1),
  metadata: FileMetadataSchema,
  formulas: z.array(FormulaSchema),
  namedRanges: z.array(NamedRangeSchema),
  createdAt: z.date(),
  updatedAt: z.date()
});

// Context validation schemas
export const RequestAnalysisSchema = z.object({
  intent: IntentTypeSchema,
  scope: z.string().min(1),
  confidence: z.number().min(0).max(1),
  keywords: z.array(z.string()),
  clarificationNeeded: z.boolean().optional(),
  suggestedQuestions: z.array(z.string()).optional()
});

export const ScopeInfoSchema = z.object({
  type: z.enum(['current_selection', 'sheet', 'workbook', 'custom_range']),
  range: z.string().optional(),
  includeRelated: z.boolean(),
  includeHistory: z.boolean(),
  maxCells: z.number().positive().optional()
});

export const UserActionSchema = z.object({
  type: z.enum(['cell_edit', 'formula_create', 'format_change', 'selection_change']),
  timestamp: z.date(),
  cellAddress: z.string().regex(/^[A-Z]+\d+$/).optional(),
  oldValue: z.any().optional(),
  newValue: z.any().optional(),
  details: z.record(z.any()).optional()
});

export const DataPatternSchema = z.object({
  type: z.enum(['trend', 'seasonal', 'outlier', 'missing_data', 'duplicate', 'correlation']),
  description: z.string().min(1),
  confidence: z.number().min(0).max(1),
  affectedRange: z.string().min(1),
  severity: z.enum(['low', 'medium', 'high'])
});

export const AnomalySchema = z.object({
  type: z.enum(['outlier', 'missing_value', 'inconsistent_format', 'circular_reference']),
  cellAddress: z.string().regex(/^[A-Z]+\d+$/),
  description: z.string().min(1),
  severity: z.enum(['low', 'medium', 'high']),
  suggestedFix: z.string().optional()
});

export const InsightSchema = z.object({
  type: z.enum(['suggestion', 'warning', 'optimization', 'best_practice']),
  title: z.string().min(1),
  description: z.string().min(1),
  actionable: z.boolean(),
  priority: z.enum(['low', 'medium', 'high']),
  suggestedActions: z.array(z.string()).optional()
});

// API request validation schemas
export const AnalyzeContextRequestSchema = z.object({
  request: z.string().min(1).max(1000),
  spreadsheetId: z.string().uuid().optional(),
  currentSelection: SelectionInfoSchema,
  userContext: z.object({
    sessionId: z.string().uuid(),
    recentActions: z.array(UserActionSchema).max(50),
    preferences: z.object({
      preferredFormats: z.array(z.string()),
      defaultScope: ScopeInfoSchema,
      aiAssistanceLevel: z.enum(['minimal', 'moderate', 'extensive']),
      privacySettings: z.object({
        allowDataStorage: z.boolean(),
        allowLearning: z.boolean(),
        anonymizeData: z.boolean(),
        retentionDays: z.number().min(1).max(365)
      })
    }),
    interactionHistory: z.array(z.object({
      id: z.string().uuid(),
      timestamp: z.date(),
      request: z.string(),
      response: z.string().optional(),
      satisfaction: z.number().min(1).max(5).optional(),
      feedback: z.string().optional()
    })).max(100)
  }),
  options: z.object({
    includePatterns: z.boolean().optional(),
    includeHistory: z.boolean().optional(),
    maxContextSize: z.number().positive().optional(),
    aiEnhanced: z.boolean().optional(),
    responseFormat: z.enum(['json', 'natural_language', 'both']).optional()
  }).optional()
});

export const UploadSpreadsheetRequestSchema = z.object({
  options: z.object({
    parseFormulas: z.boolean().optional(),
    extractPatterns: z.boolean().optional(),
    generatePreview: z.boolean().optional()
  }).optional()
});

export const FeedbackRequestSchema = z.object({
  requestId: z.string().uuid(),
  contextId: z.string().uuid(),
  satisfaction: z.number().min(1).max(5),
  feedback: z.string().max(1000).optional(),
  corrections: z.array(z.object({
    field: z.string().min(1),
    expectedValue: z.any(),
    actualValue: z.any(),
    importance: z.enum(['low', 'medium', 'high'])
  })).optional()
});

// Response validation schemas
export const ApiErrorSchema = z.object({
  code: ErrorCodeSchema,
  message: z.string().min(1),
  details: z.record(z.any()).optional(),
  suggestions: z.array(z.string()).optional(),
  timestamp: z.string().datetime()
});

export const HealthCheckResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: z.string().datetime(),
  version: z.string(),
  services: z.array(z.object({
    name: z.string(),
    status: z.enum(['up', 'down', 'degraded']),
    responseTime: z.number().optional(),
    lastCheck: z.string().datetime(),
    details: z.record(z.any()).optional()
  })),
  uptime: z.number().min(0)
});

// Pagination schemas
export const PaginationParamsSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

// File validation schemas
export const FileValidationSchema = z.object({
  mimetype: z.enum([
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv', // .csv
    'application/csv'
  ]),
  size: z.number().max(50 * 1024 * 1024), // 50MB max
  originalname: z.string().regex(/\.(xlsx|xls|csv)$/i)
});

// Utility validation functions
export const validateCellAddress = (address: string): boolean => {
  return /^[A-Z]+\d+$/.test(address);
};

export const validateRange = (range: string): boolean => {
  return /^[A-Z]+\d+:[A-Z]+\d+$/.test(range);
};

export const validateSheetName = (name: string): boolean => {
  return name.length > 0 && name.length <= 31 && !/[\\\/\*\?\[\]:']/.test(name);
};

// Custom validation error class
export class ValidationError extends Error {
  public readonly issues: z.ZodIssue[];
  
  constructor(error: z.ZodError) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.issues = error.issues;
  }
  
  public getFormattedErrors(): Record<string, string[]> {
    const errors: Record<string, string[]> = {};
    
    for (const issue of this.issues) {
      const path = issue.path.join('.');
      if (!errors[path]) {
        errors[path] = [];
      }
      errors[path].push(issue.message);
    }
    
    return errors;
  }
}