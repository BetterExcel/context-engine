/**
 * SelectionConfidenceEngine - Advanced confidence scoring and explanation system
 * 
 * This service provides sophisticated confidence calculation, ranking algorithms,
 * and detailed explanations for intelligent auto-selection candidates.
 */

import {
  SelectionCandidate,
  SelectionContext,
  ConfidenceBreakdown,
  ConfidenceFactor,
  SelectionExplanation,
  ReasoningStep,
  Evidence,
  EvidenceType,
  AlternativeExplanation,
  SelectionRecommendation,
  RecommendationType,
  RecommendationPriority,
  SelectionWeightings,
  EntityMatch,
  ColumnReference,
  RelationshipMap
} from '../types/intelligent-selection';
import { SpreadsheetData, Sheet } from '../types/spreadsheet';

export interface ConfidenceCalculationOptions {
  includeDataQuality: boolean;
  includeRelationships: boolean;
  includeUserHistory: boolean;
  weightings: Partial<SelectionWeightings>;
  explainReasoning: boolean;
}

export interface RankingResult {
  rankedCandidates: SelectionCandidate[];
  confidenceBreakdowns: Map<string, ConfidenceBreakdown>;
  explanations: Map<string, SelectionExplanation>;
  recommendations: SelectionRecommendation[];
}

export class SelectionConfidenceEngine {
  private static readonly DEFAULT_WEIGHTINGS: SelectionWeightings = {
    exactMatch: 0.25,
    fuzzyMatch: 0.15,
    entityConfidence: 0.20,
    columnRelevance: 0.15,
    dataQuality: 0.10,
    relationshipStrength: 0.10,
    userPreference: 0.05
  };

  /**
   * Calculate comprehensive confidence score for a selection candidate
   */
  public static calculateConfidence(
    candidate: SelectionCandidate,
    context: SelectionContext,
    spreadsheetData: SpreadsheetData,
    relationshipMap: RelationshipMap,
    options: ConfidenceCalculationOptions = {
      includeDataQuality: true,
      includeRelationships: true,
      includeUserHistory: false,
      weightings: {},
      explainReasoning: true
    }
  ): ConfidenceBreakdown {
    const weightings = { ...this.DEFAULT_WEIGHTINGS, ...options.weightings };
    
    // Calculate individual confidence factors
    const entityMatchingScore = this.calculateEntityMatchingConfidence(candidate, context);
    const dataQualityScore = options.includeDataQuality 
      ? this.calculateDataQualityConfidence(candidate, spreadsheetData)
      : 0.8;
    const relationshipScore = options.includeRelationships
      ? this.calculateRelationshipConfidence(candidate, relationshipMap)
      : 0.7;
    const contextualRelevanceScore = this.calculateContextualRelevance(candidate, context);
    
    // Calculate weighted overall confidence
    const overallConfidence = 
      entityMatchingScore * (weightings.exactMatch + weightings.fuzzyMatch + weightings.entityConfidence) +
      dataQualityScore * weightings.dataQuality +
      relationshipScore * weightings.relationshipStrength +
      contextualRelevanceScore * (weightings.columnRelevance + weightings.userPreference);

    // Create confidence factors breakdown
    const factors: ConfidenceFactor[] = [
      {
        name: 'Entity Matching',
        value: entityMatchingScore,
        weight: weightings.exactMatch + weightings.fuzzyMatch + weightings.entityConfidence,
        description: 'How well the selection matches the identified entities in the query'
      },
      {
        name: 'Data Quality',
        value: dataQualityScore,
        weight: weightings.dataQuality,
        description: 'Quality and completeness of data in the selected range'
      },
      {
        name: 'Relationship Mapping',
        value: relationshipScore,
        weight: weightings.relationshipStrength,
        description: 'Strength of relationships and dependencies within the selection'
      },
      {
        name: 'Contextual Relevance',
        value: contextualRelevanceScore,
        weight: weightings.columnRelevance + weightings.userPreference,
        description: 'Relevance of selected columns and data to the query context'
      }
    ];

    return {
      overall: Math.max(0, Math.min(1, overallConfidence)),
      entityMatching: entityMatchingScore,
      dataQuality: dataQualityScore,
      relationshipMapping: relationshipScore,
      contextualRelevance: contextualRelevanceScore,
      factors
    };
  }

