/**
 * ContextExtractor - Extracts relevant contextual information from spreadsheet data
 * 
 * This service analyzes spreadsheet data and user selections to generate
 * comprehensive context for LLM processing, including immediate context,
 * related data, structural information, and basic data summaries.
 */

import {
  ContextData,
  ImmediateContext,
  RelatedContext,
  StructuralContext,
  HistoricalContext,
  PatternInsights,
  DataSummary,
  ScopeInfo,
  ColumnInfo,
  SheetStructure,
  UserAction
} from '../types/context';
import {
  SpreadsheetData,
  Sheet,
  Cell,
  DataType,
  Formula,
  SelectionInfo,
  Range,
  DependencyGraph,
  DependencyNode
} from '../types/spreadsheet';
import { DependencyParser } from './DependencyParser';
import { OpenAIService } from './OpenAIService';
import { PatternAnalyzer } from './PatternAnalyzer';

export interface ContextExtractionOptions {
  includeRelated?: boolean;
  includeHistory?: boolean;
  maxCells?: number;
  includeStatistics?: boolean;
}

export class ContextExtractor {
  private static readonly DEFAULT_MAX_CELLS = 1000;
  private static readonly VISIBLE_RANGE_BUFFER = 5; // Extra rows/cols around selection
  private static patternAnalyzer?: PatternAnalyzer;

  /**
   * Set OpenAI service for enhanced pattern analysis
   */
  public static setOpenAIService(service: OpenAIService): void {
    this.patternAnalyzer = new PatternAnalyzer(service);
  }

  /**
   * Extracts relevant contextual data based on scope and selection
   */
  public static async extractRelevantData(
    spreadsheetData: SpreadsheetData,
    selectionInfo: SelectionInfo,
    scope: ScopeInfo,
    options: ContextExtractionOptions = {}
  ): Promise<ContextData> {
    console.log('=== ContextExtractor.extractRelevantData START ===');
    console.log('SpreadsheetData structure:', {
      sheetsCount: spreadsheetData.sheets?.length || 0,
      firstSheetName: spreadsheetData.sheets?.[0]?.name,
      firstSheetDataRows: spreadsheetData.sheets?.[0]?.data?.length || 0,
      firstSheetDimensions: spreadsheetData.sheets?.[0]?.dimensions,
      formulasCount: spreadsheetData.formulas?.length || 0
    });
    console.log('SelectionInfo:', JSON.stringify(selectionInfo, null, 2));
    console.log('Sample sheet data (first 3 rows):', 
      JSON.stringify(spreadsheetData.sheets?.[0]?.data?.slice(0, 3) || [], null, 2));
    
    const maxCells = options.maxCells || scope.maxCells || this.DEFAULT_MAX_CELLS;
    
    // Extract immediate context
    const immediate = this.extractImmediateContext(
      spreadsheetData,
      selectionInfo,
      maxCells
    );

    // Extract related context if requested
    const related = options.includeRelated || scope.includeRelated
      ? this.extractRelatedContext(spreadsheetData, selectionInfo, immediate)
      : this.createEmptyRelatedContext();

    // Extract structural context
    const structural = this.extractStructuralContext(
      spreadsheetData,
      selectionInfo,
      scope
    );

    // Extract historical context if requested
    const historical = options.includeHistory || scope.includeHistory
      ? this.extractHistoricalContext([]) // Empty for now, will be populated from session data
      : this.createEmptyHistoricalContext();

    // Generate data summary
    const summary = this.generateDataSummary(immediate, structural, options.includeStatistics);

    // Calculate overall confidence
    const confidence = this.calculateContextConfidence(immediate, related, structural);

    // Create initial context data for pattern analysis
    const initialContextData: ContextData = {
      immediate,
      related,
      structural,
      historical,
      patterns: this.generateBasicPatternInsights(immediate, structural), // Temporary
      summary,
      confidence,
      generatedAt: new Date()
    };

    // Generate enhanced pattern insights using PatternAnalyzer
    const patterns = await this.generatePatternInsights(initialContextData);

    return {
      ...initialContextData,
      patterns
    };
  }

