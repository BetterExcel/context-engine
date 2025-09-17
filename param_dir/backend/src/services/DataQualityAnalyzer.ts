/**
 * Data Quality Analyzer - Comprehensive data quality assessment and anomaly detection
 * 
 * This service provides:
 * - Multi-dimensional quality assessment (completeness, consistency, accuracy, validity)
 * - Anomaly detection using statistical and rule-based methods
 * - Data profiling and pattern analysis
 * - Quality improvement recommendations
 * - Real-time quality monitoring
 */

import {
  IntelligentSpreadsheetData,
  IntelligentCell,
  QualityAssessment,
  DataQualityIssue,
  QualityRecommendation,
  AnomalyFlag,
  EnhancedDataType,
  ColumnInfo
} from '../types/enhanced-intelligence';
import { Sheet, DataType } from '../types/spreadsheet';

export interface QualityAnalysisOptions {
  enableStatisticalAnalysis?: boolean;
  enablePatternAnalysis?: boolean;
  enableBusinessRuleValidation?: boolean;
  confidenceThreshold?: number;
  outlierSensitivity?: number;
  includeRecommendations?: boolean;
}

export interface QualityProfile {
  columnProfiles: ColumnQualityProfile[];
  overallMetrics: QualityMetrics;
  anomalies: DetectedAnomaly[];
  patterns: QualityPattern[];
  recommendations: QualityRecommendation[];
}

export interface ColumnQualityProfile {
  columnIndex: number;
  columnName?: string;
  dataType: EnhancedDataType;
  qualityScore: number;
  completeness: number;
  consistency: number;
  validity: number;
  uniqueness: number;
  statistics?: ColumnStatistics;
  issues: DataQualityIssue[];
  patterns: string[];
}

export interface QualityMetrics {
  totalCells: number;
  validCells: number;
  emptyCells: number;
  errorCells: number;
  duplicateCells: number;
  inconsistentCells: number;
  outlierCells: number;
}

export interface DetectedAnomaly {
  type: 'statistical' | 'pattern' | 'business_rule' | 'format';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedCells: Array<{ sheet: string; row: number; col: number; value: any }>;
  confidence: number;
  suggestedAction: string;
  impact: string;
}

export interface QualityPattern {
  type: 'missing_data_pattern' | 'duplicate_pattern' | 'format_pattern' | 'value_pattern';
  description: string;
  frequency: number;
  confidence: number;
  examples: string[];
}

export interface ColumnStatistics {
  count: number;
  nullCount: number;
  uniqueCount: number;
  duplicateCount: number;
  minLength?: number;
  maxLength?: number;
  avgLength?: number;
  // Numeric statistics
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  mode?: number;
  stdDev?: number;
  variance?: number;
  quartiles?: [number, number, number];
  outliers?: number[];
  // Text statistics
  commonPatterns?: Array<{ pattern: string; count: number }>;
  encodingIssues?: number;
}

export class DataQualityAnalyzer {
  private static readonly DEFAULT_CONFIDENCE_THRESHOLD = 0.7;
  private static readonly DEFAULT_OUTLIER_SENSITIVITY = 1.5; // IQR multiplier
  private static readonly MIN_SAMPLE_SIZE = 10;

  /**
   * Perform comprehensive data quality analysis
   */
  public static async analyzeQuality(
    data: IntelligentSpreadsheetData,
    options: QualityAnalysisOptions = {}
  ): Promise<QualityProfile> {
    const opts = {
      enableStatisticalAnalysis: true,
      enablePatternAnalysis: true,
      enableBusinessRuleValidation: true,
      confidenceThreshold: this.DEFAULT_CONFIDENCE_THRESHOLD,
      outlierSensitivity: this.DEFAULT_OUTLIER_SENSITIVITY,
      includeRecommendations: true,
      ...options
    };

    const columnProfiles: ColumnQualityProfile[] = [];
    const overallMetrics = this.initializeQualityMetrics();
    const anomalies: DetectedAnomaly[] = [];
    const patterns: QualityPattern[] = [];

    // Analyze each sheet
    for (const sheet of data.sheets) {
      const sheetAnalysis = await this.analyzeSheet(sheet, opts);
      
      // Merge column profiles
      columnProfiles.push(...sheetAnalysis.columnProfiles);
      
      // Aggregate metrics
      this.aggregateMetrics(overallMetrics, sheetAnalysis.metrics);
      
      // Collect anomalies
      anomalies.push(...sheetAnalysis.anomalies);
      
      // Collect patterns
      patterns.push(...sheetAnalysis.patterns);
    }

    // Generate recommendations
    const recommendations = opts.includeRecommendations 
      ? this.generateQualityRecommendations(columnProfiles, anomalies, patterns)
      : [];

    return {
      columnProfiles,
      overallMetrics,
      anomalies,
      patterns,
      recommendations
    };
  }

