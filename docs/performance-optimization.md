# Performance Optimization Guide

This guide provides comprehensive recommendations for optimizing the Excel Context Engine's performance across different scenarios and use cases.

## Table of Contents

- [System Performance Overview](#system-performance-overview)
- [Large Dataset Optimization](#large-dataset-optimization)
- [API Performance Tuning](#api-performance-tuning)
- [Frontend Optimization](#frontend-optimization)
- [Database Performance](#database-performance)
- [Caching Strategies](#caching-strategies)
- [Memory Management](#memory-management)
- [Monitoring and Profiling](#monitoring-and-profiling)

## System Performance Overview

### Performance Targets

**Response Time Targets**:
- File upload (< 10MB): < 3 seconds
- Context analysis (standard): < 2 seconds
- Context analysis (complex): < 5 seconds
- Health check: < 100ms
- Large dataset (10,000+ rows): < 10 seconds

**Throughput Targets**:
- Concurrent users: 100+
- Requests per second: 50+
- File uploads per minute: 20+
- Memory usage: < 2GB per instance

### Performance Monitoring

Monitor these key metrics:

```javascript
// Key performance indicators
const performanceMetrics = {
  responseTime: {
    p50: 1200,  // 50th percentile in ms
    p95: 3000,  // 95th percentile in ms
    p99: 5000   // 99th percentile in ms
  },
  throughput: {
    requestsPerSecond: 45,
    uploadsPerMinute: 18,
    concurrentUsers: 85
  },
  resources: {
    cpuUsage: 65,      // percentage
    memoryUsage: 1.2,  // GB
    diskIO: 150        // MB/s
  },
  errors: {
    errorRate: 0.5,    // percentage
    timeoutRate: 0.1   // percentage
  }
};
```

## Large Dataset Optimization

### File Size Optimization

**Recommended Limits**:
```env
# Production settings
MAX_FILE_SIZE=100MB
MAX_ROWS=50000
MAX_COLUMNS=100
PROCESSING_TIMEOUT=60000
```

**File Processing Strategy**:

1. **Streaming Processing**:
```javascript
// backend/src/services/StreamingParser.ts
import { Transform } from 'stream';

class ChunkedSpreadsheetProcessor extends Transform {
  private chunkSize = 1000; // Process 1000 rows at a time
  private buffer: any[] = [];

  _transform(chunk: any, encoding: string, callback: Function) {
    this.buffer.push(chunk);
    
    if (this.buffer.length >= this.chunkSize) {
      this.processChunk(this.buffer.splice(0, this.chunkSize));
    }
    
    callback();
  }

  private processChunk(rows: any[]) {
    // Process chunk with intelligent sampling
    const sample = this.intelligentSample(rows);
    this.push(sample);
  }

  private intelligentSample(rows: any[]) {
    // Keep headers, sample data intelligently
    if (rows.length <= 100) return rows;
    
    const headers = rows.slice(0, 1);
    const dataRows = rows.slice(1);
    
    // Sample strategy: first 50, last 50, random middle
    const firstRows = dataRows.slice(0, 50);
    const lastRows = dataRows.slice(-50);
    const middleRows = this.randomSample(
      dataRows.slice(50, -50), 
      Math.min(100, dataRows.length - 100)
    );
    
    return [...headers, ...firstRows, ...middleRows, ...lastRows];
  }
}
```

2. **Progressive Loading**:
```javascript
// Load data progressively for large files
class ProgressiveDataLoader {
  async loadSpreadsheet(file: Buffer, options: LoadOptions) {
    const metadata = await this.extractMetadata(file);
    
    if (metadata.rowCount > 10000) {
      return this.loadProgressively(file, metadata);
    }
    
    return this.loadComplete(file);
  }

  private async loadProgressively(file: Buffer, metadata: FileMetadata) {
    // Load in chunks with user feedback
    const chunks = Math.ceil(metadata.rowCount / 5000);
    const results = [];
    
    for (let i = 0; i < chunks; i++) {
      const startRow = i * 5000;
      const endRow = Math.min((i + 1) * 5000, metadata.rowCount);
      
      const chunk = await this.loadRange(file, startRow, endRow);
      results.push(chunk);
      
      // Emit progress event
      this.emit('progress', {
        loaded: endRow,
        total: metadata.rowCount,
        percentage: (endRow / metadata.rowCount) * 100
      });
    }
    
    return this.mergeChunks(results);
  }
}
```

### Intelligent Data Sampling

**Smart Sampling Strategies**:

```javascript
// backend/src/services/DataSampler.ts
class IntelligentDataSampler {
  sampleLargeDataset(data: any[][], maxRows: number = 1000): any[][] {
    if (data.length <= maxRows) return data;
    
    const headers = data[0];
    const dataRows = data.slice(1);
    
    // Strategy 1: Statistical sampling
    const statisticalSample = this.statisticalSample(dataRows, maxRows * 0.6);
    
    // Strategy 2: Pattern-based sampling
    const patternSample = this.patternBasedSample(dataRows, maxRows * 0.2);
    
    // Strategy 3: Edge case sampling
    const edgeSample = this.edgeCaseSample(dataRows, maxRows * 0.2);
    
    return [
      headers,
      ...statisticalSample,
      ...patternSample,
      ...edgeSample
    ];
  }

  private statisticalSample(rows: any[][], count: number): any[][] {
    // Stratified sampling to maintain data distribution
    const interval = Math.floor(rows.length / count);
    const sample = [];
    
    for (let i = 0; i < count && i * interval < rows.length; i++) {
      sample.push(rows[i * interval]);
    }
    
    return sample;
  }

  private patternBasedSample(rows: any[][], count: number): any[][] {
    // Sample based on data patterns and outliers
    const patterns = this.identifyPatterns(rows);
    const sample = [];
    
    // Include representative samples from each pattern
    for (const pattern of patterns) {
      const patternSample = this.sampleFromPattern(pattern, count / patterns.length);
      sample.push(...patternSample);
    }
    
    return sample.slice(0, count);
  }

  private edgeCaseSample(rows: any[][], count: number): any[][] {
    // Sample edge cases: nulls, extremes, unique values
    const edgeCases = [];
    
    // Find rows with null values
    const nullRows = rows.filter(row => row.some(cell => cell === null || cell === ''));
    edgeCases.push(...nullRows.slice(0, count * 0.3));
    
    // Find rows with extreme values
    const extremeRows = this.findExtremeValues(rows);
    edgeCases.push(...extremeRows.slice(0, count * 0.4));
    
    // Find unique patterns
    const uniqueRows = this.findUniquePatterns(rows);
    edgeCases.push(...uniqueRows.slice(0, count * 0.3));
    
    return edgeCases.slice(0, count);
  }
}
```

### Memory-Efficient Processing

**Memory Management Strategies**:

```javascript
// backend/src/services/MemoryManager.ts
class MemoryEfficientProcessor {
  private maxMemoryUsage = 1024 * 1024 * 1024; // 1GB limit
  private currentMemoryUsage = 0;

  async processLargeFile(file: Buffer): Promise<ProcessedData> {
    // Monitor memory usage throughout processing
    const memoryMonitor = setInterval(() => {
      const usage = process.memoryUsage();
      this.currentMemoryUsage = usage.heapUsed;
      
      if (usage.heapUsed > this.maxMemoryUsage) {
        this.triggerGarbageCollection();
      }
    }, 1000);

    try {
      // Process in memory-efficient chunks
      const result = await this.processInChunks(file);
      return result;
    } finally {
      clearInterval(memoryMonitor);
      this.cleanup();
    }
  }

  private async processInChunks(file: Buffer): Promise<ProcessedData> {
    const chunkSize = 10 * 1024 * 1024; // 10MB chunks
    const chunks = Math.ceil(file.length / chunkSize);
    const results = [];

    for (let i = 0; i < chunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.length);
      const chunk = file.slice(start, end);
      
      const processed = await this.processChunk(chunk);
      results.push(processed);
      
      // Force garbage collection between chunks
      if (global.gc) {
        global.gc();
      }
    }

    return this.mergeResults(results);
  }

  private triggerGarbageCollection(): void {
    if (global.gc) {
      global.gc();
    }
    
    // Clear any unnecessary caches
    this.clearTemporaryData();
  }
}
```

## API Performance Tuning

### Request Optimization

**Efficient Request Patterns**:

```javascript
// Optimize API requests for better performance
class OptimizedAPIClient {
  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.requestQueue = new RequestQueue();
    this.cache = new Map();
  }

  // Batch multiple requests
  async batchAnalyze(requests: AnalysisRequest[]): Promise<AnalysisResult[]> {
    const batchSize = 5;
    const results = [];
    
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(req => this.analyzeWithCache(req))
      );
      results.push(...batchResults);
    }
    
    return results;
  }

  // Implement intelligent caching
  private async analyzeWithCache(request: AnalysisRequest): Promise<AnalysisResult> {
    const cacheKey = this.generateCacheKey(request);
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    const result = await this.makeRequest(request);
    this.cache.set(cacheKey, result);
    
    // Expire cache after 5 minutes
    setTimeout(() => this.cache.delete(cacheKey), 5 * 60 * 1000);
    
    return result;
  }

  // Implement request deduplication
  private generateCacheKey(request: AnalysisRequest): string {
    return `${request.spreadsheetId}-${request.request}-${JSON.stringify(request.currentSelection)}`;
  }
}
```

### Response Compression

**Enable Response Compression**:

```javascript
// backend/src/middleware/compression.ts
import compression from 'compression';

const compressionMiddleware = compression({
  level: 6, // Compression level (1-9)
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }
    
    // Compress JSON responses
    return compression.filter(req, res);
  }
});

// Use in Express app
app.use(compressionMiddleware);
```

### Connection Pooling

**Optimize Database Connections**:

```javascript
// backend/src/database/pool.ts
const poolConfig = {
  // Connection pool settings
  min: 2,                    // Minimum connections
  max: 20,                   // Maximum connections
  acquireTimeoutMillis: 30000, // 30 seconds
  createTimeoutMillis: 30000,  // 30 seconds
  destroyTimeoutMillis: 5000,  // 5 seconds
  idleTimeoutMillis: 30000,    // 30 seconds
  reapIntervalMillis: 1000,    // 1 second
  createRetryIntervalMillis: 100, // 100ms
  
  // Performance optimizations
  propagateCreateError: false,
  afterCreate: (conn: any, done: Function) => {
    // Optimize connection settings
    conn.query('SET SESSION sql_mode = "TRADITIONAL"', (err: any) => {
      done(err, conn);
    });
  }
};

const knex = require('knex')({
  client: 'postgresql',
  connection: process.env.DATABASE_URL,
  pool: poolConfig
});
```

## Frontend Optimization

### Component Performance

**React Performance Optimizations**:

```typescript
// frontend/src/components/SpreadsheetViewer.tsx
import React, { memo, useMemo, useCallback } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';

const SpreadsheetViewer = memo(({ data, onCellSelect }: Props) => {
  // Memoize expensive calculations
  const processedData = useMemo(() => {
    return data.map((row, rowIndex) => 
      row.map((cell, colIndex) => ({
        value: cell,
        rowIndex,
        colIndex,
        formatted: formatCell(cell)
      }))
    );
  }, [data]);

  // Optimize cell rendering with virtualization
  const Cell = useCallback(({ columnIndex, rowIndex, style }: CellProps) => (
    <div
      style={style}
      className="spreadsheet-cell"
      onClick={() => onCellSelect(rowIndex, columnIndex)}
    >
      {processedData[rowIndex]?.[columnIndex]?.formatted}
    </div>
  ), [processedData, onCellSelect]);

  return (
    <Grid
      columnCount={processedData[0]?.length || 0}
      columnWidth={120}
      height={600}
      rowCount={processedData.length}
      rowHeight={35}
      width={800}
    >
      {Cell}
    </Grid>
  );
});

// Optimize cell formatting
const formatCell = (value: any): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    return value.toLocaleString();
  }
  return String(value);
};
```

### Bundle Optimization

**Webpack/Vite Optimizations**:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Optimize bundle size
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['recharts', 'd3'],
          utils: ['lodash', 'date-fns']
        }
      }
    },
    // Enable compression
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  // Optimize development
  server: {
    hmr: {
      overlay: false
    }
  }
});
```

### Lazy Loading

**Component Lazy Loading**:

```typescript
// frontend/src/App.tsx
import { lazy, Suspense } from 'react';

// Lazy load heavy components
const SpreadsheetViewer = lazy(() => import('./components/SpreadsheetViewer'));
const ContextAnalysis = lazy(() => import('./components/ContextAnalysis'));
const Charts = lazy(() => import('./components/Charts'));

function App() {
  return (
    <div className="app">
      <Suspense fallback={<div>Loading spreadsheet...</div>}>
        <SpreadsheetViewer />
      </Suspense>
      
      <Suspense fallback={<div>Loading analysis...</div>}>
        <ContextAnalysis />
      </Suspense>
      
      <Suspense fallback={<div>Loading charts...</div>}>
        <Charts />
      </Suspense>
    </div>
  );
}
```

## Database Performance

### Query Optimization

**Efficient Database Queries**:

```sql
-- Add performance indexes
CREATE INDEX CONCURRENTLY idx_contexts_spreadsheet_id ON contexts(spreadsheet_id);
CREATE INDEX CONCURRENTLY idx_contexts_created_at ON contexts(created_at);
CREATE INDEX CONCURRENTLY idx_sessions_user_id ON sessions(user_id);
CREATE INDEX CONCURRENTLY idx_feedback_context_id ON feedback(context_id);

-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY idx_contexts_composite ON contexts(spreadsheet_id, created_at, request_type);

-- Partial indexes for filtered queries
CREATE INDEX CONCURRENTLY idx_contexts_recent ON contexts(created_at) 
WHERE created_at > NOW() - INTERVAL '30 days';
```

**Query Performance Monitoring**:

```javascript
// backend/src/database/monitoring.ts
class QueryMonitor {
  static logSlowQueries(knex: Knex) {
    knex.on('query', (query) => {
      const startTime = Date.now();
      
      query.response = query.response || {};
      const originalEnd = query.response.end;
      
      query.response.end = function(...args: any[]) {
        const duration = Date.now() - startTime;
        
        if (duration > 1000) { // Log queries > 1 second
          console.warn('Slow query detected:', {
            sql: query.sql,
            bindings: query.bindings,
            duration: `${duration}ms`
          });
        }
        
        return originalEnd.apply(this, args);
      };
    });
  }
}
```

### Connection Management

**Optimized Connection Handling**:

```javascript
// backend/src/database/connection.ts
class DatabaseManager {
  private pool: Knex;
  private healthCheckInterval: NodeJS.Timeout;

  constructor() {
    this.pool = this.createPool();
    this.setupHealthCheck();
  }

  private createPool(): Knex {
    return knex({
      client: 'postgresql',
      connection: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        
        // Connection optimization
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 30000,
        query_timeout: 60000,
        statement_timeout: 60000,
        idle_in_transaction_session_timeout: 30000
      },
      pool: {
        min: 2,
        max: 20,
        acquireTimeoutMillis: 30000,
        createTimeoutMillis: 30000,
        destroyTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 100,
        
        // Health check
        afterCreate: (conn: any, done: Function) => {
          conn.query('SELECT 1', (err: any) => {
            if (err) {
              console.error('Database connection failed:', err);
            }
            done(err, conn);
          });
        }
      }
    });
  }

  private setupHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.pool.raw('SELECT 1');
      } catch (error) {
        console.error('Database health check failed:', error);
        // Implement reconnection logic
        this.reconnect();
      }
    }, 30000); // Check every 30 seconds
  }

  private async reconnect(): Promise<void> {
    try {
      await this.pool.destroy();
      this.pool = this.createPool();
      console.log('Database reconnected successfully');
    } catch (error) {
      console.error('Database reconnection failed:', error);
    }
  }
}
```

## Caching Strategies

### Multi-Level Caching

**Comprehensive Caching Implementation**:

```javascript
// backend/src/cache/CacheManager.ts
class CacheManager {
  private memoryCache: Map<string, CacheEntry>;
  private redisClient: Redis;
  private maxMemoryEntries = 1000;

