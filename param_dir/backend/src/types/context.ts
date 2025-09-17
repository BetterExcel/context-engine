/**
 * Context analysis and extraction data models
 */

import { Cell, Formula, NamedRange, SelectionInfo } from './spreadsheet';

export enum IntentType {
  FORMULA_ASSISTANCE = 'formula_assistance',
  DATA_ANALYSIS = 'data_analysis',
  FORMATTING = 'formatting',
  DATA_MANIPULATION = 'data_manipulation',
  TROUBLESHOOTING = 'troubleshooting',
  GENERAL_ASSISTANCE = 'general_assistance'
}

export interface RequestAnalysis {
  intent: IntentType;
  scope: string;
  confidence: number;
  keywords: string[];
  clarificationNeeded?: boolean;
  suggestedQuestions?: string[];
}

export interface ScopeInfo {
  type: 'current_selection' | 'sheet' | 'workbook' | 'custom_range';
  range?: string;
  includeRelated: boolean;
  includeHistory: boolean;
  maxCells?: number;
}

export interface ImmediateContext {
  selectedData: Cell[][];
  activeCell: Cell;
  visibleData: Cell[][];
  currentFormulas: Formula[];
  selectionInfo: SelectionInfo;
}

export interface RelatedContext {
  dependentCells: Cell[];
  precedentCells: Cell[];
  relatedFormulas: Formula[];
  namedRanges: NamedRange[];
  crossSheetReferences: string[];
}

export interface StructuralContext {
  headers: string[];
  dataTypes: string[];
  columnCount: number;
  rowCount: number;
  hasFormulas: boolean;
  hasNamedRanges: boolean;
  sheetStructure: SheetStructure;
}

export interface SheetStructure {
  hasHeaders: boolean;
  headerRow?: number;
  dataStartRow: number;
  dataEndRow: number;
  dataColumns: ColumnInfo[];
}

export interface ColumnInfo {
  index: number;
  header?: string;
  dataType: string;
  hasFormulas: boolean;
  isEmpty: boolean;
  uniqueValues?: number;
}

export interface HistoricalContext {
  recentActions: UserAction[];
  previousRequests: string[];
  sessionDuration: number;
  interactionCount: number;
}

export interface UserAction {
  type: 'cell_edit' | 'formula_create' | 'format_change' | 'selection_change';
  timestamp: Date;
  cellAddress?: string;
  oldValue?: any;
  newValue?: any;
  details?: Record<string, any>;
}

export interface PatternInsights {
  dataPatterns: DataPattern[];
  relationships: Relationship[];
  anomalies: Anomaly[];
  insights: Insight[];
  confidence: number;
}

export interface DataPattern {
  type: 'trend' | 'seasonal' | 'outlier' | 'missing_data' | 'duplicate' | 'correlation';
  description: string;
  confidence: number;
  affectedRange: string;
  severity: 'low' | 'medium' | 'high';
}

export interface Relationship {
  type: 'dependency' | 'correlation' | 'hierarchy' | 'grouping';
  source: string;
  target: string;
  strength: number;
  description: string;
}

export interface Anomaly {
  type: 'outlier' | 'missing_value' | 'inconsistent_format' | 'circular_reference';
  cellAddress: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  suggestedFix?: string;
}

export interface Insight {
  type: 'suggestion' | 'warning' | 'optimization' | 'best_practice';
  title: string;
  description: string;
  actionable: boolean;
  priority: 'low' | 'medium' | 'high';
  suggestedActions?: string[];
}

export interface DataSummary {
  rowCount: number;
  columnCount: number;
  cellCount: number;
  formulaCount: number;
  emptyCount: number;
  dataTypes: Record<string, number>;
  patterns: string[];
  statistics?: Record<string, any>;
}

export interface ContextData {
  immediate: ImmediateContext;
  related: RelatedContext;
  structural: StructuralContext;
  historical: HistoricalContext;
  patterns: PatternInsights;
  summary: DataSummary;
  confidence: number;
  generatedAt: Date;
}

export interface UserContext {
  sessionId: string;
  recentActions: UserAction[];
  preferences: UserPreferences;
  interactionHistory: InteractionRecord[];
}

export interface UserPreferences {
  preferredFormats: string[];
  defaultScope: ScopeInfo;
  aiAssistanceLevel: 'minimal' | 'moderate' | 'extensive';
  privacySettings: PrivacySettings;
}

export interface PrivacySettings {
  allowDataStorage: boolean;
  allowLearning: boolean;
  anonymizeData: boolean;
  retentionDays: number;
}

export interface InteractionRecord {
  id: string;
  timestamp: Date;
  request: string;
  context: ContextData;
  response?: string;
  satisfaction?: number;
  feedback?: string;
}