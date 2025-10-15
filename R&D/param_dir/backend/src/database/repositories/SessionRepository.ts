import { BaseRepository } from './BaseRepository';
import { Session, CreateSession, UpdateSession, UserAction, ActionType } from '../models/Session';

export class SessionRepository extends BaseRepository<Session, CreateSession, UpdateSession> {
  constructor() {
    super('sessions');
  }

  async findByUserId(userId: string, limit?: number): Promise<Session[]> {
    let query = this.db(this.tableName)
      .where({ user_id: userId })
      .orderBy('updated_at', 'desc');
    
    if (limit) {
      query = query.limit(limit);
    }
    
    return query;
  }

  async findBySpreadsheetId(spreadsheetId: string): Promise<Session[]> {
    return this.db(this.tableName)
      .where({ spreadsheet_id: spreadsheetId })
      .orderBy('updated_at', 'desc');
  }

  async findActiveSession(userId?: string, spreadsheetId?: string): Promise<Session | null> {
    let query = this.db(this.tableName);
    
    if (userId) {
      query = query.where({ user_id: userId });
    }
    
    if (spreadsheetId) {
      query = query.where({ spreadsheet_id: spreadsheetId });
    }
    
    // Consider a session active if it was updated within the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    query = query.where('updated_at', '>', oneHourAgo);
    
    const result = await query
      .orderBy('updated_at', 'desc')
      .first();
    
    return result || null;
  }

  async addAction(sessionId: string, action: UserAction): Promise<Session | null> {
    // First get the current session
    const session = await this.findById(sessionId);
    if (!session) {
      return null;
    }

    // Add the new action to the actions array
    const updatedActions = [...(session.actions || []), action];

    // Update the session with the new action
    return this.update(sessionId, {
      actions: updatedActions
    });
  }

  async getRecentActions(sessionId: string, limit: number = 10): Promise<UserAction[]> {
    const session = await this.findById(sessionId);
    if (!session || !session.actions) {
      return [];
    }

    // Sort actions by timestamp (most recent first) and limit
    return session.actions
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  async getActionsByType(sessionId: string, actionType: ActionType): Promise<UserAction[]> {
    const session = await this.findById(sessionId);
    if (!session || !session.actions) {
      return [];
    }

    return session.actions.filter(action => action.type === actionType);
  }

  async cleanupOldSessions(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    
    return this.db(this.tableName)
      .where('updated_at', '<', cutoffDate)
      .del();
  }

  async getSessionStats(): Promise<{
    total: number;
    active: number;
    avgActionsPerSession: number;
  }> {
    const totalResult = await this.db(this.tableName).count('* as count').first();
    const total = parseInt((totalResult?.['count'] as string) || '0', 10);

    // Count active sessions (updated within last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const activeResult = await this.db(this.tableName)
      .where('updated_at', '>', oneHourAgo)
      .count('* as count')
      .first();
    const active = parseInt((activeResult?.['count'] as string) || '0', 10);

    // Calculate average actions per session
    const sessions = await this.db(this.tableName).select('actions');
    const totalActions = sessions.reduce((sum, session) => {
      return sum + (session.actions ? session.actions.length : 0);
    }, 0);
    const avgActionsPerSession = total > 0 ? totalActions / total : 0;

    return { total, active, avgActionsPerSession };
  }
}