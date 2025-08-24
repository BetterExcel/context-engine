import { SpreadsheetData, Sheet, DataType } from '../types';

export interface DataBoundaries {
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
  totalCells: number;
  emptyCells: number;
  hasHeaders: boolean;
}

export interface SelectionState {
  range: string;
  isManual: boolean;
  timestamp: Date;
  boundaries?: DataBoundaries;
  sheetIndex: number;
}

export interface DefaultSelectionConfig {
  maxCells: number; // Maximum cells to select by default
  includeHeaders: boolean;
  minimumRange: string; // Fallback minimum range (e.g., "A1:J20")
  respectUserSelections: boolean;
}

/**
 * AutoSelectionManager manages intelligent default selection and user selection preferences
 * for spreadsheet data. It tracks selection state per sheet and distinguishes between
 * automatic and manual user selections.
 */
export class AutoSelectionManager {
  private selectionStates: Map<number, SelectionState> = new Map();
  private spreadsheetData: SpreadsheetData | null = null;
  private config: DefaultSelectionConfig;

  private static readonly DEFAULT_CONFIG: DefaultSelectionConfig = {
    maxCells: 100000, // 100k cells limit
    includeHeaders: true,
    minimumRange: 'A1:J20', // Fallback minimum range
    respectUserSelections: true
  };

