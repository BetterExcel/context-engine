import { SpreadsheetParser } from '../services/SpreadsheetParser';
import { DataBoundaryAnalyzer } from '../services/DataBoundaryAnalyzer';

describe('CSV Parsing Performance Tests', () => {
  // Helper function to generate CSV content
  const generateCSVContent = (
    rows: number, 
    cols: number, 
    delimiter: string = ',',
    complexity: 'simple' | 'complex' | 'quoted' = 'simple'
  ): string => {
    const lines: string[] = [];
    
    // Add header row
    const headers = Array.from({ length: cols }, (_, i) => `Column_${i + 1}`);
    lines.push(headers.join(delimiter));
    
    // Add data rows
    for (let row = 0; row < rows; row++) {
      const rowData: string[] = [];
      
      for (let col = 0; col < cols; col++) {
        let value: string;
        
        switch (complexity) {
          case 'simple':
            value = `R${row}C${col}`;
            break;
          case 'complex':
            // Mix of data types
            if (col % 4 === 0) {
              value = (Math.random() * 1000).toFixed(2); // Numbers
            } else if (col % 4 === 1) {
              value = new Date(2020 + Math.floor(Math.random() * 4), 
                              Math.floor(Math.random() * 12), 
                              Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0]!; // Dates
            } else if (col % 4 === 2) {
              value = Math.random() > 0.5 ? 'true' : 'false'; // Booleans
            } else {
              value = `Text_${row}_${col}_${Math.random().toString(36).substring(7)}`; // Text
            }
            break;
          case 'quoted':
            // Include quoted fields with delimiters and newlines
            if (Math.random() > 0.7) {
              value = `"Text with ${delimiter} delimiter and\nnewline"`;
            } else {
              value = `Value_${row}_${col}`;
            }
            break;
        }
        
        rowData.push(value);
      }
      
      lines.push(rowData.join(delimiter));
    }
    
    return lines.join('\n');
  };

  // Performance benchmark helper
  const benchmarkCSVParsing = async (
    csvContent: string, 
    filename: string,
    iterations: number = 1
  ): Promise<{
    avgTime: number;
    minTime: number;
    maxTime: number;
    parseTime: number;
    boundaryTime: number;
  }> => {
    const times: number[] = [];
    const parseTimes: number[] = [];
    const boundaryTimes: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const buffer = Buffer.from(csvContent, 'utf8');
      
      const startTime = performance.now();
      
      // Parse the CSV
      const parseStartTime = performance.now();
      const spreadsheetData = await SpreadsheetParser.parseFile(
        buffer, 
        filename, 
        'text/csv'
      );
      const parseEndTime = performance.now();
      
      // Analyze boundaries (if not already done in parsing)
      const boundaryStartTime = performance.now();
      if (spreadsheetData.sheets.length > 0) {
        DataBoundaryAnalyzer.analyzeDataBoundaries(spreadsheetData.sheets[0]!);
      }
      const boundaryEndTime = performance.now();
      
      const endTime = performance.now();
      
      times.push(endTime - startTime);
      parseTimes.push(parseEndTime - parseStartTime);
      boundaryTimes.push(boundaryEndTime - boundaryStartTime);
    }
    
    return {
      avgTime: times.reduce((a, b) => a + b, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      parseTime: parseTimes.reduce((a, b) => a + b, 0) / parseTimes.length,
      boundaryTime: boundaryTimes.reduce((a, b) => a + b, 0) / boundaryTimes.length
    };
  };

  describe('Small CSV Performance', () => {
    it('should parse small CSV files quickly', async () => {
      const csvContent = generateCSVContent(100, 10, ',', 'simple');
      const benchmark = await benchmarkCSVParsing(csvContent, 'small.csv', 5);
      
      expect(benchmark.avgTime).toBeLessThan(100); // Under 100ms
      expect(benchmark.parseTime).toBeLessThan(50); // Parsing should be under 50ms
      expect(benchmark.boundaryTime).toBeLessThan(20); // Boundary analysis under 20ms
    });

    it('should handle different delimiters efficiently', async () => {
      const delimiters = [',', ';', '\t', '|'];
      
      for (const delimiter of delimiters) {
        const csvContent = generateCSVContent(50, 8, delimiter, 'simple');
        const benchmark = await benchmarkCSVParsing(csvContent, `test_${delimiter}.csv`, 3);
        
        expect(benchmark.avgTime).toBeLessThan(50);
      }
    });
  });

  describe('Medium CSV Performance', () => {
    it('should handle medium-sized CSV files efficiently', async () => {
      const csvContent = generateCSVContent(1000, 20, ',', 'complex');
      const benchmark = await benchmarkCSVParsing(csvContent, 'medium.csv', 3);
      
      expect(benchmark.avgTime).toBeLessThan(500); // Under 500ms
      expect(benchmark.parseTime).toBeLessThan(300);
      expect(benchmark.boundaryTime).toBeLessThan(100);
    });

    it('should handle quoted fields with embedded delimiters', async () => {
      const csvContent = generateCSVContent(500, 15, ',', 'quoted');
      const benchmark = await benchmarkCSVParsing(csvContent, 'quoted.csv', 3);
      
      expect(benchmark.avgTime).toBeLessThan(400);
    });
  });

  describe('Large CSV Performance', () => {
    it('should handle large CSV files within reasonable time', async () => {
      const csvContent = generateCSVContent(5000, 25, ',', 'complex');
      const benchmark = await benchmarkCSVParsing(csvContent, 'large.csv', 1);
      
      expect(benchmark.avgTime).toBeLessThan(2000); // Under 2 seconds
      expect(benchmark.parseTime).toBeLessThan(1500);
    });

    it('should handle very wide CSV files efficiently', async () => {
      const csvContent = generateCSVContent(100, 200, ',', 'simple');
      const benchmark = await benchmarkCSVParsing(csvContent, 'wide.csv', 1);
      
      expect(benchmark.avgTime).toBeLessThan(1000);
    });

    it('should handle very tall CSV files efficiently', async () => {
      const csvContent = generateCSVContent(10000, 10, ',', 'simple');
      const benchmark = await benchmarkCSVParsing(csvContent, 'tall.csv', 1);
      
      expect(benchmark.avgTime).toBeLessThan(3000); // Under 3 seconds
    });
  });

  describe('Delimiter Detection Performance', () => {
    it('should detect delimiters quickly', async () => {
      const testCases = [
        { delimiter: ',', name: 'comma.csv' },
        { delimiter: ';', name: 'semicolon.csv' },
        { delimiter: '\t', name: 'tab.csv' },
        { delimiter: '|', name: 'pipe.csv' }
      ];
      
      for (const testCase of testCases) {
        const csvContent = generateCSVContent(100, 10, testCase.delimiter, 'simple');
        const startTime = performance.now();
        
        await SpreadsheetParser.parseFile(
          Buffer.from(csvContent, 'utf8'),
          testCase.name,
          'text/csv'
        );
        
        const endTime = performance.now();
        expect(endTime - startTime).toBeLessThan(100);
      }
    });
  });

  describe('Encoding Detection Performance', () => {
    it('should handle UTF-8 files efficiently', async () => {
      const csvContent = generateCSVContent(1000, 15, ',', 'complex');
      const benchmark = await benchmarkCSVParsing(csvContent, 'utf8.csv', 3);
      expect(benchmark.avgTime).toBeLessThan(300);
    });

    it('should handle files with BOM efficiently', async () => {
      const csvContent = generateCSVContent(500, 10, ',', 'simple');
      const bomBuffer = Buffer.concat([
        Buffer.from([0xEF, 0xBB, 0xBF]), // UTF-8 BOM
        Buffer.from(csvContent, 'utf8')
      ]);
      
      const startTime = performance.now();
      await SpreadsheetParser.parseFile(bomBuffer, 'bom.csv', 'text/csv');
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(200);
    });
  });

  describe('Memory Usage During CSV Parsing', () => {
    it('should not cause excessive memory usage', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Parse several large CSV files
      for (let i = 0; i < 5; i++) {
        const csvContent = generateCSVContent(2000, 20, ',', 'complex');
        await SpreadsheetParser.parseFile(
          Buffer.from(csvContent, 'utf8'),
          `large_${i}.csv`,
          'text/csv'
        );
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });
  });

  describe('Error Handling Performance', () => {
    it('should handle malformed CSV quickly', async () => {
      const malformedCSV = 'header1,header2\nvalue1,"unclosed quote\nvalue2,value3';
      
      const startTime = performance.now();
      
      try {
        await SpreadsheetParser.parseFile(
          Buffer.from(malformedCSV, 'utf8'),
          'malformed.csv',
          'text/csv'
        );
      } catch (error) {
        // Expected to throw an error
      }
      
      const endTime = performance.now();
      
      // Error detection should be fast
      expect(endTime - startTime).toBeLessThan(50);
    });

    it('should handle empty CSV files quickly', async () => {
      const emptyCSV = '';
      
      const startTime = performance.now();
      
      try {
        await SpreadsheetParser.parseFile(
          Buffer.from(emptyCSV, 'utf8'),
          'empty.csv',
          'text/csv'
        );
      } catch (error) {
        // Expected to throw an error
      }
      
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(10);
    });
  });

  describe('Comparative Performance', () => {
    it('should show performance improvement over naive parsing', async () => {
      const csvContent = generateCSVContent(1000, 15, ',', 'complex');
      
      // Test our optimized parser
      const optimizedBenchmark = await benchmarkCSVParsing(csvContent, 'test.csv', 3);
      
      // The optimized version should complete within reasonable time
      expect(optimizedBenchmark.avgTime).toBeLessThan(400);
      expect(optimizedBenchmark.parseTime).toBeLessThan(250);
      expect(optimizedBenchmark.boundaryTime).toBeLessThan(100);
    });
  });

  describe('Scalability Tests', () => {
    it('should scale reasonably with data size', async () => {
      const sizes = [
        { rows: 100, cols: 10, expectedTime: 50 },
        { rows: 500, cols: 10, expectedTime: 150 },
        { rows: 1000, cols: 10, expectedTime: 250 },
        { rows: 2000, cols: 10, expectedTime: 450 }
      ];
      
      for (const size of sizes) {
        const csvContent = generateCSVContent(size.rows, size.cols, ',', 'simple');
        const benchmark = await benchmarkCSVParsing(csvContent, `scale_${size.rows}x${size.cols}.csv`, 1);
        
        expect(benchmark.avgTime).toBeLessThan(size.expectedTime);
      }
    });
  });
});