/**
 * Test the intelligent context analysis endpoint
 */

const fs = require('fs');
const path = require('path');

async function testIntelligentContextAnalysis() {
  try {
    console.log('Starting intelligent context analysis test...');

    // Create a simple test Excel-like data structure
    const testData = {
      sheets: [
        {
          name: 'Sales Data',
          data: [
            [
              { value: 'Product', dataType: 'text' },
              { value: 'Sales', dataType: 'text' },
              { value: 'Revenue', dataType: 'text' }
            ],
            [
              { value: 'Widget A', dataType: 'text' },
              { value: 100, dataType: 'number' },
              { value: 5000, dataType: 'number' }
            ],
            [
              { value: 'Widget B', dataType: 'text' },
              { value: 150, dataType: 'number' },
              { value: 7500, dataType: 'number' }
            ]
          ],
          dimensions: { rows: 3, columns: 3 }
        }
      ],
      formulas: [],
      namedRanges: [],
      metadata: {
        filename: 'test-sales.xlsx',
        size: 1024,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheettml.sheet',
        sheetCount: 1
      },
      id: 'test-123',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const requestBody = {
      request: 'Calculate the total revenue for all products',
      spreadsheetId: 'test-123',
      currentSelection: {
        range: 'A1:C3',
        activeCell: 'A1',
        sheet: 'Sales Data',
        startRow: 1,
        endRow: 3,
        startCol: 1,
        endCol: 3
      },
      spreadsheetData: testData
    };

    // Make the API request
    const response = await fetch('http://localhost:3003/api/v1/analyze-context', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    const result = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response result:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('✅ Intelligent context analysis test passed!');
      console.log('📊 Analysis confidence:', result.data.confidence);
      console.log('💡 Natural language description:', result.data.naturalLanguageDescription.substring(0, 200) + '...');
      console.log('🔧 Suggested operations:', result.data.actionableInfo.suggestedOperations);
      console.log('⚡ Processing time:', result.processingTime + 'ms');
    } else {
      console.log('❌ Test failed:', result.error);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Store test data in app locals simulation
global.mockSpreadsheetData = {
  sheets: [
    {
      name: 'Sales Data',
      data: [
        [
          { value: 'Product', dataType: 'text' },
          { value: 'Sales', dataType: 'text' },
          { value: 'Revenue', dataType: 'text' }
        ],
        [
          { value: 'Widget A', dataType: 'text' },
          { value: 100, dataType: 'number' },
          { value: 5000, dataType: 'number' }
        ],
        [
          { value: 'Widget B', dataType: 'text' },
          { value: 150, dataType: 'number' },
          { value: 7500, dataType: 'number' }
        ]
      ],
      dimensions: { rows: 3, columns: 3 }
    }
  ],
  formulas: [],
  namedRanges: [],
  metadata: {
    filename: 'test-sales.xlsx',
    size: 1024,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheettml.sheet',
    sheetCount: 1
  },
  id: 'test-123',
  createdAt: new Date(),
  updatedAt: new Date()
};

testIntelligentContextAnalysis();