  /**
   * Extracts immediate context (selected cells, active cell, visible data)
   */
  private static extractImmediateContext(
    spreadsheetData: SpreadsheetData,
    selectionInfo: SelectionInfo,
    maxCells: number
  ): ImmediateContext {
    console.log('=== Extracting Immediate Context ===');
    
    const sheet = this.findSheet(spreadsheetData, selectionInfo.sheet);
    if (!sheet) {
      console.error(`Sheet "${selectionInfo.sheet}" not found!`);
      throw new ContextExtractionError(
        `Sheet "${selectionInfo.sheet}" not found`,
        'SHEET_NOT_FOUND'
      );
    }
    
    console.log('Found sheet:', sheet.name, 'with dimensions:', sheet.dimensions);
    console.log('Selection range:', selectionInfo.range);

    // Parse selection range
    const selectionRange = this.parseRange(selectionInfo.range, sheet);
    console.log('Parsed selection range:', selectionRange);
    
    const activeCellAddress = selectionInfo.activeCell;
    const activeCellCoords = this.parseCellAddress(activeCellAddress);
    console.log('Active cell coords:', activeCellCoords);

    // Extract selected data
    const selectedData = this.extractCellsFromRange(sheet, selectionRange, maxCells);
    console.log('Extracted selected data:', {
      rowCount: selectedData.length,
      colCount: selectedData[0]?.length || 0,
      sampleData: selectedData.slice(0, 2).map(row => row.slice(0, 3))
    });

    // Get active cell
    const activeCell = this.getCellAt(sheet, activeCellCoords.row, activeCellCoords.col);

    // Extract visible data (area around selection)
    const visibleRange = this.calculateVisibleRange(selectionRange, sheet);
    const visibleData = this.extractCellsFromRange(sheet, visibleRange, maxCells * 2);

    // Get current formulas in the selection
    const currentFormulas = this.extractFormulasFromRange(
      spreadsheetData.formulas,
      selectionInfo.sheet,
      selectionRange
    );

    return {
      selectedData,
      activeCell,
      visibleData,
      currentFormulas,
      selectionInfo
    };
  }

  /**
   * Extracts related context (dependent/precedent cells, related formulas)
   */
  private static extractRelatedContext(
    spreadsheetData: SpreadsheetData,
    selectionInfo: SelectionInfo,
    _immediate: ImmediateContext
  ): RelatedContext {
    const sheet = this.findSheet(spreadsheetData, selectionInfo.sheet);
    if (!sheet) {
      return this.createEmptyRelatedContext();
    }

    // Build dependency graph
    const dependencyGraph = DependencyParser.buildDependencyGraph(
      spreadsheetData.formulas,
      spreadsheetData.namedRanges
    );

    // Find dependent and precedent cells using dependency graph
    const { dependentCells, precedentCells } = this.findDependentCellsWithGraph(
      spreadsheetData,
      selectionInfo,
      dependencyGraph
    );

    // Find related formulas
    const relatedFormulas = this.findRelatedFormulasWithGraph(
      spreadsheetData.formulas,
      selectionInfo,
      dependencyGraph
    );

    // Get named ranges that intersect with selection
    const namedRanges = this.findIntersectingNamedRanges(
      spreadsheetData.namedRanges,
      selectionInfo
    );

    // Find cross-sheet references using dependency graph
    const crossSheetReferences = this.findCrossSheetReferencesWithGraph(
      dependencyGraph,
      selectionInfo.sheet
    );

    return {
      dependentCells,
      precedentCells,
      relatedFormulas,
      namedRanges,
      crossSheetReferences
    };
  }

  /**
   * Extracts structural context (headers, data types, sheet structure)
   */
  private static extractStructuralContext(
    spreadsheetData: SpreadsheetData,
    selectionInfo: SelectionInfo,
    _scope: ScopeInfo
  ): StructuralContext {
    const sheet = this.findSheet(spreadsheetData, selectionInfo.sheet);
    if (!sheet) {
      throw new ContextExtractionError(
        `Sheet "${selectionInfo.sheet}" not found`,
        'SHEET_NOT_FOUND'
      );
    }

    // Analyze sheet structure
    const sheetStructure = this.analyzeSheetStructure(sheet);
    
    // Extract headers
    const headers = this.extractHeaders(sheet, sheetStructure);
    
    // Analyze data types in the relevant area
    const selectionRange = this.parseRange(selectionInfo.range, sheet);
    const dataTypes = this.analyzeDataTypes(sheet, selectionRange);
    
    // Get column information
    const dataColumns = this.analyzeColumns(sheet, selectionRange, sheetStructure);

    return {
      headers,
      dataTypes,
      columnCount: selectionRange.endCol - selectionRange.startCol + 1,
      rowCount: selectionRange.endRow - selectionRange.startRow + 1,
      hasFormulas: this.hasFormulasInRange(sheet, selectionRange),
      hasNamedRanges: spreadsheetData.namedRanges.length > 0,
      sheetStructure: {
        ...sheetStructure,
        dataColumns
      }
    };
  }

