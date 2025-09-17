/**
 * IntelligentAutoSelectionService - Main service orchestrating intelligent auto-selection
 * 
 * This service integrates all components to provide comprehensive intelligent auto-selection
 * with contextual understanding, relationship mapping, and confidence-based ranking.
 */

import {
  IntelligentSelectionRequest,
  IntelligentSelectionResponse,
  SelectionCandidate,
  SelectionContext,
  SelectionScope,
  SelectionPreferences,
  SelectionOptimizationConfig,
  SelectionType,
  SelectionMetadata,
  MatchType
} from '../types/intelligent-selection';
import {
  SpreadsheetData,
  Range
} from '../types/spreadsheet';
import { RequestAnalysis } from '../types/context';
import { IntelligentAutoSelection } from './IntelligentAutoSelection';
import { SelectionConfidenceEngine } from './SelectionConfidenceEngine';
import { DataRelationshipAnalyzer } from './DataRelationshipAnalyzer';
import { v4 as uuidv4 } from 'uuid';

export interface ServiceOptions {
  enableRelationshipAnalysis: boolean;
  enableConfidenceExplanations: boolean;
  enableSemanticAnalysis: boolean;
  optimizationConfig: Partial<SelectionOptimizationConfig>;
}

export class IntelligentAutoSelectionService {
  private static readonly DEFAULT_OPTIONS: ServiceOptions = {
    enableRelationshipAnalysis: true,
    enableConfidenceExplanations: true,
    enableSemanticAnalysis: true,
    optimizationConfig: {
      maxCandidates: 10,
      minConfidence: 0.3,
      fuzzyThreshold: 0.7,
      expansionRadius: 3,
      weightings: {
        exactMatch: 0.25,
        fuzzyMatch: 0.15,
        entityConfidence: 0.20,
        columnRelevance: 0.15,
        dataQuality: 0.10,
        relationshipStrength: 0.10,
        userPreference: 0.05
      },
      constraints: {
        maxCellCount: 100000,
        maxRowCount: 10000,
        maxColumnCount: 100,
        minDataQuality: 0.3,
        requireHeaders: false,
        excludeEmptyColumns: true,
        respectFormulaBoundaries: true
      }
    }
  };

  /**
   * Process intelligent auto-selection request
   */
  public static async processSelectionRequest(
    request: IntelligentSelectionRequest,
    spreadsheetData: SpreadsheetData,
    options: Partial<ServiceOptions> = {}
  ): Promise<IntelligentSelectionResponse> {
    const serviceOptions = { ...this.DEFAULT_OPTIONS, ...options };
    
    // Build selection context
    const context = this.buildSelectionContext(request, serviceOptions);
    
    // Analyze data relationships if enabled
    const relationshipMap = serviceOptions.enableRelationshipAnalysis
      ? (await DataRelationshipAnalyzer.analyzeRelationships(
          spreadsheetData,
          request.sheetName,
          {
            includeSemanticAnalysis: serviceOptions.enableSemanticAnalysis,
            includeCrossReferences: true,
            includeHierarchyDetection: true,
            confidenceThreshold: serviceOptions.optimizationConfig.minConfidence || 0.3,
            maxDepth: 5
          }
        )).relationshipMap
      : {
          columnDependencies: [],
          dataHierarchies: [],
          calculatedFields: [],
          crossReferences: [],
          semanticRelationships: []
        };

    // Find initial selection candidates
    const initialCandidates = await IntelligentAutoSelection.findRelevantData(
      spreadsheetData,
      context,
      request.sheetName
    );

    // Enhance candidates with metadata
    const enhancedCandidates = this.enhanceCandidatesWithMetadata(
      initialCandidates,
      spreadsheetData,
      context
    );

    // Expand selections based on relationships
    const expandedCandidates = this.expandCandidatesWithRelationships(
      enhancedCandidates,
      spreadsheetData,
      context,
      relationshipMap
    );

    // Rank candidates using confidence engine
    const rankingResult = serviceOptions.enableConfidenceExplanations
      ? SelectionConfidenceEngine.rankCandidates(
          expandedCandidates,
          context,
          spreadsheetData,
          relationshipMap,
          {
            includeDataQuality: true,
            includeRelationships: serviceOptions.enableRelationshipAnalysis,
            includeUserHistory: false,
            weightings: serviceOptions.optimizationConfig.weightings || {},
            explainReasoning: true
          }
        )
      : {
          rankedCandidates: expandedCandidates.sort((a, b) => b.confidence - a.confidence),
          confidenceBreakdowns: new Map(),
          explanations: new Map(),
          recommendations: []
        };

    // Apply constraints and optimization
    const optimizedCandidates = this.applyOptimizationConstraints(
      rankingResult.rankedCandidates,
      serviceOptions.optimizationConfig
    );

    // Select recommended candidate
    const recommendedSelection = optimizedCandidates.length > 0 ? optimizedCandidates[0] : null;

    // Generate alternatives
    const alternatives = this.generateAlternatives(optimizedCandidates, context);

    // Calculate overall confidence
    const overallConfidence = this.calculateOverallConfidence(
      optimizedCandidates,
      relationshipMap,
      context
    );

    // Generate explanation
    const explanation = this.generateResponseExplanation(
      recommendedSelection,
      optimizedCandidates,
      relationshipMap,
      context
    );

    return {
      candidates: optimizedCandidates,
      recommendedSelection,
      relationshipMap,
      confidence: overallConfidence,
      explanation,
      alternatives
    };
  }

