import { cacheService, CacheService } from './CacheService';
import { logger } from '../monitoring';
import { PerformanceMonitor } from './PerformanceMonitor';

export interface CacheLevel {
  name: string;
  ttl: number;
  maxSize?: number;
  priority: number;
}

export interface CacheInvalidationRule {
  pattern: string;
  triggers: string[];
  cascadePatterns?: string[];
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
  averageResponseTime: number;
  memoryUsage: number;
}

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  tags: string[];
}

/**
 * Enhanced multi-level caching service with intelligent invalidation strategies
 * Supports memory, Redis, and disk-based caching with automatic optimization
 */
export class EnhancedCacheService {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private cacheMetrics: Map<string, CacheMetrics> = new Map();
  private invalidationRules: CacheInvalidationRule[] = [];
  private readonly maxMemorySize: number;
  private currentMemorySize: number = 0;

  // Cache levels configuration
  private readonly cacheLevels: CacheLevel[] = [
    { name: 'memory', ttl: 300, maxSize: 100 * 1024 * 1024, priority: 1 }, // 100MB, 5min
    { name: 'redis', ttl: 3600, priority: 2 }, // 1 hour
    { name: 'disk', ttl: 86400, priority: 3 } // 24 hours
  ];

  constructor(maxMemorySize: number = 100 * 1024 * 1024) { // 100MB default
    this.maxMemorySize = maxMemorySize;
    this.setupInvalidationRules();
    this.startCleanupInterval();
  }

  /**
   * Get value from multi-level cache with performance tracking
   */
  async get<T>(key: string, tags: string[] = []): Promise<T | null> {
    const startTime = performance.now();
    let result: T | null = null;
    let cacheLevel = '';

    try {
      // Level 1: Memory cache
      const memoryResult = this.getFromMemory<T>(key);
      if (memoryResult !== null) {
        result = memoryResult;
        cacheLevel = 'memory';
      } else {
        // Level 2: Redis cache
        const redisResult = await cacheService.get<T>(key);
        if (redisResult !== null) {
          result = redisResult;
          cacheLevel = 'redis';
          
          // Promote to memory cache
          await this.setInMemory(key, result, 300, tags);
        }
      }

      // Update metrics
      this.updateMetrics(key, result !== null, performance.now() - startTime, cacheLevel);
      
      return result;
    } catch (error) {
      logger.error(`Enhanced cache get error for key ${key}:`, error);
      this.updateMetrics(key, false, performance.now() - startTime, 'error');
      return null;
    }
  }

