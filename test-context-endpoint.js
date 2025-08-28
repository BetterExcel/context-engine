const axios = require('axios');

async function testContextEndpoint() {
  try {
    console.log('Testing context analysis endpoint...');
    
    // Test with sample data
    const testPayload = {
      userInput: "What is in cell A1?",
      spreadsheetData: {
        sheets: [
          {
            name: "Sheet1",
            data: [
              [
                { value: "Name", dataType: "text" },
                { value: "Age", dataType: "text" },
                { value: "City", dataType: "text" }
              ],
              [
                { value: "John Doe", dataType: "text" },
                { value: 25, dataType: "number" },
                { value: "New York", dataType: "text" }
              ],
              [
                { value: "Jane Smith", dataType: "text" },
                { value: 30, dataType: "number" },
                { value: "Los Angeles", dataType: "text" }
              ]
            ]
          }
        ],
        formulas: []
      },
      currentSelection: {
        range: "A1:C3",
        activeCell: "A1",
        sheet: "Sheet1"
      },
      sessionId: "test-session",
      options: {
        includeRelated: true,
        maxContextSize: 1000
      }
    };

    console.log('Sending request...');
    const response = await axios.post('http://localhost:3003/api/context/analyze', testPayload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    console.log('Response received!');
    console.log('Status:', response.status);
    console.log('Context data keys:', Object.keys(response.data.analysis || {}));
    
    if (response.data.analysis) {
      const analysis = response.data.analysis;
      console.log('Context summary:');
      console.log('- Row count:', analysis.summary?.rowCount || 'N/A');
      console.log('- Column count:', analysis.summary?.columnCount || 'N/A');
      console.log('- Cell count:', analysis.summary?.cellCount || 'N/A');
      console.log('- Selected data length:', analysis.immediate?.selectedData?.length || 'N/A');
      console.log('- Confidence:', analysis.confidence || 'N/A');
      
      if (analysis.immediate?.selectedData?.length > 0) {
        console.log('First row of selected data:', analysis.immediate.selectedData[0]);
      }
    }

  } catch (error) {
    console.error('Error testing context endpoint:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

testContextEndpoint();
