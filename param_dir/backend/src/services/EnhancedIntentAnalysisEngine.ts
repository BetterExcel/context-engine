/**
 * Enhanced Intent Analysis Engine
 * 
 * Main orchestrator for multi-layered natural language processing,
 * entity resolution, and domain-specific intent classification.
 */

import {
  EnhancedIntent,
  EntityResolutionResult,
  ConfidenceScore,
  ConfidenceComponent,
  ConfidenceFactor,
  FactorType,
  ReliabilityLevel,
  QueryToken,
  BusinessContext,
  UserContext,
  SessionContext,
  ConversationStep
} from '../types/intent-analysis';
import { IntelligentSpreadsheetData } from '../types/enhanced-intelligence';
import { EnhancedIntentAnalyzer, IntentAnalysisOptions, IntentAnalysisResult } from './EnhancedIntentAnalyzer';
import { EntityResolutionService, EntityResolutionOptions } from './EntityResolutionService';
import { DomainSpecificIntentClassifier, DomainClassificationResult } from './DomainSpecificIntentClassifier';

export interface EnhancedAnalysisOptions extends IntentAnalysisOptions, EntityResolutionOptions {
  sessionId?: string;
  userContext?: Partial<UserContext>;
  includeEntityResolution?: boolean;
  includeDomainClassification?: boolean;
  enableConversationFlow?: boolean;
}

export interface EnhancedAnalysisResult {
  intent: EnhancedIntent;
  entityResolution?: EntityResolutionResult;
  domainClassification?: DomainClassificationResult;
  processingTime: number;
  confidence: ConfidenceScore;
  recommendations: AnalysisRecommendation[];
  debugInfo?: EnhancedDebugInfo;
}

export interface AnalysisRecommendation {
  type: 'clarification' | 'data_enhancement' | 'scope_refinement' | 'alternative_approach';
  priority: 'low' | 'medium' | 'high';
  description: string;
  action: string;
  expectedImprovement: number;
}

export interface EnhancedDebugInfo {
  tokenization: QueryToken[];
  intentAnalysis: any;
  entityResolution?: any;
  domainClassification?: any;
  confidenceBreakdown: Record<string, number>;
  processingSteps: ProcessingStep[];
}

export interface ProcessingStep {
  step: string;
  duration: number;
  success: boolean;
  details?: any;
}

export class EnhancedIntentAnalysisEngine {
  private readonly intentAnalyzer: EnhancedIntentAnalyzer;
  private readonly entityResolver: EntityResolutionService;
  private readonly domainClassifier: DomainSpecificIntentClassifier;
  private readonly sessionContexts: Map<string, SessionContext>;

  constructor() {
    this.intentAnalyzer = new EnhancedIntentAnalyzer();
    this.entityResolver = new EntityResolutionService();
    this.domainClassifier = new DomainSpecificIntentClassifier();
    this.sessionContexts = new Map();
  }

