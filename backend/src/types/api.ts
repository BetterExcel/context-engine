/**
 * API request and response interfaces
 */

import { ContextData, RequestAnalysis, UserContext } from './context';
import { SelectionInfo, SpreadsheetData, DataBoundaries, SelectionState, CSVParseResult } from './spreadsheet';
import { LLMOptimizedFormat, ContextRelevanceScore } from '../services/ContextFormatter';

// Request interfaces
export interface AnalyzeContextRequest {
  request: string;
  spreadsheetId?: string;
  file?: Express.Multer.File;
  currentSelection: SelectionInfo;
  userContext: UserContext;
  options?: AnalysisOptions;
}

export interface AnalysisOptions {
  includePatterns?: boolean;
  includeHistory?: boolean;
  maxContextSize?: number;
  aiEnhanced?: boolean;
  responseFormat?: 'json' | 'natural_language' | 'both';
  maxContextLength?: number;
  relevanceThreshold?: number;
  enableAIGeneration?: boolean;
}

export interface UploadSpreadsheetRequest {
  file: Express.Multer.File;
  options?: UploadOptions;
}

export interface UploadOptions {
  parseFormulas?: boolean;
  extractPatterns?: boolean;
  generatePreview?: boolean;
}

export interface FeedbackRequest {
  requestId: string;
  contextId: string;
  satisfaction: number; // 1-5 scale
  feedback?: string;
  corrections?: ContextCorrection[];
}

export interface ContextCorrection {
  field: string;
  expectedValue: any;
  actualValue: any;
  importance: 'low' | 'medium' | 'high';
}

// Response interfaces
export interface AnalyzeContextResponse {
  success: boolean;
  data?: ContextAnalysisResult;
  error?: ApiError;
  requestId: string;
  processingTime: number;
}

export interface ContextAnalysisResult {
  requestAnalysis: RequestAnalysis;
  context: ContextData;
  naturalLanguageDescription: string;
  actionableInfo: ActionableInfo;
  suggestions: string[];
  confidence: number;
  contextHistoryId?: string;
  formattedContext?: LLMOptimizedFormat;
  relevanceScore?: ContextRelevanceScore;
}

export interface ActionableInfo {
  targetCells: string[];
  suggestedOperations: string[];
  constraints: string[];
  expectedOutcome?: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface UploadSpreadsheetResponse {
  success: boolean;
  data?: UploadResult;
  error?: ApiError;
  requestId: string;
}

export interface UploadResult {
  spreadsheetId: string;
  spreadsheetData: SpreadsheetData;
  preview: SpreadsheetPreview;
  warnings: string[];
  processingTime: number;
  boundaryAnalysis?: DataBoundaries;
  recommendedSelection?: string;
  csvParseResult?: CSVParseResult;
  selectionState?: SelectionState;
}

export interface SpreadsheetPreview {
  sheetNames: string[];
  totalRows: number;
  totalColumns: number;
  hasFormulas: boolean;
  dataTypes: string[];
  sampleData: any[][];
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  services: ServiceStatus[];
  uptime: number;
}

export interface ServiceStatus {
  name: string;
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  lastCheck: string;
  details?: Record<string, any>;
}

export interface FeedbackResponse {
  success: boolean;
  message: string;
  learningApplied: boolean;
  requestId: string;
}

// Error interfaces
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  suggestions?: string[];
  timestamp: string;
}

export enum ErrorCode {
  INVALID_FILE_FORMAT = 'INVALID_FILE_FORMAT',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  PARSING_ERROR = 'PARSING_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',
  MISSING_PARAMETERS = 'MISSING_PARAMETERS',
  CONTEXT_EXTRACTION_FAILED = 'CONTEXT_EXTRACTION_FAILED',
  AI_SERVICE_UNAVAILABLE = 'AI_SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SPREADSHEET_NOT_FOUND = 'SPREADSHEET_NOT_FOUND',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  // CSV-specific error codes
  CSV_DELIMITER_DETECTION_FAILED = 'CSV_DELIMITER_DETECTION_FAILED',
  CSV_ENCODING_DETECTION_FAILED = 'CSV_ENCODING_DETECTION_FAILED',
  CSV_MALFORMED = 'CSV_MALFORMED',
  CSV_INCONSISTENT_COLUMNS = 'CSV_INCONSISTENT_COLUMNS',
  CSV_EMPTY_FILE = 'CSV_EMPTY_FILE',
  CSV_PARSE_ERROR = 'CSV_PARSE_ERROR',
  CSV_INVALID_DELIMITER = 'CSV_INVALID_DELIMITER',
  CSV_ENCODING_CONVERSION_FAILED = 'CSV_ENCODING_CONVERSION_FAILED',
  CSV_ROW_PARSING_FAILED = 'CSV_ROW_PARSING_FAILED',
  CSV_COLUMN_COUNT_MISMATCH = 'CSV_COLUMN_COUNT_MISMATCH',
  // Selection-related error codes
  SELECTION_INVALID_RANGE = 'SELECTION_INVALID_RANGE',
  SELECTION_RANGE_TOO_LARGE = 'SELECTION_RANGE_TOO_LARGE',
  SELECTION_NO_DATA_FOUND = 'SELECTION_NO_DATA_FOUND',
  BOUNDARY_ANALYSIS_FAILED = 'BOUNDARY_ANALYSIS_FAILED'
}

// Pagination interfaces
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Query interfaces for history and sessions
export interface GetHistoryRequest {
  sessionId?: string;
  startDate?: string;
  endDate?: string;
  intentType?: string;
  pagination: PaginationParams;
}

export interface GetSessionsRequest {
  userId?: string;
  active?: boolean;
  pagination: PaginationParams;
}

// WebSocket interfaces for real-time updates
export interface WebSocketMessage {
  type: 'context_update' | 'processing_status' | 'error' | 'ping';
  payload: any;
  timestamp: string;
  requestId?: string;
}

export interface ProcessingStatusUpdate {
  stage: 'parsing' | 'analyzing' | 'extracting' | 'formatting' | 'complete';
  progress: number; // 0-100
  message: string;
  estimatedTimeRemaining?: number;
}