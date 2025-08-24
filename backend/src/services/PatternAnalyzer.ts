/**
 * PatternAnalyzer - AI-powered pattern analysis for spreadsheet data
 * 
 * This service uses OpenAI API to identify complex patterns, trends, anomalies,
 * and relationships in spreadsheet data, providing actionable insights and suggestions.
 */

import {
  ContextData,
  PatternInsights,
  DataPattern,
  Relationship,
  Anomaly,
  Insight,
  ImmediateContext
} from '../types/context';
import { Cell, DataType } from '../types/spreadsheet';
import { OpenAIService } from './OpenAIService';

export interface PatternAnalysisOptions {
  includeStatistics?: boolean;
  maxSampleSize?: number;
  confidenceThreshold?: number;
  enableAIAnalysis?: boolean;
}

export interface TrendAnalysis {
  direction: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  strength: number;
  confidence: number;
  description: string;
}

export interface CorrelationAnalysis {
  coefficient: number;
  significance: 'strong' | 'moderate' | 'weak' | 'none';
  description: string;
}

export class PatternAnalyzer {
  private openAIService: OpenAIService | undefined;
  private static readonly DEFAULT_CONFIDENCE_THRESHOLD = 0.7;
  private static readonly DEFAULT_MAX_SAMPLE_SIZE = 1000;

  constructor(openAIService?: OpenAIService) {
    this.openAIService = openAIService;
  }

  /**
   * Analyzes patterns in context data using AI and rule-based methods
   */
  async analyzePatterns(
    contextData: ContextData,
    options: PatternAnalysisOptions = {}
  ): Promise<PatternInsights> {
    const opts = {
      includeStatistics: true,
      maxSampleSize: PatternAnalyzer.DEFAULT_MAX_SAMPLE_SIZE,
      confidenceThreshold: PatternAnalyzer.DEFAULT_CONFIDENCE_THRESHOLD,
      enableAIAnalysis: true,
      ...options
    };

    // Try AI-powered analysis first if available and enabled
    if (opts.enableAIAnalysis && this.openAIService) {
      try {
        const isAvailable = await this.openAIService.isAvailable();
        if (isAvailable) {
          const aiResult = await this.performAIAnalysis(contextData, opts);
          // Enhance AI results with rule-based analysis
          const enhancedResult = await this.enhanceWithRuleBasedAnalysis(aiResult, contextData, opts);
          return enhancedResult;
        }
      } catch (error) {
        console.warn('AI pattern analysis failed, falling back to rule-based:', error);
      }
    }

    // Fallback to rule-based analysis
    return this.performRuleBasedAnalysis(contextData, opts);
  }

  /**
   * Performs AI-powered pattern analysis using OpenAI
   */
  private async performAIAnalysis(
    contextData: ContextData,
    _options: PatternAnalysisOptions
  ): Promise<PatternInsights> {
    if (!this.openAIService) {
      throw new Error('OpenAI service not available');
    }

    try {
      const aiResult = await this.openAIService.analyzePatterns(contextData);
      
      // Convert AI result to our PatternInsights format
      return {
        dataPatterns: aiResult.patterns.map(p => ({
          type: p.type as any,
          description: p.description,
          confidence: 0.8,
          affectedRange: contextData.immediate.selectionInfo.range,
          severity: this.determineSeverity(0.8)
        })),
        relationships: aiResult.relationships,
        anomalies: aiResult.anomalies.map(a => ({
          type: a.type as any,
          cellAddress: a.cellAddress || 'A1',
          description: a.description,
          severity: a.severity,
          suggestedFix: this.generateSuggestedFix(a)
        })),
        insights: aiResult.insights.map(i => ({
          type: 'suggestion' as const,
          title: this.generateInsightTitle(i.type, i.description),
          description: i.description,
          actionable: true,
          priority: i.priority,
          suggestedActions: this.generateSuggestedActions(i)
        })),
        confidence: aiResult.confidence
      };
    } catch (error) {
      console.error('AI pattern analysis error:', error);
      throw error;
    }
  }

