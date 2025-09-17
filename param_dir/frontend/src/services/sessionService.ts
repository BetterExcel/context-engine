import { ApiService } from './api';

export interface SessionData {
  sessionId: string;
  userId?: string;
  spreadsheetId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserAction {
  type: string;
  timestamp: string;
  data?: any;
  cellReference?: string;
  range?: string;
}

export interface ContextHistoryEntry {
  id: string;
  request: string;
  context: any;
  timestamp: string;
  confidence: number;
  feedback?: UserFeedback;
}

export interface UserFeedback {
  rating: number;
  wasHelpful: boolean;
  corrections?: string;
  timestamp: string;
}

export interface UserPreferences {
  preferredAnalysisDepth: 'basic' | 'detailed' | 'comprehensive';
  includePatternAnalysis: boolean;
  maxHistoryEntries: number;
  autoSaveActions: boolean;
}

export interface SessionContext {
  sessionId: string;
  recentActions: UserAction[];
  contextHistory: ContextHistoryEntry[];
  preferences: UserPreferences;
}

export interface SessionStats {
  totalActions: number;
  contextGenerations: number;
  averageConfidence: number;
  mostCommonActions: { type: string; count: number }[];
  sessionDuration: number;
}

export interface LearningInsights {
  userPatterns: string[];
  improvementSuggestions: string[];
  contextAccuracy: number;
  commonMistakes: string[];
}

export class SessionService {
  private static currentSessionId: string | null = null;
  private static sessionData: SessionData | null = null;

  /**
   * Creates a new session or retrieves an existing active session
   */
  static async createOrGetSession(userId?: string, spreadsheetId?: string): Promise<SessionData> {
    try {
      const response = await fetch('/api/v1/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, spreadsheetId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to create session');
      }

      this.sessionData = result.data;
      this.currentSessionId = result.data.sessionId;
      
      return result.data;
    } catch (error) {
      console.error('Session creation error:', error);
      throw error;
    }
  }

  /**
   * Gets the current session ID
   */
  static getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  /**
   * Gets the current session data
   */
  static getCurrentSession(): SessionData | null {
    return this.sessionData;
  }

  /**
   * Tracks a user action
   */
  static async trackAction(
    actionType: string,
    data?: any,
    cellReference?: string,
    range?: string
  ): Promise<void> {
    if (!this.currentSessionId) {
      console.warn('No active session to track action');
      return;
    }

    try {
      const response = await fetch(`/api/v1/sessions/${this.currentSessionId}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actionType,
          data,
          cellReference,
          range,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to track action: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to track action');
      }
    } catch (error) {
      console.error('Action tracking error:', error);
      // Don't throw - action tracking should be non-blocking
    }
  }

  /**
   * Gets session context including recent actions and history
   */
  static async getSessionContext(sessionId?: string): Promise<SessionContext> {
    const targetSessionId = sessionId || this.currentSessionId;
    if (!targetSessionId) {
      throw new Error('No session ID provided');
    }

    try {
      const response = await fetch(`/api/v1/sessions/${targetSessionId}/context`);

      if (!response.ok) {
        throw new Error(`Failed to get session context: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to get session context');
      }

      return result.data;
    } catch (error) {
      console.error('Session context retrieval error:', error);
      throw error;
    }
  }

  /**
   * Gets context history for the session
   */
  static async getContextHistory(sessionId?: string, limit?: number): Promise<ContextHistoryEntry[]> {
    const targetSessionId = sessionId || this.currentSessionId;
    if (!targetSessionId) {
      throw new Error('No session ID provided');
    }

    try {
      const url = new URL(`/api/v1/sessions/${targetSessionId}/history`, window.location.origin);
      if (limit) {
        url.searchParams.set('limit', limit.toString());
      }

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`Failed to get context history: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to get context history');
      }

      return result.data.history;
    } catch (error) {
      console.error('Context history retrieval error:', error);
      throw error;
    }
  }

  /**
   * Updates user preferences
   */
  static async updatePreferences(preferences: Partial<UserPreferences>, sessionId?: string): Promise<void> {
    const targetSessionId = sessionId || this.currentSessionId;
    if (!targetSessionId) {
      throw new Error('No session ID provided');
    }

    try {
      const response = await fetch(`/api/v1/sessions/${targetSessionId}/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        throw new Error(`Failed to update preferences: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to update preferences');
      }
    } catch (error) {
      console.error('Preferences update error:', error);
      throw error;
    }
  }

  /**
   * Submits feedback for a context analysis
   */
  static async submitFeedback(
    contextId: string,
    rating: number,
    wasHelpful: boolean,
    corrections?: string,
    sessionId?: string
  ): Promise<void> {
    const targetSessionId = sessionId || this.currentSessionId;
    if (!targetSessionId) {
      throw new Error('No session ID provided');
    }

    try {
      const response = await fetch(`/api/v1/sessions/${targetSessionId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contextId,
          rating,
          wasHelpful,
          corrections,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to submit feedback: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to submit feedback');
      }
    } catch (error) {
      console.error('Feedback submission error:', error);
      throw error;
    }
  }

  /**
   * Gets session statistics
   */
  static async getSessionStats(sessionId?: string): Promise<SessionStats> {
    const targetSessionId = sessionId || this.currentSessionId;
    if (!targetSessionId) {
      throw new Error('No session ID provided');
    }

    try {
      const response = await fetch(`/api/v1/sessions/${targetSessionId}/stats`);

      if (!response.ok) {
        throw new Error(`Failed to get session stats: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to get session stats');
      }

      return result.data;
    } catch (error) {
      console.error('Session stats retrieval error:', error);
      throw error;
    }
  }

  /**
   * Gets learning insights
   */
  static async getLearningInsights(sessionId?: string): Promise<LearningInsights> {
    const targetSessionId = sessionId || this.currentSessionId;
    if (!targetSessionId) {
      throw new Error('No session ID provided');
    }

    try {
      const response = await fetch(`/api/v1/sessions/${targetSessionId}/insights`);

      if (!response.ok) {
        throw new Error(`Failed to get learning insights: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to get learning insights');
      }

      return result.data;
    } catch (error) {
      console.error('Learning insights retrieval error:', error);
      throw error;
    }
  }

  /**
   * Clears the current session
   */
  static clearSession(): void {
    this.currentSessionId = null;
    this.sessionData = null;
  }
}

// Action types enum for consistency with backend
export enum ActionType {
  CELL_SELECT = 'cell_select',
  RANGE_SELECT = 'range_select',
  FORMULA_EDIT = 'formula_edit',
  DATA_ENTRY = 'data_entry',
  REQUEST_SUBMIT = 'request_submit',
  CONTEXT_GENERATE = 'context_generate'
}