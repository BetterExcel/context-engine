/**
 * Enhanced Intent Analysis and Entity Resolution Types
 * Supporting multi-layered natural language processing and business context understanding
 */

import { DomainType, EnhancedDataType } from './enhanced-intelligence';
import { IntentType } from './context';

// Enhanced intent classification with multi-layered analysis
export interface EnhancedIntent {
  query: {
    original: string;
    normalized: string;
    entities: ExtractedEntity[];
    tokens: QueryToken[];
  };
  
  intent: {
    primary: IntentClassification;
    secondary: IntentClassification[];
    confidence: number;
    ambiguities: Ambiguity[];
    clarificationNeeded: boolean;
  };
  
  scope: {
    dataScope: DataScope;
    analyticalScope: AnalyticalScope;
    temporalScope: TemporalScope;
  };
  
  context: {
    businessContext: BusinessContext;
    userContext: UserContext;
    sessionContext: SessionContext;
  };
}

// Multi-layered intent classification
export interface IntentClassification {
  type: IntentType;
  subType?: string;
  confidence: number;
  reasoning: string[];
  matchedPatterns: MatchedPattern[];
  domainSpecific: boolean;
}

// Query tokenization with semantic understanding
export interface QueryToken {
  text: string;
  type: TokenType;
  position: number;
  confidence: number;
  semanticRole?: SemanticRole;
  entityType?: EntityType;
}

export enum TokenType {
  ENTITY = 'entity',
  ACTION = 'action',
  MODIFIER = 'modifier',
  SCOPE = 'scope',
  CONDITION = 'condition',
  VALUE = 'value',
  CONNECTOR = 'connector',
  NOISE = 'noise'
}

export enum SemanticRole {
  SUBJECT = 'subject',
  PREDICATE = 'predicate',
  OBJECT = 'object',
  ATTRIBUTE = 'attribute',
  QUALIFIER = 'qualifier',
  TEMPORAL = 'temporal',
  SPATIAL = 'spatial'
}

// Enhanced entity extraction and resolution
export interface ExtractedEntity {
  text: string;
  type: EntityType;
  subType?: string;
  confidence: number;
  position: EntityPosition;
  resolvedEntity?: ResolvedEntity;
  alternatives: EntityAlternative[];
  businessContext?: EntityBusinessContext;
}

export enum EntityType {
  COMPANY = 'company',
  PERSON = 'person',
  FINANCIAL_INSTRUMENT = 'financial_instrument',
  METRIC = 'metric',
  TIME_PERIOD = 'time_period',
  LOCATION = 'location',
  PRODUCT = 'product',
  DEPARTMENT = 'department',
  CURRENCY = 'currency',
  PERCENTAGE = 'percentage',
  FORMULA = 'formula',
  COLUMN_REFERENCE = 'column_reference',
  CELL_REFERENCE = 'cell_reference',
  DATA_TYPE = 'data_type'
}

export interface EntityPosition {
  start: number;
  end: number;
  tokenIndex: number;
}

export interface ResolvedEntity {
  canonicalName: string;
  aliases: string[];
  metadata: EntityMetadata;
  confidence: number;
  dataReferences: DataReference[];
}

export interface EntityMetadata {
  type: EntityType;
  domain: DomainType;
  attributes: Record<string, any>;
  relationships: EntityRelationship[];
  lastUpdated?: Date;
  source?: string;
}

export interface EntityRelationship {
  type: RelationshipType;
  target: string;
  strength: number;
  description?: string;
}

export enum RelationshipType {
  SYNONYM = 'synonym',
  PARENT = 'parent',
  CHILD = 'child',
  RELATED = 'related',
  OPPOSITE = 'opposite',
  PART_OF = 'part_of',
  INSTANCE_OF = 'instance_of'
}

export interface EntityAlternative {
  text: string;
  confidence: number;
  reasoning: string;
  metadata?: Record<string, any>;
}

export interface EntityBusinessContext {
  industry?: string;
  sector?: string;
  marketCap?: string;
  stockExchange?: string;
  fiscalYear?: string;
  reportingCurrency?: string;
}