  /**
   * Extracts historical context from user actions
   */
  private static extractHistoricalContext(recentActions: UserAction[]): HistoricalContext {
    // Basic implementation - in a real system, this would come from session storage
    return {
      recentActions: recentActions.slice(-10), // Last 10 actions
      previousRequests: [], // Would be populated from session data
      sessionDuration: 0, // Would be calculated from session start
      interactionCount: recentActions.length
    };
  }

  /**
   * Generates pattern insights using PatternAnalyzer with AI and rule-based analysis
   */
  private static async generatePatternInsights(
    contextData: ContextData
  ): Promise<PatternInsights> {
    // Use PatternAnalyzer if available
    if (this.patternAnalyzer) {
      try {
        return await this.patternAnalyzer.analyzePatterns(contextData, {
          includeStatistics: true,
          enableAIAnalysis: true,
          confidenceThreshold: 0.7
        });
      } catch (error) {
        console.warn('PatternAnalyzer failed, falling back to basic analysis:', error);
      }
    }

    // Fallback to basic pattern detection
    return this.generateBasicPatternInsights(contextData.immediate, contextData.structural);
  }

  /**
   * Generates basic pattern insights (rule-based fallback)
   */
  private static generateBasicPatternInsights(
    immediate: ImmediateContext,
    _structural: StructuralContext
  ): PatternInsights {
    // Basic rule-based pattern detection
    const patterns: any[] = [];
    const relationships: any[] = [];
    const anomalies: any[] = [];
    const insights: any[] = [];

    // Detect missing data pattern
    const emptyCells = this.countEmptyCells(immediate.selectedData);
    if (emptyCells > 0) {
      patterns.push({
        type: 'missing_data' as const,
        description: `Found ${emptyCells} empty cells in selection`,
        confidence: 0.9,
        affectedRange: immediate.selectionInfo.range,
        severity: emptyCells > immediate.selectedData.length * 0.1 ? 'medium' as const : 'low' as const
      });
    }

    // Detect if data has consistent types
    const typeConsistency = this.analyzeTypeConsistency(immediate.selectedData);
    if (typeConsistency.inconsistent) {
      patterns.push({
        type: 'outlier' as const,
        description: 'Mixed data types detected in selection',
        confidence: 0.8,
        affectedRange: immediate.selectionInfo.range,
        severity: 'medium' as const
      });
    }

    return {
      dataPatterns: patterns,
      relationships,
      anomalies,
      insights,
      confidence: patterns.length > 0 ? 0.7 : 0.3
    };
  }

  /**
   * Generates comprehensive data summary
   */
  private static generateDataSummary(
    immediate: ImmediateContext,
    structural: StructuralContext,
    includeStatistics: boolean = false
  ): DataSummary {
    const selectedCells = immediate.selectedData.flat();
    const totalCells = selectedCells.length;
    const emptyCells = selectedCells.filter(cell => cell.dataType === DataType.EMPTY).length;
    const formulaCells = selectedCells.filter(cell => cell.dataType === DataType.FORMULA).length;

    // Count data types
    const dataTypes: Record<string, number> = {};
    selectedCells.forEach(cell => {
      dataTypes[cell.dataType] = (dataTypes[cell.dataType] || 0) + 1;
    });

    // Basic patterns
    const patterns = [];
    if (emptyCells > 0) patterns.push('missing_values');
    if (formulaCells > 0) patterns.push('contains_formulas');
    if (structural.hasNamedRanges) patterns.push('named_ranges');

    const summary: DataSummary = {
      rowCount: structural.rowCount,
      columnCount: structural.columnCount,
      cellCount: totalCells,
      formulaCount: formulaCells,
      emptyCount: emptyCells,
      dataTypes,
      patterns
    };

    // Add basic statistics if requested
    if (includeStatistics) {
      summary.statistics = this.calculateBasicStatistics(selectedCells);
    }

    return summary;
  }

