const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

// Create a test CSV file
const testCSV = `Name,Age,City
John,25,New York
Jane,30,Los Angeles`;

const csvFilePath = path.join(__dirname, 'debug-test.csv');
fs.writeFileSync(csvFilePath, testCSV);

async function testUpload() {
  try {
    console.log('Testing CSV upload to correct endpoint...');
    
    const form = new FormData();
    form.append('file', fs.createReadStream(csvFilePath), {
      filename: 'debug-test.csv',
      contentType: 'text/csv'
    });

    console.log('Making request to: http://localhost:3003/api/v1/upload-spreadsheet');
    
    const response = await fetch('http://localhost:3003/api/v1/upload-spreadsheet', {
      method: 'POST',
      body: form
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers));
    
    const result = await response.text();
    console.log('Raw response:', result);
    
    try {
      const jsonResult = JSON.parse(result);
      console.log('Parsed JSON:', jsonResult);
    } catch (parseError) {
      console.log('Could not parse as JSON:', parseError.message);
    }
    
  } catch (error) {
    console.log('❌ Upload error:', error.message);
    console.log('Error details:', error);
  } finally {
    // Cleanup
    try {
      fs.unlinkSync(csvFilePath);
    } catch (error) {
      console.log('Could not clean up test file');
    }
  }
}

testUpload();
