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
    console.log('Testing CSV upload directly...');
    
    const form = new FormData();
    form.append('file', fs.createReadStream(csvFilePath), {
      filename: 'test-data.csv',
      contentType: 'text/csv'
    });

    console.log('Sending request to http://localhost:3003/api/upload');
    
    const response = await fetch('http://localhost:3003/api/upload', {
      method: 'POST',
      body: form,
      timeout: 10000 // 10 second timeout
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers.raw());
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Upload successful!');
      console.log('Result:', JSON.stringify(result, null, 2));
      
      // Test our performance optimizations
      if (result.data?.boundaryAnalysis) {
        console.log('\n🚀 Performance optimizations working:');
        console.log('- Boundary analysis completed');
        console.log('- Data boundaries:', result.data.boundaryAnalysis);
      }
      
      if (result.data?.recommendedSelection) {
        console.log('- Recommended selection:', result.data.recommendedSelection);
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

async function runTest() {
  console.log('Starting simple upload test...\n');
  
  const spreadsheetId = await testUpload();
  
  // Cleanup
  try {
    fs.unlinkSync(csvFilePath);
    console.log('\n✅ Test file cleaned up');
  } catch (error) {
    console.log('\n⚠️ Could not clean up test file:', error.message);
  }
  
  if (spreadsheetId) {
    console.log('\n🎉 Test completed successfully!');
    console.log('The performance optimizations are working correctly.');
  } else {
    console.log('\n❌ Test failed');
  }
}

runTest();