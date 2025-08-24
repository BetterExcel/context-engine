// @ts-ignore
import express from 'express';
// @ts-ignore
import cors from 'cors';
// @ts-ignore
import helmet from 'helmet';
// @ts-ignore
import morgan from 'morgan';
import { logger, morganStream, metricsMiddleware, requestLoggingMiddleware, errorLoggingMiddleware, healthCheck, metricsEndpoint } from './monitoring';
// @ts-ignore
import dotenv from 'dotenv';
// @ts-ignore
import swaggerUi from 'swagger-ui-express';
import { specs, swaggerOptions } from './docs/swagger';
// Route imports moved to dynamic imports to avoid circular dependencies
import { OpenAIService, ContextExtractor } from './services';
import { databaseService } from './database';
import { globalErrorHandler, notFoundHandler, validateContentType } from './middleware';
import { cacheService } from './services/CacheService';
import { lazyLoadingService } from './services/LazyLoadingService';
import { globalRateLimit } from './middleware/rateLimiting';
import { createCompressionMiddleware, responseSizeTracker, smartCompression, compressionHeaders } from './middleware/compression';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env['PORT'] || 3001;

// Initialize services
const initializeServices = async () => {
  try {
    console.log('Starting service initialization...');
    
    // Initialize database service
    console.log('Initializing database service...');
    const dbInitialized = await databaseService.initialize();
    if (!dbInitialized) {
      console.warn('Database service failed to initialize, continuing without database features');
    }
    console.log('Database service initialization complete');

    // Initialize cache service (Redis)
    console.log('Checking cache service...');
    if (cacheService.isAvailable()) {
      logger.info('Cache service initialized successfully');
    } else {
      logger.warn('Cache service not available, continuing without caching');
    }
    console.log('Cache service check complete');

    // Initialize lazy loading service
    console.log('Initializing lazy loading service...');
    logger.info('Lazy loading service initialized');
    console.log('Lazy loading service initialization complete');

    console.log('All services initialized successfully');
  } catch (error) {
    console.error('Failed to initialize services:', error);
    console.warn('Continuing with limited functionality');
  }
};

// Initialize OpenAI service if API key is available
let openAIService: OpenAIService | undefined;
if (process.env['OPENAI_API_KEY'] && process.env['OPENAI_API_KEY'] !== 'your_openai_api_key_here') {
  try {
    openAIService = new OpenAIService({
      apiKey: process.env['OPENAI_API_KEY'],
      maxRetries: 3,
      timeout: 30000,
      model: 'gpt-4'
    });
    
    // Set OpenAI service for context extractor
    ContextExtractor.setOpenAIService(openAIService);
    
    console.log('OpenAI service initialized successfully');
  } catch (error) {
    console.warn('Failed to initialize OpenAI service:', error);
  }
} else {
  console.log('OpenAI API key not configured, using rule-based analysis only');
}

console.log('Continuing after OpenAI initialization...');

// Make services available to routes
console.log('Setting up app locals...');
app.locals['openAIService'] = openAIService;
app.locals['databaseService'] = databaseService;
app.locals['cacheService'] = cacheService;
app.locals['lazyLoadingService'] = lazyLoadingService;
console.log('App locals set up complete');

// Security middleware
console.log('Setting up security middleware...');
app.use(helmet());
app.use(cors());
console.log('Security middleware setup complete');

// Compression middleware (before other middleware)
console.log('Setting up compression middleware...');
if (process.env['ENABLE_COMPRESSION'] !== 'false') {
  app.use(smartCompression());
  app.use(compressionHeaders());
  app.use(createCompressionMiddleware());
}
console.log('Compression middleware setup complete');

// Response tracking middleware
console.log('Setting up response tracking...');
app.use(responseSizeTracker());

// Logging middleware
console.log('Setting up logging middleware...');
app.use(morgan('combined', { stream: morganStream }));

// Monitoring middleware
console.log('Setting up monitoring middleware...');
app.use(metricsMiddleware);
app.use(requestLoggingMiddleware);
console.log('Monitoring middleware setup complete');

// Global rate limiting
console.log('Setting up rate limiting...');
app.use(globalRateLimit);

// Content type validation
console.log('Setting up content type validation...');
app.use(validateContentType(['application/json', 'multipart/form-data']));

// Body parsing with size limits
console.log('Setting up body parsing...');
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
console.log('Body parsing setup complete');

// API Documentation
console.log('Setting up API documentation...');
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerOptions));

// Routes will be set up in the async startServer function

// Health and monitoring endpoints
app.get('/health', healthCheck);
app.get('/api/v1/health', healthCheck);
app.get('/api/v1/metrics', metricsEndpoint);

// Start server only if not in test environment
if (process.env['NODE_ENV'] !== 'test') {
  const startServer = async () => {
    await initializeServices();
    
    // Routes (dynamic imports to avoid circular dependencies)
    console.log('Setting up routes...');
    const uploadRoutes = (await import('./routes/upload')).default;
    const contextRoutes = (await import('./routes/context')).default;
    app.use('/api/v1', uploadRoutes);
    app.use('/api/v1', contextRoutes);
    console.log('Basic routes setup complete');

    // Import and use database routes
    const databaseRoutes = (await import('./routes/database')).default;
    app.use('/api/v1', databaseRoutes);

    // Import and use session routes
    const sessionRoutes = (await import('./routes/session')).default;
    app.use('/api/v1', sessionRoutes);

    // Import and use feedback routes
    const feedbackRoutes = (await import('./routes/feedback')).default;
    app.use('/api/v1', feedbackRoutes);

    // Import debug routes for development
    const contextDebugRoutes = (await import('./routes/context-debug')).default;
    app.use('/api/v1', contextDebugRoutes);

    // Import LLM response routes
    const llmResponseRoutes = (await import('./routes/llm-response')).default;
    app.use('/api/v1', llmResponseRoutes);

    // 404 handler for unmatched routes (must come before error handlers)
    app.use(notFoundHandler);

    // Error logging and global error handling (must be last)
    app.use(errorLoggingMiddleware);
    app.use(globalErrorHandler);

    console.log('All routes setup complete');

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`, {
        port: PORT,
        environment: process.env['NODE_ENV'] || 'development',
        timestamp: new Date().toISOString()
      });
    });
  };
  
  startServer().catch(console.error);
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await Promise.all([
    databaseService.shutdown(),
    cacheService.close()
  ]);
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await Promise.all([
    databaseService.shutdown(),
    cacheService.close()
  ]);
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export default app;
