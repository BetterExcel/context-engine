import { 
  ContextRepository, 
  SessionRepository, 
  FeedbackRepository, 
  SpreadsheetRepository 
} from '../repositories';
import { testConnection, closeConnection } from '../connection';

export class DatabaseService {
  public contexts: ContextRepository;
  public sessions: SessionRepository;
  public feedback: FeedbackRepository;
  public spreadsheets: SpreadsheetRepository;

  constructor() {
    this.contexts = new ContextRepository();
    this.sessions = new SessionRepository();
    this.feedback = new FeedbackRepository();
    this.spreadsheets = new SpreadsheetRepository();
  }

  async initialize(): Promise<boolean> {
    try {
      // Check if database is enabled
      if (process.env.DATABASE_ENABLED === 'false') {
        console.log('Database disabled in configuration, skipping initialization');
        return false;
      }

      // Check if DATABASE_URL is configured
      if (!process.env.DATABASE_URL) {
        console.log('DATABASE_URL not configured, skipping database initialization');
        return false;
      }

      const isConnected = await testConnection();
      if (!isConnected) {
        throw new Error('Failed to connect to database');
      }
      console.log('Database service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize database service:', error);
      return false;
    }
  }

  async shutdown(): Promise<void> {
    try {
      await closeConnection();
      console.log('Database service shut down successfully');
    } catch (error) {
      console.error('Error shutting down database service:', error);
    }
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: {
      connection: boolean;
      tables: Record<string, boolean>;
    };
  }> {
    try {
      const connection = await testConnection();
      
      const tables = {
        contexts: false,
        sessions: false,
        feedback: false,
        spreadsheets: false
      };

      // Check if each table exists and is accessible
      try {
        await this.contexts.count();
        tables.contexts = true;
      } catch (error) {
        console.warn('Contexts table check failed:', error);
      }

      try {
        await this.sessions.count();
        tables.sessions = true;
      } catch (error) {
        console.warn('Sessions table check failed:', error);
      }

      try {
        await this.feedback.count();
        tables.feedback = true;
      } catch (error) {
        console.warn('Feedback table check failed:', error);
      }

      try {
        await this.spreadsheets.count();
        tables.spreadsheets = true;
      } catch (error) {
        console.warn('Spreadsheets table check failed:', error);
      }

      const allTablesHealthy = Object.values(tables).every(status => status);
      const status = connection && allTablesHealthy ? 'healthy' : 'unhealthy';

      return {
        status,
        details: {
          connection,
          tables
        }
      };
    } catch (error) {
      console.error('Database health check failed:', error);
      return {
        status: 'unhealthy',
        details: {
          connection: false,
          tables: {
            contexts: false,
            sessions: false,
            feedback: false,
            spreadsheets: false
          }
        }
      };
    }
  }

  async getSystemStats(): Promise<{
    contexts: any;
    sessions: any;
    feedback: any;
    spreadsheets: any;
  }> {
    try {
      const [contextsStats, sessionsStats, feedbackStats, spreadsheetsStats] = await Promise.all([
        this.contexts.getContextStats(),
        this.sessions.getSessionStats(),
        this.feedback.getFeedbackStats(),
        this.spreadsheets.getStorageStats()
      ]);

      return {
        contexts: contextsStats,
        sessions: sessionsStats,
        feedback: feedbackStats,
        spreadsheets: spreadsheetsStats
      };
    } catch (error) {
      console.error('Failed to get system stats:', error);
      throw error;
    }
  }
}

// Create a singleton instance
export const databaseService = new DatabaseService();