export interface DataReference {
  sheet: string;
  range: string;
  cellReferences: IntentCellReference[];
  confidence: number;
  matchType: MatchType;
}

export interface IntentCellReference {
  sheet: string;
  row: number;
  col: number;
  address: string;
  value: any;
  dataType: EnhancedDataType;
}

export enum MatchType {
  EXACT = 'exact',
  FUZZY = 'fuzzy',
  SEMANTIC = 'semantic',
  PHONETIC = 'phonetic',
  ABBREVIATION = 'abbreviation',
  SYNONYM = 'synonym'
}

// Ambiguity detection and resolution
export interface Ambiguity {
  type: AmbiguityType;
  description: string;
  alternatives: AmbiguityAlternative[];
  confidence: number;
  resolutionStrategy: ResolutionStrategy;
}

export enum AmbiguityType {
  ENTITY_REFERENCE = 'entity_reference',
  INTENT_CLASSIFICATION = 'intent_classification',
  SCOPE_DETERMINATION = 'scope_determination',
  TEMPORAL_REFERENCE = 'temporal_reference',
  METRIC_CALCULATION = 'metric_calculation',
  DATA_SELECTION = 'data_selection'
}

export interface AmbiguityAlternative {
  interpretation: string;
  confidence: number;
  reasoning: string;
  implications: string[];
}

export interface ResolutionStrategy {
  type: 'clarification' | 'context_based' | 'confidence_ranking' | 'user_preference';
  questions?: string[];
  contextClues?: string[];
  defaultChoice?: number;
}

// Scope determination with intelligent expansion
export interface DataScope {
  type: DataScopeType;
  ranges: ScopeRange[];
  includeRelated: boolean;
  expansionRules: ExpansionRule[];
  confidence: number;
}

export enum DataScopeType {
  SPECIFIC_CELLS = 'specific_cells',
  COLUMN_RANGE = 'column_range',
  ROW_RANGE = 'row_range',
  DATA_BLOCK = 'data_block',
  ENTIRE_SHEET = 'entire_sheet',
  MULTIPLE_SHEETS = 'multiple_sheets',
  FILTERED_DATA = 'filtered_data',
  RELATED_DATA = 'related_data'
}

export interface ScopeRange {
  sheet?: string;
  startRow?: number;
  endRow?: number;
  startCol?: number;
  endCol?: number;
  namedRange?: string;
  filter?: ScopeFilter;
}

export interface ScopeFilter {
  column: string;
  operator: FilterOperator;
  value: any;
  dataType: EnhancedDataType;
}

export enum FilterOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  CONTAINS = 'contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  IN_LIST = 'in_list',
  BETWEEN = 'between'
}

export interface ExpansionRule {
  type: ExpansionType;
  condition: string;
  action: ExpansionAction;
  priority: number;
}

export enum ExpansionType {
  INCLUDE_HEADERS = 'include_headers',
  INCLUDE_TOTALS = 'include_totals',
  INCLUDE_RELATED_COLUMNS = 'include_related_columns',
  INCLUDE_DEPENDENT_ROWS = 'include_dependent_rows',
  INCLUDE_TIME_SERIES = 'include_time_series',
  INCLUDE_CALCULATED_FIELDS = 'include_calculated_fields'
}

export interface ExpansionAction {
  expand: boolean;
  maxRows?: number;
  maxCols?: number;
  conditions?: string[];
}

export interface AnalyticalScope {
  analysisType: AnalysisType[];
  metrics: RequestedMetric[];
  aggregations: AggregationType[];
  comparisons: ComparisonType[];
  timeframe?: TimeFrame;
}

export enum AnalysisType {
  DESCRIPTIVE = 'descriptive',
  DIAGNOSTIC = 'diagnostic',
  PREDICTIVE = 'predictive',
  PRESCRIPTIVE = 'prescriptive',
  COMPARATIVE = 'comparative',
  TREND_ANALYSIS = 'trend_analysis',
  CORRELATION = 'correlation',
  STATISTICAL = 'statistical'
}

