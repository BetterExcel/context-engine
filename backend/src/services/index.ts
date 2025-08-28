export { SpreadsheetParser, SpreadsheetParseError } from './SpreadsheetParser';
export type { ParseOptions } from './SpreadsheetParser';
export { RequestAnalyzer, RequestAnalyzerError } from './RequestAnalyzer';
export type { IntentKeywords, IntentClassificationResult } from './RequestAnalyzer';
export { ContextExtractor, ContextExtractionError } from './ContextExtractor';
export type { ContextExtractionOptions } from './ContextExtractor';
export { OpenAIService } from './OpenAIService';
export type { OpenAIConfig, IntentClassificationResult as OpenAIIntentResult, PatternAnalysisResult } from './OpenAIService';
export { DependencyParser } from './DependencyParser';
export type { CellReference, FormulaAnalysis } from './DependencyParser';
export { PatternAnalyzer, PatternAnalysisError } from './PatternAnalyzer';
export type { PatternAnalysisOptions, TrendAnalysis, CorrelationAnalysis } from './PatternAnalyzer';
export { SessionService } from './SessionService';
export type { SessionContext, ContextHistoryEntry, UserPreferences, UserFeedback } from './SessionService';
export { LearningEngine } from './LearningEngine';
export type { LearningPattern, LearningInsight, LearningResults, LearningOptions } from './LearningEngine';
export { RecommendationService } from './RecommendationService';
export type { Recommendation, RecommendationRequest, SimilarRequest } from './RecommendationService';
export { ContextFormatter, ContextFormattingError } from './ContextFormatter';
export type { FormattingOptions, ContextRelevanceScore, FormattedContext, StructuredContextFormat, LLMOptimizedFormat } from './ContextFormatter';
export { CacheService, cacheService } from './CacheService';
export type { CacheConfig, CacheOptions } from './CacheService';
export { LazyLoadingService, lazyLoadingService } from './LazyLoadingService';
export type { LazyLoadConfig, ChunkInfo, LazyLoadedSheet } from './LazyLoadingService';
export { DataBoundaryAnalyzer } from './DataBoundaryAnalyzer';
export type { DataBoundaries, HeaderInfo, RangeValidation, SelectionAnalysis } from './DataBoundaryAnalyzer';

// Performance Optimization Services
export { EnhancedCacheService, enhancedCacheService } from './EnhancedCacheService';
export type { CacheLevel, CacheInvalidationRule, CacheMetrics, CacheEntry } from './EnhancedCacheService';
export { StreamingResponseService, streamingResponseService } from './StreamingResponseService';
export type { StreamChunk, StreamingOptions, ProgressUpdate, StreamingContext } from './StreamingResponseService';
export { ParallelProcessingService, parallelProcessingService } from './ParallelProcessingService';
export type { ProcessingTask, ProcessingResult, ParallelProcessingOptions } from './ParallelProcessingService';
export { EnhancedPerformanceService, enhancedPerformanceService } from './EnhancedPerformanceService';
export type { PerformanceOptimizationConfig, OptimizationResult, LargeDatasetProcessingOptions } from './EnhancedPerformanceService';

// Enhanced Intelligence Services
export { EnhancedDataParser } from './EnhancedDataParser';
export { IntelligentSearchService } from './IntelligentSearchService';
export type { SearchQuery, SearchResult, SearchMatch, EntitySearchResult } from './IntelligentSearchService';
export { DataQualityAnalyzer } from './DataQualityAnalyzer';
export type { QualityAnalysisOptions, QualityProfile, ColumnQualityProfile, DetectedAnomaly } from './DataQualityAnalyzer';
export { SynonymRecognitionService } from './SynonymRecognitionService';
export type { SynonymMatchResult, CompanyRecognitionResult, FinancialTermResult, SynonymLearningOptions } from './SynonymRecognitionService';
export { EnhancedIntelligenceService } from './EnhancedIntelligenceService';
export type { EnhancedAnalysisOptions, EnhancedAnalysisResult, EnhancementSummary, IntelligenceRecommendation } from './EnhancedIntelligenceService';

