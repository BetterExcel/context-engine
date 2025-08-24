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
        visibleData: selectedCells.slice(0, 100), // First 100 cells
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
        dataPatterns: analysis.patterns,
        insights: analysis.insights,
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

    // Count data types and empty cells
    cells.forEach(cell => {
      const dataType = cell.dataType || DataType.EMPTY;
      analysis.dataTypeCounts[dataType] = (analysis.dataTypeCounts[dataType] || 0) + 1;
      
      if (!cell.value || cell.value === '') {
        analysis.emptyCells++;
      }
      
      if (cell.formula) {
        analysis.hasFormulas = true;
      }
    });

    analysis.dataTypes = Object.keys(analysis.dataTypeCounts);

    // Try to detect headers (first row with text values)
    if (cells.length > 0) {
      // Assuming rectangular selection, estimate dimensions
      const firstCell = cells[0];
      if (firstCell?.address) {
        // This is a simplified approach - in reality you'd calculate based on range
        analysis.rowCount = Math.ceil(Math.sqrt(cells.length));
        analysis.columnCount = Math.ceil(cells.length / analysis.rowCount);
      }

      // Look for potential headers in first row
      const firstRowSize = analysis.columnCount;
      const firstRowCells = cells.slice(0, firstRowSize);
      
      if (firstRowCells.every(cell => 
        cell.dataType === DataType.TEXT || 
        cell.dataType === DataType.STRING
      )) {
        analysis.headers = firstRowCells.map(cell => 
          cell.value?.toString() || ''
        );
      }
    }

    // Generate insights
    if (analysis.emptyCells > analysis.totalCells * 0.5) {
      analysis.insights.push('Selection contains many empty cells');
    }
    
    if (analysis.dataTypeCounts[DataType.NUMBER] > 0) {
      analysis.insights.push('Contains numeric data suitable for calculations');
    }
    
    if (analysis.headers.length > 0) {
      analysis.insights.push('Data appears to have header row');
    }

    return analysis;
  }
}
