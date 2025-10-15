// Simple test to check what's causing the context route to crash
const axios = require('axios');

async function testContextRoute() {
  try {
    const response = await axios.post('http://localhost:3001/api/v1/analyze-context', {
      request: 'Calculate the sum of column A',
      spreadsheetId: 'sheet_1755815497301_9bx6n46o5',
      currentSelection: {
        sheet: 'Sheet1',
        range: 'A1:A10',
        activeCell: 'A1'
      },
      userContext: {
        sessionId: 'session_1755815497373_blk7epen4',
        recentActions: [],
        preferences: {},
        interactionHistory: []
      }
    });
    
    console.log('Success:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
  }
}

testContextRoute();