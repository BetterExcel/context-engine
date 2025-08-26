import { enhancedCacheService } from './EnhancedCacheService';
import { streamingResponseService } from './StreamingResponseService';
import { parallelProcessingService } from './ParallelProcessingService';
import { lazyLoadingService } from './LazyLoadingService';
import { PerformanceMonitor } from './PerformanceMonitor';
import { logger } from '../monitoring';
import { SpreadsheetData, Sheet } from '../types/spreadsheet';

export interface PerformanceOptimizationConfig {
  enableCaching: boolean;
  enableStreaming: boolean;
  enableParallelProcessing: boolean;
  enableLazyLoading: boolean;
  cacheStrategy: 'aggressive' | 'balanced' | 'conservative';
  processingThreshold: number; // Size threshold for parallel processing
  streamingThreshold: number; // Size threshold for streaming responses
}

export interface OptimizationResult {
  strategy: string;
  performance: {
    originalTime?: number;
    optimizedTime: number;
    improvement: number; // Percentage improvement
  };
  cacheMetrics?: any;
  streamingMetrics?: any;
  parallelMetrics?: any;
}

export interface LargeDatasetProcessingOptions {
  chunkSize?: number;
  maxConcurrency?: number;
  enableProgressUpdates?: boolean;
  cacheIntermediateResults?: boolean;
  streamResults?: boolean;
}

/**
 * Enhanced performance service that orchestrates all performance optimization strategies
 * Provides intelligent decision-making for when to apply different optimization techniques
 */
export class EnhancedPerformanceService {
  private config: PerformanceOptimizationConfig;
  private optimizationHistory: Map<string, OptimizationResult[]> = new Map();

  constructor(config: Partial<PerformanceOptimizationConfig> = {}) {
    this.config = {
      enableCaching: config.enableCaching ?? true,
      enableStreaming: config.enableStreaming ?? true,
      enableParallelProcessing: config.enableParallelProcessing ?? true,
      enableLazyLoading: config.enableLazyLoading ?? true,
      cacheStrategy: config.cacheStrategy || 'balanced',
      processingThreshold: config.processingThreshold || 10000, // 10k rows
      streamingThreshold: config.streamingThreshold || 5000 // 5k rows
    };
  }

  /**
   * Optimize spreadsheet processing with intelligent strategy selection
   */
  async optimizeSpreadsheetProcessing(
    spreadsheetData: SpreadsheetData,
    operation: string,
    sessionId: string
  ): Promise<{
    optimizedData: SpreadsheetData;
    optimizationResult: OptimizationResult;
    streamId?: string;
  }> {
    const startTime = performance.now();
    const dataSize = this.calculateDataSize(spreadsheetData);
    
    // Determine optimization strategy based on data size and operation
    const strategy = this.selectOptimizationStrategy(dataSize, operation);
    
    logger.info(`Applying optimization strategy: ${strategy} for operation: ${operation}`);
    
    let optimizedData = spreadsheetData;
    let streamId: string | undefined;
    
    // Apply optimizations based on strategy
    switch (strategy) {
      case 'lazy-loading':
        optimizedData = await this.applyLazyLoading(spreadsheetData);
        break;
        
      case 'streaming':
        streamId = await this.setupStreaming(sessionId, operation, dataSize);
        optimizedData = await this.processWithStreaming(spreadsheetData, streamId);
        break;
        
      case 'parallel-processing':
        streamId = await this.setupStreaming(sessionId, operation, dataSize);
        optimizedData = await this.processWithParallelization(spreadsheetData, streamId);
        break;
        
      case 'hybrid':
        streamId = await this.setupStreaming(sessionId, operation, dataSize);
        optimizedData = await this.applyHybridOptimization(spreadsheetData, streamId);
        break;
        
      default:
        optimizedData = await this.applyCachingOnly(spreadsheetData, operation);
    }
    
    const optimizedTime = performance.now() - startTime;
    
    // Record optimization result
    const optimizationResult: OptimizationResult = {
      strategy,
      performance: {
        optimizedTime,
        improvement: 0 // Will be calculated if we have baseline
      },
      cacheMetrics: this.config.enableCaching ? enhancedCacheService.getMetrics() : undefined
    };
    
    // Store optimization history
    this.recordOptimization(operation, optimizationResult);
    
    return {
      optimizedData,
      optimizationResult,
      streamId
    };
  }

