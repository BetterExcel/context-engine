const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

// Create a test CSV file
const testCSV = `Name,Age,City,Salary
John Doe,30,New York,50000
Jane Smith,25,Los Angeles,45000
Bob Johnson,35,Chicago,55000
Alice Brown,28,Houston,48000
Charlie Wilson,32,Phoenix,52000`;

const csvFilePath = path.join(__dirname, 'test-data.csv');
fs.writeFileSync(csvFilePath, testCSV);

async function testUpload() {
  try {
    console.log('Testing CSV upload...');
    
    const form = new FormData();
    form.append('file', fs.createReadStream(csvFilePath), {
      filename: 'test-data.csv',
      contentType: 'text/csv'
    });

    const response = await fetch('http://localhost:3003/api/upload', {
      method: 'POST',
      body: form
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Upload successful!');
      console.log('Spreadsheet ID:', result.data?.id);
      console.log('Sheets:', result.data?.sheets?.length);
      console.log('Recommended selection:', result.data?.recommendedSelection);
      
      // Test boundary analysis
      if (result.data?.boundaryAnalysis) {
        console.log('Boundary analysis:', result.data.boundaryAnalysis);
      }
      
      return result.data?.id;
    } else {
      console.log('❌ Upload failed:', result);
      return null;
    }
  } catch (error) {
    console.log('❌ Upload error:', error.message);
    return null;
  }
}

async function testHealthCheck() {
  try {
    console.log('Testing health check...');
    const response = await fetch('http://localhost:3003/health');
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Health check passed');
      console.log('Status:', result.status);
      return true;
    } else {
      console.log('❌ Health check failed:', result);
      return false;
    }
  } catch (error) {
    console.log('❌ Health check error:', error.message);
    return false;
  }
}

async function testSpreadsheetRetrieval(spreadsheetId) {
  try {
    console.log('Testing spreadsheet retrieval...');
    const response = await fetch(`http://localhost:3003/api/spreadsheet/${spreadsheetId}`);
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Spreadsheet retrieval successful');
      console.log('Sheets:', result.data?.sheets?.length);
      return true;
    } else {
      console.log('❌ Spreadsheet retrieval failed:', result);
      return false;
    }
  } catch (error) {
    console.log('❌ Spreadsheet retrieval error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('Starting API tests...\n');
  
  // Test health check
  const healthOk = await testHealthCheck();
  console.log('');
  
  if (!healthOk) {
    console.log('Health check failed, stopping tests');
    return;
  }
  
  // Test upload
  const spreadsheetId = await testUpload();
  console.log('');
  
  if (spreadsheetId) {
    // Test retrieval
    await testSpreadsheetRetrieval(spreadsheetId);
  }
  
  // Cleanup
  try {
    fs.unlinkSync(csvFilePath);
    console.log('\n✅ Test file cleaned up');
  } catch (error) {
    console.log('\n⚠️ Could not clean up test file:', error.message);
  }
  
  console.log('\n🎉 Tests completed!');
}

// Wait a bit for server to start, then run tests
setTimeout(runTests, 2000);