  /**
   * Rank multiple selection candidates with detailed confidence analysis
   */
  public static rankCandidates(
    candidates: SelectionCandidate[],
    context: SelectionContext,
    spreadsheetData: SpreadsheetData,
    relationshipMap: RelationshipMap,
    options: ConfidenceCalculationOptions = {
      includeDataQuality: true,
      includeRelationships: true,
      includeUserHistory: false,
      weightings: {},
      explainReasoning: true
    }
  ): RankingResult {
    const confidenceBreakdowns = new Map<string, ConfidenceBreakdown>();
    const explanations = new Map<string, SelectionExplanation>();
    
    // Calculate confidence for each candidate
    const candidatesWithConfidence = candidates.map(candidate => {
      const confidenceBreakdown = this.calculateConfidence(
        candidate,
        context,
        spreadsheetData,
        relationshipMap,
        options
      );
      
      confidenceBreakdowns.set(candidate.id, confidenceBreakdown);
      
      // Generate explanation if requested
      if (options.explainReasoning) {
        const explanation = this.generateSelectionExplanation(
          candidate,
          context,
          confidenceBreakdown,
          candidates
        );
        explanations.set(candidate.id, explanation);
      }
      
      return {
        ...candidate,
        confidence: confidenceBreakdown.overall,
        score: this.calculateFinalScore(candidate, confidenceBreakdown, context)
      };
    });

    // Sort by final score
    const rankedCandidates = candidatesWithConfidence.sort((a, b) => b.score - a.score);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(
      rankedCandidates,
      context,
      confidenceBreakdowns
    );

    return {
      rankedCandidates,
      confidenceBreakdowns,
      explanations,
      recommendations
    };
  }

  /**
   * Generate detailed explanation for a selection candidate
   */
  public static generateSelectionExplanation(
    candidate: SelectionCandidate,
    context: SelectionContext,
    confidenceBreakdown: ConfidenceBreakdown,
    allCandidates: SelectionCandidate[]
  ): SelectionExplanation {
    // Generate reasoning steps
    const reasoningSteps = this.generateReasoningSteps(candidate, context, confidenceBreakdown);
    
    // Generate alternative explanations
    const alternatives = this.generateAlternativeExplanations(candidate, allCandidates, context);
    
    // Generate recommendations
    const recommendations = this.generateCandidateRecommendations(candidate, context, confidenceBreakdown);
    
    return {
      summary: this.generateExplanationSummary(candidate, confidenceBreakdown),
      reasoning: reasoningSteps,
      confidence: confidenceBreakdown,
      alternatives,
      recommendations
    };
  }

  /**
   * Calculate entity matching confidence
   */
  private static calculateEntityMatchingConfidence(
    candidate: SelectionCandidate,
    context: SelectionContext
  ): number {
    if (candidate.entityMatches.length === 0) {
      return 0.3; // Base score for selections without entity matches
    }

    let totalConfidence = 0;
    let totalWeight = 0;

    candidate.entityMatches.forEach(entityMatch => {
      const entityWeight = this.calculateEntityWeight(entityMatch, context);
      totalConfidence += entityMatch.confidence * entityWeight;
      totalWeight += entityWeight;
    });

    const avgEntityConfidence = totalWeight > 0 ? totalConfidence / totalWeight : 0;
    
    // Boost for multiple entity matches
    const multiEntityBoost = Math.min(0.2, (candidate.entityMatches.length - 1) * 0.05);
    
    // Boost for exact matches
    const exactMatchBoost = candidate.entityMatches.some(em => em.matchType === 'exact') ? 0.1 : 0;
    
    return Math.min(1, avgEntityConfidence + multiEntityBoost + exactMatchBoost);
  }

  /**
   * Calculate data quality confidence
   */
  private static calculateDataQualityConfidence(
    candidate: SelectionCandidate,
    spreadsheetData: SpreadsheetData
  ): number {
    const sheet = spreadsheetData.sheets.find(s => s.name === candidate.range.sheetName);
    if (!sheet) return 0.5;

    let qualityScore = 0.5; // Base score
    
    // Factor in completeness
    const completeness = candidate.metadata.completeness || 0.8;
    qualityScore += completeness * 0.3;
    
    // Factor in data consistency
    const consistency = this.calculateDataConsistency(candidate, sheet);
    qualityScore += consistency * 0.2;
    
    return Math.min(1, qualityScore);
  }