// Enhanced Intent Analysis Services
export { EnhancedIntentAnalyzer } from './EnhancedIntentAnalyzer';
export type { IntentAnalysisOptions, IntentAnalysisResult, IntentDebugInfo } from './EnhancedIntentAnalyzer';
export { EntityResolutionService } from './EntityResolutionService';
export type { EntityResolutionOptions, EntityResolutionConfig } from './EntityResolutionService';
export { DomainSpecificIntentClassifier } from './DomainSpecificIntentClassifier';
export type { DomainClassificationResult, DomainIndicator, AnalyticSuggestion } from './DomainSpecificIntentClassifier';
export { EnhancedIntentAnalysisEngine } from './EnhancedIntentAnalysisEngine';
export type { EnhancedAnalysisOptions as IntentEngineOptions, EnhancedAnalysisResult as IntentEngineResult, AnalysisRecommendation } from './EnhancedIntentAnalysisEngine';

// Intelligent Auto-Selection Services
export { IntelligentAutoSelection } from './IntelligentAutoSelection';
// Removed problematic type exports that are not properly exported from IntelligentAutoSelection
export { SelectionConfidenceEngine } from './SelectionConfidenceEngine';
export type { 
  ConfidenceCalculationOptions, 
  RankingResult 
} from './SelectionConfidenceEngine';
export { DataRelationshipAnalyzer } from './DataRelationshipAnalyzer';
export type { 
  RelationshipAnalysisOptions, 
  RelationshipAnalysisResult, 
  AnalysisMetadata, 
  RelationshipRecommendation 
} from './DataRelationshipAnalyzer';
export { IntelligentAutoSelectionService } from './IntelligentAutoSelectionService';
export type { ServiceOptions } from './IntelligentAutoSelectionService';

// Domain Intelligence Services
export { DomainIntelligenceEngine } from './DomainIntelligenceEngine';
export { FinancialDomainService } from './FinancialDomainService';
export { BusinessIntelligenceService } from './BusinessIntelligenceService';
export { FormulaLibraryService } from './FormulaLibraryService';
export type {
  DomainClassification,
  DomainEnhancedAnalysis,
  DomainPattern,
  FinancialFormula,
  MetricDefinition,
  KPIDefinition,
  BusinessInsight,
  RiskAssessment,
  DomainRecommendation
} from '../types/domain-intelligence';

// Context Synthesis Services
export { ContextSynthesisEngine } from './ContextSynthesisEngine';
export type {
  ComprehensiveContext,
  DataContext,
  BusinessContext,
  AnalyticalContext,
  ContextInsight,
  Risk,
  Opportunity,
  DiscoveredPattern,
  OverallConfidence,
  ReliabilityAssessment,
  RecommendedAction,
  ContextAlternative,
  // ContextSynthesisOptions - removed as not available
} from '../types/context-synthesis';

// Enhanced Agent Prompt Generation Services
export { EnhancedAgentPromptGenerator } from './EnhancedAgentPromptGenerator';
export { ExcelFormulaGenerator } from './ExcelFormulaGenerator';
export { ExecutionStepOptimizer } from './ExecutionStepOptimizer';
export { ValidationStrategyGenerator } from './ValidationStrategyGenerator';
export type {
  EnhancedAgentPrompt,
  AgentPromptMetadata,
  AgentInstructions,
  AgentContext,
  ExecutionApproach,
  ValidationStep,
  ErrorHandlingStep,
  FormulaInstruction,
  OptimizationRecommendations,
  TestingStrategy,
  PromptGenerationContext,
  AgentPromptConfig,
  MultiFormatOutput,
  ComplexityLevel,
  OverallConfidence as AgentConfidence,
  ExecutionStep,
  TechnicalInstruction,
  FormulaParameter,
  FormulaValidation,
  AlternativeFormula,
  PerformanceMetrics
} from '../types/agent-prompt';