import { ActionType } from '../database/models/Session';

export interface InMemorySession {
  id: string;
  user_id?: string;
  spreadsheet_id?: string;
  created_at: Date;
  updated_at: Date;
  actions: Array<{
    id: string;
    action_type: ActionType;
    data: any;
    cell_reference?: string;
    range?: string;
    timestamp: Date;
  }>;
  contextHistory: Array<{
    id: string;
    request: string;
    context_data: any;
    confidence: number;
    timestamp: Date;
    feedback?: any;
  }>;
  preferences: {
    preferredAnalysisDepth?: 'basic' | 'detailed' | 'comprehensive';
    maxHistoryEntries?: number;
    enableAIGeneration?: boolean;
    autoSaveContext?: boolean;
  };
}

export class InMemorySessionService {
  private static instance: InMemorySessionService;
  private sessions: Map<string, InMemorySession> = new Map();

  // Singleton pattern
  public static getInstance(): InMemorySessionService {
    if (!InMemorySessionService.instance) {
      InMemorySessionService.instance = new InMemorySessionService();
    }
    return InMemorySessionService.instance;
  }

  async createOrGetSession(userId?: string, spreadsheetId?: string): Promise<InMemorySession> {
    // For development, create a simple session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: InMemorySession = {
      id: sessionId,
      user_id: userId,
      spreadsheet_id: spreadsheetId,
      created_at: new Date(),
      updated_at: new Date(),
      actions: [],
      contextHistory: [],
      preferences: {
        preferredAnalysisDepth: 'detailed',
        maxHistoryEntries: 50,
        enableAIGeneration: true,
        autoSaveContext: true
      }
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  async trackAction(
    sessionId: string,
    actionType: ActionType,
    data: any,
    cellReference?: string,
    range?: string
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const action = {
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action_type: actionType,
      data,
      cell_reference: cellReference,
      range,
      timestamp: new Date()
    };

    session.actions.push(action);
    session.updated_at = new Date();

    // Keep only last 100 actions
    if (session.actions.length > 100) {
      session.actions = session.actions.slice(-100);
    }
  }

  async getSessionContext(sessionId: string): Promise<any> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    return {
      sessionId: session.id,
      userId: session.user_id,
      spreadsheetId: session.spreadsheet_id,
      recentActions: session.actions.slice(-10), // Last 10 actions
      preferences: session.preferences,
      contextHistoryCount: session.contextHistory.length,
      createdAt: session.created_at,
      updatedAt: session.updated_at
    };
  }

  async storeContextHistory(
    sessionId: string,
    request: string,
    contextData: any,
    confidence: number
  ): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const contextId = `context_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const contextEntry = {
      id: contextId,
      request,
      context_data: contextData,
      confidence,
      timestamp: new Date()
    };

    session.contextHistory.push(contextEntry);
    session.updated_at = new Date();

    // Keep only the configured number of history entries
    const maxEntries = session.preferences.maxHistoryEntries || 50;
    if (session.contextHistory.length > maxEntries) {
      session.contextHistory = session.contextHistory.slice(-maxEntries);
    }

    return contextId;
  }

  async getContextHistory(sessionId: string, limit?: number): Promise<any[]> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const history = session.contextHistory.slice();
    if (limit) {
      return history.slice(-limit);
    }
    return history;
  }

  async updatePreferences(sessionId: string, preferences: Partial<InMemorySession['preferences']>): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.preferences = { ...session.preferences, ...preferences };
    session.updated_at = new Date();
  }

  async addContextFeedback(sessionId: string, contextId: string, feedback: any): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const contextEntry = session.contextHistory.find(entry => entry.id === contextId);
    if (!contextEntry) {
      throw new Error(`Context entry ${contextId} not found`);
    }

    contextEntry.feedback = feedback;
    session.updated_at = new Date();
  }

  async getSessionStats(sessionId: string): Promise<any> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const actionCounts = session.actions.reduce((counts, action) => {
      counts[action.action_type] = (counts[action.action_type] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    return {
      sessionId: session.id,
      totalActions: session.actions.length,
      actionCounts,
      contextHistoryCount: session.contextHistory.length,
      averageConfidence: session.contextHistory.length > 0 
        ? session.contextHistory.reduce((sum, entry) => sum + entry.confidence, 0) / session.contextHistory.length
        : 0,
      sessionDuration: Date.now() - session.created_at.getTime(),
      lastActivity: session.updated_at
    };
  }

  async getLearningInsights(sessionId: string): Promise<any> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Simple insights for development
    const insights = {
      mostCommonActions: this.getMostCommonActions(session.actions),
      averageConfidence: session.contextHistory.length > 0 
        ? session.contextHistory.reduce((sum, entry) => sum + entry.confidence, 0) / session.contextHistory.length
        : 0,
      totalInteractions: session.actions.length + session.contextHistory.length,
      sessionLength: Date.now() - session.created_at.getTime(),
      suggestions: [
        'Continue exploring different types of analysis',
        'Try using keyboard shortcuts for faster navigation',
        'Consider providing more specific requests for better results'
      ]
    };

    return insights;
  }

  private getMostCommonActions(actions: InMemorySession['actions']): Array<{ action: string; count: number }> {
    const counts = actions.reduce((acc, action) => {
      acc[action.action_type] = (acc[action.action_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  // Cleanup method for development
  clearAllSessions(): void {
    this.sessions.clear();
  }

  getSessionCount(): number {
    return this.sessions.size;
  }
}