export interface RequestedMetric {
  name: string;
  type: MetricType;
  parameters: Record<string, any>;
  priority: number;
}

export enum MetricType {
  SUM = 'sum',
  AVERAGE = 'average',
  COUNT = 'count',
  MIN = 'min',
  MAX = 'max',
  MEDIAN = 'median',
  STANDARD_DEVIATION = 'standard_deviation',
  VARIANCE = 'variance',
  PERCENTILE = 'percentile',
  GROWTH_RATE = 'growth_rate',
  RATIO = 'ratio',
  PERCENTAGE_CHANGE = 'percentage_change',
  CUSTOM = 'custom'
}

export enum AggregationType {
  GROUP_BY = 'group_by',
  PIVOT = 'pivot',
  ROLLUP = 'rollup',
  CUBE = 'cube',
  SUBTOTAL = 'subtotal'
}

export enum ComparisonType {
  PERIOD_OVER_PERIOD = 'period_over_period',
  YEAR_OVER_YEAR = 'year_over_year',
  BENCHMARK = 'benchmark',
  PEER_COMPARISON = 'peer_comparison',
  TARGET_VS_ACTUAL = 'target_vs_actual'
}

export interface TemporalScope {
  type: TemporalType;
  period?: TimePeriod;
  frequency?: TimeFrequency;
  relativeTo?: TemporalReference;
}

export enum TemporalType {
  POINT_IN_TIME = 'point_in_time',
  TIME_RANGE = 'time_range',
  ROLLING_WINDOW = 'rolling_window',
  PERIODIC = 'periodic',
  RELATIVE = 'relative'
}

export interface TimePeriod {
  start: Date | string;
  end: Date | string;
  duration?: string;
}

export enum TimeFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  CUSTOM = 'custom'
}

export interface TemporalReference {
  type: 'absolute' | 'relative';
  value: string;
  offset?: number;
  unit?: TimeUnit;
}

export enum TimeUnit {
  DAYS = 'days',
  WEEKS = 'weeks',
  MONTHS = 'months',
  QUARTERS = 'quarters',
  YEARS = 'years'
}

export interface TimeFrame {
  start?: Date;
  end?: Date;
  period?: string;
  frequency?: TimeFrequency;
}

// Business context understanding
export interface BusinessContext {
  domain: DomainType;
  subDomain?: string;
  industry?: string;
  useCase: BusinessUseCase;
  stakeholder?: StakeholderType;
  urgency: UrgencyLevel;
  complexity: ComplexityLevel;
}

export enum BusinessUseCase {
  FINANCIAL_ANALYSIS = 'financial_analysis',
  PERFORMANCE_REPORTING = 'performance_reporting',
  BUDGETING_PLANNING = 'budgeting_planning',
  RISK_ASSESSMENT = 'risk_assessment',
  COMPLIANCE_REPORTING = 'compliance_reporting',
  OPERATIONAL_ANALYSIS = 'operational_analysis',
  MARKET_RESEARCH = 'market_research',
  CUSTOMER_ANALYSIS = 'customer_analysis',
  INVENTORY_MANAGEMENT = 'inventory_management',
  SALES_ANALYSIS = 'sales_analysis'
}

export enum StakeholderType {
  EXECUTIVE = 'executive',
  MANAGER = 'manager',
  ANALYST = 'analyst',
  ACCOUNTANT = 'accountant',
  AUDITOR = 'auditor',
  CONSULTANT = 'consultant',
  RESEARCHER = 'researcher',
  STUDENT = 'student'
}

export enum UrgencyLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ComplexityLevel {
  SIMPLE = 'simple',
  MODERATE = 'moderate',
  COMPLEX = 'complex',
  EXPERT = 'expert'
}

export interface UserContext {
  preferences?: UserPreferences;
  history?: QueryHistory[];
  expertise?: ExpertiseLevel;
  role?: StakeholderType;
}

export interface UserPreferences {
  preferredMetrics: string[];
  defaultTimeframe: TimeFrame;
  outputFormat: OutputFormat;
  confidenceThreshold: number;
  verbosity: VerbosityLevel;
}

