/**
 * Context Synthesis and Insight Generation Types
 * Supporting comprehensive context correlation, relationship mapping, and insight generation
 */

import { EnhancedIntent, ConfidenceScore } from './intent-analysis';
import { SelectionCandidate, RelationshipMap } from './intelligent-selection';
import { DomainEnhancedAnalysis, DomainClassification } from './domain-intelligence';
import { IntelligentSpreadsheetData, DomainType } from './enhanced-intelligence';

// Comprehensive context that combines all intelligence layers
export interface ComprehensiveContext {
  id: string;
  timestamp: Date;
  query: string;
  
  // Core context components
  dataContext: DataContext;
  businessContext: BusinessContext;
  analyticalContext: AnalyticalContext;
  
  // Generated insights and analysis
  insights: ContextInsight[];
  risks: Risk[];
  opportunities: Opportunity[];
  patterns: DiscoveredPattern[];
  
  // Confidence and reliability
  confidence: OverallConfidence;
  reliability: ReliabilityAssessment;
  
  // Actionable recommendations
  nextSteps: RecommendedAction[];
  alternatives: ContextAlternative[];
  
  // Metadata
  processingTime: number;
  dataQuality: number;
  complexity: ComplexityLevel;
}

// Data context with enhanced understanding
export interface DataContext {
  spreadsheetData: IntelligentSpreadsheetData;
  selectedRanges: SelectionCandidate[];
  relationshipMap: RelationshipMap;
  dataQuality: DataQualityContext;
  dataCharacteristics: DataCharacteristics;
  temporalContext?: TemporalContext;
}

// Business context with domain intelligence
export interface BusinessContext {
  domain: DomainClassification;
  useCase: BusinessUseCase;
  stakeholders: StakeholderContext[];
  objectives: BusinessObjective[];
  constraints: BusinessConstraint[];
  regulations?: RegulatoryContext[];
}

// Analytical context for comprehensive analysis
export interface AnalyticalContext {
  intent: EnhancedIntent;
  analysisType: AnalysisType[];
  requiredMetrics: MetricRequirement[];
  comparisons: ComparisonContext[];
  benchmarks: BenchmarkContext[];
  validationRules: ValidationRule[];
}

// Context insights with confidence and evidence
export interface ContextInsight {
  id: string;
  type: InsightType;
  category: InsightCategory;
  title: string;
  description: string;
  evidence: InsightEvidence[];
  confidence: number;
  impact: ImpactAssessment;
  actionability: ActionabilityScore;
  priority: InsightPriority;
  relatedInsights: string[];
  tags: string[];
}

export enum InsightType {
  TREND = 'trend',
  ANOMALY = 'anomaly',
  CORRELATION = 'correlation',
  PATTERN = 'pattern',
  OPPORTUNITY = 'opportunity',
  RISK = 'risk',
  RECOMMENDATION = 'recommendation',
  VALIDATION = 'validation',
  PREDICTION = 'prediction',
  COMPARISON = 'comparison'
}

export enum InsightCategory {
  FINANCIAL = 'financial',
  OPERATIONAL = 'operational',
  STRATEGIC = 'strategic',
  TACTICAL = 'tactical',
  COMPLIANCE = 'compliance',
  QUALITY = 'quality',
  PERFORMANCE = 'performance',
  EFFICIENCY = 'efficiency'
}

// Risk identification and assessment
export interface Risk {
  id: string;
  type: RiskType;
  category: RiskCategory;
  title: string;
  description: string;
  probability: number;
  impact: ImpactLevel;
  severity: RiskSeverity;
  evidence: RiskEvidence[];
  mitigationStrategies: MitigationStrategy[];
  timeframe: RiskTimeframe;
  affectedAreas: string[];
  confidence: number;
}

export enum RiskType {
  DATA_QUALITY = 'data_quality',
  FINANCIAL = 'financial',
  OPERATIONAL = 'operational',
  COMPLIANCE = 'compliance',
  STRATEGIC = 'strategic',
  TECHNICAL = 'technical',
  MARKET = 'market',
  REPUTATIONAL = 'reputational'
}

export enum RiskCategory {
  IMMEDIATE = 'immediate',
  SHORT_TERM = 'short_term',
  MEDIUM_TERM = 'medium_term',
  LONG_TERM = 'long_term',
  SYSTEMIC = 'systemic',
  ISOLATED = 'isolated'
}

export enum ImpactLevel {
  NEGLIGIBLE = 'negligible',
  MINOR = 'minor',
  MODERATE = 'moderate',
  MAJOR = 'major',
  SEVERE = 'severe',
  CATASTROPHIC = 'catastrophic'
}

export enum RiskSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Opportunity identification and assessment
export interface Opportunity {
  id: string;
  type: OpportunityType;
  category: OpportunityCategory;
  title: string;
  description: string;
  potential: PotentialValue;
  feasibility: FeasibilityAssessment;
  evidence: OpportunityEvidence[];
  requirements: OpportunityRequirement[];
  timeframe: OpportunityTimeframe;
  confidence: number;
  priority: OpportunityPriority;
}

