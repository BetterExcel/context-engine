import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { cacheService } from '../services/CacheService';
import { logger } from '../monitoring';
import { ApiError, ErrorCode } from '../types/api';

export interface RateLimitConfig {
  windowMs?: number;
  maxRequests?: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  onLimitReached?: (req: Request, res: Response) => void;
  skip?: (req: Request) => boolean;
}

/**
 * Enhanced rate limiting with Redis backing
 */
export function createRateLimit(config: RateLimitConfig = {}) {
  const windowMs = config.windowMs || parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '900000'); // 15 minutes
  const maxRequests = config.maxRequests || parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '100');

  return rateLimit({
    windowMs,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: config.skipSuccessfulRequests || false,
    skipFailedRequests: config.skipFailedRequests || false,
    
    // Custom key generator
    keyGenerator: config.keyGenerator || ((req: Request) => {
      // Use IP address and user agent for more specific rate limiting
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';
      return `rate_limit:${ip}:${Buffer.from(userAgent).toString('base64').slice(0, 20)}`;
    }),

    // Use Redis for distributed rate limiting if available
    ...(cacheService.isAvailable() ? {
      store: {
        incr: async (key: string) => {
          try {
            const current = await cacheService.increment(key, 1);
            if (current === 1) {
              // Set expiration for new keys
              await cacheService.expire(key, Math.ceil(windowMs / 1000));
            }
            return {
              totalHits: current || 1,
              resetTime: new Date(Date.now() + windowMs)
            };
          } catch (error) {
            logger.error('Rate limit store error:', error);
            return { totalHits: 1, resetTime: new Date(Date.now() + windowMs) };
          }
        },
        decrement: async (key: string) => {
          try {
            await cacheService.increment(key, -1);
          } catch (error) {
            logger.error('Rate limit decrement error:', error);
          }
        },
        resetKey: async (key: string) => {
          try {
            await cacheService.delete(key);
          } catch (error) {
            logger.error('Rate limit reset error:', error);
          }
        }
      }
    } : {}),

    // Custom error handler
    handler: (req: Request, res: Response) => {
      const apiError: ApiError = {
        code: ErrorCode.RATE_LIMIT_EXCEEDED,
        message: 'Too many requests, please try again later',
        details: {
          maxRequests,
          windowMs,
          retryAfter: Math.ceil(windowMs / 1000)
        },
        suggestions: [
          'Wait before making another request',
          'Reduce the frequency of your requests',
          'Contact support if you need higher rate limits'
        ],
        timestamp: new Date().toISOString()
      };

      // Log rate limit exceeded
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method
      });

      if (config.onLimitReached) {
        config.onLimitReached(req, res);
      }

      res.status(429).json({
        success: false,
        error: apiError,
        requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });
    },

    // Skip certain requests
    skip: (req: Request) => {
      // Skip health checks and metrics endpoints
      const skipPaths = ['/api/v1/health', '/api/v1/metrics'];
      return skipPaths.includes(req.path);
    }
  });
}

/**
 * Tiered rate limiting for different endpoint types
 */
export const rateLimitTiers = {
  // Strict limits for resource-intensive operations
  strict: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 20,
    keyGenerator: (req) => `strict:${req.ip}:${req.path}`
  }),

  // Moderate limits for regular API calls
  moderate: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    keyGenerator: (req) => `moderate:${req.ip}`
  }),

  // Lenient limits for lightweight operations
  lenient: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 500,
    keyGenerator: (req) => `lenient:${req.ip}`
  }),

  // Per-user limits (requires authentication)
  perUser: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 200,
    keyGenerator: (req) => {
      const userId = (req as any).user?.id || req.ip;
      return `user:${userId}`;
    }
  })
};

/**
 * Adaptive rate limiting based on system load
 */
export function createAdaptiveRateLimit() {
  let currentLoad = 0;
  let lastLoadCheck = 0;
  const loadCheckInterval = 30000; // 30 seconds

  return createRateLimit({
    maxRequests: 100, // Base limit
    keyGenerator: (req) => `adaptive:${req.ip}`,
    
    // Adjust limits based on system load
    skip: (req) => {
      const now = Date.now();
      
      // Check system load periodically
      if (now - lastLoadCheck > loadCheckInterval) {
        // Simple load estimation based on memory usage
        const memUsage = process.memoryUsage();
        const memPercent = memUsage.heapUsed / memUsage.heapTotal;
        currentLoad = memPercent;
        lastLoadCheck = now;
      }

      // Skip rate limiting if system load is low
      return currentLoad < 0.5;
    }
  });
}

/**
 * Rate limiting middleware for file uploads
 */
export const uploadRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 50, // 50 uploads per hour
  keyGenerator: (req) => `upload:${req.ip}`,
  onLimitReached: (req, res) => {
    logger.warn('Upload rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  }
});

/**
 * Rate limiting for OpenAI API calls
 */
export const aiRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 AI requests per minute
  keyGenerator: (req) => `ai:${req.ip}`,
  skipSuccessfulRequests: false,
  skipFailedRequests: true
});

/**
 * Rate limiting for context analysis
 */
export const contextRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 context analysis requests per minute
  keyGenerator: (req) => `context:${req.ip}`,
  skipSuccessfulRequests: false,
  skipFailedRequests: true
});

/**
 * Global rate limiting middleware
 */
export const globalRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 1000, // 1000 requests per 15 minutes
  keyGenerator: (req) => `global:${req.ip}`
});