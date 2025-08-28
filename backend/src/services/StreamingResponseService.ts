import { EventEmitter } from 'events';
import { logger } from '../monitoring';
import { PerformanceMonitor } from './PerformanceMonitor';

export interface StreamChunk {
  id: string;
  type: 'data' | 'progress' | 'error' | 'complete';
  payload: any;
  timestamp: number;
  sequence: number;
}

export interface StreamingOptions {
  chunkSize?: number;
  maxBufferSize?: number;
  timeout?: number;
  enableCompression?: boolean;
  progressInterval?: number;
}

export interface ProgressUpdate {
  stage: string;
  progress: number; // 0-100
  message: string;
  estimatedTimeRemaining?: number;
}

export interface StreamingContext {
  sessionId: string;
  operation: string;
  startTime: number;
  totalSteps: number;
  currentStep: number;
  metadata: Record<string, any>;
}

/**
 * Streaming response service for providing immediate feedback during long-running operations
 * Supports chunked data delivery, progress updates, and real-time status communication
 */
export class StreamingResponseService extends EventEmitter {
  private activeStreams: Map<string, StreamingContext> = new Map();
  private streamBuffers: Map<string, StreamChunk[]> = new Map();
  private readonly defaultOptions: Required<StreamingOptions>;

  constructor(options: StreamingOptions = {}) {
    super();
    this.defaultOptions = {
      chunkSize: options.chunkSize || 1024 * 8, // 8KB chunks
      maxBufferSize: options.maxBufferSize || 1024 * 1024 * 10, // 10MB buffer
      timeout: options.timeout || 30000, // 30 seconds
      enableCompression: options.enableCompression ?? true,
      progressInterval: options.progressInterval || 1000 // 1 second
    };
  }

  /**
   * Start a new streaming operation
   */
  async startStream(
    sessionId: string,
    operation: string,
    totalSteps: number = 100,
    metadata: Record<string, any> = {}
  ): Promise<string> {
    const streamId = `${sessionId}_${operation}_${Date.now()}`;
    
    const context: StreamingContext = {
      sessionId,
      operation,
      startTime: Date.now(),
      totalSteps,
      currentStep: 0,
      metadata
    };
    
    this.activeStreams.set(streamId, context);
    this.streamBuffers.set(streamId, []);
    
    // Send initial progress update
    await this.sendProgress(streamId, {
      stage: 'initializing',
      progress: 0,
      message: `Starting ${operation}...`
    });
    
    logger.info(`Started streaming operation: ${streamId}`);
    return streamId;
  }

  /**
   * Send data chunk to stream
   */
  async sendChunk(
    streamId: string,
    data: any,
    type: 'data' | 'progress' | 'error' | 'complete' = 'data'
  ): Promise<boolean> {
    const context = this.activeStreams.get(streamId);
    if (!context) {
      logger.warn(`Attempted to send chunk to non-existent stream: ${streamId}`);
      return false;
    }

    try {
      const chunk: StreamChunk = {
        id: `${streamId}_${Date.now()}_${Math.random()}`,
        type,
        payload: data,
        timestamp: Date.now(),
        sequence: this.getNextSequence(streamId)
      };

      // Add to buffer
      const buffer = this.streamBuffers.get(streamId) || [];
      buffer.push(chunk);
      
      // Check buffer size and flush if needed
      const bufferSize = this.calculateBufferSize(buffer);
      if (bufferSize > this.defaultOptions.maxBufferSize) {
        await this.flushBuffer(streamId);
      }

      // Emit chunk event for real-time listeners
      this.emit('chunk', streamId, chunk);
      
      return true;
    } catch (error) {
      logger.error(`Error sending chunk to stream ${streamId}:`, error);
      return false;
    }
  }

