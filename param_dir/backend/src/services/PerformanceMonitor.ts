/**
 * Performance monitoring utility for tracking boundary analysis and CSV parsing performance
 */

export interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: Date;
  metadata?: Record<string, any> | undefined;
}

export interface PerformanceStats {
  operation: string;
  count: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  lastUpdated: Date;
}

export interface PerformanceThresholds {
  warning: number; // milliseconds
  critical: number; // milliseconds
}

export class PerformanceMonitor {
  private static metrics: PerformanceMetric[] = [];
  private static readonly MAX_METRICS = 1000; // Keep last 1000 metrics
  
  // Performance thresholds for different operations
  private static readonly thresholds: Record<string, PerformanceThresholds> = {
    'boundary-analysis': { warning: 200, critical: 500 },
    'csv-parsing': { warning: 500, critical: 1500 },
    'range-validation': { warning: 10, critical: 50 },
    'delimiter-detection': { warning: 50, critical: 200 },
    'encoding-detection': { warning: 30, critical: 100 }
  };

  /**
   * Record a performance metric
   */
  public static recordMetric(
    operation: string, 
    duration: number, 
    metadata?: Record<string, any>
  ): void {
    const metric: PerformanceMetric = {
      operation,
      duration,
      timestamp: new Date(),
      ...(metadata && { metadata })
    };

    this.metrics.push(metric);

    // Keep only the most recent metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    // Check thresholds and log warnings
    this.checkThresholds(metric);
  }

  /**
   * Time an operation and record the metric
   */
  public static async timeOperation<T>(
    operation: string,
    fn: () => Promise<T> | T,
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      
      this.recordMetric(operation, duration, {
        ...metadata,
        success: true
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      this.recordMetric(operation, duration, {
        ...metadata,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw error;
    }
  }

  /**
   * Get performance statistics for an operation
   */
  public static getStats(operation: string): PerformanceStats | null {
    const operationMetrics = this.metrics.filter(m => m.operation === operation);
    
    if (operationMetrics.length === 0) {
      return null;
    }

    const durations = operationMetrics.map(m => m.duration);
    const totalTime = durations.reduce((sum, duration) => sum + duration, 0);

    return {
      operation,
      count: operationMetrics.length,
      totalTime,
      averageTime: totalTime / operationMetrics.length,
      minTime: Math.min(...durations),
      maxTime: Math.max(...durations),
      lastUpdated: operationMetrics[operationMetrics.length - 1]!.timestamp
    };
  }

  /**
   * Get all performance statistics
   */
  public static getAllStats(): PerformanceStats[] {
    const operations = [...new Set(this.metrics.map(m => m.operation))];
    return operations.map(op => this.getStats(op)).filter(Boolean) as PerformanceStats[];
  }

  /**
   * Get recent metrics for an operation
   */
  public static getRecentMetrics(
    operation: string, 
    limit: number = 10
  ): PerformanceMetric[] {
    return this.metrics
      .filter(m => m.operation === operation)
      .slice(-limit);
  }

  /**
   * Get performance trends over time
   */
  public static getTrends(
    operation: string,
    timeWindowMs: number = 60000 // Default: last minute
  ): {
    averageTime: number;
    count: number;
    trend: 'improving' | 'degrading' | 'stable';
  } {
    const now = new Date();
    const cutoff = new Date(now.getTime() - timeWindowMs);
    
    const recentMetrics = this.metrics.filter(m => 
      m.operation === operation && m.timestamp >= cutoff
    );

    if (recentMetrics.length < 2) {
      return {
        averageTime: recentMetrics[0]?.duration || 0,
        count: recentMetrics.length,
        trend: 'stable'
      };
    }

    const durations = recentMetrics.map(m => m.duration);
    const averageTime = durations.reduce((sum, d) => sum + d, 0) / durations.length;

    // Calculate trend by comparing first and second half
    const midpoint = Math.floor(durations.length / 2);
    const firstHalf = durations.slice(0, midpoint);
    const secondHalf = durations.slice(midpoint);

    const firstAvg = firstHalf.reduce((sum, d) => sum + d, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d, 0) / secondHalf.length;

    let trend: 'improving' | 'degrading' | 'stable' = 'stable';
    const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;

    if (changePercent > 10) {
      trend = 'degrading';
    } else if (changePercent < -10) {
      trend = 'improving';
    }

    return {
      averageTime,
      count: recentMetrics.length,
      trend
    };
  }

  /**
   * Check if a metric exceeds performance thresholds
   */
  private static checkThresholds(metric: PerformanceMetric): void {
    const threshold = this.thresholds[metric.operation];
    if (!threshold) return;

    if (metric.duration > threshold.critical) {
      console.warn(`CRITICAL: ${metric.operation} took ${metric.duration.toFixed(2)}ms (threshold: ${threshold.critical}ms)`, {
        operation: metric.operation,
        duration: metric.duration,
        metadata: metric.metadata
      });
    } else if (metric.duration > threshold.warning) {
      console.warn(`WARNING: ${metric.operation} took ${metric.duration.toFixed(2)}ms (threshold: ${threshold.warning}ms)`, {
        operation: metric.operation,
        duration: metric.duration,
        metadata: metric.metadata
      });
    }
  }

  /**
   * Set custom thresholds for an operation
   */
  public static setThresholds(operation: string, thresholds: PerformanceThresholds): void {
    this.thresholds[operation] = thresholds;
  }

  /**
   * Clear all metrics
   */
  public static clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Get system performance summary
   */
  public static getSystemSummary(): {
    totalOperations: number;
    averageResponseTime: number;
    slowestOperations: Array<{ operation: string; averageTime: number }>;
    recentErrors: Array<{ operation: string; error: string; timestamp: Date }>;
  } {
    const stats = this.getAllStats();
    const totalOperations = stats.reduce((sum, stat) => sum + stat.count, 0);
    const weightedAverage = stats.reduce((sum, stat) => 
      sum + (stat.averageTime * stat.count), 0) / totalOperations;

    const slowestOperations = stats
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, 5)
      .map(stat => ({
        operation: stat.operation,
        averageTime: stat.averageTime
      }));

    const recentErrors = this.metrics
      .filter(m => m.metadata && 'success' in m.metadata && m.metadata['success'] === false)
      .slice(-10)
      .map(m => ({
        operation: m.operation,
        error: (m.metadata && 'error' in m.metadata ? String(m.metadata['error']) : 'Unknown error'),
        timestamp: m.timestamp
      }));

    return {
      totalOperations,
      averageResponseTime: weightedAverage || 0,
      slowestOperations,
      recentErrors
    };
  }

  /**
   * Export metrics for external analysis
   */
  public static exportMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Import metrics (useful for testing or data migration)
   */
  public static importMetrics(metrics: PerformanceMetric[]): void {
    this.metrics = [...metrics];
    
    // Keep only the most recent metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }
  }
}