  /**
   * Performs comprehensive intent analysis with entity resolution and domain classification
   */
  public async analyzeQuery(
    query: string,
    dataContext?: IntelligentSpreadsheetData,
    options: EnhancedAnalysisOptions = {}
  ): Promise<EnhancedAnalysisResult> {
    const startTime = Date.now();
    const processingSteps: ProcessingStep[] = [];

    try {
      // Step 1: Get or create session context
      const sessionContext = this.getOrCreateSessionContext(options.sessionId, options.userContext);
      
      // Step 2: Initial intent analysis
      const stepStart = Date.now();
      const intentResult = await this.intentAnalyzer.analyzeIntent(query, dataContext, options);
      processingSteps.push({
        step: 'Intent Analysis',
        duration: Date.now() - stepStart,
        success: true,
        details: { confidence: intentResult.intent.intent.confidence }
      });

      // Step 3: Domain classification (if enabled)
      let domainClassification: DomainClassificationResult | undefined;
      if (options.includeDomainClassification !== false) {
        const domainStart = Date.now();
        try {
          domainClassification = await this.domainClassifier.classifyDomain(
            query,
            intentResult.intent.query.tokens,
            dataContext
          );
          processingSteps.push({
            step: 'Domain Classification',
            duration: Date.now() - domainStart,
            success: true,
            details: { domain: domainClassification.domain, confidence: domainClassification.confidence }
          });
        } catch (error) {
          processingSteps.push({
            step: 'Domain Classification',
            duration: Date.now() - domainStart,
            success: false,
            details: { error: error instanceof Error ? error.message : 'Unknown error' }
          });
        }
      }

      // Step 4: Enhanced domain-specific intent classification
      if (domainClassification && domainClassification.confidence > 0.6) {
        const domainIntentStart = Date.now();
        try {
          const domainSpecificIntents = await this.domainClassifier.classifyDomainSpecificIntent(
            query,
            intentResult.intent.query.tokens,
            domainClassification.domain,
            dataContext
          );

          // Merge domain-specific intents with general intents
          if (domainSpecificIntents.length > 0 && domainSpecificIntents[0].confidence > intentResult.intent.intent.primary.confidence) {
            intentResult.intent.intent.primary = domainSpecificIntents[0];
            intentResult.intent.intent.secondary = [
              ...domainSpecificIntents.slice(1, 2),
              intentResult.intent.intent.primary
            ].slice(0, 2);
          }

          processingSteps.push({
            step: 'Domain-Specific Intent Classification',
            duration: Date.now() - domainIntentStart,
            success: true,
            details: { enhancedIntents: domainSpecificIntents.length }
          });
        } catch (error) {
          processingSteps.push({
            step: 'Domain-Specific Intent Classification',
            duration: Date.now() - domainIntentStart,
            success: false,
            details: { error: error instanceof Error ? error.message : 'Unknown error' }
          });
        }
      }

      // Step 5: Entity resolution (if enabled)
      let entityResolution: EntityResolutionResult | undefined;
      if (options.includeEntityResolution !== false) {
        const entityStart = Date.now();
        try {
          entityResolution = await this.entityResolver.resolveEntities(
            query,
            intentResult.intent.query.tokens,
            dataContext,
            options
          );
          
          // Update intent with resolved entities
          intentResult.intent.query.entities = entityResolution.entities;

          processingSteps.push({
            step: 'Entity Resolution',
            duration: Date.now() - entityStart,
            success: true,
            details: { 
              entitiesFound: entityResolution.entities.length,
              resolutionsFound: entityResolution.resolutions.length,
              ambiguities: entityResolution.ambiguities.length
            }
          });
        } catch (error) {
          processingSteps.push({
            step: 'Entity Resolution',
            duration: Date.now() - entityStart,
            success: false,
            details: { error: error instanceof Error ? error.message : 'Unknown error' }
          });
        }
      }

      // Step 6: Enhanced business context analysis
      if (domainClassification) {
        const businessContextStart = Date.now();
        try {
          const enhancedBusinessContext = await this.domainClassifier.determineBusinessContext(
            query,
            intentResult.intent.query.tokens,
            domainClassification.domain,
            [intentResult.intent.intent.primary, ...intentResult.intent.intent.secondary]
          );

          intentResult.intent.context.businessContext = enhancedBusinessContext;

          processingSteps.push({
            step: 'Business Context Analysis',
            duration: Date.now() - businessContextStart,
            success: true,
            details: { 
              useCase: enhancedBusinessContext.useCase,
              stakeholder: enhancedBusinessContext.stakeholder,
              complexity: enhancedBusinessContext.complexity
            }
          });
        } catch (error) {
          processingSteps.push({
            step: 'Business Context Analysis',
            duration: Date.now() - businessContextStart,
            success: false,
            details: { error: error instanceof Error ? error.message : 'Unknown error' }
          });
        }
      }

      // Step 7: Update session context
      this.updateSessionContext(sessionContext, query, intentResult.intent, options.enableConversationFlow);

      // Step 8: Calculate overall confidence
      const overallConfidence = this.calculateOverallConfidence(
        intentResult,
        entityResolution,
        domainClassification
      );

      // Step 9: Generate recommendations
      const recommendations = await this.generateRecommendations(
        intentResult.intent,
        entityResolution,
        domainClassification,
        overallConfidence
      );

      const totalProcessingTime = Date.now() - startTime;

      const result: EnhancedAnalysisResult = {
        intent: intentResult.intent,
        entityResolution,
        domainClassification,
        processingTime: totalProcessingTime,
        confidence: overallConfidence,
        recommendations
      };

      if (options.includeExplanations) {
        result.debugInfo = {
          tokenization: intentResult.intent.query.tokens,
          intentAnalysis: intentResult.debugInfo,
          entityResolution: entityResolution,
          domainClassification: domainClassification,
          confidenceBreakdown: this.getConfidenceBreakdown(overallConfidence),
          processingSteps
        };
      }

      return result;

    } catch (error) {
      throw new EnhancedIntentAnalysisError(
        `Enhanced intent analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'ANALYSIS_FAILED'
      );
    }
  }

  /**
   * Gets or creates session context
   */
  private getOrCreateSessionContext(
    sessionId?: string,
    userContext?: Partial<UserContext>
  ): SessionContext {
    const id = sessionId || this.generateSessionId();
    
    let context = this.sessionContexts.get(id);
    if (!context) {
      context = {
        sessionId: id,
        startTime: new Date(),
        queryCount: 0,
        recentEntities: [],
        conversationFlow: []
      };
      this.sessionContexts.set(id, context);
    }

    return context;
  }

  /**
   * Updates session context with new query information
   */
  private updateSessionContext(
    sessionContext: SessionContext,
    query: string,
    intent: EnhancedIntent,
    enableConversationFlow?: boolean
  ): void {
    sessionContext.queryCount++;
    
    // Update recent entities
    sessionContext.recentEntities = [
      ...intent.query.entities,
      ...sessionContext.recentEntities.slice(0, 10) // Keep last 10 entities
    ];

    // Update conversation flow if enabled
    if (enableConversationFlow) {
      sessionContext.conversationFlow.push({
        type: 'query',
        content: query,
        timestamp: new Date(),
        metadata: {
          intent: intent.intent.primary.type,
          confidence: intent.intent.confidence,
          entitiesCount: intent.query.entities.length
        }
      });

      // Keep last 20 conversation steps
      if (sessionContext.conversationFlow.length > 20) {
        sessionContext.conversationFlow = sessionContext.conversationFlow.slice(-20);
      }
    }
  }

  /**
   * Calculates overall confidence across all analysis components
   */
  private calculateOverallConfidence(
    intentResult: IntentAnalysisResult,
    entityResolution?: EntityResolutionResult,
    domainClassification?: DomainClassificationResult
  ): ConfidenceScore {
    const components: ConfidenceComponent[] = [
      {
        name: 'Intent Analysis',
        score: intentResult.intent.intent.confidence,
        weight: 0.4,
        description: 'Confidence in intent classification'
      }
    ];

    const factors: ConfidenceFactor[] = [];

    // Add entity resolution confidence
    if (entityResolution) {
      components.push({
        name: 'Entity Resolution',
        score: entityResolution.confidence.overall,
        weight: 0.3,
        description: 'Confidence in entity extraction and resolution'
      });

      if (entityResolution.ambiguities.length > 0) {
        factors.push({
          type: FactorType.NEGATIVE,
          impact: -0.1 * entityResolution.ambiguities.length,
          description: `${entityResolution.ambiguities.length} entity ambiguities detected`,
          evidence: entityResolution.ambiguities.map(a => a.entity.text)
        });
      }
    }

    // Add domain classification confidence
    if (domainClassification) {
      components.push({
        name: 'Domain Classification',
        score: domainClassification.confidence,
        weight: 0.2,
        description: 'Confidence in domain identification'
      });

      if (domainClassification.confidence > 0.8) {
        factors.push({
          type: FactorType.POSITIVE,
          impact: 0.1,
          description: 'High confidence domain classification',
          evidence: [`Domain: ${domainClassification.domain}`]
        });
      }
    }

    // Add processing quality factor
    components.push({
      name: 'Processing Quality',
      score: intentResult.processingTime < 2000 ? 0.9 : 0.7, // Penalize slow processing
      weight: 0.1,
      description: 'Quality of processing pipeline'
    });

    // Calculate weighted overall score
    const weightedScore = components.reduce((sum, comp) => sum + (comp.score * comp.weight), 0);
    const factorAdjustment = factors.reduce((sum, factor) => sum + factor.impact, 0);
    const overall = Math.max(0, Math.min(1, weightedScore + factorAdjustment));

    const reliability = this.determineReliability(overall, components, factors);

    return {
      overall,
      components,
      factors,
      explanation: this.generateConfidenceExplanation(overall, components, factors),
      reliability
    };
  }

  /**
   * Generates actionable recommendations based on analysis results
   */
  private async generateRecommendations(
    intent: EnhancedIntent,
    entityResolution?: EntityResolutionResult,
    domainClassification?: DomainClassificationResult,
    confidence?: ConfidenceScore
  ): Promise<AnalysisRecommendation[]> {
    const recommendations: AnalysisRecommendation[] = [];

    // Low confidence recommendations
    if (confidence && confidence.overall < 0.7) {
      recommendations.push({
        type: 'clarification',
        priority: 'high',
        description: 'Query analysis confidence is low',
        action: 'Ask user for clarification or provide more context',
        expectedImprovement: 0.3
      });
    }

    // Entity ambiguity recommendations
    if (entityResolution && entityResolution.ambiguities.length > 0) {
      recommendations.push({
        type: 'clarification',
        priority: 'medium',
        description: 'Ambiguous entity references detected',
        action: 'Clarify which specific entities the user is referring to',
        expectedImprovement: 0.2
      });
    }

    // Intent ambiguity recommendations
    if (intent.intent.ambiguities.length > 0) {
      recommendations.push({
        type: 'clarification',
        priority: 'medium',
        description: 'Multiple possible intents detected',
        action: 'Ask user to specify their primary goal',
        expectedImprovement: 0.25
      });
    }

    // Data enhancement recommendations
    if (entityResolution && entityResolution.resolutions.length === 0) {
      recommendations.push({
        type: 'data_enhancement',
        priority: 'medium',
        description: 'No entities found in spreadsheet data',
        action: 'Suggest data enrichment or alternative search terms',
        expectedImprovement: 0.4
      });
    }

    // Scope refinement recommendations
    if (intent.scope.dataScope.confidence < 0.6) {
      recommendations.push({
        type: 'scope_refinement',
        priority: 'low',
        description: 'Data scope determination is uncertain',
        action: 'Ask user to specify which data ranges to include',
        expectedImprovement: 0.15
      });
    }

    // Domain-specific recommendations
    if (domainClassification && domainClassification.suggestedAnalytics.length > 0) {
      recommendations.push({
        type: 'alternative_approach',
        priority: 'low',
        description: 'Domain-specific analytics available',
        action: `Consider ${domainClassification.suggestedAnalytics[0].name}`,
        expectedImprovement: 0.2
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Determines reliability level based on confidence score and factors
   */
  private determineReliability(
    score: number,
    components: ConfidenceComponent[],
    factors: ConfidenceFactor[]
  ): ReliabilityLevel {
    // Check for negative factors
    const hasNegativeFactors = factors.some(f => f.type === FactorType.NEGATIVE);
    
    if (score >= 0.9 && !hasNegativeFactors) return ReliabilityLevel.VERY_HIGH;
    if (score >= 0.8) return ReliabilityLevel.HIGH;
    if (score >= 0.6) return ReliabilityLevel.MEDIUM;
    if (score >= 0.4) return ReliabilityLevel.LOW;
    return ReliabilityLevel.VERY_LOW;
  }

  /**
   * Generates human-readable confidence explanation
   */
  private generateConfidenceExplanation(
    score: number,
    components: ConfidenceComponent[],
    factors: ConfidenceFactor[]
  ): string {
    const percentage = (score * 100).toFixed(1);
    const topComponent = components.reduce((max, comp) => 
      comp.score * comp.weight > max.score * max.weight ? comp : max
    );

    let explanation = `Overall confidence: ${percentage}% (${this.getConfidenceLevel(score)})`;
    explanation += `. Primary factor: ${topComponent.name} (${(topComponent.score * 100).toFixed(1)}%)`;

    const negativeFactors = factors.filter(f => f.type === FactorType.NEGATIVE);
    if (negativeFactors.length > 0) {
      explanation += `. Concerns: ${negativeFactors.map(f => f.description).join(', ')}`;
    }

    return explanation;
  }

  /**
   * Gets confidence level description
   */
  private getConfidenceLevel(score: number): string {
    if (score >= 0.9) return 'Very High';
    if (score >= 0.7) return 'High';
    if (score >= 0.5) return 'Medium';
    if (score >= 0.3) return 'Low';
    return 'Very Low';
  }

  /**
   * Gets detailed confidence breakdown
   */
  private getConfidenceBreakdown(confidence: ConfidenceScore): Record<string, number> {
    const breakdown: Record<string, number> = {};
    
    confidence.components.forEach(comp => {
      breakdown[comp.name] = comp.score;
    });

    confidence.factors.forEach((factor, index) => {
      breakdown[`Factor_${index + 1}`] = factor.impact;
    });

    return breakdown;
  }

  /**
   * Generates unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleans up old session contexts
   */
  public cleanupSessions(maxAge: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    
    for (const [sessionId, context] of this.sessionContexts.entries()) {
      if (now - context.startTime.getTime() > maxAge) {
        this.sessionContexts.delete(sessionId);
      }
    }
  }

  /**
   * Gets session context for debugging
   */
  public getSessionContext(sessionId: string): SessionContext | undefined {
    return this.sessionContexts.get(sessionId);
  }
}

export class EnhancedIntentAnalysisError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'EnhancedIntentAnalysisError';
  }
}