/**
 * Context Synthesis Engine
 * Combines all intelligence layers to create comprehensive, actionable context understanding
 */

import {
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
  InsightType,
  InsightCategory,
  InsightPriority,
  RiskType,
  OpportunityType,
  PatternType,
  PatternSignificance,
  ConfidenceLevel,
  ActionType,
  ActionPriority,
  EffortLevel,
  ImpactLevel,
  ComplexityLevel
} from '../types/context-synthesis';

import { EnhancedIntent } from '../types/intent-analysis';
import { SelectionCandidate, RelationshipMap } from '../types/intelligent-selection';
import { DomainEnhancedAnalysis } from '../types/domain-intelligence';
import { IntelligentSpreadsheetData } from '../types/enhanced-intelligence';

export interface ContextSynthesisOptions {
  includeRiskAnalysis?: boolean;
  includeOpportunityAnalysis?: boolean;
  includePatternDiscovery?: boolean;
  confidenceThreshold?: number;
  maxInsights?: number;
  maxRecommendations?: number;
  enableUncertaintyQuantification?: boolean;
  prioritizeActionability?: boolean;
}

export class ContextSynthesisEngine {
  private readonly defaultOptions: Required<ContextSynthesisOptions> = {
    includeRiskAnalysis: true,
    includeOpportunityAnalysis: true,
    includePatternDiscovery: true,
    confidenceThreshold: 0.6,
    maxInsights: 10,
    maxRecommendations: 5,
    enableUncertaintyQuantification: true,
    prioritizeActionability: true
  };