  /**
   * Send progress update
   */
  async sendProgress(streamId: string, progress: ProgressUpdate): Promise<boolean> {
    const context = this.activeStreams.get(streamId);
    if (!context) return false;

    // Calculate estimated time remaining
    if (progress.progress > 0) {
      const elapsed = Date.now() - context.startTime;
      const estimatedTotal = (elapsed / progress.progress) * 100;
      progress.estimatedTimeRemaining = estimatedTotal - elapsed;
    }

    return this.sendChunk(streamId, progress, 'progress');
  }

  /**
   * Send error to stream
   */
  async sendError(streamId: string, error: Error | string): Promise<boolean> {
    const errorData = {
      message: error instanceof Error ? error.message : error,
      timestamp: Date.now(),
      stack: error instanceof Error ? error.stack : undefined
    };

    return this.sendChunk(streamId, errorData, 'error');
  }

  /**
   * Complete and close stream
   */
  async completeStream(streamId: string, finalData?: any): Promise<boolean> {
    const context = this.activeStreams.get(streamId);
    if (!context) return false;

    try {
      // Send final data if provided
      if (finalData) {
        await this.sendChunk(streamId, finalData, 'data');
      }

      // Send completion signal
      await this.sendChunk(streamId, {
        message: 'Operation completed successfully',
        duration: Date.now() - context.startTime,
        totalChunks: this.streamBuffers.get(streamId)?.length || 0
      }, 'complete');

      // Flush remaining buffer
      await this.flushBuffer(streamId);

      // Record performance metrics
      PerformanceMonitor.recordMetric('streaming-operation', Date.now() - context.startTime, {
        operation: context.operation,
        totalSteps: context.totalSteps,
        sessionId: context.sessionId
      });

      // Cleanup
      this.activeStreams.delete(streamId);
      this.streamBuffers.delete(streamId);

      this.emit('complete', streamId);
      logger.info(`Completed streaming operation: ${streamId}`);
      
      return true;
    } catch (error) {
      logger.error(`Error completing stream ${streamId}:`, error);
      return false;
    }
  }

  /**
   * Process large dataset with streaming updates
   */
  async processLargeDataset<T, R>(
    streamId: string,
    dataset: T[],
    processor: (item: T, index: number) => Promise<R> | R,
    options: {
      batchSize?: number;
      progressCallback?: (progress: ProgressUpdate) => void;
    } = {}
  ): Promise<R[]> {
    const { batchSize = 100, progressCallback } = options;
    const results: R[] = [];
    const total = dataset.length;
    
    await this.sendProgress(streamId, {
      stage: 'processing',
      progress: 0,
      message: `Processing ${total} items...`
    });

    for (let i = 0; i < dataset.length; i += batchSize) {
      const batch = dataset.slice(i, i + batchSize);
      const batchResults: R[] = [];

      // Process batch
      for (let j = 0; j < batch.length; j++) {
        const item = batch[j]!;
        const result = await processor(item, i + j);
        batchResults.push(result);
      }

      results.push(...batchResults);

      // Send progress update
      const progress = Math.min(((i + batch.length) / total) * 100, 100);
      const progressUpdate: ProgressUpdate = {
        stage: 'processing',
        progress,
        message: `Processed ${i + batch.length} of ${total} items`
      };

      await this.sendProgress(streamId, progressUpdate);
      
      if (progressCallback) {
        progressCallback(progressUpdate);
      }

      // Send intermediate results
      await this.sendChunk(streamId, {
        batchIndex: Math.floor(i / batchSize),
        batchSize: batch.length,
        results: batchResults,
        totalProcessed: i + batch.length
      });
    }

    return results;
  }