export enum OpportunityType {
  COST_REDUCTION = 'cost_reduction',
  REVENUE_ENHANCEMENT = 'revenue_enhancement',
  EFFICIENCY_IMPROVEMENT = 'efficiency_improvement',
  QUALITY_ENHANCEMENT = 'quality_enhancement',
  RISK_MITIGATION = 'risk_mitigation',
  INNOVATION = 'innovation',
  MARKET_EXPANSION = 'market_expansion',
  PROCESS_OPTIMIZATION = 'process_optimization'
}

export enum OpportunityCategory {
  IMMEDIATE = 'immediate',
  SHORT_TERM = 'short_term',
  MEDIUM_TERM = 'medium_term',
  LONG_TERM = 'long_term',
  STRATEGIC = 'strategic',
  TACTICAL = 'tactical'
}

// Pattern discovery and analysis
export interface DiscoveredPattern {
  id: string;
  type: PatternType;
  name: string;
  description: string;
  strength: number;
  frequency: number;
  significance: PatternSignificance;
  evidence: PatternEvidence[];
  implications: PatternImplication[];
  confidence: number;
  applicability: PatternApplicability;
}

export enum PatternType {
  TEMPORAL = 'temporal',
  CYCLICAL = 'cyclical',
  SEASONAL = 'seasonal',
  CORRELATION = 'correlation',
  DEPENDENCY = 'dependency',
  HIERARCHY = 'hierarchy',
  CLUSTERING = 'clustering',
  OUTLIER = 'outlier',
  TREND = 'trend',
  REGRESSION = 'regression'
}