  /**
   * Calculate relationship confidence
   */
  private static calculateRelationshipConfidence(
    candidate: SelectionCandidate,
    relationshipMap: RelationshipMap
  ): number {
    let relationshipScore = 0.5; // Base score
    
    // Factor in column dependencies
    const dependencyScore = this.calculateDependencyScore(candidate, relationshipMap);
    relationshipScore += dependencyScore * 0.3;
    
    // Factor in hierarchical relationships
    const hierarchyScore = this.calculateHierarchyScore(candidate, relationshipMap);
    relationshipScore += hierarchyScore * 0.2;
    
    return Math.min(1, relationshipScore);
  }

  /**
   * Calculate contextual relevance
   */
  private static calculateContextualRelevance(
    candidate: SelectionCandidate,
    context: SelectionContext
  ): number {
    let relevanceScore = 0.5; // Base score
    
    // Factor in column relevance scores
    if (candidate.relevantColumns.length > 0) {
      const avgColumnRelevance = candidate.relevantColumns.reduce(
        (sum, col) => sum + col.relevanceScore, 0
      ) / candidate.relevantColumns.length;
      relevanceScore += avgColumnRelevance * 0.3;
    }
    
    // Factor in intent alignment
    const intentAlignment = this.calculateIntentAlignment(candidate, context);
    relevanceScore += intentAlignment * 0.2;
    
    return Math.min(1, relevanceScore);
  }

