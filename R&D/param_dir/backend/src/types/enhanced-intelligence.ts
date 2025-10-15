/**
 * Enhanced Data Intelligence types and interfaces
 * Supporting advanced spreadsheet analysis with intelligent data recognition
 */

import { DataType, Cell, SpreadsheetData } from './spreadsheet';

// Enhanced data types with domain-specific intelligence
export enum EnhancedDataType {
  // Basic types (extending existing DataType)
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  BOOLEAN = 'boolean',
  FORMULA = 'formula',
  ERROR = 'error',
  EMPTY = 'empty',
  
  // Financial types
  CURRENCY = 'currency',
  PERCENTAGE = 'percentage',
  STOCK_SYMBOL = 'stock_symbol',
  COMPANY_NAME = 'company_name',
  
  // Business types
  EMAIL = 'email',
  PHONE = 'phone',
  URL = 'url',
  ID_NUMBER = 'id_number',
  
  // Temporal types
  TIME = 'time',
  DATETIME = 'datetime',
  DURATION = 'duration',
  
  // Numeric subtypes
  INTEGER = 'integer',
  DECIMAL = 'decimal',
  SCIENTIFIC = 'scientific',
  RATIO = 'ratio'
}

// Domain classification for contextual understanding
export enum DomainType {
  FINANCIAL = 'financial',
  BUSINESS = 'business',
  SCIENTIFIC = 'scientific',
  EDUCATIONAL = 'educational',
  INVENTORY = 'inventory',
  SALES = 'sales',
  MARKETING = 'marketing',
  HR = 'hr',
  ACCOUNTING = 'accounting',
  GENERAL = 'general'
}

// Pattern types for intelligent recognition
export enum PatternType {
  HEADER_ROW = 'header_row',
  DATA_BLOCK = 'data_block',
  SUMMARY_ROW = 'summary_row',
  CALCULATED_COLUMN = 'calculated_column',
  LOOKUP_TABLE = 'lookup_table',
  TIME_SERIES = 'time_series',
  PIVOT_DATA = 'pivot_data',
  FINANCIAL_STATEMENT = 'financial_statement'
}

// Enhanced cell with intelligence metadata
export interface IntelligentCell extends Cell {
  enhancedDataType: EnhancedDataType;
  confidence: number;
  synonyms?: string[];
  normalizedValue?: any;
  domainContext?: DomainContext;
  qualityScore?: number;
  anomalyFlags?: AnomalyFlag[];
}

// Domain context for business intelligence
export interface DomainContext {
  domain: DomainType;
  confidence: number;
  subDomain?: string;
  businessRules?: BusinessRule[];
  suggestedMetrics?: MetricDefinition[];
}

// Business rules for domain-specific validation
export interface BusinessRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  severity: 'info' | 'warning' | 'error';
  suggestedFix?: string;
}

// Metric definitions for business intelligence
export interface MetricDefinition {
  name: string;
  formula: string;
  description: string;
  category: string;
  applicableColumns?: string[];
}

// Anomaly detection flags
export interface AnomalyFlag {
  type: 'outlier' | 'missing' | 'inconsistent' | 'suspicious';
  severity: 'low' | 'medium' | 'high';
  description: string;
  confidence: number;
}

// Enhanced spreadsheet data with intelligence
export interface IntelligentSpreadsheetData extends SpreadsheetData {
  searchIndex: SearchIndex;
  dataPatterns: DataPatterns;
  qualityMetrics: QualityAssessment;
  domainContext: DomainContext;
  columnMappings: ColumnMapping[];
  entityIndex: EntityIndex;
  synonymIndex: SynonymIndex;
}

// Multi-dimensional search index
export interface SearchIndex {
  byContent: Map<string, CellReference[]>;
  byColumn: Map<string, ColumnInfo>;
  byDataType: Map<EnhancedDataType, CellReference[]>;
  byPattern: Map<PatternType, PatternMatch[]>;
  byDomain: Map<DomainType, CellReference[]>;
  fuzzyIndex: FuzzySearchIndex;
}

// Fuzzy search capabilities
export interface FuzzySearchIndex {
  companyNames: Map<string, CompanyMatch[]>;
  financialTerms: Map<string, TermMatch[]>;
  generalTerms: Map<string, TermMatch[]>;
  phoneticIndex: Map<string, string[]>;
}

// Company name matching with synonyms
export interface CompanyMatch {
  originalName: string;
  normalizedName: string;
  aliases: string[];
  stockSymbol?: string;
  confidence: number;
  cellReferences: CellReference[];
}

// Financial term matching
export interface TermMatch {
  term: string;
  category: string;
  synonyms: string[];
  confidence: number;
  cellReferences: CellReference[];
}

