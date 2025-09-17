// Enhanced Context Types for Frontend
// Simplified versions of backend types for UI consumption

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

export interface DataContext {
  size: {
    rows: number;
    columns: number;
    cells: number;
  };
  dataQuality: {
    overallScore: number;
    completeness: number;
    accuracy: number;
    consistency: number;
    issues: QualityIssue[];
  };
  characteristics: {
    hasHeaders: boolean;
    hasTimeData: boolean;
    dataTypes: string[];
    patterns: string[];
  };
}

export interface BusinessContext {
  domain: {
    primaryDomain: string;
    subDomains: string[];
    confidence: number;
  };
  useCase: {
    primary: string;
    secondary: string[];
    objectives: string[];
  };
  stakeholders: Array<{
    type: string;
    role: string;
    interests: string[];
  }>;
}

export interface AnalyticalContext {
  intent: {
    primary: string;
    secondary: string[];
    confidence: number;
  };
  analysisType: string[];
  scope: string;
  complexity: ComplexityLevel;
}

export interface ContextInsight {
  id: string;
  type: InsightType;
  category: InsightCategory;
  title: string;
  description: string;
  confidence: number;
  priority: InsightPriority;
  impact: {
    magnitude: number;
    scope: string[];
    timeframe: string;
  };
  actionable: boolean;
  evidence: Array<{
    type: string;
    description: string;
    strength: number;
  }>;
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

export enum InsightPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface Risk {
  id: string;
  type: RiskType;
  title: string;
  description: string;
  probability: number;
  impact: ImpactLevel;
  severity: RiskSeverity;
  timeframe: string;
  confidence: number;
  mitigation: Array<{
    description: string;
    effectiveness: number;
    effort: string;
  }>;
}

export enum RiskType {
  DATA_QUALITY = 'data_quality',
  FINANCIAL = 'financial',
  OPERATIONAL = 'operational',
  COMPLIANCE = 'compliance',
  STRATEGIC = 'strategic',
  TECHNICAL = 'technical'
}

export enum RiskSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ImpactLevel {
  NEGLIGIBLE = 'negligible',
  MINOR = 'minor',
  MODERATE = 'moderate',
  MAJOR = 'major',
  SEVERE = 'severe',
  CATASTROPHIC = 'catastrophic'
}

export interface Opportunity {
  id: string;
  type: OpportunityType;
  title: string;
  description: string;
  priority: OpportunityPriority;
  potential: {
    value: string;
    timeframe: string;
  };
  feasibility: {
    technical: number;
    financial: number;
    operational: number;
    overall: number;
  };
  requirements: Array<{
    type: string;
    description: string;
    effort: string;
  }>;
  confidence: number;
}

export enum OpportunityType {
  COST_REDUCTION = 'cost_reduction',
  REVENUE_ENHANCEMENT = 'revenue_enhancement',
  EFFICIENCY_IMPROVEMENT = 'efficiency_improvement',
  QUALITY_ENHANCEMENT = 'quality_enhancement',
  RISK_MITIGATION = 'risk_mitigation',
  INNOVATION = 'innovation'
}

export enum OpportunityPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface DiscoveredPattern {
  id: string;
  type: PatternType;
  name: string;
  description: string;
  strength: number;
  significance: string;
  confidence: number;
  implications: Array<{
    type: string;
    description: string;
    actionable: boolean;
  }>;
}

export enum PatternType {
  TEMPORAL = 'temporal',
  CYCLICAL = 'cyclical',
  SEASONAL = 'seasonal',
  CORRELATION = 'correlation',
  TREND = 'trend',
  OUTLIER = 'outlier'
}

export interface OverallConfidence {
  score: number;
  level: ConfidenceLevel;
  components: Array<{
    name: string;
    score: number;
    weight: number;
    description: string;
  }>;
  factors: Array<{
    type: 'positive' | 'negative' | 'neutral';
    name: string;
    impact: number;
    description: string;
  }>;
  uncertainty?: {
    dataUncertainty: number;
    modelUncertainty: number;
    contextualUncertainty: number;
    overallUncertainty: number;
    uncertaintyFactors: Array<{
      source: string;
      magnitude: number;
      description: string;
    }>;
  };
}

export enum ConfidenceLevel {
  VERY_LOW = 'very_low',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high'
}

export interface ReliabilityAssessment {
  dataReliability: number;
  methodReliability: number;
  contextReliability: number;
  overallReliability: number;
}

export interface RecommendedAction {
  id: string;
  type: ActionType;
  title: string;
  description: string;
  priority: ActionPriority;
  effort: EffortLevel;
  impact: ImpactLevel;
  timeframe: {
    start: string;
    duration: string;
  };
  steps: Array<{
    order: number;
    description: string;
    duration: string;
  }>;
  resources: Array<{
    type: string;
    description: string;
    quantity: string;
  }>;
  successCriteria: string[];
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

export interface ContextAlternative {
  id: string;
  description: string;
  confidence: number;
  tradeoffs: string[];
  suitability: number;
}

export enum ComplexityLevel {
  SIMPLE = 'simple',
  MODERATE = 'moderate',
  COMPLEX = 'complex',
  VERY_COMPLEX = 'very_complex'
}

export interface QualityIssue {
  type: string;
  severity: string;
  description: string;
  affectedCells: string[];
  impact: number;
}

// Streaming and Progressive Disclosure Types
export interface StreamingContext {
  isStreaming: boolean;
  progress: number;
  currentPhase: StreamingPhase;
  completedPhases: StreamingPhase[];
  estimatedTimeRemaining: number;
}

export enum StreamingPhase {
  DATA_PARSING = 'data_parsing',
  PATTERN_DETECTION = 'pattern_detection',
  INSIGHT_GENERATION = 'insight_generation',
  RISK_ASSESSMENT = 'risk_assessment',
  OPPORTUNITY_ANALYSIS = 'opportunity_analysis',
  CONFIDENCE_CALCULATION = 'confidence_calculation',
  FINALIZATION = 'finalization'
}

export interface ProgressiveDisclosure {
  level: DisclosureLevel;
  availableLevels: DisclosureLevel[];
  content: {
    summary: boolean;
    details: boolean;
    technical: boolean;
    evidence: boolean;
  };
}

export enum DisclosureLevel {
  SUMMARY = 'summary',
  STANDARD = 'standard',
  DETAILED = 'detailed',
  EXPERT = 'expert'
}

// Interactive Exploration Types
export interface InteractiveExploration {
  selectedInsight?: string;
  selectedRisk?: string;
  selectedOpportunity?: string;
  selectedAction?: string;
  drillDownPath: string[];
  filters: ExplorationFilters;
}

export interface ExplorationFilters {
  insightTypes: InsightType[];
  priorities: InsightPriority[];
  categories: InsightCategory[];
  confidenceThreshold: number;
  timeframe?: string;
}

// Visualization Types
export interface ConfidenceVisualization {
  type: 'gauge' | 'bar' | 'radar' | 'heatmap';
  data: VisualizationData;
  interactive: boolean;
  showUncertainty: boolean;
}

export interface VisualizationData {
  primary: number;
  components: Array<{
    name: string;
    value: number;
    color?: string;
  }>;
  uncertainty?: {
    lower: number;
    upper: number;
  };
}