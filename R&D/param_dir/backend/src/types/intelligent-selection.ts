/**
 * Types for intelligent auto-selection and relationship mapping
 */

import { Range, Cell } from './spreadsheet';
import { RequestAnalysis } from './context';

export interface IntelligentSelectionRequest {
  query: string;
  intent: RequestAnalysis;
  entities: string[];
  sheetName?: string;
  preferences?: SelectionPreferences;
  scope?: SelectionScope;
}

export interface IntelligentSelectionResponse {
  candidates: SelectionCandidate[];
  recommendedSelection: SelectionCandidate | null;
  relationshipMap: RelationshipMap;
  confidence: number;
  explanation: string;
  alternatives: SelectionAlternative[];
}

export interface SelectionCandidate {
  id: string;
  range: Range;
  confidence: number;
  explanation: string;
  matchType: MatchType;
  relevantColumns: ColumnReference[];
  relatedSelections: Range[];
  entityMatches: EntityMatch[];
  score: number;
  selectionType: SelectionType;
  metadata: SelectionMetadata;
}

export interface SelectionAlternative {
  candidate: SelectionCandidate;
  reason: string;
  useCase: string;
}

export interface SelectionMetadata {
  cellCount: number;
  dataQuality: number;
  completeness: number;
  hasFormulas: boolean;
  hasHeaders: boolean;
  estimatedProcessingTime: number;
}

export enum SelectionType {
  ROW_BASED = 'row_based',
  COLUMN_BASED = 'column_based',
  CELL_AREA = 'cell_area',
  DATA_RANGE = 'data_range',
  FORMULA_RANGE = 'formula_range',
  CONTEXTUAL = 'contextual'
}

export interface EntityMatch {
  entity: string;
  matchedCells: CellMatch[];
  confidence: number;
  matchType: MatchType;
  synonyms: string[];
  context: EntityContext;
}

export interface EntityContext {
  domain: EntityDomain;
  category: EntityCategory;
  attributes: EntityAttribute[];
}

export enum EntityDomain {
  FINANCIAL = 'financial',
  BUSINESS = 'business',
  PERSONAL = 'personal',
  TECHNICAL = 'technical',
  GENERAL = 'general'
}

export enum EntityCategory {
  COMPANY = 'company',
  PERSON = 'person',
  PRODUCT = 'product',
  LOCATION = 'location',
  DATE = 'date',
  NUMBER = 'number',
  CURRENCY = 'currency',
  PERCENTAGE = 'percentage',
  OTHER = 'other'
}

export interface EntityAttribute {
  name: string;
  value: string;
  confidence: number;
}

export interface CellMatch {
  row: number;
  col: number;
  value: any;
  similarity: number;
  address: string;
  context: CellContext;
}

export interface CellContext {
  surroundingCells: Cell[];
  columnHeader?: string;
  rowContext?: string;
  dataPattern?: DataPattern;
}

export enum DataPattern {
  HEADER = 'header',
  DATA_VALUE = 'data_value',
  CALCULATED = 'calculated',
  LOOKUP_VALUE = 'lookup_value',
  SUMMARY = 'summary',
  LABEL = 'label'
}

export enum MatchType {
  EXACT = 'exact',
  FUZZY = 'fuzzy',
  SYNONYM = 'synonym',
  PARTIAL = 'partial',
  PATTERN = 'pattern',
  SEMANTIC = 'semantic'
}

export interface ColumnReference {
  index: number;
  header?: string;
  dataType: string;
  relevanceScore: number;
  relationship: RelationshipType;
  statistics?: ColumnStatistics;
  quality: DataQuality;
}

export interface ColumnStatistics {
  uniqueValues: number;
  nullCount: number;
  dataTypeDistribution: Record<string, number>;
  numericStats?: NumericStatistics;
  textStats?: TextStatistics;
}

export interface NumericStatistics {
  min: number;
  max: number;
  mean: number;
  median: number;
  standardDeviation: number;
  outliers: number[];
}

export interface TextStatistics {
  averageLength: number;
  maxLength: number;
  minLength: number;
  commonPatterns: string[];
  encoding: string;
}

export interface DataQuality {
  completeness: number;
  consistency: number;
  accuracy: number;
  validity: number;
  issues: DataQualityIssue[];
}

export interface DataQualityIssue {
  type: QualityIssueType;
  severity: IssueSeverity;
  description: string;
  affectedCells: string[];
  suggestedFix?: string;
}

