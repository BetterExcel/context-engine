/**
 * Enhanced Intent Analysis Engine
 * 
 * Provides multi-layered natural language processing for query understanding
 * with business context awareness and domain-specific intelligence.
 */

import {
  EnhancedIntent,
  IntentClassification,
  QueryToken,
  TokenType,
  SemanticRole,
  EntityType,
  MatchedPattern,
  PatternType,
  ConfidenceScore,
  ConfidenceComponent,
  ConfidenceFactor,
  FactorType,
  ReliabilityLevel,
  BusinessContext,
  BusinessUseCase,
  StakeholderType,
  UrgencyLevel,
  ComplexityLevel,
  DataScope,
  DataScopeType,
  AnalyticalScope,
  AnalysisType,
  RequestedMetric,
  MetricType,
  TemporalScope,
  TemporalType,
  Ambiguity,
  AmbiguityType,
  AmbiguityAlternative,
  ResolutionStrategy
} from '../types/intent-analysis';
import { IntentType } from '../types/context';
import { DomainType, IntelligentSpreadsheetData } from '../types/enhanced-intelligence';

export interface IntentAnalysisOptions {
  enableDomainSpecific?: boolean;
  enableSemanticAnalysis?: boolean;
  confidenceThreshold?: number;
  maxAlternatives?: number;
  includeExplanations?: boolean;
}

export interface IntentAnalysisResult {
  intent: EnhancedIntent;
  processingTime: number;
  debugInfo?: IntentDebugInfo;
}

export interface IntentDebugInfo {
  tokenization: QueryToken[];
  patternMatches: MatchedPattern[];
  scoringBreakdown: Record<string, number>;
  domainSignals: string[];
  ambiguityDetection: string[];
  confidenceBreakdown?: Record<string, number>;
}

export class EnhancedIntentAnalyzer {
  private readonly domainPatterns: Map<DomainType, DomainPattern>;
  private readonly intentPatterns: Map<IntentType, IntentPattern>;
  private readonly businessContextPatterns: Map<BusinessUseCase, BusinessPattern>;
  private readonly semanticRules: SemanticRule[];

  constructor() {
    this.domainPatterns = this.initializeDomainPatterns();
    this.intentPatterns = this.initializeIntentPatterns();
    this.businessContextPatterns = this.initializeBusinessPatterns();
    this.semanticRules = this.initializeSemanticRules();
  }