export enum PatternSignificance {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Overall confidence with multi-factor analysis
export interface OverallConfidence {
  score: number;
  level: ConfidenceLevel;
  components: ConfidenceComponent[];
  factors: ConfidenceFactor[];
  uncertainty: UncertaintyQuantification;
  reliability: ReliabilityMetrics;
}

export enum ConfidenceLevel {
  VERY_LOW = 'very_low',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high'
}

export interface ConfidenceComponent {
  name: string;
  score: number;
  weight: number;
  description: string;
  evidence: string[];
}

export interface ConfidenceFactor {
  type: FactorType;
  name: string;
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

// Uncertainty quantification
export interface UncertaintyQuantification {
  dataUncertainty: number;
  modelUncertainty: number;
  contextualUncertainty: number;
  overallUncertainty: number;
  uncertaintyFactors: UncertaintyFactor[];
  confidenceInterval: ConfidenceInterval;
}

export interface UncertaintyFactor {
  source: UncertaintySource;
  magnitude: number;
  description: string;
  mitigation?: string;
}

export enum UncertaintySource {
  DATA_QUALITY = 'data_quality',
  SAMPLE_SIZE = 'sample_size',
  MODEL_LIMITATIONS = 'model_limitations',
  CONTEXT_AMBIGUITY = 'context_ambiguity',
  TEMPORAL_FACTORS = 'temporal_factors',
  EXTERNAL_FACTORS = 'external_factors'
}

export interface ConfidenceInterval {
  lower: number;
  upper: number;
  level: number;
}

// Supporting interfaces
export interface DataQualityContext {
  overallScore: number;
  completeness: number;
  accuracy: number;
  consistency: number;
  timeliness: number;
  issues: QualityIssue[];
}

export interface QualityIssue {
  type: string;
  severity: string;
  description: string;
  affectedCells: string[];
  impact: number;
}

export interface DataCharacteristics {
  size: DataSize;
  complexity: DataComplexity;
  structure: DataStructure;
  temporality: DataTemporality;
  relationships: RelationshipCharacteristics;
}

export interface DataSize {
  rows: number;
  columns: number;
  cells: number;
  nonEmptyCells: number;
  dataVolume: string;
}

export interface DataComplexity {
  level: ComplexityLevel;
  factors: ComplexityFactor[];
  score: number;
}

export enum ComplexityLevel {
  SIMPLE = 'simple',
  MODERATE = 'moderate',
  COMPLEX = 'complex',
  VERY_COMPLEX = 'very_complex'
}

export interface ComplexityFactor {
  type: string;
  value: number;
  description: string;
}

// Additional supporting types
export interface BusinessUseCase {
  primary: string;
  secondary: string[];
  context: string;
  objectives: string[];
}

export interface StakeholderContext {
  type: string;
  role: string;
  interests: string[];
  influence: number;
}

export interface BusinessObjective {
  id: string;
  description: string;
  priority: number;
  measurable: boolean;
  timeframe: string;
}

export interface BusinessConstraint {
  type: string;
  description: string;
  severity: string;
  impact: string[];
}

export interface RegulatoryContext {
  framework: string;
  requirements: string[];
  compliance: boolean;
  risks: string[];
}

export interface AnalysisType {
  name: string;
  category: string;
  complexity: string;
  requirements: string[];
}

export interface MetricRequirement {
  name: string;
  type: string;
  formula?: string;
  dependencies: string[];
  priority: number;
}

export interface ComparisonContext {
  type: string;
  baseline: string;
  targets: string[];
  methodology: string;
}

export interface BenchmarkContext {
  type: string;
  source: string;
  values: Record<string, number>;
  applicability: number;
}

export interface ValidationRule {
  id: string;
  description: string;
  condition: string;
  severity: string;
}

// Evidence and assessment types
export interface InsightEvidence {
  type: string;
  description: string;
  strength: number;
  source: string;
  data?: any;
}

export interface ImpactAssessment {
  magnitude: number;
  scope: string[];
  timeframe: string;
  confidence: number;
}

export interface ActionabilityScore {
  score: number;
  factors: ActionabilityFactor[];
  recommendations: string[];
}

export interface ActionabilityFactor {
  name: string;
  value: number;
  description: string;
}

export enum InsightPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface RiskEvidence {
  type: string;
  description: string;
  strength: number;
  source: string;
}

export interface MitigationStrategy {
  id: string;
  description: string;
  effectiveness: number;
  cost: string;
  timeframe: string;
}

export interface RiskTimeframe {
  immediate: boolean;
  shortTerm: boolean;
  mediumTerm: boolean;
  longTerm: boolean;
}

export interface OpportunityEvidence {
  type: string;
  description: string;
  strength: number;
  source: string;
}

export interface PotentialValue {
  quantitative?: number;
  qualitative: string;
  currency?: string;
  timeframe: string;
}

export interface FeasibilityAssessment {
  technical: number;
  financial: number;
  operational: number;
  strategic: number;
  overall: number;
}

export interface OpportunityRequirement {
  type: string;
  description: string;
  priority: string;
  effort: string;
}

export interface OpportunityTimeframe {
  implementation: string;
  realization: string;
  duration: string;
}

export enum OpportunityPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface PatternEvidence {
  type: string;
  description: string;
  strength: number;
  data: any;
}

export interface PatternImplication {
  type: string;
  description: string;
  impact: string;
  actionable: boolean;
}

export interface PatternApplicability {
  scope: string[];
  conditions: string[];
  limitations: string[];
}

export interface ReliabilityAssessment {
  dataReliability: number;
  methodReliability: number;
  contextReliability: number;
  overallReliability: number;
  factors: ReliabilityFactor[];
}

export interface ReliabilityFactor {
  name: string;
  impact: number;
  description: string;
}

export interface ReliabilityMetrics {
  consistency: number;
  stability: number;
  reproducibility: number;
  validity: number;
}

export interface RecommendedAction {
  id: string;
  type: ActionType;
  title: string;
  description: string;
  priority: ActionPriority;
  effort: EffortLevel;
  impact: ImpactLevel;
  timeframe: ActionTimeframe;
  prerequisites: string[];
  steps: ActionStep[];
  resources: ResourceRequirement[];
  risks: ActionRisk[];
  success_criteria: string[];
}

export enum ActionType {
  IMMEDIATE = 'immediate',
  ANALYTICAL = 'analytical',
  STRATEGIC = 'strategic',
  OPERATIONAL = 'operational',
  INVESTIGATIVE = 'investigative',
  CORRECTIVE = 'corrective'
}

export enum ActionPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum EffortLevel {
  MINIMAL = 'minimal',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  EXTENSIVE = 'extensive'
}

export interface ActionTimeframe {
  start: string;
  duration: string;
  milestones: string[];
}

export interface ActionStep {
  order: number;
  description: string;
  duration: string;
  dependencies: string[];
}

export interface ResourceRequirement {
  type: string;
  description: string;
  quantity: string;
  availability: string;
}

export interface ActionRisk {
  description: string;
  probability: number;
  impact: string;
  mitigation: string;
}

export interface ContextAlternative {
  id: string;
  description: string;
  confidence: number;
  tradeoffs: string[];
  suitability: number;
  context: ComprehensiveContext;
}

export interface TemporalContext {
  timeRange: {
    start?: Date;
    end?: Date;
  };
  frequency: string;
  seasonality?: SeasonalityPattern;
  trends: TrendAnalysis[];
}

export interface SeasonalityPattern {
  type: string;
  period: string;
  strength: number;
  peaks: string[];
}

export interface TrendAnalysis {
  direction: string;
  strength: number;
  significance: number;
  timeframe: string;
}

export interface DataStructure {
  type: string;
  organization: string;
  hierarchical: boolean;
  normalized: boolean;
}

export interface DataTemporality {
  hasTimeData: boolean;
  timeColumns: string[];
  frequency: string;
  coverage: string;
}

export interface RelationshipCharacteristics {
  density: number;
  complexity: string;
  types: string[];
  strength: number;
}