export enum QualityIssueType {
  MISSING_VALUES = 'missing_values',
  INCONSISTENT_FORMAT = 'inconsistent_format',
  OUTLIERS = 'outliers',
  DUPLICATES = 'duplicates',
  INVALID_VALUES = 'invalid_values',
  ENCODING_ISSUES = 'encoding_issues'
}

export enum IssueSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum RelationshipType {
  PRIMARY = 'primary',
  DEPENDENT = 'dependent',
  RELATED = 'related',
  CONTEXTUAL = 'contextual',
  HIERARCHICAL = 'hierarchical',
  CALCULATED = 'calculated'
}

export interface SelectionContext {
  query: string;
  intent: RequestAnalysis;
  entities: string[];
  scope: SelectionScope;
  preferences: SelectionPreferences;
  sessionContext?: SessionContext;
}

export interface SessionContext {
  previousSelections: SelectionCandidate[];
  userFeedback: SelectionFeedback[];
  learningData: LearningData;
}

export interface SelectionFeedback {
  selectionId: string;
  rating: number;
  feedback: string;
  timestamp: Date;
  improvements: string[];
}

export interface LearningData {
  preferredSelectionTypes: SelectionType[];
  commonEntityTypes: EntityCategory[];
  averageConfidenceThreshold: number;
  selectionPatterns: SelectionPattern[];
}

export interface SelectionPattern {
  pattern: string;
  frequency: number;
  successRate: number;
  context: string[];
}

export interface SelectionScope {
  includeHeaders: boolean;
  expandToRelated: boolean;
  maxRows?: number;
  maxColumns?: number;
  confidenceThreshold: number;
  respectDataBoundaries: boolean;
  includeCalculatedFields: boolean;
}

export interface SelectionPreferences {
  prioritizeExactMatches: boolean;
  includeCalculatedFields: boolean;
  expandToDependencies: boolean;
  respectDataBoundaries: boolean;
  preferLargerSelections: boolean;
  optimizeForAnalysis: boolean;
  includeContextualData: boolean;
}

export interface RelationshipMap {
  columnDependencies: ColumnDependency[];
  dataHierarchies: DataHierarchy[];
  calculatedFields: CalculatedField[];
  crossReferences: CrossReference[];
  semanticRelationships: SemanticRelationship[];
}

export interface ColumnDependency {
  sourceColumn: number;
  targetColumn: number;
  dependencyType: DependencyType;
  strength: number;
  description: string;
  formula?: string;
  isDirectDependency: boolean;
}

export enum DependencyType {
  FORMULA = 'formula',
  LOOKUP = 'lookup',
  AGGREGATION = 'aggregation',
  CALCULATION = 'calculation',
  REFERENCE = 'reference',
  VALIDATION = 'validation',
  CONDITIONAL = 'conditional'
}

export interface DataHierarchy {
  parentColumn: number;
  childColumns: number[];
  hierarchyType: HierarchyType;
  levels: number;
  structure: HierarchyStructure;
}

export interface HierarchyStructure {
  levelNames: string[];
  relationships: HierarchyRelationship[];
  aggregationRules: AggregationRule[];
}

export interface HierarchyRelationship {
  parentLevel: number;
  childLevel: number;
  cardinality: Cardinality;
}

export enum Cardinality {
  ONE_TO_ONE = 'one_to_one',
  ONE_TO_MANY = 'one_to_many',
  MANY_TO_ONE = 'many_to_one',
  MANY_TO_MANY = 'many_to_many'
}

export interface AggregationRule {
  sourceLevel: number;
  targetLevel: number;
  aggregationType: AggregationType;
  formula?: string;
}

export enum AggregationType {
  SUM = 'sum',
  AVERAGE = 'average',
  COUNT = 'count',
  MIN = 'min',
  MAX = 'max',
  CONCATENATE = 'concatenate',
  CUSTOM = 'custom'
}

export enum HierarchyType {
  CATEGORICAL = 'categorical',
  TEMPORAL = 'temporal',
  NUMERICAL = 'numerical',
  ORGANIZATIONAL = 'organizational',
  GEOGRAPHICAL = 'geographical',
  FUNCTIONAL = 'functional'
}

export interface CalculatedField {
  column: number;
  formula: string;
  dependencies: number[];
  calculationType: CalculationType;
  isVolatile: boolean;
  updateFrequency: UpdateFrequency;
}

