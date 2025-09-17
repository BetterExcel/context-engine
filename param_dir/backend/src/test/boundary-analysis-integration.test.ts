import * as XLSX from 'xlsx';
import { SpreadsheetParser } from '../services/SpreadsheetParser';

describe('Boundary Analysis Integration Test', () => {
  it('should include boundary analysis in parsed spreadsheet data', async () => {
    // Create test data
    const testData = [
      ['Product', 'Price', 'Category'],
      ['Laptop', 999.99, 'Electronics'],
      ['Book', 19.99, 'Education'],
      ['', '', ''], // Empty row
      ['Phone', 599.99, 'Electronics']
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(testData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // Parse using SpreadsheetParser (simulating upload route behavior)
    const result = await SpreadsheetParser.parseFile(
      buffer,
      'products.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    // Verify boundary analysis is included
    expect(result.boundaryAnalysis).toBeDefined();
    expect(result.recommendedSelection).toBeDefined();

    const boundaries = result.boundaryAnalysis!;
    
    // Verify boundary analysis results
    expect(boundaries.minRow).toBe(0);
    expect(boundaries.maxRow).toBe(4); // Last row with data
    expect(boundaries.minCol).toBe(0);
    expect(boundaries.maxCol).toBe(2);
    expect(boundaries.hasHeaders).toBe(true);
    expect(boundaries.totalCells).toBe(15); // 5 rows * 3 cols
    expect(boundaries.emptyCells).toBe(3); // Empty row has 3 empty cells

    // Verify recommended selection
    expect(result.recommendedSelection).toBe('A1:C5');

    // Verify the data structure is still intact
    expect(result.sheets).toHaveLength(1);
    expect(result.sheets[0]?.name).toBe('Products');
    expect(result.sheets[0]?.data[0]?.[0]?.value).toBe('Product');
    expect(result.sheets[0]?.data[1]?.[1]?.value).toBe(999.99);
  });

  it('should handle CSV files with boundary analysis', async () => {
    const csvData = `Name,Email,Department
Alice Johnson,alice@company.com,Engineering
Bob Smith,bob@company.com,Marketing
Carol Davis,carol@company.com,Sales`;

    const result = await SpreadsheetParser.parseFile(
      csvData,
      'employees.csv',
      'text/csv'
    );

    // Verify boundary analysis for CSV
    expect(result.boundaryAnalysis).toBeDefined();
    expect(result.recommendedSelection).toBeDefined();

    const boundaries = result.boundaryAnalysis!;
    expect(boundaries.minRow).toBe(0);
    expect(boundaries.maxRow).toBe(3);
    expect(boundaries.minCol).toBe(0);
    expect(boundaries.maxCol).toBe(2);
    expect(boundaries.totalCells).toBe(12); // 4 rows * 3 cols
    expect(boundaries.emptyCells).toBe(0);

    expect(result.recommendedSelection).toBe('A1:C4');
  });

  it('should provide fallback range for empty sheets', async () => {
    // Create an empty workbook
    const workbook = XLSX.utils.book_new();
    const emptySheet = XLSX.utils.aoa_to_sheet([]);
    XLSX.utils.book_append_sheet(workbook, emptySheet, 'Empty');
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    const result = await SpreadsheetParser.parseFile(
      buffer,
      'empty.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    expect(result.boundaryAnalysis).toBeDefined();
    expect(result.recommendedSelection).toBe('A1:J20'); // Fallback range

    const boundaries = result.boundaryAnalysis!;
    expect(boundaries.maxRow).toBe(-1); // No data found
    expect(boundaries.maxCol).toBe(-1);
  });

  it('should handle multiple sheets by analyzing the first sheet', async () => {
    const workbook = XLSX.utils.book_new();
    
    // First sheet - this should be analyzed
    const sheet1Data = [
      ['ID', 'Name'],
      [1, 'First Item'],
      [2, 'Second Item']
    ];
    const worksheet1 = XLSX.utils.aoa_to_sheet(sheet1Data);
    XLSX.utils.book_append_sheet(workbook, worksheet1, 'MainData');
    
    // Second sheet - this should be ignored for boundary analysis
    const sheet2Data = [
      ['A', 'B', 'C', 'D', 'E'],
      [1, 2, 3, 4, 5],
      [6, 7, 8, 9, 10],
      [11, 12, 13, 14, 15],
      [16, 17, 18, 19, 20]
    ];
    const worksheet2 = XLSX.utils.aoa_to_sheet(sheet2Data);
    XLSX.utils.book_append_sheet(workbook, worksheet2, 'ExtraData');
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    const result = await SpreadsheetParser.parseFile(
      buffer,
      'multi_sheet.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    // Should analyze first sheet only
    const boundaries = result.boundaryAnalysis!;
    expect(boundaries.maxRow).toBe(2); // First sheet has 3 rows (0-2)
    expect(boundaries.maxCol).toBe(1); // First sheet has 2 columns (0-1)
    expect(result.recommendedSelection).toBe('A1:B3');

    // Verify both sheets are still parsed
    expect(result.sheets).toHaveLength(2);
    expect(result.sheets[0]?.name).toBe('MainData');
    expect(result.sheets[1]?.name).toBe('ExtraData');
  });
});