  /**
   * Analyze quality of a single sheet
   */
  private static async analyzeSheet(
    sheet: Sheet,
    options: QualityAnalysisOptions
  ): Promise<{
    columnProfiles: ColumnQualityProfile[];
    metrics: QualityMetrics;
    anomalies: DetectedAnomaly[];
    patterns: QualityPattern[];
  }> {
    const columnProfiles: ColumnQualityProfile[] = [];
    const metrics = this.initializeQualityMetrics();
    const anomalies: DetectedAnomaly[] = [];
    const patterns: QualityPattern[] = [];

    if (sheet.data.length === 0) {
      return { columnProfiles, metrics, anomalies, patterns };
    }

    const numColumns = sheet.data[0]?.length || 0;

    // Analyze each column
    for (let col = 0; col < numColumns; col++) {
      const columnData = this.extractColumnData(sheet, col);
      const columnProfile = await this.analyzeColumn(columnData, col, sheet.name, options);
      
      columnProfiles.push(columnProfile);
      
      // Update overall metrics
      this.updateMetricsFromColumn(metrics, columnProfile);
      
      // Detect column-specific anomalies
      const columnAnomalies = this.detectColumnAnomalies(columnData, col, sheet.name, options);
      anomalies.push(...columnAnomalies);
    }

    // Detect cross-column patterns and anomalies
    if (options.enablePatternAnalysis) {
      const crossColumnPatterns = this.detectCrossColumnPatterns(sheet);
      patterns.push(...crossColumnPatterns);
      
      const crossColumnAnomalies = this.detectCrossColumnAnomalies(sheet, options);
      anomalies.push(...crossColumnAnomalies);
    }

    return { columnProfiles, metrics, anomalies, patterns };
  }

  /**
   * Analyze quality of a single column
   */
  private static async analyzeColumn(
    columnData: Array<{ cell: IntelligentCell | null; row: number }>,
    columnIndex: number,
    sheetName: string,
    options: QualityAnalysisOptions
  ): Promise<ColumnQualityProfile> {
    const validCells = columnData.filter(item => item.cell && item.cell.value !== null && item.cell.value !== '');
    const totalCells = columnData.length;
    const emptyCells = totalCells - validCells.length;

    // Basic quality metrics
    const completeness = totalCells > 0 ? validCells.length / totalCells : 1;
    const consistency = this.calculateConsistency(validCells.map(item => item.cell!));
    const validity = this.calculateValidity(validCells.map(item => item.cell!));
    const uniqueness = this.calculateUniqueness(validCells.map(item => item.cell!));

    // Determine primary data type
    const dataType = this.determinePrimaryDataType(validCells.map(item => item.cell!));

    // Calculate statistics if enabled
    let statistics: ColumnStatistics | undefined;
    if (options.enableStatisticalAnalysis && validCells.length >= this.MIN_SAMPLE_SIZE) {
      statistics = this.calculateColumnStatistics(validCells.map(item => item.cell!), dataType);
    }

    // Detect column-specific issues
    const issues = this.detectColumnIssues(columnData, columnIndex, sheetName, options);

    // Detect patterns
    const patterns = options.enablePatternAnalysis 
      ? this.detectColumnPatterns(validCells.map(item => item.cell!))
      : [];

    // Calculate overall quality score
    const qualityScore = (completeness + consistency + validity + uniqueness) / 4;

    return {
      columnIndex,
      dataType,
      qualityScore,
      completeness,
      consistency,
      validity,
      uniqueness,
      statistics,
      issues,
      patterns
    };
  }

