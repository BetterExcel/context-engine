import client from 'prom-client';

// Create a Registry to register the metrics
const register = new client.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: 'excel-context-engine'
});

// Enable the collection of default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
});

export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

export const fileUploadSize = new client.Histogram({
  name: 'file_upload_size_bytes',
  help: 'Size of uploaded files in bytes',
  buckets: [1024, 10240, 102400, 1048576, 10485760, 104857600] // 1KB to 100MB
});

export const fileProcessingDuration = new client.Histogram({
  name: 'file_processing_duration_seconds',
  help: 'Duration of file processing in seconds',
  labelNames: ['file_type'],
  buckets: [0.5, 1, 2, 5, 10, 30, 60]
});

export const contextAnalysisDuration = new client.Histogram({
  name: 'context_analysis_duration_seconds',
  help: 'Duration of context analysis in seconds',
  labelNames: ['intent_type'],
  buckets: [0.5, 1, 2, 5, 10, 30]
});

export const openaiApiCalls = new client.Counter({
  name: 'openai_api_calls_total',
  help: 'Total number of OpenAI API calls',
  labelNames: ['model', 'status']
});

export const openaiApiDuration = new client.Histogram({
  name: 'openai_api_duration_seconds',
  help: 'Duration of OpenAI API calls in seconds',
  labelNames: ['model'],
  buckets: [1, 2, 5, 10, 20, 30, 60]
});

export const databaseQueryDuration = new client.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

export const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

export const memoryUsage = new client.Gauge({
  name: 'memory_usage_bytes',
  help: 'Memory usage in bytes',
  labelNames: ['type']
});

export const errorRate = new client.Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'endpoint']
});

// Register all metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);
register.registerMetric(fileUploadSize);
register.registerMetric(fileProcessingDuration);
register.registerMetric(contextAnalysisDuration);
register.registerMetric(openaiApiCalls);
register.registerMetric(openaiApiDuration);
register.registerMetric(databaseQueryDuration);
register.registerMetric(activeConnections);
register.registerMetric(memoryUsage);
register.registerMetric(errorRate);

// Update memory usage metrics periodically
setInterval(() => {
  const usage = process.memoryUsage();
  memoryUsage.set({ type: 'heap_used' }, usage.heapUsed);
  memoryUsage.set({ type: 'heap_total' }, usage.heapTotal);
  memoryUsage.set({ type: 'external' }, usage.external);
  memoryUsage.set({ type: 'rss' }, usage.rss);
}, 10000); // Update every 10 seconds

export { register };