import { SessionRepository } from '../database/repositories/SessionRepository';
import { Session, CreateSession, UserAction, ActionType } from '../database/models/Session';
import { ContextData } from '../types/context';

export interface SessionContext {
  sessionId: string;
  recentActions: UserAction[];
  contextHistory: ContextHistoryEntry[];
  preferences: UserPreferences;
}

export interface ContextHistoryEntry {
  id: string;
  request: string;
  context: ContextData;
  timestamp: Date;
  confidence: number;
  feedback?: UserFeedback;
}

export interface UserPreferences {
  preferredAnalysisDepth: 'basic' | 'detailed' | 'comprehensive';
  includePatternAnalysis: boolean;
  maxHistoryEntries: number;
  autoSaveActions: boolean;
}

export interface UserFeedback {
  rating: number; // 1-5
  wasHelpful: boolean;
  corrections?: string;
  timestamp: Date;
}

export class SessionService {
  private sessionRepository: SessionRepository;
  private contextHistory: Map<string, ContextHistoryEntry[]> = new Map();

  constructor() {
    this.sessionRepository = new SessionRepository();
  }

  /**
   * Creates a new session or retrieves an existing active session
   */
  async createOrGetSession(userId?: string, spreadsheetId?: string): Promise<Session> {
    // Try to find an active session first
    const activeSession = await this.sessionRepository.findActiveSession(userId, spreadsheetId);
    
    if (activeSession) {
      return activeSession;
    }

    // Create a new session
    const sessionData: CreateSession = {
      user_id: userId,
      spreadsheet_id: spreadsheetId,
      actions: [],
      metadata: {
        createdAt: new Date().toISOString(),
        preferences: this.getDefaultPreferences()
      }
    };

    return await this.sessionRepository.create(sessionData);
  }

  /**
   * Tracks a user action in the session
   */
  async trackAction(
    sessionId: string,
    actionType: ActionType,
    data?: any,
    cellReference?: string,
    range?: string
  ): Promise<void> {
    const action: UserAction = {
      type: actionType,
      timestamp: new Date(),
      data,
      cell_reference: cellReference,
      range
    };

    await this.sessionRepository.addAction(sessionId, action);
  }