  constructor() {
    this.memoryCache = new Map();
    this.redisClient = new Redis(process.env.REDIS_URL);
    this.setupCleanup();
  }

  async get(key: string): Promise<any> {
    // Level 1: Memory cache (fastest)
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && !this.isExpired(memoryEntry)) {
      return memoryEntry.value;
    }

    // Level 2: Redis cache
    const redisValue = await this.redisClient.get(key);
    if (redisValue) {
      const parsed = JSON.parse(redisValue);
      
      // Store in memory cache for faster access
      this.setMemoryCache(key, parsed, 300); // 5 minutes
      return parsed;
    }

    return null;
  }

  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    // Store in both caches
    this.setMemoryCache(key, value, Math.min(ttlSeconds, 300));
    await this.redisClient.setex(key, ttlSeconds, JSON.stringify(value));
  }

  private setMemoryCache(key: string, value: any, ttlSeconds: number): void {
    // Implement LRU eviction
    if (this.memoryCache.size >= this.maxMemoryEntries) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }

    this.memoryCache.set(key, {
      value,
      expiry: Date.now() + (ttlSeconds * 1000)
    });
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.expiry;
  }

  private setupCleanup(): void {
    // Clean expired memory cache entries every minute
    setInterval(() => {
      for (const [key, entry] of this.memoryCache.entries()) {
        if (this.isExpired(entry)) {
          this.memoryCache.delete(key);
        }
      }
    }, 60000);
  }
}
```

### Smart Cache Keys

**Intelligent Cache Key Generation**:

```javascript
// backend/src/cache/KeyGenerator.ts
class CacheKeyGenerator {
  static generateContextKey(request: AnalysisRequest): string {
    // Create deterministic cache key
    const components = [
      'context',
      request.spreadsheetId,
      this.hashString(request.request),
      this.hashSelection(request.currentSelection),
      this.getDataVersion(request.spreadsheetId)
    ];
    
    return components.join(':');
  }