// Cell reference with metadata
export interface CellReference {
  sheet: string;
  row: number;
  col: number;
  address: string;
  value: any;
  confidence?: number;
  dataType?: EnhancedDataType;
}

// Column information with intelligence
export interface ColumnInfo {
  index: number;
  name?: string;
  enhancedDataType: EnhancedDataType;
  domainType?: DomainType;
  confidence: number;
  patterns: PatternType[];
  qualityScore: number;
  uniqueValues: number;
  nullCount: number;
  statistics?: ColumnStatistics;
}

// Column statistics for numeric data
export interface ColumnStatistics {
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  stdDev?: number;
  quartiles?: [number, number, number];
  outliers?: number[];
}

// Data patterns detected in spreadsheet
export interface DataPatterns {
  headerPatterns: HeaderPattern[];
  dataBlocks: DataBlock[];
  relationships: DataRelationship[];
  hierarchies: DataHierarchy[];
  timeSeriesPatterns: TimeSeriesPattern[];
}

// Header pattern recognition
export interface HeaderPattern {
  row: number;
  columns: number[];
  confidence: number;
  type: 'main_header' | 'sub_header' | 'group_header';
  content: string[];
}

// Data block identification
export interface DataBlock {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
  type: PatternType;
  confidence: number;
  description: string;
}

// Data relationships between columns/rows
export interface DataRelationship {
  type: 'dependency' | 'correlation' | 'hierarchy' | 'lookup';
  source: CellReference[];
  target: CellReference[];
  strength: number;
  description: string;
}

// Data hierarchy detection
export interface DataHierarchy {
  levels: HierarchyLevel[];
  type: 'organizational' | 'categorical' | 'temporal' | 'geographical';
  confidence: number;
}

// Hierarchy level definition
export interface HierarchyLevel {
  level: number;
  column: number;
  name?: string;
  parentColumn?: number;
  values: string[];
}

// Time series pattern detection
export interface TimeSeriesPattern {
  dateColumn: number;
  valueColumns: number[];
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'irregular';
  trend: 'increasing' | 'decreasing' | 'stable' | 'seasonal';
  confidence: number;
}

// Quality assessment metrics
export interface QualityAssessment {
  overallScore: number;
  completeness: number;
  consistency: number;
  accuracy: number;
  validity: number;
  uniqueness: number;
  timeliness?: number;
  issues: DataQualityIssue[];
  recommendations: QualityRecommendation[];
}

// Data quality issues
export interface DataQualityIssue {
  type: 'missing_data' | 'duplicate_data' | 'inconsistent_format' | 'invalid_value' | 'outlier';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedCells: CellReference[];
  suggestedFix?: string;
  confidence: number;
}

// Quality improvement recommendations
export interface QualityRecommendation {
  type: 'data_cleaning' | 'format_standardization' | 'validation_rule' | 'enrichment';
  priority: 'low' | 'medium' | 'high';
  description: string;
  expectedImpact: string;
  implementationSteps: string[];
}

// Column mapping for data transformation
export interface ColumnMapping {
  sourceColumn: number;
  targetName: string;
  dataType: EnhancedDataType;
  transformations: DataTransformation[];
  confidence: number;
}

// Data transformation definitions
export interface DataTransformation {
  type: 'normalize' | 'standardize' | 'clean' | 'enrich' | 'validate';
  description: string;
  parameters: Record<string, any>;
}

// Entity index for fast lookups
export interface EntityIndex {
  companies: Map<string, EntityMatch[]>;
  people: Map<string, EntityMatch[]>;
  locations: Map<string, EntityMatch[]>;
  products: Map<string, EntityMatch[]>;
  financialInstruments: Map<string, EntityMatch[]>;
}

// Entity matching results
export interface EntityMatch {
  entity: string;
  type: 'company' | 'person' | 'location' | 'product' | 'financial_instrument';
  confidence: number;
  metadata: Record<string, any>;
  cellReferences: CellReference[];
}

// Synonym index for intelligent matching
export interface SynonymIndex {
  companyNames: Map<string, string[]>;
  financialTerms: Map<string, string[]>;
  businessTerms: Map<string, string[]>;
  technicalTerms: Map<string, string[]>;
  abbreviations: Map<string, string>;
}

// Pattern matching results
export interface PatternMatch {
  pattern: PatternType;
  location: {
    startRow: number;
    endRow: number;
    startCol: number;
    endCol: number;
  };
  confidence: number;
  metadata: Record<string, any>;
}

// Configuration for enhanced parsing
export interface EnhancedParseConfig {
  enableDomainDetection?: boolean;
  enableFuzzySearch?: boolean;
  enableSynonymRecognition?: boolean;
  enableQualityAssessment?: boolean;
  enablePatternDetection?: boolean;
  confidenceThreshold?: number;
  maxSynonyms?: number;
  domainHints?: DomainType[];
}