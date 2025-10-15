import { Sheet, Cell, DataType } from '../types/spreadsheet';
import { PerformanceMonitor } from './PerformanceMonitor';

export interface DataBoundaries {
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
  totalCells: number;
  emptyCells: number;
  hasHeaders: boolean;
}

export interface HeaderInfo {
  hasHeaders: boolean;
  headerRow: number;
  confidence: number;
  reasoning: string[];
}

export interface RangeValidation {
  isValid: boolean;
  cellCount: number;
  maxAllowed: number;
  warnings: string[];
  suggestedRange?: string | undefined;
}

export interface SelectionAnalysis {
  recommendedRange: string;
  confidence: number;
  reasoning: string[];
  alternatives: string[];
  warnings: string[];
  boundaries: DataBoundaries;
}

export interface ProgressiveBoundaryResult {
  boundaries: DataBoundaries;
  isComplete: boolean;
  progress: number; // 0-1
  estimatedTimeRemaining?: number;
}

export interface BoundaryAnalysisCache {
  sheetId: string;
  boundaries: DataBoundaries;
  timestamp: Date;
  checksum: string;
}

export class DataBoundaryAnalyzer {
  private static readonly MAX_CELLS = 100000; // 100k cells limit
  private static readonly MIN_FALLBACK_RANGE = 'A1:J20'; // Minimum fallback range
  private static readonly HEADER_CONFIDENCE_THRESHOLD = 0.7;
  
  // Performance optimization constants
  private static readonly PROGRESSIVE_ANALYSIS_THRESHOLD = 50000; // Start progressive analysis for sheets with >50k cells
  private static readonly EARLY_TERMINATION_THRESHOLD = 1000; // Stop scanning after 1000 consecutive empty rows/cols
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache TTL
  private static readonly MAX_CACHE_SIZE = 100; // Maximum number of cached results
  
  // Cache for boundary analysis results
  private static boundaryCache = new Map<string, BoundaryAnalysisCache>();

