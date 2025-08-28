/**
 * DataRelationshipAnalyzer - Advanced analysis of data relationships and hierarchies
 * 
 * This service provides comprehensive analysis of column dependencies, data hierarchies,
 * and cross-references to support intelligent auto-selection and relationship mapping.
 */

import {
  RelationshipMap,
  ColumnDependency,
  DataHierarchy,
  CalculatedField,
  CrossReference,
  SemanticRelationship,
  DependencyType,
  HierarchyType,
  CalculationType,
  ReferenceType,
  SemanticRelationshipType,
  HierarchyStructure,
  KeyColumnMapping,
  SemanticEvidence,
  EvidenceType,
  UpdateFrequency,
  MatchType,
  Cardinality,
  AggregationType
} from '../types/intelligent-selection';
import {
  SpreadsheetData,
  Sheet,
  Cell,
  DataType,
  DependencyGraph,
  Range
} from '../types/spreadsheet';
import { DependencyParser } from './DependencyParser';

export interface RelationshipAnalysisOptions {
  includeSemanticAnalysis: boolean;
  includeCrossReferences: boolean;
  includeHierarchyDetection: boolean;
  confidenceThreshold: number;
  maxDepth: number;
}

export interface RelationshipAnalysisResult {
  relationshipMap: RelationshipMap;
  analysisMetadata: AnalysisMetadata;
  recommendations: RelationshipRecommendation[];
}

export interface AnalysisMetadata {
  totalRelationships: number;
  strongRelationships: number;
  hierarchyCount: number;
  calculatedFieldCount: number;
  crossReferenceCount: number;
  analysisTime: number;
  confidence: number;
}

export interface RelationshipRecommendation {
  type: 'strengthen_relationship' | 'validate_hierarchy' | 'optimize_calculation' | 'improve_reference';
  description: string;
  columns: number[];
  priority: 'low' | 'medium' | 'high';
  impact: string;
}

export class DataRelationshipAnalyzer {
  private static readonly DEFAULT_OPTIONS: RelationshipAnalysisOptions = {
    includeSemanticAnalysis: true,
    includeCrossReferences: true,
    includeHierarchyDetection: true,
    confidenceThreshold: 0.6,
    maxDepth: 5
  };

  /**
   * Analyze comprehensive data relationships in a spreadsheet
   */
  public static analyzeRelationships(
    spreadsheetData: SpreadsheetData,
    sheetName?: string,
    options: Partial<RelationshipAnalysisOptions> = {}
  ): RelationshipAnalysisResult {
    const startTime = Date.now();
    const analysisOptions = { ...this.DEFAULT_OPTIONS, ...options };
    
    const targetSheet = sheetName 
      ? spreadsheetData.sheets.find(s => s.name === sheetName)
      : spreadsheetData.sheets[0];

    if (!targetSheet) {
      throw new Error(`Sheet not found: ${sheetName || 'default'}`);
    }

    // Build dependency graph
    const dependencyGraph = DependencyParser.buildDependencyGraph(
      spreadsheetData.formulas,
      spreadsheetData.namedRanges
    );

    // Analyze different types of relationships
    const columnDependencies = this.analyzeColumnDependencies(targetSheet, dependencyGraph, analysisOptions);
    const dataHierarchies = analysisOptions.includeHierarchyDetection 
      ? this.analyzeDataHierarchies(targetSheet, analysisOptions)
      : [];
    const calculatedFields = this.analyzeCalculatedFields(targetSheet, dependencyGraph, analysisOptions);
    const crossReferences = analysisOptions.includeCrossReferences
      ? this.analyzeCrossReferences(targetSheet, spreadsheetData, analysisOptions)
      : [];
    const semanticRelationships = analysisOptions.includeSemanticAnalysis
      ? this.analyzeSemanticRelationships(targetSheet, analysisOptions)
      : [];

    const relationshipMap: RelationshipMap = {
      columnDependencies,
      dataHierarchies,
      calculatedFields,
      crossReferences,
      semanticRelationships
    };

    // Generate analysis metadata
    const analysisTime = Date.now() - startTime;
    const analysisMetadata = this.generateAnalysisMetadata(relationshipMap, analysisTime);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(relationshipMap, targetSheet);

    return {
      relationshipMap,
      analysisMetadata,
      recommendations
    };
  }

