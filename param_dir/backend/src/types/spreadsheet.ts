/**
 * Core spreadsheet data models and interfaces
 */

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
  address?: string; // e.g., "A1", "B5"
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

export interface Formula {
  id: string;
  cell: string; // Changed from cellAddress for consistency
  sheet: string; // Added sheet reference
  formula: string;
  dependencies: string[];
  precedents: string[];
  isValid: boolean;
  errorMessage?: string;
}

export interface NamedRange {
  name: string;
  range: string;
  sheetName: string;
  formula?: string;
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

export interface FileMetadata {
  filename: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
  lastModified?: Date;
  creator?: string;
  version?: string;
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

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  circularReferences: string[][];
  namedRanges: NamedRange[];
}

export interface DependencyNode {
  id: string; // Full cell ID including sheet (e.g., "Sheet1!A1")
  cell: string; // Cell address (e.g., "A1")
  sheet: string; // Sheet name
  formula?: string;
  precedents: string[]; // Cells this cell depends on
  dependents: string[]; // Cells that depend on this cell
  level: number; // Dependency level for topological ordering
}

export interface DependencyEdge {
  from: string; // cell ID
  to: string;   // cell ID
}

export interface Range {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
  sheetName: string;
}

export interface SelectionInfo {
  sheet: string;
  range: string; // e.g., "A1:C10"
  activeCell: string; // e.g., "B5"
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