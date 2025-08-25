/**
 * ImprovedContextExtractor - A robust context extraction service 
 * that ensures accurate data extraction from spreadsheet selections
 */

import { SpreadsheetData, SelectionInfo, Cell, DataType } from '../types/spreadsheet';
import { ContextData } from '../types/context';

export class ImprovedContextExtractor {
  
  /**
   * Extract accurate context data from actual spreadsheet selection
   */
  static extractRealContext(
    spreadsheetData: SpreadsheetData,
    selectionInfo: SelectionInfo
  ): ContextData {
    console.log('=== ImprovedContextExtractor: Starting real context extraction ===');
    console.log('Selection Info:', JSON.stringify(selectionInfo, null, 2));
    console.log('Selection Info type:', typeof selectionInfo);
    console.log('Selection Info sheet property:', selectionInfo.sheet);
    console.log('Selection Info sheet property type:', typeof selectionInfo.sheet);
    console.log('Available sheets:', spreadsheetData.sheets.map(s => s.name));
    
    // Get the sheet - handle both 'sheet' and 'sheetName' properties for compatibility
    const sheetName = (selectionInfo as any).sheet || (selectionInfo as any).sheetName;
    console.log('Resolved sheet name:', sheetName);
    
    const sheet = spreadsheetData.sheets.find(s => s.name === sheetName);
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found`);
    }

    console.log('Found sheet:', sheet.name);
    console.log('Sheet dimensions:', sheet.dimensions);
    console.log('Sample sheet data (first 3 rows):', JSON.stringify(sheet.data.slice(0, 3), null, 2));

    // Parse the selection range
    const range = this.parseSelectionRange(selectionInfo.range);
    console.log('Parsed range:', range);

    // Extract actual cell data from the selection
    const selectedCells = this.extractSelectedCells(sheet, range);
    console.log('Extracted cells count:', selectedCells.length);
    console.log('Sample extracted data:', JSON.stringify(selectedCells.slice(0, 3), null, 2));

    // Analyze the extracted data
    const analysis = this.analyzeExtractedData(selectedCells);
    console.log('Data analysis:', analysis);

    // Build comprehensive context
    const contextData: ContextData = {
      immediate: {
        selectedData: this.convertToMatrix(selectedCells, range),
        activeCell: this.getActiveCell(sheet, selectionInfo.activeCell),
        visibleData: [selectedCells.slice(0, 100)], // First 100 cells as a single row
        currentFormulas: [],
        selectionInfo: selectionInfo
      },
      related: {
        dependentCells: [],
        precedentCells: [],
        relatedFormulas: [],
        namedRanges: [],
        crossSheetReferences: []
      },
      structural: {
        headers: analysis.headers,
        dataTypes: analysis.dataTypes,
        rowCount: analysis.rowCount,
        columnCount: analysis.columnCount,
        hasFormulas: analysis.hasFormulas,
        hasNamedRanges: false,
        sheetStructure: {
          hasHeaders: analysis.headers.length > 0,
          dataStartRow: analysis.headers.length > 0 ? 2 : 1,
          dataEndRow: analysis.rowCount,
          dataColumns: analysis.columnInfo
        }
      },
      historical: {
        recentActions: [],
        previousRequests: [],
        sessionDuration: 0,
        interactionCount: 0
      },
      patterns: {
        dataPatterns: analysis.patterns.map(pattern => ({
          type: 'trend' as const,
          description: pattern,
          confidence: 0.7,
          affectedRange: selectionInfo.range,
          severity: 'medium' as const
        })),
        insights: analysis.insights.map(insight => ({
          type: 'suggestion' as const,
          title: 'Data Insight',
          description: insight,
          actionable: true,
          priority: 'medium' as const
        })),
        anomalies: [],
        relationships: [],
        confidence: 0.9
      },
      summary: {
        rowCount: analysis.rowCount,
        columnCount: analysis.columnCount,
        cellCount: analysis.totalCells,
        formulaCount: 0,
        emptyCount: analysis.emptyCells,
        dataTypes: analysis.dataTypeCounts,
        patterns: analysis.patterns,
        statistics: {
          fillRate: analysis.totalCells > 0 ? (analysis.totalCells - analysis.emptyCells) / analysis.totalCells : 0,
          hasHeaders: analysis.headers.length > 0,
          dataDistribution: analysis.dataTypeCounts
        }
      },
      confidence: 0.9,
      generatedAt: new Date()
    };

    console.log('=== ImprovedContextExtractor: Context extraction completed ===');
    return contextData;
  }

  private static parseSelectionRange(rangeStr: string) {
    // Handle ranges like "A1:C4" or single cells like "A1"
    if (rangeStr.includes(':')) {
      const [start, end] = rangeStr.split(':');
      return {
        startCell: this.parseCellAddress(start),
        endCell: this.parseCellAddress(end),
        type: 'range' as const
      };
    } else {
      const cell = this.parseCellAddress(rangeStr);
      return {
        startCell: cell,
        endCell: cell,
        type: 'single' as const
      };
    }
  }

  private static parseCellAddress(address: string) {
    const match = address.match(/^([A-Z]+)(\d+)$/);
    if (!match) throw new Error(`Invalid cell address: ${address}`);
    
    return {
      column: this.columnToIndex(match[1]),
      row: parseInt(match[2]) - 1, // Convert to 0-based
      address: address
    };
  }

  private static columnToIndex(column: string): number {
    let result = 0;
    for (let i = 0; i < column.length; i++) {
      result = result * 26 + (column.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
    }
    return result - 1; // Convert to 0-based
  }

  private static extractSelectedCells(sheet: any, range: any): Cell[] {
    const cells: Cell[] = [];
    
    // For very large ranges, optimize by only processing actual data
    const totalCells = (range.endCell.row - range.startCell.row + 1) * (range.endCell.column - range.startCell.column + 1);
    console.log(`Processing range with ${totalCells} cells`);
    
    // If range is very large (>1000 cells), sample the data instead of processing everything
    if (totalCells > 1000) {
      console.log('Large range detected, using optimized sampling approach');
      return this.extractSampledCells(sheet, range);
    }
    
    for (let row = range.startCell.row; row <= range.endCell.row; row++) {
      for (let col = range.startCell.column; col <= range.endCell.column; col++) {
        const cellData = sheet.data[row]?.[col];
        if (cellData) {
          cells.push({
            ...cellData,
            address: this.indexToAddress(row, col)
          });
        } else {
          // Create empty cell
          cells.push({
            value: null,
            dataType: DataType.EMPTY,
            address: this.indexToAddress(row, col)
          });
        }
      }
    }
    
    return cells;
  }

  private static extractSampledCells(sheet: any, range: any): Cell[] {
    const cells: Cell[] = [];
    
    // Strategy: Sample key areas + find actual data bounds
    console.log('Extracting sampled cells from large range');
    
    // 1. First, find the actual data bounds within the range
    let actualDataBounds = this.findActualDataBounds(sheet, range);
    console.log('Actual data bounds found:', actualDataBounds);
    
    // 2. If no data found, sample the first few rows/cols to check
    if (!actualDataBounds) {
      console.log('No data bounds found, sampling first 10x10 area');
      const sampleEndRow = Math.min(range.startCell.row + 9, range.endCell.row);
      const sampleEndCol = Math.min(range.startCell.column + 9, range.endCell.column);
      
      for (let row = range.startCell.row; row <= sampleEndRow; row++) {
        for (let col = range.startCell.column; col <= sampleEndCol; col++) {
          const cellData = sheet.data[row]?.[col];
          if (cellData && cellData.value !== null && cellData.value !== undefined && cellData.value !== '') {
            cells.push({
              ...cellData,
              address: this.indexToAddress(row, col)
            });
          }
        }
      }
    } else {
      // 3. Extract all data within the actual bounds
      for (let row = actualDataBounds.startRow; row <= actualDataBounds.endRow; row++) {
        for (let col = actualDataBounds.startCol; col <= actualDataBounds.endCol; col++) {
          const cellData = sheet.data[row]?.[col];
          if (cellData) {
            cells.push({
              ...cellData,
              address: this.indexToAddress(row, col)
            });
          }
        }
      }
    }
    
    console.log(`Sampled ${cells.length} cells with data`);
    return cells;
  }

  private static findActualDataBounds(sheet: any, range: any): any {
    let minRow = null, maxRow = null, minCol = null, maxCol = null;
    let hasData = false;
    
    // Scan the range to find actual data boundaries
    for (let row = range.startCell.row; row <= range.endCell.row; row++) {
      for (let col = range.startCell.column; col <= range.endCell.column; col++) {
        const cellData = sheet.data[row]?.[col];
        if (cellData && cellData.value !== null && cellData.value !== undefined && cellData.value !== '') {
          hasData = true;
          if (minRow === null || row < minRow) minRow = row;
          if (maxRow === null || row > maxRow) maxRow = row;
          if (minCol === null || col < minCol) minCol = col;
          if (maxCol === null || col > maxCol) maxCol = col;
        }
      }
    }
    
    return hasData ? { startRow: minRow, endRow: maxRow, startCol: minCol, endCol: maxCol } : null;
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

  private static getActiveCell(sheet: any, activeCellAddress: string): Cell {
    const { row, column } = this.parseCellAddress(activeCellAddress);
    const cellData = sheet.data[row]?.[column];
    
    return cellData || {
      value: null,
      dataType: DataType.EMPTY,
      address: activeCellAddress
    };
  }

  private static convertToMatrix(cells: Cell[], range: any): Cell[][] {
    const matrix: Cell[][] = [];
    const rowCount = range.endCell.row - range.startCell.row + 1;
    const colCount = range.endCell.column - range.startCell.column + 1;
    
    for (let r = 0; r < rowCount; r++) {
      matrix[r] = [];
      for (let c = 0; c < colCount; c++) {
        const cellIndex = r * colCount + c;
        matrix[r][c] = cells[cellIndex] || {
          value: null,
          dataType: DataType.EMPTY,
          address: this.indexToAddress(range.startCell.row + r, range.startCell.column + c)
        };
      }
    }
    
    return matrix;
  }

  private static analyzeExtractedData(cells: Cell[]) {
    const analysis = {
      totalCells: cells.length,
      emptyCells: 0,
      dataTypeCounts: {} as Record<string, number>,
      dataTypes: [] as string[],
      headers: [] as string[],
      patterns: [] as string[],
      insights: [] as string[],
      hasFormulas: false,
      rowCount: 0,
      columnCount: 0,
      columnInfo: [] as any[]
    };

    console.log(`Analyzing ${cells.length} extracted cells`);

    // Count data types and empty cells
    for (const cell of cells) {
      if (!cell.value || cell.value === null || cell.value === undefined || cell.value === '') {
        analysis.emptyCells++;
        analysis.dataTypeCounts['empty'] = (analysis.dataTypeCounts['empty'] || 0) + 1;
      } else {
        const dataType = cell.dataType || 'unknown';
        analysis.dataTypeCounts[dataType] = (analysis.dataTypeCounts[dataType] || 0) + 1;
        
        if (cell.formula) {
          analysis.hasFormulas = true;
        }
        
        // Try to detect headers (first row, text values)
        if (typeof cell.value === 'string' && cell.address && cell.address.includes('1')) {
          analysis.headers.push(cell.value);
        }
      }
    }

    // Calculate dimensions
    const nonEmptyCells = cells.filter(c => c.value !== null && c.value !== undefined && c.value !== '');
    console.log(`Found ${nonEmptyCells.length} non-empty cells out of ${cells.length} total`);

    // Generate insights based on actual data
    if (nonEmptyCells.length > 0) {
      analysis.insights.push(`Found ${nonEmptyCells.length} cells with data`);
      
      // Detect data types
      const types = Object.keys(analysis.dataTypeCounts).filter(t => t !== 'empty');
      if (types.length > 0) {
        analysis.insights.push(`Data types detected: ${types.join(', ')}`);
      }
      
      // Check for headers
      if (analysis.headers.length > 0) {
        analysis.insights.push(`Potential headers found: ${analysis.headers.slice(0, 3).join(', ')}${analysis.headers.length > 3 ? '...' : ''}`);
      }
      
      // Check for formulas
      if (analysis.hasFormulas) {
        analysis.insights.push('Contains formulas');
      }
      
      // Estimate structure
      const addresses = nonEmptyCells.map(c => c.address).filter(Boolean);
      if (addresses.length > 0) {
        const rowNumbers = addresses.map(addr => parseInt(addr.replace(/[A-Z]/g, '')));
        const colLetters = addresses.map(addr => addr.replace(/[0-9]/g, ''));
        
        analysis.rowCount = Math.max(...rowNumbers) - Math.min(...rowNumbers) + 1;
        analysis.columnCount = new Set(colLetters).size;
        
        analysis.insights.push(`Data spans approximately ${analysis.rowCount} rows and ${analysis.columnCount} columns`);
      }
    } else {
      // Even if no data found, provide helpful context
      analysis.insights.push('No data found in the selected range');
      analysis.insights.push('The selection may contain only empty cells or the data might be outside the selected area');
    }

    analysis.dataTypes = Object.keys(analysis.dataTypeCounts);
    analysis.patterns = [`${analysis.totalCells} total cells analyzed`, `${analysis.emptyCells} empty cells`];

    console.log('Analysis completed:', {
      totalCells: analysis.totalCells,
      emptyCells: analysis.emptyCells,
      dataTypes: analysis.dataTypes,
      insights: analysis.insights
    });

    return analysis;
  }
}
