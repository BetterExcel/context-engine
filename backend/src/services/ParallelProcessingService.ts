import { cpus } from 'os';
import logger from '../monitoring/logger';
import { PerformanceMonitor } from './PerformanceMonitor';
import { streamingResponseService } from './StreamingResponseService';

export interface ProcessingTask<T, R> {
  id: string;
  data: T;
  processor: string; // Function name or processor type
  priority: 'low' | 'medium' | 'high';
  timeout?: number;
  retries?: number;
}

export interface ProcessingResult<R> {
  taskId: string;
  result?: R;
  error?: string;
  duration: number;
}

export interface ProcessingPool {
  maxConcurrency: number;
  activeTasks: Set<string>;
  taskQueue: ProcessingTask<any, any>[];
  results: Map<string, ProcessingResult<any>>;
}

export interface ParallelProcessingOptions {
  maxWorkers?: number;
  taskTimeout?: number;
  maxRetries?: number;
  enableStreaming?: boolean;
  streamId?: string;
}

/**
 * Parallel processing service for handling CPU-intensive operations
 * Uses Promise-based concurrency for reliable parallel processing
 */
export class ParallelProcessingService {
  private processingPool: ProcessingPool;
  private readonly maxConcurrency: number;
  private readonly taskTimeout: number;
  private readonly maxRetries: number;
  private processingStats: Map<string, { count: number; totalTime: number; errors: number }> = new Map();

  constructor(options: ParallelProcessingOptions = {}) {
    this.maxConcurrency = options.maxWorkers || Math.max(2, cpus().length - 1);
    this.taskTimeout = options.taskTimeout || 30000; // 30 seconds
    this.maxRetries = options.maxRetries || 3;
    
    this.processingPool = {
      maxConcurrency: this.maxConcurrency,
      activeTasks: new Set(),
      taskQueue: [],
      results: new Map()
    };

    logger.info(`Initialized processing pool with max concurrency: ${this.maxConcurrency}`);
  }

  /**
   * Process tasks in parallel with automatic load balancing
   */
  async processInParallel<T, R>(
    tasks: ProcessingTask<T, R>[],
    options: {
      streamId?: string;
      onProgress?: (completed: number, total: number) => void;
      onResult?: (result: ProcessingResult<R>) => void;
    } = {}
  ): Promise<ProcessingResult<R>[]> {
    const { streamId, onProgress, onResult } = options;
    const startTime = Date.now();
    
    if (streamId) {
      await streamingResponseService.sendProgress(streamId, {
        stage: 'parallel-processing',
        progress: 0,
        message: `Starting parallel processing of ${tasks.length} tasks...`
      });
    }

    // Sort tasks by priority
    const sortedTasks = this.sortTasksByPriority(tasks);
    
    // Process tasks with controlled concurrency
    const results: ProcessingResult<R>[] = [];
    let completedTasks = 0;
    
    // Process tasks in batches based on max concurrency
    for (let i = 0; i < sortedTasks.length; i += this.maxConcurrency) {
      const batch = sortedTasks.slice(i, i + this.maxConcurrency);
      const batchPromises = batch.map(task => this.processTask(task));
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      for (let j = 0; j < batchResults.length; j++) {
        const promiseResult = batchResults[j]!;
        let result: ProcessingResult<R>;
        
        if (promiseResult.status === 'fulfilled') {
          result = promiseResult.value;
        } else {
          result = {
            taskId: batch[j]?.id || 'unknown',
            error: promiseResult.reason instanceof Error ? promiseResult.reason.message : String(promiseResult.reason),
            duration: 0
          };
        }
        
        results.push(result);
        completedTasks++;
        
        if (onResult) {
          onResult(result);
        }
        
        if (onProgress) {
          onProgress(completedTasks, tasks.length);
        }
        
        if (streamId) {
          const progress = (completedTasks / tasks.length) * 100;
          await streamingResponseService.sendProgress(streamId, {
            stage: 'parallel-processing',
            progress,
            message: `Completed ${completedTasks} of ${tasks.length} tasks`
          });
          
          // Stream intermediate result
          await streamingResponseService.sendChunk(streamId, {
            type: 'task-result',
            taskId: result.taskId,
            result: result.result,
            progress
          });
        }
      }
    }
    
    const totalDuration = Date.now() - startTime;
    
    // Record performance metrics
    PerformanceMonitor.recordMetric('parallel-processing-batch', totalDuration, {
      taskCount: tasks.length,
      completedTasks,
      averageTaskTime: totalDuration / tasks.length,
      concurrency: this.maxConcurrency
    });
    
    if (streamId) {
      await streamingResponseService.sendProgress(streamId, {
        stage: 'parallel-processing',
        progress: 100,
        message: `Completed all ${tasks.length} tasks in ${totalDuration}ms`
      });
    }
    
    return results;
  }

