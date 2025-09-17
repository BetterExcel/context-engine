import { 
  ContextRepository, 
  SessionRepository, 
  FeedbackRepository, 
  SpreadsheetRepository 
} from '../repositories';
import { 
  ContextType, 
  ActionType,
  CreateContext,
  CreateSession,
  CreateFeedback,
  CreateSpreadsheet
} from '../models';
import { closeConnection } from '../connection';
import { v4 as uuidv4 } from 'uuid';

describe('Database Repositories', () => {
  let contextRepo: ContextRepository;
  let sessionRepo: SessionRepository;
  let feedbackRepo: FeedbackRepository;
  let spreadsheetRepo: SpreadsheetRepository;

  beforeAll(async () => {
    contextRepo = new ContextRepository();
    sessionRepo = new SessionRepository();
    feedbackRepo = new FeedbackRepository();
    spreadsheetRepo = new SpreadsheetRepository();
  });

  afterAll(async () => {
    await closeConnection();
  });

  describe('ContextRepository', () => {
    let testRequestId: string;
    let createdContextId: string;

    beforeEach(() => {
      testRequestId = uuidv4();
    });

    afterEach(async () => {
      if (createdContextId) {
        await contextRepo.delete(createdContextId);
      }
    });

    it('should create and retrieve a context', async () => {
      const contextData: CreateContext = {
        request_id: testRequestId,
        context_type: ContextType.IMMEDIATE,
        context_data: { test: 'data' },
        confidence_score: 0.95
      };

      const created = await contextRepo.create(contextData);
      createdContextId = created.id!;

      expect(created).toBeDefined();
      expect(created.id).toBeDefined();
      expect(created.request_id).toBe(testRequestId);
      expect(created.context_type).toBe(ContextType.IMMEDIATE);
      expect(created.confidence_score).toBe(0.95);

      const retrieved = await contextRepo.findById(created.id!);
      expect(retrieved).toEqual(created);
    });

    it('should find contexts by request ID', async () => {
      const contextData: CreateContext = {
        request_id: testRequestId,
        context_type: ContextType.RELATED,
        context_data: { test: 'data' }
      };

      const created = await contextRepo.create(contextData);
      createdContextId = created.id!;

      const contexts = await contextRepo.findByRequestId(testRequestId);
      expect(contexts).toHaveLength(1);
      expect(contexts[0]?.request_id).toBe(testRequestId);
    });

    it('should find contexts by type', async () => {
      const contextData: CreateContext = {
        request_id: testRequestId,
        context_type: ContextType.PATTERNS,
        context_data: { patterns: ['trend1', 'trend2'] }
      };

      const created = await contextRepo.create(contextData);
      createdContextId = created.id!;

      const contexts = await contextRepo.findByContextType(ContextType.PATTERNS, 10);
      expect(contexts.length).toBeGreaterThan(0);
      expect(contexts.every(c => c.context_type === ContextType.PATTERNS)).toBe(true);
    });

    it('should get context statistics', async () => {
      const stats = await contextRepo.getContextStats();
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('byType');
      expect(stats).toHaveProperty('avgConfidence');
      expect(typeof stats.total).toBe('number');
      expect(typeof stats.avgConfidence).toBe('number');
    });
  });

  describe('SessionRepository', () => {
    let testUserId: string;
    let testSpreadsheetId: string;
    let createdSessionId: string;

    beforeEach(() => {
      testUserId = `user_${uuidv4()}`;
      testSpreadsheetId = uuidv4();
    });

    afterEach(async () => {
      if (createdSessionId) {
        await sessionRepo.delete(createdSessionId);
      }
    });

    it('should create and retrieve a session', async () => {
      const sessionData: CreateSession = {
        user_id: testUserId,
        spreadsheet_id: testSpreadsheetId,
        actions: [],
        metadata: { test: 'metadata' }
      };

      const created = await sessionRepo.create(sessionData);
      createdSessionId = created.id!;

      expect(created).toBeDefined();
      expect(created.id).toBeDefined();
      expect(created.user_id).toBe(testUserId);
      expect(created.spreadsheet_id).toBe(testSpreadsheetId);

      const retrieved = await sessionRepo.findById(created.id!);
      expect(retrieved).toEqual(created);
    });

    it('should find sessions by user ID', async () => {
      const sessionData: CreateSession = {
        user_id: testUserId,
        spreadsheet_id: testSpreadsheetId,
        actions: []
      };

      const created = await sessionRepo.create(sessionData);
      createdSessionId = created.id!;

      const sessions = await sessionRepo.findByUserId(testUserId);
      expect(sessions).toHaveLength(1);
      expect(sessions[0]?.user_id).toBe(testUserId);
    });

    it('should add actions to a session', async () => {
      const sessionData: CreateSession = {
        user_id: testUserId,
        actions: []
      };

      const created = await sessionRepo.create(sessionData);
      createdSessionId = created.id!;

      const action = {
        type: ActionType.CELL_SELECT,
        timestamp: new Date(),
        cell_reference: 'A1'
      };

      const updated = await sessionRepo.addAction(created.id!, action);
      expect(updated).toBeDefined();
      expect(updated!.actions).toHaveLength(1);
      expect(updated!.actions![0]?.type).toBe(ActionType.CELL_SELECT);
    });

    it('should get session statistics', async () => {
      const stats = await sessionRepo.getSessionStats();
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('active');
      expect(stats).toHaveProperty('avgActionsPerSession');
      expect(typeof stats.total).toBe('number');
      expect(typeof stats.active).toBe('number');
      expect(typeof stats.avgActionsPerSession).toBe('number');
    });
  });

  describe('FeedbackRepository', () => {
    let testRequestId: string;
    let createdFeedbackId: string;

    beforeEach(() => {
      testRequestId = uuidv4();
    });

    afterEach(async () => {
      if (createdFeedbackId) {
        await feedbackRepo.delete(createdFeedbackId);
      }
    });

    it('should create and retrieve feedback', async () => {
      const feedbackData: CreateFeedback = {
        request_id: testRequestId,
        predicted_context: { prediction: 'test' },
        actual_context: { actual: 'test' },
        user_satisfaction: 4,
        comments: 'Good prediction'
      };

      const created = await feedbackRepo.create(feedbackData);
      createdFeedbackId = created.id!;

      expect(created).toBeDefined();
      expect(created.id).toBeDefined();
      expect(created.request_id).toBe(testRequestId);
      expect(created.user_satisfaction).toBe(4);

      const retrieved = await feedbackRepo.findById(created.id!);
      expect(retrieved).toEqual(created);
    });

    it('should find feedback by satisfaction rating', async () => {
      const feedbackData: CreateFeedback = {
        request_id: testRequestId,
        predicted_context: { test: 'data' },
        user_satisfaction: 5
      };

      const created = await feedbackRepo.create(feedbackData);
      createdFeedbackId = created.id!;

      const feedback = await feedbackRepo.findBySatisfactionRating(5);
      expect(feedback.length).toBeGreaterThan(0);
      expect(feedback.every(f => f.user_satisfaction === 5)).toBe(true);
    });

    it('should get feedback statistics', async () => {
      const stats = await feedbackRepo.getFeedbackStats();
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('avgSatisfaction');
      expect(stats).toHaveProperty('satisfactionDistribution');
      expect(stats).toHaveProperty('withComments');
      expect(typeof stats.total).toBe('number');
      expect(typeof stats.avgSatisfaction).toBe('number');
      expect(typeof stats.withComments).toBe('number');
    });
  });

  describe('SpreadsheetRepository', () => {
    let createdSpreadsheetId: string;

    afterEach(async () => {
      if (createdSpreadsheetId) {
        await spreadsheetRepo.delete(createdSpreadsheetId);
      }
    });

    it('should create and retrieve a spreadsheet', async () => {
      const spreadsheetData: CreateSpreadsheet = {
        filename: 'test.xlsx',
        original_name: 'test_original.xlsx',
        mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        file_size: 1024,
        file_path: '/uploads/test.xlsx',
        parsed_data: { sheets: [] }
      };

      const created = await spreadsheetRepo.create(spreadsheetData);
      createdSpreadsheetId = created.id!;

      expect(created).toBeDefined();
      expect(created.id).toBeDefined();
      expect(created.filename).toBe('test.xlsx');
      expect(created.file_size).toBe(1024);

      const retrieved = await spreadsheetRepo.findById(created.id!);
      expect(retrieved).toEqual(created);
    });

    it('should find spreadsheet by filename', async () => {
      const filename = `test_${Date.now()}.xlsx`;
      const spreadsheetData: CreateSpreadsheet = {
        filename,
        original_name: 'test.xlsx',
        mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        file_size: 2048,
        file_path: `/uploads/${filename}`
      };

      const created = await spreadsheetRepo.create(spreadsheetData);
      createdSpreadsheetId = created.id!;

      const found = await spreadsheetRepo.findByFilename(filename);
      expect(found).toBeDefined();
      expect(found!.filename).toBe(filename);
    });

    it('should get storage statistics', async () => {
      const stats = await spreadsheetRepo.getStorageStats();
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('totalSize');
      expect(stats).toHaveProperty('avgSize');
      expect(stats).toHaveProperty('byMimeType');
      expect(typeof stats.total).toBe('number');
      expect(typeof stats.totalSize).toBe('number');
      expect(typeof stats.avgSize).toBe('number');
    });
  });
});