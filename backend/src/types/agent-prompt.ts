/**
 * Enhanced Agent Prompt Generation Types
 * 
 * Comprehensive types for generating executable agent instructions with multi-format output,
 * validation strategies, error handling, and Excel formula generation.
 */

export interface AgentPromptMetadata {
  promptId: string;
  generatedAt: Date;
  confidence: OverallConfidence;
  estimatedComplexity: ComplexityLevel;
  version: string;
  generationTime: number;
}

export interface OverallConfidence {
  score: number; // 0-1
  factors: ConfidenceFactor[];
  explanation: string;
  reliability: 'high' | 'medium' | 'low';
}

export interface ConfidenceFactor {
  factor: string;
  weight: number;
  score: number;
  impact: string;
}

export type ComplexityLevel = 'simple' | 'moderate' | 'complex' | 'advanced';

export interface AgentInstructions {
  summary: string;
  naturalLanguage: string;
  stepByStep: ExecutionStep[];
  technicalDetails: TechnicalInstruction[];
}

export interface ExecutionStep {
  stepNumber: number;
  action: string;
  description: string;
  excelFormula?: string;
  cellReference?: string;
  expectedResult: string;
  validationCriteria: string[];
  dependencies: string[];
  estimatedTime: number; // seconds
  complexity: ComplexityLevel;
}

export interface TechnicalInstruction {
  category: 'formula' | 'function' | 'method' | 'validation' | 'formatting';
  instruction: string;
  syntax: string;
  parameters: InstructionParameter[];
  examples: string[];
  notes: string[];
}

export interface InstructionParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
  defaultValue?: any;
  validation?: string;
}

export interface AgentContext {
  dataContext: string;
  businessRationale: string;
  expectedOutcome: string;
  successCriteria: string[];
  assumptions: string[];
  limitations: string[];
}

export interface ExecutionApproach {
  name: string;
  description: string;
  steps: ExecutionStep[];
  advantages: string[];
  disadvantages: string[];
  suitability: string;
  estimatedTime: number;
  complexity: ComplexityLevel;
  confidence: number;
}

export interface ValidationStep {
  stepNumber: number;
  type: 'data' | 'formula' | 'result' | 'format' | 'logic';
  description: string;
  method: string;
  expectedValue?: any;
  tolerance?: number;
  criticalLevel: 'low' | 'medium' | 'high' | 'critical';
  automatable: boolean;
}