  /**
   * Set value in multi-level cache with intelligent placement
   */
  async set<T>(
    key: string, 
    value: T, 
    options: {
      ttl?: number;
      tags?: string[];
      priority?: 'low' | 'medium' | 'high';
      forceLevel?: string;
    } = {}
  ): Promise<boolean> {
    const { ttl = 3600, tags = [], priority = 'medium', forceLevel } = options;
    
    try {
      const valueSize = this.estimateSize(value);
      
      // Determine cache levels based on priority and size
      const targetLevels = this.determineCacheLevels(valueSize, priority, forceLevel);
      
      const promises: Promise<boolean>[] = [];
      
      for (const level of targetLevels) {
        switch (level) {
          case 'memory':
            promises.push(this.setInMemory(key, value, ttl, tags));
            break;
          case 'redis':
            promises.push(cacheService.set(key, value, { ttl }));
            break;
        }
      }
      
      const results = await Promise.all(promises);
      return results.some(result => result);
    } catch (error) {
      logger.error(`Enhanced cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Intelligent cache invalidation with cascade support
   */
  async invalidate(pattern: string, cascade: boolean = true): Promise<number> {
    let invalidatedCount = 0;
    
    try {
      // Invalidate memory cache
      const memoryKeys = Array.from(this.memoryCache.keys());
      const matchingMemoryKeys = memoryKeys.filter(key => this.matchesPattern(key, pattern));
      
      for (const key of matchingMemoryKeys) {
        this.memoryCache.delete(key);
        invalidatedCount++;
      }
      
      // Invalidate Redis cache
      const redisCount = await cacheService.clearPattern(pattern);
      invalidatedCount += redisCount;
      
      // Handle cascade invalidation
      if (cascade) {
        const cascadePatterns = this.getCascadePatterns(pattern);
        for (const cascadePattern of cascadePatterns) {
          invalidatedCount += await this.invalidate(cascadePattern, false);
        }
      }
      
      logger.info(`Invalidated ${invalidatedCount} cache entries for pattern: ${pattern}`);
      return invalidatedCount;
    } catch (error) {
      logger.error(`Cache invalidation error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Batch operations for improved performance
   */
  async mget<T>(keys: string[]): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>();
    const missingKeys: string[] = [];
    
    // Check memory cache first
    for (const key of keys) {
      const memoryResult = this.getFromMemory<T>(key);
      if (memoryResult !== null) {
        results.set(key, memoryResult);
      } else {
        missingKeys.push(key);
      }
    }
    
    // Batch fetch from Redis for missing keys
    if (missingKeys.length > 0) {
      const redisResults = await cacheService.mget<T>(missingKeys);
      
      for (let i = 0; i < missingKeys.length; i++) {
        const key = missingKeys[i]!;
        const value = redisResults[i];
        results.set(key, value);
        
        // Promote to memory if found in Redis
        if (value !== null) {
          await this.setInMemory(key, value, 300);
        }
      }
    }
    
    return results;
  }

  /**
   * Batch set operations
   */
  async mset(entries: Array<{
    key: string;
    value: any;
    ttl?: number;
    tags?: string[];
  }>): Promise<boolean> {
    try {
      const memoryEntries: typeof entries = [];
      const redisEntries: Array<{ key: string; value: any; ttl?: number }> = [];
      
      for (const entry of entries) {
        const size = this.estimateSize(entry.value);
        
        // Small items go to memory, larger items to Redis
        if (size < 1024 * 1024) { // 1MB threshold
          memoryEntries.push(entry);
        }
        redisEntries.push(entry);
      }
      
      const promises: Promise<boolean>[] = [];
      
      // Batch set in memory
      if (memoryEntries.length > 0) {
        promises.push(this.batchSetMemory(memoryEntries));
      }
      
      // Batch set in Redis
      if (redisEntries.length > 0) {
        promises.push(cacheService.mset(redisEntries));
      }
      
      const results = await Promise.all(promises);
      return results.every(result => result);
    } catch (error) {
      logger.error('Enhanced cache mset error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics and performance metrics
   */
  getMetrics(): {
    overall: CacheMetrics;
    byLevel: Map<string, CacheMetrics>;
    memoryUsage: {
      current: number;
      max: number;
      utilization: number;
    };
    topKeys: Array<{ key: string; accessCount: number; size: number }>;
  } {
    const overall = this.calculateOverallMetrics();
    const byLevel = new Map(this.cacheMetrics);
    
    const memoryUsage = {
      current: this.currentMemorySize,
      max: this.maxMemorySize,
      utilization: (this.currentMemorySize / this.maxMemorySize) * 100
    };
    
    const topKeys = Array.from(this.memoryCache.entries())
      .map(([key, entry]) => ({
        key,
        accessCount: entry.accessCount,
        size: entry.size
      }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10);
    
    return { overall, byLevel, memoryUsage, topKeys };
  }

  /**
   * Optimize cache performance based on usage patterns
   */
  async optimize(): Promise<{
    evicted: number;
    promoted: number;
    recommendations: string[];
  }> {
    const startTime = performance.now();
    let evicted = 0;
    let promoted = 0;
    const recommendations: string[] = [];
    
    try {
      // Analyze access patterns
      const accessPatterns = this.analyzeAccessPatterns();
      
      // Evict least recently used items if memory is full
      if (this.currentMemorySize > this.maxMemorySize * 0.9) {
        evicted = this.evictLRU();
        recommendations.push(`Evicted ${evicted} items due to memory pressure`);
      }
      
      // Promote frequently accessed items from Redis to memory
      const frequentKeys = accessPatterns.frequent.slice(0, 10);
      for (const key of frequentKeys) {
        if (!this.memoryCache.has(key)) {
          const value = await cacheService.get(key);
          if (value !== null) {
            await this.setInMemory(key, value, 300);
            promoted++;
          }
        }
      }
      
      if (promoted > 0) {
        recommendations.push(`Promoted ${promoted} frequently accessed items to memory`);
      }
      
      // Generate optimization recommendations
      if (accessPatterns.hitRate < 0.7) {
        recommendations.push('Consider increasing cache TTL for better hit rates');
      }
      
      if (this.currentMemorySize < this.maxMemorySize * 0.5) {
        recommendations.push('Memory cache is underutilized, consider caching more data');
      }
      
      const duration = performance.now() - startTime;
      PerformanceMonitor.recordMetric('cache-optimization', duration, {
        evicted,
        promoted,
        recommendationCount: recommendations.length
      });
      
      return { evicted, promoted, recommendations };
    } catch (error) {
      logger.error('Cache optimization error:', error);
      return { evicted: 0, promoted: 0, recommendations: ['Optimization failed'] };
    }
  }

  // Private helper methods

  private getFromMemory<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;
    
    // Check TTL
    if (Date.now() - entry.timestamp > entry.ttl * 1000) {
      this.memoryCache.delete(key);
      this.currentMemorySize -= entry.size;
      return null;
    }
    
    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    
    return entry.value;
  }

  private async setInMemory<T>(
    key: string, 
    value: T, 
    ttl: number, 
    tags: string[] = []
  ): Promise<boolean> {
    const size = this.estimateSize(value);
    
    // Check if we need to make space
    if (this.currentMemorySize + size > this.maxMemorySize) {
      const evicted = this.evictLRU(size);
      if (evicted === 0 && this.currentMemorySize + size > this.maxMemorySize) {
        return false; // Can't fit even after eviction
      }
    }
    
    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl,
      accessCount: 1,
      lastAccessed: Date.now(),
      size,
      tags
    };
    
    // Remove old entry if exists
    const oldEntry = this.memoryCache.get(key);
    if (oldEntry) {
      this.currentMemorySize -= oldEntry.size;
    }
    
    this.memoryCache.set(key, entry);
    this.currentMemorySize += size;
    
    return true;
  }

  private evictLRU(targetSize: number = 0): number {
    const entries = Array.from(this.memoryCache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
    
    let evicted = 0;
    let freedSize = 0;
    
    for (const [key, entry] of entries) {
      if (targetSize === 0 || freedSize >= targetSize) {
        break;
      }
      
      this.memoryCache.delete(key);
      this.currentMemorySize -= entry.size;
      freedSize += entry.size;
      evicted++;
    }
    
    return evicted;
  }

  private estimateSize(value: any): number {
    try {
      return JSON.stringify(value).length * 2; // Rough estimate
    } catch {
      return 1024; // Default size for non-serializable objects
    }
  }

  private determineCacheLevels(
    size: number, 
    priority: 'low' | 'medium' | 'high',
    forceLevel?: string
  ): string[] {
    if (forceLevel) return [forceLevel];
    
    const levels: string[] = [];
    
    // Always cache in Redis
    levels.push('redis');
    
    // Cache in memory for small, high-priority items
    if (size < 1024 * 1024 && priority !== 'low') { // 1MB threshold
      levels.push('memory');
    }
    
    return levels;
  }

  private matchesPattern(key: string, pattern: string): boolean {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(key);
  }

  private getCascadePatterns(pattern: string): string[] {
    const cascadePatterns: string[] = [];
    
    for (const rule of this.invalidationRules) {
      if (this.matchesPattern(pattern, rule.pattern)) {
        cascadePatterns.push(...(rule.cascadePatterns || []));
      }
    }
    
    return cascadePatterns;
  }

  private updateMetrics(
    key: string, 
    hit: boolean, 
    responseTime: number, 
    level: string
  ): void {
    const levelKey = level || 'unknown';
    let metrics = this.cacheMetrics.get(levelKey);
    
    if (!metrics) {
      metrics = {
        hits: 0,
        misses: 0,
        hitRate: 0,
        totalRequests: 0,
        averageResponseTime: 0,
        memoryUsage: 0
      };
      this.cacheMetrics.set(levelKey, metrics);
    }
    
    if (hit) {
      metrics.hits++;
    } else {
      metrics.misses++;
    }
    
    metrics.totalRequests++;
    metrics.hitRate = metrics.hits / metrics.totalRequests;
    metrics.averageResponseTime = 
      (metrics.averageResponseTime * (metrics.totalRequests - 1) + responseTime) / 
      metrics.totalRequests;
  }

  private calculateOverallMetrics(): CacheMetrics {
    const allMetrics = Array.from(this.cacheMetrics.values());
    
    if (allMetrics.length === 0) {
      return {
        hits: 0,
        misses: 0,
        hitRate: 0,
        totalRequests: 0,
        averageResponseTime: 0,
        memoryUsage: this.currentMemorySize
      };
    }
    
    const totalHits = allMetrics.reduce((sum, m) => sum + m.hits, 0);
    const totalMisses = allMetrics.reduce((sum, m) => sum + m.misses, 0);
    const totalRequests = totalHits + totalMisses;
    
    return {
      hits: totalHits,
      misses: totalMisses,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
      totalRequests,
      averageResponseTime: allMetrics.reduce((sum, m) => 
        sum + m.averageResponseTime * m.totalRequests, 0) / totalRequests,
      memoryUsage: this.currentMemorySize
    };
  }

  private analyzeAccessPatterns(): {
    frequent: string[];
    rare: string[];
    hitRate: number;
  } {
    const entries = Array.from(this.memoryCache.entries());
    const sorted = entries.sort(([, a], [, b]) => b.accessCount - a.accessCount);
    
    const frequent = sorted.slice(0, 10).map(([key]) => key);
    const rare = sorted.slice(-10).map(([key]) => key);
    
    const overall = this.calculateOverallMetrics();
    
    return {
      frequent,
      rare,
      hitRate: overall.hitRate
    };
  }

  private async batchSetMemory(entries: Array<{
    key: string;
    value: any;
    ttl?: number;
    tags?: string[];
  }>): Promise<boolean> {
    try {
      for (const entry of entries) {
        await this.setInMemory(
          entry.key, 
          entry.value, 
          entry.ttl || 300, 
          entry.tags || []
        );
      }
      return true;
    } catch (error) {
      logger.error('Batch set memory error:', error);
      return false;
    }
  }

  private setupInvalidationRules(): void {
    this.invalidationRules = [
      {
        pattern: 'spreadsheet:*',
        triggers: ['file-upload', 'data-update'],
        cascadePatterns: ['analysis:*', 'context:*']
      },
      {
        pattern: 'analysis:*',
        triggers: ['data-update', 'config-change'],
        cascadePatterns: ['recommendations:*']
      },
      {
        pattern: 'user:*',
        triggers: ['user-update', 'session-end']
      }
    ];
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanup();
    }, 60000); // Run every minute
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now - entry.timestamp > entry.ttl * 1000) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      const entry = this.memoryCache.get(key);
      if (entry) {
        this.memoryCache.delete(key);
        this.currentMemorySize -= entry.size;
      }
    }
    
    if (keysToDelete.length > 0) {
      logger.debug(`Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }
}

// Create singleton instance
export const enhancedCacheService = new EnhancedCacheService();