  /**
   * Calculate consistency score for a column
   */
  private static calculateConsistency(cells: IntelligentCell[]): number {
    if (cells.length === 0) return 1;

    // Group by data type
    const typeGroups = new Map<EnhancedDataType, number>();
    cells.forEach(cell => {
      const type = cell.enhancedDataType || EnhancedDataType.TEXT;
      typeGroups.set(type, (typeGroups.get(type) || 0) + 1);
    });

    // Find the most common type
    const maxCount = Math.max(...typeGroups.values());
    return maxCount / cells.length;
  }

  /**
   * Calculate validity score for a column
   */
  private static calculateValidity(cells: IntelligentCell[]): number {
    if (cells.length === 0) return 1;

    let validCount = 0;
    cells.forEach(cell => {
      // Check for error indicators
      if (cell.dataType === DataType.ERROR) return;
      if (String(cell.value).includes('#REF!') || String(cell.value).includes('#VALUE!')) return;
      if (cell.anomalyFlags && cell.anomalyFlags.some(flag => flag.severity === 'high')) return;
      
      validCount++;
    });

    return validCount / cells.length;
  }

  /**
   * Calculate uniqueness score for a column
   */
  private static calculateUniqueness(cells: IntelligentCell[]): number {
    if (cells.length === 0) return 1;

    const uniqueValues = new Set(cells.map(cell => cell.value));
    return uniqueValues.size / cells.length;
  }

  /**
   * Determine the primary data type for a column
   */
  private static determinePrimaryDataType(cells: IntelligentCell[]): EnhancedDataType {
    if (cells.length === 0) return EnhancedDataType.EMPTY;

    const typeCounts = new Map<EnhancedDataType, number>();
    cells.forEach(cell => {
      const type = cell.enhancedDataType || EnhancedDataType.TEXT;
      typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
    });

    // Return the most common type
    return Array.from(typeCounts.entries())
      .sort(([,a], [,b]) => b - a)[0]?.[0] || EnhancedDataType.TEXT;
  }

  /**
   * Calculate detailed statistics for a column
   */
  private static calculateColumnStatistics(cells: IntelligentCell[], dataType: EnhancedDataType): ColumnStatistics {
    const values = cells.map(cell => cell.value);
    const nonNullValues = values.filter(v => v !== null && v !== '');
    
    const stats: ColumnStatistics = {
      count: cells.length,
      nullCount: cells.length - nonNullValues.length,
      uniqueCount: new Set(nonNullValues).size,
      duplicateCount: nonNullValues.length - new Set(nonNullValues).size
    };

    // Text statistics
    if (dataType === EnhancedDataType.TEXT || dataType === EnhancedDataType.COMPANY_NAME) {
      const textValues = nonNullValues.map(v => String(v));
      stats.minLength = Math.min(...textValues.map(v => v.length));
      stats.maxLength = Math.max(...textValues.map(v => v.length));
      stats.avgLength = textValues.reduce((sum, v) => sum + v.length, 0) / textValues.length;
      
      // Common patterns
      stats.commonPatterns = this.findCommonTextPatterns(textValues);
    }

    // Numeric statistics
    if (this.isNumericType(dataType)) {
      const numericValues = nonNullValues
        .map(v => typeof v === 'number' ? v : parseFloat(String(v)))
        .filter(v => !isNaN(v));

      if (numericValues.length > 0) {
        const sorted = [...numericValues].sort((a, b) => a - b);
        
        stats.min = Math.min(...numericValues);
        stats.max = Math.max(...numericValues);
        stats.mean = numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length;
        stats.median = this.calculateMedian(sorted);
        stats.mode = this.calculateMode(numericValues);
        stats.stdDev = this.calculateStandardDeviation(numericValues, stats.mean);
        stats.variance = Math.pow(stats.stdDev, 2);
        stats.quartiles = this.calculateQuartiles(sorted);
        stats.outliers = this.detectOutliers(numericValues, stats.quartiles);
      }
    }

    return stats;
  }

