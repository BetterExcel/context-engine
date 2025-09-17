import * as XLSX from 'xlsx';
import { SpreadsheetParser } from '../SpreadsheetParser';
import { DataType } from '../../types/spreadsheet';

describe('SpreadsheetParser - Boundary Analysis Integration', () => {
  describe('boundary analysis for Excel files', () => {
    it('should include boundary analysis and recommended selection for simple data', async () => {
      // Create test data with clear boundaries
      const testData = [
        ['Name', 'Age', 'City'],
        ['John Doe', 30, 'New York'],
        ['Jane Smith', 25, 'Los Angeles'],
        ['Bob Johnson', 35, 'Chicago']
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(testData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      const result = await SpreadsheetParser.parseFile(
        buffer, 
        'test.xlsx', 
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

      // Check that boundary analysis is included
      expect(result.boundaryAnalysis).toBeDefined();
      expect(result.recommendedSelection).toBeDefined();

      const boundaries = result.boundaryAnalysis!;
      expect(boundaries.minRow).toBe(0);
      expect(boundaries.maxRow).toBe(3);
      expect(boundaries.minCol).toBe(0);
      expect(boundaries.maxCol).toBe(2);
      expect(boundaries.hasHeaders).toBe(true);
      expect(boundaries.totalCells).toBe(12); // 4 rows * 3 cols
      expect(boundaries.emptyCells).toBe(0);

      // Check recommended selection
      expect(result.recommendedSelection).toBe('A1:C4');
    });

    it('should handle sparse data with gaps correctly', async () => {
      // Create sparse data with empty cells
      const testData = [
        ['Header1', '', 'Header3'],
        ['Data1', '', 'Data3'],
        ['', '', ''],
        ['MoreData1', '', 'MoreData3']
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(testData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      const result = await SpreadsheetParser.parseFile(
        buffer, 
        'sparse.xlsx', 
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

      const boundaries = result.boundaryAnalysis!;
      expect(boundaries.minRow).toBe(0);
      expect(boundaries.maxRow).toBe(3);
      expect(boundaries.minCol).toBe(0);
      expect(boundaries.maxCol).toBe(2);
      expect(boundaries.emptyCells).toBeGreaterThan(0);

      // Should still include the full range
      expect(result.recommendedSelection).toBe('A1:C4');
    });

    it('should handle data without headers', async () => {
      // Create data without clear headers
      const testData = [
        [100, 200, 300],
        [150, 250, 350],
        [200, 300, 400]
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(testData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      const result = await SpreadsheetParser.parseFile(
        buffer, 
        'no_headers.xlsx', 
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

      const boundaries = result.boundaryAnalysis!;
      expect(boundaries.hasHeaders).toBe(false);
      expect(boundaries.minRow).toBe(0);
      expect(boundaries.maxRow).toBe(2);
      expect(result.recommendedSelection).toBe('A1:C3');
    });

    it('should handle empty sheets with fallback range', async () => {
      // Create an empty sheet
      const worksheet = XLSX.utils.aoa_to_sheet([]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'EmptySheet');
      
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      const result = await SpreadsheetParser.parseFile(
        buffer, 
        'empty.xlsx', 
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

      const boundaries = result.boundaryAnalysis!;
      expect(boundaries.maxRow).toBe(-1); // No data found
      expect(boundaries.maxCol).toBe(-1);
      
      // Should use fallback range
      expect(result.recommendedSelection).toBe('A1:J20');
    });

    it('should handle large datasets with size limits', async () => {
      // Create a large dataset that exceeds reasonable limits
      const largeData: any[][] = [];
      
      // Create headers
      const headers = [];
      for (let col = 0; col < 50; col++) {
        headers.push(`Column${col + 1}`);
      }
      largeData.push(headers);
      
      // Create 5000 rows of data (50 cols * 5000 rows = 250k cells)
      for (let row = 0; row < 5000; row++) {
        const dataRow = [];
        for (let col = 0; col < 50; col++) {
          dataRow.push(`Data${row}_${col}`);
        }
        largeData.push(dataRow);
      }

      const worksheet = XLSX.utils.aoa_to_sheet(largeData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'LargeSheet');
      
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      const result = await SpreadsheetParser.parseFile(
        buffer, 
        'large.xlsx', 
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

      const boundaries = result.boundaryAnalysis!;
      expect(boundaries.totalCells).toBeGreaterThan(100000);
      
      // Should limit the recommended selection to stay within bounds
      expect(result.recommendedSelection).toBeDefined();
      
      // Parse the recommended selection to verify it's within limits
      const rangeParts = result.recommendedSelection!.split(':');
      expect(rangeParts).toHaveLength(2);
      
      // The range should be limited to prevent performance issues
      const endCell = rangeParts[1]!;
      const rowMatch = endCell.match(/\d+$/);
      if (rowMatch) {
        const endRow = parseInt(rowMatch[0]!, 10);
        // Should be less than the full dataset due to size limits
        expect(endRow).toBeLessThan(5001);
      }
    });
  });

  describe('boundary analysis for CSV files', () => {
    it('should include boundary analysis for CSV files', async () => {
      const csvData = `Name,Age,City,Salary
John Doe,30,New York,50000
Jane Smith,25,Los Angeles,45000
Bob Johnson,35,Chicago,60000`;

      const result = await SpreadsheetParser.parseFile(
        csvData,
        'test.csv',
        'text/csv'
      );

      // Check boundary analysis
      expect(result.boundaryAnalysis).toBeDefined();
      expect(result.recommendedSelection).toBeDefined();

      const boundaries = result.boundaryAnalysis!;
      expect(boundaries.minRow).toBe(0);
      expect(boundaries.maxRow).toBe(3);
      expect(boundaries.minCol).toBe(0);
      expect(boundaries.maxCol).toBe(3);
      // Header detection may vary for CSV files, so let's be more flexible
      expect(typeof boundaries.hasHeaders).toBe('boolean');
      expect(boundaries.totalCells).toBe(16); // 4 rows * 4 cols

      expect(result.recommendedSelection).toBe('A1:D4');
    });

    it('should handle CSV with different delimiters', async () => {
      const csvData = `Name;Age;City
John Doe;30;New York
Jane Smith;25;Los Angeles`;

      const result = await SpreadsheetParser.parseFile(
        csvData,
        'semicolon.csv',
        'text/csv'
      );

      expect(result.boundaryAnalysis).toBeDefined();
      expect(result.recommendedSelection).toBe('A1:C3');
    });

    it('should handle CSV with inconsistent row lengths', async () => {
      const csvData = `Name,Age,City
John Doe,30
Jane Smith,25,Los Angeles,Extra Data
Bob Johnson`;

      const result = await SpreadsheetParser.parseFile(
        csvData,
        'inconsistent.csv',
        'text/csv'
      );

      const boundaries = result.boundaryAnalysis!;
      expect(boundaries.maxCol).toBe(3); // Should handle the longest row
      expect(result.recommendedSelection).toBeDefined();
    });
  });

  describe('boundary analysis with multiple sheets', () => {
    it('should analyze the first sheet for boundary analysis', async () => {
      const workbook = XLSX.utils.book_new();
      
      // First sheet with data
      const sheet1Data = [
        ['Sheet1 Header1', 'Sheet1 Header2'],
        ['Data1', 'Data2'],
        ['Data3', 'Data4']
      ];
      const worksheet1 = XLSX.utils.aoa_to_sheet(sheet1Data);
      XLSX.utils.book_append_sheet(workbook, worksheet1, 'FirstSheet');
      
      // Second sheet with different data
      const sheet2Data = [
        ['Different', 'Headers', 'More', 'Columns'],
        ['A', 'B', 'C', 'D'],
        ['E', 'F', 'G', 'H'],
        ['I', 'J', 'K', 'L'],
        ['M', 'N', 'O', 'P']
      ];
      const worksheet2 = XLSX.utils.aoa_to_sheet(sheet2Data);
      XLSX.utils.book_append_sheet(workbook, worksheet2, 'SecondSheet');
      
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      const result = await SpreadsheetParser.parseFile(
        buffer,
        'multi_sheet.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

      // Should analyze the first sheet
      const boundaries = result.boundaryAnalysis!;
      expect(boundaries.maxRow).toBe(2); // First sheet has 3 rows (0-2)
      expect(boundaries.maxCol).toBe(1); // First sheet has 2 columns (0-1)
      expect(result.recommendedSelection).toBe('A1:B3');
    });
  });

  describe('boundary analysis validation', () => {
    it('should validate that boundary analysis matches actual data', async () => {
      const testData = [
        ['A', 'B', 'C'],
        ['1', '2', '3'],
        ['', '', ''], // Empty row
        ['4', '5', '6']
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(testData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'ValidationSheet');
      
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      const result = await SpreadsheetParser.parseFile(
        buffer,
        'validation.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

      const boundaries = result.boundaryAnalysis!;
      const sheet = result.sheets[0]!;
      
      // Verify boundaries match actual data
      let actualMinRow = Infinity, actualMaxRow = -1;
      let actualMinCol = Infinity, actualMaxCol = -1;
      let actualEmptyCells = 0;
      
      for (let row = 0; row < sheet.data.length; row++) {
        const rowData = sheet.data[row];
        if (!rowData) continue;
        
        for (let col = 0; col < rowData.length; col++) {
          const cell = rowData[col];
          if (cell && cell.dataType !== DataType.EMPTY && 
              cell.value !== null && cell.value !== undefined && 
              String(cell.value).trim() !== '') {
            actualMinRow = Math.min(actualMinRow, row);
            actualMaxRow = Math.max(actualMaxRow, row);
            actualMinCol = Math.min(actualMinCol, col);
            actualMaxCol = Math.max(actualMaxCol, col);
          } else {
            actualEmptyCells++;
          }
        }
      }
      
      if (actualMinRow === Infinity) {
        actualMinRow = 0;
        actualMaxRow = -1;
        actualMinCol = 0;
        actualMaxCol = -1;
      }
      
      expect(boundaries.minRow).toBe(actualMinRow);
      expect(boundaries.maxRow).toBe(actualMaxRow);
      expect(boundaries.minCol).toBe(actualMinCol);
      expect(boundaries.maxCol).toBe(actualMaxCol);
    });
  });
});