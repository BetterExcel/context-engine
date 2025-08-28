#!/usr/bin/env node

const testData = {
  request: "Calculate the total revenue for all products",
  spreadsheetId: "test-123",
  currentSelection: {
    range: "A1:C3",
    activeCell: "A1",
    sheet: "Sales Data",
    startRow: 1,
    endRow: 3,
    startCol: 1,
    endCol: 3
  },
  spreadsheetData: {
    sheets: [{
      name: "Sales Data",
      data: [
        [
          { value: "Product", dataType: "text" },
          { value: "Sales", dataType: "text" },
          { value: "Revenue", dataType: "text" }
        ],
        [
          { value: "Widget A", dataType: "text" },
          { value: 100, dataType: "number" },
          { value: 5000, dataType: "number" }
        ],
        [
          { value: "Widget B", dataType: "text" },
          { value: 150, dataType: "number" },
          { value: 7500, dataType: "number" }
        ]
      ],
      dimensions: { rows: 3, columns: 3 }
    }],
    formulas: [],
    namedRanges: [],
    metadata: {
      filename: "test-sales.xlsx",
      size: 1024,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheettml.sheet",
      sheetCount: 1
    },
    id: "test-123",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
};

async function testAPI() {
  try {
    console.log('🧪 Testing API endpoint...');
    
    const response = await fetch('http://localhost:3003/api/v1/analyze-context', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Test PASSED!');
    console.log('📊 Response:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('🎉 The "No spreadsheet data available" error is FIXED!');
    }
    
  } catch (error) {
    console.log('❌ Test FAILED:', error.message);
  }
}

testAPI();