  /**
   * Performs rule-based pattern analysis as fallback
   */
  private async performRuleBasedAnalysis(
    contextData: ContextData,
    _options: PatternAnalysisOptions
  ): Promise<PatternInsights> {
    const patterns: DataPattern[] = [];
    const relationships: Relationship[] = [];
    const anomalies: Anomaly[] = [];
    const insights: Insight[] = [];

    // Analyze data patterns
    const dataPatterns = this.analyzeDataPatterns(contextData.immediate, _options);
    patterns.push(...dataPatterns);

    // Analyze relationships between columns
    const columnRelationships = this.analyzeColumnRelationships(contextData.immediate, _options);
    relationships.push(...columnRelationships);

    // Detect anomalies
    const detectedAnomalies = this.detectAnomalies(contextData.immediate, _options);
    anomalies.push(...detectedAnomalies);

    // Generate insights
    const generatedInsights = this.generateInsights(patterns, relationships, anomalies, contextData);
    insights.push(...generatedInsights);

    return {
      dataPatterns: patterns,
      relationships,
      anomalies,
      insights,
      confidence: this.calculateOverallConfidence(patterns, relationships, anomalies)
    };
  }

  /**
   * Enhances AI results with additional rule-based analysis
   */
  private async enhanceWithRuleBasedAnalysis(
    aiResult: PatternInsights,
    contextData: ContextData,
    _options: PatternAnalysisOptions
  ): Promise<PatternInsights> {
    // Add rule-based patterns that AI might have missed
    const additionalPatterns = this.analyzeDataPatterns(contextData.immediate, _options);
    const additionalAnomalies = this.detectAnomalies(contextData.immediate, _options);

    // Merge results, avoiding duplicates
    const mergedPatterns = [...aiResult.dataPatterns];
    additionalPatterns.forEach(pattern => {
      if (!mergedPatterns.some(p => p.type === pattern.type && p.affectedRange === pattern.affectedRange)) {
        mergedPatterns.push(pattern);
      }
    });

    const mergedAnomalies = [...aiResult.anomalies];
    additionalAnomalies.forEach(anomaly => {
      if (!mergedAnomalies.some(a => a.cellAddress === anomaly.cellAddress && a.type === anomaly.type)) {
        mergedAnomalies.push(anomaly);
      }
    });

    return {
      ...aiResult,
      dataPatterns: mergedPatterns,
      anomalies: mergedAnomalies,
      confidence: Math.max(aiResult.confidence, 0.8) // Boost confidence with rule-based enhancement
    };
  }

  /**
   * Analyzes data patterns using rule-based methods
   */
  private analyzeDataPatterns(
    immediate: ImmediateContext,
    _options: PatternAnalysisOptions
  ): DataPattern[] {
    const patterns: DataPattern[] = [];
    const selectedData = immediate.selectedData;

    if (selectedData.length === 0) return patterns;

    // Detect missing data pattern
    const missingDataPattern = this.detectMissingDataPattern(selectedData, immediate.selectionInfo.range);
    if (missingDataPattern) patterns.push(missingDataPattern);

    // Detect numeric trends
    const trendPatterns = this.detectTrendPatterns(selectedData, immediate.selectionInfo.range);
    patterns.push(...trendPatterns);

    // Detect duplicate data
    const duplicatePattern = this.detectDuplicatePattern(selectedData, immediate.selectionInfo.range);
    if (duplicatePattern) patterns.push(duplicatePattern);

    // Detect data type inconsistencies
    const typeInconsistencyPattern = this.detectTypeInconsistencyPattern(selectedData, immediate.selectionInfo.range);
    if (typeInconsistencyPattern) patterns.push(typeInconsistencyPattern);

    return patterns;
  }

  /**
   * Analyzes relationships between columns
   */
  private analyzeColumnRelationships(
    immediate: ImmediateContext,
    _options: PatternAnalysisOptions
  ): Relationship[] {
    const relationships: Relationship[] = [];
    const selectedData = immediate.selectedData;

    if (selectedData.length < 2 || !selectedData[0] || selectedData[0].length < 2) return relationships;

    // Analyze correlations between numeric columns
    const numericColumns = this.extractNumericColumns(selectedData);
    if (numericColumns.length >= 2) {
      const correlations = this.calculateCorrelations(numericColumns);
      relationships.push(...correlations);
    }

    // Detect hierarchical relationships
    const hierarchicalRels = this.detectHierarchicalRelationships(selectedData);
    relationships.push(...hierarchicalRels);

    return relationships;
  }