  /**
   * Analyze column dependencies using formula analysis and data patterns
   */
  public static analyzeColumnDependencies(
    sheet: Sheet,
    dependencyGraph: DependencyGraph,
    options: RelationshipAnalysisOptions
  ): ColumnDependency[] {
    const dependencies: ColumnDependency[] = [];
    const columnMap = new Map<number, Set<number>>(); // source -> targets

    // Analyze formula-based dependencies
    dependencyGraph.nodes.forEach(node => {
      if (node.formula && node.sheet === sheet.name && node.precedents.length > 0) {
        const targetCol = this.addressToColumn(node.cell);
        
        node.precedents.forEach(precId => {
          const precNode = dependencyGraph.nodes.find(n => n.id === precId);
          if (precNode && precNode.sheet === node.sheet) {
            const sourceCol = this.addressToColumn(precNode.cell);
            
            if (sourceCol !== targetCol && sourceCol >= 0 && targetCol >= 0) {
              if (!columnMap.has(sourceCol)) {
                columnMap.set(sourceCol, new Set());
              }
              columnMap.get(sourceCol)!.add(targetCol);
            }
          }
        });
      }
    });

    // Convert to dependency objects
    columnMap.forEach((targets, source) => {
      targets.forEach(target => {
        const strength = this.calculateDependencyStrength(sheet, source, target, dependencyGraph);
        const dependencyType = this.determineDependencyType(sheet, source, target, dependencyGraph);
        
        if (strength >= options.confidenceThreshold) {
          dependencies.push({
            sourceColumn: source,
            targetColumn: target,
            dependencyType,
            strength,
            description: this.generateDependencyDescription(source, target, dependencyType),
            formula: this.findDependencyFormula(sheet, source, target, dependencyGraph),
            isDirectDependency: true
          });
        }
      });
    });

    // Analyze statistical dependencies (correlation-based)
    const statisticalDependencies = this.analyzeStatisticalDependencies(sheet, options);
    dependencies.push(...statisticalDependencies);

    return dependencies.sort((a, b) => b.strength - a.strength);
  }

  /**
   * Analyze data hierarchies and organizational structures
   */
  public static analyzeDataHierarchies(
    sheet: Sheet,
    options: RelationshipAnalysisOptions
  ): DataHierarchy[] {
    const hierarchies: DataHierarchy[] = [];
    
    // Analyze header-based hierarchies
    const headerHierarchies = this.analyzeHeaderHierarchies(sheet, options);
    hierarchies.push(...headerHierarchies);
    
    // Analyze data pattern hierarchies
    const patternHierarchies = this.analyzePatternHierarchies(sheet, options);
    hierarchies.push(...patternHierarchies);
    
    // Analyze aggregation hierarchies
    const aggregationHierarchies = this.analyzeAggregationHierarchies(sheet, options);
    hierarchies.push(...aggregationHierarchies);

    return hierarchies.filter(h => h.levels >= 2);
  }

  /**
   * Analyze calculated fields and their dependencies
   */
  public static analyzeCalculatedFields(
    sheet: Sheet,
    dependencyGraph: DependencyGraph,
    options: RelationshipAnalysisOptions
  ): CalculatedField[] {
    const calculatedFields: CalculatedField[] = [];
    
    dependencyGraph.nodes.forEach(node => {
      if (node.formula && node.sheet === sheet.name) {
        const col = this.addressToColumn(node.cell);
        if (col >= 0) {
          const dependencies = node.precedents
            .map(precId => {
              const precNode = dependencyGraph.nodes.find(n => n.id === precId);
              return precNode ? this.addressToColumn(precNode.cell) : -1;
            })
            .filter(colIndex => colIndex >= 0 && colIndex !== col);
          
          const calculationType = this.determineCalculationType(node.formula);
          const isVolatile = this.isVolatileFormula(node.formula);
          
          calculatedFields.push({
            column: col,
            formula: node.formula,
            dependencies,
            calculationType,
            isVolatile,
            updateFrequency: isVolatile ? UpdateFrequency.REAL_TIME : UpdateFrequency.ON_CHANGE
          });
        }
      }
    });
    
    return calculatedFields;
  }

  /**
   * Analyze cross-references between data ranges
   */
  public static analyzeCrossReferences(
    sheet: Sheet,
    spreadsheetData: SpreadsheetData,
    options: RelationshipAnalysisOptions
  ): CrossReference[] {
    const crossReferences: CrossReference[] = [];
    
    // Analyze lookup table relationships
    const lookupReferences = this.analyzeLookupReferences(sheet, spreadsheetData, options);
    crossReferences.push(...lookupReferences);
    
    // Analyze master-detail relationships
    const masterDetailReferences = this.analyzeMasterDetailReferences(sheet, options);
    crossReferences.push(...masterDetailReferences);
    
    // Analyze validation references
    const validationReferences = this.analyzeValidationReferences(sheet, options);
    crossReferences.push(...validationReferences);

    return crossReferences.filter(ref => ref.strength >= options.confidenceThreshold);
  }

