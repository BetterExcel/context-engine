/**
 * IntelligentAutoSelection - Advanced auto-selection engine with contextual understanding
 * 
 * This service provides intelligent data range identification based on query context,
 * relationship mapping, and multi-criteria optimization for spreadsheet analysis.
 */

import {
  SpreadsheetData,
  Sheet,
  Cell,
  DataType,
  Range,
  DependencyGraph
} from '../types/spreadsheet';
import {
  RequestAnalysis,
  IntentType,
  ColumnInfo,
  StructuralContext
} from '../types/context';
import {
  EntityMatch,
  CellMatch,
  MatchType,
  SelectionCandidate,
  ColumnReference,
  RelationshipType,
  SelectionContext,
  SelectionScope,
  SelectionPreferences,
  RelationshipMap,
  ColumnDependency,
  DataHierarchy,
  CalculatedField,
  CrossReference,
  DependencyType,
  HierarchyType,
  CalculationType,
  ReferenceType
} from '../types/intelligent-selection';
import { DependencyParser } from './DependencyParser';

// All types are now imported from the main types file

export class IntelligentAutoSelection {
  private static readonly FUZZY_THRESHOLD = 0.7;
  private static readonly MIN_CONFIDENCE = 0.3;
  private static readonly MAX_CANDIDATES = 10;

  /**
   * Find relevant data ranges based on query context and entities
   */
  public static async findRelevantData(
    spreadsheetData: SpreadsheetData,
    context: SelectionContext,
    sheetName?: string
  ): Promise<SelectionCandidate[]> {
    const targetSheet = sheetName 
      ? spreadsheetData.sheets.find(s => s.name === sheetName)
      : spreadsheetData.sheets[0];

    if (!targetSheet) {
      throw new Error(`Sheet not found: ${sheetName || 'default'}`);
    }

    // Extract entities from query
    const entities = this.extractEntities(context.query, context.entities);
    
    // Find entity matches in the sheet
    const entityMatches = await this.findEntityMatches(targetSheet, entities);
    
    // Generate selection candidates based on matches
    const candidates = this.generateSelectionCandidates(
      targetSheet,
      entityMatches,
      context
    );
    
    // Rank and filter candidates
    const rankedCandidates = this.rankSelectionCandidates(candidates, context);
    
    return rankedCandidates.slice(0, this.MAX_CANDIDATES);
  }

  /**
   * Expand selection based on relationships and context
   */
  public static expandSelection(
    baseSelection: SelectionCandidate,
    spreadsheetData: SpreadsheetData,
    context: SelectionContext
  ): SelectionCandidate {
    const sheet = spreadsheetData.sheets.find(s => s.name === baseSelection.range.sheetName);
    if (!sheet) return baseSelection;

    // Build relationship map
    const relationshipMap = this.buildRelationshipMap(sheet, spreadsheetData);
    
    // Expand based on column dependencies
    const expandedRange = this.expandByDependencies(
      baseSelection.range,
      relationshipMap,
      context
    );
    
    // Expand based on data hierarchies
    const hierarchyExpandedRange = this.expandByHierarchies(
      expandedRange,
      relationshipMap,
      context
    );
    
    // Update relevant columns
    const updatedColumns = this.updateRelevantColumns(
      baseSelection.relevantColumns,
      hierarchyExpandedRange,
      relationshipMap
    );

    return {
      ...baseSelection,
      range: hierarchyExpandedRange,
      relevantColumns: updatedColumns,
      explanation: `${baseSelection.explanation} (expanded for relationships)`,
      confidence: Math.max(0.1, baseSelection.confidence - 0.1) // Slight confidence reduction for expansion
    };
  }