  /**
   * Process large dataset with intelligent optimization
   */
  async processLargeDataset<T, R>(
    dataset: T[],
    processor: (item: T, index: number) => Promise<R> | R,
    options: LargeDatasetProcessingOptions = {}
  ): Promise<{
    results: R[];
    metrics: {
      totalTime: number;
      itemsPerSecond: number;
      cacheHitRate?: number;
      parallelEfficiency?: number;
    };
    streamId?: string;
  }> {
    const startTime = performance.now();
    const datasetSize = dataset.length;
    
    const {
      chunkSize = Math.min(1000, Math.max(100, Math.floor(datasetSize / 10))),
      maxConcurrency = Math.min(4, Math.max(1, Math.floor(datasetSize / 5000))),
      enableProgressUpdates = true,
      cacheIntermediateResults = true,
      streamResults = datasetSize > this.config.streamingThreshold
    } = options;
    
    let streamId: string | undefined;
    
    // Setup streaming if enabled
    if (streamResults) {
      streamId = await streamingResponseService.startStream(
        'dataset-processing',
        'large-dataset-processing',
        100,
        { datasetSize, chunkSize, maxConcurrency }
      );
    }
    
    let results: R[];
    
    // Choose processing strategy based on dataset size
    if (datasetSize > this.config.processingThreshold && this.config.enableParallelProcessing) {
      // Use parallel processing for large datasets
      results = await this.processDatasetInParallel(
        dataset,
        processor,
        { chunkSize, maxConcurrency, streamId, cacheIntermediateResults }
      );
    } else if (streamId) {
      // Use streaming for medium datasets
      results = await streamingResponseService.processLargeDataset(
        streamId,
        dataset,
        processor,
        { batchSize: chunkSize }
      );
    } else {
      // Process sequentially for small datasets
      results = [];
      for (let i = 0; i < dataset.length; i++) {
        const result = await processor(dataset[i]!, i);
        results.push(result);
      }
    }
    
    const totalTime = performance.now() - startTime;
    const itemsPerSecond = datasetSize / (totalTime / 1000);
    
    // Complete streaming if active
    if (streamId) {
      await streamingResponseService.completeStream(streamId, {
        totalResults: results.length,
        processingTime: totalTime,
        itemsPerSecond
      });
    }
    
    // Calculate metrics
    const metrics = {
      totalTime,
      itemsPerSecond,
      cacheHitRate: this.config.enableCaching ? 
        enhancedCacheService.getMetrics().overall.hitRate : undefined,
      parallelEfficiency: datasetSize > this.config.processingThreshold ? 
        this.calculateParallelEfficiency(totalTime, datasetSize, maxConcurrency) : undefined
    };
    
    // Record performance metrics
    PerformanceMonitor.recordMetric('large-dataset-processing', totalTime, {
      datasetSize,
      strategy: datasetSize > this.config.processingThreshold ? 'parallel' : 'sequential',
      itemsPerSecond,
      chunkSize,
      maxConcurrency
    });
    
    return { results, metrics, streamId };
  }

  /**
   * Optimize cache usage based on access patterns
   */
  async optimizeCacheUsage(): Promise<{
    optimizations: string[];
    performance: {
      before: any;
      after: any;
      improvement: number;
    };
  }> {
    const beforeMetrics = enhancedCacheService.getMetrics();
    
    // Run cache optimization
    const optimizationResult = await enhancedCacheService.optimize();
    
    const afterMetrics = enhancedCacheService.getMetrics();
    
    const improvement = this.calculateCacheImprovement(beforeMetrics, afterMetrics);
    
    return {
      optimizations: optimizationResult.recommendations,
      performance: {
        before: beforeMetrics,
        after: afterMetrics,
        improvement
      }
    };
  }

  /**
   * Get comprehensive performance analytics
   */
  getPerformanceAnalytics(): {
    systemMetrics: {
      cachePerformance: any;
      processingStats: any;
      streamingStats: any;
    };
    optimizationHistory: Map<string, OptimizationResult[]>;
    recommendations: string[];
  } {
    const cachePerformance = this.config.enableCaching ? 
      enhancedCacheService.getMetrics() : null;
    
    const processingStats = this.config.enableParallelProcessing ? 
      parallelProcessingService.getProcessingStats() : null;
    
    const streamingStats = streamingResponseService.getActiveStreams();
    
    const recommendations = this.generatePerformanceRecommendations(
      cachePerformance,
      processingStats,
      streamingStats
    );
    
    return {
      systemMetrics: {
        cachePerformance,
        processingStats,
        streamingStats
      },
      optimizationHistory: this.optimizationHistory,
      recommendations
    };
  }