  /**
   * Analyze semantic relationships between columns
   */
  public static analyzeSemanticRelationships(
    sheet: Sheet,
    options: RelationshipAnalysisOptions
  ): SemanticRelationship[] {
    const relationships: SemanticRelationship[] = [];
    
    if (sheet.data.length === 0) return relationships;
    
    const headers = this.extractHeaders(sheet);
    if (headers.length < 2) return relationships;
    
    // Analyze header similarities
    for (let i = 0; i < headers.length; i++) {
      for (let j = i + 1; j < headers.length; j++) {
        const header1 = headers[i];
        const header2 = headers[j];
        
        if (header1 && header2) {
          const relationship = this.analyzeHeaderRelationship(header1, header2, i, j, sheet);
          if (relationship && relationship.confidence >= options.confidenceThreshold) {
            relationships.push(relationship);
          }
        }
      }
    }
    
    // Analyze data pattern relationships
    const dataPatternRelationships = this.analyzeDataPatternRelationships(sheet, options);
    relationships.push(...dataPatternRelationships);

    return relationships.sort((a, b) => b.confidence - a.confidence);
  }

  // Helper methods for dependency analysis
  private static calculateDependencyStrength(
    sheet: Sheet,
    sourceCol: number,
    targetCol: number,
    dependencyGraph: DependencyGraph
  ): number {
    let strength = 0.5; // Base strength
    
    // Count formula references
    const formulaReferences = this.countFormulaReferences(sheet, sourceCol, targetCol, dependencyGraph);
    strength += Math.min(0.3, formulaReferences * 0.1);
    
    // Analyze data correlation if both columns have numeric data
    const correlation = this.calculateColumnCorrelation(sheet, sourceCol, targetCol);
    if (correlation !== null) {
      strength += Math.abs(correlation) * 0.2;
    }
    
    return Math.min(1, strength);
  }

  private static determineDependencyType(
    sheet: Sheet,
    sourceCol: number,
    targetCol: number,
    dependencyGraph: DependencyGraph
  ): DependencyType {
    // Find formulas that reference the source column
    const referencingFormulas = dependencyGraph.nodes.filter(node => {
      if (!node.formula || node.sheet !== sheet.name) return false;
      const nodeCol = this.addressToColumn(node.cell);
      return nodeCol === targetCol && node.precedents.some(precId => {
        const precNode = dependencyGraph.nodes.find(n => n.id === precId);
        return precNode && this.addressToColumn(precNode.cell) === sourceCol;
      });
    });
    
    if (referencingFormulas.length > 0) {
      const formula = referencingFormulas[0].formula.toUpperCase();
      
      if (formula.includes('VLOOKUP') || formula.includes('HLOOKUP') || formula.includes('INDEX') || formula.includes('MATCH')) {
        return DependencyType.LOOKUP;
      }
      
      if (formula.includes('SUM') || formula.includes('AVERAGE') || formula.includes('COUNT')) {
        return DependencyType.AGGREGATION;
      }
      
      if (formula.includes('+') || formula.includes('-') || formula.includes('*') || formula.includes('/')) {
        return DependencyType.CALCULATION;
      }
      
      return DependencyType.FORMULA;
    }
    
    return DependencyType.REFERENCE;
  }

  private static generateDependencyDescription(
    sourceCol: number,
    targetCol: number,
    dependencyType: DependencyType
  ): string {
    const sourceColName = this.columnToLetter(sourceCol);
    const targetColName = this.columnToLetter(targetCol);
    
    switch (dependencyType) {
      case DependencyType.FORMULA:
        return `Column ${targetColName} contains formulas that reference column ${sourceColName}`;
      case DependencyType.LOOKUP:
        return `Column ${targetColName} performs lookups using values from column ${sourceColName}`;
      case DependencyType.AGGREGATION:
        return `Column ${targetColName} aggregates data from column ${sourceColName}`;
      case DependencyType.CALCULATION:
        return `Column ${targetColName} performs calculations using column ${sourceColName}`;
      default:
        return `Column ${targetColName} references column ${sourceColName}`;
    }
  }

  private static findDependencyFormula(
    sheet: Sheet,
    sourceCol: number,
    targetCol: number,
    dependencyGraph: DependencyGraph
  ): string | undefined {
    const referencingNode = dependencyGraph.nodes.find(node => {
      if (!node.formula || node.sheet !== sheet.name) return false;
      const nodeCol = this.addressToColumn(node.cell);
      return nodeCol === targetCol && node.precedents.some(precId => {
        const precNode = dependencyGraph.nodes.find(n => n.id === precId);
        return precNode && this.addressToColumn(precNode.cell) === sourceCol;
      });
    });
    
    return referencingNode?.formula;
  }