  /**
   * Expand selection based on relationships and context
   */
  public static async expandSelection(
    baseRange: Range,
    spreadsheetData: SpreadsheetData,
    context: SelectionContext,
    options: Partial<ServiceOptions> = {}
  ): Promise<SelectionCandidate> {
    const serviceOptions = { ...this.DEFAULT_OPTIONS, ...options };
    
    // Create a candidate from the base range
    const baseCandidate: SelectionCandidate = {
      id: uuidv4(),
      range: baseRange,
      confidence: 0.8,
      explanation: 'Base selection for expansion',
      matchType: MatchType.EXACT,
      relevantColumns: [],
      relatedSelections: [],
      entityMatches: [],
      score: 0.8,
      selectionType: SelectionType.DATA_RANGE,
      metadata: {
        cellCount: (baseRange.endRow - baseRange.startRow + 1) * (baseRange.endCol - baseRange.startCol + 1),
        dataQuality: 0.8,
        completeness: 0.8,
        hasFormulas: false,
        hasHeaders: false,
        estimatedProcessingTime: 100
      }
    };

    // Analyze relationships
    const relationshipMap = serviceOptions.enableRelationshipAnalysis
      ? (await DataRelationshipAnalyzer.analyzeRelationships(
          spreadsheetData,
          baseRange.sheetName,
          {
            includeSemanticAnalysis: serviceOptions.enableSemanticAnalysis,
            includeCrossReferences: true,
            includeHierarchyDetection: true,
            confidenceThreshold: serviceOptions.optimizationConfig.minConfidence || 0.3,
            maxDepth: 5
          }
        )).relationshipMap
      : {
          columnDependencies: [],
          dataHierarchies: [],
          calculatedFields: [],
          crossReferences: [],
          semanticRelationships: []
        };

    // Expand the selection
    const expandedCandidate = IntelligentAutoSelection.expandSelection(
      baseCandidate,
      spreadsheetData,
      context
    );

    return expandedCandidate;
  }