  // Private helper methods

  private calculateDataSize(spreadsheetData: SpreadsheetData): number {
    return spreadsheetData.sheets.reduce((total, sheet) => {
      return total + (sheet.dimensions.rows * sheet.dimensions.cols);
    }, 0);
  }

  private selectOptimizationStrategy(dataSize: number, operation: string): string {
    // Very large datasets (>100k cells)
    if (dataSize > 100000) {
      return 'hybrid'; // Combine multiple strategies
    }
    
    // Large datasets (>50k cells)
    if (dataSize > 50000) {
      return 'parallel-processing';
    }
    
    // Medium datasets (>10k cells)
    if (dataSize > 10000) {
      return 'streaming';
    }
    
    // Medium-small datasets (>5k cells)
    if (dataSize > 5000) {
      return 'lazy-loading';
    }
    
    // Small datasets
    return 'caching-only';
  }

  private async applyLazyLoading(spreadsheetData: SpreadsheetData): Promise<SpreadsheetData> {
    return await lazyLoadingService.convertToLazyLoaded(spreadsheetData);
  }

  private async setupStreaming(sessionId: string, operation: string, dataSize: number): Promise<string> {
    return await streamingResponseService.startStream(
      sessionId,
      operation,
      100,
      { dataSize, optimization: 'streaming' }
    );
  }

  private async processWithStreaming(
    spreadsheetData: SpreadsheetData,
    streamId: string
  ): Promise<SpreadsheetData> {
    // Apply lazy loading first
    const lazyData = await this.applyLazyLoading(spreadsheetData);
    
    // Send progress updates
    await streamingResponseService.sendProgress(streamId, {
      stage: 'streaming-optimization',
      progress: 50,
      message: 'Applied lazy loading optimization'
    });
    
    // Apply caching
    const cacheKey = `optimized_spreadsheet_${Date.now()}`;
    await enhancedCacheService.set(cacheKey, lazyData, {
      ttl: 3600,
      tags: ['spreadsheet', 'optimized'],
      priority: 'high'
    });
    
    await streamingResponseService.sendProgress(streamId, {
      stage: 'streaming-optimization',
      progress: 100,
      message: 'Completed streaming optimization'
    });
    
    return lazyData;
  }

  private async processWithParallelization(
    spreadsheetData: SpreadsheetData,
    streamId: string
  ): Promise<SpreadsheetData> {
    // Process sheets in parallel
    const sheetTasks = spreadsheetData.sheets.map((sheet, index) => ({
      id: `sheet_${index}`,
      data: sheet,
      processor: 'optimizeSheet',
      priority: 'high' as const
    }));
    
    const optimizedSheets = await parallelProcessingService.processInParallel(
      sheetTasks,
      {
        streamId,
        onProgress: (completed, total) => {
          streamingResponseService.sendProgress(streamId, {
            stage: 'parallel-sheet-processing',
            progress: (completed / total) * 100,
            message: `Processed ${completed} of ${total} sheets`
          });
        }
      }
    );
    
    const processedSheets = optimizedSheets
      .filter(result => result.result)
      .map(result => result.result as Sheet);
    
    return {
      ...spreadsheetData,
      sheets: processedSheets
    };
  }

  private async applyHybridOptimization(
    spreadsheetData: SpreadsheetData,
    streamId: string
  ): Promise<SpreadsheetData> {
    // Combine lazy loading, parallel processing, and aggressive caching
    
    // Step 1: Apply lazy loading
    await streamingResponseService.sendProgress(streamId, {
      stage: 'hybrid-optimization',
      progress: 25,
      message: 'Applying lazy loading...'
    });
    
    const lazyData = await this.applyLazyLoading(spreadsheetData);
    
    // Step 2: Process with parallelization
    await streamingResponseService.sendProgress(streamId, {
      stage: 'hybrid-optimization',
      progress: 50,
      message: 'Processing with parallelization...'
    });
    
    const parallelData = await this.processWithParallelization(lazyData, streamId);
    
    // Step 3: Apply aggressive caching
    await streamingResponseService.sendProgress(streamId, {
      stage: 'hybrid-optimization',
      progress: 75,
      message: 'Applying aggressive caching...'
    });
    
    const cacheKey = `hybrid_optimized_${Date.now()}`;
    await enhancedCacheService.set(cacheKey, parallelData, {
      ttl: 7200, // 2 hours
      tags: ['spreadsheet', 'hybrid-optimized'],
      priority: 'high'
    });
    
    await streamingResponseService.sendProgress(streamId, {
      stage: 'hybrid-optimization',
      progress: 100,
      message: 'Completed hybrid optimization'
    });
    
    return parallelData;
  }

