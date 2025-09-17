import { SessionService, UserPreferences, UserFeedback } from '../SessionService';
import { SessionRepository } from '../../database/repositories/SessionRepository';
import { ActionType } from '../../database/models/Session';

// Mock the SessionRepository
jest.mock('../../database/repositories/SessionRepository');

describe('SessionService', () => {
  let sessionService: SessionService;
  let mockSessionRepository: jest.Mocked<SessionRepository>;

  beforeEach(() => {
    sessionService = new SessionService();
    mockSessionRepository = new SessionRepository() as jest.Mocked<SessionRepository>;
    (sessionService as any).sessionRepository = mockSessionRepository;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrGetSession', () => {
    it('should create a new session when no active session exists', async () => {
      const mockSession = {
        id: 'session-123',
        user_id: 'user-456',
        spreadsheet_id: 'sheet-789',
        actions: [],
        metadata: { preferences: {} },
        created_at: new Date(),
        updated_at: new Date()
      };

      mockSessionRepository.findActiveSession.mockResolvedValue(null);
      mockSessionRepository.create.mockResolvedValue(mockSession);

      const result = await sessionService.createOrGetSession('user-456', 'sheet-789');

      expect(mockSessionRepository.findActiveSession).toHaveBeenCalledWith('user-456', 'sheet-789');
      expect(mockSessionRepository.create).toHaveBeenCalledWith({
        user_id: 'user-456',
        spreadsheet_id: 'sheet-789',
        actions: [],
        metadata: expect.objectContaining({
          preferences: expect.any(Object)
        })
      });
      expect(result).toEqual(mockSession);
    });

    it('should return existing active session when available', async () => {
      const mockActiveSession = {
        id: 'session-123',
        user_id: 'user-456',
        spreadsheet_id: 'sheet-789',
        actions: [],
        metadata: {},
        created_at: new Date(),
        updated_at: new Date()
      };

      mockSessionRepository.findActiveSession.mockResolvedValue(mockActiveSession);

      const result = await sessionService.createOrGetSession('user-456', 'sheet-789');

      expect(mockSessionRepository.findActiveSession).toHaveBeenCalledWith('user-456', 'sheet-789');
      expect(mockSessionRepository.create).not.toHaveBeenCalled();
      expect(result).toEqual(mockActiveSession);
    });
  });

  describe('trackAction', () => {
    it('should track user action successfully', async () => {
      const sessionId = 'session-123';
      const actionType = ActionType.CELL_SELECT;
      const data = { cell: 'A1' };
      const cellReference = 'A1';

      mockSessionRepository.addAction.mockResolvedValue(null);

      await sessionService.trackAction(sessionId, actionType, data, cellReference);

      expect(mockSessionRepository.addAction).toHaveBeenCalledWith(
        sessionId,
        expect.objectContaining({
          type: actionType,
          data,
          cell_reference: cellReference,
          timestamp: expect.any(Date)
        })
      );
    });
  });

  describe('storeContextHistory', () => {
    it('should store context history and return context ID', async () => {
      const sessionId = 'session-123';
      const request = 'Calculate sum of column A';
      const context = { immediate: {}, related: {}, structural: {}, summary: {} };
      const confidence = 0.85;

      mockSessionRepository.addAction.mockResolvedValue(null);

      const contextId = await sessionService.storeContextHistory(
        sessionId,
        request,
        context as any,
        confidence
      );

      expect(contextId).toMatch(/^ctx_\d+_[a-z0-9]+$/);
      expect(mockSessionRepository.addAction).toHaveBeenCalledWith(
        sessionId,
        expect.objectContaining({
          type: ActionType.CONTEXT_GENERATE,
          data: expect.objectContaining({
            contextId,
            confidence,
            requestLength: request.length
          })
        })
      );
    });

    it('should limit history entries based on preferences', async () => {
      const sessionId = 'session-123';
      const mockSession = {
        id: sessionId,
        metadata: {
          preferences: { maxHistoryEntries: 2 }
        }
      };

      mockSessionRepository.findById.mockResolvedValue(mockSession as any);
      mockSessionRepository.addAction.mockResolvedValue(null);

      // Store first entry
      await sessionService.storeContextHistory(sessionId, 'Request 1', {} as any, 0.8);
      
      // Store second entry
      await sessionService.storeContextHistory(sessionId, 'Request 2', {} as any, 0.9);
      
      // Store third entry (should remove first)
      await sessionService.storeContextHistory(sessionId, 'Request 3', {} as any, 0.7);

      const history = await sessionService.getContextHistory(sessionId);
      expect(history).toHaveLength(2);
      expect(history[0]?.request).toBe('Request 3');
      expect(history[1]?.request).toBe('Request 2');
    });
  });

  describe('getSessionContext', () => {
    it('should return complete session context', async () => {
      const sessionId = 'session-123';
      const mockSession = {
        id: sessionId,
        actions: [
          { type: ActionType.CELL_SELECT, timestamp: new Date(), data: { cell: 'A1' } }
        ],
        metadata: {
          preferences: { maxHistoryEntries: 50 }
        }
      };

      mockSessionRepository.findById.mockResolvedValue(mockSession as any);
      mockSessionRepository.getRecentActions.mockResolvedValue(mockSession.actions as any);

      const result = await sessionService.getSessionContext(sessionId);

      expect(result).toEqual({
        sessionId,
        recentActions: mockSession.actions,
        contextHistory: [],
        preferences: expect.objectContaining({
          maxHistoryEntries: 50
        })
      });
    });

    it('should throw error for non-existent session', async () => {
      const sessionId = 'non-existent';
      mockSessionRepository.findById.mockResolvedValue(null);

      await expect(sessionService.getSessionContext(sessionId))
        .rejects.toThrow('Session non-existent not found');
    });
  });

  describe('updatePreferences', () => {
    it('should update user preferences successfully', async () => {
      const sessionId = 'session-123';
      const mockSession = {
        id: sessionId,
        metadata: {
          preferences: { maxHistoryEntries: 50 }
        }
      };
      const newPreferences: Partial<UserPreferences> = {
        preferredAnalysisDepth: 'comprehensive',
        includePatternAnalysis: false
      };

      mockSessionRepository.findById.mockResolvedValue(mockSession as any);
      mockSessionRepository.update.mockResolvedValue(null);

      await sessionService.updatePreferences(sessionId, newPreferences);

      expect(mockSessionRepository.update).toHaveBeenCalledWith(sessionId, {
        metadata: {
          ...mockSession.metadata,
          preferences: {
            maxHistoryEntries: 50,
            preferredAnalysisDepth: 'comprehensive',
            includePatternAnalysis: false
          }
        }
      });
    });
  });

  describe('addContextFeedback', () => {
    it('should add feedback to context history entry', async () => {
      const sessionId = 'session-123';
      const feedback: UserFeedback = {
        rating: 4,
        wasHelpful: true,
        corrections: 'Good analysis',
        timestamp: new Date()
      };

      // First store a context entry
      mockSessionRepository.addAction.mockResolvedValue(null);
      await sessionService.storeContextHistory(sessionId, 'Test request', {} as any, 0.8);

      // Get the stored context ID from the in-memory storage
      const history = await sessionService.getContextHistory(sessionId);
      const actualContextId = history[0]?.id;
      
      if (!actualContextId) {
        throw new Error('Context ID not found');
      }

      await sessionService.addContextFeedback(sessionId, actualContextId, feedback);

      const updatedHistory = await sessionService.getContextHistory(sessionId);
      expect(updatedHistory[0]?.feedback).toEqual(feedback);
      expect(mockSessionRepository.addAction).toHaveBeenCalledWith(
        sessionId,
        expect.objectContaining({
          type: ActionType.REQUEST_SUBMIT,
          data: expect.objectContaining({
            contextId: actualContextId,
            feedback: {
              rating: feedback.rating,
              wasHelpful: feedback.wasHelpful
            }
          })
        })
      );
    });
  });

  describe('getSessionStats', () => {
    it('should return session statistics', async () => {
      const sessionId = 'session-123';
      const mockSession = {
        id: sessionId,
        actions: [
          { type: ActionType.CELL_SELECT, timestamp: new Date() },
          { type: ActionType.RANGE_SELECT, timestamp: new Date() },
          { type: ActionType.CELL_SELECT, timestamp: new Date() }
        ],
        created_at: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        updated_at: new Date()
      };

      mockSessionRepository.findById.mockResolvedValue(mockSession as any);

      // Store some context history
      mockSessionRepository.addAction.mockResolvedValue(null);
      await sessionService.storeContextHistory(sessionId, 'Request 1', {} as any, 0.8);
      await sessionService.storeContextHistory(sessionId, 'Request 2', {} as any, 0.9);

      const stats = await sessionService.getSessionStats(sessionId);

      expect(stats).toEqual({
        totalActions: 3,
        contextGenerations: 2,
        averageConfidence: expect.closeTo(0.85, 2),
        mostCommonActions: [
          { type: ActionType.CELL_SELECT, count: 2 },
          { type: ActionType.RANGE_SELECT, count: 1 }
        ],
        sessionDuration: 30
      });
    });
  });

  describe('getLearningInsights', () => {
    it('should generate learning insights from session data', async () => {
      const sessionId = 'session-123';
      const mockSession = {
        id: sessionId,
        actions: [
          { type: ActionType.CELL_SELECT, timestamp: new Date() },
          { type: ActionType.FORMULA_EDIT, timestamp: new Date() }
        ],
        created_at: new Date(Date.now() - 15 * 60 * 1000),
        updated_at: new Date()
      };

      mockSessionRepository.findById.mockResolvedValue(mockSession as any);
      mockSessionRepository.getRecentActions.mockResolvedValue(mockSession.actions as any);

      // Store context with feedback
      mockSessionRepository.addAction.mockResolvedValue(null);
      await sessionService.storeContextHistory(sessionId, 'Test request', {} as any, 0.9);
      const history = await sessionService.getContextHistory(sessionId);
      const contextId = history[0]?.id;
      
      if (contextId) {
        await sessionService.addContextFeedback(sessionId, contextId, {
          rating: 4,
          wasHelpful: true,
          timestamp: new Date()
        });
      }

      const insights = await sessionService.getLearningInsights(sessionId);

      expect(insights).toEqual({
        userPatterns: [
          'Frequently selects individual cells',
          'Actively creates and modifies formulas'
        ],
        improvementSuggestions: [
          'Explore more features by asking different types of questions'
        ],
        contextAccuracy: 0.8, // 4/5 rating
        commonMistakes: []
      });
    });
  });

  describe('cleanupOldData', () => {
    it('should clean up old sessions and context history', async () => {
      const olderThanDays = 7;
      
      mockSessionRepository.cleanupOldSessions.mockResolvedValue(5);

      // Add some old context history
      const sessionId = 'session-123';
      const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      (sessionService as any).contextHistory.set(sessionId, [
        { id: 'ctx-1', timestamp: oldDate, request: 'Old request', context: {}, confidence: 0.8 }
      ]);

      const result = await sessionService.cleanupOldData(olderThanDays);

      expect(result.sessionsDeleted).toBe(5);
      expect(result.historyEntriesDeleted).toBe(1);
      expect((sessionService as any).contextHistory.has(sessionId)).toBe(false);
    });
  });
});