  /**
   * Calculates basic statistics for numeric data
   */
  private static calculateBasicStatistics(cells: Cell[]): Record<string, any> {
    const numericCells = cells.filter(cell => 
      cell.dataType === DataType.NUMBER && 
      typeof cell.value === 'number' && 
      !isNaN(cell.value)
    );

    if (numericCells.length === 0) {
      return { hasNumericData: false };
    }

    const values = numericCells.map(cell => cell.value as number);
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    const sortedValues = [...values].sort((a, b) => a - b);
    
    return {
      hasNumericData: true,
      count: values.length,
      sum,
      mean,
      min: Math.min(...values),
      max: Math.max(...values),
      median: sortedValues[Math.floor(sortedValues.length / 2)]
    };
  }

  /**
   * Calculates overall context confidence score
   */
  private static calculateContextConfidence(
    immediate: ImmediateContext,
    related: RelatedContext,
    structural: StructuralContext
  ): number {
    let confidence = 0.5; // Base confidence

    // Boost confidence based on data availability
    if (immediate.selectedData.length > 0) confidence += 0.2;
    if (immediate.currentFormulas.length > 0) confidence += 0.1;
    if (related.dependentCells.length > 0 || related.precedentCells.length > 0) confidence += 0.1;
    if (structural.headers.length > 0) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  // Helper methods

  private static findSheet(spreadsheetData: SpreadsheetData, sheetName: string): Sheet | null {
    return spreadsheetData.sheets.find(sheet => sheet.name === sheetName) || null;
  }

  private static parseRange(rangeStr: string, sheet: Sheet): Range {
    // Simple range parsing (e.g., "A1:C10")
    const match = rangeStr.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
    if (!match) {
      // Single cell reference
      const cellMatch = rangeStr.match(/^([A-Z]+)(\d+)$/);
      if (cellMatch && cellMatch[1] && cellMatch[2]) {
        const col = this.columnToIndex(cellMatch[1]);
        const row = parseInt(cellMatch[2]) - 1;
        return {
          startRow: row,
          startCol: col,
          endRow: row,
          endCol: col,
          sheetName: sheet.name
        };
      }
      throw new ContextExtractionError(`Invalid range format: ${rangeStr}`, 'INVALID_RANGE');
    }

    if (!match[1] || !match[2] || !match[3] || !match[4]) {
      throw new ContextExtractionError(`Invalid range format: ${rangeStr}`, 'INVALID_RANGE');
    }

    return {
      startRow: parseInt(match[2]) - 1,
      startCol: this.columnToIndex(match[1]),
      endRow: parseInt(match[4]) - 1,
      endCol: this.columnToIndex(match[3]),
      sheetName: sheet.name
    };
  }

  private static parseCellAddress(address: string): { row: number; col: number } {
    const match = address.match(/^([A-Z]+)(\d+)$/);
    if (!match || !match[1] || !match[2]) {
      throw new ContextExtractionError(`Invalid cell address: ${address}`, 'INVALID_CELL_ADDRESS');
    }

    return {
      row: parseInt(match[2]) - 1,
      col: this.columnToIndex(match[1])
    };
  }

  private static columnToIndex(column: string): number {
    let result = 0;
    for (let i = 0; i < column.length; i++) {
      result = result * 26 + (column.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
    }
    return result - 1;
  }

  private static extractCellsFromRange(sheet: Sheet, range: Range, maxCells: number): Cell[][] {
    const result: Cell[][] = [];
    let cellCount = 0;

    for (let row = range.startRow; row <= range.endRow && cellCount < maxCells; row++) {
      const rowData: Cell[] = [];
      for (let col = range.startCol; col <= range.endCol && cellCount < maxCells; col++) {
        const cell = this.getCellAt(sheet, row, col);
        rowData.push(cell);
        cellCount++;
      }
      if (rowData.length > 0) {
        result.push(rowData);
      }
    }

    return result;
  }

  private static getCellAt(sheet: Sheet, row: number, col: number): Cell {
    if (row < 0 || row >= sheet.dimensions.rows || col < 0 || col >= sheet.dimensions.cols) {
      return {
        value: null,
        dataType: DataType.EMPTY,
        address: this.indexToAddress(row, col)
      };
    }

    const rowData = sheet.data[row];
    if (!rowData || !rowData[col]) {
      return {
        value: null,
        dataType: DataType.EMPTY,
        address: this.indexToAddress(row, col)
      };
    }

    return rowData[col];
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

  private static calculateVisibleRange(selectionRange: Range, sheet: Sheet): Range {
    const buffer = this.VISIBLE_RANGE_BUFFER;
    
    return {
      startRow: Math.max(0, selectionRange.startRow - buffer),
      startCol: Math.max(0, selectionRange.startCol - buffer),
      endRow: Math.min(sheet.dimensions.rows - 1, selectionRange.endRow + buffer),
      endCol: Math.min(sheet.dimensions.cols - 1, selectionRange.endCol + buffer),
      sheetName: selectionRange.sheetName
    };
  }

  private static extractFormulasFromRange(
    formulas: Formula[],
    sheetName: string,
    range: Range
  ): Formula[] {
    return formulas.filter(formula => {
      const cellRef = `${formula.sheet}!${formula.cell}`;
      if (!cellRef.startsWith(`${sheetName}!`)) return false;
      
      const address = cellRef.substring(sheetName.length + 1);
      try {
        const coords = this.parseCellAddress(address);
        return coords.row >= range.startRow && coords.row <= range.endRow &&
               coords.col >= range.startCol && coords.col <= range.endCol;
      } catch {
        return false;
      }
    });
  }

  private static analyzeSheetStructure(sheet: Sheet): SheetStructure {
    // Simple heuristic to detect headers
    let hasHeaders = false;
    let headerRow = 0;
    let dataStartRow = 0;

    // Check if first row looks like headers (mostly text)
    if (sheet.data.length > 0 && sheet.data[0]) {
      const firstRow = sheet.data[0];
      const textCells = firstRow.filter(cell => cell.dataType === DataType.TEXT).length;
      hasHeaders = textCells > firstRow.length * 0.5;
      
      if (hasHeaders) {
        headerRow = 0;
        dataStartRow = 1;
      }
    }

    // Find last row with data
    let dataEndRow = sheet.dimensions.rows - 1;
    for (let row = sheet.dimensions.rows - 1; row >= 0; row--) {
      const rowData = sheet.data[row];
      if (rowData && rowData.some(cell => cell.dataType !== DataType.EMPTY)) {
        dataEndRow = row;
        break;
      }
    }

    const result: SheetStructure = {
      hasHeaders,
      dataStartRow,
      dataEndRow,
      dataColumns: [] // Will be populated by caller
    };

    if (hasHeaders) {
      result.headerRow = headerRow;
    }

    return result;
  }

  private static extractHeaders(sheet: Sheet, structure: SheetStructure): string[] {
    if (!structure.hasHeaders || structure.headerRow === undefined) {
      return [];
    }

    const headerRow = sheet.data[structure.headerRow];
    if (!headerRow) return [];

    return headerRow.map(cell => 
      cell.dataType === DataType.TEXT ? String(cell.value || '') : ''
    );
  }

  private static analyzeDataTypes(sheet: Sheet, range: Range): string[] {
    const types = new Set<string>();
    
    for (let row = range.startRow; row <= range.endRow; row++) {
      for (let col = range.startCol; col <= range.endCol; col++) {
        const cell = this.getCellAt(sheet, row, col);
        types.add(cell.dataType);
      }
    }

    return Array.from(types);
  }

  private static analyzeColumns(sheet: Sheet, range: Range, structure: SheetStructure): ColumnInfo[] {
    const columns: ColumnInfo[] = [];

    for (let col = range.startCol; col <= range.endCol; col++) {
      const columnData: Cell[] = [];
      
      for (let row = range.startRow; row <= range.endRow; row++) {
        columnData.push(this.getCellAt(sheet, row, col));
      }

      const nonEmptyCells = columnData.filter(cell => cell.dataType !== DataType.EMPTY);
      const formulaCells = columnData.filter(cell => cell.dataType === DataType.FORMULA);
      
      // Determine primary data type
      const typeCounts: Record<string, number> = {};
      nonEmptyCells.forEach(cell => {
        typeCounts[cell.dataType] = (typeCounts[cell.dataType] || 0) + 1;
      });
      
      const primaryType = Object.entries(typeCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || DataType.EMPTY;

      const columnInfo: ColumnInfo = {
        index: col,
        header: structure.hasHeaders && structure.headerRow !== undefined 
          ? this.getCellAt(sheet, structure.headerRow, col).value?.toString()
          : undefined,
        dataType: primaryType,
        hasFormulas: formulaCells.length > 0,
        isEmpty: nonEmptyCells.length === 0,
        uniqueValues: new Set(nonEmptyCells.map(cell => cell.value)).size
      };

      columns.push(columnInfo);
    }

    return columns;
  }

  private static hasFormulasInRange(sheet: Sheet, range: Range): boolean {
    for (let row = range.startRow; row <= range.endRow; row++) {
      for (let col = range.startCol; col <= range.endCol; col++) {
        const cell = this.getCellAt(sheet, row, col);
        if (cell.dataType === DataType.FORMULA) {
          return true;
        }
      }
    }
    return false;
  }

  private static countEmptyCells(data: Cell[][]): number {
    return data.flat().filter(cell => cell.dataType === DataType.EMPTY).length;
  }

  private static analyzeTypeConsistency(data: Cell[][]): { inconsistent: boolean; types: string[] } {
    const types = new Set<string>();
    data.flat().forEach(cell => {
      if (cell.dataType !== DataType.EMPTY) {
        types.add(cell.dataType);
      }
    });

    return {
      inconsistent: types.size > 1,
      types: Array.from(types)
    };
  }

  // Enhanced dependency-based methods
  private static findDependentCellsWithGraph(
    spreadsheetData: SpreadsheetData,
    selectionInfo: SelectionInfo,
    dependencyGraph: DependencyGraph
  ): { dependentCells: Cell[]; precedentCells: Cell[] } {
    const dependentCells: Cell[] = [];
    const precedentCells: Cell[] = [];
    
    // Get selected range
    const sheet = this.findSheet(spreadsheetData, selectionInfo.sheet);
    if (!sheet) return { dependentCells, precedentCells };
    
    const selectionRange = this.parseRange(selectionInfo.range, sheet);
    
    // For each cell in selection, find its dependents and precedents
    for (let row = selectionRange.startRow; row <= selectionRange.endRow; row++) {
      for (let col = selectionRange.startCol; col <= selectionRange.endCol; col++) {
        const cellAddress = this.indexToAddress(row, col);
        const cellId = `${selectionInfo.sheet}!${cellAddress}`;
        
        // Find dependents
        const dependents = DependencyParser.findDependents(cellId, dependencyGraph);
        dependents.forEach(depNode => {
          const depCell = this.getCellFromNode(spreadsheetData, depNode);
          if (depCell && !dependentCells.find(c => c.address === depCell.address)) {
            dependentCells.push(depCell);
          }
        });
        
        // Also find cells that depend on this cell (by checking all nodes for precedents that match this cell)
        dependencyGraph.nodes.forEach(node => {
          if (node.precedents.includes(cellId)) {
            const depCell = this.getCellFromNode(spreadsheetData, node);
            if (depCell && !dependentCells.find(c => c.address === depCell.address)) {
              dependentCells.push(depCell);
            }
          }
        });
        
        // Find precedents
        const precedents = DependencyParser.findPrecedents(cellId, dependencyGraph);
        precedents.forEach(precNode => {
          const precCell = this.getCellFromNode(spreadsheetData, precNode);
          if (precCell && !precedentCells.find(c => c.address === precCell.address)) {
            precedentCells.push(precCell);
          }
        });
        
        // Also check direct precedents from the current node (for cells that are referenced but don't have formulas)
        const currentNode = dependencyGraph.nodes.find(n => n.id === cellId);
        if (currentNode) {
          currentNode.precedents.forEach(precId => {
            // Try to get the cell even if it's not a node in the graph
            const [precSheet, precAddress] = precId.split('!');
            if (precSheet && precAddress) {
              const precSheetObj = this.findSheet(spreadsheetData, precSheet);
              if (precSheetObj) {
                try {
                  const coords = this.parseCellAddress(precAddress);
                  const precCell = this.getCellAt(precSheetObj, coords.row, coords.col);
                  if (precCell && !precedentCells.find(c => c.address === precCell.address)) {
                    precedentCells.push(precCell);
                  }
                } catch {
                  // Ignore invalid cell addresses
                }
              }
            }
          });
        }
      }
    }
    
    return { dependentCells, precedentCells };
  }

  private static findRelatedFormulasWithGraph(
    formulas: Formula[],
    selectionInfo: SelectionInfo,
    dependencyGraph: DependencyGraph
  ): Formula[] {
    const relatedFormulas: Formula[] = [];
    // Parse selection range for filtering - simplified version
    const rangeParts = selectionInfo.range.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
    if (!rangeParts) {
      // Single cell selection
      const cellId = `${selectionInfo.sheet}!${selectionInfo.range}`;
      const dependents = DependencyParser.findDependents(cellId, dependencyGraph);
      const precedents = DependencyParser.findPrecedents(cellId, dependencyGraph);
      
      [...dependents, ...precedents].forEach(node => {
        if (node.formula) {
          const formula = formulas.find(f => 
            f.sheet === node.sheet && f.cell === node.cell
          );
          if (formula && !relatedFormulas.find(rf => rf.id === formula.id)) {
            relatedFormulas.push(formula);
          }
        }
      });
      
      return relatedFormulas;
    }
    
    // For range selections, check each cell in the range
    const startCol = this.columnToIndex(rangeParts[1]!);
    const startRow = parseInt(rangeParts[2]!) - 1;
    const endCol = this.columnToIndex(rangeParts[3]!);
    const endRow = parseInt(rangeParts[4]!) - 1;
    
    // Find formulas that reference or are referenced by the selection
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const cellAddress = this.indexToAddress(row, col);
        const cellId = `${selectionInfo.sheet}!${cellAddress}`;
        
        // Find all nodes that depend on or are depended by this cell
        const dependents = DependencyParser.findDependents(cellId, dependencyGraph);
        const precedents = DependencyParser.findPrecedents(cellId, dependencyGraph);
        
        [...dependents, ...precedents].forEach(node => {
          if (node.formula) {
            const formula = formulas.find(f => 
              f.sheet === node.sheet && f.cell === node.cell
            );
            if (formula && !relatedFormulas.find(rf => rf.id === formula.id)) {
              relatedFormulas.push(formula);
            }
          }
        });
      }
    }
    
    return relatedFormulas;
  }

  private static findIntersectingNamedRanges(
    namedRanges: any[],
    selectionInfo: SelectionInfo
  ): any[] {
    // Enhanced implementation to find named ranges that intersect with selection
    const intersecting: any[] = [];
    
    namedRanges.forEach(namedRange => {
      if (namedRange.sheetName === selectionInfo.sheet) {
        // Simple intersection check - could be enhanced
        if (this.rangesIntersect(namedRange.range, selectionInfo.range)) {
          intersecting.push(namedRange);
        }
      }
    });
    
    return intersecting;
  }

  private static findCrossSheetReferencesWithGraph(
    dependencyGraph: DependencyGraph,
    currentSheet: string
  ): string[] {
    const crossSheetRefs: string[] = [];
    
    dependencyGraph.nodes.forEach(node => {
      if (node.sheet === currentSheet) {
        // Check if this node has dependencies on other sheets
        node.precedents.forEach(precId => {
          const precNode = dependencyGraph.nodes.find(n => n.id === precId);
          if (precNode && precNode.sheet !== currentSheet) {
            const ref = `${precNode.sheet}!${precNode.cell}`;
            if (!crossSheetRefs.includes(ref)) {
              crossSheetRefs.push(ref);
            }
          }
        });
      }
    });
    
    return crossSheetRefs;
  }

  private static getCellFromNode(spreadsheetData: SpreadsheetData, node: DependencyNode): Cell | null {
    const sheet = this.findSheet(spreadsheetData, node.sheet);
    if (!sheet) return null;
    
    try {
      const coords = this.parseCellAddress(node.cell);
      return this.getCellAt(sheet, coords.row, coords.col);
    } catch {
      return null;
    }
  }

  private static rangesIntersect(_range1: string, _range2: string): boolean {
    // Simple range intersection check - could be enhanced
    // For now, just return true if they're on the same sheet
    return true; // Placeholder implementation
  }

  private static createEmptyRelatedContext(): RelatedContext {
    return {
      dependentCells: [],
      precedentCells: [],
      relatedFormulas: [],
      namedRanges: [],
      crossSheetReferences: []
    };
  }

  private static createEmptyHistoricalContext(): HistoricalContext {
    return {
      recentActions: [],
      previousRequests: [],
      sessionDuration: 0,
      interactionCount: 0
    };
  }
}

export class ContextExtractionError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'ContextExtractionError';
  }
}