  /**
   * Detects anomalies in the data
   */
  private detectAnomalies(
    immediate: ImmediateContext,
    _options: PatternAnalysisOptions
  ): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const selectedData = immediate.selectedData;

    // Detect outliers in numeric data
    const outliers = this.detectOutliers(selectedData);
    anomalies.push(...outliers);

    // Detect formatting inconsistencies
    const formatInconsistencies = this.detectFormatInconsistencies(selectedData);
    anomalies.push(...formatInconsistencies);

    // Detect formula errors
    const formulaErrors = this.detectFormulaErrors(immediate.currentFormulas);
    anomalies.push(...formulaErrors);

    return anomalies;
  }

  /**
   * Generates actionable insights based on patterns and anomalies
   */
  private generateInsights(
    patterns: DataPattern[],
    relationships: Relationship[],
    anomalies: Anomaly[],
    contextData: ContextData
  ): Insight[] {
    const insights: Insight[] = [];

    // Generate insights from patterns
    patterns.forEach(pattern => {
      const insight = this.generatePatternInsight(pattern, contextData);
      if (insight) insights.push(insight);
    });

    // Generate insights from relationships
    relationships.forEach(relationship => {
      const insight = this.generateRelationshipInsight(relationship, contextData);
      if (insight) insights.push(insight);
    });

    // Generate insights from anomalies
    anomalies.forEach(anomaly => {
      const insight = this.generateAnomalyInsight(anomaly, contextData);
      if (insight) insights.push(insight);
    });

    // Generate optimization suggestions
    const optimizationInsights = this.generateOptimizationInsights(contextData);
    insights.push(...optimizationInsights);

    return insights;
  }

  // Helper methods for pattern detection

  private detectMissingDataPattern(data: Cell[][], range: string): DataPattern | null {
    const totalCells = data.flat().length;
    const emptyCells = data.flat().filter(cell => cell.dataType === DataType.EMPTY).length;
    const missingPercentage = emptyCells / totalCells;

    if (missingPercentage > 0.1) { // More than 10% missing
      return {
        type: 'missing_data',
        description: `${Math.round(missingPercentage * 100)}% of cells are empty (${emptyCells}/${totalCells})`,
        confidence: 0.95,
        affectedRange: range,
        severity: missingPercentage > 0.3 ? 'high' : missingPercentage > 0.2 ? 'medium' : 'low'
      };
    }

    return null;
  }

  private detectTrendPatterns(data: Cell[][], range: string): DataPattern[] {
    const patterns: DataPattern[] = [];
    
    // Analyze each column for trends
    if (data.length > 2 && data[0]) {
      for (let col = 0; col < data[0].length; col++) {
        const columnData = data.map(row => row[col]).filter(cell => 
          cell && cell.dataType === DataType.NUMBER && typeof cell.value === 'number'
        );

        if (columnData.length > 2) {
          const trend = this.analyzeTrend(columnData.map(cell => cell!.value as number));
          if (trend.confidence > 0.7) {
            patterns.push({
              type: 'trend',
              description: `Column ${this.indexToColumnLetter(col)} shows ${trend.direction} trend (${trend.description})`,
              confidence: trend.confidence,
              affectedRange: range,
              severity: trend.strength > 0.8 ? 'high' : trend.strength > 0.5 ? 'medium' : 'low'
            });
          }
        }
      }
    }

    return patterns;
  }

  private detectDuplicatePattern(data: Cell[][], range: string): DataPattern | null {
    const values = data.flat().map(cell => cell.value);
    const uniqueValues = new Set(values);
    const duplicateCount = values.length - uniqueValues.size;

    if (duplicateCount > 0) {
      const duplicatePercentage = duplicateCount / values.length;
      return {
        type: 'duplicate',
        description: `Found ${duplicateCount} duplicate values (${Math.round(duplicatePercentage * 100)}%)`,
        confidence: 0.9,
        affectedRange: range,
        severity: duplicatePercentage > 0.2 ? 'high' : duplicatePercentage > 0.1 ? 'medium' : 'low'
      };
    }

    return null;
  }

  private detectTypeInconsistencyPattern(data: Cell[][], range: string): DataPattern | null {
    // Check each column for type consistency
    if (!data[0]) return null;
    
    for (let col = 0; col < data[0].length; col++) {
      const columnData = data.map(row => row[col]).filter(cell => cell && cell.dataType !== DataType.EMPTY);
      const types = new Set(columnData.map(cell => cell!.dataType));
      
      if (types.size > 1) {
        return {
          type: 'outlier',
          description: `Column ${this.indexToColumnLetter(col)} contains mixed data types: ${Array.from(types).join(', ')}`,
          confidence: 0.85,
          affectedRange: range,
          severity: 'medium'
        };
      }
    }

    return null;
  }

  private extractNumericColumns(data: Cell[][]): number[][] {
    const numericColumns: number[][] = [];
    
    if (!data[0]) return numericColumns;
    
    for (let col = 0; col < data[0].length; col++) {
      const columnValues = data
        .map(row => row[col])
        .filter(cell => cell && cell.dataType === DataType.NUMBER && typeof cell.value === 'number')
        .map(cell => cell!.value as number);
      
      if (columnValues.length > 2) {
        numericColumns.push(columnValues);
      }
    }

    return numericColumns;
  }

  private calculateCorrelations(numericColumns: number[][]): Relationship[] {
    const relationships: Relationship[] = [];
    
    for (let i = 0; i < numericColumns.length; i++) {
      for (let j = i + 1; j < numericColumns.length; j++) {
        const col1 = numericColumns[i];
        const col2 = numericColumns[j];
        if (col1 && col2) {
          const correlation = this.calculateCorrelation(col1, col2);
          if (Math.abs(correlation.coefficient) > 0.5) {
            relationships.push({
              type: 'correlation',
              source: this.indexToColumnLetter(i),
              target: this.indexToColumnLetter(j),
              strength: Math.abs(correlation.coefficient),
              description: correlation.description
            });
          }
        }
      }
    }

    return relationships;
  }

  private detectHierarchicalRelationships(_data: Cell[][]): Relationship[] {
    // Simple heuristic: if one column's values are subsets of another
    const relationships: Relationship[] = [];
    
    // This is a simplified implementation
    // In practice, you'd want more sophisticated hierarchy detection
    
    return relationships;
  }

  private detectOutliers(data: Cell[][]): Anomaly[] {
    const anomalies: Anomaly[] = [];
    
    // Detect outliers in numeric columns using IQR method
    if (data[0]) {
      for (let col = 0; col < data[0].length; col++) {
        const numericCells = data.map((row, rowIndex) => ({ cell: row[col], rowIndex }))
          .filter(item => item.cell && item.cell.dataType === DataType.NUMBER && typeof item.cell.value === 'number');
        
        if (numericCells.length > 4) {
          const values = numericCells.map(item => item.cell!.value as number);
          const outlierIndices = this.findOutliersIQR(values);
          
          outlierIndices.forEach(index => {
            const numericCell = numericCells[index];
            if (numericCell) {
              const originalRowIndex = numericCell.rowIndex;
              anomalies.push({
                type: 'outlier',
                cellAddress: `${this.indexToColumnLetter(col)}${originalRowIndex + 1}`,
                description: `Value ${values[index]} is an outlier in this column`,
                severity: 'medium',
                suggestedFix: 'Review this value for accuracy'
              });
            }
          });
        }
      }
    }

    return anomalies;
  }

  private detectFormatInconsistencies(data: Cell[][]): Anomaly[] {
    const anomalies: Anomaly[] = [];
    
    // Check for formatting inconsistencies within columns
    if (data[0]) {
      for (let col = 0; col < data[0].length; col++) {
        const columnCells = data.map((row, rowIndex) => ({ cell: row[col], rowIndex }))
          .filter(item => item.cell && item.cell.dataType !== DataType.EMPTY);
        
        if (columnCells.length > 1) {
          // Check for date format inconsistencies
          const dateCells = columnCells.filter(item => item.cell && item.cell.dataType === DataType.DATE);
          if (dateCells.length > 1) {
            // Simple check for different date formats (would need more sophisticated implementation)
            const formats = new Set(dateCells.map(item => this.inferDateFormat(item.cell!.value)));
            if (formats.size > 1) {
              anomalies.push({
                type: 'inconsistent_format',
                cellAddress: `${this.indexToColumnLetter(col)}1`,
                description: `Inconsistent date formats detected in column ${this.indexToColumnLetter(col)}`,
                severity: 'low',
                suggestedFix: 'Standardize date formats in this column'
              });
            }
          }
        }
      }
    }

    return anomalies;
  }

  private detectFormulaErrors(formulas: any[]): Anomaly[] {
    const anomalies: Anomaly[] = [];
    
    formulas.forEach(formula => {
      // Check for common formula errors
      if (formula.formula.includes('#REF!') || formula.formula.includes('#NAME?') || 
          formula.formula.includes('#VALUE!') || formula.formula.includes('#DIV/0!') ||
          formula.formula.includes('INVALID_FUNCTION') || formula.formula.includes('/0')) {
        anomalies.push({
          type: 'inconsistent_format',
          cellAddress: formula.cell,
          description: `Formula error detected: ${formula.formula}`,
          severity: 'high',
          suggestedFix: 'Fix the formula reference or calculation'
        });
      }
    });

    return anomalies;
  }

  // Insight generation methods

  private generatePatternInsight(pattern: DataPattern, _contextData: ContextData): Insight | null {
    switch (pattern.type) {
      case 'missing_data':
        return {
          type: 'warning',
          title: 'Missing Data Detected',
          description: pattern.description,
          actionable: true,
          priority: pattern.severity === 'high' ? 'high' : 'medium',
          suggestedActions: [
            'Fill missing values with appropriate defaults',
            'Remove rows with missing data if appropriate',
            'Investigate why data is missing'
          ]
        };
      
      case 'trend':
        return {
          type: 'suggestion',
          title: 'Data Trend Identified',
          description: pattern.description,
          actionable: true,
          priority: 'medium',
          suggestedActions: [
            'Consider forecasting based on this trend',
            'Add trend line visualization',
            'Analyze factors driving this trend'
          ]
        };
      
      default:
        return null;
    }
  }

  private generateRelationshipInsight(relationship: Relationship, _contextData: ContextData): Insight | null {
    if (relationship.type === 'correlation' && relationship.strength > 0.7) {
      return {
        type: 'suggestion',
        title: 'Strong Correlation Found',
        description: relationship.description,
        actionable: true,
        priority: 'medium',
        suggestedActions: [
          'Investigate causal relationship',
          'Use for predictive modeling',
          'Create scatter plot visualization'
        ]
      };
    }
    
    return null;
  }

  private generateAnomalyInsight(anomaly: Anomaly, _contextData: ContextData): Insight | null {
    return {
      type: 'warning',
      title: 'Data Anomaly Detected',
      description: anomaly.description,
      actionable: true,
      priority: anomaly.severity === 'high' ? 'high' : 'medium',
      suggestedActions: anomaly.suggestedFix ? [anomaly.suggestedFix] : ['Review and correct if necessary']
    };
  }

  private generateOptimizationInsights(contextData: ContextData): Insight[] {
    const insights: Insight[] = [];
    
    // Suggest formula optimizations
    if (contextData.immediate.currentFormulas.length > 0) {
      insights.push({
        type: 'optimization',
        title: 'Formula Optimization Opportunity',
        description: 'Consider optimizing formulas for better performance',
        actionable: true,
        priority: 'low',
        suggestedActions: [
          'Replace volatile functions where possible',
          'Use structured references for better maintainability',
          'Consider array formulas for bulk calculations'
        ]
      });
    }

    return insights;
  }

  // Utility methods

  private analyzeTrend(values: number[]): TrendAnalysis {
    if (values.length < 3) {
      return { direction: 'stable', strength: 0, confidence: 0, description: 'Insufficient data' };
    }

    // Simple linear regression to detect trend
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * (values[i] || 0), 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const yMean = sumY / n;
    const ssRes = values.reduce((sum, yi, i) => {
      const predicted = slope * i + intercept;
      return sum + Math.pow(yi - predicted, 2);
    }, 0);
    const ssTot = values.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const rSquared = 1 - (ssRes / ssTot);

    let direction: 'increasing' | 'decreasing' | 'stable' | 'volatile';
    if (Math.abs(slope) < 0.01) {
      direction = 'stable';
    } else if (slope > 0) {
      direction = 'increasing';
    } else {
      direction = 'decreasing';
    }

    return {
      direction,
      strength: Math.abs(slope),
      confidence: Math.max(0, rSquared),
      description: `R² = ${rSquared.toFixed(3)}, slope = ${slope.toFixed(3)}`
    };
  }

  private calculateCorrelation(x: number[], y: number[]): CorrelationAnalysis {
    if (x.length !== y.length || x.length < 2) {
      return { coefficient: 0, significance: 'none', description: 'Insufficient data for correlation' };
    }

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * (y[i] || 0), 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

    const coefficient = denominator === 0 ? 0 : numerator / denominator;
    const absCoeff = Math.abs(coefficient);

    let significance: 'strong' | 'moderate' | 'weak' | 'none';
    if (absCoeff > 0.8) significance = 'strong';
    else if (absCoeff > 0.5) significance = 'moderate';
    else if (absCoeff > 0.3) significance = 'weak';
    else significance = 'none';

    return {
      coefficient,
      significance,
      description: `Correlation coefficient: ${coefficient.toFixed(3)} (${significance})`
    };
  }

  private findOutliersIQR(values: number[]): number[] {
    const sorted = [...values].sort((a, b) => a - b);
    const q1Index = Math.floor(sorted.length * 0.25);
    const q3Index = Math.floor(sorted.length * 0.75);
    const q1 = sorted[q1Index] || 0;
    const q3 = sorted[q3Index] || 0;
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    const outlierIndices: number[] = [];
    values.forEach((value, index) => {
      if (value < lowerBound || value > upperBound) {
        outlierIndices.push(index);
      }
    });

    return outlierIndices;
  }

  private indexToColumnLetter(index: number): string {
    let result = '';
    let temp = index;
    
    while (temp >= 0) {
      result = String.fromCharCode('A'.charCodeAt(0) + (temp % 26)) + result;
      temp = Math.floor(temp / 26) - 1;
    }
    
    return result;
  }

  private inferDateFormat(value: any): string {
    // Simple date format inference - would need more sophisticated implementation
    if (typeof value === 'string') {
      if (value.includes('/')) return 'MM/DD/YYYY';
      if (value.includes('-')) return 'YYYY-MM-DD';
    }
    return 'unknown';
  }

  private calculateOverallConfidence(
    patterns: DataPattern[],
    relationships: Relationship[],
    anomalies: Anomaly[]
  ): number {
    if (patterns.length === 0 && relationships.length === 0 && anomalies.length === 0) {
      return 0.3; // Low confidence when no patterns found
    }

    const allConfidences = [
      ...patterns.map(p => p.confidence),
      ...relationships.map(r => r.strength),
      ...anomalies.map(() => 0.8) // Assume moderate confidence for anomalies
    ];

    return allConfidences.reduce((sum, conf) => sum + conf, 0) / allConfidences.length;
  }



  private determineSeverity(strength: number): 'low' | 'medium' | 'high' {
    if (strength > 0.8) return 'high';
    if (strength > 0.5) return 'medium';
    return 'low';
  }

  private generateSuggestedFix(anomaly: any): string {
    switch (anomaly.type) {
      case 'outlier':
        return 'Review this value for accuracy or consider if it represents a valid extreme case';
      case 'missing':
        return 'Fill with appropriate default value or investigate why data is missing';
      case 'inconsistent':
        return 'Standardize format to match the majority of values in this column';
      default:
        return 'Review and correct if necessary';
    }
  }

  private generateInsightTitle(type: string, _description: string): string {
    switch (type) {
      case 'recommendation':
        return 'Recommendation';
      case 'observation':
        return 'Data Observation';
      case 'warning':
        return 'Data Quality Warning';
      default:
        return 'Insight';
    }
  }

  private generateSuggestedActions(insight: any): string[] {
    const actions: string[] = [];
    
    switch (insight.type) {
      case 'recommendation':
        actions.push('Consider implementing this suggestion');
        actions.push('Evaluate impact on existing processes');
        break;
      case 'warning':
        actions.push('Address this issue to improve data quality');
        actions.push('Investigate root cause');
        break;
      default:
        actions.push('Review and take appropriate action');
    }

    return actions;
  }
}

export class PatternAnalysisError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'PatternAnalysisError';
  }
}