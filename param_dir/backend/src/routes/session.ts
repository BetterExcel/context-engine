import * as express from 'express';
import { SessionService, UserFeedback, UserPreferences } from '../services/SessionService';
import { InMemorySessionService } from '../services/InMemorySessionService';
import { ActionType } from '../database/models/Session';
import { ApiError, ErrorCode } from '../types/api';

const router = express.Router();

// Use in-memory session service when database is disabled
const useInMemorySession = process.env.DATABASE_ENABLED === 'false';
const sessionService = useInMemorySession ? InMemorySessionService.getInstance() : new SessionService();
const memorySessionService = sessionService as InMemorySessionService;

/**
 * POST /api/v1/sessions
 * Creates a new session or retrieves an existing active session
 */
router.post('/sessions', async (req, res) => {
  try {
    const { userId, spreadsheetId } = req.body;

    const session = await sessionService.createOrGetSession(userId, spreadsheetId);

    return res.status(200).json({
      success: true,
      data: {
        sessionId: useInMemorySession ? session.id : session.id,
        userId: useInMemorySession ? session.user_id : session.user_id,
        spreadsheetId: useInMemorySession ? session.spreadsheet_id : session.spreadsheet_id,
        createdAt: useInMemorySession ? session.created_at : session.created_at,
        updatedAt: useInMemorySession ? session.updated_at : session.updated_at
      }
    });
  } catch (error) {
    console.error('Session creation error:', error);
    
    const apiError: ApiError = {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: 'Failed to create or retrieve session',
      details: { error: error instanceof Error ? error.message : String(error) },
      timestamp: new Date().toISOString()
    };

    return res.status(500).json({
      success: false,
      error: apiError
    });
  }
});

/**
 * POST /api/v1/sessions/:sessionId/actions
 * Tracks a user action in the session
 */
router.post('/sessions/:sessionId/actions', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { actionType, data, cellReference, range } = req.body;

    // Validate action type
    if (!Object.values(ActionType).includes(actionType)) {
      const apiError: ApiError = {
        code: ErrorCode.INVALID_REQUEST,
        message: 'Invalid action type',
        details: { 
          actionType,
          validTypes: Object.values(ActionType)
        },
        timestamp: new Date().toISOString()
      };

      return res.status(400).json({
        success: false,
        error: apiError
      });
    }

    await sessionService.trackAction(sessionId, actionType, data, cellReference, range);

    return res.status(200).json({
      success: true,
      message: 'Action tracked successfully'
    });
  } catch (error) {
    console.error('Action tracking error:', error);
    
    const apiError: ApiError = {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: 'Failed to track action',
      details: { error: error instanceof Error ? error.message : String(error) },
      timestamp: new Date().toISOString()
    };

    return res.status(500).json({
      success: false,
      error: apiError
    });
  }
});

/**
 * GET /api/v1/sessions/:sessionId/context
 * Gets session context including recent actions and history
 */
router.get('/sessions/:sessionId/context', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const sessionContext = await sessionService.getSessionContext(sessionId);

    return res.status(200).json({
      success: true,
      data: sessionContext
    });
  } catch (error) {
    console.error('Session context retrieval error:', error);
    
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    const errorCode = statusCode === 404 ? ErrorCode.SPREADSHEET_NOT_FOUND : ErrorCode.INTERNAL_SERVER_ERROR;
    
    const apiError: ApiError = {
      code: errorCode,
      message: 'Failed to retrieve session context',
      details: { error: error instanceof Error ? error.message : String(error) },
      timestamp: new Date().toISOString()
    };

    return res.status(statusCode).json({
      success: false,
      error: apiError
    });
  }
});

/**
 * GET /api/v1/sessions/:sessionId/history
 * Gets context analysis history for the session
 */
router.get('/sessions/:sessionId/history', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const limit = req.query['limit'] ? parseInt(req.query['limit'] as string) : undefined;

    const history = await sessionService.getContextHistory(sessionId, limit);

    return res.status(200).json({
      success: true,
      data: {
        history,
        count: history.length
      }
    });
  } catch (error) {
    console.error('History retrieval error:', error);
    
    const apiError: ApiError = {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: 'Failed to retrieve context history',
      details: { error: error instanceof Error ? error.message : String(error) },
      timestamp: new Date().toISOString()
    };

    return res.status(500).json({
      success: false,
      error: apiError
    });
  }
});

/**
 * PUT /api/v1/sessions/:sessionId/preferences
 * Updates user preferences for the session
 */
router.put('/sessions/:sessionId/preferences', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const preferences: Partial<UserPreferences> = req.body;

    // Validate preferences
    const validationError = validatePreferences(preferences);
    if (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError
      });
    }

    await sessionService.updatePreferences(sessionId, preferences);

    return res.status(200).json({
      success: true,
      message: 'Preferences updated successfully'
    });
  } catch (error) {
    console.error('Preferences update error:', error);
    
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    const errorCode = statusCode === 404 ? ErrorCode.SPREADSHEET_NOT_FOUND : ErrorCode.INTERNAL_SERVER_ERROR;
    
    const apiError: ApiError = {
      code: errorCode,
      message: 'Failed to update preferences',
      details: { error: error instanceof Error ? error.message : String(error) },
      timestamp: new Date().toISOString()
    };

    return res.status(statusCode).json({
      success: false,
      error: apiError
    });
  }
});

