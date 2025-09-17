import compression from 'compression';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../monitoring';

/**
 * Enhanced compression middleware with intelligent filtering
 */
export function createCompressionMiddleware() {
  return compression({
    // Compression level (1-9, 6 is default)
    level: 6,
    
    // Minimum response size to compress (in bytes)
    threshold: 1024, // 1KB
    
    // Custom filter function
    filter: (req: Request, res: Response) => {
      // Don't compress if client doesn't support it
      if (!req.headers['accept-encoding']) {
        return false;
      }

      // Don't compress if response is already compressed
      if (res.getHeader('content-encoding')) {
        return false;
      }

      // Don't compress images, videos, or already compressed files
      const contentType = res.getHeader('content-type') as string;
      if (contentType) {
        const nonCompressibleTypes = [
          'image/',
          'video/',
          'audio/',
          'application/zip',
          'application/gzip',
          'application/x-gzip',
          'application/x-compress',
          'application/x-compressed',
          'application/pdf'
        ];

        if (nonCompressibleTypes.some(type => contentType.startsWith(type))) {
          return false;
        }
      }

      // Compress JSON, HTML, CSS, JS, and text responses
      const compressibleTypes = [
        'application/json',
        'application/javascript',
        'text/html',
        'text/css',
        'text/plain',
        'text/xml',
        'application/xml',
        'application/x-javascript'
      ];

      if (contentType && compressibleTypes.some(type => contentType.includes(type))) {
        return true;
      }

      // Default compression filter
      return compression.filter(req, res);
    },

    // Custom compression options
    chunkSize: 16 * 1024, // 16KB chunks
    windowBits: 15,
    memLevel: 8,
  });
}

/**
 * Response size tracking middleware
 */
export function responseSizeTracker() {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    const originalJson = res.json;
    
    let responseSize = 0;
    const startTime = Date.now();

    // Override res.send
    res.send = function(body: any) {
      if (body) {
        responseSize = Buffer.isBuffer(body) ? body.length : Buffer.byteLength(body.toString());
      }
      
      logResponseMetrics();
      return originalSend.call(this, body);
    };

    // Override res.json
    res.json = function(obj: any) {
      if (obj) {
        const jsonString = JSON.stringify(obj);
        responseSize = Buffer.byteLength(jsonString);
      }
      
      logResponseMetrics();
      return originalJson.call(this, obj);
    };

    function logResponseMetrics() {
      const duration = Date.now() - startTime;
      const compressionRatio = res.getHeader('content-encoding') ? 
        (responseSize / (parseInt(res.getHeader('content-length') as string) || responseSize)) : 1;

      // Log performance metrics
      logger.debug('Response metrics', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        responseSize,
        duration,
        compressed: !!res.getHeader('content-encoding'),
        compressionRatio: compressionRatio.toFixed(2),
        userAgent: req.get('User-Agent')
      });

      // Log large responses
      if (responseSize > 1024 * 1024) { // 1MB
        logger.warn('Large response detected', {
          path: req.path,
          size: `${(responseSize / 1024 / 1024).toFixed(2)}MB`,
          compressed: !!res.getHeader('content-encoding')
        });
      }
    }

    next();
  };
}

/**
 * Conditional compression based on client capabilities
 */
export function smartCompression() {
  return (req: Request, res: Response, next: NextFunction) => {
    const acceptEncoding = req.headers['accept-encoding'] || '';
    
    // Check client compression support
    const supportsBrotli = acceptEncoding.includes('br');
    const supportsGzip = acceptEncoding.includes('gzip');
    const supportsDeflate = acceptEncoding.includes('deflate');

    // Set compression preference
    if (supportsBrotli) {
      res.locals.preferredCompression = 'br';
    } else if (supportsGzip) {
      res.locals.preferredCompression = 'gzip';
    } else if (supportsDeflate) {
      res.locals.preferredCompression = 'deflate';
    } else {
      res.locals.preferredCompression = 'none';
    }

    // Add compression info to response headers for debugging
    if (process.env['NODE_ENV'] === 'development') {
      res.setHeader('X-Compression-Support', res.locals.preferredCompression);
    }

    next();
  };
}

/**
 * Middleware to add cache-friendly headers for compressed responses
 */
export function compressionHeaders() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Add Vary header to indicate that response varies based on Accept-Encoding
    res.setHeader('Vary', 'Accept-Encoding');
    
    // Set appropriate cache headers for compressed content
    if (req.method === 'GET' && res.statusCode === 200) {
      const contentType = res.getHeader('content-type') as string;
      
      if (contentType && (
        contentType.includes('application/json') ||
        contentType.includes('text/') ||
        contentType.includes('application/javascript')
      )) {
        // Cache compressed responses for 5 minutes
        res.setHeader('Cache-Control', 'public, max-age=300');
      }
    }

    next();
  };
}