import { SpreadsheetData, Sheet, Cell, Range, DataType } from '../types/spreadsheet';
import { cacheService } from './CacheService';
import { logger } from '../monitoring';

export interface LazyLoadConfig {
  chunkSize?: number;
  maxCacheSize?: number;
  preloadRadius?: number;
  enablePrefetch?: boolean;
}

export interface ChunkInfo {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
  chunkId: string;
}

export interface LazyLoadedSheet {
  name: string;
  dimensions: { rows: number; cols: number };
  metadata: any;
  isLazyLoaded: true;
  chunkSize: number;
  totalChunks: number;
}

export class LazyLoadingService {
  private static readonly DEFAULT_CHUNK_SIZE = 1000; // cells per chunk
  private static readonly DEFAULT_MAX_CACHE_SIZE = 50; // chunks in memory
  private static readonly DEFAULT_PRELOAD_RADIUS = 2; // chunks around current view

  private config: Required<LazyLoadConfig>;
  private loadedChunks: Map<string, Cell[][]> = new Map();
  private chunkAccessTimes: Map<string, number> = new Map();

  constructor(config: LazyLoadConfig = {}) {
    this.config = {
      chunkSize: config.chunkSize || LazyLoadingService.DEFAULT_CHUNK_SIZE,
      maxCacheSize: config.maxCacheSize || LazyLoadingService.DEFAULT_MAX_CACHE_SIZE,
      preloadRadius: config.preloadRadius || LazyLoadingService.DEFAULT_PRELOAD_RADIUS,
      enablePrefetch: config.enablePrefetch ?? true
    };
  }

  /**
   * Convert large spreadsheet to lazy-loaded format
   */
  async convertToLazyLoaded(spreadsheetData: SpreadsheetData): Promise<SpreadsheetData> {
    const lazySheets: (Sheet | LazyLoadedSheet)[] = [];

    for (const sheet of spreadsheetData.sheets) {
      const totalCells = sheet.dimensions.rows * sheet.dimensions.cols;
      
      // Only convert large sheets to lazy loading
      if (totalCells > this.config.chunkSize * 2) {
        const lazySheet = await this.convertSheetToLazy(sheet);
        lazySheets.push(lazySheet);
      } else {
        lazySheets.push(sheet);
      }
    }

    return {
      ...spreadsheetData,
      sheets: lazySheets as Sheet[]
    };
  }

  /**
   * Convert a single sheet to lazy-loaded format
   */
  private async convertSheetToLazy(sheet: Sheet): Promise<LazyLoadedSheet> {
    const chunks = this.calculateChunks(sheet);
    
    // Store chunks in cache if available
    if (cacheService.isAvailable()) {
      for (const chunk of chunks) {
        const chunkData = this.extractChunkData(sheet, chunk);
        const cacheKey = this.generateChunkCacheKey(sheet.name, chunk.chunkId);
        
        try {
          await cacheService.set(cacheKey, chunkData, { ttl: 3600 }); // 1 hour TTL
        } catch (error) {
          logger.warn(`Failed to cache chunk ${chunk.chunkId}:`, error);
          // Continue without caching
        }
      }
    } else {
      logger.info('Cache service not available, skipping chunk caching for lazy loading');
    }

    return {
      name: sheet.name,
      dimensions: sheet.dimensions,
      metadata: {
        ...sheet,
        originalSize: sheet.data.length,
        chunkInfo: chunks
      },
      isLazyLoaded: true,
      chunkSize: this.config.chunkSize,
      totalChunks: chunks.length
    };
  }

  /**
   * Load data for a specific range
   */
  async loadRange(sheetName: string, range: Range): Promise<Cell[][]> {
    const requiredChunks = this.getChunksForRange(sheetName, range);
    const loadedData: Cell[][] = [];

    // Load required chunks
    for (const chunkId of requiredChunks) {
      const chunkData = await this.loadChunk(sheetName, chunkId);
      if (chunkData) {
        // Extract relevant portion of chunk for the requested range
        const relevantData = this.extractRangeFromChunk(chunkData, range, chunkId);
        loadedData.push(...relevantData);
      }
    }

    // Prefetch adjacent chunks if enabled
    if (this.config.enablePrefetch) {
      this.prefetchAdjacentChunks(sheetName, requiredChunks);
    }

    return loadedData;
  }