  /**
   * Analyze sheet data to find actual data boundaries with performance optimizations
   */
  public static analyzeDataBoundaries(sheet: Sheet): DataBoundaries {
    const startTime = performance.now();
    
    try {
      const result = this.analyzeDataBoundariesInternal(sheet);
      const duration = performance.now() - startTime;
      
      PerformanceMonitor.recordMetric('boundary-analysis', duration, {
        sheetName: sheet.name,
        rows: sheet.dimensions.rows,
        cols: sheet.dimensions.cols,
        estimatedCells: sheet.dimensions.rows * sheet.dimensions.cols
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      PerformanceMonitor.recordMetric('boundary-analysis', duration, {
        sheetName: sheet.name,
        rows: sheet.dimensions.rows,
        cols: sheet.dimensions.cols,
        estimatedCells: sheet.dimensions.rows * sheet.dimensions.cols,
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw error;
    }
  }

  /**
   * Internal boundary analysis implementation
   */
  private static analyzeDataBoundariesInternal(sheet: Sheet): DataBoundaries {
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

    // Check cache first
    const cacheKey = this.generateCacheKey(sheet);
    const cached = this.getCachedBoundaries(cacheKey);
    if (cached) {
      return cached.boundaries;
    }

    // Estimate total cells to determine analysis strategy
    const estimatedCells = sheet.dimensions.rows * sheet.dimensions.cols;
    
    let boundaries: DataBoundaries;
    
    if (estimatedCells > this.PROGRESSIVE_ANALYSIS_THRESHOLD) {
      // Use progressive analysis for large sheets
      const progressiveResult = this.analyzeDataBoundariesProgressive(sheet);
      boundaries = progressiveResult.boundaries;
    } else {
      // Use optimized analysis for smaller sheets
      boundaries = this.analyzeDataBoundariesOptimized(sheet);
    }

    // Cache the result
    this.cacheBoundaries(cacheKey, boundaries);

    return boundaries;
  }

  /**
   * Optimized boundary analysis with early termination
   */
  private static analyzeDataBoundariesOptimized(sheet: Sheet): DataBoundaries {
    let minRow = Infinity;
    let maxRow = -1;
    let minCol = Infinity;
    let maxCol = -1;
    let totalCells = 0;
    let emptyCells = 0;
    let consecutiveEmptyRows = 0;
    let consecutiveEmptyCols = 0;

    // First pass: scan from top-left to find initial boundaries quickly
    for (let row = 0; row < sheet.data.length; row++) {
      const rowData = sheet.data[row];
      if (!rowData) {
        consecutiveEmptyRows++;
        if (consecutiveEmptyRows > this.EARLY_TERMINATION_THRESHOLD && maxRow !== -1) {
          break; // Stop scanning after many consecutive empty rows
        }
        continue;
      }

      let rowHasData = false;
      consecutiveEmptyCols = 0;

      for (let col = 0; col < rowData.length; col++) {
        const cell = rowData[col];
        totalCells++;

        if (this.isCellEmpty(cell)) {
          emptyCells++;
          consecutiveEmptyCols++;
          
          // Early termination for columns if we've found data and hit many empty columns
          if (consecutiveEmptyCols > this.EARLY_TERMINATION_THRESHOLD && maxCol !== -1) {
            break;
          }
        } else {
          // Found non-empty cell, update boundaries
          minRow = Math.min(minRow, row);
          maxRow = Math.max(maxRow, row);
          minCol = Math.min(minCol, col);
          maxCol = Math.max(maxCol, col);
          rowHasData = true;
          consecutiveEmptyCols = 0;
        }
      }

      if (rowHasData) {
        consecutiveEmptyRows = 0;
      } else {
        consecutiveEmptyRows++;
      }
    }

    // Handle case where no data found
    if (minRow === Infinity) {
      minRow = 0;
      maxRow = -1;
      minCol = 0;
      maxCol = -1;
    }

    // Detect headers
    const headerInfo = this.detectHeaders(sheet);

    return {
      minRow,
      maxRow,
      minCol,
      maxCol,
      totalCells,
      emptyCells,
      hasHeaders: headerInfo.hasHeaders
    };
  }

  /**
   * Progressive boundary analysis for very large sheets
   */
  private static analyzeDataBoundariesProgressive(sheet: Sheet): ProgressiveBoundaryResult {
    const startTime = Date.now();
    let minRow = Infinity;
    let maxRow = -1;
    let minCol = Infinity;
    let maxCol = -1;
    let totalCells = 0;
    let emptyCells = 0;
    
    const totalRows = sheet.data.length;
    const batchSize = Math.max(100, Math.floor(totalRows / 20)); // Process in batches
    let processedRows = 0;

    // Process in batches to avoid blocking
    for (let batchStart = 0; batchStart < totalRows; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize, totalRows);
      
      for (let row = batchStart; row < batchEnd; row++) {
        const rowData = sheet.data[row];
        if (!rowData) continue;

        for (let col = 0; col < rowData.length; col++) {
          const cell = rowData[col];
          totalCells++;

          if (this.isCellEmpty(cell)) {
            emptyCells++;
          } else {
            minRow = Math.min(minRow, row);
            maxRow = Math.max(maxRow, row);
            minCol = Math.min(minCol, col);
            maxCol = Math.max(maxCol, col);
          }
        }
      }

      processedRows = batchEnd;
      
      // Check if we should continue or if we have enough data
      const progress = processedRows / totalRows;
      
      // If we've found clear boundaries and processed a significant portion, we can stop
      if (progress > 0.5 && maxRow !== -1 && maxCol !== -1) {
        const dataSparsity = (totalCells - emptyCells) / totalCells;
        if (dataSparsity < 0.1) { // Very sparse data, likely found the boundaries
          break;
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

    // Detect headers
    const headerInfo = this.detectHeaders(sheet);

    const boundaries: DataBoundaries = {
      minRow,
      maxRow,
      minCol,
      maxCol,
      totalCells,
      emptyCells,
      hasHeaders: headerInfo.hasHeaders
    };

    return {
      boundaries,
      isComplete: processedRows >= totalRows,
      progress: processedRows / totalRows,
      estimatedTimeRemaining: processedRows < totalRows ? 
        ((Date.now() - startTime) / processedRows) * (totalRows - processedRows) : 0
    };
  }

  /**
   * Detect if the first row contains headers
   */
  public static detectHeaders(sheet: Sheet): HeaderInfo {
    if (!sheet.data || sheet.data.length < 2) {
      return {
        hasHeaders: false,
        headerRow: 0,
        confidence: 0,
        reasoning: ['Insufficient data to determine headers']
      };
    }

    const firstRow = sheet.data[0];
    const secondRow = sheet.data[1];
    
    if (!firstRow || !secondRow) {
      return {
        hasHeaders: false,
        headerRow: 0,
        confidence: 0,
        reasoning: ['Missing row data']
      };
    }

    let textInFirst = 0;
    let textInSecond = 0;
    let numberInFirst = 0;
    let numberInSecond = 0;
    let totalColumns = Math.max(firstRow.length, secondRow.length);
    let validColumns = 0;

    const reasoning: string[] = [];

    // Analyze data types in first two rows
    for (let col = 0; col < totalColumns; col++) {
      const firstCell = firstRow[col];
      const secondCell = secondRow[col];

      // Skip if both cells are empty
      if (this.isCellEmpty(firstCell) && this.isCellEmpty(secondCell)) {
        continue;
      }

      validColumns++;

      // Analyze first row
      if (!this.isCellEmpty(firstCell) && firstCell) {
        if (this.isTextLikeHeader(firstCell)) {
          textInFirst++;
        } else if (firstCell.dataType === DataType.NUMBER) {
          numberInFirst++;
        }
      }

      // Analyze second row
      if (!this.isCellEmpty(secondCell) && secondCell) {
        if (secondCell.dataType === DataType.TEXT) {
          textInSecond++;
        } else if (secondCell.dataType === DataType.NUMBER) {
          numberInSecond++;
        }
      }
    }

    if (validColumns === 0) {
      return {
        hasHeaders: false,
        headerRow: 0,
        confidence: 0,
        reasoning: ['No valid columns found']
      };
    }

    // Calculate confidence based on patterns
    let confidence = 0;
    
    // Pattern 1: First row is mostly text, second row has more numbers
    const firstRowTextRatio = textInFirst / validColumns;
    const secondRowNumberRatio = numberInSecond / validColumns;
    
    if (firstRowTextRatio > 0.5) {
      confidence += 0.4;
      reasoning.push(`First row is ${Math.round(firstRowTextRatio * 100)}% text`);
    }
    
    if (secondRowNumberRatio > firstRowTextRatio) {
      confidence += 0.3;
      reasoning.push('Second row has more numeric data than first row');
    }

    // Pattern 2: Check for common header patterns
    const headerPatterns = this.checkHeaderPatterns(firstRow);
    confidence += headerPatterns.confidence;
    reasoning.push(...headerPatterns.reasoning);

    // Pattern 3: Check for consistent data types in subsequent rows
    if (sheet.data.length > 2) {
      const consistencyScore = this.checkDataConsistency(sheet, 1);
      confidence += consistencyScore * 0.2;
      if (consistencyScore > 0.5) {
        reasoning.push('Data rows show consistent patterns');
      }
    }

    const hasHeaders = confidence >= this.HEADER_CONFIDENCE_THRESHOLD;

    return {
      hasHeaders,
      headerRow: hasHeaders ? 0 : -1,
      confidence,
      reasoning
    };
  }

  /**
   * Calculate optimal range based on data boundaries
   */
  public static calculateOptimalRange(boundaries: DataBoundaries): string {
    // If no data found, return minimum fallback range
    if (boundaries.maxRow === -1 || boundaries.maxCol === -1) {
      return this.MIN_FALLBACK_RANGE;
    }

    // Calculate the range including all data
    const startCell = this.numberToColumnLetter(boundaries.minCol) + (boundaries.minRow + 1);
    const endCell = this.numberToColumnLetter(boundaries.maxCol) + (boundaries.maxRow + 1);
    const fullRange = `${startCell}:${endCell}`;

    // Check if the range exceeds size limits
    const cellCount = (boundaries.maxRow - boundaries.minRow + 1) * (boundaries.maxCol - boundaries.minCol + 1);
    
    if (cellCount > this.MAX_CELLS) {
      // Calculate a reduced range that fits within limits
      const maxRows = Math.floor(this.MAX_CELLS / (boundaries.maxCol - boundaries.minCol + 1));
      const adjustedMaxRow = Math.min(boundaries.minRow + maxRows - 1, boundaries.maxRow);
      
      const adjustedEndCell = this.numberToColumnLetter(boundaries.maxCol) + (adjustedMaxRow + 1);
      return `${startCell}:${adjustedEndCell}`;
    }

    return fullRange;
  }

  /**
   * Validate that a range doesn't exceed size limits with performance considerations
   */
  public static validateRangeSize(range: string): RangeValidation {
    const startTime = performance.now();
    
    try {
      const result = this.validateRangeSizeInternal(range);
      const duration = performance.now() - startTime;
      
      PerformanceMonitor.recordMetric('range-validation', duration, { range });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      PerformanceMonitor.recordMetric('range-validation', duration, {
        range,
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw error;
    }
  }

  /**
   * Internal range validation implementation
   */
  private static validateRangeSizeInternal(range: string): RangeValidation {
    try {
      const { startRow, startCol, endRow, endCol } = this.parseRange(range);
      const cellCount = (endRow - startRow + 1) * (endCol - startCol + 1);
      
      const warnings: string[] = [];
      let suggestedRange: string | undefined;

      // Performance thresholds
      const PERFORMANCE_WARNING_THRESHOLD = 10000;
      const LARGE_RANGE_THRESHOLD = 50000;

      if (cellCount > this.MAX_CELLS) {
        warnings.push(`Range contains ${cellCount.toLocaleString()} cells, exceeding the limit of ${this.MAX_CELLS.toLocaleString()}`);
        
        // Suggest a reduced range
        const maxRows = Math.floor(this.MAX_CELLS / (endCol - startCol + 1));
        const suggestedEndRow = startRow + maxRows - 1;
        const suggestedEndCell = this.numberToColumnLetter(endCol) + (suggestedEndRow + 1);
        const startCell = this.numberToColumnLetter(startCol) + (startRow + 1);
        suggestedRange = `${startCell}:${suggestedEndCell}`;
        
        warnings.push(`Consider using a smaller range like: ${suggestedRange}`);
      } else if (cellCount > LARGE_RANGE_THRESHOLD) {
        warnings.push('Large ranges may significantly impact performance');
        
        // Suggest performance optimization strategies
        warnings.push('Consider processing data in smaller chunks or using progressive loading');
      } else if (cellCount > PERFORMANCE_WARNING_THRESHOLD) {
        warnings.push('Range size may impact performance for complex operations');
      }

      // Check for extremely wide or tall ranges that might indicate selection errors
      const rowCount = endRow - startRow + 1;
      const colCount = endCol - startCol + 1;
      
      if (rowCount > 10000 && colCount > 100) {
        warnings.push('Very large rectangular selection detected - ensure this is intentional');
      }
      
      if (colCount > 1000) {
        warnings.push('Selection includes many columns - this may slow down analysis');
      }

      return {
        isValid: cellCount <= this.MAX_CELLS,
        cellCount,
        maxAllowed: this.MAX_CELLS,
        warnings,
        suggestedRange
      };
    } catch (error) {
      return {
        isValid: false,
        cellCount: 0,
        maxAllowed: this.MAX_CELLS,
        warnings: [`Invalid range format: ${error instanceof Error ? error.message : String(error)}`]
      };
    }
  }

  /**
   * Generate cache key for sheet boundary analysis
   */
  private static generateCacheKey(sheet: Sheet): string {
    // Create a simple checksum based on sheet dimensions and name
    const data = `${sheet.name}-${sheet.dimensions.rows}-${sheet.dimensions.cols}`;
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `boundary-${Math.abs(hash)}`;
  }

  /**
   * Get cached boundary analysis result
   */
  private static getCachedBoundaries(cacheKey: string): BoundaryAnalysisCache | null {
    const cached = this.boundaryCache.get(cacheKey);
    if (!cached) {
      return null;
    }

    // Check if cache is still valid
    const now = new Date();
    const age = now.getTime() - cached.timestamp.getTime();
    if (age > this.CACHE_TTL_MS) {
      this.boundaryCache.delete(cacheKey);
      return null;
    }

    return cached;
  }

  /**
   * Cache boundary analysis result
   */
  private static cacheBoundaries(cacheKey: string, boundaries: DataBoundaries): void {
    // Clean up old cache entries if we're at the limit
    if (this.boundaryCache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.boundaryCache.keys().next().value;
      if (oldestKey) {
        this.boundaryCache.delete(oldestKey);
      }
    }

    const cacheEntry: BoundaryAnalysisCache = {
      sheetId: cacheKey,
      boundaries,
      timestamp: new Date(),
      checksum: this.generateBoundariesChecksum(boundaries)
    };

    this.boundaryCache.set(cacheKey, cacheEntry);
  }

  /**
   * Generate checksum for boundary analysis result
   */
  private static generateBoundariesChecksum(boundaries: DataBoundaries): string {
    const data = `${boundaries.minRow}-${boundaries.maxRow}-${boundaries.minCol}-${boundaries.maxCol}-${boundaries.totalCells}`;
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Clear boundary analysis cache
   */
  public static clearCache(): void {
    this.boundaryCache.clear();
  }

  /**
   * Get cache statistics for monitoring
   */
  public static getCacheStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.boundaryCache.size,
      maxSize: this.MAX_CACHE_SIZE
    };
  }

  /**
   * Perform complete analysis and provide selection recommendation
   */
  public static analyzeSelection(sheet: Sheet): SelectionAnalysis {
    const boundaries = this.analyzeDataBoundaries(sheet);
    const headerInfo = this.detectHeaders(sheet);
    const recommendedRange = this.calculateOptimalRange(boundaries);
    const validation = this.validateRangeSize(recommendedRange);

    const reasoning: string[] = [];
    const alternatives: string[] = [];
    const warnings: string[] = [...validation.warnings];

    // Build reasoning
    if (boundaries.totalCells === 0) {
      reasoning.push('No data found in sheet');
    } else {
      reasoning.push(`Found data in ${boundaries.maxRow - boundaries.minRow + 1} rows and ${boundaries.maxCol - boundaries.minCol + 1} columns`);
      
      if (headerInfo.hasHeaders) {
        reasoning.push('Headers detected in first row');
      }
      
      const dataPercentage = Math.round(((boundaries.totalCells - boundaries.emptyCells) / boundaries.totalCells) * 100);
      reasoning.push(`${dataPercentage}% of scanned cells contain data`);
    }

    // Generate alternatives
    if (boundaries.maxRow > boundaries.minRow) {
      // Alternative without headers
      if (headerInfo.hasHeaders) {
        const noHeaderStart = this.numberToColumnLetter(boundaries.minCol) + (boundaries.minRow + 2);
        const noHeaderEnd = this.numberToColumnLetter(boundaries.maxCol) + (boundaries.maxRow + 1);
        alternatives.push(`${noHeaderStart}:${noHeaderEnd} (data only, excluding headers)`);
      }
      
      // Alternative with just first 1000 rows if data is large
      if (boundaries.maxRow - boundaries.minRow > 1000) {
        const limitedEnd = this.numberToColumnLetter(boundaries.maxCol) + (boundaries.minRow + 1001);
        const limitedStart = this.numberToColumnLetter(boundaries.minCol) + (boundaries.minRow + 1);
        alternatives.push(`${limitedStart}:${limitedEnd} (first 1000 rows)`);
      }
    }

    // Calculate confidence
    let confidence = 0.8; // Base confidence
    
    if (boundaries.totalCells > 0) {
      const dataRatio = (boundaries.totalCells - boundaries.emptyCells) / boundaries.totalCells;
      confidence = Math.min(0.9, 0.5 + dataRatio * 0.4);
    }
    
    if (headerInfo.hasHeaders && headerInfo.confidence > 0.8) {
      confidence += 0.1;
    }

    return {
      recommendedRange,
      confidence: Math.min(confidence, 1.0),
      reasoning,
      alternatives,
      warnings,
      boundaries
    };
  }

  // Helper methods

  private static isCellEmpty(cell: Cell | undefined): boolean {
    if (!cell) return true;
    if (cell.dataType === DataType.EMPTY) return true;
    if (cell.value === null || cell.value === undefined) return true;
    if (typeof cell.value === 'string' && cell.value.trim() === '') return true;
    return false;
  }

  private static isTextLikeHeader(cell: Cell): boolean {
    if (cell.dataType !== DataType.TEXT) return false;
    
    const value = String(cell.value).trim();
    if (value.length === 0) return false;
    
    // Check for common header patterns
    const headerPatterns = [
      /^[A-Za-z][A-Za-z0-9\s_-]*$/, // Starts with letter, contains letters/numbers/spaces/underscores/hyphens
      /^[A-Z][A-Z_]*$/, // All caps with underscores
      /^\w+\s+\w+$/, // Two words
    ];
    
    return headerPatterns.some(pattern => pattern.test(value));
  }

  private static checkHeaderPatterns(row: Cell[]): { confidence: number; reasoning: string[] } {
    let confidence = 0;
    const reasoning: string[] = [];
    
    let headerLikeCount = 0;
    let totalNonEmpty = 0;
    
    for (const cell of row) {
      if (this.isCellEmpty(cell)) continue;
      
      totalNonEmpty++;
      
      if (this.isTextLikeHeader(cell)) {
        headerLikeCount++;
      }
    }
    
    if (totalNonEmpty > 0) {
      const headerRatio = headerLikeCount / totalNonEmpty;
      if (headerRatio > 0.7) {
        confidence += 0.3;
        reasoning.push(`${Math.round(headerRatio * 100)}% of cells match header patterns`);
      }
    }
    
    return { confidence, reasoning };
  }

  private static checkDataConsistency(sheet: Sheet, startRow: number): number {
    if (sheet.data.length <= startRow + 1) return 0;
    
    const sampleRows = Math.min(5, sheet.data.length - startRow);
    let consistentColumns = 0;
    let totalColumns = 0;
    
    // Check first data row to establish column types
    const firstDataRow = sheet.data[startRow];
    if (!firstDataRow) return 0;
    
    for (let col = 0; col < firstDataRow.length; col++) {
      const firstCell = firstDataRow[col];
      if (this.isCellEmpty(firstCell)) continue;
      
      totalColumns++;
      let consistentCount = 1;
      
      // Check consistency in subsequent rows
      for (let row = startRow + 1; row < startRow + sampleRows && row < sheet.data.length; row++) {
        const rowData = sheet.data[row];
        if (!rowData || col >= rowData.length) continue;
        
        const cell = rowData[col];
        if (this.isCellEmpty(cell) || !cell) continue;
        
        if (firstCell && cell.dataType === firstCell.dataType) {
          consistentCount++;
        }
      }
      
      if (consistentCount / sampleRows > 0.6) {
        consistentColumns++;
      }
    }
    
    return totalColumns > 0 ? consistentColumns / totalColumns : 0;
  }

  private static numberToColumnLetter(num: number): string {
    let result = '';
    while (num >= 0) {
      result = String.fromCharCode(65 + (num % 26)) + result;
      num = Math.floor(num / 26) - 1;
    }
    return result;
  }

  private static parseRange(range: string): { startRow: number; startCol: number; endRow: number; endCol: number } {
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

  private static parseCellAddress(cellAddress: string): { row: number; col: number } {
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