  /**
   * Stores context analysis result in session history
   */
  async storeContextHistory(
    sessionId: string,
    request: string,
    context: ContextData,
    confidence: number
  ): Promise<string> {
    const historyEntry: ContextHistoryEntry = {
      id: `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      request,
      context,
      timestamp: new Date(),
      confidence
    };

    // Get existing history or create new array
    const existingHistory = this.contextHistory.get(sessionId) || [];
    
    // Add new entry and limit to max entries
    const preferences = await this.getSessionPreferences(sessionId);
    const maxEntries = preferences.maxHistoryEntries;
    
    existingHistory.unshift(historyEntry);
    if (existingHistory.length > maxEntries) {
      existingHistory.splice(maxEntries);
    }

    this.contextHistory.set(sessionId, existingHistory);

    // Track the context generation action
    await this.trackAction(sessionId, ActionType.CONTEXT_GENERATE, {
      contextId: historyEntry.id,
      confidence,
      requestLength: request.length
    });

    return historyEntry.id;
  }

  /**
   * Retrieves context history for a session
   */
  async getContextHistory(sessionId: string, limit?: number): Promise<ContextHistoryEntry[]> {
    const history = this.contextHistory.get(sessionId) || [];
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Gets recent actions for context continuity
   */
  async getRecentActions(sessionId: string, limit: number = 10): Promise<UserAction[]> {
    return await this.sessionRepository.getRecentActions(sessionId, limit);
  }

  /**
   * Gets session context for analysis
   */
  async getSessionContext(sessionId: string): Promise<SessionContext> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const recentActions = await this.getRecentActions(sessionId, 20);
    const contextHistory = await this.getContextHistory(sessionId, 10);
    const preferences = await this.getSessionPreferences(sessionId);

    return {
      sessionId,
      recentActions,
      contextHistory,
      preferences
    };
  }

  /**
   * Updates user preferences for a session
   */
  async updatePreferences(sessionId: string, preferences: Partial<UserPreferences>): Promise<void> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const currentPreferences = session.metadata?.['preferences'] || this.getDefaultPreferences();
    const updatedPreferences = { ...currentPreferences, ...preferences };

    await this.sessionRepository.update(sessionId, {
      metadata: {
        ...session.metadata,
        preferences: updatedPreferences
      }
    });
  }

  /**
   * Adds feedback to a context history entry
   */
  async addContextFeedback(
    sessionId: string,
    contextId: string,
    feedback: UserFeedback
  ): Promise<void> {
    const history = this.contextHistory.get(sessionId) || [];
    const entryIndex = history.findIndex(entry => entry.id === contextId);
    
    if (entryIndex !== -1 && history[entryIndex]) {
      history[entryIndex]!.feedback = feedback;
      this.contextHistory.set(sessionId, history);

      // Track feedback action
      await this.trackAction(sessionId, ActionType.REQUEST_SUBMIT, {
        contextId,
        feedback: {
          rating: feedback.rating,
          wasHelpful: feedback.wasHelpful
        }
      });
    }
  }

  /**
   * Gets session statistics for learning purposes
   */
  async getSessionStats(sessionId: string): Promise<{
    totalActions: number;
    contextGenerations: number;
    averageConfidence: number;
    mostCommonActions: { type: string; count: number }[];
    sessionDuration: number; // in minutes
  }> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const actions = session.actions || [];
    const contextHistory = this.contextHistory.get(sessionId) || [];

    // Calculate statistics
    const totalActions = actions.length;
    const contextGenerations = contextHistory.length;
    
    const averageConfidence = contextGenerations > 0
      ? contextHistory.reduce((sum, entry) => sum + entry.confidence, 0) / contextGenerations
      : 0;

    // Count action types
    const actionCounts = actions.reduce((counts, action) => {
      counts[action.type] = (counts[action.type] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    const mostCommonActions = Object.entries(actionCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate session duration
    const sessionStart = new Date(session.created_at || Date.now());
    const sessionEnd = new Date(session.updated_at || Date.now());
    const sessionDuration = Math.round((sessionEnd.getTime() - sessionStart.getTime()) / (1000 * 60));

    return {
      totalActions,
      contextGenerations,
      averageConfidence,
      mostCommonActions,
      sessionDuration
    };
  }

  /**
   * Cleans up old sessions and context history
   */
  async cleanupOldData(olderThanDays: number = 30): Promise<{
    sessionsDeleted: number;
    historyEntriesDeleted: number;
  }> {
    const sessionsDeleted = await this.sessionRepository.cleanupOldSessions(olderThanDays);
    
    // Clean up in-memory context history
    let historyEntriesDeleted = 0;
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    
    for (const [sessionId, history] of this.contextHistory.entries()) {
      const filteredHistory = history.filter(entry => entry.timestamp > cutoffDate);
      historyEntriesDeleted += history.length - filteredHistory.length;
      
      if (filteredHistory.length === 0) {
        this.contextHistory.delete(sessionId);
      } else {
        this.contextHistory.set(sessionId, filteredHistory);
      }
    }

    return { sessionsDeleted, historyEntriesDeleted };
  }

  /**
   * Gets learning insights from session data
   */
  async getLearningInsights(sessionId: string): Promise<{
    userPatterns: string[];
    improvementSuggestions: string[];
    contextAccuracy: number;
    commonMistakes: string[];
  }> {
    const sessionContext = await this.getSessionContext(sessionId);
    const stats = await this.getSessionStats(sessionId);

    const userPatterns: string[] = [];
    const improvementSuggestions: string[] = [];
    const commonMistakes: string[] = [];

    // Analyze user patterns
    const actionTypes = stats.mostCommonActions.map(action => action.type);
    if (actionTypes.includes(ActionType.CELL_SELECT)) {
      userPatterns.push('Frequently selects individual cells');
    }
    if (actionTypes.includes(ActionType.RANGE_SELECT)) {
      userPatterns.push('Often works with data ranges');
    }
    if (actionTypes.includes(ActionType.FORMULA_EDIT)) {
      userPatterns.push('Actively creates and modifies formulas');
    }

    // Generate improvement suggestions
    if (stats.averageConfidence < 0.7) {
      improvementSuggestions.push('Try providing more specific requests for better context analysis');
    }
    if (stats.contextGenerations < 3) {
      improvementSuggestions.push('Explore more features by asking different types of questions');
    }

    // Analyze feedback for common mistakes
    const feedbackEntries = sessionContext.contextHistory.filter(entry => entry.feedback);
    const lowRatedEntries = feedbackEntries.filter(entry => entry.feedback!.rating < 3);
    
    if (lowRatedEntries.length > 0) {
      commonMistakes.push('Context analysis sometimes misunderstands user intent');
    }

    const contextAccuracy = feedbackEntries.length > 0
      ? feedbackEntries.reduce((sum, entry) => sum + entry.feedback!.rating, 0) / feedbackEntries.length / 5
      : stats.averageConfidence;

    return {
      userPatterns,
      improvementSuggestions,
      contextAccuracy,
      commonMistakes
    };
  }

  private async getSessionPreferences(sessionId: string): Promise<UserPreferences> {
    const session = await this.sessionRepository.findById(sessionId);
    return session?.metadata?.['preferences'] || this.getDefaultPreferences();
  }

  private getDefaultPreferences(): UserPreferences {
    return {
      preferredAnalysisDepth: 'detailed',
      includePatternAnalysis: true,
      maxHistoryEntries: 50,
      autoSaveActions: true
    };
  }
}