  private static analyzeStatisticalDependencies(
    sheet: Sheet,
    options: RelationshipAnalysisOptions
  ): ColumnDependency[] {
    const dependencies: ColumnDependency[] = [];
    
    // Only analyze if we have enough data
    if (sheet.data.length < 10) return dependencies;
    
    const numericColumns = this.findNumericColumns(sheet);
    
    // Analyze correlations between numeric columns
    for (let i = 0; i < numericColumns.length; i++) {
      for (let j = i + 1; j < numericColumns.length; j++) {
        const col1 = numericColumns[i];
        const col2 = numericColumns[j];
        
        const correlation = this.calculateColumnCorrelation(sheet, col1, col2);
        if (correlation !== null && Math.abs(correlation) >= options.confidenceThreshold) {
          dependencies.push({
            sourceColumn: col1,
            targetColumn: col2,
            dependencyType: DependencyType.REFERENCE,
            strength: Math.abs(correlation),
            description: `Statistical correlation between columns ${this.columnToLetter(col1)} and ${this.columnToLetter(col2)}`,
            isDirectDependency: false
          });
        }
      }
    }
    
    return dependencies;
  }

  // Helper methods for hierarchy analysis
  private static analyzeHeaderHierarchies(
    sheet: Sheet,
    options: RelationshipAnalysisOptions
  ): DataHierarchy[] {
    const hierarchies: DataHierarchy[] = [];
    const headers = this.extractHeaders(sheet);
    
    if (headers.length < 2) return hierarchies;
    
    // Look for hierarchical patterns in adjacent columns
    for (let i = 0; i < headers.length - 1; i++) {
      const header1 = headers[i];
      const header2 = headers[i + 1];
      
      if (header1 && header2) {
        const hierarchyType = this.detectHierarchyType(header1, header2);
        if (hierarchyType) {
          const structure = this.analyzeHierarchyStructure(sheet, i, i + 1);
          
          hierarchies.push({
            parentColumn: i,
            childColumns: [i + 1],
            hierarchyType,
            levels: 2,
            structure
          });
        }
      }
    }
    
    // Look for multi-level hierarchies
    const multiLevelHierarchies = this.detectMultiLevelHierarchies(sheet, headers);
    hierarchies.push(...multiLevelHierarchies);
    
    return hierarchies;
  }

  private static analyzePatternHierarchies(
    sheet: Sheet,
    options: RelationshipAnalysisOptions
  ): DataHierarchy[] {
    const hierarchies: DataHierarchy[] = [];
    
    // Analyze data patterns to detect hierarchies
    for (let col = 0; col < sheet.dimensions.cols - 1; col++) {
      const pattern = this.analyzeColumnDataPattern(sheet, col);
      const nextPattern = this.analyzeColumnDataPattern(sheet, col + 1);
      
      if (this.isHierarchicalPattern(pattern, nextPattern)) {
        const hierarchyType = this.inferHierarchyTypeFromPattern(pattern, nextPattern);
        const structure = this.analyzeHierarchyStructure(sheet, col, col + 1);
        
        hierarchies.push({
          parentColumn: col,
          childColumns: [col + 1],
          hierarchyType,
          levels: 2,
          structure
        });
      }
    }
    
    return hierarchies;
  }

  private static analyzeAggregationHierarchies(
    sheet: Sheet,
    options: RelationshipAnalysisOptions
  ): DataHierarchy[] {
    const hierarchies: DataHierarchy[] = [];
    
    // Look for columns that contain aggregated data
    for (let col = 0; col < sheet.dimensions.cols; col++) {
      const aggregationInfo = this.analyzeColumnAggregation(sheet, col);
      
      if (aggregationInfo.isAggregated && aggregationInfo.sourceColumns.length > 0) {
        const structure = this.buildAggregationStructure(sheet, col, aggregationInfo.sourceColumns);
        
        hierarchies.push({
          parentColumn: col,
          childColumns: aggregationInfo.sourceColumns,
          hierarchyType: HierarchyType.NUMERICAL,
          levels: 2,
          structure
        });
      }
    }
    
    return hierarchies;
  }