  /**
   * Optimize selection candidates based on multi-criteria
   */
  public static optimizeSelectionCandidates(
    candidates: SelectionCandidate[],
    context: SelectionContext,
    optimizationConfig: Partial<SelectionOptimizationConfig> = {}
  ): SelectionCandidate[] {
    const config = { ...this.DEFAULT_OPTIONS.optimizationConfig, ...optimizationConfig };
    
    // Apply constraints
    let optimizedCandidates = this.applyOptimizationConstraints(candidates, config);
    
    // Apply multi-criteria optimization
    optimizedCandidates = this.applyMultiCriteriaOptimization(optimizedCandidates, context, config);
    
    // Limit to max candidates
    return optimizedCandidates.slice(0, config.maxCandidates || 10);
  }

  /**
   * Build selection context from request
   */
  private static buildSelectionContext(
    request: IntelligentSelectionRequest,
    options: ServiceOptions
  ): SelectionContext {
    // Set default scope if not provided
    const defaultScope: SelectionScope = {
      includeHeaders: true,
      expandToRelated: true,
      confidenceThreshold: options.optimizationConfig.minConfidence || 0.3,
      respectDataBoundaries: true,
      includeCalculatedFields: true
    };

    // Set default preferences if not provided
    const defaultPreferences: SelectionPreferences = {
      prioritizeExactMatches: true,
      includeCalculatedFields: true,
      expandToDependencies: true,
      respectDataBoundaries: true,
      preferLargerSelections: false,
      optimizeForAnalysis: true,
      includeContextualData: true
    };

    return {
      query: request.query,
      intent: request.intent,
      entities: request.entities,
      scope: { ...defaultScope, ...request.scope },
      preferences: { ...defaultPreferences, ...request.preferences }
    };
  }

  /**
   * Enhance candidates with comprehensive metadata
   */
  private static enhanceCandidatesWithMetadata(
    candidates: SelectionCandidate[],
    spreadsheetData: SpreadsheetData,
    context: SelectionContext
  ): SelectionCandidate[] {
    return candidates.map(candidate => {
      const metadata = this.calculateSelectionMetadata(candidate, spreadsheetData, context);
      
      return {
        ...candidate,
        id: candidate.id || uuidv4(),
        metadata
      };
    });
  }

  /**
   * Calculate comprehensive metadata for a selection candidate
   */
  private static calculateSelectionMetadata(
    candidate: SelectionCandidate,
    spreadsheetData: SpreadsheetData,
    context: SelectionContext
  ): SelectionMetadata {
    const range = candidate.range;
    const cellCount = (range.endRow - range.startRow + 1) * (range.endCol - range.startCol + 1);
    
    // Find the sheet
    const sheet = spreadsheetData.sheets.find(s => s.name === range.sheetName);
    
    let dataQuality = 0.8; // Default
    let completeness = 0.8; // Default
    let hasFormulas = false;
    let hasHeaders = false;
    
    if (sheet) {
      // Calculate data quality metrics
      const qualityMetrics = this.calculateDataQualityMetrics(sheet, range);
      dataQuality = qualityMetrics.quality;
      completeness = qualityMetrics.completeness;
      
      // Check for formulas
      hasFormulas = this.hasFormulasInRange(sheet, range, spreadsheetData.formulas);
      
      // Check for headers
      hasHeaders = this.hasHeadersInRange(sheet, range);
    }
    
    // Estimate processing time based on cell count and complexity
    const estimatedProcessingTime = this.estimateProcessingTime(cellCount, hasFormulas);
    
    return {
      cellCount,
      dataQuality,
      completeness,
      hasFormulas,
      hasHeaders,
      estimatedProcessingTime
    };
  }

  /**
   * Expand candidates based on relationship analysis
   */
  private static expandCandidatesWithRelationships(
    candidates: SelectionCandidate[],
    spreadsheetData: SpreadsheetData,
    context: SelectionContext,
    relationshipMap: any
  ): SelectionCandidate[] {
    if (!context.preferences.expandToDependencies) {
      return candidates;
    }

    return candidates.map(candidate => {
      // Only expand if confidence is high enough and user preferences allow it
      if (candidate.confidence >= 0.7 && context.scope.expandToRelated) {
        return IntelligentAutoSelection.expandSelection(candidate, spreadsheetData, context);
      }
      return candidate;
    });
  }

