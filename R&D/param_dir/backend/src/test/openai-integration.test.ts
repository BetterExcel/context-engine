import { OpenAIService } from '../services/OpenAIService';
import { PatternAnalyzer } from '../services/PatternAnalyzer';
import { RequestAnalyzer } from '../services/RequestAnalyzer';
import { ContextFormatter } from '../services/ContextFormatter';

describe('OpenAI API Integration Tests', () => {
  let openAIService: OpenAIService;
  let patternAnalyzer: PatternAnalyzer;
  let requestAnalyzer: RequestAnalyzer;
  let contextFormatter: ContextFormatter;

  beforeAll(() => {
    openAIService = new OpenAIService({ apiKey: 'test-key' });
    patternAnalyzer = new PatternAnalyzer(openAIService);
    requestAnalyzer = new RequestAnalyzer(openAIService);
    contextFormatter = new ContextFormatter(openAIService);
  });

  describe('Intent Classification Tests', () => {
    test('should correctly classify formula assistance requests', async () => {
      const testCases = [
        'Create a SUM formula for these cells',
        'Help me write a VLOOKUP formula',
        'Fix this formula error',
        'How do I calculate percentage?',
        'Make a formula to find the maximum value'
      ];

      for (const request of testCases) {
        const result = await requestAnalyzer.classifyIntent(request);
        expect(result.intent).toBe('formula_assistance');
        expect(result.confidence).toBeGreaterThan(0.7);
      }
    }, 30000);

    test('should correctly classify data analysis requests', async () => {
      const testCases = [
        'What trends do you see in this data?',
        'Analyze the patterns in sales figures',
        'Find correlations between these columns',
        'Identify outliers in the dataset',
        'Show me statistical insights'
      ];

      for (const request of testCases) {
        const result = await requestAnalyzer.classifyIntent(request);
        expect(result.intent).toBe('data_analysis');
        expect(result.confidence).toBeGreaterThan(0.7);
      }
    }, 30000);

    test('should correctly classify formatting requests', async () => {
      const testCases = [
        'Format these cells as currency',
        'Make the headers bold',
        'Apply conditional formatting',
        'Change the date format',
        'Color code the cells based on values'
      ];

      for (const request of testCases) {
        const result = await requestAnalyzer.classifyIntent(request);
        expect(result.intent).toBe('formatting');
        expect(result.confidence).toBeGreaterThan(0.7);
      }
    }, 30000);

    test('should correctly classify data manipulation requests', async () => {
      const testCases = [
        'Sort this data by date',
        'Filter rows where value > 100',
        'Remove duplicate entries',
        'Transpose this table',
        'Group data by category'
      ];

      for (const request of testCases) {
        const result = await requestAnalyzer.classifyIntent(request);
        expect(result.intent).toBe('data_manipulation');
        expect(result.confidence).toBeGreaterThan(0.7);
      }
    }, 30000);

    test('should handle ambiguous requests', async () => {
      const ambiguousRequests = [
        'Help me with this data',
        'Fix this',
        'Make it better',
        'What should I do?'
      ];

      for (const request of ambiguousRequests) {
        const result = await requestAnalyzer.classifyIntent(request);
        expect(result.confidence).toBeLessThan(0.8);
        // Note: clarificationQuestions is not part of IntentClassificationResult
        expect(result.reasoning).toBeDefined();
        expect(result.confidence).toBeGreaterThan(0);
      }
    }, 30000);
  });

  describe('Pattern Analysis Tests', () => {
    test('should identify trends in time series data', async () => {
      const timeSeriesData = [
        [{ value: '2023-01-01', dataType: 'date' }, { value: 100, dataType: 'number' }],
        [{ value: '2023-02-01', dataType: 'date' }, { value: 120, dataType: 'number' }],
        [{ value: '2023-03-01', dataType: 'date' }, { value: 140, dataType: 'number' }],
        [{ value: '2023-04-01', dataType: 'date' }, { value: 160, dataType: 'number' }],
        [{ value: '2023-05-01', dataType: 'date' }, { value: 180, dataType: 'number' }]
      ];

      const contextData = {
        immediate: {
          selectedData: timeSeriesData,
          activeCell: { value: 100, dataType: 'number' },
          visibleData: timeSeriesData,
          currentFormulas: [],
          selectionInfo: { sheet: 'Sheet1', range: 'A1:B5', activeCell: 'B3' }
        },
        related: {
          dependentCells: [],
          precedentCells: [],
          relatedFormulas: [],
          namedRanges: [],
          crossSheetReferences: []
        },
        structural: {
          headers: ['Date', 'Value'],
          dataTypes: ['date', 'number'],
          columnCount: 2,
          rowCount: 5,
          hasFormulas: false,
          hasNamedRanges: false,
          sheetStructure: { 
            hasHeaders: true,
            dataStartRow: 1,
            dataEndRow: 4,
            dataColumns: []
          }
        },
        historical: {
          recentActions: [],
          previousRequests: [],
          sessionDuration: 0,
          interactionCount: 0
        },
        patterns: {
          dataPatterns: [],
          relationships: [],
          anomalies: [],
          insights: [],
          confidence: 0.8
        },
        summary: {
          rowCount: 5,
          columnCount: 2,
          cellCount: 10,
          formulaCount: 0,
          emptyCount: 0,
          dataTypes: { date: 5, number: 5 },
          patterns: []
        },
        confidence: 0.8,
        generatedAt: new Date()
      };

      const result = await patternAnalyzer.analyzePatterns(contextData, {});
      
      expect(result.dataPatterns).toBeDefined();
      expect(result.dataPatterns.length).toBeGreaterThan(0);
      expect(result.insights).toBeDefined();
      expect(result.insights.some(insight => 
        insight.description.toLowerCase().includes('trend') || 
        insight.description.toLowerCase().includes('increasing')
      )).toBe(true);
    }, 30000);

    test('should identify anomalies in data', async () => {
      const dataWithAnomalies = [
        [{ value: 100, dataType: 'number' }],
        [{ value: 105, dataType: 'number' }],
        [{ value: 98, dataType: 'number' }],
        [{ value: 102, dataType: 'number' }],
        [{ value: 500, dataType: 'number' }], // Anomaly
        [{ value: 99, dataType: 'number' }],
        [{ value: 103, dataType: 'number' }]
      ];

      const contextData = {
        immediate: {
          selectedData: dataWithAnomalies,
          activeCell: { value: 100, dataType: 'number' },
          visibleData: dataWithAnomalies,
          currentFormulas: [],
          selectionInfo: { sheet: 'Sheet1', range: 'A1:A7', activeCell: 'A1' }
        },
        related: {
          dependentCells: [],
          precedentCells: [],
          relatedFormulas: [],
          namedRanges: [],
          crossSheetReferences: []
        },
        structural: {
          headers: ['Value'],
          dataTypes: ['number'],
          columnCount: 1,
          rowCount: 7,
          hasFormulas: false,
          hasNamedRanges: false,
          sheetStructure: { 
            hasHeaders: true,
            dataStartRow: 1,
            dataEndRow: 6,
            dataColumns: []
          }
        },
        historical: {
          recentActions: [],
          previousRequests: [],
          sessionDuration: 0,
          interactionCount: 0
        },
        patterns: {
          dataPatterns: [],
          relationships: [],
          anomalies: [],
          insights: [],
          confidence: 0.8
        },
        summary: {
          rowCount: 7,
          columnCount: 1,
          cellCount: 7,
          formulaCount: 0,
          emptyCount: 0,
          dataTypes: { number: 7 },
          patterns: []
        },
        confidence: 0.8,
        generatedAt: new Date()
      };

      const result = await patternAnalyzer.analyzePatterns(contextData, {});
      const anomalies = result.anomalies;
      
      expect(result).toBeDefined();
      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies.some(anomaly => anomaly.description.includes('500'))).toBe(true);
    }, 30000);

    test('should suggest relationships between columns', async () => {
      const relatedData = [
        [{ value: 'Product A', dataType: 'text' }, { value: 100, dataType: 'number' }, { value: 1000, dataType: 'number' }],
        [{ value: 'Product B', dataType: 'text' }, { value: 200, dataType: 'number' }, { value: 2000, dataType: 'number' }],
        [{ value: 'Product C', dataType: 'text' }, { value: 150, dataType: 'number' }, { value: 1500, dataType: 'number' }],
        [{ value: 'Product D', dataType: 'text' }, { value: 300, dataType: 'number' }, { value: 3000, dataType: 'number' }]
      ];

      const contextData = {
        immediate: {
          selectedData: relatedData,
          activeCell: { value: 'Product A', dataType: 'text' },
          visibleData: relatedData,
          currentFormulas: [],
          selectionInfo: { sheet: 'Sheet1', range: 'A1:C4', activeCell: 'A1' }
        },
        related: {
          dependentCells: [],
          precedentCells: [],
          relatedFormulas: [],
          namedRanges: [],
          crossSheetReferences: []
        },
        structural: {
          headers: ['Product', 'Quantity', 'Revenue'],
          dataTypes: ['text', 'number', 'number'],
          columnCount: 3,
          rowCount: 4,
          hasFormulas: false,
          hasNamedRanges: false,
          sheetStructure: { 
            hasHeaders: true,
            dataStartRow: 1,
            dataEndRow: 3,
            dataColumns: []
          }
        },
        historical: {
          recentActions: [],
          previousRequests: [],
          sessionDuration: 0,
          interactionCount: 0
        },
        patterns: {
          dataPatterns: [],
          relationships: [],
          anomalies: [],
          insights: [],
          confidence: 0.8
        },
        summary: {
          rowCount: 4,
          columnCount: 3,
          cellCount: 12,
          formulaCount: 0,
          emptyCount: 0,
          dataTypes: { text: 4, number: 8 },
          patterns: []
        },
        confidence: 0.8,
        generatedAt: new Date()
      };

      const result = await patternAnalyzer.analyzePatterns(contextData, {});
      const relationships = result.relationships;
      
      expect(result).toBeDefined();
      expect(relationships.length).toBeGreaterThan(0);
      expect(relationships.some(rel => 
        rel.description.toLowerCase().includes('correlation') ||
        rel.description.toLowerCase().includes('relationship')
      )).toBe(true);
    }, 30000);
  });

  describe('Context Formatting Tests', () => {
    test('should generate natural language descriptions', async () => {
      const contextData = {
        request_analysis: {
          intent: 'formula_assistance',
          scope: 'current_selection',
          confidence: 0.95
        },
        spreadsheet_context: {
          current_selection: {
            range: 'A1:C10',
            data: [
              [{ value: 'Name', dataType: 'text' }, { value: 'Age', dataType: 'text' }, { value: 'Salary', dataType: 'text' }],
              [{ value: 'John', dataType: 'text' }, { value: 25, dataType: 'number' }, { value: 50000, dataType: 'number' }],
              [{ value: 'Jane', dataType: 'text' }, { value: 30, dataType: 'number' }, { value: 60000, dataType: 'number' }]
            ],
            data_types: ['text', 'number', 'number']
          },
          related_formulas: [],
          dependencies: []
        },
        actionable_info: {
          target_cells: ['D1:D10'],
          suggested_operations: ['SUM', 'AVERAGE'],
          constraints: ['non_empty_cells_only']
        }
      };

      const requestAnalysis = { intent: 'data_analysis' as any, confidence: 0.8, reasoning: 'test' };
      const result = await contextFormatter.formatContext(contextData, requestAnalysis);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(50);
      expect(result.toLowerCase()).toContain('formula');
      expect(result).toContain('A1:C10');
    }, 30000);

    test('should format context for LLM consumption', async () => {
      const rawContext = {
        immediate: {
          selectedData: [
            [{ value: 'Product', dataType: 'text' }, { value: 'Sales', dataType: 'number' }],
            [{ value: 'A', dataType: 'text' }, { value: 100, dataType: 'number' }],
            [{ value: 'B', dataType: 'text' }, { value: 200, dataType: 'number' }]
          ],
          activeCell: { value: 'Product', dataType: 'text' },
          visibleData: [],
          currentFormulas: []
        },
        related: {
          dependentCells: [],
          precedentCells: [],
          relatedFormulas: [],
          namedRanges: []
        },
        structural: {
          headers: ['Product', 'Sales'],
          dataTypes: ['text', 'number'],
          sheetStructure: { rows: 3, cols: 2 }
        },
        historical: {
          recentActions: [],
          previousRequests: [],
          userPatterns: []
        }
      };

      const requestAnalysis = {
        intent: 'data_analysis',
        scope: 'current_selection',
        confidence: 0.9
      };

      const result = await contextFormatter.formatContext(rawContext, requestAnalysis);
      
      expect(result).toBeDefined();
      expect(result.structured).toBeDefined();
      expect(result.naturalLanguage).toBeDefined();
      expect(result.structured.request_analysis).toEqual(requestAnalysis);
      expect(result.structured.spreadsheet_context).toBeDefined();
    }, 30000);
  });

  describe('API Error Handling Tests', () => {
    test('should handle API rate limiting gracefully', async () => {
      // Make many requests quickly to potentially trigger rate limiting
      const requests = Array.from({ length: 20 }, (_, i) => 
        requestAnalyzer.classifyIntent(`Test request ${i}`)
      );

      const results = await Promise.allSettled(requests);
      
      // Some requests should succeed, system should handle failures gracefully
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      console.log(`Rate limiting test: ${successful} successful, ${failed} failed`);
      
      // At least some should succeed
      expect(successful).toBeGreaterThan(0);
      
      // Failed requests should have meaningful error messages
      results.forEach(result => {
        if (result.status === 'rejected') {
          expect(result.reason).toBeDefined();
        }
      });
    }, 60000);

    test('should fallback to rule-based analysis when API fails', async () => {
      // This test would require mocking the OpenAI service to fail
      // For now, we'll test that the system can handle API unavailability
      
      const mockOpenAIService = {
        async createChatCompletion() {
          throw new Error('API unavailable');
        }
      };

      const fallbackAnalyzer = new RequestAnalyzer(mockOpenAIService as any);
      
      // Should still return a result using rule-based analysis
      const result = await fallbackAnalyzer.classifyIntent('Create a SUM formula');
      
      expect(result).toBeDefined();
      expect(result.intent).toBeDefined();
      expect(result.confidence).toBeDefined();
      // Confidence should be lower for rule-based analysis
      expect(result.confidence).toBeLessThan(0.9);
    });

    test('should handle malformed API responses', async () => {
      // Test with various edge cases that might cause API issues
      const edgeCases = [
        '', // Empty string
        'a'.repeat(10000), // Very long string
        '🚀🎉💻📊', // Emojis only
        'SELECT * FROM users; DROP TABLE users;', // SQL injection attempt
        '<script>alert("xss")</script>', // XSS attempt
        null as any, // Null input
        undefined as any // Undefined input
      ];

      for (const testCase of edgeCases) {
        try {
          const result = await requestAnalyzer.classifyIntent(testCase);
          
          // Should return a valid result structure even for edge cases
          expect(result).toBeDefined();
          expect(result.intent).toBeDefined();
          expect(result.confidence).toBeDefined();
          expect(typeof result.confidence).toBe('number');
          expect(result.confidence).toBeGreaterThanOrEqual(0);
          expect(result.confidence).toBeLessThanOrEqual(1);
        } catch (error) {
          // If it throws, the error should be handled gracefully
          expect(error).toBeInstanceOf(Error);
          expect(error.message).toBeDefined();
        }
      }
    }, 60000);
  });

  describe('Performance and Reliability Tests', () => {
    test('should maintain consistent response times', async () => {
      const requests = Array.from({ length: 10 }, () => 
        'Calculate the average of column B'
      );

      const responseTimes: number[] = [];

      for (const request of requests) {
        const startTime = Date.now();
        await requestAnalyzer.classifyIntent(request);
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
      }

      const averageTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxTime = Math.max(...responseTimes);
      const minTime = Math.min(...responseTimes);

      console.log(`Response times - Avg: ${averageTime}ms, Min: ${minTime}ms, Max: ${maxTime}ms`);

      // Response times should be reasonable and consistent
      expect(averageTime).toBeLessThan(5000); // 5 seconds average
      expect(maxTime).toBeLessThan(10000); // 10 seconds max
      expect(maxTime - minTime).toBeLessThan(8000); // Reasonable variance
    }, 120000);

    test('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = Array.from({ length: 5 }, (_, i) => 
        requestAnalyzer.classifyIntent(`Concurrent request ${i + 1}: Analyze data patterns`)
      );

      const startTime = Date.now();
      const results = await Promise.all(concurrentRequests);
      const totalTime = Date.now() - startTime;

      console.log(`Concurrent requests completed in ${totalTime}ms`);

      // All requests should succeed
      expect(results.length).toBe(5);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.intent).toBeDefined();
      });

      // Should be faster than sequential execution
      expect(totalTime).toBeLessThan(15000); // 15 seconds for 5 concurrent requests
    }, 30000);

    test('should maintain accuracy under load', async () => {
      const testCases = [
        { request: 'Create a SUM formula', expectedIntent: 'formula_assistance' },
        { request: 'Format as currency', expectedIntent: 'formatting' },
        { request: 'Sort by date', expectedIntent: 'data_manipulation' },
        { request: 'Find trends', expectedIntent: 'data_analysis' }
      ];

      // Run each test case multiple times
      for (const testCase of testCases) {
        const results = await Promise.all(
          Array.from({ length: 5 }, () => 
            requestAnalyzer.classifyIntent(testCase.request)
          )
        );

        // All results should have the same intent classification
        results.forEach(result => {
          expect(result.intent).toBe(testCase.expectedIntent);
          expect(result.confidence).toBeGreaterThan(0.7);
        });
      }
    }, 60000);
  });

  describe('Integration with Other Services', () => {
    test('should work with pattern analyzer for complex analysis', async () => {
      const complexData = {
        immediate: {
          selectedData: [
            [{ value: 'Q1', dataType: 'text' }, { value: 1000, dataType: 'number' }, { value: 1200, dataType: 'number' }],
            [{ value: 'Q2', dataType: 'text' }, { value: 1100, dataType: 'number' }, { value: 1300, dataType: 'number' }],
            [{ value: 'Q3', dataType: 'text' }, { value: 1200, dataType: 'number' }, { value: 1400, dataType: 'number' }],
            [{ value: 'Q4', dataType: 'text' }, { value: 1300, dataType: 'number' }, { value: 1500, dataType: 'number' }]
          ],
          activeCell: { value: 'Q1', dataType: 'text' },
          visibleData: [],
          currentFormulas: []
        },
        related: {
          dependentCells: [],
          precedentCells: [],
          relatedFormulas: [],
          namedRanges: []
        },
        structural: {
          headers: ['Quarter', 'Revenue', 'Profit'],
          dataTypes: ['text', 'number', 'number'],
          sheetStructure: { rows: 4, cols: 3 }
        },
        historical: {
          recentActions: [],
          previousRequests: [],
          userPatterns: []
        }
      };

      // First classify the intent
      const intentResult = await requestAnalyzer.classifyIntent(
        'Analyze quarterly performance trends and suggest improvements'
      );

      expect(intentResult.intent).toBe('data_analysis');

      // Then analyze patterns
      const patternResult = await patternAnalyzer.analyzePatterns(complexData, {});

      expect(patternResult.dataPatterns).toBeDefined();
      expect(patternResult.insights).toBeDefined();

      // Finally format for LLM
      const formattedResult = await contextFormatter.formatContext(complexData, intentResult);

      expect(formattedResult.structured).toBeDefined();
      expect(formattedResult.naturalLanguage).toBeDefined();
      expect(formattedResult.naturalLanguage).toContain('quarterly');
    }, 45000);
  });
});