  static generateSpreadsheetKey(spreadsheetId: string, version?: string): string {
    return `spreadsheet:${spreadsheetId}:${version || 'latest'}`;
  }

  private static hashString(str: string): string {
    // Simple hash for cache keys
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private static hashSelection(selection: SelectionState): string {
    return this.hashString(JSON.stringify({
      sheet: selection.sheet,
      range: selection.range,
      activeCell: selection.activeCell
    }));
  }

  private static getDataVersion(spreadsheetId: string): string {
    // Return version based on last modification time
    // This ensures cache invalidation when data changes
    return Date.now().toString();
  }
}
```

## Memory Management

### Garbage Collection Optimization

**Memory Management Strategies**:

```javascript
// backend/src/utils/MemoryManager.ts
class MemoryManager {
  private static instance: MemoryManager;
  private memoryThreshold = 0.8; // 80% of available memory
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.setupMemoryMonitoring();
    this.optimizeGarbageCollection();
  }

  private setupMemoryMonitoring(): void {
    this.cleanupInterval = setInterval(() => {
      const usage = process.memoryUsage();
      const usagePercent = usage.heapUsed / usage.heapTotal;

      if (usagePercent > this.memoryThreshold) {
        this.performCleanup();
      }

      // Log memory stats
      console.log('Memory usage:', {
        heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
        external: `${Math.round(usage.external / 1024 / 1024)}MB`,
        usagePercent: `${Math.round(usagePercent * 100)}%`
      });
    }, 30000); // Check every 30 seconds
  }