  /**
   * Detect column-specific data quality issues
   */
  private static detectColumnIssues(
    columnData: Array<{ cell: IntelligentCell | null; row: number }>,
    columnIndex: number,
    sheetName: string,
    options: QualityAnalysisOptions
  ): DataQualityIssue[] {
    const issues: DataQualityIssue[] = [];
    const validCells = columnData.filter(item => item.cell && item.cell.value);

    // Missing data issues
    const missingCount = columnData.length - validCells.length;
    if (missingCount > 0) {
      const missingPercentage = missingCount / columnData.length;
      if (missingPercentage > 0.1) { // More than 10% missing
        issues.push({
          type: 'missing_data',
          severity: missingPercentage > 0.5 ? 'critical' : missingPercentage > 0.3 ? 'high' : 'medium',
          description: `${Math.round(missingPercentage * 100)}% of values are missing (${missingCount}/${columnData.length})`,
          affectedCells: columnData
            .filter(item => !item.cell || !item.cell.value)
            .map(item => ({
              sheet: sheetName,
              row: item.row,
              col: columnIndex,
              address: this.indexToAddress(item.row, columnIndex),
              value: null
            })),
          confidence: 0.95,
          suggestedFix: 'Fill missing values with appropriate defaults or investigate data collection process'
        });
      }
    }

    // Duplicate data issues
    if (validCells.length > 1) {
      const values = validCells.map(item => item.cell!.value);
      const uniqueValues = new Set(values);
      const duplicateCount = values.length - uniqueValues.size;
      
      if (duplicateCount > 0) {
        const duplicatePercentage = duplicateCount / values.length;
        if (duplicatePercentage > 0.1) { // More than 10% duplicates
          issues.push({
            type: 'duplicate_data',
            severity: duplicatePercentage > 0.5 ? 'high' : 'medium',
            description: `${Math.round(duplicatePercentage * 100)}% of values are duplicates (${duplicateCount}/${values.length})`,
            affectedCells: [], // Would need more complex logic to identify specific duplicates
            confidence: 0.9,
            suggestedFix: 'Review duplicate values and remove or consolidate as appropriate'
          });
        }
      }
    }

    // Format consistency issues
    const formatIssues = this.detectFormatInconsistencies(validCells.map(item => item.cell!));
    if (formatIssues.length > 0) {
      issues.push({
        type: 'inconsistent_format',
        severity: 'medium',
        description: `Inconsistent formatting detected: ${formatIssues.join(', ')}`,
        affectedCells: [], // Would need more specific identification
        confidence: 0.8,
        suggestedFix: 'Standardize data formats within the column'
      });
    }

    return issues;
  }

  /**
   * Detect anomalies in a column
   */
  private static detectColumnAnomalies(
    columnData: Array<{ cell: IntelligentCell | null; row: number }>,
    columnIndex: number,
    sheetName: string,
    options: QualityAnalysisOptions
  ): DetectedAnomaly[] {
    const anomalies: DetectedAnomaly[] = [];
    const validCells = columnData.filter(item => item.cell && item.cell.value);

    if (validCells.length < this.MIN_SAMPLE_SIZE) return anomalies;

    // Statistical anomalies for numeric data
    const numericCells = validCells.filter(item => 
      item.cell!.enhancedDataType === EnhancedDataType.NUMBER ||
      item.cell!.enhancedDataType === EnhancedDataType.INTEGER ||
      item.cell!.enhancedDataType === EnhancedDataType.DECIMAL ||
      item.cell!.enhancedDataType === EnhancedDataType.CURRENCY
    );

    if (numericCells.length >= this.MIN_SAMPLE_SIZE) {
      const values = numericCells.map(item => {
        const value = item.cell!.normalizedValue || item.cell!.value;
        return typeof value === 'number' ? value : parseFloat(String(value));
      }).filter(v => !isNaN(v));

      const outliers = this.detectStatisticalOutliers(values, options.outlierSensitivity || this.DEFAULT_OUTLIER_SENSITIVITY);
      
      outliers.forEach(outlierIndex => {
        const originalIndex = numericCells.findIndex((item, idx) => {
          const value = item.cell!.normalizedValue || item.cell!.value;
          const numValue = typeof value === 'number' ? value : parseFloat(String(value));
          return !isNaN(numValue) && values[outlierIndex] === numValue;
        });

        if (originalIndex >= 0) {
          const cellData = numericCells[originalIndex];
          anomalies.push({
            type: 'statistical',
            severity: 'medium',
            description: `Statistical outlier detected: value ${values[outlierIndex]} is significantly different from other values in this column`,
            affectedCells: [{
              sheet: sheetName,
              row: cellData.row,
              col: columnIndex,
              value: cellData.cell!.value
            }],
            confidence: 0.8,
            suggestedAction: 'Review this value for accuracy or consider if it represents a valid extreme case',
            impact: 'May skew statistical analysis and calculations'
          });
        }
      });
    }

    // Pattern-based anomalies
    const patternAnomalies = this.detectPatternAnomalies(validCells.map(item => item.cell!), columnIndex, sheetName);
    anomalies.push(...patternAnomalies);

    return anomalies;
  }

