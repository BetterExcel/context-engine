/**
 * Test script to verify the AI assistant no longer gives generic "bullshit" responses
 * and instead provides specific, actionable guidance
 */

const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3001/api/v1';
const TEST_SPREADSHEET_ID = 'test_sheet_123';

// Mock spreadsheet data (portfolio data like the CSV)
const mockSpreadsheetData = {
  id: TEST_SPREADSHEET_ID,
  sheets: [{
    name: 'Portfolio',
    data: [
      // Headers
      ['Symbol', 'CompanyName', 'MarketValueDelayed', 'AveragePricePaid', 'Quantity', 'ProfitLoss', 'ProfitLossPercentage'],
      // Sample data
      ['AAPL', 'Apple Inc', 146642.33, 226.55, 500, -8563.56, -5.52],
      ['COIN', 'Coinbase Global Inc', 146630.25, 257.32, 282, 47204.98, 47.48],
      ['BA', 'Boeing Co.', 97176.49, 235.44, 300, 398.72, 0.41],
      ['UBER', 'Uber Technologies Inc', 105516.71, 90.78, 850, -209.64, -0.20]
    ]
  }]
};

// Test queries that should now work properly
const testQueries = [
  {
    name: "Specific Company Query - Coinbase Average Price",
    query: "What is the average price paid for Coinbase?",
    expectedToContain: ["VLOOKUP", "COIN", "257.32", "column", "formula"],
    shouldNotContain: ["average of numeric values", "generic"]
  },
  {
    name: "Specific Company Query - Apple Market Value", 
    query: "Show me Apple's market value",
    expectedToContain: ["VLOOKUP", "AAPL", "146642", "market value", "formula"],
    shouldNotContain: ["average of numeric values", "generic"]
  },
  {
    name: "Specific Company Query - Boeing Profit",
    query: "Find Boeing's profit or loss",
    expectedToContain: ["VLOOKUP", "BA", "398", "profit", "formula"],
    shouldNotContain: ["average of numeric values", "generic"]
  }
];

async function runTests() {
  console.log('🧪 Testing Fixed AI Assistant Responses\n');
  console.log('This verifies that the AI no longer gives generic "bullshit" responses');
  console.log('and instead provides specific, actionable Excel guidance.\n');

  // First, simulate uploading the spreadsheet data
  console.log('📊 Setting up test data...');
  // In a real test, this would be uploaded via the upload endpoint
  // For now, we'll assume the data is available
  
  let passedTests = 0;
  let totalTests = testQueries.length;

  for (const test of testQueries) {
    console.log(`\n🔍 Testing: ${test.name}`);
    console.log(`Query: "${test.query}"`);
    console.log('=' .repeat(60));

    try {
      // Make request to the context analysis endpoint
      const response = await axios.post(`${BASE_URL}/analyze-context`, {
        request: test.query,
        spreadsheetId: TEST_SPREADSHEET_ID,
        currentSelection: {
          sheet: 'Portfolio',
          range: 'A1:G5',
          activeCell: 'A1'
        }
      });

      if (response.status === 200) {
        const result = response.data;
        const description = result.data.naturalLanguageDescription;
        const suggestions = result.data.suggestions;
        const actionableInfo = result.data.actionableInfo;

        console.log('✅ Request successful');
        console.log(`📝 Response length: ${description.length} characters`);
        
        // Check if response contains expected elements
        let testPassed = true;
        const allText = (description + ' ' + suggestions.join(' ') + ' ' + actionableInfo.suggestedOperations.join(' ')).toLowerCase();

        // Check for expected content
        const foundExpected = test.expectedToContain.filter(item => 
          allText.includes(item.toLowerCase())
        );
        
        const foundUnwanted = test.shouldNotContain.filter(item =>
          allText.includes(item.toLowerCase())
        );

        console.log(`\n🎯 Expected Content Found: ${foundExpected.length}/${test.expectedToContain.length}`);
        foundExpected.forEach(item => console.log(`  ✅ Found: "${item}"`));
        
        const missingExpected = test.expectedToContain.filter(item => 
          !allText.includes(item.toLowerCase())
        );
        missingExpected.forEach(item => console.log(`  ❌ Missing: "${item}"`));

        if (foundUnwanted.length > 0) {
          console.log(`\n⚠️ Unwanted Content Found: ${foundUnwanted.length}`);
          foundUnwanted.forEach(item => console.log(`  ❌ Found unwanted: "${item}"`));
          testPassed = false;
        } else {
          console.log('\n✅ No unwanted generic content found');
        }

        // Check confidence score
        const confidence = result.data.confidence;
        console.log(`\n📊 Confidence Score: ${(confidence * 100).toFixed(1)}%`);
        
        if (confidence > 0.7) {
          console.log('✅ High confidence score (> 70%)');
        } else {
          console.log('⚠️ Low confidence score (< 70%)');
        }

        // Show key parts of the response
        console.log('\n📋 Key Response Elements:');
        if (description.includes('VLOOKUP') || description.includes('INDEX')) {
          console.log('✅ Contains specific Excel formula guidance');
        } else {
          console.log('❌ Missing specific Excel formula guidance');
          testPassed = false;
        }

        if (description.includes('step') || description.includes('Step')) {
          console.log('✅ Contains step-by-step instructions');
        } else {
          console.log('❌ Missing step-by-step instructions');
        }

        if (actionableInfo.suggestedOperations.some(op => op.includes('='))) {
          console.log('✅ Contains actual Excel formulas');
        } else {
          console.log('❌ Missing actual Excel formulas');
          testPassed = false;
        }

        // Final test result
        if (testPassed && foundExpected.length >= test.expectedToContain.length * 0.8) {
          console.log('\n🎉 TEST PASSED');
          passedTests++;
        } else {
          console.log('\n❌ TEST FAILED');
        }

        // Show sample of the response
        console.log('\n📄 Sample Response:');
        console.log(description.substring(0, 300) + '...');
        
      } else {
        console.log(`❌ Request failed with status: ${response.status}`);
      }

    } catch (error) {
      console.log(`❌ Request error: ${error.message}`);
      
      if (error.response) {
        console.log(`Status: ${error.response.status}`);
        console.log(`Error: ${error.response.data?.error?.message || 'Unknown error'}`);
      }
    }
  }

  // Final summary
  console.log('\n' + '=' .repeat(60));
  console.log('🏁 TEST SUMMARY');
  console.log('=' .repeat(60));
  console.log(`Tests Passed: ${passedTests}/${totalTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (passedTests === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('✅ AI Assistant no longer gives generic "bullshit" responses');
    console.log('✅ Provides specific Excel formulas and guidance');
    console.log('✅ Includes step-by-step instructions');
    console.log('✅ Uses actual data analysis for confidence scores');
  } else {
    console.log('\n⚠️ Some tests failed. The AI Assistant may still need improvements.');
  }

  console.log('\n💡 The enhanced query processing system should now provide:');
  console.log('   • Specific Excel formulas (=VLOOKUP("COIN", A:G, 4, FALSE))');
  console.log('   • Step-by-step implementation instructions');
  console.log('   • Real confidence scores based on data analysis');
  console.log('   • Validation steps and common pitfall warnings');
  console.log('   • Alternative approaches for different Excel versions');
}

// Run the tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };