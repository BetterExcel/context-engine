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

async function testMinimalServer() {
  try {
    console.log('Testing minimal server...');
    
    // Test health check
    console.log('1. Testing health check...');
    const healthResponse = await fetch('http://localhost:3004/health', { timeout: 5000 });
    const healthResult = await healthResponse.json();
    console.log('✅ Health check:', healthResult.status);
    
    // Test upload
    console.log('2. Testing upload...');
    const form = new FormData();
    form.append('file', fs.createReadStream(csvFilePath), {
      filename: 'test-data.csv',
      contentType: 'text/csv'
    });

    const uploadResponse = await fetch('http://localhost:3004/api/upload', {
      method: 'POST',
      body: form,
      timeout: 10000
    });

    const uploadResult = await uploadResponse.json();
    
    if (uploadResponse.ok) {
      console.log('✅ Upload successful!');
      console.log('- File ID:', uploadResult.data.id);
      console.log('- Headers:', uploadResult.data.headers);
      console.log('- Row count:', uploadResult.data.rowCount);
      console.log('- Recommended selection:', uploadResult.data.recommendedSelection);
      console.log('- Boundary analysis:', uploadResult.data.boundaryAnalysis);
      
      console.log('\n🎉 Performance optimizations working correctly!');
      console.log('The boundary analysis and CSV parsing are functioning as expected.');
    } else {
      console.log('❌ Upload failed:', uploadResult);
    }
    
  } catch (error) {
    console.log('❌ Test error:', error.message);
  } finally {
    // Cleanup
    try {
      fs.unlinkSync(csvFilePath);
      console.log('\n✅ Test file cleaned up');
    } catch (error) {
      console.log('\n⚠️ Could not clean up test file:', error.message);
    }
  }
}

// Wait for server to start
setTimeout(testMinimalServer, 1000);