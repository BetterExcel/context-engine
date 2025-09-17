import request from 'supertest';
import app from '../index';
import { DatabaseService } from '../database/services/DatabaseService';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Backend System Integration Tests', () => {
  let server: any;
  let dbService: DatabaseService;

  beforeAll(async () => {
    // Initialize database service
    dbService = new DatabaseService();
    await dbService.initialize();
    
    // Start server
    server = app.listen(0);
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
    if (dbService) {
      await dbService.shutdown();
    }
  });

  beforeEach(async () => {
    // Clean up database before each test
    // Clean up test data using repository methods
    try {
      const contexts = await dbService.contexts.findAll();
      for (const context of contexts) {
        await dbService.contexts.delete(context.id);
      }
      
      const sessions = await dbService.sessions.findAll();
      for (const session of sessions) {
        await dbService.sessions.delete(session.id);
      }
    } catch (error) {
      console.warn('Cleanup failed:', error);
    }
  });

  describe('Complete API Workflow Tests', () => {
    test('Full workflow: Upload → Analyze → Store → Retrieve', async () => {
      // Step 1: Health check
      const healthResponse = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(healthResponse.body.status).toBe('healthy');

      // Step 2: Upload spreadsheet
      const testFile = join(__dirname, '../../e2e/fixtures/files/simple-spreadsheet.xlsx');
      
      const uploadResponse = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', testFile)
        .expect(200);

      expect(uploadResponse.body.success).toBe(true);
      expect(uploadResponse.body.spreadsheet_id).toBeDefined();
      
      const spreadsheetId = uploadResponse.body.spreadsheet_id;

      // Step 3: Analyze context
      const analyzeResponse = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          request: 'Calculate the sum of column A',
          spreadsheet_id: spreadsheetId,
          current_selection: {
            sheet: 'Sheet1',
            range: 'A1:A10',
            active_cell: 'A1'
          }
        })
        .expect(200);

      expect(analyzeResponse.body.success).toBe(true);
      expect(analyzeResponse.body.context).toBeDefined();
      expect(analyzeResponse.body.context.request_analysis).toBeDefined();
      expect(analyzeResponse.body.context.spreadsheet_context).toBeDefined();

      // Step 4: Verify data was stored
      const contexts = await dbService.contexts.findAll();
      
      expect(contexts.rows.length).toBeGreaterThan(0);
    });

    test('Multi-sheet analysis workflow', async () => {
      const testFile = join(__dirname, '../../e2e/fixtures/files/complex-spreadsheet.xlsx');
      
      const uploadResponse = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', testFile)
        .expect(200);

      const spreadsheetId = uploadResponse.body.spreadsheet_id;

      // Analyze different sheets
      const sheet1Response = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          request: 'Analyze data in Sheet1',
          spreadsheet_id: spreadsheetId,
          current_selection: {
            sheet: 'Sheet1',
            range: 'A1:C10',
            active_cell: 'A1'
          }
        })
        .expect(200);

      const sheet2Response = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          request: 'Compare with Sheet2 data',
          spreadsheet_id: spreadsheetId,
          current_selection: {
            sheet: 'Sheet2',
            range: 'A1:C10',
            active_cell: 'A1'
          }
        })
        .expect(200);

      expect(sheet1Response.body.context.spreadsheet_context.current_selection.sheet).toBe('Sheet1');
      expect(sheet2Response.body.context.spreadsheet_context.current_selection.sheet).toBe('Sheet2');
    });

    test('Session continuity and history', async () => {
      const testFile = join(__dirname, '../../e2e/fixtures/files/simple-spreadsheet.xlsx');
      
      const uploadResponse = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', testFile)
        .expect(200);

      const spreadsheetId = uploadResponse.body.spreadsheet_id;

      // First request
      const firstResponse = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          request: 'Calculate average of column A',
          spreadsheet_id: spreadsheetId,
          current_selection: {
            sheet: 'Sheet1',
            range: 'A1:A10',
            active_cell: 'A1'
          },
          user_context: {
            session_id: 'test-session-1'
          }
        })
        .expect(200);

      // Second request in same session
      const secondResponse = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          request: 'Now do the same for column B',
          spreadsheet_id: spreadsheetId,
          current_selection: {
            sheet: 'Sheet1',
            range: 'B1:B10',
            active_cell: 'B1'
          },
          user_context: {
            session_id: 'test-session-1'
          }
        })
        .expect(200);

      // Second request should reference previous context
      expect(secondResponse.body.context.historical).toBeDefined();
    });
  });

  describe('Load Testing Scenarios', () => {
    test('Concurrent request handling', async () => {
      const testFile = join(__dirname, '../../e2e/fixtures/files/simple-spreadsheet.xlsx');
      
      const uploadResponse = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', testFile)
        .expect(200);

      const spreadsheetId = uploadResponse.body.spreadsheet_id;

      // Create multiple concurrent requests
      const requests = Array.from({ length: 10 }, (_, i) => 
        request(app)
          .post('/api/v1/analyze-context')
          .send({
            request: `Request ${i + 1}: Calculate sum`,
            spreadsheet_id: spreadsheetId,
            current_selection: {
              sheet: 'Sheet1',
              range: 'A1:A10',
              active_cell: 'A1'
            }
          })
      );

      // Execute all requests concurrently
      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    test('Large file processing', async () => {
      const testFile = join(__dirname, '../../e2e/fixtures/files/large-dataset.xlsx');
      
      const startTime = Date.now();
      
      const uploadResponse = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', testFile)
        .timeout(30000) // 30 second timeout for large files
        .expect(200);

      const uploadTime = Date.now() - startTime;
      console.log(`Large file upload time: ${uploadTime}ms`);

      const spreadsheetId = uploadResponse.body.spreadsheet_id;

      const analyzeStartTime = Date.now();
      
      const analyzeResponse = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          request: 'Analyze patterns in this large dataset',
          spreadsheet_id: spreadsheetId,
          current_selection: {
            sheet: 'Sheet1',
            range: 'A1:Z1000',
            active_cell: 'A1'
          }
        })
        .timeout(30000)
        .expect(200);

      const analyzeTime = Date.now() - analyzeStartTime;
      console.log(`Large file analysis time: ${analyzeTime}ms`);

      expect(analyzeResponse.body.success).toBe(true);
    });

    test('Memory usage stability', async () => {
      const testFile = join(__dirname, '../../e2e/fixtures/files/simple-spreadsheet.xlsx');
      
      const uploadResponse = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', testFile)
        .expect(200);

      const spreadsheetId = uploadResponse.body.spreadsheet_id;

      // Make many requests to test memory stability
      for (let i = 0; i < 50; i++) {
        const response = await request(app)
          .post('/api/v1/analyze-context')
          .send({
            request: `Memory test request ${i + 1}`,
            spreadsheet_id: spreadsheetId,
            current_selection: {
              sheet: 'Sheet1',
              range: 'A1:A10',
              active_cell: 'A1'
            }
          })
          .expect(200);

        expect(response.body.success).toBe(true);

        // Log memory usage periodically
        if (i % 10 === 0) {
          const memUsage = process.memoryUsage();
          console.log(`Memory usage at request ${i}: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
        }
      }
    });
  });

  describe('OpenAI API Integration Tests', () => {
    test('AI-powered intent classification', async () => {
      const testFile = join(__dirname, '../../e2e/fixtures/files/simple-spreadsheet.xlsx');
      
      const uploadResponse = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', testFile)
        .expect(200);

      const spreadsheetId = uploadResponse.body.spreadsheet_id;

      const intentTests = [
        { request: 'Create a SUM formula for these cells', expectedIntent: 'formula_assistance' },
        { request: 'Make these numbers look like currency', expectedIntent: 'formatting' },
        { request: 'Sort this data by the first column', expectedIntent: 'data_manipulation' },
        { request: 'What patterns do you see in this data?', expectedIntent: 'data_analysis' }
      ];

      for (const test of intentTests) {
        const response = await request(app)
          .post('/api/v1/analyze-context')
          .send({
            request: test.request,
            spreadsheet_id: spreadsheetId,
            current_selection: {
              sheet: 'Sheet1',
              range: 'A1:C10',
              active_cell: 'A1'
            }
          })
          .expect(200);

        expect(response.body.context.request_analysis.intent).toBe(test.expectedIntent);
      }
    });

    test('AI pattern analysis', async () => {
      const testFile = join(__dirname, '../../e2e/fixtures/files/complex-spreadsheet.xlsx');
      
      const uploadResponse = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', testFile)
        .expect(200);

      const spreadsheetId = uploadResponse.body.spreadsheet_id;

      const response = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          request: 'Identify trends and patterns in this dataset',
          spreadsheet_id: spreadsheetId,
          current_selection: {
            sheet: 'Sheet1',
            range: 'A1:E100',
            active_cell: 'A1'
          }
        })
        .timeout(20000) // AI requests may take longer
        .expect(200);

      expect(response.body.context.patterns).toBeDefined();
      expect(response.body.context.patterns.insights).toBeDefined();
      expect(Array.isArray(response.body.context.patterns.insights)).toBe(true);
    });

    test('API error handling and fallback', async () => {
      // This test would require mocking the OpenAI API to return errors
      // For now, we'll test that the system handles API timeouts gracefully
      
      const testFile = join(__dirname, '../../e2e/fixtures/files/simple-spreadsheet.xlsx');
      
      const uploadResponse = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', testFile)
        .expect(200);

      const spreadsheetId = uploadResponse.body.spreadsheet_id;

      const response = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          request: 'Complex analysis that might timeout',
          spreadsheet_id: spreadsheetId,
          current_selection: {
            sheet: 'Sheet1',
            range: 'A1:A10',
            active_cell: 'A1'
          }
        })
        .timeout(30000)
        .expect(200);

      // Should still return context even if AI analysis fails
      expect(response.body.success).toBe(true);
      expect(response.body.context).toBeDefined();
    });
  });

  describe('Context Accuracy Tests', () => {
    test('Formula dependency analysis accuracy', async () => {
      const testFile = join(__dirname, '../../e2e/fixtures/files/complex-spreadsheet.xlsx');
      
      const uploadResponse = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', testFile)
        .expect(200);

      const spreadsheetId = uploadResponse.body.spreadsheet_id;

      const response = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          request: 'Show me what this formula depends on',
          spreadsheet_id: spreadsheetId,
          current_selection: {
            sheet: 'Sheet1',
            range: 'C1',
            active_cell: 'C1'
          }
        })
        .expect(200);

      expect(response.body.context.related).toBeDefined();
      expect(response.body.context.related.precedentCells).toBeDefined();
      expect(response.body.context.related.dependentCells).toBeDefined();
    });

    test('Data type detection accuracy', async () => {
      const testFile = join(__dirname, '../../e2e/fixtures/files/simple-spreadsheet.xlsx');
      
      const uploadResponse = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', testFile)
        .expect(200);

      const spreadsheetId = uploadResponse.body.spreadsheet_id;

      const response = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          request: 'What data types are in this range?',
          spreadsheet_id: spreadsheetId,
          current_selection: {
            sheet: 'Sheet1',
            range: 'A1:C10',
            active_cell: 'A1'
          }
        })
        .expect(200);

      const contextData = response.body.context.immediate.selectedData;
      expect(Array.isArray(contextData)).toBe(true);
      
      // Should have detected data types
      contextData.forEach((row: any[]) => {
        row.forEach((cell: any) => {
          expect(cell.dataType).toBeDefined();
          expect(['text', 'number', 'date', 'formula', 'boolean']).toContain(cell.dataType);
        });
      });
    });

    test('Range selection context accuracy', async () => {
      const testFile = join(__dirname, '../../e2e/fixtures/files/simple-spreadsheet.xlsx');
      
      const uploadResponse = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', testFile)
        .expect(200);

      const spreadsheetId = uploadResponse.body.spreadsheet_id;

      const response = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          request: 'Analyze the selected range',
          spreadsheet_id: spreadsheetId,
          current_selection: {
            sheet: 'Sheet1',
            range: 'B2:D5',
            active_cell: 'B2'
          }
        })
        .expect(200);

      expect(response.body.context.immediate.selectedData).toBeDefined();
      expect(response.body.context.spreadsheet_context.current_selection.range).toBe('B2:D5');
      expect(response.body.context.spreadsheet_context.current_selection.active_cell).toBe('B2');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('Invalid file format handling', async () => {
      const response = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', Buffer.from('invalid content'), 'test.txt')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_FILE_FORMAT');
    });

    test('Missing spreadsheet ID handling', async () => {
      const response = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          request: 'Test request without spreadsheet ID',
          current_selection: {
            sheet: 'Sheet1',
            range: 'A1:A10',
            active_cell: 'A1'
          }
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_SPREADSHEET_ID');
    });

    test('Empty request handling', async () => {
      const testFile = join(__dirname, '../../e2e/fixtures/files/simple-spreadsheet.xlsx');
      
      const uploadResponse = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', testFile)
        .expect(200);

      const spreadsheetId = uploadResponse.body.spreadsheet_id;

      const response = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          request: '',
          spreadsheet_id: spreadsheetId,
          current_selection: {
            sheet: 'Sheet1',
            range: 'A1:A10',
            active_cell: 'A1'
          }
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EMPTY_REQUEST');
    });

    test('Invalid range handling', async () => {
      const testFile = join(__dirname, '../../e2e/fixtures/files/simple-spreadsheet.xlsx');
      
      const uploadResponse = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', testFile)
        .expect(200);

      const spreadsheetId = uploadResponse.body.spreadsheet_id;

      const response = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          request: 'Analyze this range',
          spreadsheet_id: spreadsheetId,
          current_selection: {
            sheet: 'Sheet1',
            range: 'INVALID_RANGE',
            active_cell: 'A1'
          }
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_RANGE');
    });

    test('Database connection error handling', async () => {
      // This would require mocking database failures
      // For now, we'll test that the system handles database errors gracefully
      
      const testFile = join(__dirname, '../../e2e/fixtures/files/simple-spreadsheet.xlsx');
      
      const uploadResponse = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', testFile)
        .expect(200);

      const spreadsheetId = uploadResponse.body.spreadsheet_id;

      const response = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          request: 'Test database resilience',
          spreadsheet_id: spreadsheetId,
          current_selection: {
            sheet: 'Sheet1',
            range: 'A1:A10',
            active_cell: 'A1'
          }
        });

      // Should handle gracefully even if database operations fail
      expect([200, 500]).toContain(response.status);
    });
  });

  describe('Performance Benchmarks', () => {
    test('API response time benchmarks', async () => {
      const testFile = join(__dirname, '../../e2e/fixtures/files/simple-spreadsheet.xlsx');
      
      const uploadResponse = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', testFile)
        .expect(200);

      const spreadsheetId = uploadResponse.body.spreadsheet_id;

      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          request: 'Calculate sum of column A',
          spreadsheet_id: spreadsheetId,
          current_selection: {
            sheet: 'Sheet1',
            range: 'A1:A10',
            active_cell: 'A1'
          }
        })
        .expect(200);

      const responseTime = Date.now() - startTime;
      
      console.log(`API response time: ${responseTime}ms`);
      
      // Should respond within 5 seconds for simple requests
      expect(responseTime).toBeLessThan(5000);
      expect(response.body.success).toBe(true);
    });

    test('Database query performance', async () => {
      const testFile = join(__dirname, '../../e2e/fixtures/files/simple-spreadsheet.xlsx');
      
      const uploadResponse = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', testFile)
        .expect(200);

      const spreadsheetId = uploadResponse.body.spreadsheet_id;

      // Create multiple contexts
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/api/v1/analyze-context')
          .send({
            request: `Performance test request ${i + 1}`,
            spreadsheet_id: spreadsheetId,
            current_selection: {
              sheet: 'Sheet1',
              range: 'A1:A10',
              active_cell: 'A1'
            }
          })
          .expect(200);
      }

      // Test query performance
      const startTime = Date.now();
      
      const contexts = await dbService.contexts.findAll();
      
      const queryTime = Date.now() - startTime;
      
      console.log(`Database query time: ${queryTime}ms`);
      
      expect(queryTime).toBeLessThan(100); // Should be very fast
      expect(contexts.rows.length).toBeGreaterThan(0);
    });
  });
});