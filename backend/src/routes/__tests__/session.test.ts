import request from 'supertest';
import express from 'express';
import sessionRoutes from '../session';
import { SessionService } from '../../services/SessionService';
import { ActionType } from '../../database/models/Session';

// Mock the SessionService
jest.mock('../../services/SessionService');

const MockedSessionService = SessionService as jest.MockedClass<typeof SessionService>;

const app = express();
app.use(express.json());
app.use('/api/v1', sessionRoutes);

describe('Session Routes', () => {
  let mockSessionService: jest.Mocked<SessionService>;

  beforeEach(() => {
    mockSessionService = {
      createOrGetSession: jest.fn(),
      trackAction: jest.fn(),
      getSessionContext: jest.fn(),
      getContextHistory: jest.fn(),
      updatePreferences: jest.fn(),
      addContextFeedback: jest.fn(),
      getSessionStats: jest.fn(),
      getLearningInsights: jest.fn(),
    } as any;

    MockedSessionService.mockImplementation(() => mockSessionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/sessions', () => {
    it('should create a new session successfully', async () => {
      const mockSession = {
        id: 'session-123',
        user_id: 'user-456',
        spreadsheet_id: 'sheet-789',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockSessionService.createOrGetSession.mockResolvedValue(mockSession as any);

      const response = await request(app)
        .post('/api/v1/sessions')
        .send({
          userId: 'user-456',
          spreadsheetId: 'sheet-789'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.sessionId).toBe('session-123');
      expect(mockSessionService.createOrGetSession).toHaveBeenCalledWith('user-456', 'sheet-789');
    });

    it('should handle session creation errors', async () => {
      mockSessionService.createOrGetSession.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/v1/sessions')
        .send({
          userId: 'user-456',
          spreadsheetId: 'sheet-789'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('POST /api/v1/sessions/:sessionId/actions', () => {
    it('should track action successfully', async () => {
      mockSessionService.trackAction.mockResolvedValue();

      const response = await request(app)
        .post('/api/v1/sessions/session-123/actions')
        .send({
          actionType: ActionType.CELL_SELECT,
          data: { cell: 'A1' },
          cellReference: 'A1'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockSessionService.trackAction).toHaveBeenCalledWith(
        'session-123',
        ActionType.CELL_SELECT,
        { cell: 'A1' },
        'A1',
        undefined
      );
    });

    it('should reject invalid action types', async () => {
      const response = await request(app)
        .post('/api/v1/sessions/session-123/actions')
        .send({
          actionType: 'invalid_action',
          data: { cell: 'A1' }
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_REQUEST');
    });
  });

  describe('GET /api/v1/sessions/:sessionId/context', () => {
    it('should return session context successfully', async () => {
      const mockContext = {
        sessionId: 'session-123',
        recentActions: [],
        contextHistory: [],
        preferences: {
          preferredAnalysisDepth: 'detailed' as const,
          includePatternAnalysis: true,
          maxHistoryEntries: 50,
          autoSaveActions: true
        }
      };

      mockSessionService.getSessionContext.mockResolvedValue(mockContext);

      const response = await request(app)
        .get('/api/v1/sessions/session-123/context');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockContext);
    });

    it('should handle session not found', async () => {
      mockSessionService.getSessionContext.mockRejectedValue(new Error('Session session-123 not found'));

      const response = await request(app)
        .get('/api/v1/sessions/session-123/context');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/sessions/:sessionId/history', () => {
    it('should return context history successfully', async () => {
      const mockHistory = [
        {
          id: 'ctx-1',
          request: 'Calculate sum',
          context: {},
          timestamp: new Date().toISOString(),
          confidence: 0.85
        }
      ];

      mockSessionService.getContextHistory.mockResolvedValue(mockHistory as any);

      const response = await request(app)
        .get('/api/v1/sessions/session-123/history?limit=10');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.history).toEqual(mockHistory);
      expect(response.body.data.count).toBe(1);
      expect(mockSessionService.getContextHistory).toHaveBeenCalledWith('session-123', 10);
    });
  });

  describe('PUT /api/v1/sessions/:sessionId/preferences', () => {
    it('should update preferences successfully', async () => {
      mockSessionService.updatePreferences.mockResolvedValue();

      const preferences = {
        preferredAnalysisDepth: 'comprehensive' as const,
        includePatternAnalysis: false
      };

      const response = await request(app)
        .put('/api/v1/sessions/session-123/preferences')
        .send(preferences);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockSessionService.updatePreferences).toHaveBeenCalledWith('session-123', preferences);
    });

    it('should validate preferences', async () => {
      const response = await request(app)
        .put('/api/v1/sessions/session-123/preferences')
        .send({
          preferredAnalysisDepth: 'invalid_depth'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_REQUEST');
    });
  });

  describe('POST /api/v1/sessions/:sessionId/feedback', () => {
    it('should submit feedback successfully', async () => {
      mockSessionService.addContextFeedback.mockResolvedValue();

      const feedback = {
        contextId: 'ctx-123',
        rating: 4,
        wasHelpful: true,
        corrections: 'Good analysis'
      };

      const response = await request(app)
        .post('/api/v1/sessions/session-123/feedback')
        .send(feedback);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockSessionService.addContextFeedback).toHaveBeenCalledWith(
        'session-123',
        'ctx-123',
        expect.objectContaining({
          rating: 4,
          wasHelpful: true,
          corrections: 'Good analysis',
          timestamp: expect.any(Date)
        })
      );
    });

    it('should validate feedback parameters', async () => {
      const response = await request(app)
        .post('/api/v1/sessions/session-123/feedback')
        .send({
          contextId: 'ctx-123',
          rating: 6, // Invalid rating
          wasHelpful: true
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_REQUEST');
    });
  });

  describe('GET /api/v1/sessions/:sessionId/stats', () => {
    it('should return session statistics', async () => {
      const mockStats = {
        totalActions: 15,
        contextGenerations: 5,
        averageConfidence: 0.82,
        mostCommonActions: [
          { type: 'cell_select', count: 8 },
          { type: 'range_select', count: 4 }
        ],
        sessionDuration: 45
      };

      mockSessionService.getSessionStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/v1/sessions/session-123/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStats);
    });
  });

  describe('GET /api/v1/sessions/:sessionId/insights', () => {
    it('should return learning insights', async () => {
      const mockInsights = {
        userPatterns: ['Frequently selects individual cells'],
        improvementSuggestions: ['Try providing more specific requests'],
        contextAccuracy: 0.85,
        commonMistakes: []
      };

      mockSessionService.getLearningInsights.mockResolvedValue(mockInsights);

      const response = await request(app)
        .get('/api/v1/sessions/session-123/insights');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockInsights);
    });
  });
});