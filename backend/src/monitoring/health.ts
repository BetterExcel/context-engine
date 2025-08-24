import { Request, Response } from 'express';
import { register } from './metrics';
import { databaseService } from '../database';
import logger from './logger';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  service: string;
  version: string;
  uptime: number;
  checks: {
    database: HealthCheck;
    openai: HealthCheck;
    memory: HealthCheck;
    disk: HealthCheck;
  };
}

export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  details?: any;
  responseTime?: number;
}

// Health check endpoint
export const healthCheck = async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const checks = await performHealthChecks();
    const overallStatus = determineOverallStatus(checks);
    
    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      service: 'excel-context-engine-backend',
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      checks
    };
    
    const statusCode = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;
    
    logger.info(`Health check completed: ${overallStatus}`, {
      status: overallStatus,
      responseTime: Date.now() - startTime,
      checks
    });
    
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    logger.error('Health check failed:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'excel-context-engine-backend',
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Metrics endpoint
export const metricsEndpoint = async (req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    logger.error('Failed to generate metrics:', error);
    res.status(500).json({ error: 'Failed to generate metrics' });
  }
};

// Perform all health checks
async function performHealthChecks() {
  const checks = await Promise.allSettled([
    checkDatabase(),
    checkOpenAI(),
    checkMemory(),
    checkDisk()
  ]);
  
  return {
    database: checks[0].status === 'fulfilled' ? checks[0].value : { status: 'unhealthy' as const, message: 'Check failed' },
    openai: checks[1].status === 'fulfilled' ? checks[1].value : { status: 'unhealthy' as const, message: 'Check failed' },
    memory: checks[2].status === 'fulfilled' ? checks[2].value : { status: 'unhealthy' as const, message: 'Check failed' },
    disk: checks[3].status === 'fulfilled' ? checks[3].value : { status: 'unhealthy' as const, message: 'Check failed' }
  };
}

// Database health check
async function checkDatabase(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  // If database is disabled, return immediately
  if (process.env['DATABASE_ENABLED'] === 'false') {
    return {
      status: 'healthy',
      message: 'Database disabled in configuration',
      details: { enabled: false },
      responseTime: Date.now() - startTime
    };
  }
  
  try {
    const dbHealth = await databaseService.healthCheck();
    const responseTime = Date.now() - startTime;
    
    return {
      status: dbHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
      message: 'Database check completed',
      details: dbHealth,
      responseTime
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime
    };
  }
}

// OpenAI API health check
async function checkOpenAI(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    const hasApiKey = !!process.env.OPENAI_API_KEY && 
                     process.env.OPENAI_API_KEY !== 'your_openai_api_key_here';
    
    if (!hasApiKey) {
      return {
        status: 'degraded',
        message: 'OpenAI API key not configured',
        responseTime: Date.now() - startTime
      };
    }
    
    // Simple check - just verify the service is configured
    return {
      status: 'healthy',
      message: 'OpenAI service configured',
      responseTime: Date.now() - startTime
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: 'OpenAI service check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime
    };
  }
}

// Memory health check
async function checkMemory(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    const usage = process.memoryUsage();
    const totalMemory = usage.heapTotal;
    const usedMemory = usage.heapUsed;
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let message = 'Memory usage normal';
    
    if (memoryUsagePercent > 90) {
      status = 'unhealthy';
      message = 'Memory usage critical';
    } else if (memoryUsagePercent > 80) {
      status = 'degraded';
      message = 'Memory usage high';
    }
    
    return {
      status,
      message,
      details: {
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + ' MB',
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + ' MB',
        external: Math.round(usage.external / 1024 / 1024) + ' MB',
        rss: Math.round(usage.rss / 1024 / 1024) + ' MB',
        usagePercent: Math.round(memoryUsagePercent * 100) / 100 + '%'
      },
      responseTime: Date.now() - startTime
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: 'Memory check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime
    };
  }
}

// Disk space health check
async function checkDisk(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    // Simple disk check - just verify we can write to temp directory
    const fs = require('fs');
    const path = require('path');
    const tempFile = path.join(process.cwd(), 'temp-health-check.txt');
    
    fs.writeFileSync(tempFile, 'health check');
    fs.unlinkSync(tempFile);
    
    return {
      status: 'healthy',
      message: 'Disk access normal',
      responseTime: Date.now() - startTime
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: 'Disk access failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime
    };
  }
}

// Determine overall status based on individual checks
function determineOverallStatus(checks: HealthStatus['checks']): 'healthy' | 'degraded' | 'unhealthy' {
  const statuses = Object.values(checks).map(check => check.status);
  
  if (statuses.includes('unhealthy')) {
    return 'unhealthy';
  }
  
  if (statuses.includes('degraded')) {
    return 'degraded';
  }
  
  return 'healthy';
}