  /**
   * Detect cross-column patterns
   */
  private static detectCrossColumnPatterns(sheet: Sheet): QualityPattern[] {
    const patterns: QualityPattern[] = [];

    if (sheet.data.length < 2) return patterns;

    // Detect correlated missing data
    const missingDataPattern = this.detectCorrelatedMissingData(sheet);
    if (missingDataPattern) {
      patterns.push(missingDataPattern);
    }

    // Detect duplicate rows
    const duplicateRowPattern = this.detectDuplicateRows(sheet);
    if (duplicateRowPattern) {
      patterns.push(duplicateRowPattern);
    }

    return patterns;
  }

  /**
   * Detect cross-column anomalies
   */
  private static detectCrossColumnAnomalies(sheet: Sheet, options: QualityAnalysisOptions): DetectedAnomaly[] {
    const anomalies: DetectedAnomaly[] = [];

    // Detect rows with unusual patterns
    const unusualRows = this.detectUnusualRowPatterns(sheet);
    anomalies.push(...unusualRows);

    return anomalies;
  }

  // Helper methods

  private static extractColumnData(sheet: Sheet, columnIndex: number): Array<{ cell: IntelligentCell | null; row: number }> {
    return sheet.data.map((row, rowIndex) => ({
      cell: (row && row[columnIndex] as IntelligentCell) || null,
      row: rowIndex
    }));
  }

  private static initializeQualityMetrics(): QualityMetrics {
    return {
      totalCells: 0,
      validCells: 0,
      emptyCells: 0,
      errorCells: 0,
      duplicateCells: 0,
      inconsistentCells: 0,
      outlierCells: 0
    };
  }

  private static aggregateMetrics(overall: QualityMetrics, column: QualityMetrics): void {
    overall.totalCells += column.totalCells;
    overall.validCells += column.validCells;
    overall.emptyCells += column.emptyCells;
    overall.errorCells += column.errorCells;
    overall.duplicateCells += column.duplicateCells;
    overall.inconsistentCells += column.inconsistentCells;
    overall.outlierCells += column.outlierCells;
  }

  private static updateMetricsFromColumn(metrics: QualityMetrics, profile: ColumnQualityProfile): void {
    // This would be implemented based on the column profile statistics
    // For now, we'll use placeholder logic
    const totalCells = profile.statistics?.count || 0;
    metrics.totalCells += totalCells;
    metrics.emptyCells += profile.statistics?.nullCount || 0;
    metrics.validCells += totalCells - (profile.statistics?.nullCount || 0);
    metrics.duplicateCells += profile.statistics?.duplicateCount || 0;
  }

  private static isNumericType(dataType: EnhancedDataType): boolean {
    return [
      EnhancedDataType.NUMBER,
      EnhancedDataType.INTEGER,
      EnhancedDataType.DECIMAL,
      EnhancedDataType.CURRENCY,
      EnhancedDataType.PERCENTAGE,
      EnhancedDataType.SCIENTIFIC
    ].includes(dataType);
  }

  private static calculateMedian(sortedValues: number[]): number {
    const mid = Math.floor(sortedValues.length / 2);
    return sortedValues.length % 2 === 0
      ? (sortedValues[mid - 1] + sortedValues[mid]) / 2
      : sortedValues[mid];
  }

