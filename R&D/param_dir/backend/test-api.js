const axios = require('axios');

async function testAnalyzeContext() {
  try {
    console.log('Testing analyze-context endpoint...');
    
    const response = await axios.post('http://localhost:3001/api/v1/analyze-context', {
      request: 'Calculate the sum of column A',
      spreadsheetId: 'sheet_1755829522435_xcoi9fqst',
      currentSelection: {
        sheet: 'Sheet1',
        range: 'A1:A10',
        activeCell: 'A1'
      },
      userContext: {
        sessionId: 'test-session',
        recentActions: [],
        preferences: {},
        interactionHistory: []
      }
    }, {
      timeout: 30000
    });
    
    console.log('Success! Status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    }
  }
}

testAnalyzeContext();