  private async applyCachingOnly(
    spreadsheetData: SpreadsheetData,
    operation: string
  ): Promise<SpreadsheetData> {
    const cacheKey = `spreadsheet_${operation}_${Date.now()}`;
    
    await enhancedCacheService.set(cacheKey, spreadsheetData, {
      ttl: 1800, // 30 minutes
      tags: ['spreadsheet', operation],
      priority: 'medium'
    });
    
    return spreadsheetData;
  }

  private async processDatasetInParallel<T, R>(
    dataset: T[],
    processor: (item: T, index: number) => Promise<R> | R,
    options: {
      chunkSize: number;
      maxConcurrency: number;
      streamId?: string;
      cacheIntermediateResults: boolean;
    }
  ): Promise<R[]> {
    return await parallelProcessingService.processDatasetInParallel(
      dataset,
      async (chunk: T[], chunkIndex: number) => {
        const chunkResults: R[] = [];
        
        for (let i = 0; i < chunk.length; i++) {
          const item = chunk[i]!;
          const result = await processor(item, chunkIndex * options.chunkSize + i);
          chunkResults.push(result);
        }
        
        // Cache intermediate results if enabled
        if (options.cacheIntermediateResults) {
          const cacheKey = `chunk_result_${chunkIndex}`;
          await enhancedCacheService.set(cacheKey, chunkResults, {
            ttl: 3600,
            tags: ['chunk-result'],
            priority: 'low'
          });
        }
        
        return chunkResults;
      },
      {
        chunkSize: options.chunkSize,
        streamId: options.streamId
      }
    );
  }

  private calculateParallelEfficiency(
    totalTime: number,
    datasetSize: number,
    maxConcurrency: number
  ): number {
    // Theoretical sequential time (rough estimate)
    const estimatedSequentialTime = totalTime * maxConcurrency;
    
    // Efficiency = (Sequential Time - Parallel Time) / Sequential Time
    return Math.max(0, (estimatedSequentialTime - totalTime) / estimatedSequentialTime * 100);
  }

  private calculateCacheImprovement(beforeMetrics: any, afterMetrics: any): number {
    if (!beforeMetrics || !afterMetrics) return 0;
    
    const beforeHitRate = beforeMetrics.overall.hitRate;
    const afterHitRate = afterMetrics.overall.hitRate;
    
    return ((afterHitRate - beforeHitRate) / beforeHitRate) * 100;
  }

  private recordOptimization(operation: string, result: OptimizationResult): void {
    if (!this.optimizationHistory.has(operation)) {
      this.optimizationHistory.set(operation, []);
    }
    
    const history = this.optimizationHistory.get(operation)!;
    history.push(result);
    
    // Keep only last 100 results per operation
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
  }

  private generatePerformanceRecommendations(
    cachePerformance: any,
    processingStats: any,
    streamingStats: any
  ): string[] {
    const recommendations: string[] = [];
    
    // Cache recommendations
    if (cachePerformance && cachePerformance.overall.hitRate < 0.7) {
      recommendations.push('Consider increasing cache TTL or cache size for better hit rates');
    }
    
    if (cachePerformance && cachePerformance.memoryUsage.utilization < 50) {
      recommendations.push('Memory cache is underutilized, consider caching more frequently accessed data');
    }
    
    // Processing recommendations
    if (processingStats && processingStats.processingPool.activeTasks >= processingStats.processingPool.maxConcurrency) {
      recommendations.push('Processing pool is fully utilized, consider increasing concurrency');
    }
    
    // Streaming recommendations
    if (streamingStats && streamingStats.length > 10) {
      recommendations.push('High number of active streams, consider implementing stream pooling');
    }
    
    return recommendations;
  }
}

// Create singleton instance
export const enhancedPerformanceService = new EnhancedPerformanceService();