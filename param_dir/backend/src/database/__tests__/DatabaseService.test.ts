import { DatabaseService, databaseService } from '../services/DatabaseService';

// Mock the database connection
jest.mock('../connection', () => {
  const mockKnex = {
    raw: jest.fn().mockResolvedValue({ rows: [{ test: 1 }] }),
    select: jest.fn().mockImplementation((columns) => {
      if (columns === 'actions') {
        return Promise.resolve([{ actions: [] }, { actions: [{ type: 'test' }] }]);
      }
      return mockKnex;
    }),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue({ count: '0', avg_confidence: '0.8', avg_satisfaction: '4.0', total_size: '1024' }),
    count: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    del: jest.fn().mockResolvedValue(0),
    returning: jest.fn().mockResolvedValue([]),
    destroy: jest.fn().mockResolvedValue(undefined),
    avg: jest.fn().mockReturnThis(),
    sum: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockResolvedValue([
      { context_type: 'immediate', count: '5' },
      { user_satisfaction: 4, count: '3' },
      { mime_type: 'application/xlsx', count: '2', total_size: '2048' }
    ]),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    whereNotNull: jest.fn().mockReturnThis(),
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

describe('DatabaseService', () => {
  let service: DatabaseService;

  beforeAll(() => {
    service = new DatabaseService();
  });

  afterAll(async () => {
    await service.shutdown();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      const result = await service.initialize();
      expect(result).toBe(true);
    });

    it('should have all repository instances', () => {
      expect(service.contexts).toBeDefined();
      expect(service.sessions).toBeDefined();
      expect(service.feedback).toBeDefined();
      expect(service.spreadsheets).toBeDefined();
    });
  });

  describe('health check', () => {
    it('should perform a health check', async () => {
      const health = await service.healthCheck();
      
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('details');
      expect(health.details).toHaveProperty('connection');
      expect(health.details).toHaveProperty('tables');
      
      expect(['healthy', 'unhealthy']).toContain(health.status);
      expect(typeof health.details.connection).toBe('boolean');
      
      const tables = health.details.tables;
      expect(tables).toHaveProperty('contexts');
      expect(tables).toHaveProperty('sessions');
      expect(tables).toHaveProperty('feedback');
      expect(tables).toHaveProperty('spreadsheets');
    });
  });

  describe('system stats', () => {
    it('should get system statistics', async () => {
      const stats = await service.getSystemStats();
      
      expect(stats).toHaveProperty('contexts');
      expect(stats.sessions).toHaveProperty('total');
      expect(stats.feedback).toHaveProperty('total');
      expect(stats.spreadsheets).toHaveProperty('total');
    });
  });

  describe('singleton instance', () => {
    it('should provide a singleton database service', () => {
      expect(databaseService).toBeDefined();
      expect(databaseService).toBeInstanceOf(DatabaseService);
      expect(databaseService.contexts).toBeDefined();
      expect(databaseService.sessions).toBeDefined();
      expect(databaseService.feedback).toBeDefined();
      expect(databaseService.spreadsheets).toBeDefined();
    });
  });
});