export enum CalculationType {
  SUM = 'sum',
  AVERAGE = 'average',
  COUNT = 'count',
  PERCENTAGE = 'percentage',
  RATIO = 'ratio',
  GROWTH_RATE = 'growth_rate',
  VARIANCE = 'variance',
  CUSTOM = 'custom'
}

export enum UpdateFrequency {
  REAL_TIME = 'real_time',
  ON_CHANGE = 'on_change',
  PERIODIC = 'periodic',
  MANUAL = 'manual'
}

export interface CrossReference {
  sourceRange: Range;
  targetRange: Range;
  referenceType: ReferenceType;
  strength: number;
  bidirectional: boolean;
  keyColumns: KeyColumnMapping[];
}

export interface KeyColumnMapping {
  sourceColumn: number;
  targetColumn: number;
  matchType: MatchType;
  uniqueness: number;
}

export enum ReferenceType {
  LOOKUP_TABLE = 'lookup_table',
  MASTER_DETAIL = 'master_detail',
  CROSS_TAB = 'cross_tab',
  VALIDATION = 'validation',
  FOREIGN_KEY = 'foreign_key',
  DIMENSIONAL = 'dimensional'
}

export interface SemanticRelationship {
  sourceColumn: number;
  targetColumn: number;
  relationshipType: SemanticRelationshipType;
  confidence: number;
  description: string;
  evidence: SemanticEvidence[];
}

export enum SemanticRelationshipType {
  SYNONYM = 'synonym',
  ANTONYM = 'antonym',
  HYPERNYM = 'hypernym',
  HYPONYM = 'hyponym',
  MERONYM = 'meronym',
  HOLONYM = 'holonym',
  SIMILAR = 'similar',
  RELATED = 'related'
}

export interface SemanticEvidence {
  type: EvidenceType;
  value: string;
  confidence: number;
  source: string;
}

export enum EvidenceType {
  HEADER_SIMILARITY = 'header_similarity',
  DATA_PATTERN = 'data_pattern',
  VALUE_CORRELATION = 'value_correlation',
  DOMAIN_KNOWLEDGE = 'domain_knowledge',
  USER_FEEDBACK = 'user_feedback',
  STATISTICAL = 'statistical'
}

export interface SelectionOptimizationConfig {
  maxCandidates: number;
  minConfidence: number;
  fuzzyThreshold: number;
  expansionRadius: number;
  weightings: SelectionWeightings;
  constraints: SelectionConstraints;
}

export interface SelectionWeightings {
  exactMatch: number;
  fuzzyMatch: number;
  entityConfidence: number;
  columnRelevance: number;
  dataQuality: number;
  relationshipStrength: number;
  userPreference: number;
}

export interface SelectionConstraints {
  maxCellCount: number;
  maxRowCount: number;
  maxColumnCount: number;
  minDataQuality: number;
  requireHeaders: boolean;
  excludeEmptyColumns: boolean;
  respectFormulaBoundaries: boolean;
}

export interface SelectionExplanation {
  summary: string;
  reasoning: ReasoningStep[];
  confidence: ConfidenceBreakdown;
  alternatives: AlternativeExplanation[];
  recommendations: SelectionRecommendation[];
}

export interface ReasoningStep {
  step: number;
  description: string;
  evidence: Evidence[];
  confidence: number;
}

export interface Evidence {
  type: EvidenceType;
  description: string;
  value: any;
  weight: number;
}

export interface ConfidenceBreakdown {
  overall: number;
  entityMatching: number;
  dataQuality: number;
  relationshipMapping: number;
  contextualRelevance: number;
  factors: ConfidenceFactor[];
}

export interface ConfidenceFactor {
  name: string;
  value: number;
  weight: number;
  description: string;
}

export interface AlternativeExplanation {
  alternative: SelectionCandidate;
  reason: string;
  tradeoffs: string[];
  suitability: number;
}

export interface SelectionRecommendation {
  type: RecommendationType;
  description: string;
  action: string;
  priority: RecommendationPriority;
  impact: string;
}

export enum RecommendationType {
  EXPAND_SELECTION = 'expand_selection',
  NARROW_SELECTION = 'narrow_selection',
  INCLUDE_DEPENDENCIES = 'include_dependencies',
  IMPROVE_QUALITY = 'improve_quality',
  ADD_CONTEXT = 'add_context',
  OPTIMIZE_PERFORMANCE = 'optimize_performance'
}

export enum RecommendationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}