  // Helper methods for cross-reference analysis
  private static analyzeLookupReferences(
    sheet: Sheet,
    spreadsheetData: SpreadsheetData,
    options: RelationshipAnalysisOptions
  ): CrossReference[] {
    const references: CrossReference[] = [];
    
    // Analyze VLOOKUP/HLOOKUP patterns
    spreadsheetData.formulas.forEach(formula => {
      if (formula.sheet === sheet.name && 
          (formula.formula.toUpperCase().includes('VLOOKUP') || 
           formula.formula.toUpperCase().includes('HLOOKUP'))) {
        
        const lookupRef = this.parseLookupFormula(formula.formula);
        if (lookupRef) {
          references.push({
            sourceRange: lookupRef.sourceRange,
            targetRange: lookupRef.targetRange,
            referenceType: ReferenceType.LOOKUP_TABLE,
            strength: 0.9,
            bidirectional: false,
            keyColumns: lookupRef.keyColumns
          });
        }
      }
    });
    
    return references;
  }

  private static analyzeMasterDetailReferences(
    sheet: Sheet,
    options: RelationshipAnalysisOptions
  ): CrossReference[] {
    const references: CrossReference[] = [];
    
    // Look for master-detail patterns in data
    const uniqueValueColumns = this.findUniqueValueColumns(sheet);
    const detailColumns = this.findDetailColumns(sheet);
    
    uniqueValueColumns.forEach(masterCol => {
      detailColumns.forEach(detailCol => {
        if (masterCol !== detailCol) {
          const relationship = this.analyzeMasterDetailRelationship(sheet, masterCol, detailCol);
          if (relationship && relationship.strength >= options.confidenceThreshold) {
            references.push(relationship);
          }
        }
      });
    });
    
    return references;
  }

  private static analyzeValidationReferences(
    sheet: Sheet,
    options: RelationshipAnalysisOptions
  ): CrossReference[] {
    const references: CrossReference[] = [];
    
    // Look for validation patterns (e.g., foreign key relationships)
    for (let col = 0; col < sheet.dimensions.cols; col++) {
      const validationInfo = this.analyzeColumnValidation(sheet, col);
      
      if (validationInfo.hasValidation && validationInfo.referenceColumn !== undefined) {
        const sourceRange: Range = {
          startRow: 0,
          endRow: sheet.dimensions.rows - 1,
          startCol: col,
          endCol: col,
          sheetName: sheet.name
        };
        
        const targetRange: Range = {
          startRow: 0,
          endRow: sheet.dimensions.rows - 1,
          startCol: validationInfo.referenceColumn,
          endCol: validationInfo.referenceColumn,
          sheetName: sheet.name
        };
        
        references.push({
          sourceRange,
          targetRange,
          referenceType: ReferenceType.VALIDATION,
          strength: validationInfo.strength,
          bidirectional: false,
          keyColumns: [{
            sourceColumn: col,
            targetColumn: validationInfo.referenceColumn,
            matchType: MatchType.EXACT,
            uniqueness: validationInfo.uniqueness
          }]
        });
      }
    }
    
    return references;
  }

  // Helper methods for semantic analysis
  private static analyzeHeaderRelationship(
    header1: string,
    header2: string,
    col1: number,
    col2: number,
    sheet: Sheet
  ): SemanticRelationship | null {
    const similarity = this.calculateHeaderSimilarity(header1, header2);
    
    if (similarity < 0.3) return null;
    
    const relationshipType = this.determineSemanticRelationshipType(header1, header2);
    const evidence = this.gatherSemanticEvidence(header1, header2, col1, col2, sheet);
    
    return {
      sourceColumn: col1,
      targetColumn: col2,
      relationshipType,
      confidence: similarity,
      description: `Semantic relationship between "${header1}" and "${header2}"`,
      evidence
    };
  }

  private static analyzeDataPatternRelationships(
    sheet: Sheet,
    options: RelationshipAnalysisOptions
  ): SemanticRelationship[] {
    const relationships: SemanticRelationship[] = [];
    
    // Analyze data patterns for semantic relationships
    for (let col1 = 0; col1 < sheet.dimensions.cols; col1++) {
      for (let col2 = col1 + 1; col2 < sheet.dimensions.cols; col2++) {
        const pattern1 = this.analyzeColumnDataPattern(sheet, col1);
        const pattern2 = this.analyzeColumnDataPattern(sheet, col2);
        
        const relationship = this.compareDataPatterns(pattern1, pattern2, col1, col2);
        if (relationship && relationship.confidence >= options.confidenceThreshold) {
          relationships.push(relationship);
        }
      }
    }
    
    return relationships;
  }