  /**
   * Stream analysis results as they become available
   */
  async streamAnalysisResults(
    streamId: string,
    analysisSteps: Array<{
      name: string;
      executor: () => Promise<any>;
      weight?: number;
    }>
  ): Promise<Map<string, any>> {
    const results = new Map<string, any>();
    const totalWeight = analysisSteps.reduce((sum, step) => sum + (step.weight || 1), 0);
    let completedWeight = 0;

    for (const step of analysisSteps) {
      const stepStartTime = Date.now();
      
      await this.sendProgress(streamId, {
        stage: step.name,
        progress: (completedWeight / totalWeight) * 100,
        message: `Executing ${step.name}...`
      });

      try {
        const result = await PerformanceMonitor.timeOperation(
          `streaming-analysis-${step.name}`,
          step.executor
        );

        results.set(step.name, result);
        completedWeight += step.weight || 1;

        // Stream the result immediately
        await this.sendChunk(streamId, {
          stepName: step.name,
          result,
          duration: Date.now() - stepStartTime,
          progress: (completedWeight / totalWeight) * 100
        });

        await this.sendProgress(streamId, {
          stage: step.name,
          progress: (completedWeight / totalWeight) * 100,
          message: `Completed ${step.name}`
        });

      } catch (error) {
        logger.error(`Error in analysis step ${step.name}:`, error);
        await this.sendError(streamId, `Failed to execute ${step.name}: ${error}`);
        
        // Continue with other steps
        completedWeight += step.weight || 1;
      }
    }

    return results;
  }

  /**
   * Get stream status
   */
  getStreamStatus(streamId: string): {
    exists: boolean;
    context?: StreamingContext;
    bufferSize: number;
    chunksCount: number;
  } {
    const context = this.activeStreams.get(streamId);
    const buffer = this.streamBuffers.get(streamId) || [];
    
    return {
      exists: !!context,
      context,
      bufferSize: this.calculateBufferSize(buffer),
      chunksCount: buffer.length
    };
  }

  /**
   * Get all active streams
   */
  getActiveStreams(): Array<{
    streamId: string;
    context: StreamingContext;
    bufferInfo: { size: number; chunks: number };
  }> {
    return Array.from(this.activeStreams.entries()).map(([streamId, context]) => {
      const buffer = this.streamBuffers.get(streamId) || [];
      return {
        streamId,
        context,
        bufferInfo: {
          size: this.calculateBufferSize(buffer),
          chunks: buffer.length
        }
      };
    });
  }

  /**
   * Flush buffer for a specific stream
   */
  private async flushBuffer(streamId: string): Promise<void> {
    const buffer = this.streamBuffers.get(streamId);
    if (!buffer || buffer.length === 0) return;

    try {
      // Emit flush event with all buffered chunks
      this.emit('flush', streamId, [...buffer]);
      
      // Clear buffer
      this.streamBuffers.set(streamId, []);
      
      logger.debug(`Flushed ${buffer.length} chunks for stream ${streamId}`);
    } catch (error) {
      logger.error(`Error flushing buffer for stream ${streamId}:`, error);
    }
  }

  /**
   * Calculate buffer size in bytes
   */
  private calculateBufferSize(buffer: StreamChunk[]): number {
    return buffer.reduce((total, chunk) => {
      try {
        return total + JSON.stringify(chunk).length;
      } catch {
        return total + 1024; // Estimate for non-serializable chunks
      }
    }, 0);
  }

  /**
   * Get next sequence number for stream
   */
  private getNextSequence(streamId: string): number {
    const buffer = this.streamBuffers.get(streamId) || [];
    return buffer.length;
  }

  /**
   * Cleanup expired streams
   */
  private cleanupExpiredStreams(): void {
    const now = Date.now();
    const expiredStreams: string[] = [];

    for (const [streamId, context] of this.activeStreams.entries()) {
      if (now - context.startTime > this.defaultOptions.timeout) {
        expiredStreams.push(streamId);
      }
    }

    for (const streamId of expiredStreams) {
      logger.warn(`Cleaning up expired stream: ${streamId}`);
      this.activeStreams.delete(streamId);
      this.streamBuffers.delete(streamId);
      this.emit('expired', streamId);
    }
  }

  /**
   * Start cleanup interval
   */
  startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupExpiredStreams();
    }, 60000); // Check every minute
  }
}

// Create singleton instance
export const streamingResponseService = new StreamingResponseService();