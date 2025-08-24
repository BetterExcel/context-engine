/**
 * Example usage of SpreadsheetParser
 * This file demonstrates how to use the SpreadsheetParser to parse various spreadsheet formats
 */

import * as fs from 'fs';
import * as path from 'path';
import { SpreadsheetParser } from '../services/SpreadsheetParser';

async function demonstrateSpreadsheetParser() {
  console.log('🚀 SpreadsheetParser Demo\n');

  // Example 1: Parse CSV data
  console.log('📊 Example 1: Parsing CSV data');
  const csvData = `Name,Age,Department,Salary
John Doe,30,Engineering,75000
Jane Smith,25,Marketing,65000
Bob Johnson,35,Sales,70000
Alice Brown,28,Engineering,80000`;

  try {
    const csvResult = await SpreadsheetParser.parseFile(
      csvData,
      'employees.csv',
      'text/csv',
      { includeFormulas: true }
    );

    console.log(`✅ Successfully parsed CSV with ${csvResult.sheets.length} sheet(s)`);
    console.log(`   - Sheet: "${csvResult.sheets[0]?.name}"`);
    console.log(`   - Dimensions: ${csvResult.sheets[0]?.dimensions.rows} rows × ${csvResult.sheets[0]?.dimensions.cols} cols`);
    console.log(`   - Sample data: ${csvResult.sheets[0]?.data[1]?.[0]?.value} (${csvResult.sheets[0]?.data[1]?.[0]?.dataType})`);
    console.log('');
  } catch (error) {
    console.error('❌ CSV parsing failed:', error);
  }

  // Example 2: Create and parse Excel data with formulas
  console.log('📈 Example 2: Creating and parsing Excel data with formulas');
  
  // This would typically be done with actual Excel files, but for demo purposes
  // we'll show how the parser handles different data types
  const exampleData = [
    ['Product', 'Price', 'Quantity', 'Total', 'Date'],
    ['Laptop', 999.99, 5, { f: 'B2*C2' }, new Date('2023-01-15')],
    ['Mouse', 29.99, 10, { f: 'B3*C3' }, new Date('2023-01-16')],
    ['Keyboard', 79.99, 3, { f: 'B4*C4' }, new Date('2023-01-17')]
  ];

  // In a real scenario, you would read an actual Excel file:
  // const buffer = fs.readFileSync('path/to/your/file.xlsx');
  
  console.log('✅ Example data structure created');
  console.log('   - Contains formulas for calculating totals');
  console.log('   - Mixed data types: text, numbers, dates, formulas');
  console.log('');

  // Example 3: Demonstrate error handling
  console.log('⚠️  Example 3: Error handling');
  
  try {
    await SpreadsheetParser.parseFile(
      Buffer.from('invalid data'),
      'invalid.txt',
      'text/plain'
    );
  } catch (error) {
    console.log('✅ Correctly caught unsupported format error');
    console.log(`   - Error: ${error.message}`);
  }

  // Example 4: Show supported formats
  console.log('\n📋 Supported file formats:');
  const supportedFormats = SpreadsheetParser.getSupportedFormats();
  supportedFormats.forEach(format => {
    console.log(`   - ${format}`);
  });

  // Example 5: Format validation
  console.log('\n🔍 Format validation examples:');
  const testFiles = [
    { name: 'data.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    { name: 'data.csv', mime: 'text/csv' },
    { name: 'data.txt', mime: 'text/plain' },
    { name: 'unknown.xyz', mime: 'application/octet-stream' }
  ];

  testFiles.forEach(file => {
    const isSupported = SpreadsheetParser.isFormatSupported(file.mime, file.name);
    console.log(`   - ${file.name} (${file.mime}): ${isSupported ? '✅ Supported' : '❌ Not supported'}`);
  });

  console.log('\n🎉 SpreadsheetParser demo completed!');
}

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateSpreadsheetParser().catch(console.error);
}

export { demonstrateSpreadsheetParser };