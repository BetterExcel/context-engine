import express from 'express';
import { databaseService } from '../database';

const router = express.Router();

// Get database statistics
router.get('/database/stats', async (_req, res) => {
  try {
    const stats = await databaseService.getSystemStats();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to get database stats:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_STATS_ERROR',
        message: 'Failed to retrieve database statistics',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Get database health status
router.get('/database/health', async (_req, res) => {
  try {
    const health = await databaseService.healthCheck();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      success: health.status === 'healthy',
      data: health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database health check failed:', error);
    res.status(503).json({
      success: false,
      error: {
        code: 'DATABASE_HEALTH_ERROR',
        message: 'Database health check failed',
        timestamp: new Date().toISOString()
      }
    });
  }
});

export default router;