  private performCleanup(): void {
    console.log('Performing memory cleanup...');
    
    // Clear temporary data
    this.clearTemporaryData();
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    // Clear require cache for development
    if (process.env.NODE_ENV === 'development') {
      this.clearRequireCache();
    }
  }

  private clearTemporaryData(): void {
    // Clear any global temporary data structures
    // This should be implemented based on your specific caching needs
  }

  private clearRequireCache(): void {
    // Clear require cache to free memory in development
    Object.keys(require.cache).forEach(key => {
      if (key.includes('node_modules')) return;
      delete require.cache[key];
    });
  }

  private optimizeGarbageCollection(): void {
    // Optimize V8 garbage collection flags
    if (process.env.NODE_ENV === 'production') {
      // These should be set as Node.js flags, not in code
      console.log('Recommended Node.js flags for production:');
      console.log('--max-old-space-size=4096');
      console.log('--optimize-for-size');
      console.log('--gc-interval=100');
    }
  }

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }
}
```

### Resource Cleanup

**Automatic Resource Management**:

```javascript
// backend/src/utils/ResourceManager.ts
class ResourceManager {
  private resources: Map<string, Resource> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.setupAutoCleanup();
    this.setupGracefulShutdown();
  }

  registerResource(id: string, resource: Resource): void {
    this.resources.set(id, {
      ...resource,
      createdAt: Date.now(),
      lastAccessed: Date.now()
    });
  }

  accessResource(id: string): Resource | null {
    const resource = this.resources.get(id);
    if (resource) {
      resource.lastAccessed = Date.now();
      return resource;
    }
    return null;
  }

  private setupAutoCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const maxAge = 30 * 60 * 1000; // 30 minutes
      
      for (const [id, resource] of this.resources.entries()) {
        if (now - resource.lastAccessed > maxAge) {
          this.cleanupResource(id, resource);
          this.resources.delete(id);
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  private cleanupResource(id: string, resource: Resource): void {
    try {
      if (resource.cleanup) {
        resource.cleanup();
      }
      console.log(`Cleaned up resource: ${id}`);
    } catch (error) {
      console.error(`Error cleaning up resource ${id}:`, error);
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = () => {
      console.log('Shutting down resource manager...');
      
      clearInterval(this.cleanupInterval);
      
      // Cleanup all resources
      for (const [id, resource] of this.resources.entries()) {
        this.cleanupResource(id, resource);
      }
      
      this.resources.clear();
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }
}

interface Resource {
  data: any;
  cleanup?: () => void;
  createdAt?: number;
  lastAccessed?: number;
}
```

## Monitoring and Profiling

### Performance Monitoring

**Comprehensive Performance Tracking**:

```javascript
// backend/src/monitoring/PerformanceMonitor.ts
class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private activeRequests: Map<string, RequestMetric> = new Map();

  startRequest(requestId: string, operation: string): void {
    this.activeRequests.set(requestId, {
      operation,
      startTime: Date.now(),
      memoryStart: process.memoryUsage().heapUsed
    });
  }

  endRequest(requestId: string): PerformanceResult {
    const request = this.activeRequests.get(requestId);
    if (!request) {
      throw new Error(`Request ${requestId} not found`);
    }

    const endTime = Date.now();
    const memoryEnd = process.memoryUsage().heapUsed;
    
    const result: PerformanceResult = {
      operation: request.operation,
      duration: endTime - request.startTime,
      memoryUsed: memoryEnd - request.memoryStart,
      timestamp: endTime
    };

    this.recordMetric(request.operation, result);
    this.activeRequests.delete(requestId);

    return result;
  }

  private recordMetric(operation: string, result: PerformanceResult): void {
    const existing = this.metrics.get(operation) || {
      operation,
      count: 0,
      totalDuration: 0,
      totalMemory: 0,
      minDuration: Infinity,
      maxDuration: 0,
      avgDuration: 0,
      p95Duration: 0,
      recentDurations: []
    };

    existing.count++;
    existing.totalDuration += result.duration;
    existing.totalMemory += result.memoryUsed;
    existing.minDuration = Math.min(existing.minDuration, result.duration);
    existing.maxDuration = Math.max(existing.maxDuration, result.duration);
    existing.avgDuration = existing.totalDuration / existing.count;

    // Track recent durations for percentile calculation
    existing.recentDurations.push(result.duration);
    if (existing.recentDurations.length > 100) {
      existing.recentDurations.shift();
    }

    // Calculate P95
    const sorted = [...existing.recentDurations].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    existing.p95Duration = sorted[p95Index] || 0;

    this.metrics.set(operation, existing);
  }

  getMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  getMetricsForPrometheus(): string {
    let output = '';
    
    for (const metric of this.metrics.values()) {
      output += `# HELP ${metric.operation}_duration_ms Duration of ${metric.operation} operations\n`;
      output += `# TYPE ${metric.operation}_duration_ms histogram\n`;
      output += `${metric.operation}_duration_ms_sum ${metric.totalDuration}\n`;
      output += `${metric.operation}_duration_ms_count ${metric.count}\n`;
      output += `${metric.operation}_duration_ms{quantile="0.5"} ${metric.avgDuration}\n`;
      output += `${metric.operation}_duration_ms{quantile="0.95"} ${metric.p95Duration}\n`;
      output += `${metric.operation}_duration_ms{quantile="1.0"} ${metric.maxDuration}\n\n`;
    }
    
    return output;
  }
}

interface RequestMetric {
  operation: string;
  startTime: number;
  memoryStart: number;
}

interface PerformanceResult {
  operation: string;
  duration: number;
  memoryUsed: number;
  timestamp: number;
}

interface PerformanceMetric {
  operation: string;
  count: number;
  totalDuration: number;
  totalMemory: number;
  minDuration: number;
  maxDuration: number;
  avgDuration: number;
  p95Duration: number;
  recentDurations: number[];
}
```

### Profiling Tools

**CPU and Memory Profiling**:

```javascript
// backend/src/monitoring/Profiler.ts
class Profiler {
  static enableCPUProfiling(): void {
    if (process.env.NODE_ENV === 'production') return;
    
    const v8Profiler = require('v8-profiler-next');
    
    // Start CPU profiling
    const title = `cpu-profile-${Date.now()}`;
    v8Profiler.startProfiling(title, true);
    
    // Stop profiling after 30 seconds
    setTimeout(() => {
      const profile = v8Profiler.stopProfiling(title);
      profile.export((error: any, result: any) => {
        if (error) {
          console.error('CPU profiling error:', error);
          return;
        }
        
        require('fs').writeFileSync(`./profiles/${title}.cpuprofile`, result);
        profile.delete();
        console.log(`CPU profile saved: ${title}.cpuprofile`);
      });
    }, 30000);
  }

  static enableMemoryProfiling(): void {
    if (process.env.NODE_ENV === 'production') return;
    
    const v8Profiler = require('v8-profiler-next');
    
    // Take heap snapshot
    const snapshot = v8Profiler.takeSnapshot();
    snapshot.export((error: any, result: any) => {
      if (error) {
        console.error('Memory profiling error:', error);
        return;
      }
      
      const filename = `heap-${Date.now()}.heapsnapshot`;
      require('fs').writeFileSync(`./profiles/${filename}`, result);
      snapshot.delete();
      console.log(`Heap snapshot saved: ${filename}`);
    });
  }

  static trackMemoryLeaks(): void {
    const memwatch = require('@airbnb/node-memwatch');
    
    memwatch.on('leak', (info: any) => {
      console.error('Memory leak detected:', info);
    });
    
    memwatch.on('stats', (stats: any) => {
      console.log('Memory stats:', {
        usage: `${Math.round(stats.current_base / 1024 / 1024)}MB`,
        change: `${stats.change_in_bytes > 0 ? '+' : ''}${Math.round(stats.change_in_bytes / 1024)}KB`
      });
    });
  }
}
```

## Performance Testing

### Load Testing

**Automated Performance Tests**:

```javascript
// tests/performance/load-test.js
const autocannon = require('autocannon');

async function runLoadTest() {
  const instance = autocannon({
    url: 'http://localhost:3000',
    connections: 50,
    duration: 60, // 60 seconds
    requests: [
      {
        method: 'GET',
        path: '/api/v1/health'
      },
      {
        method: 'POST',
        path: '/api/v1/analyze-context',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          request: 'Analyze this data',
          spreadsheetId: 'test-123',
          currentSelection: {
            sheet: 'Sheet1',
            range: 'A1:C10',
            activeCell: 'A1'
          }
        })
      }
    ]
  });

  instance.on('done', (result) => {
    console.log('Load test results:', {
      requests: result.requests,
      throughput: result.throughput,
      latency: result.latency,
      errors: result.errors
    });
    
    // Assert performance requirements
    if (result.latency.p95 > 5000) {
      console.error('P95 latency exceeds 5 seconds');
      process.exit(1);
    }
    
    if (result.throughput.average < 10) {
      console.error('Throughput below 10 req/sec');
      process.exit(1);
    }
  });
}

runLoadTest();
```

This comprehensive performance optimization guide provides the foundation for maintaining high performance across all aspects of the Excel Context Engine, from handling large datasets to optimizing API responses and managing system resources efficiently.