  /**
   * Process large dataset in parallel chunks
   */
  async processDatasetInParallel<T, R>(
    dataset: T[],
    processor: (chunk: T[], chunkIndex: number) => Promise<R[]> | R[],
    options: {
      chunkSize?: number;
      streamId?: string;
      onChunkComplete?: (chunkIndex: number, results: R[]) => void;
    } = {}
  ): Promise<R[]> {
    const { chunkSize = 1000, streamId, onChunkComplete } = options;
    const chunks = this.chunkArray(dataset, chunkSize);
    
    if (streamId) {
      await streamingResponseService.sendProgress(streamId, {
        stage: 'dataset-chunking',
        progress: 0,
        message: `Split dataset into ${chunks.length} chunks of ${chunkSize} items each`
      });
    }
    
    // Create processing tasks for each chunk
    const tasks: ProcessingTask<T[], R[]>[] = chunks.map((chunk, index) => ({
      id: `chunk_${index}`,
      data: chunk,
      processor: 'processChunk',
      priority: 'medium',
      timeout: this.taskTimeout
    }));
    
    // Process chunks in parallel
    const chunkResults = await this.processInParallel(tasks, {
      streamId,
      onResult: (result) => {
        if (result.result && onChunkComplete) {
          const chunkIndex = parseInt(result.taskId.split('_')[1] || '0');
          onChunkComplete(chunkIndex, result.result);
        }
      }
    });
    
    // Flatten results
    const allResults: R[] = [];
    for (const chunkResult of chunkResults) {
      if (chunkResult.result) {
        allResults.push(...chunkResult.result);
      }
    }
    
    return allResults;
  }

  /**
   * Process complex analysis operations in parallel
   */
  async processComplexAnalysis(
    analysisOperations: Array<{
      name: string;
      data: any;
      processor: string;
      dependencies?: string[];
      priority?: 'low' | 'medium' | 'high';
    }>,
    streamId?: string
  ): Promise<Map<string, any>> {
    const results = new Map<string, any>();
    const completed = new Set<string>();
    const inProgress = new Set<string>();
    
    if (streamId) {
      await streamingResponseService.sendProgress(streamId, {
        stage: 'complex-analysis',
        progress: 0,
        message: `Starting complex analysis with ${analysisOperations.length} operations`
      });
    }
    
    // Process operations in dependency order
    while (completed.size < analysisOperations.length) {
      const readyOperations = analysisOperations.filter(op => 
        !completed.has(op.name) && 
        !inProgress.has(op.name) &&
        (op.dependencies || []).every(dep => completed.has(dep))
      );
      
      if (readyOperations.length === 0) {
        // Check for circular dependencies or other issues
        const remaining = analysisOperations.filter(op => !completed.has(op.name));
        logger.error('No ready operations found, possible circular dependency:', 
          remaining.map(op => op.name));
        break;
      }
      
      // Create tasks for ready operations
      const tasks: ProcessingTask<any, any>[] = readyOperations.map(op => ({
        id: op.name,
        data: op.data,
        processor: op.processor,
        priority: op.priority || 'medium'
      }));
      
      // Mark as in progress
      readyOperations.forEach(op => inProgress.add(op.name));
      
      // Process in parallel
      const batchResults = await this.processInParallel(tasks, {
        streamId,
        onResult: (result) => {
          if (result.result) {
            results.set(result.taskId, result.result);
            completed.add(result.taskId);
            inProgress.delete(result.taskId);
            
            if (streamId) {
              streamingResponseService.sendChunk(streamId, {
                type: 'analysis-result',
                operation: result.taskId,
                result: result.result,
                progress: (completed.size / analysisOperations.length) * 100
              });
            }
          } else {
            logger.error(`Analysis operation ${result.taskId} failed:`, result.error);
            inProgress.delete(result.taskId);
            // Mark as completed even if failed to avoid infinite loop
            completed.add(result.taskId);
          }
        }
      });
    }
    
    if (streamId) {
      await streamingResponseService.sendProgress(streamId, {
        stage: 'complex-analysis',
        progress: 100,
        message: `Completed complex analysis with ${results.size} successful operations`
      });
    }
    
    return results;
  }