  /**
   * Apply optimization constraints to filter candidates
   */
  private static applyOptimizationConstraints(
    candidates: SelectionCandidate[],
    config: Partial<SelectionOptimizationConfig>
  ): SelectionCandidate[] {
    const constraints = config.constraints;
    if (!constraints) return candidates;

    return candidates.filter(candidate => {
      // Check cell count constraint
      if (constraints.maxCellCount && candidate.metadata.cellCount > constraints.maxCellCount) {
        return false;
      }

      // Check row count constraint
      const rowCount = candidate.range.endRow - candidate.range.startRow + 1;
      if (constraints.maxRowCount && rowCount > constraints.maxRowCount) {
        return false;
      }

      // Check column count constraint
      const colCount = candidate.range.endCol - candidate.range.startCol + 1;
      if (constraints.maxColumnCount && colCount > constraints.maxColumnCount) {
        return false;
      }

      // Check data quality constraint
      if (constraints.minDataQuality && candidate.metadata.dataQuality < constraints.minDataQuality) {
        return false;
      }

      // Check headers requirement
      if (constraints.requireHeaders && !candidate.metadata.hasHeaders) {
        return false;
      }

      return true;
    });
  }

  /**
   * Apply multi-criteria optimization algorithm
   */
  private static applyMultiCriteriaOptimization(
    candidates: SelectionCandidate[],
    context: SelectionContext,
    config: Partial<SelectionOptimizationConfig>
  ): SelectionCandidate[] {
    const weightings = config.weightings;
    if (!weightings) return candidates;

    // Calculate multi-criteria scores
    return candidates
      .map(candidate => ({
        ...candidate,
        score: this.calculateMultiCriteriaScore(candidate, context, weightings)
      }))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate multi-criteria optimization score
   */
  private static calculateMultiCriteriaScore(
    candidate: SelectionCandidate,
    context: SelectionContext,
    weightings: any
  ): number {
    let score = 0;

    // Entity matching score
    const entityScore = candidate.entityMatches.length > 0
      ? candidate.entityMatches.reduce((sum, match) => sum + match.confidence, 0) / candidate.entityMatches.length
      : 0.3;
    score += entityScore * (weightings.exactMatch + weightings.fuzzyMatch + weightings.entityConfidence);

    // Column relevance score
    const columnScore = candidate.relevantColumns.length > 0
      ? candidate.relevantColumns.reduce((sum, col) => sum + col.relevanceScore, 0) / candidate.relevantColumns.length
      : 0.5;
    score += columnScore * weightings.columnRelevance;

    // Data quality score
    score += candidate.metadata.dataQuality * weightings.dataQuality;

    // User preference adjustments
    if (context.preferences.preferLargerSelections && candidate.metadata.cellCount > 1000) {
      score += 0.1 * weightings.userPreference;
    }

    if (context.preferences.optimizeForAnalysis && candidate.selectionType === 'data_range') {
      score += 0.1 * weightings.userPreference;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Generate alternative selections
   */
  private static generateAlternatives(
    candidates: SelectionCandidate[],
    context: SelectionContext
  ): any[] {
    const alternatives = [];
    
    // Take top 3 alternatives (excluding the recommended one)
    const alternateCandidates = candidates.slice(1, 4);
    
    alternateCandidates.forEach(candidate => {
      alternatives.push({
        candidate,
        reason: this.generateAlternativeReason(candidate, candidates[0], context),
        useCase: this.generateAlternativeUseCase(candidate, context)
      });
    });

    return alternatives;
  }

  /**
   * Calculate overall confidence for the response
   */
  private static calculateOverallConfidence(
    candidates: SelectionCandidate[],
    relationshipMap: any,
    context: SelectionContext
  ): number {
    if (candidates.length === 0) return 0;

    const topCandidate = candidates[0];
    let confidence = topCandidate.confidence;

    // Boost confidence if we have strong relationships
    const strongRelationships = relationshipMap.columnDependencies?.filter((d: any) => d.strength > 0.7).length || 0;
    if (strongRelationships > 0) {
      confidence += Math.min(0.1, strongRelationships * 0.02);
    }

    // Boost confidence for multiple good candidates
    const goodCandidates = candidates.filter(c => c.confidence > 0.6).length;
    if (goodCandidates > 1) {
      confidence += Math.min(0.05, (goodCandidates - 1) * 0.01);
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Generate comprehensive response explanation
   */
  private static generateResponseExplanation(
    recommendedSelection: SelectionCandidate | null,
    candidates: SelectionCandidate[],
    relationshipMap: any,
    context: SelectionContext
  ): string {
    if (!recommendedSelection) {
      return 'No suitable selections found for the given query. Consider refining your search terms or checking data quality.';
    }

    const entityCount = recommendedSelection.entityMatches.length;
    const cellCount = recommendedSelection.metadata.cellCount;
    const confidencePercent = (recommendedSelection.confidence * 100).toFixed(1);
    
    let explanation = `Selected ${cellCount} cells with ${confidencePercent}% confidence`;
    
    if (entityCount > 0) {
      explanation += ` based on ${entityCount} entity match(es)`;
    }
    
    if (recommendedSelection.relatedSelections.length > 0) {
      explanation += ` and ${recommendedSelection.relatedSelections.length} related data range(s)`;
    }
    
    explanation += `. ${candidates.length - 1} alternative selection(s) available.`;
    
    return explanation;
  }

  // Helper methods
  private static calculateDataQualityMetrics(sheet: any, range: Range): { quality: number; completeness: number } {
    // Simplified data quality calculation
    // In a full implementation, this would analyze missing values, consistency, etc.
    return { quality: 0.8, completeness: 0.85 };
  }

  private static hasFormulasInRange(sheet: any, range: Range, formulas: any[]): boolean {
    return formulas.some(formula => {
      if (formula.sheet !== sheet.name) return false;
      
      // Simple check if formula is in range
      // In a full implementation, this would parse cell addresses properly
      return true; // Simplified
    });
  }

  private static hasHeadersInRange(sheet: any, range: Range): boolean {
    // Check if the first row of the range contains text (likely headers)
    if (range.startRow >= sheet.data.length) return false;
    
    const firstRow = sheet.data[range.startRow];
    if (!firstRow) return false;
    
    let textCells = 0;
    for (let col = range.startCol; col <= range.endCol && col < firstRow.length; col++) {
      const cell = firstRow[col];
      if (cell && cell.dataType === 'text') {
        textCells++;
      }
    }
    
    const totalCells = Math.min(range.endCol - range.startCol + 1, firstRow.length - range.startCol);
    return totalCells > 0 && textCells / totalCells > 0.5;
  }

  private static estimateProcessingTime(cellCount: number, hasFormulas: boolean): number {
    let baseTime = cellCount * 0.01; // 0.01ms per cell
    
    if (hasFormulas) {
      baseTime *= 2; // Double time for formulas
    }
    
    return Math.max(10, Math.min(5000, baseTime)); // Between 10ms and 5s
  }

  private static generateAlternativeReason(
    alternative: SelectionCandidate,
    primary: SelectionCandidate,
    context: SelectionContext
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

  private static generateAlternativeUseCase(
    candidate: SelectionCandidate,
    context: SelectionContext
  ): string {
    switch (candidate.selectionType) {
      case 'row_based':
        return 'Best for data manipulation and record-level operations';
      case 'column_based':
        return 'Ideal for statistical analysis and column-level operations';
      case 'data_range':
        return 'Suitable for comprehensive data analysis and reporting';
      case 'formula_range':
        return 'Optimized for formula analysis and calculation review';
      default:
        return 'General-purpose selection for various analysis tasks';
    }
  }
}