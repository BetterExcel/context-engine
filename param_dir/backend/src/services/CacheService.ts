import { createClient, RedisClientType } from 'redis';
import { logger } from '../monitoring';

export interface CacheConfig {
  url?: string;
  password?: string;
  db?: number;
  ttl?: number;
  enabled?: boolean;
}

export interface CacheOptions {
  ttl?: number;
  compress?: boolean;
}

export class CacheService {
  private client: RedisClientType | null = null;
  private enabled: boolean;
  private defaultTTL: number;
  private connected: boolean = false;

  constructor(config: CacheConfig = {}) {
    this.enabled = config.enabled ?? true;
    this.defaultTTL = config.ttl ?? 3600; // 1 hour default

    if (this.enabled) {
      this.initializeClient(config);
    }
  }

  private async initializeClient(config: CacheConfig): Promise<void> {
    try {
      const clientConfig: any = {
        url: config.url || process.env['REDIS_URL'] || 'redis://localhost:6379',
        database: config.db || parseInt(process.env['REDIS_DB'] || '0'),
      };

      if (config.password || process.env['REDIS_PASSWORD']) {
        clientConfig.password = config.password || process.env['REDIS_PASSWORD'];
      }

      this.client = createClient(clientConfig);

      this.client.on('error', (error) => {
        logger.error('Redis client error:', error);
        this.connected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.connected = true;
      });

      this.client.on('disconnect', () => {
        logger.warn('Redis client disconnected');
        this.connected = false;
      });

      await this.client.connect();
      logger.info('Cache service initialized with Redis');
    } catch (error) {
      logger.error('Failed to initialize Redis client:', error);
      this.enabled = false;
      this.client = null;
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled || !this.client || !this.connected) {
      return null;
    }

    try {
      const value = await this.client.get(key);
      if (value === null) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key: string, value: any, options: CacheOptions = {}): Promise<boolean> {
    if (!this.enabled || !this.client || !this.connected) {
      return false;
    }

    try {
      const ttl = options.ttl || this.defaultTTL;
      const serializedValue = JSON.stringify(value);
      
      await this.client.setEx(key, ttl, serializedValue);
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    if (!this.enabled || !this.client || !this.connected) {
      return false;
    }

    try {
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    if (!this.enabled || !this.client || !this.connected) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result > 0;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get multiple values from cache
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (!this.enabled || !this.client || !this.connected || keys.length === 0) {
      return keys.map(() => null);
    }

    try {
      const values = await this.client.mGet(keys);
      return values.map(value => {
        if (value === null) return null;
        try {
          return JSON.parse(value) as T;
        } catch {
          return null;
        }
      });
    } catch (error) {
      logger.error(`Cache mget error for keys ${keys.join(', ')}:`, error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple values in cache
   */
  async mset(keyValuePairs: Array<{ key: string; value: any; ttl?: number }>): Promise<boolean> {
    if (!this.enabled || !this.client || !this.connected || keyValuePairs.length === 0) {
      return false;
    }

    try {
      const pipeline = this.client.multi();
      
      keyValuePairs.forEach(({ key, value, ttl }) => {
        const serializedValue = JSON.stringify(value);
        const expiry = ttl || this.defaultTTL;
        pipeline.setEx(key, expiry, serializedValue);
      });

      await pipeline.exec();
      return true;
    } catch (error) {
      logger.error('Cache mset error:', error);
      return false;
    }
  }

  /**
   * Increment a numeric value in cache
   */
  async increment(key: string, amount: number = 1): Promise<number | null> {
    if (!this.enabled || !this.client || !this.connected) {
      return null;
    }

    try {
      return await this.client.incrBy(key, amount);
    } catch (error) {
      logger.error(`Cache increment error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set expiration for a key
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    if (!this.enabled || !this.client || !this.connected) {
      return false;
    }

    try {
      const result = await this.client.expire(key, ttl);
      return result;
    } catch (error) {
      logger.error(`Cache expire error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get keys matching a pattern
   */
  async keys(pattern: string): Promise<string[]> {
    if (!this.enabled || !this.client || !this.connected) {
      return [];
    }

    try {
      return await this.client.keys(pattern);
    } catch (error) {
      logger.error(`Cache keys error for pattern ${pattern}:`, error);
      return [];
    }
  }

  /**
   * Clear all cache entries matching a pattern
   */
  async clearPattern(pattern: string): Promise<number> {
    if (!this.enabled || !this.client || !this.connected) {
      return 0;
    }

    try {
      const keys = await this.keys(pattern);
      if (keys.length === 0) return 0;

      const result = await this.client.del(keys);
      return result;
    } catch (error) {
      logger.error(`Cache clear pattern error for ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    connected: boolean;
    enabled: boolean;
    info?: any;
  }> {
    const stats = {
      connected: this.connected,
      enabled: this.enabled,
    };

    if (this.enabled && this.client && this.connected) {
      try {
        const info = await this.client.info();
        return { ...stats, info };
      } catch (error) {
        logger.error('Cache stats error:', error);
      }
    }

    return stats;
  }

  /**
   * Flush all cache entries
   */
  async flush(): Promise<boolean> {
    if (!this.enabled || !this.client || !this.connected) {
      return false;
    }

    try {
      await this.client.flushDb();
      return true;
    } catch (error) {
      logger.error('Cache flush error:', error);
      return false;
    }
  }

  /**
   * Close the cache connection
   */
  async close(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
        logger.info('Cache service connection closed');
      } catch (error) {
        logger.error('Error closing cache connection:', error);
      }
    }
  }

  /**
   * Check if cache is available
   */
  isAvailable(): boolean {
    return this.enabled && this.connected && this.client !== null;
  }

  /**
   * Generate cache key with prefix
   */
  static generateKey(prefix: string, ...parts: string[]): string {
    return `excel_context:${prefix}:${parts.join(':')}`;
  }
}

// Create singleton instance
export const cacheService = new CacheService({
  enabled: false, // Temporarily disabled to debug startup issue
  ttl: parseInt(process.env['CACHE_TTL'] || '3600'),
});