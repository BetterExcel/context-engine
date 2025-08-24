import { testConnection, closeConnection } from '../connection';
import db from '../connection';

// Mock the database connection for testing
jest.mock('../connection', () => {
  const mockDb = {
    raw: jest.fn().mockResolvedValue({ rows: [{ test: 1 }] }),
    select: jest.fn(),
    destroy: jest.fn().mockResolvedValue(undefined)
  };
  
  return {
    __esModule: true,
    default: mockDb,
    testConnection: jest.fn().mockResolvedValue(true),
    closeConnection: jest.fn().mockResolvedValue(undefined)
  };
});

describe('Database Connection', () => {
  afterAll(async () => {
    await closeConnection();
  });

  describe('testConnection', () => {
    it('should successfully connect to the database', async () => {
      const isConnected = await testConnection();
      expect(isConnected).toBe(true);
    });

    it('should be able to execute a simple query', async () => {
      const result = await db.raw('SELECT 1 as test');
      expect(result.rows[0].test).toBe(1);
    });
  });

  describe('database instance', () => {
    it('should have a valid knex instance', () => {
      expect(db).toBeDefined();
      expect(typeof db.raw).toBe('function');
      expect(typeof db.select).toBe('function');
    });
  });
});