  /**
   * Calculate final score combining confidence and other factors
   */
  private static calculateFinalScore(
    candidate: SelectionCandidate,
    confidenceBreakdown: ConfidenceBreakdown,
    context: SelectionContext
  ): number {
    let score = confidenceBreakdown.overall;
    
    // Apply selection type preferences
    score *= this.getSelectionTypeMultiplier(candidate, context);
    
    // Apply size penalties/bonuses
    score *= this.getSizeMultiplier(candidate, context);
    
    // Apply recency bonus if applicable
    score *= this.getRecencyMultiplier(candidate, context);
    
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Generate reasoning steps for explanation
   */
  private static generateReasoningSteps(
    candidate: SelectionCandidate,
    context: SelectionContext,
    confidenceBreakdown: ConfidenceBreakdown
  ): ReasoningStep[] {
    const steps: ReasoningStep[] = [];
    
    // Step 1: Entity identification
    if (candidate.entityMatches.length > 0) {
      const entityEvidence: Evidence[] = candidate.entityMatches.map(em => ({
        type: EvidenceType.HEADER_SIMILARITY,
        description: `Found "${em.entity}" with ${em.confidence.toFixed(2)} confidence`,
        value: em.confidence,
        weight: 0.8
      }));
      
      steps.push({
        step: 1,
        description: `Identified ${candidate.entityMatches.length} entity match(es) in the data`,
        evidence: entityEvidence,
        confidence: confidenceBreakdown.entityMatching
      });
    }
    
    // Step 2: Data quality assessment
    steps.push({
      step: 2,
      description: 'Assessed data quality and completeness',
      evidence: [{
        type: EvidenceType.STATISTICAL,
        description: `Data completeness: ${(candidate.metadata.completeness * 100).toFixed(1)}%`,
        value: candidate.metadata.completeness,
        weight: 0.6
      }],
      confidence: confidenceBreakdown.dataQuality
    });
    
    // Step 3: Relationship analysis
    if (candidate.relatedSelections.length > 0) {
      steps.push({
        step: 3,
        description: 'Analyzed relationships and dependencies',
        evidence: [{
          type: EvidenceType.VALUE_CORRELATION,
          description: `Found ${candidate.relatedSelections.length} related data range(s)`,
          value: candidate.relatedSelections.length,
          weight: 0.7
        }],
        confidence: confidenceBreakdown.relationshipMapping
      });
    }
    
    return steps;
  }

  /**
   * Generate alternative explanations
   */
  private static generateAlternativeExplanations(
    candidate: SelectionCandidate,
    allCandidates: SelectionCandidate[],
    context: SelectionContext
  ): AlternativeExplanation[] {
    const alternatives: AlternativeExplanation[] = [];
    
    // Find top 3 alternatives (excluding the current candidate)
    const otherCandidates = allCandidates
      .filter(c => c.id !== candidate.id)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    
    otherCandidates.forEach(alt => {
      const reason = this.generateAlternativeReason(candidate, alt);
      const tradeoffs = this.generateTradeoffs(candidate, alt);
      const suitability = this.calculateSuitability(alt, context);
      
      alternatives.push({
        alternative: alt,
        reason,
        tradeoffs,
        suitability
      });
    });
    
    return alternatives;
  }

  /**
   * Generate recommendations for improving selection
   */
  private static generateRecommendations(
    rankedCandidates: SelectionCandidate[],
    context: SelectionContext,
    confidenceBreakdowns: Map<string, ConfidenceBreakdown>
  ): SelectionRecommendation[] {
    const recommendations: SelectionRecommendation[] = [];
    
    if (rankedCandidates.length === 0) {
      recommendations.push({
        type: RecommendationType.IMPROVE_QUALITY,
        description: 'No suitable selections found',
        action: 'Try refining your query or checking data quality',
        priority: RecommendationPriority.HIGH,
        impact: 'May improve selection accuracy'
      });
      return recommendations;
    }
    
    const topCandidate = rankedCandidates[0];
    const topConfidence = confidenceBreakdowns.get(topCandidate.id);
    
    if (!topConfidence) return recommendations;
    
    // Low overall confidence
    if (topConfidence.overall < 0.6) {
      recommendations.push({
        type: RecommendationType.IMPROVE_QUALITY,
        description: 'Selection confidence is below optimal threshold',
        action: 'Consider refining query terms or expanding search scope',
        priority: RecommendationPriority.MEDIUM,
        impact: 'Could significantly improve selection accuracy'
      });
    }
    
    // Low entity matching
    if (topConfidence.entityMatching < 0.5) {
      recommendations.push({
        type: RecommendationType.ADD_CONTEXT,
        description: 'Entity matching confidence is low',
        action: 'Try using more specific entity names or synonyms',
        priority: RecommendationPriority.MEDIUM,
        impact: 'Better entity matching leads to more accurate selections'
      });
    }
    
    // Suggest expansion if relationships exist
    if (topConfidence.relationshipMapping > 0.7 && topCandidate.relatedSelections.length > 0) {
      recommendations.push({
        type: RecommendationType.EXPAND_SELECTION,
        description: 'Strong relationships detected with other data',
        action: 'Consider expanding selection to include related columns',
        priority: RecommendationPriority.LOW,
        impact: 'May provide more comprehensive analysis context'
      });
    }
    
    return recommendations;
  }

  // Helper methods
  private static calculateEntityWeight(entityMatch: EntityMatch, context: SelectionContext): number {
    let weight = 1.0;
    
    // Boost weight for entities that appear in the query
    if (context.entities.includes(entityMatch.entity)) {
      weight *= 1.5;
    }
    
    // Boost weight for exact matches
    if (entityMatch.matchType === 'exact') {
      weight *= 1.3;
    }
    
    return weight;
  }

  private static calculateDataConsistency(candidate: SelectionCandidate, sheet: Sheet): number {
    // Simplified consistency calculation
    // In a full implementation, this would analyze data patterns, formats, etc.
    return 0.8; // Placeholder
  }

  private static calculateDependencyScore(
    candidate: SelectionCandidate,
    relationshipMap: RelationshipMap
  ): number {
    let score = 0;
    
    // Count dependencies that involve columns in the selection
    const selectionColumns = candidate.relevantColumns.map(col => col.index);
    const relevantDependencies = relationshipMap.columnDependencies.filter(dep =>
      selectionColumns.includes(dep.sourceColumn) || selectionColumns.includes(dep.targetColumn)
    );
    
    if (relevantDependencies.length > 0) {
      const avgStrength = relevantDependencies.reduce((sum, dep) => sum + dep.strength, 0) / relevantDependencies.length;
      score = avgStrength;
    }
    
    return score;
  }

  private static calculateHierarchyScore(
    candidate: SelectionCandidate,
    relationshipMap: RelationshipMap
  ): number {
    let score = 0;
    
    // Check if selection includes hierarchical columns
    const selectionColumns = candidate.relevantColumns.map(col => col.index);
    const relevantHierarchies = relationshipMap.dataHierarchies.filter(hierarchy =>
      selectionColumns.includes(hierarchy.parentColumn) ||
      hierarchy.childColumns.some(child => selectionColumns.includes(child))
    );
    
    if (relevantHierarchies.length > 0) {
      score = 0.8; // High score for hierarchical data
    }
    
    return score;
  }

  private static calculateIntentAlignment(candidate: SelectionCandidate, context: SelectionContext): number {
    // Simplified intent alignment calculation
    // In a full implementation, this would analyze how well the selection matches the query intent
    return 0.7; // Placeholder
  }

  private static getSelectionTypeMultiplier(candidate: SelectionCandidate, context: SelectionContext): number {
    // Apply multipliers based on selection type preferences
    switch (candidate.selectionType) {
      case 'row_based':
        return context.intent.intent === 'data_manipulation' ? 1.2 : 1.0;
      case 'column_based':
        return context.intent.intent === 'data_analysis' ? 1.1 : 1.0;
      case 'data_range':
        return context.intent.intent === 'data_analysis' ? 1.2 : 1.0;
      default:
        return 1.0;
    }
  }

  private static getSizeMultiplier(candidate: SelectionCandidate, context: SelectionContext): number {
    const cellCount = candidate.metadata.cellCount;
    
    // Penalize very large selections unless specifically requested
    if (cellCount > 10000 && !context.preferences.preferLargerSelections) {
      return 0.8;
    }
    
    // Penalize very small selections for analysis tasks
    if (cellCount < 10 && context.intent.intent === 'data_analysis') {
      return 0.9;
    }
    
    return 1.0;
  }

  private static getRecencyMultiplier(candidate: SelectionCandidate, context: SelectionContext): number {
    // In a full implementation, this would factor in recent user selections
    return 1.0; // Placeholder
  }

  private static generateExplanationSummary(
    candidate: SelectionCandidate,
    confidenceBreakdown: ConfidenceBreakdown
  ): string {
    const confidencePercent = (confidenceBreakdown.overall * 100).toFixed(1);
    const cellCount = candidate.metadata.cellCount;
    const entityCount = candidate.entityMatches.length;
    
    return `Selected ${cellCount} cells with ${confidencePercent}% confidence based on ${entityCount} entity match(es) and data quality analysis.`;
  }

  private static generateAlternativeReason(
    primary: SelectionCandidate,
    alternative: SelectionCandidate
  ): string {
    if (alternative.selectionType !== primary.selectionType) {
      return `Different selection approach (${alternative.selectionType} vs ${primary.selectionType})`;
    }
    
    if (alternative.metadata.cellCount > primary.metadata.cellCount * 1.5) {
      return 'Broader selection including more contextual data';
    }
    
    if (alternative.metadata.cellCount < primary.metadata.cellCount * 0.7) {
      return 'More focused selection with core data only';
    }
    
    return 'Alternative matching approach with different confidence factors';
  }

  private static generateTradeoffs(
    primary: SelectionCandidate,
    alternative: SelectionCandidate
  ): string[] {
    const tradeoffs: string[] = [];
    
    if (alternative.confidence < primary.confidence) {
      tradeoffs.push('Lower overall confidence');
    } else {
      tradeoffs.push('Higher overall confidence');
    }
    
    if (alternative.metadata.cellCount > primary.metadata.cellCount) {
      tradeoffs.push('Larger selection may include irrelevant data');
    } else {
      tradeoffs.push('Smaller selection may miss important context');
    }
    
    return tradeoffs;
  }

  private static calculateSuitability(candidate: SelectionCandidate, context: SelectionContext): number {
    // Calculate how suitable this alternative is for the given context
    let suitability = candidate.confidence;
    
    // Adjust based on intent alignment
    const intentAlignment = this.calculateIntentAlignment(candidate, context);
    suitability = (suitability + intentAlignment) / 2;
    
    return suitability;
  }

  private static generateCandidateRecommendations(
    candidate: SelectionCandidate,
    context: SelectionContext,
    confidenceBreakdown: ConfidenceBreakdown
  ): SelectionRecommendation[] {
    const recommendations: SelectionRecommendation[] = [];
    
    // Recommend expansion if high relationship confidence
    if (confidenceBreakdown.relationshipMapping > 0.8 && candidate.relatedSelections.length > 0) {
      recommendations.push({
        type: RecommendationType.EXPAND_SELECTION,
        description: 'Strong relationships detected',
        action: 'Consider including related data ranges',
        priority: RecommendationPriority.LOW,
        impact: 'More comprehensive analysis'
      });
    }
    
    // Recommend quality improvement if needed
    if (confidenceBreakdown.dataQuality < 0.6) {
      recommendations.push({
        type: RecommendationType.IMPROVE_QUALITY,
        description: 'Data quality could be improved',
        action: 'Review and clean data before analysis',
        priority: RecommendationPriority.MEDIUM,
        impact: 'More reliable results'
      });
    }
    
    return recommendations;
  }
}