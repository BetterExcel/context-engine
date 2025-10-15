/**
 * Manual test script to verify CSV upload enhancements
 * Run with: npx ts-node src/test/csv-manual-test.ts
 */

import fs from 'fs';
import path from 'path';
import { SpreadsheetParser } from '../services/SpreadsheetParser';

async function testCSVEnhancements() {
  console.log('🧪 Testing CSV Upload Enhancements...\n');

  // Create test directory
  const testDir = path.join(__dirname, 'temp-csv-tests');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  try {
    // Test 1: Comma-delimited CSV
    console.log('1️⃣ Testing comma-delimited CSV...');
    const commaCSV = 'Name,Age,City,Salary\nJohn Doe,25,New York,50000\nJane Smith,30,Los Angeles,60000';
    const commaFile = path.join(testDir, 'comma.csv');
    fs.writeFileSync(commaFile, commaCSV);
    
    const commaResult = await SpreadsheetParser.parseFile(
      fs.readFileSync(commaFile),
      'comma.csv',
      'text/csv'
    );
    console.log('✅ Comma CSV parsed successfully');
    console.log(`   Rows: ${commaResult.sheets[0]?.dimensions.rows}, Cols: ${commaResult.sheets[0]?.dimensions.cols}`);
    console.log(`   First cell: ${commaResult.sheets[0]?.data[0]?.[0]?.value}\n`);

    // Test 2: Semicolon-delimited CSV
    console.log('2️⃣ Testing semicolon-delimited CSV...');
    const semicolonCSV = 'Name;Age;City;Salary\nJohn Doe;25;New York;50000\nJane Smith;30;Los Angeles;60000';
    const semicolonFile = path.join(testDir, 'semicolon.csv');
    fs.writeFileSync(semicolonFile, semicolonCSV);
    
    const semicolonResult = await SpreadsheetParser.parseFile(
      fs.readFileSync(semicolonFile),
      'semicolon.csv',
      'text/csv'
    );
    console.log('✅ Semicolon CSV parsed successfully');
    console.log(`   Rows: ${semicolonResult.sheets[0]?.dimensions.rows}, Cols: ${semicolonResult.sheets[0]?.dimensions.cols}`);
    console.log(`   First cell: ${semicolonResult.sheets[0]?.data[0]?.[0]?.value}\n`);

    // Test 3: Tab-delimited CSV
    console.log('3️⃣ Testing tab-delimited CSV...');
    const tabCSV = 'Name\tAge\tCity\tSalary\nJohn Doe\t25\tNew York\t50000\nJane Smith\t30\tLos Angeles\t60000';
    const tabFile = path.join(testDir, 'tab.csv');
    fs.writeFileSync(tabFile, tabCSV);
    
    const tabResult = await SpreadsheetParser.parseFile(
      fs.readFileSync(tabFile),
      'tab.csv',
      'text/csv'
    );
    console.log('✅ Tab CSV parsed successfully');
    console.log(`   Rows: ${tabResult.sheets[0]?.dimensions.rows}, Cols: ${tabResult.sheets[0]?.dimensions.cols}`);
    console.log(`   First cell: ${tabResult.sheets[0]?.data[0]?.[0]?.value}\n`);

    // Test 4: UTF-8 with special characters
    console.log('4️⃣ Testing UTF-8 CSV with special characters...');
    const utf8CSV = 'Name,City,Country\nJöhn Döe,München,Deutschland\nJané Smíth,Pärís,Frånce';
    const utf8File = path.join(testDir, 'utf8.csv');
    fs.writeFileSync(utf8File, utf8CSV, 'utf8');
    
    const utf8Result = await SpreadsheetParser.parseFile(
      fs.readFileSync(utf8File),
      'utf8.csv',
      'text/csv'
    );
    console.log('✅ UTF-8 CSV parsed successfully');
    console.log(`   Special chars: ${utf8Result.sheets[0]?.data[1]?.[0]?.value}, ${utf8Result.sheets[0]?.data[1]?.[1]?.value}\n`);

    // Test 5: Quoted fields with delimiters
    console.log('5️⃣ Testing CSV with quoted fields...');
    const quotedCSV = 'Name,Description,Price\n"John, Jr.","Premium Product",29.99\n"Jane Smith","Simple Product",19.99';
    const quotedFile = path.join(testDir, 'quoted.csv');
    fs.writeFileSync(quotedFile, quotedCSV);
    
    const quotedResult = await SpreadsheetParser.parseFile(
      fs.readFileSync(quotedFile),
      'quoted.csv',
      'text/csv'
    );
    console.log('✅ Quoted CSV parsed successfully');
    console.log(`   Quoted field: ${quotedResult.sheets[0]?.data[1]?.[0]?.value}\n`);

    // Test 6: MIME type support
    console.log('6️⃣ Testing MIME type support...');
    const mimeTypes = [
      'text/csv',
      'application/csv',
      'text/plain',
      'application/octet-stream'
    ];
    
    for (const mimeType of mimeTypes) {
      const isSupported = SpreadsheetParser.isFormatSupported(mimeType, 'test.csv');
      console.log(`   ${mimeType}: ${isSupported ? '✅ Supported' : '❌ Not supported'}`);
    }

    // Test 7: Error handling
    console.log('\n7️⃣ Testing error handling...');
    try {
      const emptyFile = path.join(testDir, 'empty.csv');
      fs.writeFileSync(emptyFile, '');
      
      await SpreadsheetParser.parseFile(
        fs.readFileSync(emptyFile),
        'empty.csv',
        'text/csv'
      );
      console.log('❌ Empty file should have thrown an error');
    } catch (error: any) {
      console.log(`✅ Empty file error handled: ${error.message}`);
    }

    console.log('\n🎉 All CSV enhancement tests completed successfully!');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    // Clean up test files
    if (fs.existsSync(testDir)) {
      const files = fs.readdirSync(testDir);
      files.forEach(file => {
        fs.unlinkSync(path.join(testDir, file));
      });
      fs.rmdirSync(testDir);
    }
  }
}

// Run the test
testCSVEnhancements().catch(console.error);