/**
 * POST /api/v1/sessions/:sessionId/feedback
 * Adds feedback to a context history entry
 */
router.post('/sessions/:sessionId/feedback', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { contextId, rating, wasHelpful, corrections } = req.body;

    // Validate feedback
    if (!contextId || typeof contextId !== 'string') {
      const apiError: ApiError = {
        code: ErrorCode.MISSING_PARAMETERS,
        message: 'Context ID is required',
        details: { parameter: 'contextId' },
        timestamp: new Date().toISOString()
      };

      return res.status(400).json({
        success: false,
        error: apiError
      });
    }

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      const apiError: ApiError = {
        code: ErrorCode.INVALID_REQUEST,
        message: 'Rating must be a number between 1 and 5',
        details: { rating },
        timestamp: new Date().toISOString()
      };

      return res.status(400).json({
        success: false,
        error: apiError
      });
    }

    if (typeof wasHelpful !== 'boolean') {
      const apiError: ApiError = {
        code: ErrorCode.INVALID_REQUEST,
        message: 'wasHelpful must be a boolean',
        details: { wasHelpful },
        timestamp: new Date().toISOString()
      };

      return res.status(400).json({
        success: false,
        error: apiError
      });
    }

    const feedback: UserFeedback = {
      rating,
      wasHelpful,
      corrections,
      timestamp: new Date()
    };

    await sessionService.addContextFeedback(sessionId, contextId, feedback);

    return res.status(200).json({
      success: true,
      message: 'Feedback added successfully'
    });
  } catch (error) {
    console.error('Feedback submission error:', error);
    
    const apiError: ApiError = {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: 'Failed to submit feedback',
      details: { error: error instanceof Error ? error.message : String(error) },
      timestamp: new Date().toISOString()
    };

    return res.status(500).json({
      success: false,
      error: apiError
    });
  }
});

/**
 * GET /api/v1/sessions/:sessionId/stats
 * Gets session statistics for learning purposes
 */
router.get('/sessions/:sessionId/stats', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const stats = await sessionService.getSessionStats(sessionId);

    return res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Session stats retrieval error:', error);
    
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    const errorCode = statusCode === 404 ? ErrorCode.SPREADSHEET_NOT_FOUND : ErrorCode.INTERNAL_SERVER_ERROR;
    
    const apiError: ApiError = {
      code: errorCode,
      message: 'Failed to retrieve session statistics',
      details: { error: error instanceof Error ? error.message : String(error) },
      timestamp: new Date().toISOString()
    };

    return res.status(statusCode).json({
      success: false,
      error: apiError
    });
  }
});

/**
 * GET /api/v1/sessions/:sessionId/insights
 * Gets learning insights from session data
 */
router.get('/sessions/:sessionId/insights', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const insights = await sessionService.getLearningInsights(sessionId);

    return res.status(200).json({
      success: true,
      data: insights
    });
  } catch (error) {
    console.error('Learning insights retrieval error:', error);
    
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    const errorCode = statusCode === 404 ? ErrorCode.SPREADSHEET_NOT_FOUND : ErrorCode.INTERNAL_SERVER_ERROR;
    
    const apiError: ApiError = {
      code: errorCode,
      message: 'Failed to retrieve learning insights',
      details: { error: error instanceof Error ? error.message : String(error) },
      timestamp: new Date().toISOString()
    };

    return res.status(statusCode).json({
      success: false,
      error: apiError
    });
  }
});

/**
 * Validates user preferences
 */
function validatePreferences(preferences: Partial<UserPreferences>): ApiError | null {
  if (preferences.preferredAnalysisDepth && 
      !['basic', 'detailed', 'comprehensive'].includes(preferences.preferredAnalysisDepth)) {
    return {
      code: ErrorCode.INVALID_REQUEST,
      message: 'Invalid analysis depth preference',
      details: { 
        preferredAnalysisDepth: preferences.preferredAnalysisDepth,
        validValues: ['basic', 'detailed', 'comprehensive']
      },
      timestamp: new Date().toISOString()
    };
  }

  if (preferences.maxHistoryEntries && 
      (typeof preferences.maxHistoryEntries !== 'number' || 
       preferences.maxHistoryEntries < 1 || 
       preferences.maxHistoryEntries > 1000)) {
    return {
      code: ErrorCode.INVALID_REQUEST,
      message: 'maxHistoryEntries must be a number between 1 and 1000',
      details: { maxHistoryEntries: preferences.maxHistoryEntries },
      timestamp: new Date().toISOString()
    };
  }

  return null;
}

export default router;