export enum OutputFormat {
  SUMMARY = 'summary',
  DETAILED = 'detailed',
  TECHNICAL = 'technical',
  EXECUTIVE = 'executive'
}

export enum VerbosityLevel {
  MINIMAL = 'minimal',
  STANDARD = 'standard',
  DETAILED = 'detailed',
  COMPREHENSIVE = 'comprehensive'
}

export interface QueryHistory {
  query: string;
  intent: IntentType;
  timestamp: Date;
  success: boolean;
  feedback?: number;
}

export enum ExpertiseLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert'
}

export interface SessionContext {
  sessionId: string;
  startTime: Date;
  queryCount: number;
  currentSheet?: string;
  activeSelection?: ScopeRange;
  recentEntities: ExtractedEntity[];
  conversationFlow: ConversationStep[];
}

export interface ConversationStep {
  type: 'query' | 'clarification' | 'response' | 'feedback';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// Pattern matching for intent classification
export interface MatchedPattern {
  pattern: string;
  type: PatternType;
  confidence: number;
  weight: number;
  context?: string;
}

export enum PatternType {
  KEYWORD = 'keyword',
  PHRASE = 'phrase',
  REGEX = 'regex',
  SEMANTIC = 'semantic',
  SYNTACTIC = 'syntactic',
  DOMAIN_SPECIFIC = 'domain_specific'
}

// Confidence scoring with detailed explanations
export interface ConfidenceScore {
  overall: number;
  components: ConfidenceComponent[];
  factors: ConfidenceFactor[];
  explanation: string;
  reliability: ReliabilityLevel;
}

export interface ConfidenceComponent {
  name: string;
  score: number;
  weight: number;
  description: string;
}

export interface ConfidenceFactor {
  type: FactorType;
  impact: number;
  description: string;
  evidence: string[];
}

export enum FactorType {
  POSITIVE = 'positive',
  NEGATIVE = 'negative',
  NEUTRAL = 'neutral',
  UNCERTAIN = 'uncertain'
}

export enum ReliabilityLevel {
  VERY_LOW = 'very_low',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high'
}

// Entity resolution results
export interface EntityResolutionResult {
  query: string;
  entities: ExtractedEntity[];
  resolutions: EntityResolution[];
  ambiguities: EntityAmbiguity[];
  confidence: ConfidenceScore;
  suggestions: ResolutionSuggestion[];
}

export interface EntityResolution {
  entity: ExtractedEntity;
  resolved: ResolvedEntity;
  dataMatches: DataMatch[];
  confidence: number;
  reasoning: string[];
}

export interface DataMatch {
  sheet: string;
  range: string;
  cells: IntentCellReference[];
  matchType: MatchType;
  confidence: number;
  context: MatchContext;
}

export interface MatchContext {
  surroundingData: any[];
  columnHeaders: string[];
  rowContext: string[];
  dataType: EnhancedDataType;
  businessContext?: string;
}

export interface EntityAmbiguity {
  entity: ExtractedEntity;
  candidates: EntityCandidate[];
  disambiguationStrategy: DisambiguationStrategy;
}

export interface EntityCandidate {
  entity: ResolvedEntity;
  confidence: number;
  reasoning: string[];
  dataSupport: DataMatch[];
}

export interface DisambiguationStrategy {
  type: 'context' | 'user_clarification' | 'confidence_ranking' | 'data_driven';
  questions?: string[];
  contextClues?: string[];
  recommendedChoice?: number;
}

export interface ResolutionSuggestion {
  type: SuggestionType;
  description: string;
  action: string;
  priority: number;
  expectedImprovement: number;
}

export enum SuggestionType {
  DATA_ENRICHMENT = 'data_enrichment',
  QUERY_REFINEMENT = 'query_refinement',
  CONTEXT_ADDITION = 'context_addition',
  SCOPE_ADJUSTMENT = 'scope_adjustment',
  ENTITY_CLARIFICATION = 'entity_clarification'
}