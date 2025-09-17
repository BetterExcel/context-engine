import { databaseService } from '../services/DatabaseService';
import db from '../connection';

// Global test setup for database tests
beforeAll(async () => {
  // Set test environment
  process.env['NODE_ENV'] = 'test';
  
  // Initialize database service
  await databaseService.initialize();
  
  // Run migrations to ensure test database has the correct schema
  try {
    await db.migrate.latest();
    console.log('Test database migrations completed');
  } catch (error) {
    console.warn('Migration failed (this might be expected in some test environments):', error);
  }
});

afterAll(async () => {
  // Clean up database connection
  await databaseService.shutdown();
});

// Helper function to clean up test data
export const cleanupTestData = async () => {
  try {
    // Delete test data in reverse order of dependencies
    await db('feedback').del();
    await db('contexts').del();
    await db('sessions').del();
    await db('spreadsheets').del();
  } catch (error) {
    console.warn('Cleanup failed:', error);
  }
};

// Helper function to create test data
export const createTestData = {
  context: async (overrides: any = {}) => {
    const defaultData = {
      request_id: '123e4567-e89b-12d3-a456-426614174000',
      context_type: 'immediate',
      context_data: { test: 'data' },
      confidence_score: 0.95,
      ...overrides
    };
    
    const [result] = await db('contexts').insert(defaultData).returning('*');
    return result;
  },
  
  session: async (overrides: any = {}) => {
    const defaultData = {
      user_id: 'test_user',
      spreadsheet_id: '123e4567-e89b-12d3-a456-426614174001',
      actions: JSON.stringify([]),
      metadata: JSON.stringify({}),
      ...overrides
    };
    
    const [result] = await db('sessions').insert(defaultData).returning('*');
    return result;
  },
  
  feedback: async (overrides: any = {}) => {
    const defaultData = {
      request_id: '123e4567-e89b-12d3-a456-426614174002',
      predicted_context: JSON.stringify({ prediction: 'test' }),
      actual_context: JSON.stringify({ actual: 'test' }),
      user_satisfaction: 4,
      comments: 'Test feedback',
      metadata: JSON.stringify({}),
      ...overrides
    };
    
    const [result] = await db('feedback').insert(defaultData).returning('*');
    return result;
  },
  
  spreadsheet: async (overrides: any = {}) => {
    const defaultData = {
      filename: 'test.xlsx',
      original_name: 'test_original.xlsx',
      mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      file_size: 1024,
      file_path: '/uploads/test.xlsx',
      parsed_data: JSON.stringify({ sheets: [] }),
      metadata: JSON.stringify({}),
      ...overrides
    };
    
    const [result] = await db('spreadsheets').insert(defaultData).returning('*');
    return result;
  }
};