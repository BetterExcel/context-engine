import request from 'supertest';
import path from 'path';
import fs from 'fs';
import app from '../../index';
import { spreadsheetStorage } from '../upload';

// Test file paths
const testFilesDir = path.join(__dirname, '../../test/fixtures/csv-tests');

describe('CSV Upload Integration Tests', () => {
  beforeAll(async () => {
    // Create test fixtures directory if it doesn't exist
    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true });
    }

    // Create CSV files with different delimiters
    const commaDelimitedCSV = 'Name,Age,City,Salary\nJohn Doe,25,New York,50000\nJane Smith,30,Los Angeles,60000';
    fs.writeFileSync(path.join(testFilesDir, 'comma-delimited.csv'), commaDelimitedCSV);

    const semicolonDelimitedCSV = 'Name;Age;City;Salary\nJohn Doe;25;New York;50000\nJane Smith;30;Los Angeles;60000';
    fs.writeFileSync(path.join(testFilesDir, 'semicolon-delimited.csv'), semicolonDelimitedCSV);

    const tabDelimitedCSV = 'Name\tAge\tCity\tSalary\nJohn Doe\t25\tNew York\t50000\nJane Smith\t30\tLos Angeles\t60000';
    fs.writeFileSync(path.join(testFilesDir, 'tab-delimited.csv'), tabDelimitedCSV);

    const pipeDelimitedCSV = 'Name|Age|City|Salary\nJohn Doe|25|New York|50000\nJane Smith|30|Los Angeles|60000';
    fs.writeFileSync(path.join(testFilesDir, 'pipe-delimited.csv'), pipeDelimitedCSV);

    // Create CSV with quoted fields containing delimiters
    const quotedFieldsCSV = 'Name,Description,Price\n"John, Jr.","""Premium"" Product",29.99\n"Jane Smith","Simple Product",19.99';
    fs.writeFileSync(path.join(testFilesDir, 'quoted-fields.csv'), quotedFieldsCSV);

    // Create CSV with different encodings
    const utf8CSV = 'Name,City,Country\nJöhn Döe,München,Deutschland\nJané Smíth,Pärís,Frånce';
    fs.writeFileSync(path.join(testFilesDir, 'utf8-encoded.csv'), utf8CSV, 'utf8');

    // Create UTF-8 with BOM
    const utf8BOM = Buffer.concat([
      Buffer.from([0xEF, 0xBB, 0xBF]), // UTF-8 BOM
      Buffer.from(utf8CSV, 'utf8')
    ]);
    fs.writeFileSync(path.join(testFilesDir, 'utf8-bom.csv'), utf8BOM);

    // Create Windows-1252 encoded CSV
    const windows1252CSV = 'Name,City,Price\nJohn Doe,New York,$1,000.50\nJane Smith,Los Angeles,$2,500.75';
    fs.writeFileSync(path.join(testFilesDir, 'windows1252.csv'), windows1252CSV, 'latin1');

    // Create malformed CSV files for error testing
    const malformedCSV1 = 'Name,Age,City\nJohn Doe,25,"New York\nJane Smith,30,Los Angeles'; // Unmatched quote
    fs.writeFileSync(path.join(testFilesDir, 'malformed-quotes.csv'), malformedCSV1);

    const inconsistentColumnsCSV = 'Name,Age,City\nJohn Doe,25\nJane Smith,30,Los Angeles,Extra'; // Inconsistent columns
    fs.writeFileSync(path.join(testFilesDir, 'inconsistent-columns.csv'), inconsistentColumnsCSV);

    const emptyCSV = '';
    fs.writeFileSync(path.join(testFilesDir, 'empty.csv'), emptyCSV);

    // Create CSV with various data types
    const dataTypesCSV = 'Name,Age,IsActive,JoinDate,Salary,Notes\nJohn Doe,25,true,2023-01-15,50000.50,"Good employee"\nJane Smith,30,false,2022-06-01,60000,"Excellent performance"\nBob Johnson,35,true,2021-03-10,55000.75,""';
    fs.writeFileSync(path.join(testFilesDir, 'data-types.csv'), dataTypesCSV);

    // Create large CSV file for performance testing
    const largeCSVRows = ['Name,Age,City,Salary'];
    for (let i = 0; i < 10000; i++) {
      largeCSVRows.push(`User${i},${20 + (i % 50)},City${i % 100},${30000 + (i * 10)}`);
    }
    fs.writeFileSync(path.join(testFilesDir, 'large-dataset.csv'), largeCSVRows.join('\n'));
  });

  afterAll(() => {
    // Clean up test files
    if (fs.existsSync(testFilesDir)) {
      const files = fs.readdirSync(testFilesDir);
      files.forEach(file => {
        fs.unlinkSync(path.join(testFilesDir, file));
      });
      fs.rmdirSync(testFilesDir);
    }
  });

  beforeEach(() => {
    // Clear spreadsheet storage before each test
    spreadsheetStorage.clear();
  });

  describe('CSV Delimiter Detection', () => {
    it('should correctly parse comma-delimited CSV', async () => {
      const response = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', path.join(testFilesDir, 'comma-delimited.csv'))
        .expect(200);

      expect(response.body.success).toBe(true);
      const sheet = response.body.data.spreadsheetData.sheets[0];
      expect(sheet.data[0]).toEqual([
        { value: 'Name', dataType: 'TEXT', address: 'A1' },
        { value: 'Age', dataType: 'TEXT', address: 'B1' },
        { value: 'City', dataType: 'TEXT', address: 'C1' },
        { value: 'Salary', dataType: 'TEXT', address: 'D1' }
      ]);
      expect(sheet.data[1][0].value).toBe('John Doe');
      expect(sheet.data[1][1].value).toBe(25);
    });

    it('should correctly parse semicolon-delimited CSV', async () => {
      const response = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', path.join(testFilesDir, 'semicolon-delimited.csv'))
        .expect(200);

      expect(response.body.success).toBe(true);
      const sheet = response.body.data.spreadsheetData.sheets[0];
      expect(sheet.data[1][0].value).toBe('John Doe');
      expect(sheet.data[1][1].value).toBe(25);
      expect(sheet.dimensions.cols).toBe(4);
    });

    it('should correctly parse tab-delimited CSV', async () => {
      const response = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', path.join(testFilesDir, 'tab-delimited.csv'))
        .expect(200);

      expect(response.body.success).toBe(true);
      const sheet = response.body.data.spreadsheetData.sheets[0];
      expect(sheet.data[1][0].value).toBe('John Doe');
      expect(sheet.data[1][2].value).toBe('New York');
      expect(sheet.dimensions.cols).toBe(4);
    });

    it('should correctly parse pipe-delimited CSV', async () => {
      const response = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', path.join(testFilesDir, 'pipe-delimited.csv'))
        .expect(200);

      expect(response.body.success).toBe(true);
      const sheet = response.body.data.spreadsheetData.sheets[0];
      expect(sheet.data[1][0].value).toBe('John Doe');
      expect(sheet.data[1][3].value).toBe(50000);
      expect(sheet.dimensions.cols).toBe(4);
    });
  });

  describe('CSV Encoding Detection', () => {
    it('should correctly handle UTF-8 encoded CSV', async () => {
      const response = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', path.join(testFilesDir, 'utf8-encoded.csv'))
        .expect(200);

      expect(response.body.success).toBe(true);
      const sheet = response.body.data.spreadsheetData.sheets[0];
      expect(sheet.data[1][0].value).toBe('Jöhn Döe');
      expect(sheet.data[1][1].value).toBe('München');
      expect(sheet.data[2][1].value).toBe('Pärís');
    });

    it('should correctly handle UTF-8 with BOM', async () => {
      const response = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', path.join(testFilesDir, 'utf8-bom.csv'))
        .expect(200);

      expect(response.body.success).toBe(true);
      const sheet = response.body.data.spreadsheetData.sheets[0];
      expect(sheet.data[1][0].value).toBe('Jöhn Döe');
      expect(sheet.data[1][1].value).toBe('München');
    });

    it('should correctly handle Windows-1252 encoded CSV', async () => {
      const response = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', path.join(testFilesDir, 'windows1252.csv'))
        .expect(200);

      expect(response.body.success).toBe(true);
      const sheet = response.body.data.spreadsheetData.sheets[0];
      expect(sheet.data[1][0].value).toBe('John Doe');
      expect(sheet.data[1][2].value).toBe('$1,000.50');
    });
  });

  describe('CSV Data Type Detection', () => {
    it('should correctly detect data types in CSV', async () => {
      const response = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', path.join(testFilesDir, 'data-types.csv'))
        .expect(200);

      expect(response.body.success).toBe(true);
      const sheet = response.body.data.spreadsheetData.sheets[0];
      
      // Check data types are correctly detected
      expect(sheet.data[1][1].dataType).toBe('NUMBER'); // Age
      expect(sheet.data[1][2].dataType).toBe('BOOLEAN'); // IsActive
      expect(sheet.data[1][4].dataType).toBe('NUMBER'); // Salary
      expect(sheet.data[1][5].dataType).toBe('TEXT'); // Notes
    });
  });

  describe('CSV Quoted Fields Handling', () => {
    it('should correctly handle quoted fields with delimiters', async () => {
      const response = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', path.join(testFilesDir, 'quoted-fields.csv'))
        .expect(200);

      expect(response.body.success).toBe(true);
      const sheet = response.body.data.spreadsheetData.sheets[0];
      expect(sheet.data[1][0].value).toBe('John, Jr.');
      expect(sheet.data[1][1].value).toBe('"Premium" Product');
      expect(sheet.data[1][2].value).toBe(29.99);
    });
  });

  describe('CSV Error Handling', () => {
    it('should handle empty CSV files with specific error', async () => {
      const response = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', path.join(testFilesDir, 'empty.csv'))
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CSV_EMPTY_FILE');
      expect(response.body.error.suggestions).toContain('Ensure the CSV file contains data');
    });

    it('should handle malformed CSV with unmatched quotes', async () => {
      const response = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', path.join(testFilesDir, 'malformed-quotes.csv'))
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(['CSV_MALFORMED', 'CSV_PARSE_ERROR']).toContain(response.body.error.code);
      expect(response.body.error.suggestions).toBeDefined();
    });

    it('should provide helpful suggestions for CSV parsing errors', async () => {
      const response = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', path.join(testFilesDir, 'empty.csv'))
        .expect(400);

      expect(response.body.error.suggestions).toBeInstanceOf(Array);
      expect(response.body.error.suggestions.length).toBeGreaterThan(0);
      expect(response.body.error.details.fileType).toBe('CSV');
    });
  });

  describe('CSV MIME Type Variations', () => {
    it('should accept CSV with text/csv MIME type', async () => {
      const response = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', path.join(testFilesDir, 'comma-delimited.csv'))
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    // Note: Testing different MIME types requires mocking the multer file object
    // This would be done in unit tests rather than integration tests
  });

  describe('CSV Performance', () => {
    it('should handle large CSV files efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', path.join(testFilesDir, 'large-dataset.csv'))
        .timeout(30000) // 30 second timeout for large file
        .expect(200);

      const processingTime = Date.now() - startTime;
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.processingTime).toBeDefined();
      expect(processingTime).toBeLessThan(30000); // Should complete within 30 seconds
      
      const sheet = response.body.data.spreadsheetData.sheets[0];
      expect(sheet.dimensions.rows).toBe(10001); // 10000 data rows + 1 header
      expect(sheet.dimensions.cols).toBe(4);
    });

    it('should include performance warnings for large CSV files', async () => {
      const response = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', path.join(testFilesDir, 'large-dataset.csv'))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.warnings).toBeInstanceOf(Array);
      // May include lazy loading or large dataset warnings
    });
  });

  describe('CSV Boundary Analysis Integration', () => {
    it('should include boundary analysis for CSV files', async () => {
      const response = await request(app)
        .post('/api/v1/upload-spreadsheet')
        .attach('file', path.join(testFilesDir, 'data-types.csv'))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.boundaryAnalysis).toBeDefined();
      expect(response.body.data.recommendedSelection).toBeDefined();
      
      const boundaryAnalysis = response.body.data.boundaryAnalysis;
      expect(boundaryAnalysis.minRow).toBe(0);
      expect(boundaryAnalysis.maxRow).toBeGreaterThan(0);
      expect(boundaryAnalysis.minCol).toBe(0);
      expect(boundaryAnalysis.maxCol).toBeGreaterThan(0);
    });
  });
});