  constructor(config?: Partial<DefaultSelectionConfig>) {
    this.config = { ...AutoSelectionManager.DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the manager with spreadsheet data
   */
  public initialize(data: SpreadsheetData): void {
    this.spreadsheetData = data;
    this.selectionStates.clear();
    
    // Calculate default selections for all sheets
    data.sheets.forEach((sheet, index) => {
      const boundaries = this.analyzeDataBoundaries(sheet);
      const defaultRange = this.calculateDefaultSelectionWithBoundaries(index, boundaries);
      
      this.selectionStates.set(index, {
        range: defaultRange,
        isManual: false,
        timestamp: new Date(),
        boundaries,
        sheetIndex: index
      });
    });
  }

  /**
   * Calculate intelligent default selection for a specific sheet
   */
  public calculateDefaultSelection(sheetIndex: number): string {
    if (!this.spreadsheetData || sheetIndex >= this.spreadsheetData.sheets.length) {
      return this.config.minimumRange;
    }

    const sheet = this.spreadsheetData.sheets[sheetIndex];
    if (!sheet) {
      return this.config.minimumRange;
    }

    const boundaries = this.analyzeDataBoundaries(sheet);
    return this.calculateDefaultSelectionWithBoundaries(sheetIndex, boundaries);
  }

  /**
   * Calculate default selection with pre-computed boundaries
   */
  private calculateDefaultSelectionWithBoundaries(_sheetIndex: number, boundaries: DataBoundaries): string {
    try {
      // If no data found, return minimum fallback range
      if (boundaries.maxRow === -1 || boundaries.maxCol === -1) {
        return this.config.minimumRange;
      }

      // Calculate the range including all data
      const startCell = this.numberToColumnLetter(boundaries.minCol) + (boundaries.minRow + 1);
      const endCell = this.numberToColumnLetter(boundaries.maxCol) + (boundaries.maxRow + 1);
      const fullRange = `${startCell}:${endCell}`;

      // Check if the range exceeds size limits
      const cellCount = (boundaries.maxRow - boundaries.minRow + 1) * (boundaries.maxCol - boundaries.minCol + 1);
      
      if (cellCount > this.config.maxCells) {
        // Calculate a reduced range that fits within limits
        const maxRows = Math.floor(this.config.maxCells / (boundaries.maxCol - boundaries.minCol + 1));
        const adjustedMaxRow = Math.min(boundaries.minRow + maxRows - 1, boundaries.maxRow);
        
        const adjustedEndCell = this.numberToColumnLetter(boundaries.maxCol) + (adjustedMaxRow + 1);
        return `${startCell}:${adjustedEndCell}`;
      }

      return fullRange;
    } catch (error) {
      console.warn('Error calculating default selection:', error);
      return this.config.minimumRange;
    }
  }

  /**
   * Apply default selection for a specific sheet
   */
  public applyDefaultSelection(sheetIndex: number): string {
    const defaultRange = this.calculateDefaultSelection(sheetIndex);
    
    this.selectionStates.set(sheetIndex, {
      range: defaultRange,
      isManual: false,
      timestamp: new Date(),
      sheetIndex
    });

    return defaultRange;
  }

  /**
   * Update user selection (manual selection)
   */
  public updateUserSelection(sheetIndex: number, range: string, isManual: boolean = true): void {
    this.selectionStates.set(sheetIndex, {
      range,
      isManual,
      timestamp: new Date(),
      sheetIndex
    });
  }

  /**
   * Get active selection for a specific sheet
   */
  public getActiveSelection(sheetIndex: number): SelectionState | null {
    return this.selectionStates.get(sheetIndex) || null;
  }

  /**
   * Get current selection range for a specific sheet
   */
  public getCurrentRange(sheetIndex: number): string {
    const state = this.selectionStates.get(sheetIndex);
    return state?.range || this.config.minimumRange;
  }

  /**
   * Check if current selection is manual (user-defined) or automatic
   */
  public isManualSelection(sheetIndex: number): boolean {
    const state = this.selectionStates.get(sheetIndex);
    return state?.isManual || false;
  }

  /**
   * Reset selections to defaults for all sheets
   */
  public resetToDefaults(): void {
    if (!this.spreadsheetData) return;

    this.spreadsheetData.sheets.forEach((_, index) => {
      this.applyDefaultSelection(index);
    });
  }

  /**
   * Reset selection to default for a specific sheet
   */
  public resetSheetToDefault(sheetIndex: number): string {
    return this.applyDefaultSelection(sheetIndex);
  }

  /**
   * Get all selection states (useful for debugging or state persistence)
   */
  public getAllSelectionStates(): Map<number, SelectionState> {
    return new Map(this.selectionStates);
  }

  /**
   * Check if a range is considered "entire data range" for the sheet
   */
  public isEntireDataRange(sheetIndex: number, range: string): boolean {
    const state = this.selectionStates.get(sheetIndex);
    if (!state || !state.boundaries) return false;

    try {
      const { startRow, startCol, endRow, endCol } = this.parseRange(range);
      const boundaries = state.boundaries;
      
      return (
        startRow === boundaries.minRow &&
        startCol === boundaries.minCol &&
        endRow === boundaries.maxRow &&
        endCol === boundaries.maxCol
      );
    } catch {
      return false;
    }
  }

  /**
   * Get selection summary information
   */
  public getSelectionSummary(sheetIndex: number): {
    range: string;
    isManual: boolean;
    isEntireRange: boolean;
    cellCount: number;
    hasHeaders: boolean;
  } {
    const state = this.selectionStates.get(sheetIndex);
    const range = state?.range || this.config.minimumRange;
    
    let cellCount = 0;
    try {
      const { startRow, startCol, endRow, endCol } = this.parseRange(range);
      cellCount = (endRow - startRow + 1) * (endCol - startCol + 1);
    } catch {
      cellCount = 0;
    }

    return {
      range,
      isManual: state?.isManual || false,
      isEntireRange: this.isEntireDataRange(sheetIndex, range),
      cellCount,
      hasHeaders: state?.boundaries?.hasHeaders || false
    };
  }

  // Private helper methods

  /**
   * Analyze sheet data to find actual data boundaries
   * This mirrors the backend DataBoundaryAnalyzer logic
   */
  private analyzeDataBoundaries(sheet: Sheet): DataBoundaries {
    if (!sheet.data || sheet.data.length === 0) {
      return {
        minRow: 0,
        maxRow: -1,
        minCol: 0,
        maxCol: -1,
        totalCells: 0,
        emptyCells: 0,
        hasHeaders: false
      };
    }

    let minRow = Infinity;
    let maxRow = -1;
    let minCol = Infinity;
    let maxCol = -1;
    let totalCells = 0;
    let emptyCells = 0;

    // Scan all cells to find boundaries
    for (let row = 0; row < sheet.data.length; row++) {
      const rowData = sheet.data[row];
      if (!rowData) continue;

      for (let col = 0; col < rowData.length; col++) {
        const cell = rowData[col];
        totalCells++;

        if (this.isCellEmpty(cell)) {
          emptyCells++;
        } else {
          // Found non-empty cell, update boundaries
          minRow = Math.min(minRow, row);
          maxRow = Math.max(maxRow, row);
          minCol = Math.min(minCol, col);
          maxCol = Math.max(maxCol, col);
        }
      }
    }

    // Handle case where no data found
    if (minRow === Infinity) {
      minRow = 0;
      maxRow = -1;
      minCol = 0;
      maxCol = -1;
    }

    // Detect headers (simplified version)
    const hasHeaders = this.detectHeaders(sheet);

    return {
      minRow,
      maxRow,
      minCol,
      maxCol,
      totalCells,
      emptyCells,
      hasHeaders
    };
  }

  /**
   * Simple header detection logic
   */
  private detectHeaders(sheet: Sheet): boolean {
    if (!sheet.data || sheet.data.length < 2) {
      return false;
    }

    const firstRow = sheet.data[0];
    const secondRow = sheet.data[1];
    
    if (!firstRow || !secondRow) {
      return false;
    }

    let textInFirst = 0;
    let numberInSecond = 0;
    let validColumns = 0;

    // Analyze data types in first two rows
    for (let col = 0; col < Math.max(firstRow.length, secondRow.length); col++) {
      const firstCell = firstRow[col];
      const secondCell = secondRow[col];

      // Skip if both cells are empty
      if (this.isCellEmpty(firstCell) && this.isCellEmpty(secondCell)) {
        continue;
      }

      validColumns++;

      // Check if first row cell looks like a header (text)
      if (!this.isCellEmpty(firstCell) && firstCell) {
        if (firstCell.dataType === DataType.TEXT && typeof firstCell.value === 'string') {
          textInFirst++;
        }
      }

      // Check if second row has numeric data
      if (!this.isCellEmpty(secondCell) && secondCell) {
        if (secondCell.dataType === DataType.NUMBER) {
          numberInSecond++;
        }
      }
    }

    if (validColumns === 0) return false;

    // Simple heuristic: if first row is mostly text and second row has numbers, likely headers
    const firstRowTextRatio = textInFirst / validColumns;
    const secondRowNumberRatio = numberInSecond / validColumns;
    
    return firstRowTextRatio > 0.5 && secondRowNumberRatio > 0.3;
  }

  /**
   * Check if a cell is empty
   */
  private isCellEmpty(cell: any): boolean {
    if (!cell) return true;
    if (cell.dataType === DataType.EMPTY) return true;
    if (cell.value === null || cell.value === undefined) return true;
    if (typeof cell.value === 'string' && cell.value.trim() === '') return true;
    return false;
  }

  /**
   * Convert column number to letter (0 -> A, 1 -> B, etc.)
   */
  private numberToColumnLetter(num: number): string {
    let result = '';
    while (num >= 0) {
      result = String.fromCharCode(65 + (num % 26)) + result;
      num = Math.floor(num / 26) - 1;
    }
    return result;
  }

  /**
   * Parse range string to coordinates
   */
  private parseRange(range: string): { startRow: number; startCol: number; endRow: number; endCol: number } {
    const rangeParts = range.split(':');
    if (rangeParts.length !== 2) {
      throw new Error('Invalid range format. Expected format: A1:B10');
    }
    
    const startCell = this.parseCellAddress(rangeParts[0]!);
    const endCell = this.parseCellAddress(rangeParts[1]!);
    
    return {
      startRow: startCell.row,
      startCol: startCell.col,
      endRow: endCell.row,
      endCol: endCell.col
    };
  }

  /**
   * Parse cell address to coordinates
   */
  private parseCellAddress(cellAddress: string): { row: number; col: number } {
    const match = cellAddress.match(/^([A-Z]+)(\d+)$/);
    if (!match) {
      throw new Error(`Invalid cell address: ${cellAddress}`);
    }
    
    const colStr = match[1]!;
    const rowStr = match[2]!;
    
    // Convert column letters to number (A=0, B=1, etc.)
    let col = 0;
    for (let i = 0; i < colStr.length; i++) {
      col = col * 26 + (colStr.charCodeAt(i) - 65 + 1);
    }
    col -= 1; // Convert to 0-based
    
    const row = parseInt(rowStr, 10) - 1; // Convert to 0-based
    
    return { row, col };
  }
}