  private static calculateMode(values: number[]): number {
    const frequency = new Map<number, number>();
    values.forEach(value => {
      frequency.set(value, (frequency.get(value) || 0) + 1);
    });

    let maxFreq = 0;
    let mode = values[0];
    frequency.forEach((freq, value) => {
      if (freq > maxFreq) {
        maxFreq = freq;
        mode = value;
      }
    });

    return mode;
  }

  private static calculateStandardDeviation(values: number[], mean: number): number {
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  private static calculateQuartiles(sortedValues: number[]): [number, number, number] {
    const q1Index = Math.floor(sortedValues.length * 0.25);
    const q2Index = Math.floor(sortedValues.length * 0.5);
    const q3Index = Math.floor(sortedValues.length * 0.75);

    return [
      sortedValues[q1Index],
      sortedValues[q2Index],
      sortedValues[q3Index]
    ];
  }

  private static detectOutliers(values: number[], quartiles: [number, number, number]): number[] {
    const [q1, , q3] = quartiles;
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    return values.filter(value => value < lowerBound || value > upperBound);
  }

  private static detectStatisticalOutliers(values: number[], sensitivity: number): number[] {
    if (values.length < 4) return [];

    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - sensitivity * iqr;
    const upperBound = q3 + sensitivity * iqr;

    const outlierIndices: number[] = [];
    values.forEach((value, index) => {
      if (value < lowerBound || value > upperBound) {
        outlierIndices.push(index);
      }
    });

    return outlierIndices;
  }

  private static findCommonTextPatterns(textValues: string[]): Array<{ pattern: string; count: number }> {
    const patterns = new Map<string, number>();

    textValues.forEach(text => {
      // Simple pattern detection - could be enhanced with regex patterns
      const length = text.length;
      const hasNumbers = /\d/.test(text);
      const hasLetters = /[a-zA-Z]/.test(text);
      const hasSpecialChars = /[^a-zA-Z0-9\s]/.test(text);

      let pattern = `Length:${length}`;
      if (hasNumbers) pattern += ',Numbers';
      if (hasLetters) pattern += ',Letters';
      if (hasSpecialChars) pattern += ',Special';

      patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
    });

    return Array.from(patterns.entries())
      .map(([pattern, count]) => ({ pattern, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private static detectFormatInconsistencies(cells: IntelligentCell[]): string[] {
    const issues: string[] = [];

    // Check date format consistency
    const dateCells = cells.filter(cell => 
      cell.enhancedDataType === EnhancedDataType.DATE ||
      cell.enhancedDataType === EnhancedDataType.DATETIME
    );

    if (dateCells.length > 1) {
      const formats = new Set(dateCells.map(cell => this.inferDateFormat(String(cell.value))));
      if (formats.size > 1) {
        issues.push('Inconsistent date formats');
      }
    }

    // Check number format consistency
    const numberCells = cells.filter(cell => this.isNumericType(cell.enhancedDataType));
    if (numberCells.length > 1) {
      const decimalPlaces = numberCells.map(cell => {
        const str = String(cell.value);
        const decimalIndex = str.indexOf('.');
        return decimalIndex >= 0 ? str.length - decimalIndex - 1 : 0;
      });

      const uniqueDecimalPlaces = new Set(decimalPlaces);
      if (uniqueDecimalPlaces.size > 2) { // Allow some variation
        issues.push('Inconsistent decimal places');
      }
    }

    return issues;
  }

  private static inferDateFormat(dateString: string): string {
    if (/^\d{4}-\d{2}-\d{2}/.test(dateString)) return 'YYYY-MM-DD';
    if (/^\d{2}\/\d{2}\/\d{4}/.test(dateString)) return 'MM/DD/YYYY';
    if (/^\d{2}-\d{2}-\d{4}/.test(dateString)) return 'MM-DD-YYYY';
    return 'unknown';
  }

  private static detectPatternAnomalies(cells: IntelligentCell[], columnIndex: number, sheetName: string): DetectedAnomaly[] {
    const anomalies: DetectedAnomaly[] = [];

    // Detect encoding issues
    cells.forEach((cell, index) => {
      const value = String(cell.value);
      if (value.includes('�') || value.includes('???')) {
        anomalies.push({
          type: 'format',
          severity: 'medium',
          description: 'Possible encoding issue detected',
          affectedCells: [{
            sheet: sheetName,
            row: index,
            col: columnIndex,
            value: cell.value
          }],
          confidence: 0.8,
          suggestedAction: 'Check file encoding and re-import if necessary',
          impact: 'Data may be corrupted or unreadable'
        });
      }
    });

    return anomalies;
  }

  private static detectCorrelatedMissingData(sheet: Sheet): QualityPattern | null {
    // Simple implementation - would need more sophisticated analysis
    const missingPatterns = new Map<string, number>();
    
    sheet.data.forEach(row => {
      if (row) {
        const missingColumns = row.map((cell, index) => 
          (!cell || !cell.value) ? index : -1
        ).filter(index => index >= 0);
        
        if (missingColumns.length > 1) {
          const pattern = missingColumns.sort().join(',');
          missingPatterns.set(pattern, (missingPatterns.get(pattern) || 0) + 1);
        }
      }
    });

    const mostCommonPattern = Array.from(missingPatterns.entries())
      .sort(([,a], [,b]) => b - a)[0];

    if (mostCommonPattern && mostCommonPattern[1] > 2) {
      return {
        type: 'missing_data_pattern',
        description: `Correlated missing data detected in columns: ${mostCommonPattern[0]}`,
        frequency: mostCommonPattern[1],
        confidence: 0.7,
        examples: [`Pattern occurs in ${mostCommonPattern[1]} rows`]
      };
    }

    return null;
  }

  private static detectDuplicateRows(sheet: Sheet): QualityPattern | null {
    const rowHashes = new Map<string, number>();
    
    sheet.data.forEach(row => {
      if (row) {
        const rowString = row.map(cell => cell ? String(cell.value) : '').join('|');
        rowHashes.set(rowString, (rowHashes.get(rowString) || 0) + 1);
      }
    });

    const duplicates = Array.from(rowHashes.entries()).filter(([, count]) => count > 1);
    
    if (duplicates.length > 0) {
      const totalDuplicates = duplicates.reduce((sum, [, count]) => sum + count - 1, 0);
      return {
        type: 'duplicate_pattern',
        description: `${totalDuplicates} duplicate rows detected`,
        frequency: totalDuplicates,
        confidence: 0.9,
        examples: duplicates.slice(0, 3).map(([row]) => `Duplicate: ${row.substring(0, 50)}...`)
      };
    }

    return null;
  }

  private static detectUnusualRowPatterns(sheet: Sheet): DetectedAnomaly[] {
    const anomalies: DetectedAnomaly[] = [];
    
    // Detect rows with significantly different cell counts
    const cellCounts = sheet.data.map(row => row ? row.length : 0);
    const avgCellCount = cellCounts.reduce((sum, count) => sum + count, 0) / cellCounts.length;
    
    cellCounts.forEach((count, rowIndex) => {
      if (Math.abs(count - avgCellCount) > avgCellCount * 0.5) { // 50% deviation
        anomalies.push({
          type: 'pattern',
          severity: 'low',
          description: `Row ${rowIndex + 1} has unusual number of cells (${count} vs average ${Math.round(avgCellCount)})`,
          affectedCells: [{
            sheet: sheet.name,
            row: rowIndex,
            col: 0,
            value: `Row with ${count} cells`
          }],
          confidence: 0.6,
          suggestedAction: 'Review row structure for consistency',
          impact: 'May indicate data import or formatting issues'
        });
      }
    });

    return anomalies;
  }

  private static detectColumnPatterns(cells: IntelligentCell[]): string[] {
    const patterns: string[] = [];
    
    if (cells.length === 0) return patterns;

    // Check for sequential patterns in numeric data
    const numericCells = cells.filter(cell => this.isNumericType(cell.enhancedDataType));
    if (numericCells.length > 2) {
      const values = numericCells.map(cell => {
        const value = cell.normalizedValue || cell.value;
        return typeof value === 'number' ? value : parseFloat(String(value));
      }).filter(v => !isNaN(v));

      if (this.isSequential(values)) {
        patterns.push('Sequential numeric values');
      }
    }

    // Check for repeated patterns in text data
    const textCells = cells.filter(cell => 
      cell.enhancedDataType === EnhancedDataType.TEXT ||
      cell.enhancedDataType === EnhancedDataType.COMPANY_NAME
    );

    if (textCells.length > 2) {
      const textValues = textCells.map(cell => String(cell.value));
      if (this.hasRepeatingPattern(textValues)) {
        patterns.push('Repeating text pattern');
      }
    }

    return patterns;
  }

  private static isSequential(values: number[]): boolean {
    if (values.length < 3) return false;
    
    const differences = [];
    for (let i = 1; i < values.length; i++) {
      differences.push(values[i] - values[i - 1]);
    }

    // Check if differences are consistent (allowing for small variations)
    const avgDiff = differences.reduce((sum, diff) => sum + diff, 0) / differences.length;
    const tolerance = Math.abs(avgDiff) * 0.1; // 10% tolerance
    
    return differences.every(diff => Math.abs(diff - avgDiff) <= tolerance);
  }

  private static hasRepeatingPattern(values: string[]): boolean {
    if (values.length < 4) return false;
    
    // Check for simple repeating patterns (e.g., A, B, A, B, ...)
    for (let patternLength = 2; patternLength <= Math.floor(values.length / 2); patternLength++) {
      let isRepeating = true;
      for (let i = patternLength; i < values.length; i++) {
        if (values[i] !== values[i % patternLength]) {
          isRepeating = false;
          break;
        }
      }
      if (isRepeating) return true;
    }

    return false;
  }

  private static indexToAddress(row: number, col: number): string {
    let columnStr = '';
    let tempCol = col;
    
    while (tempCol >= 0) {
      columnStr = String.fromCharCode('A'.charCodeAt(0) + (tempCol % 26)) + columnStr;
      tempCol = Math.floor(tempCol / 26) - 1;
    }
    
    return `${columnStr}${row + 1}`;
  }

  private static generateQualityRecommendations(
    columnProfiles: ColumnQualityProfile[],
    anomalies: DetectedAnomaly[],
    patterns: QualityPattern[]
  ): QualityRecommendation[] {
    const recommendations: QualityRecommendation[] = [];

    // Recommendations based on column quality scores
    const lowQualityColumns = columnProfiles.filter(profile => profile.qualityScore < 0.7);
    if (lowQualityColumns.length > 0) {
      recommendations.push({
        type: 'data_cleaning',
        priority: 'high',
        description: `${lowQualityColumns.length} columns have quality scores below 70%`,
        expectedImpact: 'Improved data reliability and analysis accuracy',
        implementationSteps: [
          'Review columns with low quality scores',
          'Address missing data and inconsistencies',
          'Implement data validation rules',
          'Consider data source improvements'
        ]
      });
    }

    // Recommendations based on anomalies
    const criticalAnomalies = anomalies.filter(anomaly => anomaly.severity === 'critical');
    if (criticalAnomalies.length > 0) {
      recommendations.push({
        type: 'validation_rule',
        priority: 'high',
        description: `${criticalAnomalies.length} critical data anomalies detected`,
        expectedImpact: 'Prevention of data corruption and errors',
        implementationSteps: [
          'Investigate critical anomalies immediately',
          'Implement validation rules to prevent similar issues',
          'Set up monitoring for data quality metrics',
          'Review data collection processes'
        ]
      });
    }

    // Recommendations based on patterns
    const duplicatePatterns = patterns.filter(pattern => pattern.type === 'duplicate_pattern');
    if (duplicatePatterns.length > 0) {
      recommendations.push({
        type: 'data_cleaning',
        priority: 'medium',
        description: 'Duplicate data patterns detected',
        expectedImpact: 'Reduced data redundancy and improved storage efficiency',
        implementationSteps: [
          'Identify and review duplicate records',
          'Implement deduplication processes',
          'Add unique constraints where appropriate',
          'Monitor for future duplicates'
        ]
      });
    }

    return recommendations;
  }
}