  /**
   * Analyzes user query with enhanced multi-layered processing
   */
  public async analyzeIntent(
    query: string,
    dataContext?: IntelligentSpreadsheetData,
    options: IntentAnalysisOptions = {}
  ): Promise<IntentAnalysisResult> {
    const startTime = Date.now();
    
    try {
      // Step 1: Tokenization and normalization
      const tokens = this.tokenizeQuery(query);
      const normalizedQuery = this.normalizeQuery(query);

      // Step 2: Entity extraction (basic - will be enhanced by EntityResolver)
      const entities = await this.extractBasicEntities(tokens, dataContext);

      // Step 3: Multi-layered intent classification
      const intentClassifications = await this.classifyIntentMultiLayer(
        normalizedQuery,
        tokens,
        dataContext,
        options
      );

      // Step 4: Scope determination
      const scope = await this.determineScope(tokens, entities, dataContext);

      // Step 5: Business context analysis
      const businessContext = await this.analyzeBusinessContext(
        tokens,
        intentClassifications,
        dataContext
      );

      // Step 6: Ambiguity detection
      const ambiguities = await this.detectAmbiguities(
        query,
        intentClassifications,
        entities,
        dataContext
      );

      // Step 7: Confidence scoring
      const confidence = this.calculateOverallConfidence(
        intentClassifications,
        entities,
        scope,
        businessContext,
        ambiguities
      );

      const enhancedIntent: EnhancedIntent = {
        query: {
          original: query,
          normalized: normalizedQuery,
          entities,
          tokens
        },
        intent: {
          primary: intentClassifications[0],
          secondary: intentClassifications.slice(1, 3),
          confidence: confidence.overall,
          ambiguities,
          clarificationNeeded: confidence.overall < (options.confidenceThreshold || 0.7) || ambiguities.length > 0
        },
        scope,
        context: {
          businessContext,
          userContext: {}, // Will be populated by session context
          sessionContext: {
            sessionId: '', // Will be set by caller
            startTime: new Date(),
            queryCount: 1,
            recentEntities: entities,
            conversationFlow: []
          }
        }
      };

      const processingTime = Date.now() - startTime;

      const result: IntentAnalysisResult = {
        intent: enhancedIntent,
        processingTime
      };

      if (options.includeExplanations) {
        result.debugInfo = {
          tokenization: tokens,
          patternMatches: this.getMatchedPatterns(normalizedQuery, tokens),
          scoringBreakdown: this.getScoringBreakdown(intentClassifications),
          domainSignals: this.getDomainSignals(tokens, dataContext),
          ambiguityDetection: ambiguities.map(a => a.description)
        };
      }

      return result;

    } catch (error) {
      throw new EnhancedIntentAnalyzerError(
        `Intent analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'ANALYSIS_FAILED'
      );
    }
  }

  /**
   * Tokenizes query with semantic role assignment
   */
  private tokenizeQuery(query: string): QueryToken[] {
    const tokens: QueryToken[] = [];
    const words = query.toLowerCase().match(/\b\w+\b/g) || [];
    
    words.forEach((word, index) => {
      const token: QueryToken = {
        text: word,
        type: this.classifyToken(word),
        position: index,
        confidence: 0.8,
        semanticRole: this.assignSemanticRole(word, index, words)
      };

      // Enhance token with entity type if applicable
      const entityType = this.detectTokenEntityType(word);
      if (entityType) {
        token.entityType = entityType;
        token.confidence = Math.min(token.confidence + 0.1, 1.0);
      }

      tokens.push(token);
    });

    return tokens;
  }

  /**
   * Classifies individual tokens by type
   */
  private classifyToken(word: string): TokenType {
    const actionWords = ['calculate', 'sum', 'average', 'count', 'find', 'show', 'analyze', 'compare', 'format'];
    const modifierWords = ['total', 'average', 'maximum', 'minimum', 'latest', 'recent', 'all', 'each'];
    const scopeWords = ['sheet', 'column', 'row', 'cell', 'range', 'data', 'table'];
    const conditionWords = ['if', 'when', 'where', 'unless', 'except', 'only'];
    const connectorWords = ['and', 'or', 'but', 'then', 'also', 'plus', 'with'];

    if (actionWords.includes(word)) return TokenType.ACTION;
    if (modifierWords.includes(word)) return TokenType.MODIFIER;
    if (scopeWords.includes(word)) return TokenType.SCOPE;
    if (conditionWords.includes(word)) return TokenType.CONDITION;
    if (connectorWords.includes(word)) return TokenType.CONNECTOR;

    // Check if it's a potential entity (company name, metric, etc.)
    if (this.isPotentialEntity(word)) return TokenType.ENTITY;

    // Check if it's a value (number, percentage, etc.)
    if (this.isPotentialValue(word)) return TokenType.VALUE;

    return TokenType.NOISE;
  }

  /**
   * Assigns semantic roles to tokens
   */
  private assignSemanticRole(word: string, position: number, allWords: string[]): SemanticRole {
    // Simple heuristic-based semantic role assignment
    if (position === 0 || ['what', 'show', 'find', 'calculate'].includes(word)) {
      return SemanticRole.PREDICATE;
    }

    if (['apple', 'microsoft', 'google'].includes(word)) {
      return SemanticRole.SUBJECT;
    }

    if (['price', 'revenue', 'profit', 'value'].includes(word)) {
      return SemanticRole.OBJECT;
    }

    if (['average', 'total', 'maximum', 'minimum'].includes(word)) {
      return SemanticRole.ATTRIBUTE;
    }

    if (['today', 'yesterday', 'last', 'current', 'recent'].includes(word)) {
      return SemanticRole.TEMPORAL;
    }

    return SemanticRole.QUALIFIER;
  }

  /**
   * Multi-layered intent classification
   */
  private async classifyIntentMultiLayer(
    query: string,
    tokens: QueryToken[],
    dataContext?: IntelligentSpreadsheetData,
    options: IntentAnalysisOptions = {}
  ): Promise<IntentClassification[]> {
    const classifications: IntentClassification[] = [];

    // Layer 1: Pattern-based classification
    const patternScores = this.calculatePatternScores(query, tokens);

    // Layer 2: Domain-specific classification
    let domainScores: Partial<Record<IntentType, number>> = {};
    if (options.enableDomainSpecific && dataContext) {
      domainScores = this.calculateDomainSpecificScores(query, tokens, dataContext);
    }

    // Layer 3: Semantic classification
    let semanticScores: Partial<Record<IntentType, number>> = {};
    if (options.enableSemanticAnalysis) {
      semanticScores = this.calculateSemanticScores(tokens);
    }

    // Combine scores from all layers
    const combinedScores = this.combineScores(patternScores, domainScores, semanticScores);

    // Create classifications
    for (const [intentType, score] of Object.entries(combinedScores)) {
      if (score > 0.1) { // Minimum threshold
        const classification: IntentClassification = {
          type: intentType as IntentType,
          confidence: score,
          reasoning: this.generateReasoning(intentType as IntentType, query, tokens),
          matchedPatterns: this.getMatchedPatternsForIntent(intentType as IntentType, query),
          domainSpecific: this.isDomainSpecific(intentType as IntentType, dataContext)
        };

        classifications.push(classification);
      }
    }

    // Sort by confidence and return top results
    return classifications
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, options.maxAlternatives || 5);
  }

  /**
   * Determines scope with intelligent expansion
   */
  private async determineScope(
    tokens: QueryToken[],
    entities: any[],
    dataContext?: IntelligentSpreadsheetData
  ): Promise<{
    dataScope: DataScope;
    analyticalScope: AnalyticalScope;
    temporalScope: TemporalScope;
  }> {
    // Determine data scope
    const dataScope = this.determineDataScope(tokens, entities, dataContext);
    
    // Determine analytical scope
    const analyticalScope = this.determineAnalyticalScope(tokens);
    
    // Determine temporal scope
    const temporalScope = this.determineTemporalScope(tokens);

    return { dataScope, analyticalScope, temporalScope };
  }

  /**
   * Analyzes business context from query
   */
  private async analyzeBusinessContext(
    tokens: QueryToken[],
    intentClassifications: IntentClassification[],
    dataContext?: IntelligentSpreadsheetData
  ): Promise<BusinessContext> {
    // Detect domain from data context and query
    const domain = this.detectDomain(tokens, dataContext);
    
    // Determine business use case
    const useCase = this.determineBusinessUseCase(tokens, intentClassifications);
    
    // Assess urgency and complexity
    const urgency = this.assessUrgency(tokens);
    const complexity = this.assessComplexity(tokens, intentClassifications);

    return {
      domain,
      useCase,
      urgency,
      complexity
    };
  }

  /**
   * Detects ambiguities in the query
   */
  private async detectAmbiguities(
    query: string,
    intentClassifications: IntentClassification[],
    entities: any[],
    dataContext?: IntelligentSpreadsheetData
  ): Promise<Ambiguity[]> {
    const ambiguities: Ambiguity[] = [];

    // Check for vague queries
    const vaguePhrases = ['show data', 'analyze', 'help', 'what', 'how'];
    const isVague = vaguePhrases.some(phrase => query.toLowerCase().includes(phrase)) && query.split(' ').length <= 3;
    
    if (isVague) {
      ambiguities.push({
        type: AmbiguityType.SCOPE_DETERMINATION,
        description: 'Query is too vague to determine specific intent',
        alternatives: [
          {
            interpretation: 'Data analysis request',
            confidence: 0.4,
            reasoning: 'Could be asking for data analysis',
            implications: ['Would analyze existing data']
          },
          {
            interpretation: 'General assistance request',
            confidence: 0.6,
            reasoning: 'Could be asking for general help',
            implications: ['Would provide general guidance']
          }
        ],
        confidence: 0.8,
        resolutionStrategy: {
          type: 'clarification',
          questions: [
            'What specific data would you like to analyze?',
            'What type of analysis are you looking for?'
          ]
        }
      });
    }

    // Check for intent ambiguity
    if (intentClassifications.length > 1 && 
        intentClassifications[1].confidence > intentClassifications[0].confidence - 0.2) {
      ambiguities.push({
        type: AmbiguityType.INTENT_CLASSIFICATION,
        description: 'Multiple possible intents detected',
        alternatives: intentClassifications.slice(0, 2).map(ic => ({
          interpretation: `Intent: ${ic.type}`,
          confidence: ic.confidence,
          reasoning: ic.reasoning.join(', '),
          implications: [`This would focus on ${ic.type.toLowerCase()} operations`]
        })),
        confidence: 0.8,
        resolutionStrategy: {
          type: 'clarification',
          questions: [
            'Are you looking to analyze existing data or create new calculations?',
            'Do you want to modify the data or just view insights?'
          ]
        }
      });
    }

    // Check for entity reference ambiguity
    const ambiguousEntities = entities.filter(e => e.alternatives && e.alternatives.length > 0);
    if (ambiguousEntities.length > 0) {
      ambiguities.push({
        type: AmbiguityType.ENTITY_REFERENCE,
        description: 'Ambiguous entity references detected',
        alternatives: ambiguousEntities.map(e => ({
          interpretation: `Entity: ${e.text}`,
          confidence: e.confidence,
          reasoning: `Could refer to multiple entities`,
          implications: [`Different data selections possible`]
        })),
        confidence: 0.7,
        resolutionStrategy: {
          type: 'context_based',
          contextClues: ['Check surrounding data context', 'Use most recent references']
        }
      });
    }

    return ambiguities;
  }

  /**
   * Calculates overall confidence score with detailed breakdown
   */
  private calculateOverallConfidence(
    intentClassifications: IntentClassification[],
    entities: any[],
    scope: any,
    businessContext: BusinessContext,
    ambiguities: Ambiguity[]
  ): ConfidenceScore {
    const primaryIntent = intentClassifications[0];
    if (!primaryIntent) {
      // Handle case where no intent was classified
      return {
        overall: 0.1,
        components: [],
        factors: [],
        explanation: 'No intent could be classified',
        reliability: ReliabilityLevel.VERY_LOW
      };
    }

    const components: ConfidenceComponent[] = [
      {
        name: 'Intent Classification',
        score: primaryIntent.confidence,
        weight: 0.4,
        description: 'Confidence in primary intent identification'
      },
      {
        name: 'Entity Resolution',
        score: entities.length > 0 ? entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length : 0.5,
        weight: 0.3,
        description: 'Confidence in entity extraction and resolution'
      },
      {
        name: 'Scope Determination',
        score: scope.dataScope?.confidence || 0.7,
        weight: 0.2,
        description: 'Confidence in data scope identification'
      },
      {
        name: 'Business Context',
        score: businessContext.domain && businessContext.domain !== DomainType.GENERAL ? 0.8 : 0.5,
        weight: 0.1,
        description: 'Confidence in business context understanding'
      }
    ];

    const factors: ConfidenceFactor[] = [
      {
        type: ambiguities.length === 0 ? FactorType.POSITIVE : FactorType.NEGATIVE,
        impact: ambiguities.length === 0 ? 0.1 : -0.1 * ambiguities.length,
        description: `Ambiguity detection: ${ambiguities.length} ambiguities found`,
        evidence: ambiguities.map(a => a.description)
      }
    ];

    // Calculate weighted overall score
    const overall = components.reduce((sum, comp) => sum + (comp.score * comp.weight), 0);
    const adjustedOverall = Math.max(0, Math.min(1, overall + factors.reduce((sum, f) => sum + f.impact, 0)));

    const reliability = this.determineReliability(adjustedOverall, components, factors);

    return {
      overall: adjustedOverall,
      components,
      factors,
      explanation: this.generateConfidenceExplanation(adjustedOverall, components, factors),
      reliability
    };
  }

  // Helper methods for initialization and pattern matching

  private initializeDomainPatterns(): Map<DomainType, DomainPattern> {
    const patterns = new Map<DomainType, DomainPattern>();
    
    patterns.set(DomainType.FINANCIAL, {
      keywords: ['revenue', 'profit', 'loss', 'stock', 'price', 'portfolio', 'investment', 'return', 'dividend'],
      patterns: [/\$[\d,]+/, /\d+%/, /P&L/, /ROI/, /EBITDA/],
      confidence: 0.9
    });

    patterns.set(DomainType.SALES, {
      keywords: ['sales', 'revenue', 'customer', 'lead', 'conversion', 'quota', 'pipeline', 'deal'],
      patterns: [/sales\s+data/, /customer\s+acquisition/, /conversion\s+rate/],
      confidence: 0.8
    });

    // Add more domain patterns...

    return patterns;
  }

  private initializeIntentPatterns(): Map<IntentType, IntentPattern> {
    const patterns = new Map<IntentType, IntentPattern>();
    
    patterns.set(IntentType.DATA_ANALYSIS, {
      keywords: ['analyze', 'analysis', 'trend', 'pattern', 'insights', 'summary', 'compare', 'what', 'show', 'display', 'revenue', 'profit', 'average'],
      phrases: ['show me trends', 'analyze the data', 'what patterns', 'insights from', 'what is', 'show me', 'what is the average'],
      weight: 1.2
    });

    patterns.set(IntentType.FORMULA_ASSISTANCE, {
      keywords: ['calculate', 'formula', 'sum', 'count', 'total', 'create'],
      phrases: ['create formula', 'calculate total', 'sum of', 'build formula'],
      weight: 1.0
    });

    // Add more intent patterns...

    return patterns;
  }

  private initializeBusinessPatterns(): Map<BusinessUseCase, BusinessPattern> {
    const patterns = new Map<BusinessUseCase, BusinessPattern>();
    
    patterns.set(BusinessUseCase.FINANCIAL_ANALYSIS, {
      indicators: ['financial', 'profit', 'loss', 'revenue', 'cash flow', 'balance sheet'],
      context: ['quarterly', 'annual', 'fiscal', 'budget', 'forecast'],
      confidence: 0.9
    });

    // Add more business patterns...

    return patterns;
  }

  private initializeSemanticRules(): SemanticRule[] {
    return [
      {
        pattern: /what\s+is\s+the\s+(\w+)\s+of\s+(\w+)/,
        semanticStructure: ['predicate', 'attribute', 'subject'],
        confidence: 0.9
      },
      {
        pattern: /calculate\s+(\w+)\s+for\s+(\w+)/,
        semanticStructure: ['predicate', 'attribute', 'subject'],
        confidence: 0.8
      }
      // Add more semantic rules...
    ];
  }

  // Additional helper methods (simplified for brevity)
  private normalizeQuery(query: string): string {
    return query.toLowerCase().trim().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private async extractBasicEntities(tokens: QueryToken[], dataContext?: IntelligentSpreadsheetData): Promise<any[]> {
    // Basic entity extraction - will be enhanced by EntityResolver
    const entities = [];
    
    for (const token of tokens) {
      if (token.type === TokenType.ENTITY || token.entityType) {
        entities.push({
          text: token.text,
          type: token.entityType || this.inferEntityType(token.text),
          confidence: token.confidence,
          position: { start: token.position, end: token.position + 1, tokenIndex: token.position },
          alternatives: []
        });
      }
    }
    
    return entities;
  }

  private inferEntityType(text: string): string {
    // Simple entity type inference
    if (['apple', 'microsoft', 'google', 'amazon'].includes(text.toLowerCase())) {
      return EntityType.COMPANY;
    }
    if (['revenue', 'profit', 'sales', 'price', 'margin'].includes(text.toLowerCase())) {
      return EntityType.METRIC;
    }
    return 'unknown';
  }

  private isPotentialEntity(word: string): boolean {
    // Simple heuristics for entity detection
    const companyIndicators = ['inc', 'corp', 'ltd', 'llc'];
    const metricIndicators = ['revenue', 'profit', 'sales', 'price', 'volume'];
    
    return companyIndicators.some(indicator => word.includes(indicator)) ||
           metricIndicators.includes(word) ||
           /^[A-Z]{2,5}$/.test(word.toUpperCase()); // Stock symbols
  }

  private isPotentialValue(word: string): boolean {
    return /^\d+(\.\d+)?$/.test(word) || 
           /^\d+%$/.test(word) ||
           /^\$\d+/.test(word);
  }

  private detectTokenEntityType(word: string): any {
    // Simple entity type detection
    if (['revenue', 'profit', 'sales', 'price'].includes(word)) return 'metric';
    if (['apple', 'microsoft', 'google'].includes(word)) return 'company';
    return null;
  }

  private calculatePatternScores(query: string, tokens: QueryToken[]): Record<IntentType, number> {
    const scores: Record<IntentType, number> = {} as Record<IntentType, number>;
    
    for (const [intentType, pattern] of this.intentPatterns) {
      let score = 0;
      
      // Keyword matching
      for (const keyword of pattern.keywords) {
        if (query.includes(keyword)) {
          score += pattern.weight * 0.3;
        }
      }
      
      // Phrase matching
      for (const phrase of pattern.phrases || []) {
        if (query.includes(phrase)) {
          score += pattern.weight * 0.5;
        }
      }
      
      scores[intentType] = Math.min(score, 1.0);
    }
    
    return scores;
  }

  private calculateDomainSpecificScores(
    query: string, 
    tokens: QueryToken[], 
    dataContext: IntelligentSpreadsheetData
  ): Partial<Record<IntentType, number>> {
    // Domain-specific scoring logic
    return {};
  }

  private calculateSemanticScores(tokens: QueryToken[]): Partial<Record<IntentType, number>> {
    // Semantic analysis scoring logic
    return {};
  }

  private combineScores(
    patternScores: Record<IntentType, number>,
    domainScores: Partial<Record<IntentType, number>>,
    semanticScores: Partial<Record<IntentType, number>>
  ): Record<IntentType, number> {
    const combined: Record<IntentType, number> = {} as Record<IntentType, number>;
    
    const allIntents = new Set([
      ...Object.keys(patternScores),
      ...Object.keys(domainScores),
      ...Object.keys(semanticScores)
    ]);
    
    for (const intent of allIntents) {
      const intentType = intent as IntentType;
      const pattern = patternScores[intentType] || 0;
      const domain = domainScores[intentType] || 0;
      const semantic = semanticScores[intentType] || 0;
      
      // Weighted combination
      combined[intentType] = (pattern * 0.5) + (domain * 0.3) + (semantic * 0.2);
    }
    
    return combined;
  }

  private generateReasoning(intentType: IntentType, query: string, tokens: QueryToken[]): string[] {
    const reasoning: string[] = [];
    
    const pattern = this.intentPatterns.get(intentType);
    if (pattern) {
      const matchedKeywords = pattern.keywords.filter(k => query.includes(k));
      if (matchedKeywords.length > 0) {
        reasoning.push(`Matched keywords: ${matchedKeywords.join(', ')}`);
      }
    }
    
    const actionTokens = tokens.filter(t => t.type === TokenType.ACTION);
    if (actionTokens.length > 0) {
      reasoning.push(`Action indicators: ${actionTokens.map(t => t.text).join(', ')}`);
    }
    
    return reasoning;
  }

  private getMatchedPatternsForIntent(intentType: IntentType, query: string): MatchedPattern[] {
    const patterns: MatchedPattern[] = [];
    const intentPattern = this.intentPatterns.get(intentType);
    
    if (intentPattern) {
      for (const keyword of intentPattern.keywords) {
        if (query.includes(keyword)) {
          patterns.push({
            pattern: keyword,
            type: PatternType.KEYWORD,
            confidence: 0.8,
            weight: intentPattern.weight
          });
        }
      }
    }
    
    return patterns;
  }

  private isDomainSpecific(intentType: IntentType, dataContext?: IntelligentSpreadsheetData): boolean {
    return dataContext?.domainContext?.domain !== DomainType.GENERAL;
  }

  private determineDataScope(tokens: QueryToken[], entities: any[], dataContext?: IntelligentSpreadsheetData): DataScope {
    const tokenTexts = tokens.map(t => t.text.toLowerCase());
    
    let scopeType = DataScopeType.DATA_BLOCK;
    let confidence = 0.7;
    
    // Check for scope indicators
    if (tokenTexts.some(t => ['entire', 'whole', 'all'].includes(t) && ['sheet', 'worksheet'].some(s => tokenTexts.includes(s)))) {
      scopeType = DataScopeType.ENTIRE_SHEET;
      confidence = 0.9;
    } else if (tokenTexts.some(t => ['column', 'columns'].includes(t))) {
      scopeType = DataScopeType.COLUMN_RANGE;
      confidence = 0.8;
    } else if (tokenTexts.some(t => ['row', 'rows'].includes(t))) {
      scopeType = DataScopeType.ROW_RANGE;
      confidence = 0.8;
    }
    
    return {
      type: scopeType,
      ranges: [],
      includeRelated: tokenTexts.includes('related'),
      expansionRules: [],
      confidence
    };
  }

  private determineAnalyticalScope(tokens: QueryToken[]): AnalyticalScope {
    return {
      analysisType: [AnalysisType.DESCRIPTIVE],
      metrics: [],
      aggregations: [],
      comparisons: []
    };
  }

  private determineTemporalScope(tokens: QueryToken[]): TemporalScope {
    return {
      type: TemporalType.POINT_IN_TIME
    };
  }

  private detectDomain(tokens: QueryToken[], dataContext?: IntelligentSpreadsheetData): DomainType {
    // Check data context first
    if (dataContext?.domainContext?.domain) {
      return dataContext.domainContext.domain;
    }
    
    // Infer from tokens
    const tokenTexts = tokens.map(t => t.text.toLowerCase());
    
    const financialKeywords = ['revenue', 'profit', 'financial', 'roi', 'margin', 'ebitda', 'cash', 'investment'];
    const salesKeywords = ['sales', 'customer', 'lead', 'conversion', 'pipeline'];
    
    if (tokenTexts.some(t => financialKeywords.includes(t))) {
      return DomainType.FINANCIAL;
    }
    if (tokenTexts.some(t => salesKeywords.includes(t))) {
      return DomainType.SALES;
    }
    
    return DomainType.GENERAL;
  }

  private determineBusinessUseCase(tokens: QueryToken[], intentClassifications: IntentClassification[]): BusinessUseCase {
    return BusinessUseCase.FINANCIAL_ANALYSIS; // Simplified
  }

  private assessUrgency(tokens: QueryToken[]): UrgencyLevel {
    const urgentWords = ['urgent', 'asap', 'immediately', 'now', 'quickly'];
    const hasUrgentWords = tokens.some(t => urgentWords.includes(t.text));
    return hasUrgentWords ? UrgencyLevel.HIGH : UrgencyLevel.MEDIUM;
  }

  private assessComplexity(tokens: QueryToken[], intentClassifications: IntentClassification[]): ComplexityLevel {
    const complexWords = ['complex', 'advanced', 'detailed', 'comprehensive'];
    const hasComplexWords = tokens.some(t => complexWords.includes(t.text));
    return hasComplexWords ? ComplexityLevel.COMPLEX : ComplexityLevel.MODERATE;
  }

  private getMatchedPatterns(query: string, tokens: QueryToken[]): MatchedPattern[] {
    return []; // Simplified
  }

  private getScoringBreakdown(intentClassifications: IntentClassification[]): Record<string, number> {
    const breakdown: Record<string, number> = {};
    intentClassifications.forEach(ic => {
      breakdown[ic.type] = ic.confidence;
    });
    return breakdown;
  }

  private getDomainSignals(tokens: QueryToken[], dataContext?: IntelligentSpreadsheetData): string[] {
    return []; // Simplified
  }

  private determineReliability(score: number, components: ConfidenceComponent[], factors: ConfidenceFactor[]): ReliabilityLevel {
    if (score >= 0.9) return ReliabilityLevel.VERY_HIGH;
    if (score >= 0.7) return ReliabilityLevel.HIGH;
    if (score >= 0.5) return ReliabilityLevel.MEDIUM;
    if (score >= 0.3) return ReliabilityLevel.LOW;
    return ReliabilityLevel.VERY_LOW;
  }

  private generateConfidenceExplanation(score: number, components: ConfidenceComponent[], factors: ConfidenceFactor[]): string {
    const topComponent = components.reduce((max, comp) => comp.score > max.score ? comp : max);
    return `Overall confidence of ${(score * 100).toFixed(1)}% based primarily on ${topComponent.name} (${(topComponent.score * 100).toFixed(1)}%)`;
  }
}

// Supporting interfaces
interface DomainPattern {
  keywords: string[];
  patterns: RegExp[];
  confidence: number;
}

interface IntentPattern {
  keywords: string[];
  phrases?: string[];
  weight: number;
}

interface BusinessPattern {
  indicators: string[];
  context: string[];
  confidence: number;
}

interface SemanticRule {
  pattern: RegExp;
  semanticStructure: string[];
  confidence: number;
}

export class EnhancedIntentAnalyzerError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'EnhancedIntentAnalyzerError';
  }
}