  /**
   * Get processing statistics
   */
  getProcessingStats(): {
    processingPool: {
      maxConcurrency: number;
      activeTasks: number;
      queuedTasks: number;
    };
    performance: Array<{
      processor: string;
      taskCount: number;
      averageTime: number;
      errorRate: number;
    }>;
  } {
    const processingPoolStats = {
      maxConcurrency: this.processingPool.maxConcurrency,
      activeTasks: this.processingPool.activeTasks.size,
      queuedTasks: this.processingPool.taskQueue.length
    };
    
    const performanceStats = Array.from(this.processingStats.entries()).map(([processor, stats]) => ({
      processor,
      taskCount: stats.count,
      averageTime: stats.count > 0 ? stats.totalTime / stats.count : 0,
      errorRate: stats.count > 0 ? stats.errors / stats.count : 0
    }));
    
    return {
      processingPool: processingPoolStats,
      performance: performanceStats
    };
  }

  /**
   * Shutdown processing service gracefully
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down parallel processing service...');
    
    // Wait for current tasks to complete (with timeout)
    const shutdownTimeout = 10000; // 10 seconds
    const startTime = Date.now();
    
    while (this.processingPool.activeTasks.size > 0 && Date.now() - startTime < shutdownTimeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Clear remaining tasks
    this.processingPool.taskQueue = [];
    this.processingPool.activeTasks.clear();
    
    logger.info('Parallel processing service shutdown complete');
  }

  // Private helper methods

  private async processTask<T, R>(task: ProcessingTask<T, R>): Promise<ProcessingResult<R>> {
    const startTime = Date.now();
    
    try {
      // Add task to active set
      this.processingPool.activeTasks.add(task.id);
      
      // Process the task based on processor type
      let result: R;
      
      switch (task.processor) {
        case 'processChunk':
          result = await this.processChunk(task.data as any) as R;
          break;
        case 'analyzeData':
          result = await this.analyzeData(task.data) as R;
          break;
        case 'optimizeSheet':
          result = await this.optimizeSheet(task.data) as R;
          break;
        default:
          throw new Error(`Unknown processor: ${task.processor}`);
      }
      
      const duration = Date.now() - startTime;
      
      // Update stats
      this.updateProcessingStats(task.processor, duration, true);
      
      return {
        taskId: task.id,
        result,
        duration
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Update stats
      this.updateProcessingStats(task.processor, duration, false);
      
      return {
        taskId: task.id,
        error: error instanceof Error ? error.message : String(error),
        duration
      };
    } finally {
      // Remove from active set
      this.processingPool.activeTasks.delete(task.id);
    }
  }

  /**
   * Process a data chunk
   */
  private async processChunk(chunk: any[]): Promise<any[]> {
    // Simulate processing with some actual work
    return chunk.map(item => ({ 
      ...item, 
      processed: true,
      processedAt: Date.now()
    }));
  }

  /**
   * Analyze data
   */
  private async analyzeData(data: any): Promise<any> {
    // Simulate analysis work
    await new Promise(resolve => setTimeout(resolve, 10));
    return { 
      analysis: 'completed', 
      dataSize: JSON.stringify(data).length,
      timestamp: Date.now()
    };
  }

  /**
   * Optimize a spreadsheet sheet
   */
  private async optimizeSheet(sheet: any): Promise<any> {
    // Simulate sheet optimization
    await new Promise(resolve => setTimeout(resolve, 5));
    return {
      ...sheet,
      optimized: true,
      optimizedAt: Date.now()
    };
  }

  private sortTasksByPriority<T, R>(tasks: ProcessingTask<T, R>[]): ProcessingTask<T, R>[] {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return tasks.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private updateProcessingStats(processor: string, duration: number, success: boolean): void {
    let stats = this.processingStats.get(processor);
    if (!stats) {
      stats = { count: 0, totalTime: 0, errors: 0 };
      this.processingStats.set(processor, stats);
    }
    
    stats.count++;
    stats.totalTime += duration;
    if (!success) {
      stats.errors++;
    }
  }
}

// Create singleton instance
export const parallelProcessingService = new ParallelProcessingService();