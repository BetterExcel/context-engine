import { DatabaseService } from '../services/DatabaseService';
import { 
  ContextRepository, 
  SessionRepository, 
  FeedbackRepository, 
  SpreadsheetRepository 
} from '../repositories';

// Mock the database connection
jest.mock('../connection', () => {
  const mockKnex = {
    raw: jest.fn().mockResolvedValue({ rows: [{ test: 1 }] }),
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue({ count: '0' }),
    count: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    del: jest.fn().mockResolvedValue(0),
    returning: jest.fn().mockResolvedValue([]),
    destroy: jest.fn().mockResolvedValue(undefined),
    migrate: {
      latest: jest.fn().mockResolvedValue([])
    }
  };

  // Make it callable as a function
  const mockDb = jest.fn().mockReturnValue(mockKnex);
  Object.assign(mockDb, mockKnex);

  return {
    __esModule: true,
    default: mockDb,
    testConnection: jest.fn().mockResolvedValue(true),
    closeConnection: jest.fn().mockResolvedValue(undefined)
  };
});

describe('Database Integration', () => {
  let databaseService: DatabaseService;

  beforeAll(() => {
    databaseService = new DatabaseService();
  });

  describe('DatabaseService', () => {
    it('should initialize successfully', async () => {
      const result = await databaseService.initialize();
      expect(result).toBe(true);
    });

    it('should have all repository instances', () => {
      expect(databaseService.contexts).toBeInstanceOf(ContextRepository);
      expect(databaseService.sessions).toBeInstanceOf(SessionRepository);
      expect(databaseService.feedback).toBeInstanceOf(FeedbackRepository);
      expect(databaseService.spreadsheets).toBeInstanceOf(SpreadsheetRepository);
    });

    it('should perform health check', async () => {
      const health = await databaseService.healthCheck();
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('details');
      expect(['healthy', 'unhealthy']).toContain(health.status);
    });
  });

  describe('Repository Instantiation', () => {
    it('should create context repository', () => {
      const repo = new ContextRepository();
      expect(repo).toBeDefined();
      expect(typeof repo.create).toBe('function');
      expect(typeof repo.findById).toBe('function');
    });

    it('should create session repository', () => {
      const repo = new SessionRepository();
      expect(repo).toBeDefined();
      expect(typeof repo.create).toBe('function');
      expect(typeof repo.findByUserId).toBe('function');
    });

    it('should create feedback repository', () => {
      const repo = new FeedbackRepository();
      expect(repo).toBeDefined();
      expect(typeof repo.create).toBe('function');
      expect(typeof repo.findByRequestId).toBe('function');
    });

    it('should create spreadsheet repository', () => {
      const repo = new SpreadsheetRepository();
      expect(repo).toBeDefined();
      expect(typeof repo.create).toBe('function');
      expect(typeof repo.findByFilename).toBe('function');
    });
  });
});