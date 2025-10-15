// File upload types
export interface FileUploadProps {
  onFileUpload: (file: File) => void;
  acceptedFormats: string[];
  maxFileSize: number;
  isUploading: boolean;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  spreadsheetId?: string;
  error?: string;
  data?: {
    spreadsheetData: SpreadsheetData;
    boundaryAnalysis?: DataBoundaries;
    recommendedSelection?: string;
    csvParseResult?: CSVParseResult;
    selectionState?: SelectionState;
    warnings?: string[];
  };
}

export interface FileValidationError {
  type: 'format' | 'size' | 'general';
  message: string;
}

// API types
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    suggestions?: string[];
  };
  request_id?: string;
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

// Spreadsheet types (imported from backend)
export enum DataType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  BOOLEAN = 'boolean',
  FORMULA = 'formula',
  ERROR = 'error',
  EMPTY = 'empty'
}

export interface Cell {
  value: any;
  formula?: string;
  dataType: DataType;
  formatting?: CellFormat;
  dependencies?: string[];
  address?: string;
}

export interface CellFormat {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
  fontColor?: string;
  backgroundColor?: string;
  numberFormat?: string;
  alignment?: 'left' | 'center' | 'right';
}

export interface Sheet {
  name: string;
  data: Cell[][];
  dimensions: {
    rows: number;
    cols: number;
  };
  formatting: FormatInfo[];
  namedRanges: NamedRange[];
}

export interface FormatInfo {
  range: string;
  format: CellFormat;
}

export interface NamedRange {
  name: string;
  range: string;
  sheetName: string;
  formula?: string;
}

export interface SpreadsheetData {
  id: string;
  sheets: Sheet[];
  metadata: FileMetadata;
  formulas: Formula[];
  namedRanges: NamedRange[];
  createdAt: Date;
  updatedAt: Date;
  recommendedSelection?: string;
  boundaryAnalysis?: DataBoundaries;
}

export interface DataBoundaries {
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
  totalCells: number;
  emptyCells: number;
  hasHeaders: boolean;
}

export interface FileMetadata {
  filename: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
  lastModified?: Date;
  creator?: string;
  version?: string;
}

export interface Formula {
  id: string;
  cellAddress: string;
  formula: string;
  dependencies: string[];
  precedents: string[];
  isValid: boolean;
  errorMessage?: string;
}

export interface SelectionInfo {
  sheet: string;
  range: string;
  activeCell: string;
  visibleRange?: string;
}

export interface SelectionState {
  range: string;
  isManual: boolean;
  timestamp: Date;
  boundaries: DataBoundaries;
  sheetIndex?: number;
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
  hasHeaders: boolean;
  confidence: number;
}

// SpreadsheetViewer component props
export interface SpreadsheetViewerProps {
  data: SpreadsheetData;
  selectedRange: string | null;
  onSelectionChange: (range: string) => void;
  onCellClick: (cell: string) => void;
  defaultSelection?: string;
  onSelectionTypeChange?: (isManual: boolean) => void;
  onSheetChange?: (sheetIndex: number) => void;
  selectionState?: SelectionState;
  onSelectionStateChange?: (state: SelectionState) => void;
}

// RequestInput component props
export interface RequestInputProps {
  onSubmit: (request: string) => void;
  isProcessing: boolean;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
}

// Context analysis types
export interface ContextAnalysisRequest {
  request: string;
  spreadsheetId: string;
  currentSelection: SelectionInfo;
}

export interface ContextAnalysisResponse {
  requestAnalysis: {
    intent: string;
    scope: string;
    confidence: number;
  };
  spreadsheetContext: {
    currentSelection: {
      range: string;
      data: Cell[][];
      dataTypes: string[];
    };
    relatedFormulas: Formula[];
    dependencies: string[];
    dataSummary: {
      rowCount: number;
      patterns: string[];
      statistics: Record<string, any>;
    };
  };
  actionableInfo: {
    targetCells: string[];
    suggestedOperations: string[];
    constraints: string[];
  };
  naturalLanguageDescription: string;
  requestId?: string;
  contextHistoryId?: string;
}

// ContextDisplay component props
export interface ContextDisplayProps {
  context: ContextAnalysisResponse | null;
  isLoading: boolean;
  error?: string | null;
}

export type ContextDisplayTab = 'natural' | 'json' | 'visual';

// Re-export enhanced context types
export * from './enhanced-context';