  /**
   * Synthesize comprehensive context from all intelligence layers
   */
  async synthesizeContext(
    intent: EnhancedIntent,
    selection: SelectionCandidate,
    domainAnalysis: DomainEnhancedAnalysis,
    data: IntelligentSpreadsheetData,
    options: ContextSynthesisOptions = {}
  ): Promise<ComprehensiveContext> {
    const opts = { ...this.defaultOptions, ...options };
    const startTime = Date.now();

    try {
      // Build core context components
      const dataContext = await this.buildDataContext(data, selection);
      const businessContext = await this.buildBusinessContext(intent, domainAnalysis);
      const analyticalContext = await this.buildAnalyticalContext(intent, domainAnalysis);

      // Generate insights and analysis
      const insights = await this.generateInsights(
        intent, selection, domainAnalysis, data, opts
      );
      
      const risks = opts.includeRiskAnalysis 
        ? await this.identifyRisks(dataContext, businessContext, analyticalContext)
        : [];
      
      const opportunities = opts.includeOpportunityAnalysis
        ? await this.identifyOpportunities(dataContext, businessContext, analyticalContext)
        : [];
      
      const patterns = opts.includePatternDiscovery
        ? await this.discoverPatterns(data, selection, intent)
        : [];

      // Calculate overall confidence and reliability
      const confidence = await this.calculateOverallConfidence(
        intent, selection, domainAnalysis, data, opts
      );
      
      const reliability = await this.assessReliability(
        dataContext, businessContext, analyticalContext
      );

      // Generate recommendations and alternatives
      const nextSteps = await this.generateRecommendations(
        insights, risks, opportunities, patterns, opts
      );
      
      const alternatives = await this.generateAlternatives(
        intent, selection, domainAnalysis, data
      );

      const processingTime = Date.now() - startTime;

      return {
        id: this.generateContextId(),
        timestamp: new Date(),
        query: intent.query.original,
        dataContext,
        businessContext,
        analyticalContext,
        insights,
        risks,
        opportunities,
        patterns,
        confidence,
        reliability,
        nextSteps,
        alternatives,
        processingTime,
        dataQuality: dataContext.dataQuality.overallScore,
        complexity: this.assessComplexity(data, intent, domainAnalysis)
      };

    } catch (error) {
      throw new Error(`Context synthesis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }  /**

   * Build comprehensive data context
   */
  private async buildDataContext(
    data: IntelligentSpreadsheetData,
    selection: SelectionCandidate
  ): Promise<DataContext> {
    return {
      spreadsheetData: data,
      selectedRanges: [selection],
      relationshipMap: this.buildRelationshipMap(data),
      dataQuality: this.assessDataQuality(data),
      dataCharacteristics: this.analyzeDataCharacteristics(data),
      temporalContext: this.extractTemporalContext(data)
    };
  }

  /**
   * Build business context from intent and domain analysis
   */
  private async buildBusinessContext(
    intent: EnhancedIntent,
    domainAnalysis: DomainEnhancedAnalysis
  ): Promise<BusinessContext> {
    return {
      domain: domainAnalysis.domainClassification,
      useCase: {
        primary: intent.context.businessContext?.useCase || 'data_analysis',
        secondary: [],
        context: intent.query.original,
        objectives: [`Analyze ${intent.query.original}`]
      },
      stakeholders: this.identifyStakeholders(intent, domainAnalysis),
      objectives: this.extractBusinessObjectives(intent),
      constraints: this.identifyBusinessConstraints(intent, domainAnalysis),
      regulations: this.identifyRegulatoryContext(domainAnalysis)
    };
  }

  /**
   * Build analytical context
   */
  private async buildAnalyticalContext(
    intent: EnhancedIntent,
    domainAnalysis: DomainEnhancedAnalysis
  ): Promise<AnalyticalContext> {
    return {
      intent,
      analysisType: this.determineAnalysisTypes(intent, domainAnalysis),
      requiredMetrics: this.identifyRequiredMetrics(intent, domainAnalysis),
      comparisons: this.identifyComparisons(intent),
      benchmarks: this.identifyBenchmarks(domainAnalysis),
      validationRules: this.defineValidationRules(intent, domainAnalysis)
    };
  }

  /**
   * Generate comprehensive insights
   */
  private async generateInsights(
    intent: EnhancedIntent,
    selection: SelectionCandidate,
    domainAnalysis: DomainEnhancedAnalysis,
    data: IntelligentSpreadsheetData,
    options: Required<ContextSynthesisOptions>
  ): Promise<ContextInsight[]> {
    const insights: ContextInsight[] = [];

    // Data quality insights
    insights.push(...this.generateDataQualityInsights(data));

    // Pattern-based insights
    insights.push(...this.generatePatternInsights(data, selection));

    // Domain-specific insights
    insights.push(...this.generateDomainInsights(domainAnalysis, data));

    // Intent-based insights
    insights.push(...this.generateIntentInsights(intent, selection, data));

    // Correlation insights
    insights.push(...this.generateCorrelationInsights(data));

    // Filter and rank insights
    return this.filterAndRankInsights(insights, options);
  } 
 /**
   * Identify risks in the context
   */
  private async identifyRisks(
    dataContext: DataContext,
    businessContext: BusinessContext,
    analyticalContext: AnalyticalContext
  ): Promise<Risk[]> {
    const risks: Risk[] = [];

    // Data quality risks
    if (dataContext.dataQuality.overallScore < 0.7) {
      risks.push({
        id: this.generateId('risk'),
        type: RiskType.DATA_QUALITY,
        category: 'immediate' as any,
        title: 'Data Quality Issues Detected',
        description: 'Low data quality may affect analysis accuracy and reliability',
        probability: 1 - dataContext.dataQuality.overallScore,
        impact: ImpactLevel.MODERATE,
        severity: 'medium' as any,
        evidence: [{
          type: 'data_quality_score',
          description: `Overall data quality score: ${dataContext.dataQuality.overallScore.toFixed(2)}`,
          strength: 0.9,
          source: 'data_quality_analyzer'
        }],
        mitigationStrategies: [{
          id: this.generateId('mitigation'),
          description: 'Implement data cleaning and validation procedures',
          effectiveness: 0.8,
          cost: 'medium',
          timeframe: 'short_term'
        }],
        timeframe: {
          immediate: true,
          shortTerm: true,
          mediumTerm: false,
          longTerm: false
        },
        affectedAreas: ['analysis_accuracy', 'decision_making'],
        confidence: 0.85
      });
    }

    // Financial risks (domain-specific)
    if (businessContext.domain.primaryDomain === 'financial') {
      risks.push(...this.identifyFinancialRisks(dataContext, businessContext));
    }

    // Analytical risks
    risks.push(...this.identifyAnalyticalRisks(analyticalContext, dataContext));

    return risks;
  }

  /**
   * Identify opportunities in the context
   */
  private async identifyOpportunities(
    dataContext: DataContext,
    businessContext: BusinessContext,
    analyticalContext: AnalyticalContext
  ): Promise<Opportunity[]> {
    const opportunities: Opportunity[] = [];

    // Data enhancement opportunities
    if (dataContext.dataQuality.completeness < 0.9) {
      opportunities.push({
        id: this.generateId('opportunity'),
        type: OpportunityType.QUALITY_ENHANCEMENT,
        category: 'short_term' as any,
        title: 'Data Completeness Enhancement',
        description: 'Improving data completeness could enhance analysis accuracy',
        potential: {
          qualitative: 'Improved analysis accuracy and reliability',
          timeframe: 'short_term'
        },
        feasibility: {
          technical: 0.8,
          financial: 0.9,
          operational: 0.7,
          strategic: 0.8,
          overall: 0.8
        },
        evidence: [{
          type: 'completeness_analysis',
          description: `Current completeness: ${dataContext.dataQuality.completeness.toFixed(2)}`,
          strength: 0.8,
          source: 'data_quality_analyzer'
        }],
        requirements: [{
          type: 'data_collection',
          description: 'Implement systematic data collection procedures',
          priority: 'high',
          effort: 'medium'
        }],
        timeframe: {
          implementation: '2-4 weeks',
          realization: '1-2 months',
          duration: '3-6 months'
        },
        confidence: 0.75,
        priority: 'medium' as any
      });
    }

    // Domain-specific opportunities
    if (businessContext.domain.primaryDomain === 'financial') {
      opportunities.push(...this.identifyFinancialOpportunities(dataContext, businessContext));
    }

    return opportunities;
  }  /**

   * Discover patterns in the data
   */
  private async discoverPatterns(
    data: IntelligentSpreadsheetData,
    selection: SelectionCandidate,
    intent: EnhancedIntent
  ): Promise<DiscoveredPattern[]> {
    const patterns: DiscoveredPattern[] = [];

    // Temporal patterns
    patterns.push(...this.discoverTemporalPatterns(data));

    // Correlation patterns
    patterns.push(...this.discoverCorrelationPatterns(data, selection));

    // Hierarchical patterns
    patterns.push(...this.discoverHierarchicalPatterns(data));

    // Trend patterns
    patterns.push(...this.discoverTrendPatterns(data, selection));

    return patterns.filter(p => p.confidence > 0.6);
  }

  /**
   * Calculate overall confidence with multi-factor analysis
   */
  private async calculateOverallConfidence(
    intent: EnhancedIntent,
    selection: SelectionCandidate,
    domainAnalysis: DomainEnhancedAnalysis,
    data: IntelligentSpreadsheetData,
    options: Required<ContextSynthesisOptions>
  ): Promise<OverallConfidence> {
    // Calculate real confidence based on actual data analysis
    const entityMatchScore = this.calculateEntityMatchConfidence(intent, data);
    const dataQualityScore = this.calculateActualDataQuality(selection, data);
    const querySpecificityScore = this.calculateQuerySpecificityScore(intent);
    const formulaApplicabilityScore = this.calculateFormulaApplicability(intent, selection, data);
    const selectionRelevanceScore = this.calculateSelectionRelevance(selection, intent, data);

    const components = [
      {
        name: 'Entity Recognition',
        score: entityMatchScore,
        weight: 0.30,
        description: 'Accuracy of entity identification in the data',
        evidence: this.getEntityMatchEvidence(intent, data)
      },
      {
        name: 'Data Quality',
        score: dataQualityScore,
        weight: 0.25,
        description: 'Quality and completeness of the selected data',
        evidence: this.getDataQualityEvidence(selection, data)
      },
      {
        name: 'Query Specificity',
        score: querySpecificityScore,
        weight: 0.20,
        description: 'How specific and actionable the user query is',
        evidence: this.getQuerySpecificityEvidence(intent)
      },
      {
        name: 'Formula Applicability',
        score: formulaApplicabilityScore,
        weight: 0.15,
        description: 'How well Excel formulas can solve the query',
        evidence: this.getFormulaApplicabilityEvidence(intent, selection)
      },
      {
        name: 'Selection Relevance',
        score: selectionRelevanceScore,
        weight: 0.10,
        description: 'Relevance of selected data to the query',
        evidence: this.getSelectionRelevanceEvidence(selection, intent)
      }
    ];

    const overallScore = components.reduce((sum, comp) => sum + (comp.score * comp.weight), 0);

    return {
      score: overallScore,
      level: this.getConfidenceLevel(overallScore),
      components,
      factors: this.identifyRealConfidenceFactors(intent, selection, domainAnalysis, data),
      uncertainty: options.enableUncertaintyQuantification 
        ? this.quantifyRealUncertainty(intent, selection, domainAnalysis, data)
        : {
            dataUncertainty: this.calculateDataUncertainty(selection, data),
            modelUncertainty: this.calculateModelUncertainty(intent),
            contextualUncertainty: this.calculateContextualUncertainty(intent, data),
            overallUncertainty: Math.max(0.1, 1 - overallScore),
            uncertaintyFactors: this.getUncertaintyFactors(intent, selection, data).map(f => ({ 
              source: 'DATA_QUALITY' as any, 
              magnitude: 0.1,
              description: f
            })),
            confidenceInterval: { 
              lower: Math.max(0, overallScore - 0.15), 
              upper: Math.min(1, overallScore + 0.15), 
              level: 0.95 
            }
          },
      reliability: {
        consistency: this.calculateConsistency(selection, data),
        stability: this.calculateStability(intent, selection),
        reproducibility: this.calculateReproducibility(intent, data),
        validity: this.calculateValidity(intent, selection, data)
      }
    };
  }  /*
*
   * Generate actionable recommendations
   */
  private async generateRecommendations(
    insights: ContextInsight[],
    risks: Risk[],
    opportunities: Opportunity[],
    patterns: DiscoveredPattern[],
    options: Required<ContextSynthesisOptions>
  ): Promise<RecommendedAction[]> {
    const recommendations: RecommendedAction[] = [];

    // High-priority insight-based recommendations
    const highPriorityInsights = insights.filter(i => i.priority === 'high' || i.priority === 'critical');
    for (const insight of highPriorityInsights) {
      if (insight.actionability.score > 0.7) {
        recommendations.push({
          id: this.generateId('action'),
          type: ActionType.ANALYTICAL,
          title: `Address ${insight.title}`,
          description: insight.actionability.recommendations.join('; '),
          priority: insight.priority === 'critical' ? ActionPriority.CRITICAL : ActionPriority.HIGH,
          effort: EffortLevel.MEDIUM,
          impact: ImpactLevel.MODERATE,
          timeframe: {
            start: 'immediate',
            duration: '1-2 weeks',
            milestones: ['Analysis completion', 'Implementation']
          },
          prerequisites: [],
          steps: insight.actionability.recommendations.map((rec, idx) => ({
            order: idx + 1,
            description: rec,
            duration: '2-3 days',
            dependencies: []
          })),
          resources: [{
            type: 'analytical',
            description: 'Data analysis expertise',
            quantity: '1 analyst',
            availability: 'available'
          }],
          risks: [],
          success_criteria: [`Improved ${insight.category} understanding`]
        });
      }
    }

    // Risk mitigation recommendations
    const highRisks = risks.filter(r => r.severity === 'high' || r.severity === 'critical');
    for (const risk of highRisks) {
      recommendations.push({
        id: this.generateId('action'),
        type: ActionType.CORRECTIVE,
        title: `Mitigate ${risk.title}`,
        description: risk.mitigationStrategies[0]?.description || 'Address identified risk',
        priority: risk.severity === 'critical' ? ActionPriority.CRITICAL : ActionPriority.HIGH,
        effort: EffortLevel.MEDIUM,
        impact: ImpactLevel.MAJOR,
        timeframe: {
          start: 'immediate',
          duration: risk.mitigationStrategies[0]?.timeframe || '1-2 weeks',
          milestones: ['Risk assessment', 'Mitigation implementation']
        },
        prerequisites: [],
        steps: [{
          order: 1,
          description: risk.mitigationStrategies[0]?.description || 'Implement risk mitigation',
          duration: '1 week',
          dependencies: []
        }],
        resources: [{
          type: 'operational',
          description: 'Risk management resources',
          quantity: 'as needed',
          availability: 'to be determined'
        }],
        risks: [{
          description: 'Mitigation may not be fully effective',
          probability: 0.2,
          impact: 'moderate',
          mitigation: 'Monitor and adjust approach'
        }],
        success_criteria: [`Reduced ${risk.type} risk`]
      });
    }

    // Opportunity realization recommendations
    const highValueOpportunities = opportunities.filter(o => o.priority === 'high' || o.priority === 'critical');
    for (const opportunity of highValueOpportunities.slice(0, 2)) {
      recommendations.push({
        id: this.generateId('action'),
        type: ActionType.STRATEGIC,
        title: `Pursue ${opportunity.title}`,
        description: opportunity.description,
        priority: opportunity.priority === 'critical' ? ActionPriority.CRITICAL : ActionPriority.HIGH,
        effort: EffortLevel.MEDIUM,
        impact: ImpactLevel.MODERATE,
        timeframe: {
          start: opportunity.timeframe.implementation,
          duration: opportunity.timeframe.duration,
          milestones: ['Planning', 'Implementation', 'Realization']
        },
        prerequisites: opportunity.requirements.map(r => r.description),
        steps: opportunity.requirements.map((req, idx) => ({
          order: idx + 1,
          description: req.description,
          duration: '1-2 weeks',
          dependencies: []
        })),
        resources: opportunity.requirements.map(req => ({
          type: req.type,
          description: req.description,
          quantity: req.effort,
          availability: 'to be determined'
        })),
        risks: [],
        success_criteria: [opportunity.potential.qualitative]
      });
    }

    return recommendations
      .sort((a, b) => this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority))
      .slice(0, options.maxRecommendations);
  }

  // Helper methods for context building and analysis

  private buildRelationshipMap(data: IntelligentSpreadsheetData): RelationshipMap {
    return {
      columnDependencies: [],
      dataHierarchies: [],
      calculatedFields: [],
      crossReferences: [],
      semanticRelationships: []
    };
  }

  private assessDataQuality(data: IntelligentSpreadsheetData) {
    return {
      overallScore: data.qualityMetrics.overallScore,
      completeness: data.qualityMetrics.completeness,
      accuracy: data.qualityMetrics.accuracy,
      consistency: data.qualityMetrics.consistency,
      timeliness: data.qualityMetrics.timeliness || 0.8,
      issues: data.qualityMetrics.issues.map(issue => ({
        type: issue.type,
        severity: issue.severity,
        description: issue.description,
        affectedCells: issue.affectedCells.map(cell => cell.address),
        impact: 0.5
      }))
    };
  }

  private analyzeDataCharacteristics(data: IntelligentSpreadsheetData) {
    const totalCells = data.sheets.reduce((sum, sheet) => sum + (sheet.data.length * (sheet.data[0]?.length || 0)), 0);
    const nonEmptyCells = data.sheets.reduce((sum, sheet) => 
      sum + sheet.data.flat().filter(cell => cell.value !== null && cell.value !== undefined && cell.value !== '').length, 0
    );

    return {
      size: {
        rows: data.sheets.reduce((sum, sheet) => sum + sheet.data.length, 0),
        columns: Math.max(...data.sheets.map(sheet => sheet.data[0]?.length || 0)),
        cells: totalCells,
        nonEmptyCells,
        dataVolume: this.formatDataVolume(totalCells)
      },
      complexity: {
        level: this.assessDataComplexity(data),
        factors: [
          { type: 'sheet_count', value: data.sheets.length, description: 'Number of sheets' },
          { type: 'data_types', value: Object.keys(data.searchIndex.byDataType).length, description: 'Variety of data types' }
        ],
        score: 0.6
      },
      structure: {
        type: 'tabular',
        organization: 'structured',
        hierarchical: data.dataPatterns.hierarchies.length > 0,
        normalized: true
      },
      temporality: {
        hasTimeData: data.dataPatterns.timeSeriesPatterns.length > 0,
        timeColumns: data.dataPatterns.timeSeriesPatterns.map(p => `Column ${p.dateColumn}`),
        frequency: data.dataPatterns.timeSeriesPatterns[0]?.frequency || 'unknown',
        coverage: 'complete'
      },
      relationships: {
        density: data.dataPatterns.relationships.length / Math.max(1, data.sheets[0]?.data[0]?.length || 1),
        complexity: 'moderate',
        types: data.dataPatterns.relationships.map(r => r.type),
        strength: 0.7
      }
    };
  }

  private extractTemporalContext(data: IntelligentSpreadsheetData) {
    const timeSeriesPatterns = data.dataPatterns.timeSeriesPatterns;
    if (timeSeriesPatterns.length === 0) return undefined;

    return {
      timeRange: {
        start: undefined,
        end: undefined
      },
      frequency: timeSeriesPatterns[0].frequency,
      seasonality: timeSeriesPatterns[0].trend === 'seasonal' ? {
        type: 'seasonal',
        period: timeSeriesPatterns[0].frequency,
        strength: 0.7,
        peaks: []
      } : undefined,
      trends: timeSeriesPatterns.map(pattern => ({
        direction: pattern.trend,
        strength: pattern.confidence,
        significance: 0.8,
        timeframe: 'current_period'
      }))
    };
  }

  private extractBusinessObjectives(intent: EnhancedIntent) {
    return [{
      id: this.generateId('objective'),
      description: `Analyze ${intent.query.original}`,
      priority: 1,
      measurable: true,
      timeframe: 'immediate'
    }];
  }

  private identifyStakeholders(intent: EnhancedIntent, domainAnalysis: DomainEnhancedAnalysis) {
    return [{
      type: intent.context.userContext?.role || 'analyst',
      role: 'primary_user',
      interests: ['accurate_analysis', 'actionable_insights'],
      influence: 1.0
    }];
  }

  private identifyBusinessConstraints(intent: EnhancedIntent, domainAnalysis: DomainEnhancedAnalysis) {
    return [{
      type: 'data_availability',
      description: 'Analysis limited to available data',
      severity: 'medium',
      impact: ['analysis_scope']
    }];
  }

  private identifyRegulatoryContext(domainAnalysis: DomainEnhancedAnalysis) {
    if (domainAnalysis.domainClassification.primaryDomain === 'financial') {
      return [{
        framework: 'Financial Reporting Standards',
        requirements: ['Accuracy', 'Transparency', 'Compliance'],
        compliance: true,
        risks: ['Regulatory violations']
      }];
    }
    return undefined;
  }

  private determineAnalysisTypes(intent: EnhancedIntent, domainAnalysis: DomainEnhancedAnalysis) {
    return [{
      name: intent.intent.primary.type,
      category: 'descriptive',
      complexity: 'moderate',
      requirements: ['data_access', 'analytical_tools']
    }];
  }

  private identifyRequiredMetrics(intent: EnhancedIntent, domainAnalysis: DomainEnhancedAnalysis) {
    return intent.scope.analyticalScope?.metrics?.map(metric => ({
      name: metric.name,
      type: metric.type,
      formula: undefined,
      dependencies: [],
      priority: metric.priority
    })) || [];
  }

  private identifyComparisons(intent: EnhancedIntent) {
    return [];
  }

  private identifyBenchmarks(domainAnalysis: DomainEnhancedAnalysis) {
    return [];
  }

  private defineValidationRules(intent: EnhancedIntent, domainAnalysis: DomainEnhancedAnalysis) {
    return [{
      id: this.generateId('validation'),
      description: 'Data completeness validation',
      condition: 'completeness > 0.8',
      severity: 'medium'
    }];
  }

  // Insight generation methods

  private generateDataQualityInsights(data: IntelligentSpreadsheetData): ContextInsight[] {
    const insights: ContextInsight[] = [];
    const quality = data.qualityMetrics;

    if (quality.completeness < 0.9) {
      insights.push({
        id: this.generateId('insight'),
        type: InsightType.VALIDATION,
        category: InsightCategory.QUALITY,
        title: 'Data Completeness Issue',
        description: `Data completeness is ${(quality.completeness * 100).toFixed(1)}%, which may affect analysis reliability`,
        evidence: [{
          type: 'completeness_analysis',
          description: `Completeness score: ${quality.completeness.toFixed(3)}`,
          strength: 0.9,
          source: 'data_quality_analyzer'
        }],
        confidence: 0.9,
        impact: {
          magnitude: 1 - quality.completeness,
          scope: ['analysis_accuracy'],
          timeframe: 'immediate',
          confidence: 0.85
        },
        actionability: {
          score: 0.8,
          factors: [{
            name: 'data_collection',
            value: 0.8,
            description: 'Missing data can be collected or estimated'
          }],
          recommendations: ['Identify sources for missing data', 'Implement data validation rules']
        },
        priority: quality.completeness < 0.7 ? InsightPriority.HIGH : InsightPriority.MEDIUM,
        relatedInsights: [],
        tags: ['data_quality', 'completeness']
      });
    }

    return insights;
  }

  private generatePatternInsights(data: IntelligentSpreadsheetData, selection: SelectionCandidate): ContextInsight[] {
    const insights: ContextInsight[] = [];
    
    // Time series patterns
    if (data.dataPatterns.timeSeriesPatterns.length > 0) {
      const pattern = data.dataPatterns.timeSeriesPatterns[0];
      insights.push({
        id: this.generateId('insight'),
        type: InsightType.TREND,
        category: InsightCategory.PERFORMANCE,
        title: `${pattern.trend.charAt(0).toUpperCase() + pattern.trend.slice(1)} Trend Detected`,
        description: `Data shows a ${pattern.trend} trend with ${pattern.frequency} frequency`,
        evidence: [{
          type: 'trend_analysis',
          description: `Trend: ${pattern.trend}, Confidence: ${pattern.confidence.toFixed(2)}`,
          strength: pattern.confidence,
          source: 'pattern_analyzer'
        }],
        confidence: pattern.confidence,
        impact: {
          magnitude: 0.7,
          scope: ['forecasting', 'planning'],
          timeframe: 'ongoing',
          confidence: pattern.confidence
        },
        actionability: {
          score: 0.75,
          factors: [{
            name: 'trend_analysis',
            value: 0.75,
            description: 'Trend can be used for forecasting and planning'
          }],
          recommendations: ['Use trend for forecasting', 'Monitor for trend changes']
        },
        priority: InsightPriority.MEDIUM,
        relatedInsights: [],
        tags: ['trend', 'time_series', pattern.frequency]
      });
    }

    return insights;
  }

  private generateDomainInsights(domainAnalysis: DomainEnhancedAnalysis, data: IntelligentSpreadsheetData): ContextInsight[] {
    const insights: ContextInsight[] = [];

    if (domainAnalysis.domainClassification.primaryDomain === 'financial') {
      insights.push({
        id: this.generateId('insight'),
        type: InsightType.RECOMMENDATION,
        category: InsightCategory.FINANCIAL,
        title: 'Financial Analysis Opportunity',
        description: 'Financial data detected - consider portfolio analysis and risk metrics',
        evidence: [{
          type: 'domain_classification',
          description: `Domain: ${domainAnalysis.domainClassification.primaryDomain}, Confidence: ${domainAnalysis.domainClassification.confidence.toFixed(2)}`,
          strength: domainAnalysis.domainClassification.confidence,
          source: 'domain_classifier'
        }],
        confidence: domainAnalysis.domainClassification.confidence,
        impact: {
          magnitude: 0.8,
          scope: ['investment_decisions', 'risk_management'],
          timeframe: 'strategic',
          confidence: 0.8
        },
        actionability: {
          score: 0.85,
          factors: [{
            name: 'financial_analysis',
            value: 0.85,
            description: 'Standard financial metrics can be calculated'
          }],
          recommendations: ['Calculate portfolio returns', 'Assess risk metrics', 'Analyze diversification']
        },
        priority: InsightPriority.HIGH,
        relatedInsights: [],
        tags: ['financial', 'portfolio', 'analysis']
      });
    }

    return insights;
  }

  private generateIntentInsights(intent: EnhancedIntent, selection: SelectionCandidate, data: IntelligentSpreadsheetData): ContextInsight[] {
    const insights: ContextInsight[] = [];

    if (intent.intent.confidence < 0.8) {
      insights.push({
        id: this.generateId('insight'),
        type: InsightType.VALIDATION,
        category: InsightCategory.QUALITY,
        title: 'Intent Clarity Issue',
        description: 'Query intent may be ambiguous - consider clarification',
        evidence: [{
          type: 'intent_analysis',
          description: `Intent confidence: ${intent.intent.confidence.toFixed(2)}`,
          strength: 1 - intent.intent.confidence,
          source: 'intent_analyzer'
        }],
        confidence: 0.8,
        impact: {
          magnitude: 1 - intent.intent.confidence,
          scope: ['analysis_accuracy'],
          timeframe: 'immediate',
          confidence: 0.8
        },
        actionability: {
          score: 0.9,
          factors: [{
            name: 'clarification',
            value: 0.9,
            description: 'Intent can be clarified through user interaction'
          }],
          recommendations: ['Ask clarifying questions', 'Provide alternative interpretations']
        },
        priority: intent.intent.confidence < 0.6 ? InsightPriority.HIGH : InsightPriority.MEDIUM,
        relatedInsights: [],
        tags: ['intent', 'clarity', 'ambiguity']
      });
    }

    return insights;
  }

  private generateCorrelationInsights(data: IntelligentSpreadsheetData): ContextInsight[] {
    const insights: ContextInsight[] = [];
    
    // Check for strong relationships
    const strongRelationships = data.dataPatterns.relationships.filter(r => r.type === 'correlation');
    
    if (strongRelationships.length > 0) {
      insights.push({
        id: this.generateId('insight'),
        type: InsightType.CORRELATION,
        category: InsightCategory.PERFORMANCE,
        title: 'Strong Data Correlations Found',
        description: `${strongRelationships.length} significant correlations detected in the data`,
        evidence: [{
          type: 'correlation_analysis',
          description: `Found ${strongRelationships.length} correlations`,
          strength: 0.8,
          source: 'correlation_analyzer'
        }],
        confidence: 0.8,
        impact: {
          magnitude: 0.7,
          scope: ['predictive_modeling', 'causal_analysis'],
          timeframe: 'analytical',
          confidence: 0.75
        },
        actionability: {
          score: 0.7,
          factors: [{
            name: 'correlation_analysis',
            value: 0.7,
            description: 'Correlations can be used for predictive modeling'
          }],
          recommendations: ['Investigate causal relationships', 'Use for predictive modeling']
        },
        priority: InsightPriority.MEDIUM,
        relatedInsights: [],
        tags: ['correlation', 'relationships', 'modeling']
      });
    }

    return insights;
  } 
 // Pattern discovery methods

  private discoverTemporalPatterns(data: IntelligentSpreadsheetData): DiscoveredPattern[] {
    return data.dataPatterns.timeSeriesPatterns.map(pattern => ({
      id: this.generateId('pattern'),
      type: PatternType.TEMPORAL,
      name: `${pattern.frequency} ${pattern.trend} Pattern`,
      description: `Temporal pattern showing ${pattern.trend} trend with ${pattern.frequency} frequency`,
      strength: pattern.confidence,
      frequency: 1.0,
      significance: PatternSignificance.MEDIUM,
      evidence: [{
        type: 'time_series_analysis',
        description: `Trend: ${pattern.trend}, Frequency: ${pattern.frequency}`,
        strength: pattern.confidence,
        data: pattern
      }],
      implications: [{
        type: 'forecasting',
        description: 'Can be used for time series forecasting',
        impact: 'predictive_capability',
        actionable: true
      }],
      confidence: pattern.confidence,
      applicability: {
        scope: ['time_series_analysis', 'forecasting'],
        conditions: ['sufficient_historical_data'],
        limitations: ['trend_may_change']
      }
    }));
  }

  private discoverCorrelationPatterns(data: IntelligentSpreadsheetData, selection: SelectionCandidate): DiscoveredPattern[] {
    const correlationRelationships = data.dataPatterns.relationships.filter(r => r.type === 'correlation');
    
    return correlationRelationships.map(rel => ({
      id: this.generateId('pattern'),
      type: PatternType.CORRELATION,
      name: 'Data Correlation Pattern',
      description: `Strong correlation detected between data elements`,
      strength: 0.8,
      frequency: 1.0,
      significance: PatternSignificance.MEDIUM,
      evidence: [{
        type: 'correlation_analysis',
        description: rel.description,
        strength: 0.8,
        data: rel
      }],
      implications: [{
        type: 'predictive_modeling',
        description: 'Correlation can be used for predictive analysis',
        impact: 'analytical_capability',
        actionable: true
      }],
      confidence: 0.8,
      applicability: {
        scope: ['predictive_modeling', 'causal_analysis'],
        conditions: ['correlation_stability'],
        limitations: ['correlation_not_causation']
      }
    }));
  }

  private discoverHierarchicalPatterns(data: IntelligentSpreadsheetData): DiscoveredPattern[] {
    return data.dataPatterns.hierarchies.map(hierarchy => ({
      id: this.generateId('pattern'),
      type: PatternType.HIERARCHY,
      name: `${hierarchy.type} Hierarchy`,
      description: `Hierarchical structure with ${hierarchy.levels.length} levels`,
      strength: hierarchy.confidence,
      frequency: 1.0,
      significance: PatternSignificance.HIGH,
      evidence: [{
        type: 'hierarchy_analysis',
        description: `Type: ${hierarchy.type}, Levels: ${hierarchy.levels.length}`,
        strength: hierarchy.confidence,
        data: hierarchy
      }],
      implications: [{
        type: 'aggregation',
        description: 'Enables hierarchical aggregation and drill-down analysis',
        impact: 'analytical_structure',
        actionable: true
      }],
      confidence: hierarchy.confidence,
      applicability: {
        scope: ['hierarchical_analysis', 'aggregation', 'drill_down'],
        conditions: ['clear_hierarchy_levels'],
        limitations: ['hierarchy_consistency']
      }
    }));
  }

  private discoverTrendPatterns(data: IntelligentSpreadsheetData, selection: SelectionCandidate): DiscoveredPattern[] {
    const trendPatterns = data.dataPatterns.timeSeriesPatterns.filter(p => 
      p.trend === 'increasing' || p.trend === 'decreasing'
    );

    return trendPatterns.map(pattern => ({
      id: this.generateId('pattern'),
      type: PatternType.TREND,
      name: `${pattern.trend.charAt(0).toUpperCase() + pattern.trend.slice(1)} Trend`,
      description: `Clear ${pattern.trend} trend detected in time series data`,
      strength: pattern.confidence,
      frequency: 1.0,
      significance: pattern.confidence > 0.8 ? PatternSignificance.HIGH : PatternSignificance.MEDIUM,
      evidence: [{
        type: 'trend_analysis',
        description: `Direction: ${pattern.trend}, Confidence: ${pattern.confidence.toFixed(2)}`,
        strength: pattern.confidence,
        data: pattern
      }],
      implications: [{
        type: 'forecasting',
        description: 'Trend can be extrapolated for future predictions',
        impact: 'predictive_insight',
        actionable: true
      }],
      confidence: pattern.confidence,
      applicability: {
        scope: ['trend_analysis', 'forecasting', 'planning'],
        conditions: ['trend_stability', 'sufficient_data_points'],
        limitations: ['trend_reversal_risk']
      }
    }));
  }

  // Risk and opportunity identification methods

  private identifyFinancialRisks(dataContext: DataContext, businessContext: BusinessContext): Risk[] {
    const risks: Risk[] = [];

    // Market volatility risk
    risks.push({
      id: this.generateId('risk'),
      type: RiskType.FINANCIAL,
      category: 'medium_term' as any,
      title: 'Market Volatility Risk',
      description: 'Financial data may be subject to market volatility affecting analysis validity',
      probability: 0.6,
      impact: ImpactLevel.MODERATE,
      severity: 'medium' as any,
      evidence: [{
        type: 'domain_analysis',
        description: 'Financial domain detected with inherent market risks',
        strength: 0.7,
        source: 'domain_classifier'
      }],
      mitigationStrategies: [{
        id: this.generateId('mitigation'),
        description: 'Use risk-adjusted metrics and scenario analysis',
        effectiveness: 0.7,
        cost: 'low',
        timeframe: 'immediate'
      }],
      timeframe: {
        immediate: false,
        shortTerm: true,
        mediumTerm: true,
        longTerm: true
      },
      affectedAreas: ['portfolio_valuation', 'risk_metrics'],
      confidence: 0.7
    });

    return risks;
  }

  private identifyAnalyticalRisks(analyticalContext: AnalyticalContext, dataContext: DataContext): Risk[] {
    const risks: Risk[] = [];

    if (analyticalContext.intent.intent.ambiguities.length > 0) {
      risks.push({
        id: this.generateId('risk'),
        type: RiskType.TECHNICAL,
        category: 'immediate' as any,
        title: 'Analysis Ambiguity Risk',
        description: 'Ambiguous intent may lead to incorrect analysis results',
        probability: 0.8,
        impact: ImpactLevel.MODERATE,
        severity: 'medium' as any,
        evidence: [{
          type: 'intent_analysis',
          description: `${analyticalContext.intent.intent.ambiguities.length} ambiguities detected`,
          strength: 0.8,
          source: 'intent_analyzer'
        }],
        mitigationStrategies: [{
          id: this.generateId('mitigation'),
          description: 'Seek clarification and validate assumptions',
          effectiveness: 0.9,
          cost: 'low',
          timeframe: 'immediate'
        }],
        timeframe: {
          immediate: true,
          shortTerm: false,
          mediumTerm: false,
          longTerm: false
        },
        affectedAreas: ['analysis_accuracy'],
        confidence: 0.85
      });
    }

    return risks;
  }

  private identifyFinancialOpportunities(dataContext: DataContext, businessContext: BusinessContext): Opportunity[] {
    const opportunities: Opportunity[] = [];

    // Portfolio optimization opportunity
    opportunities.push({
      id: this.generateId('opportunity'),
      type: OpportunityType.EFFICIENCY_IMPROVEMENT,
      category: 'medium_term' as any,
      title: 'Portfolio Optimization',
      description: 'Financial data enables advanced portfolio optimization analysis',
      potential: {
        qualitative: 'Improved risk-adjusted returns through optimization',
        timeframe: 'medium_term'
      },
      feasibility: {
        technical: 0.9,
        financial: 0.8,
        operational: 0.7,
        strategic: 0.9,
        overall: 0.825
      },
      evidence: [{
        type: 'domain_analysis',
        description: 'Financial domain with portfolio data detected',
        strength: 0.8,
        source: 'domain_classifier'
      }],
      requirements: [{
        type: 'analytical',
        description: 'Implement portfolio optimization algorithms',
        priority: 'high',
        effort: 'medium'
      }],
      timeframe: {
        implementation: '2-4 weeks',
        realization: '1-3 months',
        duration: '6-12 months'
      },
      confidence: 0.8,
      priority: 'high' as any
    });

    return opportunities;
  }

  // Utility and helper methods

  private filterAndRankInsights(insights: ContextInsight[], options: Required<ContextSynthesisOptions>): ContextInsight[] {
    return insights
      .filter(insight => insight.confidence >= options.confidenceThreshold)
      .sort((a, b) => {
        // Sort by priority first, then by actionability, then by confidence
        const priorityWeight = this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority);
        if (priorityWeight !== 0) return priorityWeight;
        
        const actionabilityWeight = b.actionability.score - a.actionability.score;
        if (Math.abs(actionabilityWeight) > 0.1) return actionabilityWeight;
        
        return b.confidence - a.confidence;
      })
      .slice(0, options.maxInsights);
  }

  private getPriorityWeight(priority: string): number {
    switch (priority) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  }

  private calculatePatternConfidence(data: IntelligentSpreadsheetData): number {
    const patterns = [
      ...data.dataPatterns.timeSeriesPatterns,
      ...data.dataPatterns.hierarchies
    ];
    
    if (patterns.length === 0) return 0.5;
    
    const avgConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length;
    return avgConfidence;
  }

  private getConfidenceLevel(score: number): ConfidenceLevel {
    if (score >= 0.9) return ConfidenceLevel.VERY_HIGH;
    if (score >= 0.8) return ConfidenceLevel.HIGH;
    if (score >= 0.6) return ConfidenceLevel.MEDIUM;
    if (score >= 0.4) return ConfidenceLevel.LOW;
    return ConfidenceLevel.VERY_LOW;
  }

  // New real confidence calculation methods
  private calculateEntityMatchConfidence(intent: EnhancedIntent, data: IntelligentSpreadsheetData): number {
    const entities = intent.query.entities || [];
    if (entities.length === 0) return 0.3;

    const dataText = JSON.stringify(data).toLowerCase();
    const foundEntities = entities.filter(entity => 
      dataText.includes(entity.text.toLowerCase())
    );

    return Math.min(foundEntities.length / entities.length + 0.2, 1.0);
  }

  private calculateActualDataQuality(selection: SelectionCandidate, data: IntelligentSpreadsheetData): number {
    // Check data completeness, consistency, and structure
    let score = 0.5;
    
    if (data.qualityMetrics) {
      score = data.qualityMetrics.overallScore;
    }
    
    return Math.min(score, 1.0);
  }

  private calculateQuerySpecificityScore(intent: EnhancedIntent): number {
    let score = 0.3;
    
    if (intent.query.entities && intent.query.entities.length > 0) score += 0.3;
    if (intent.intent.primary.type && intent.intent.primary.type !== 'UNKNOWN' as any) score += 0.3;
    if (intent.query.original.length > 10) score += 0.1;
    
    return Math.min(score, 1.0);
  }

  private calculateFormulaApplicability(intent: EnhancedIntent, selection: SelectionCandidate, data: IntelligentSpreadsheetData): number {
    // High for lookup operations, medium for calculations
    const lookupIntents = ['DATA_LOOKUP', 'FIND_VALUE', 'SEARCH'];
    if (lookupIntents.includes(intent.intent.primary.type)) return 0.9;
    
    const calculationIntents = ['CALCULATE', 'SUM', 'AVERAGE'];
    if (calculationIntents.includes(intent.intent.primary.type)) return 0.8;
    
    return 0.6;
  }

  private calculateSelectionRelevance(selection: SelectionCandidate, intent: EnhancedIntent, data: IntelligentSpreadsheetData): number {
    return selection.confidence || 0.7;
  }

  private getEntityMatchEvidence(intent: EnhancedIntent, data: IntelligentSpreadsheetData): string[] {
    const entities = intent.query.entities || [];
    return entities.map(e => `Entity "${e.text}" ${JSON.stringify(data).toLowerCase().includes(e.text.toLowerCase()) ? 'found' : 'not found'} in data`);
  }

  private getDataQualityEvidence(selection: SelectionCandidate, data: IntelligentSpreadsheetData): string[] {
    return [
      `Data completeness: ${((data.qualityMetrics?.completeness || 0.8) * 100).toFixed(1)}%`,
      `Data consistency: ${((data.qualityMetrics?.consistency || 0.8) * 100).toFixed(1)}%`
    ];
  }

  private getQuerySpecificityEvidence(intent: EnhancedIntent): string[] {
    return [
      `Entities identified: ${intent.query.entities?.length || 0}`,
      `Intent clarity: ${intent.intent.primary.type}`,
      `Query length: ${intent.query.original.length} characters`
    ];
  }

  private getFormulaApplicabilityEvidence(intent: EnhancedIntent, selection: SelectionCandidate): string[] {
    return [
      `Intent type: ${intent.intent.primary.type}`,
      'Excel formulas highly applicable for data lookup operations'
    ];
  }

  private getSelectionRelevanceEvidence(selection: SelectionCandidate, intent: EnhancedIntent): string[] {
    return [
      `Selection confidence: ${((selection.confidence || 0.7) * 100).toFixed(1)}%`,
      `Range: ${selection.range.startRow}:${selection.range.startCol}-${selection.range.endRow}:${selection.range.endCol}`
    ];
  }

  private calculateDataUncertainty(selection: SelectionCandidate, data: IntelligentSpreadsheetData): number {
    return 1 - (data.qualityMetrics?.overallScore || 0.8);
  }

  private calculateModelUncertainty(intent: EnhancedIntent): number {
    return 1 - (intent.intent.confidence || 0.8);
  }

  private calculateContextualUncertainty(intent: EnhancedIntent, data: IntelligentSpreadsheetData): number {
    return intent.query.entities?.length === 0 ? 0.3 : 0.1;
  }

  private getUncertaintyFactors(intent: EnhancedIntent, selection: SelectionCandidate, data: IntelligentSpreadsheetData): string[] {
    const factors = [];
    
    if (!intent.query.entities || intent.query.entities.length === 0) {
      factors.push('No specific entities identified in query');
    }
    
    if ((data.qualityMetrics?.overallScore || 0.8) < 0.7) {
      factors.push('Data quality below optimal threshold');
    }
    
    return factors;
  }

  private calculateConsistency(selection: SelectionCandidate, data: IntelligentSpreadsheetData): number {
    return data.qualityMetrics?.consistency || 0.85;
  }

  private calculateStability(intent: EnhancedIntent, selection: SelectionCandidate): number {
    return intent.intent.confidence > 0.8 ? 0.9 : 0.7;
  }

  private calculateReproducibility(intent: EnhancedIntent, data: IntelligentSpreadsheetData): number {
    return 0.9; // High for structured data operations
  }

  private calculateValidity(intent: EnhancedIntent, selection: SelectionCandidate, data: IntelligentSpreadsheetData): number {
    return (intent.intent.confidence + selection.confidence + data.qualityMetrics.overallScore) / 3;
  }

  private quantifyRealUncertainty(intent: EnhancedIntent, selection: SelectionCandidate, domainAnalysis: DomainEnhancedAnalysis, data: IntelligentSpreadsheetData) {
    return {
      dataUncertainty: this.calculateDataUncertainty(selection, data),
      modelUncertainty: this.calculateModelUncertainty(intent),
      contextualUncertainty: this.calculateContextualUncertainty(intent, data),
      overallUncertainty: 0.15,
      uncertaintyFactors: this.getUncertaintyFactors(intent, selection, data).map(f => ({ 
        source: 'DATA_QUALITY' as any, 
        magnitude: 0.1,
        description: f
      })),
      confidenceInterval: { lower: 0.7, upper: 0.95, level: 0.95 }
    };
  }

  private identifyRealConfidenceFactors(
    intent: EnhancedIntent,
    selection: SelectionCandidate,
    domainAnalysis: DomainEnhancedAnalysis,
    data: IntelligentSpreadsheetData
  ) {
    const factors = [];

    // Entity recognition factors
    const entities = intent.query.entities || [];
    if (entities.length > 0) {
      const dataText = JSON.stringify(data).toLowerCase();
      const foundEntities = entities.filter(entity => 
        dataText.includes(entity.text.toLowerCase())
      );
      
      if (foundEntities.length === entities.length) {
        factors.push({
          type: 'positive' as any,
          name: 'All Entities Found',
          impact: 0.3,
          description: 'All target entities identified in the data',
          evidence: foundEntities.map(e => `Found: ${e.text}`)
        });
      } else if (foundEntities.length > 0) {
        factors.push({
          type: 'mixed' as any,
          name: 'Partial Entity Match',
          impact: 0.1,
          description: 'Some target entities found in the data',
          evidence: [`Found ${foundEntities.length}/${entities.length} entities`]
        });
      } else {
        factors.push({
          type: 'negative' as any,
          name: 'No Entities Found',
          impact: -0.4,
          description: 'Target entities not found in the data',
          evidence: entities.map(e => `Missing: ${e.text}`)
        });
      }
    }

    // Data quality factors
    if (data.qualityMetrics && data.qualityMetrics.overallScore > 0.8) {
      factors.push({
        type: 'positive' as any,
        name: 'High Data Quality',
        impact: 0.2,
        description: 'Data quality supports reliable analysis',
        evidence: [`Quality score: ${(data.qualityMetrics.overallScore * 100).toFixed(1)}%`]
      });
    }

    return factors;
  }

  private identifyConfidenceFactors(
    intent: EnhancedIntent,
    selection: SelectionCandidate,
    domainAnalysis: DomainEnhancedAnalysis,
    data: IntelligentSpreadsheetData
  ) {
    // Use the new real confidence factors
    return this.identifyRealConfidenceFactors(intent, selection, domainAnalysis, data);
  }

  private quantifyUncertainty(
    intent: EnhancedIntent,
    selection: SelectionCandidate,
    domainAnalysis: DomainEnhancedAnalysis,
    data: IntelligentSpreadsheetData
  ) {
    const dataUncertainty = 1 - data.qualityMetrics.overallScore;
    const modelUncertainty = 0.1; // Base model uncertainty
    const contextualUncertainty = intent.intent.ambiguities.length * 0.1;
    
    const overallUncertainty = Math.min(1.0, 
      dataUncertainty * 0.4 + modelUncertainty * 0.3 + contextualUncertainty * 0.3
    );

    return {
      dataUncertainty,
      modelUncertainty,
      contextualUncertainty,
      overallUncertainty,
      uncertaintyFactors: [
        {
          source: 'data_quality' as any,
          magnitude: dataUncertainty,
          description: 'Uncertainty from data quality issues',
          mitigation: 'Improve data collection and validation'
        }
      ],
      confidenceInterval: {
        lower: Math.max(0, 0.8 - overallUncertainty),
        upper: Math.min(1, 0.8 + overallUncertainty),
        level: 0.95
      }
    };
  }

  private assessReliability(
    dataContext: DataContext,
    businessContext: BusinessContext,
    analyticalContext: AnalyticalContext
  ): Promise<ReliabilityAssessment> {
    return Promise.resolve({
      dataReliability: dataContext.dataQuality.overallScore,
      methodReliability: 0.85,
      contextReliability: 0.80,
      overallReliability: (dataContext.dataQuality.overallScore + 0.85 + 0.80) / 3,
      factors: [
        {
          name: 'Data Quality',
          impact: dataContext.dataQuality.overallScore,
          description: 'Impact of data quality on reliability'
        },
        {
          name: 'Method Maturity',
          impact: 0.85,
          description: 'Reliability of analytical methods used'
        }
      ]
    });
  }

  private generateAlternatives(
    intent: EnhancedIntent,
    selection: SelectionCandidate,
    domainAnalysis: DomainEnhancedAnalysis,
    data: IntelligentSpreadsheetData
  ): Promise<ContextAlternative[]> {
    // For now, return empty alternatives - could be expanded to generate alternative interpretations
    return Promise.resolve([]);
  }

  private assessComplexity(
    data: IntelligentSpreadsheetData,
    intent: EnhancedIntent,
    domainAnalysis: DomainEnhancedAnalysis
  ): ComplexityLevel {
    let complexityScore = 0;

    // Data complexity factors
    const totalCells = data.sheets.reduce((sum, sheet) => sum + (sheet.data.length * (sheet.data[0]?.length || 0)), 0);
    if (totalCells > 10000) complexityScore += 2;
    else if (totalCells > 1000) complexityScore += 1;

    // Intent complexity
    if (intent.intent.ambiguities.length > 2) complexityScore += 1;
    if (intent.scope.analyticalScope?.analysisType?.length > 2) complexityScore += 1;

    // Domain complexity
    if (domainAnalysis.domainClassification.primaryDomain === 'financial') complexityScore += 1;

    if (complexityScore >= 4) return ComplexityLevel.VERY_COMPLEX;
    if (complexityScore >= 3) return ComplexityLevel.COMPLEX;
    if (complexityScore >= 2) return ComplexityLevel.MODERATE;
    return ComplexityLevel.SIMPLE;
  }

  private assessDataComplexity(data: IntelligentSpreadsheetData): ComplexityLevel {
    const factors = [
      data.sheets.length > 1 ? 1 : 0,
      Object.keys(data.searchIndex.byDataType).length > 5 ? 1 : 0,
      data.dataPatterns.relationships.length > 3 ? 1 : 0,
      data.dataPatterns.hierarchies.length > 0 ? 1 : 0
    ];

    const score = factors.reduce((sum, f) => sum + f, 0);
    
    if (score >= 3) return ComplexityLevel.COMPLEX;
    if (score >= 2) return ComplexityLevel.MODERATE;
    return ComplexityLevel.SIMPLE;
  }

  private formatDataVolume(cellCount: number): string {
    if (cellCount > 1000000) return 'Large (>1M cells)';
    if (cellCount > 100000) return 'Medium (>100K cells)';
    if (cellCount > 10000) return 'Small (>10K cells)';
    return 'Very Small (<10K cells)';
  }

  private generateContextId(): string {
    return `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }
}