  // Utility methods
  private static addressToColumn(cellAddress: string): number {
    const match = cellAddress.match(/^([A-Z]+)/);
    if (!match) return -1;
    
    const letters = match[1];
    let result = 0;
    for (let i = 0; i < letters.length; i++) {
      result = result * 26 + (letters.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
    }
    return result - 1;
  }

  private static columnToLetter(col: number): string {
    let result = '';
    let tempCol = col + 1;
    
    while (tempCol > 0) {
      tempCol--;
      result = String.fromCharCode('A'.charCodeAt(0) + (tempCol % 26)) + result;
      tempCol = Math.floor(tempCol / 26);
    }
    
    return result;
  }

  private static extractHeaders(sheet: Sheet): (string | null)[] {
    if (sheet.data.length === 0) return [];
    
    const firstRow = sheet.data[0];
    if (!firstRow) return [];
    
    return firstRow.map(cell => 
      cell && cell.dataType === DataType.TEXT ? String(cell.value || '') : null
    );
  }

  private static findNumericColumns(sheet: Sheet): number[] {
    const numericColumns: number[] = [];
    
    for (let col = 0; col < sheet.dimensions.cols; col++) {
      let numericCount = 0;
      let totalCount = 0;
      
      for (let row = 1; row < Math.min(sheet.data.length, 100); row++) { // Skip header, sample first 100 rows
        const rowData = sheet.data[row];
        if (rowData && rowData[col]) {
          totalCount++;
          if (rowData[col].dataType === DataType.NUMBER) {
            numericCount++;
          }
        }
      }
      
      if (totalCount > 0 && numericCount / totalCount > 0.7) { // 70% numeric threshold
        numericColumns.push(col);
      }
    }
    
    return numericColumns;
  }

  private static calculateColumnCorrelation(sheet: Sheet, col1: number, col2: number): number | null {
    const values1: number[] = [];
    const values2: number[] = [];
    
    // Extract numeric values from both columns
    for (let row = 1; row < sheet.data.length; row++) { // Skip header
      const rowData = sheet.data[row];
      if (rowData && rowData[col1] && rowData[col2]) {
        const val1 = rowData[col1];
        const val2 = rowData[col2];
        
        if (val1.dataType === DataType.NUMBER && val2.dataType === DataType.NUMBER &&
            typeof val1.value === 'number' && typeof val2.value === 'number') {
          values1.push(val1.value);
          values2.push(val2.value);
        }
      }
    }
    
    if (values1.length < 3) return null; // Need at least 3 points for correlation
    
    // Calculate Pearson correlation coefficient
    const n = values1.length;
    const sum1 = values1.reduce((a, b) => a + b, 0);
    const sum2 = values2.reduce((a, b) => a + b, 0);
    const sum1Sq = values1.reduce((a, b) => a + b * b, 0);
    const sum2Sq = values2.reduce((a, b) => a + b * b, 0);
    const pSum = values1.reduce((sum, val1, i) => sum + val1 * values2[i], 0);
    
    const num = pSum - (sum1 * sum2 / n);
    const den = Math.sqrt((sum1Sq - sum1 * sum1 / n) * (sum2Sq - sum2 * sum2 / n));
    
    return den === 0 ? 0 : num / den;
  }

  private static countFormulaReferences(
    sheet: Sheet,
    sourceCol: number,
    targetCol: number,
    dependencyGraph: DependencyGraph
  ): number {
    let count = 0;
    
    dependencyGraph.nodes.forEach(node => {
      if (node.sheet === sheet.name && node.formula) {
        const nodeCol = this.addressToColumn(node.cell);
        if (nodeCol === targetCol) {
          const referencesSource = node.precedents.some(precId => {
            const precNode = dependencyGraph.nodes.find(n => n.id === precId);
            return precNode && this.addressToColumn(precNode.cell) === sourceCol;
          });
          
          if (referencesSource) count++;
        }
      }
    });
    
    return count;
  }

  private static determineCalculationType(formula: string): CalculationType {
    const formulaUpper = formula.toUpperCase();
    
    if (formulaUpper.includes('SUM(')) return CalculationType.SUM;
    if (formulaUpper.includes('AVERAGE(') || formulaUpper.includes('MEAN(')) return CalculationType.AVERAGE;
    if (formulaUpper.includes('COUNT(')) return CalculationType.COUNT;
    if (formulaUpper.includes('%') || formulaUpper.includes('PERCENT')) return CalculationType.PERCENTAGE;
    if (formulaUpper.includes('/') && !formulaUpper.includes('VLOOKUP') && !formulaUpper.includes('HLOOKUP')) {
      return CalculationType.RATIO;
    }
    if (formulaUpper.includes('GROWTH') || formulaUpper.includes('RATE')) return CalculationType.GROWTH_RATE;
    if (formulaUpper.includes('VAR') || formulaUpper.includes('STDEV')) return CalculationType.VARIANCE;
    
    return CalculationType.CUSTOM;
  }

  private static isVolatileFormula(formula: string): boolean {
    const volatileFunctions = ['NOW()', 'TODAY()', 'RAND()', 'RANDBETWEEN()', 'INDIRECT('];
    const formulaUpper = formula.toUpperCase();
    
    return volatileFunctions.some(func => formulaUpper.includes(func));
  }

  private static detectHierarchyType(header1: string, header2: string): HierarchyType | null {
    const h1Lower = header1.toLowerCase();
    const h2Lower = header2.toLowerCase();
    
    // Temporal hierarchies
    const temporalPatterns = [
      ['year', 'month'], ['year', 'quarter'], ['quarter', 'month'],
      ['date', 'time'], ['month', 'day'], ['week', 'day']
    ];
    
    for (const [parent, child] of temporalPatterns) {
      if (h1Lower.includes(parent) && h2Lower.includes(child)) {
        return HierarchyType.TEMPORAL;
      }
    }
    
    // Organizational hierarchies
    const organizationalPatterns = [
      ['department', 'team'], ['manager', 'employee'], ['division', 'department'],
      ['company', 'division'], ['region', 'office'], ['country', 'state']
    ];
    
    for (const [parent, child] of organizationalPatterns) {
      if (h1Lower.includes(parent) && h2Lower.includes(child)) {
        return HierarchyType.ORGANIZATIONAL;
      }
    }
    
    // Geographical hierarchies
    const geographicalPatterns = [
      ['country', 'state'], ['state', 'city'], ['region', 'country'],
      ['continent', 'country'], ['city', 'district']
    ];
    
    for (const [parent, child] of geographicalPatterns) {
      if (h1Lower.includes(parent) && h2Lower.includes(child)) {
        return HierarchyType.GEOGRAPHICAL;
      }
    }
    
    // Categorical hierarchies
    const categoricalPatterns = [
      ['category', 'subcategory'], ['type', 'subtype'], ['class', 'subclass'],
      ['group', 'subgroup'], ['main', 'sub']
    ];
    
    for (const [parent, child] of categoricalPatterns) {
      if (h1Lower.includes(parent) && h2Lower.includes(child)) {
        return HierarchyType.CATEGORICAL;
      }
    }
    
    return null;
  }

  private static analyzeHierarchyStructure(sheet: Sheet, parentCol: number, childCol: number): HierarchyStructure {
    // Simplified hierarchy structure analysis
    return {
      levelNames: ['Level 1', 'Level 2'],
      relationships: [{
        parentLevel: 0,
        childLevel: 1,
        cardinality: Cardinality.ONE_TO_MANY
      }],
      aggregationRules: []
    };
  }

  private static detectMultiLevelHierarchies(sheet: Sheet, headers: (string | null)[]): DataHierarchy[] {
    // Simplified multi-level hierarchy detection
    // In a full implementation, this would analyze patterns across multiple columns
    return [];
  }

  private static analyzeColumnDataPattern(sheet: Sheet, col: number): any {
    // Simplified data pattern analysis
    // In a full implementation, this would analyze data types, formats, patterns, etc.
    return { column: col, pattern: 'generic' };
  }

  private static isHierarchicalPattern(pattern1: any, pattern2: any): boolean {
    // Simplified hierarchical pattern detection
    return false;
  }

  private static inferHierarchyTypeFromPattern(pattern1: any, pattern2: any): HierarchyType {
    return HierarchyType.CATEGORICAL;
  }

  private static analyzeColumnAggregation(sheet: Sheet, col: number): { isAggregated: boolean; sourceColumns: number[] } {
    // Simplified aggregation analysis
    return { isAggregated: false, sourceColumns: [] };
  }

  private static buildAggregationStructure(sheet: Sheet, targetCol: number, sourceColumns: number[]): HierarchyStructure {
    return {
      levelNames: ['Detail', 'Summary'],
      relationships: [{
        parentLevel: 1,
        childLevel: 0,
        cardinality: Cardinality.ONE_TO_MANY
      }],
      aggregationRules: [{
        sourceLevel: 0,
        targetLevel: 1,
        aggregationType: AggregationType.SUM
      }]
    };
  }

  private static parseLookupFormula(formula: string): any {
    // Simplified lookup formula parsing
    return null;
  }

  private static findUniqueValueColumns(sheet: Sheet): number[] {
    // Simplified unique value column detection
    return [];
  }

  private static findDetailColumns(sheet: Sheet): number[] {
    // Simplified detail column detection
    return [];
  }

  private static analyzeMasterDetailRelationship(sheet: Sheet, masterCol: number, detailCol: number): any {
    // Simplified master-detail relationship analysis
    return null;
  }

  private static analyzeColumnValidation(sheet: Sheet, col: number): any {
    // Simplified column validation analysis
    return { hasValidation: false };
  }

  private static calculateHeaderSimilarity(header1: string, header2: string): number {
    // Simple similarity calculation using Levenshtein distance
    const distance = this.levenshteinDistance(header1.toLowerCase(), header2.toLowerCase());
    const maxLength = Math.max(header1.length, header2.length);
    
    return maxLength === 0 ? 1 : 1 - (distance / maxLength);
  }

  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  private static determineSemanticRelationshipType(header1: string, header2: string): SemanticRelationshipType {
    // Simplified semantic relationship type determination
    const h1Lower = header1.toLowerCase();
    const h2Lower = header2.toLowerCase();
    
    // Check for synonyms
    const synonymPairs = [
      ['amount', 'value'], ['price', 'cost'], ['name', 'title'],
      ['date', 'time'], ['id', 'identifier'], ['num', 'number']
    ];
    
    for (const [syn1, syn2] of synonymPairs) {
      if ((h1Lower.includes(syn1) && h2Lower.includes(syn2)) ||
          (h1Lower.includes(syn2) && h2Lower.includes(syn1))) {
        return SemanticRelationshipType.SYNONYM;
      }
    }
    
    return SemanticRelationshipType.RELATED;
  }

  private static gatherSemanticEvidence(
    header1: string,
    header2: string,
    col1: number,
    col2: number,
    sheet: Sheet
  ): SemanticEvidence[] {
    const evidence: SemanticEvidence[] = [];
    
    // Header similarity evidence
    const similarity = this.calculateHeaderSimilarity(header1, header2);
    evidence.push({
      type: EvidenceType.HEADER_SIMILARITY,
      value: similarity.toString(),
      confidence: similarity,
      source: 'header_analysis'
    });
    
    // Data pattern evidence
    const correlation = this.calculateColumnCorrelation(sheet, col1, col2);
    if (correlation !== null) {
      evidence.push({
        type: EvidenceType.VALUE_CORRELATION,
        value: correlation.toString(),
        confidence: Math.abs(correlation),
        source: 'statistical_analysis'
      });
    }
    
    return evidence;
  }

  private static compareDataPatterns(pattern1: any, pattern2: any, col1: number, col2: number): SemanticRelationship | null {
    // Simplified data pattern comparison
    return null;
  }

  private static generateAnalysisMetadata(relationshipMap: RelationshipMap, analysisTime: number): AnalysisMetadata {
    const totalRelationships = 
      relationshipMap.columnDependencies.length +
      relationshipMap.dataHierarchies.length +
      relationshipMap.calculatedFields.length +
      relationshipMap.crossReferences.length +
      relationshipMap.semanticRelationships.length;
    
    const strongRelationships = 
      relationshipMap.columnDependencies.filter(d => d.strength > 0.7).length +
      relationshipMap.crossReferences.filter(r => r.strength > 0.7).length +
      relationshipMap.semanticRelationships.filter(r => r.confidence > 0.7).length;
    
    return {
      totalRelationships,
      strongRelationships,
      hierarchyCount: relationshipMap.dataHierarchies.length,
      calculatedFieldCount: relationshipMap.calculatedFields.length,
      crossReferenceCount: relationshipMap.crossReferences.length,
      analysisTime,
      confidence: totalRelationships > 0 ? strongRelationships / totalRelationships : 0
    };
  }

  private static generateRecommendations(
    relationshipMap: RelationshipMap,
    sheet: Sheet
  ): RelationshipRecommendation[] {
    const recommendations: RelationshipRecommendation[] = [];
    
    // Recommend strengthening weak dependencies
    const weakDependencies = relationshipMap.columnDependencies.filter(d => d.strength < 0.5);
    if (weakDependencies.length > 0) {
      recommendations.push({
        type: 'strengthen_relationship',
        description: `${weakDependencies.length} weak column dependencies detected`,
        columns: weakDependencies.flatMap(d => [d.sourceColumn, d.targetColumn]),
        priority: 'medium',
        impact: 'Improved data consistency and reliability'
      });
    }
    
    // Recommend hierarchy validation
    if (relationshipMap.dataHierarchies.length > 0) {
      recommendations.push({
        type: 'validate_hierarchy',
        description: 'Data hierarchies detected - consider validation',
        columns: relationshipMap.dataHierarchies.flatMap(h => [h.parentColumn, ...h.childColumns]),
        priority: 'low',
        impact: 'Better data organization and analysis capabilities'
      });
    }
    
    return recommendations;
  }
}