  /**
   * Rank selection candidates using multi-criteria optimization
   */
  public static rankSelectionCandidates(
    candidates: SelectionCandidate[],
    context: SelectionContext
  ): SelectionCandidate[] {
    return candidates
      .map(candidate => ({
        ...candidate,
        score: this.calculateSelectionScore(candidate, context)
      }))
      .filter(candidate => candidate.confidence >= context.scope.confidenceThreshold)
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Build comprehensive relationship map for the sheet
   */
  public static buildRelationshipMap(
    sheet: Sheet,
    spreadsheetData: SpreadsheetData
  ): RelationshipMap {
    // Build dependency graph
    const dependencyGraph = DependencyParser.buildDependencyGraph(
      spreadsheetData.formulas,
      spreadsheetData.namedRanges
    );

    // Analyze column dependencies
    const columnDependencies = this.analyzeColumnDependencies(sheet, dependencyGraph);
    
    // Detect data hierarchies
    const dataHierarchies = this.detectDataHierarchies(sheet);
    
    // Identify calculated fields
    const calculatedFields = this.identifyCalculatedFields(sheet, dependencyGraph);
    
    // Find cross-references
    const crossReferences = this.findCrossReferences(sheet);

    return {
      columnDependencies,
      dataHierarchies,
      calculatedFields,
      crossReferences,
      semanticRelationships: []
    };
  }

  /**
   * Extract entities from query text
   */
  private static extractEntities(query: string, providedEntities: string[]): string[] {
    const entities = [...providedEntities];
    
    // Simple entity extraction patterns
    const patterns = [
      // Company names (capitalized words)
      /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Inc|Corp|LLC|Ltd|Co)\.?)?/g,
      // Stock symbols (2-5 uppercase letters)
      /\b[A-Z]{2,5}\b/g,
      // Numbers with units
      /\b\d+(?:\.\d+)?(?:\s*[%$€£¥]|\s*(?:million|billion|thousand|k|M|B))?/g,
      // Quoted strings
      /"([^"]+)"/g,
      // Single quoted strings
      /'([^']+)'/g
    ];

    patterns.forEach(pattern => {
      const matches = query.match(pattern);
      if (matches) {
        entities.push(...matches.map(match => match.replace(/['"]/g, '').trim()));
      }
    });

    return [...new Set(entities)].filter(entity => entity.length > 1);
  }

  /**
   * Find entity matches in the sheet data
   */
  private static async findEntityMatches(
    sheet: Sheet,
    entities: string[]
  ): Promise<EntityMatch[]> {
    const matches: EntityMatch[] = [];

    for (const entity of entities) {
      const cellMatches = this.findCellMatches(sheet, entity);
      
      if (cellMatches.length > 0) {
        const confidence = this.calculateEntityConfidence(cellMatches);
        const matchType = this.determineMatchType(cellMatches, entity);
        
        matches.push({
          entity,
          matchedCells: cellMatches,
          confidence,
          matchType,
          synonyms: [],
          context: {
            domain: 'general' as any,
            category: 'other' as any,
            attributes: []
          }
        });
      }
    }

    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Find cell matches for a specific entity
   */
  private static findCellMatches(sheet: Sheet, entity: string): CellMatch[] {
    const matches: CellMatch[] = [];
    const entityLower = entity.toLowerCase();

    for (let row = 0; row < sheet.data.length; row++) {
      const rowData = sheet.data[row];
      if (!rowData) continue;

      for (let col = 0; col < rowData.length; col++) {
        const cell = rowData[col];
        if (!cell || cell.dataType === DataType.EMPTY) continue;

        const cellValue = String(cell.value || '').toLowerCase();
        const similarity = this.calculateSimilarity(cellValue, entityLower);

        if (similarity >= this.FUZZY_THRESHOLD) {
          matches.push({
            row,
            col,
            value: cell.value,
            similarity,
            address: this.indexToAddress(row, col),
            context: {
              surroundingCells: [],
              columnHeader: undefined,
              rowContext: undefined,
              dataPattern: undefined
            }
          });
        }
      }
    }

    return matches.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Calculate similarity between two strings using fuzzy matching
   */
  private static calculateSimilarity(str1: string, str2: string): number {
    // Exact match
    if (str1 === str2) return 1.0;
    
    // Contains match
    if (str1.includes(str2) || str2.includes(str1)) return 0.9;
    
    // Levenshtein distance based similarity
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    
    if (maxLength === 0) return 1.0;
    
    return 1 - (distance / maxLength);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Generate selection candidates based on entity matches
   */
  private static generateSelectionCandidates(
    sheet: Sheet,
    entityMatches: EntityMatch[],
    context: SelectionContext
  ): SelectionCandidate[] {
    const candidates: SelectionCandidate[] = [];

    for (const entityMatch of entityMatches) {
      // Generate candidates for each matched entity
      const entityCandidates = this.generateEntityCandidates(
        sheet,
        entityMatch,
        context
      );
      candidates.push(...entityCandidates);
    }

    // Generate contextual candidates based on intent
    const contextualCandidates = this.generateContextualCandidates(
      sheet,
      context,
      entityMatches
    );
    candidates.push(...contextualCandidates);

    return candidates;
  }

  /**
   * Generate candidates for a specific entity match
   */
  private static generateEntityCandidates(
    sheet: Sheet,
    entityMatch: EntityMatch,
    context: SelectionContext
  ): SelectionCandidate[] {
    const candidates: SelectionCandidate[] = [];

    for (const cellMatch of entityMatch.matchedCells) {
      // Row-based selection (entire row)
      const rowCandidate = this.createRowCandidate(
        sheet,
        cellMatch,
        entityMatch,
        context
      );
      if (rowCandidate) candidates.push(rowCandidate);

      // Column-based selection (entire column)
      const columnCandidate = this.createColumnCandidate(
        sheet,
        cellMatch,
        entityMatch,
        context
      );
      if (columnCandidate) candidates.push(columnCandidate);

      // Cell-based selection (surrounding area)
      const cellCandidate = this.createCellCandidate(
        sheet,
        cellMatch,
        entityMatch,
        context
      );
      if (cellCandidate) candidates.push(cellCandidate);
    }

    return candidates;
  }

  /**
   * Create a complete SelectionCandidate with all required properties
   */
  private static createSelectionCandidate(
    range: Range,
    confidence: number,
    explanation: string,
    matchType: MatchType,
    relevantColumns: ColumnReference[],
    entityMatches: EntityMatch[],
    selectionType: any = 'data_range'
  ): SelectionCandidate {
    return {
      id: this.generateId(),
      range,
      confidence,
      explanation,
      matchType,
      relevantColumns,
      relatedSelections: [],
      entityMatches,
      score: confidence,
      selectionType,
      metadata: {
        cellCount: (range.endRow - range.startRow + 1) * (range.endCol - range.startCol + 1),
        dataQuality: 0.8,
        completeness: 0.8,
        hasFormulas: false,
        hasHeaders: false,
        estimatedProcessingTime: 50
      }
    };
  }

  /**
   * Generate a unique ID for selection candidates
   */
  private static generateId(): string {
    return `selection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create row-based selection candidate
   */
  private static createRowCandidate(
    sheet: Sheet,
    cellMatch: CellMatch,
    entityMatch: EntityMatch,
    context: SelectionContext
  ): SelectionCandidate | null {
    const row = cellMatch.row;
    
    // Find data boundaries for the row
    const { startCol, endCol } = this.findRowDataBoundaries(sheet, row);
    
    if (startCol === -1 || endCol === -1) return null;

    const range: Range = {
      startRow: row,
      endRow: row,
      startCol,
      endCol,
      sheetName: sheet.name
    };

    // Analyze relevant columns
    const relevantColumns = this.analyzeRelevantColumns(
      sheet,
      range,
      RelationshipType.PRIMARY
    );

    return this.createSelectionCandidate(
      range,
      entityMatch.confidence * 0.8,
      `Row containing "${entityMatch.entity}" (${cellMatch.address})`,
      entityMatch.matchType,
      relevantColumns,
      [entityMatch],
      'row_based'
    );
  }

  /**
   * Create column-based selection candidate
   */
  private static createColumnCandidate(
    sheet: Sheet,
    cellMatch: CellMatch,
    entityMatch: EntityMatch,
    context: SelectionContext
  ): SelectionCandidate | null {
    const col = cellMatch.col;
    
    // Find data boundaries for the column
    const { startRow, endRow } = this.findColumnDataBoundaries(sheet, col);
    
    if (startRow === -1 || endRow === -1) return null;

    // Include headers if requested
    const actualStartRow = context.scope.includeHeaders && startRow > 0 
      ? Math.max(0, startRow - 1) 
      : startRow;

    const range: Range = {
      startRow: actualStartRow,
      endRow,
      startCol: col,
      endCol: col,
      sheetName: sheet.name
    };

    const relevantColumns = this.analyzeRelevantColumns(
      sheet,
      range,
      RelationshipType.PRIMARY
    );

    return this.createSelectionCandidate(
      range,
      entityMatch.confidence * 0.9,
      `Column containing "${entityMatch.entity}" (${cellMatch.address})`,
      entityMatch.matchType,
      relevantColumns,
      [entityMatch],
      'column_based'
    );
  }

  /**
   * Create cell-based selection candidate (surrounding area)
   */
  private static createCellCandidate(
    sheet: Sheet,
    cellMatch: CellMatch,
    entityMatch: EntityMatch,
    context: SelectionContext
  ): SelectionCandidate | null {
    const centerRow = cellMatch.row;
    const centerCol = cellMatch.col;
    
    // Define surrounding area (3x3 by default, expandable)
    const radius = 2;
    const startRow = Math.max(0, centerRow - radius);
    const endRow = Math.min(sheet.dimensions.rows - 1, centerRow + radius);
    const startCol = Math.max(0, centerCol - radius);
    const endCol = Math.min(sheet.dimensions.cols - 1, centerCol + radius);

    const range: Range = {
      startRow,
      endRow,
      startCol,
      endCol,
      sheetName: sheet.name
    };

    const relevantColumns = this.analyzeRelevantColumns(
      sheet,
      range,
      RelationshipType.CONTEXTUAL
    );

    return this.createSelectionCandidate(
      range,
      entityMatch.confidence * 0.7,
      `Area around "${entityMatch.entity}" (${cellMatch.address})`,
      entityMatch.matchType,
      relevantColumns,
      [entityMatch],
      'cell_area'
    );
  }

  /**
   * Generate contextual candidates based on intent and overall context
   */
  private static generateContextualCandidates(
    sheet: Sheet,
    context: SelectionContext,
    entityMatches: EntityMatch[]
  ): SelectionCandidate[] {
    const candidates: SelectionCandidate[] = [];

    // Generate candidates based on intent type
    switch (context.intent.intent) {
      case IntentType.DATA_ANALYSIS:
        candidates.push(...this.generateAnalysisCandidates(sheet, entityMatches, context));
        break;
      case IntentType.FORMULA_ASSISTANCE:
        candidates.push(...this.generateFormulaCandidates(sheet, entityMatches, context));
        break;
      case IntentType.DATA_MANIPULATION:
        candidates.push(...this.generateManipulationCandidates(sheet, entityMatches, context));
        break;
      default:
        candidates.push(...this.generateDefaultCandidates(sheet, entityMatches, context));
    }

    return candidates;
  }

  // Helper methods for candidate generation
  private static generateAnalysisCandidates(
    sheet: Sheet,
    entityMatches: EntityMatch[],
    context: SelectionContext
  ): SelectionCandidate[] {
    // For analysis, prefer larger data ranges that include related columns
    const candidates: SelectionCandidate[] = [];
    
    if (entityMatches.length > 0) {
      // Find the bounding box of all entity matches
      const boundingBox = this.calculateBoundingBox(entityMatches);
      
      // Expand to include full data range
      const expandedRange = this.expandToDataBoundaries(sheet, boundingBox);
      
      const relevantColumns = this.analyzeRelevantColumns(
        sheet,
        expandedRange,
        RelationshipType.RELATED
      );

      candidates.push(this.createSelectionCandidate(
        expandedRange,
        0.8,
        'Data analysis range including all relevant entities',
        MatchType.PATTERN,
        relevantColumns,
        entityMatches,
        'data_range'
      ));
    }

    return candidates;
  }

  private static generateFormulaCandidates(
    sheet: Sheet,
    entityMatches: EntityMatch[],
    context: SelectionContext
  ): SelectionCandidate[] {
    // For formulas, focus on specific cells and their dependencies
    const candidates: SelectionCandidate[] = [];
    
    // Find cells with formulas near entity matches
    for (const entityMatch of entityMatches) {
      for (const cellMatch of entityMatch.matchedCells) {
        const formulaCells = this.findNearbyFormulaCells(sheet, cellMatch);
        
        if (formulaCells.length > 0) {
          const range = this.createRangeFromCells(formulaCells, sheet.name);
          const relevantColumns = this.analyzeRelevantColumns(
            sheet,
            range,
            RelationshipType.DEPENDENT
          );

          candidates.push(this.createSelectionCandidate(
            range,
            0.9,
            `Formula cells related to "${entityMatch.entity}"`,
            MatchType.PATTERN,
            relevantColumns,
            [entityMatch],
            'formula_range'
          ));
        }
      }
    }

    return candidates;
  }

  private static generateManipulationCandidates(
    sheet: Sheet,
    entityMatches: EntityMatch[],
    context: SelectionContext
  ): SelectionCandidate[] {
    // For manipulation, prefer row-based selections
    const candidates: SelectionCandidate[] = [];
    
    for (const entityMatch of entityMatches) {
      for (const cellMatch of entityMatch.matchedCells) {
        const rowCandidate = this.createRowCandidate(sheet, cellMatch, entityMatch, context);
        if (rowCandidate) {
          rowCandidate.confidence *= 1.1; // Boost confidence for manipulation tasks
          rowCandidate.explanation += ' (optimized for data manipulation)';
          candidates.push(rowCandidate);
        }
      }
    }

    return candidates;
  }

  private static generateDefaultCandidates(
    sheet: Sheet,
    entityMatches: EntityMatch[],
    context: SelectionContext
  ): SelectionCandidate[] {
    // Default behavior: return a mix of row and column candidates
    const candidates: SelectionCandidate[] = [];
    
    for (const entityMatch of entityMatches) {
      for (const cellMatch of entityMatch.matchedCells) {
        const rowCandidate = this.createRowCandidate(sheet, cellMatch, entityMatch, context);
        const columnCandidate = this.createColumnCandidate(sheet, cellMatch, entityMatch, context);
        
        if (rowCandidate) candidates.push(rowCandidate);
        if (columnCandidate) candidates.push(columnCandidate);
      }
    }

    return candidates;
  }

  // Utility methods
  private static calculateEntityConfidence(cellMatches: CellMatch[]): number {
    if (cellMatches.length === 0) return 0;
    
    const avgSimilarity = cellMatches.reduce((sum, match) => sum + match.similarity, 0) / cellMatches.length;
    const matchCountFactor = Math.min(1, cellMatches.length / 3); // Boost for multiple matches
    
    return avgSimilarity * (0.7 + 0.3 * matchCountFactor);
  }

  private static determineMatchType(cellMatches: CellMatch[], entity: string): MatchType {
    const exactMatches = cellMatches.filter(match => 
      String(match.value).toLowerCase() === entity.toLowerCase()
    );
    
    if (exactMatches.length > 0) return MatchType.EXACT;
    
    const highSimilarity = cellMatches.filter(match => match.similarity >= 0.9);
    if (highSimilarity.length > 0) return MatchType.FUZZY;
    
    return MatchType.PARTIAL;
  }

  private static findRowDataBoundaries(sheet: Sheet, row: number): { startCol: number; endCol: number } {
    if (row >= sheet.data.length) return { startCol: -1, endCol: -1 };
    
    const rowData = sheet.data[row];
    if (!rowData) return { startCol: -1, endCol: -1 };
    
    let startCol = -1;
    let endCol = -1;
    
    for (let col = 0; col < rowData.length; col++) {
      const cell = rowData[col];
      if (cell && cell.dataType !== DataType.EMPTY) {
        if (startCol === -1) startCol = col;
        endCol = col;
      }
    }
    
    return { startCol, endCol };
  }

  private static findColumnDataBoundaries(sheet: Sheet, col: number): { startRow: number; endRow: number } {
    let startRow = -1;
    let endRow = -1;
    
    for (let row = 0; row < sheet.data.length; row++) {
      const rowData = sheet.data[row];
      if (rowData && rowData[col] && rowData[col].dataType !== DataType.EMPTY) {
        if (startRow === -1) startRow = row;
        endRow = row;
      }
    }
    
    return { startRow, endRow };
  }

  private static analyzeRelevantColumns(
    sheet: Sheet,
    range: Range,
    relationshipType: RelationshipType
  ): ColumnReference[] {
    const columns: ColumnReference[] = [];
    
    for (let col = range.startCol; col <= range.endCol; col++) {
      // Analyze column data to determine relevance
      const columnData = this.extractColumnData(sheet, col, range.startRow, range.endRow);
      const dataType = this.determineColumnDataType(columnData);
      const relevanceScore = this.calculateColumnRelevance(columnData, relationshipType);
      
      // Get header if available
      const header = range.startRow > 0 && sheet.data[0] && sheet.data[0][col]
        ? String(sheet.data[0][col].value || '')
        : undefined;
      
      columns.push({
        index: col,
        header,
        dataType,
        relevanceScore,
        relationship: relationshipType,
        quality: {
          completeness: 0.8,
          consistency: 0.8,
          accuracy: 0.8,
          validity: 0.8,
          issues: []
        }
      });
    }
    
    return columns.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private static extractColumnData(sheet: Sheet, col: number, startRow: number, endRow: number): Cell[] {
    const data: Cell[] = [];
    
    for (let row = startRow; row <= endRow && row < sheet.data.length; row++) {
      const rowData = sheet.data[row];
      if (rowData && rowData[col]) {
        data.push(rowData[col]);
      }
    }
    
    return data;
  }

  private static determineColumnDataType(columnData: Cell[]): string {
    const typeCounts: Record<string, number> = {};
    
    columnData.forEach(cell => {
      if (cell.dataType !== DataType.EMPTY) {
        typeCounts[cell.dataType] = (typeCounts[cell.dataType] || 0) + 1;
      }
    });
    
    return Object.entries(typeCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || DataType.EMPTY;
  }

  private static calculateColumnRelevance(columnData: Cell[], relationshipType: RelationshipType): number {
    let score = 0.5; // Base score
    
    // Factor in data completeness
    const nonEmptyCount = columnData.filter(cell => cell.dataType !== DataType.EMPTY).length;
    const completeness = columnData.length > 0 ? nonEmptyCount / columnData.length : 0;
    score += completeness * 0.3;
    
    // Factor in data variety
    const uniqueValues = new Set(columnData.map(cell => cell.value)).size;
    const variety = columnData.length > 0 ? Math.min(1, uniqueValues / columnData.length) : 0;
    score += variety * 0.2;
    
    // Adjust based on relationship type
    switch (relationshipType) {
      case RelationshipType.PRIMARY:
        score *= 1.2;
        break;
      case RelationshipType.DEPENDENT:
        score *= 1.1;
        break;
      case RelationshipType.RELATED:
        score *= 1.0;
        break;
      case RelationshipType.CONTEXTUAL:
        score *= 0.9;
        break;
    }
    
    return Math.min(1, score);
  }

  private static calculateSelectionScore(
    candidate: SelectionCandidate,
    context: SelectionContext
  ): number {
    let score = candidate.confidence;
    
    // Factor in match type preference
    if (context.preferences.prioritizeExactMatches) {
      switch (candidate.matchType) {
        case MatchType.EXACT:
          score *= 1.3;
          break;
        case MatchType.FUZZY:
          score *= 1.1;
          break;
        case MatchType.SYNONYM:
          score *= 1.05;
          break;
        default:
          score *= 1.0;
      }
    }
    
    // Factor in relevant columns quality
    const avgColumnRelevance = candidate.relevantColumns.length > 0
      ? candidate.relevantColumns.reduce((sum, col) => sum + col.relevanceScore, 0) / candidate.relevantColumns.length
      : 0.5;
    score += avgColumnRelevance * 0.2;
    
    // Factor in entity match quality
    const avgEntityConfidence = candidate.entityMatches.length > 0
      ? candidate.entityMatches.reduce((sum, match) => sum + match.confidence, 0) / candidate.entityMatches.length
      : 0.5;
    score += avgEntityConfidence * 0.1;
    
    // Penalize overly large selections unless specifically requested
    const cellCount = (candidate.range.endRow - candidate.range.startRow + 1) * 
                     (candidate.range.endCol - candidate.range.startCol + 1);
    
    if (cellCount > 1000 && !context.scope.maxRows && !context.scope.maxColumns) {
      score *= 0.8; // Penalty for large selections
    }
    
    return Math.max(0, Math.min(1, score));
  }

  private static indexToAddress(row: number, col: number): string {
    let columnStr = '';
    let tempCol = col + 1;
    
    while (tempCol > 0) {
      tempCol--;
      columnStr = String.fromCharCode('A'.charCodeAt(0) + (tempCol % 26)) + columnStr;
      tempCol = Math.floor(tempCol / 26);
    }
    
    return `${columnStr}${row + 1}`;
  }

  // Additional helper methods for relationship mapping and expansion
  private static analyzeColumnDependencies(
    sheet: Sheet,
    dependencyGraph: DependencyGraph
  ): ColumnDependency[] {
    const dependencies: ColumnDependency[] = [];
    
    // Analyze formula dependencies between columns
    dependencyGraph.nodes.forEach(node => {
      if (node.formula && node.precedents.length > 0) {
        const targetCol = this.addressToColumn(node.cell);
        
        node.precedents.forEach(precId => {
          const precNode = dependencyGraph.nodes.find(n => n.id === precId);
          if (precNode && precNode.sheet === node.sheet) {
            const sourceCol = this.addressToColumn(precNode.cell);
            
            if (sourceCol !== targetCol) {
              const existingDep = dependencies.find(d => 
                d.sourceColumn === sourceCol && d.targetColumn === targetCol
              );
              
              if (!existingDep) {
                dependencies.push({
                  sourceColumn: sourceCol,
                  targetColumn: targetCol,
                  dependencyType: DependencyType.FORMULA,
                  strength: 0.8,
                  description: `Column ${this.columnToLetter(targetCol)} depends on column ${this.columnToLetter(sourceCol)}`,
                  isDirectDependency: true
                });
              }
            }
          }
        });
      }
    });
    
    return dependencies;
  }

  private static detectDataHierarchies(sheet: Sheet): DataHierarchy[] {
    const hierarchies: DataHierarchy[] = [];
    
    // Simple hierarchy detection based on column headers and data patterns
    if (sheet.data.length > 0 && sheet.data[0]) {
      const headers = sheet.data[0];
      
      // Look for hierarchical patterns in headers
      for (let col = 0; col < headers.length - 1; col++) {
        const currentHeader = String(headers[col]?.value || '').toLowerCase();
        const nextHeader = String(headers[col + 1]?.value || '').toLowerCase();
        
        // Check for common hierarchical patterns
        if (this.isHierarchicalPair(currentHeader, nextHeader)) {
          hierarchies.push({
            parentColumn: col,
            childColumns: [col + 1],
            hierarchyType: this.determineHierarchyType(currentHeader, nextHeader),
            levels: 2,
            structure: {
              levelNames: ['Level 1', 'Level 2'],
              relationships: [],
              aggregationRules: []
            }
          });
        }
      }
    }
    
    return hierarchies;
  }

  private static identifyCalculatedFields(
    sheet: Sheet,
    dependencyGraph: DependencyGraph
  ): CalculatedField[] {
    const calculatedFields: CalculatedField[] = [];
    
    dependencyGraph.nodes.forEach(node => {
      if (node.formula && node.sheet === sheet.name) {
        const col = this.addressToColumn(node.cell);
        const dependencies = node.precedents
          .map(precId => {
            const precNode = dependencyGraph.nodes.find(n => n.id === precId);
            return precNode ? this.addressToColumn(precNode.cell) : -1;
          })
          .filter(colIndex => colIndex !== -1);
        
        const calculationType = this.determineCalculationType(node.formula);
        
        calculatedFields.push({
          column: col,
          formula: node.formula,
          dependencies,
          calculationType,
          isVolatile: false,
          updateFrequency: 'on_change' as any
        });
      }
    });
    
    return calculatedFields;
  }

  private static findCrossReferences(sheet: Sheet): CrossReference[] {
    // Simplified cross-reference detection
    // In a full implementation, this would analyze data patterns for lookup tables, etc.
    return [];
  }

  private static expandByDependencies(
    baseRange: Range,
    relationshipMap: RelationshipMap,
    context: SelectionContext
  ): Range {
    if (!context.preferences.expandToDependencies) return baseRange;
    
    let expandedRange = { ...baseRange };
    
    // Find dependencies that should be included
    relationshipMap.columnDependencies.forEach(dep => {
      // If source column is in range, include target column
      if (dep.sourceColumn >= baseRange.startCol && dep.sourceColumn <= baseRange.endCol) {
        expandedRange.startCol = Math.min(expandedRange.startCol, dep.targetColumn);
        expandedRange.endCol = Math.max(expandedRange.endCol, dep.targetColumn);
      }
      
      // If target column is in range, include source column
      if (dep.targetColumn >= baseRange.startCol && dep.targetColumn <= baseRange.endCol) {
        expandedRange.startCol = Math.min(expandedRange.startCol, dep.sourceColumn);
        expandedRange.endCol = Math.max(expandedRange.endCol, dep.sourceColumn);
      }
    });
    
    return expandedRange;
  }

  private static expandByHierarchies(
    baseRange: Range,
    relationshipMap: RelationshipMap,
    context: SelectionContext
  ): Range {
    let expandedRange = { ...baseRange };
    
    // Include hierarchical columns
    relationshipMap.dataHierarchies.forEach(hierarchy => {
      // If parent column is in range, include child columns
      if (hierarchy.parentColumn >= baseRange.startCol && hierarchy.parentColumn <= baseRange.endCol) {
        hierarchy.childColumns.forEach(childCol => {
          expandedRange.startCol = Math.min(expandedRange.startCol, childCol);
          expandedRange.endCol = Math.max(expandedRange.endCol, childCol);
        });
      }
    });
    
    return expandedRange;
  }

  private static updateRelevantColumns(
    originalColumns: ColumnReference[],
    expandedRange: Range,
    relationshipMap: RelationshipMap
  ): ColumnReference[] {
    const updatedColumns = [...originalColumns];
    
    // Add new columns from expanded range
    for (let col = expandedRange.startCol; col <= expandedRange.endCol; col++) {
      if (!updatedColumns.find(c => c.index === col)) {
        // Determine relationship type based on why this column was included
        let relationshipType = RelationshipType.RELATED;
        
        const isDependency = relationshipMap.columnDependencies.some(dep => 
          dep.sourceColumn === col || dep.targetColumn === col
        );
        
        if (isDependency) {
          relationshipType = RelationshipType.DEPENDENT;
        }
        
        updatedColumns.push({
          index: col,
          header: undefined, // Would need sheet access to populate
          dataType: 'unknown',
          relevanceScore: 0.6,
          relationship: relationshipType,
          quality: {
            completeness: 0.6,
            consistency: 0.6,
            accuracy: 0.6,
            validity: 0.6,
            issues: []
          }
        });
      }
    }
    
    return updatedColumns.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  // Utility helper methods
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

  private static isHierarchicalPair(header1: string, header2: string): boolean {
    const hierarchicalPatterns = [
      ['category', 'subcategory'],
      ['group', 'subgroup'],
      ['type', 'subtype'],
      ['class', 'subclass'],
      ['department', 'team'],
      ['region', 'country'],
      ['year', 'month'],
      ['quarter', 'month']
    ];
    
    return hierarchicalPatterns.some(([parent, child]) => 
      header1.includes(parent) && header2.includes(child)
    );
  }

  private static determineHierarchyType(header1: string, header2: string): HierarchyType {
    if (header1.includes('date') || header1.includes('time') || header2.includes('date') || header2.includes('time')) {
      return HierarchyType.TEMPORAL;
    }
    
    if (header1.includes('amount') || header1.includes('value') || header1.includes('number')) {
      return HierarchyType.NUMERICAL;
    }
    
    if (header1.includes('department') || header1.includes('team') || header1.includes('manager')) {
      return HierarchyType.ORGANIZATIONAL;
    }
    
    return HierarchyType.CATEGORICAL;
  }

  private static determineCalculationType(formula: string): CalculationType {
    const formulaUpper = formula.toUpperCase();
    
    if (formulaUpper.includes('SUM(')) return CalculationType.SUM;
    if (formulaUpper.includes('AVERAGE(') || formulaUpper.includes('MEAN(')) return CalculationType.AVERAGE;
    if (formulaUpper.includes('COUNT(')) return CalculationType.COUNT;
    if (formulaUpper.includes('%') || formulaUpper.includes('PERCENT')) return CalculationType.PERCENTAGE;
    if (formulaUpper.includes('/')) return CalculationType.RATIO;
    
    return CalculationType.CUSTOM;
  }

  private static calculateBoundingBox(entityMatches: EntityMatch[]): Range {
    let minRow = Infinity;
    let maxRow = -Infinity;
    let minCol = Infinity;
    let maxCol = -Infinity;
    
    entityMatches.forEach(match => {
      match.matchedCells.forEach(cell => {
        minRow = Math.min(minRow, cell.row);
        maxRow = Math.max(maxRow, cell.row);
        minCol = Math.min(minCol, cell.col);
        maxCol = Math.max(maxCol, cell.col);
      });
    });
    
    return {
      startRow: minRow === Infinity ? 0 : minRow,
      endRow: maxRow === -Infinity ? 0 : maxRow,
      startCol: minCol === Infinity ? 0 : minCol,
      endCol: maxCol === -Infinity ? 0 : maxCol,
      sheetName: '' // Will be set by caller
    };
  }

  private static expandToDataBoundaries(sheet: Sheet, range: Range): Range {
    // Find the actual data boundaries around the given range
    let expandedStartRow = range.startRow;
    let expandedEndRow = range.endRow;
    let expandedStartCol = range.startCol;
    let expandedEndCol = range.endCol;
    
    // Expand rows to include contiguous data
    for (let row = range.startRow - 1; row >= 0; row--) {
      if (this.hasDataInRow(sheet, row, range.startCol, range.endCol)) {
        expandedStartRow = row;
      } else {
        break;
      }
    }
    
    for (let row = range.endRow + 1; row < sheet.data.length; row++) {
      if (this.hasDataInRow(sheet, row, range.startCol, range.endCol)) {
        expandedEndRow = row;
      } else {
        break;
      }
    }
    
    // Expand columns to include contiguous data
    for (let col = range.startCol - 1; col >= 0; col--) {
      if (this.hasDataInColumn(sheet, col, expandedStartRow, expandedEndRow)) {
        expandedStartCol = col;
      } else {
        break;
      }
    }
    
    for (let col = range.endCol + 1; col < sheet.dimensions.cols; col++) {
      if (this.hasDataInColumn(sheet, col, expandedStartRow, expandedEndRow)) {
        expandedEndCol = col;
      } else {
        break;
      }
    }
    
    return {
      startRow: expandedStartRow,
      endRow: expandedEndRow,
      startCol: expandedStartCol,
      endCol: expandedEndCol,
      sheetName: range.sheetName
    };
  }

  private static hasDataInRow(sheet: Sheet, row: number, startCol: number, endCol: number): boolean {
    if (row >= sheet.data.length) return false;
    
    const rowData = sheet.data[row];
    if (!rowData) return false;
    
    for (let col = startCol; col <= endCol && col < rowData.length; col++) {
      const cell = rowData[col];
      if (cell && cell.dataType !== DataType.EMPTY) {
        return true;
      }
    }
    
    return false;
  }

  private static hasDataInColumn(sheet: Sheet, col: number, startRow: number, endRow: number): boolean {
    for (let row = startRow; row <= endRow && row < sheet.data.length; row++) {
      const rowData = sheet.data[row];
      if (rowData && rowData[col] && rowData[col].dataType !== DataType.EMPTY) {
        return true;
      }
    }
    
    return false;
  }

  private static findNearbyFormulaCells(sheet: Sheet, cellMatch: CellMatch): CellMatch[] {
    const formulaCells: CellMatch[] = [];
    const searchRadius = 3;
    
    for (let row = Math.max(0, cellMatch.row - searchRadius); 
         row <= Math.min(sheet.data.length - 1, cellMatch.row + searchRadius); 
         row++) {
      const rowData = sheet.data[row];
      if (!rowData) continue;
      
      for (let col = Math.max(0, cellMatch.col - searchRadius); 
           col <= Math.min(rowData.length - 1, cellMatch.col + searchRadius); 
           col++) {
        const cell = rowData[col];
        if (cell && cell.dataType === DataType.FORMULA) {
          formulaCells.push({
            row,
            col,
            value: cell.value,
            similarity: 1.0,
            address: this.indexToAddress(row, col),
            context: {
              surroundingCells: [],
              columnHeader: undefined,
              rowContext: undefined,
              dataPattern: undefined
            }
          });
        }
      }
    }
    
    return formulaCells;
  }

  private static createRangeFromCells(cells: CellMatch[], sheetName: string): Range {
    if (cells.length === 0) {
      return {
        startRow: 0,
        endRow: 0,
        startCol: 0,
        endCol: 0,
        sheetName
      };
    }
    
    const rows = cells.map(cell => cell.row);
    const cols = cells.map(cell => cell.col);
    
    return {
      startRow: Math.min(...rows),
      endRow: Math.max(...rows),
      startCol: Math.min(...cols),
      endCol: Math.max(...cols),
      sheetName
    };
  }
}