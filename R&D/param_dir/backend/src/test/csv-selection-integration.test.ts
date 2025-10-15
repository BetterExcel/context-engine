import request from 'supertest';
import express from 'express';
import multer from 'multer';
import { SpreadsheetParser } from '../services/SpreadsheetParser';
import { DataBoundaryAnalyzer } from '../services/DataBoundaryAnalyzer';
import fs from 'fs';
import path from 'path';

// Mock Express app for testing
const createTestApp = () => {
  const app = express();
  const upload = multer({ storage: multer.memoryStorage() });

  app.post('/upload', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const result = await SpreadsheetParser.parseFile(req.file.buffer, req.file.originalname, req.file.mimetype);
      
      // Add boundary analysis and recommended selection
      const enrichedSheets = result.sheets.map(sheet => {
        const boundaries = DataBoundaryAnalyzer.analyzeDataBoundaries(sheet);
        const recommendedSelection = DataBoundaryAnalyzer.calculateOptimalRange(boundaries);
        
        return {
          ...sheet,
          boundaries,
          recommendedSelection
        };
      });

      res.json({
        ...result,
        sheets: enrichedSheets
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return app;
};

describe('CSV Selection Integration Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('End-to-End CSV Upload and Selection', () => {
    test('should upload CSV and return recommended selection', async () => {
      const csvPath = path.join(__dirname, '../../../e2e/fixtures/files/comma-delimited-utf8.csv');
      
      if (!fs.existsSync(csvPath)) {
        console.log('Skipping integration test - CSV file not found');
        return;
      }

      const response = await request(app)
        .post('/upload')
        .attach('file', csvPath)
        .expect(200);

      expect(response.body.sheets).toHaveLength(1);
      
      const sheet = response.body.sheets[0];
      expect(sheet.boundaries).toBeDefined();
      expect(sheet.recommendedSelection).toBeDefined();
      expect(sheet.recommendedSelection).toBe('A1:D6');
      
      // Verify boundary analysis
      expect(sheet.boundaries.minRow).toBe(0);
      expect(sheet.boundaries.maxRow).toBe(5);
      expect(sheet.boundaries.minCol).toBe(0);
      expect(sheet.boundaries.maxCol).toBe(3);
      expect(sheet.boundaries.hasHeaders).toBe(true);
    });

    test('should handle semicolon-delimited CSV with correct selection', async () => {
      const csvPath = path.join(__dirname, '../../../e2e/fixtures/files/semicolon-delimited-utf8.csv');
      
      if (!fs.existsSync(csvPath)) {
        console.log('Skipping semicolon CSV test - file not found');
        return;
      }

      const response = await request(app)
        .post('/upload')
        .attach('file', csvPath)
        .expect(200);

      const sheet = response.body.sheets[0];
      expect(sheet.recommendedSelection).toBe('A1:D6');
      expect(sheet.boundaries.hasHeaders).toBe(true);
    });

    test('should handle tab-delimited CSV with correct selection', async () => {
      const csvPath = path.join(__dirname, '../../../e2e/fixtures/files/tab-delimited-utf8.csv');
      
      if (!fs.existsSync(csvPath)) {
        console.log('Skipping tab CSV test - file not found');
        return;
      }

      const response = await request(app)
        .post('/upload')
        .attach('file', csvPath)
        .expect(200);

      const sheet = response.body.sheets[0];
      expect(sheet.recommendedSelection).toBe('A1:D6');
      expect(sheet.boundaries.hasHeaders).toBe(true);
    });

    test('should handle sparse data with intelligent selection', async () => {
      const csvPath = path.join(__dirname, '../../../e2e/fixtures/files/sparse-data.csv');
      
      if (!fs.existsSync(csvPath)) {
        console.log('Skipping sparse data test - file not found');
        return;
      }

      const response = await request(app)
        .post('/upload')
        .attach('file', csvPath)
        .expect(200);

      const sheet = response.body.sheets[0];
      expect(sheet.recommendedSelection).toMatch(/^A1:[A-Z]+\d+$/);
      expect(sheet.boundaries.minRow).toBe(0);
      expect(sheet.boundaries.maxCol).toBe(4); // 5 columns (0-4)
    });

    test('should handle headers-only CSV', async () => {
      const csvPath = path.join(__dirname, '../../../e2e/fixtures/files/headers-only.csv');
      
      if (!fs.existsSync(csvPath)) {
        console.log('Skipping headers-only test - file not found');
        return;
      }

      const response = await request(app)
        .post('/upload')
        .attach('file', csvPath)
        .expect(200);

      const sheet = response.body.sheets[0];
      expect(sheet.recommendedSelection).toBe('A1:E1');
      expect(sheet.boundaries.minRow).toBe(0);
      expect(sheet.boundaries.maxRow).toBe(0);
      expect(sheet.boundaries.hasHeaders).toBe(true);
    });

    test('should handle no-headers CSV', async () => {
      const csvPath = path.join(__dirname, '../../../e2e/fixtures/files/no-headers.csv');
      
      if (!fs.existsSync(csvPath)) {
        console.log('Skipping no-headers test - file not found');
        return;
      }

      const response = await request(app)
        .post('/upload')
        .attach('file', csvPath)
        .expect(200);

      const sheet = response.body.sheets[0];
      expect(sheet.recommendedSelection).toBe('A1:E4');
      expect(sheet.boundaries.hasHeaders).toBe(false);
    });
  });

  describe('Excel File Regression', () => {
    test('should still handle Excel files correctly', async () => {
      const excelPath = path.join(__dirname, '../../../e2e/fixtures/files/simple-spreadsheet.xlsx');
      
      if (!fs.existsSync(excelPath)) {
        console.log('Skipping Excel regression test - file not found');
        return;
      }

      const response = await request(app)
        .post('/upload')
        .attach('file', excelPath)
        .expect(200);

      expect(response.body.sheets).toHaveLength(1);
      
      const sheet = response.body.sheets[0];
      expect(sheet.boundaries).toBeDefined();
      expect(sheet.recommendedSelection).toBeDefined();
      expect(sheet.recommendedSelection).toMatch(/^[A-Z]+\d+:[A-Z]+\d+$/);
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed CSV gracefully', async () => {
      const malformedCSV = Buffer.from('Name,Age\nJohn,30\nJane,25,Extra,Field\nBob');
      
      const response = await request(app)
        .post('/upload')
        .attach('file', malformedCSV, 'malformed.csv')
        .expect(200); // Should still succeed but with warnings

      expect(response.body.sheets).toHaveLength(1);
      // Should parse what it can
      expect(response.body.sheets[0].data.length).toBeGreaterThan(0);
    });

    test('should handle empty CSV file', async () => {
      const emptyCSV = Buffer.from('');
      
      await request(app)
        .post('/upload')
        .attach('file', emptyCSV, 'empty.csv')
        .expect(500); // Should return error for empty file
    });

    test('should handle unsupported file types', async () => {
      const textFile = Buffer.from('This is just a text file');
      
      await request(app)
        .post('/upload')
        .attach('file', textFile, 'test.txt')
        .expect(500); // Should return error for unsupported type
    });
  });

  describe('Performance Integration', () => {
    test('should handle large CSV files efficiently', async () => {
      const largeCsvPath = path.join(__dirname, '../../../e2e/fixtures/files/large-performance-test.csv');
      
      if (!fs.existsSync(largeCsvPath)) {
        console.log('Skipping large file integration test - file not found');
        return;
      }

      const startTime = Date.now();
      
      const response = await request(app)
        .post('/upload')
        .attach('file', largeCsvPath)
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.body.sheets).toHaveLength(1);
      expect(response.body.sheets[0].boundaries).toBeDefined();
      expect(response.body.sheets[0].recommendedSelection).toBeDefined();
      
      // Should complete within reasonable time (30 seconds for large file)
      expect(duration).toBeLessThan(30000);
      
      console.log(`Large file integration test took ${duration}ms`);
    }, 35000); // 35 second timeout
  });

  describe('Data Consistency', () => {
    test('should produce consistent results for same data in different formats', async () => {
      const csvPath = path.join(__dirname, '../../../e2e/fixtures/files/simple-spreadsheet.csv');
      const excelPath = path.join(__dirname, '../../../e2e/fixtures/files/simple-spreadsheet.xlsx');
      
      if (!fs.existsSync(csvPath) || !fs.existsSync(excelPath)) {
        console.log('Skipping consistency test - files not found');
        return;
      }

      const csvResponse = await request(app)
        .post('/upload')
        .attach('file', csvPath)
        .expect(200);

      const excelResponse = await request(app)
        .post('/upload')
        .attach('file', excelPath)
        .expect(200);

      const csvBoundaries = csvResponse.body.sheets[0].boundaries;
      const excelBoundaries = excelResponse.body.sheets[0].boundaries;

      // Should have similar dimensions (allowing for minor differences)
      expect(Math.abs(csvBoundaries.maxRow - excelBoundaries.maxRow)).toBeLessThanOrEqual(1);
      expect(Math.abs(csvBoundaries.maxCol - excelBoundaries.maxCol)).toBeLessThanOrEqual(1);
    });
  });
});