export interface ErrorHandlingStep {
  errorType: string;
  description: string;
  detectionMethod: string;
  resolution: string;
  preventionStrategy: string;
  fallbackAction: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface FormulaInstruction {
  purpose: string;
  formula: string;
  syntax: string;
  parameters: FormulaParameter[];
  cellReference: string;
  dependencies: string[];
  validation: FormulaValidation;
  alternatives: AlternativeFormula[];
  performance: PerformanceMetrics;
}

export interface FormulaParameter {
  name: string;
  type: 'range' | 'cell' | 'value' | 'text' | 'boolean' | 'array';
  description: string;
  example: string;
  validation: string;
  required: boolean;
}

export interface FormulaValidation {
  syntaxCheck: string;
  logicCheck: string;
  dataTypeCheck: string;
  rangeCheck: string;
  errorHandling: string[];
}

export interface AlternativeFormula {
  formula: string;
  description: string;
  advantages: string[];
  disadvantages: string[];
  useCase: string;
  performance: 'faster' | 'slower' | 'similar';
}

export interface PerformanceMetrics {
  estimatedExecutionTime: number;
  memoryUsage: 'low' | 'medium' | 'high';
  scalability: 'poor' | 'fair' | 'good' | 'excellent';
  optimization: string[];
}

export interface EnhancedAgentPrompt {
  metadata: AgentPromptMetadata;
  instructions: AgentInstructions;
  context: AgentContext;
  execution: {
    primaryApproach: ExecutionApproach;
    alternativeApproaches: ExecutionApproach[];
    validationSteps: ValidationStep[];
    errorHandling: ErrorHandlingStep[];
  };
  formulas: {
    required: FormulaInstruction[];
    optional: FormulaInstruction[];
    validation: FormulaInstruction[];
  };
  optimization: OptimizationRecommendations;
  testing: TestingStrategy;
}

export interface OptimizationRecommendations {
  performance: PerformanceOptimization[];
  accuracy: AccuracyOptimization[];
  maintainability: MaintainabilityOptimization[];
  scalability: ScalabilityOptimization[];
}

export interface PerformanceOptimization {
  area: string;
  recommendation: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  description: string;
}

export interface AccuracyOptimization {
  area: string;
  recommendation: string;
  riskReduction: number; // percentage
  validationMethod: string;
  description: string;
}

export interface MaintainabilityOptimization {
  area: string;
  recommendation: string;
  benefit: string;
  implementation: string;
  description: string;
}

export interface ScalabilityOptimization {
  area: string;
  recommendation: string;
  scalabilityFactor: number;
  limitations: string[];
  description: string;
}

export interface TestingStrategy {
  unitTests: TestCase[];
  integrationTests: TestCase[];
  validationTests: TestCase[];
  performanceTests: TestCase[];
}

export interface TestCase {
  name: string;
  description: string;
  input: any;
  expectedOutput: any;
  validationCriteria: string[];
  automatable: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

// Generation Configuration
export interface AgentPromptConfig {
  outputFormat: OutputFormat;
  detailLevel: DetailLevel;
  includeAlternatives: boolean;
  includeValidation: boolean;
  includeOptimization: boolean;
  includeTesting: boolean;
  targetAudience: TargetAudience;
  complexityPreference: ComplexityLevel;
}

export type OutputFormat = 'comprehensive' | 'concise' | 'technical' | 'business' | 'educational';
export type DetailLevel = 'minimal' | 'standard' | 'detailed' | 'exhaustive';
export type TargetAudience = 'beginner' | 'intermediate' | 'advanced' | 'expert';

// Generation Context
export interface PromptGenerationContext {
  userQuery: string;
  dataContext: any;
  businessContext: any;
  technicalContext: any;
  constraints: string[];
  preferences: AgentPromptConfig;
  sessionHistory?: any[];
}

// Output Formats
export interface MultiFormatOutput {
  naturalLanguage: NaturalLanguageOutput;
  stepByStep: StepByStepOutput;
  technical: TechnicalOutput;
  formulas: FormulaOutput;
  validation: ValidationOutput;
}

export interface NaturalLanguageOutput {
  summary: string;
  explanation: string;
  reasoning: string;
  recommendations: string;
  nextSteps: string;
}

export interface StepByStepOutput {
  overview: string;
  steps: DetailedStep[];
  checkpoints: Checkpoint[];
  troubleshooting: TroubleshootingGuide[];
}

export interface DetailedStep {
  number: number;
  title: string;
  description: string;
  action: string;
  inputs: string[];
  outputs: string[];
  validation: string;
  notes: string[];
}

export interface Checkpoint {
  afterStep: number;
  description: string;
  validationMethod: string;
  expectedState: string;
  troubleshooting: string;
}

export interface TroubleshootingGuide {
  issue: string;
  symptoms: string[];
  causes: string[];
  solutions: string[];
  prevention: string;
}

export interface TechnicalOutput {
  architecture: string;
  implementation: string;
  dependencies: string[];
  configuration: string;
  deployment: string;
}

export interface FormulaOutput {
  primary: FormulaSet;
  alternatives: FormulaSet[];
  validation: FormulaSet;
  testing: FormulaSet;
}

export interface FormulaSet {
  name: string;
  description: string;
  formulas: EnhancedFormula[];
  usage: string;
  examples: string[];
}

export interface EnhancedFormula {
  name: string;
  formula: string;
  description: string;
  parameters: string[];
  cellReference: string;
  validation: string;
  examples: string[];
  notes: string[];
}

export interface ValidationOutput {
  strategy: string;
  methods: ValidationMethod[];
  criteria: ValidationCriteria[];
  automation: AutomationGuidance[];
}

export interface ValidationMethod {
  name: string;
  description: string;
  implementation: string;
  automation: boolean;
  reliability: number;
}

export interface ValidationCriteria {
  criterion: string;
  description: string;
  measurement: string;
  threshold: any;
  importance: 'low' | 'medium' | 'high' | 'critical';
}

export interface AutomationGuidance {
  area: string;
  method: string;
  tools: string[];
  implementation: string;
  benefits: string[];
  limitations: string[];
}