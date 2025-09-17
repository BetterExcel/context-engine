import { Request, Response, NextFunction } from 'express';
import { httpRequestDuration, httpRequestsTotal, activeConnections, errorRate } from './metrics';
import logger from './logger';

// Middleware to track HTTP metrics
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Increment active connections
  activeConnections.inc();
  
  // Override res.end to capture metrics when response is sent
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any): any {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    const method = req.method;
    const statusCode = res.statusCode.toString();
    
    // Record metrics
    httpRequestDuration.observe(
      { method, route, status_code: statusCode },
      duration
    );
    
    httpRequestsTotal.inc({
      method,
      route,
      status_code: statusCode
    });
    
    // Decrement active connections
    activeConnections.dec();
    
    // Log request
    logger.http(`${method} ${req.originalUrl} ${statusCode} - ${duration}s`);
    
    // Track errors
    if (res.statusCode >= 400) {
      errorRate.inc({
        type: res.statusCode >= 500 ? 'server_error' : 'client_error',
        endpoint: route
      });
      
      if (res.statusCode >= 500) {
        logger.error(`Server error: ${method} ${req.originalUrl} ${statusCode}`);
      }
    }
    
    // Call original end method
    return originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

// Middleware to log request details
export const requestLoggingMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  const _start = Date.now();
  
  logger.info(`Incoming request: ${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString()
  });
  
  // Log request body for POST/PUT requests (excluding file uploads)
  if ((req.method === 'POST' || req.method === 'PUT') && 
      req.get('Content-Type')?.includes('application/json')) {
    logger.debug('Request body:', req.body);
  }
  
  next();
};

// Error logging middleware
export const errorLoggingMiddleware = (error: Error, req: Request, _res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString()
  });
  
  next(error);
};