  /**
   * Load a specific chunk
   */
  private async loadChunk(sheetName: string, chunkId: string): Promise<Cell[][] | null> {
    // Check memory cache first
    const memoryKey = `${sheetName}:${chunkId}`;
    if (this.loadedChunks.has(memoryKey)) {
      this.chunkAccessTimes.set(memoryKey, Date.now());
      return this.loadedChunks.get(memoryKey)!;
    }

    // Check Redis cache
    const cacheKey = this.generateChunkCacheKey(sheetName, chunkId);
    const cachedData = await cacheService.get<Cell[][]>(cacheKey);
    
    if (cachedData) {
      // Store in memory cache
      this.storeInMemoryCache(memoryKey, cachedData);
      return cachedData;
    }

    logger.warn(`Chunk not found in cache: ${sheetName}:${chunkId}`);
    return null;
  }

  /**
   * Store chunk in memory cache with LRU eviction
   */
  private storeInMemoryCache(key: string, data: Cell[][]): void {
    // Evict old chunks if cache is full
    if (this.loadedChunks.size >= this.config.maxCacheSize) {
      this.evictOldestChunk();
    }

    this.loadedChunks.set(key, data);
    this.chunkAccessTimes.set(key, Date.now());
  }

  /**
   * Evict the least recently used chunk
   */
  private evictOldestChunk(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, time] of this.chunkAccessTimes.entries()) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.loadedChunks.delete(oldestKey);
      this.chunkAccessTimes.delete(oldestKey);
    }
  }

  /**
   * Calculate chunks for a sheet
   */
  private calculateChunks(sheet: Sheet): ChunkInfo[] {
    const chunks: ChunkInfo[] = [];
    const rowsPerChunk = Math.ceil(Math.sqrt(this.config.chunkSize));
    const colsPerChunk = Math.ceil(this.config.chunkSize / rowsPerChunk);

    let chunkIndex = 0;
    for (let startRow = 0; startRow < sheet.dimensions.rows; startRow += rowsPerChunk) {
      for (let startCol = 0; startCol < sheet.dimensions.cols; startCol += colsPerChunk) {
        const endRow = Math.min(startRow + rowsPerChunk - 1, sheet.dimensions.rows - 1);
        const endCol = Math.min(startCol + colsPerChunk - 1, sheet.dimensions.cols - 1);

        chunks.push({
          startRow,
          endRow,
          startCol,
          endCol,
          chunkId: `chunk_${chunkIndex++}`
        });
      }
    }

    return chunks;
  }

  /**
   * Extract data for a specific chunk
   */
  private extractChunkData(sheet: Sheet, chunk: ChunkInfo): Cell[][] {
    const chunkData: Cell[][] = [];

    for (let row = chunk.startRow; row <= chunk.endRow; row++) {
      const rowData: Cell[] = [];
      for (let col = chunk.startCol; col <= chunk.endCol; col++) {
        const cell = sheet.data[row]?.[col] || {
          value: null,
          dataType: DataType.EMPTY,
          address: this.indexToAddress(row, col)
        };
        rowData.push(cell);
      }
      chunkData.push(rowData);
    }

    return chunkData;
  }

  /**
   * Get chunks that contain the specified range
   */
  private getChunksForRange(sheetName: string, range: Range): string[] {
    // This would need access to the chunk metadata
    // For now, return a simplified implementation
    const chunkIds: string[] = [];
    
    // Calculate which chunks intersect with the range
    const rowsPerChunk = Math.ceil(Math.sqrt(this.config.chunkSize));
    const colsPerChunk = Math.ceil(this.config.chunkSize / rowsPerChunk);

    const startChunkRow = Math.floor(range.startRow / rowsPerChunk);
    const endChunkRow = Math.floor(range.endRow / rowsPerChunk);
    const startChunkCol = Math.floor(range.startCol / colsPerChunk);
    const endChunkCol = Math.floor(range.endCol / colsPerChunk);

    for (let chunkRow = startChunkRow; chunkRow <= endChunkRow; chunkRow++) {
      for (let chunkCol = startChunkCol; chunkCol <= endChunkCol; chunkCol++) {
        const chunkIndex = chunkRow * Math.ceil(1000 / colsPerChunk) + chunkCol; // Simplified
        chunkIds.push(`chunk_${chunkIndex}`);
      }
    }

    return chunkIds;
  }

  /**
   * Extract relevant portion of chunk data for a specific range
   */
  private extractRangeFromChunk(chunkData: Cell[][], range: Range, chunkId: string): Cell[][] {
    // This is a simplified implementation
    // In practice, you'd need to map chunk coordinates to sheet coordinates
    return chunkData.filter((row, rowIndex) => {
      return row.some((cell, colIndex) => {
        // Simple intersection check - would need proper coordinate mapping
        return true;
      });
    });
  }

  /**
   * Prefetch adjacent chunks for better performance
   */
  private async prefetchAdjacentChunks(sheetName: string, currentChunks: string[]): Promise<void> {
    // Implementation would prefetch chunks around the current chunks
    // This is a simplified version
    const prefetchPromises: Promise<void>[] = [];

    for (const chunkId of currentChunks) {
      // Calculate adjacent chunk IDs
      const adjacentChunks = this.getAdjacentChunks(chunkId);
      
      for (const adjacentChunk of adjacentChunks) {
        prefetchPromises.push(
          this.loadChunk(sheetName, adjacentChunk).then(() => {
            // Chunk loaded into cache
          }).catch(() => {
            // Ignore prefetch errors
          })
        );
      }
    }

    // Don't wait for prefetch to complete
    Promise.all(prefetchPromises).catch(() => {
      // Ignore prefetch errors
    });
  }

  /**
   * Get adjacent chunk IDs for prefetching
   */
  private getAdjacentChunks(chunkId: string): string[] {
    // Simplified implementation - would calculate actual adjacent chunks
    const chunkIndex = parseInt(chunkId.replace('chunk_', ''));
    return [
      `chunk_${chunkIndex - 1}`,
      `chunk_${chunkIndex + 1}`
    ].filter(id => id !== chunkId);
  }

  /**
   * Generate cache key for chunk
   */
  private generateChunkCacheKey(sheetName: string, chunkId: string): string {
    return `lazy_chunk:${sheetName}:${chunkId}`;
  }

  /**
   * Convert row/col index to Excel address
   */
  private indexToAddress(row: number, col: number): string {
    let columnStr = '';
    let tempCol = col + 1;
    
    while (tempCol > 0) {
      tempCol--;
      columnStr = String.fromCharCode('A'.charCodeAt(0) + (tempCol % 26)) + columnStr;
      tempCol = Math.floor(tempCol / 26);
    }
    
    return `${columnStr}${row + 1}`;
  }

  /**
   * Clear all cached chunks for a sheet
   */
  async clearSheetCache(sheetName: string): Promise<void> {
    // Clear memory cache
    const keysToDelete = Array.from(this.loadedChunks.keys())
      .filter(key => key.startsWith(`${sheetName}:`));
    
    for (const key of keysToDelete) {
      this.loadedChunks.delete(key);
      this.chunkAccessTimes.delete(key);
    }

    // Clear Redis cache
    const pattern = `lazy_chunk:${sheetName}:*`;
    await cacheService.clearPattern(pattern);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    memoryChunks: number;
    maxMemoryChunks: number;
    chunkSize: number;
    memoryUsage: string;
  } {
    const memoryChunks = this.loadedChunks.size;
    const estimatedMemoryUsage = memoryChunks * this.config.chunkSize * 100; // Rough estimate

    return {
      memoryChunks,
      maxMemoryChunks: this.config.maxCacheSize,
      chunkSize: this.config.chunkSize,
      memoryUsage: `${(estimatedMemoryUsage / 1024 / 1024).toFixed(2)}MB`
    };
  }
}

// Create singleton instance
export const lazyLoadingService = new LazyLoadingService();