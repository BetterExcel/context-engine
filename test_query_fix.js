// Quick test to verify the query processing fix
const { EnhancedQueryProcessor } = require('./backend/src/services/EnhancedQueryProcessor.ts');

// Mock spreadsheet data similar to the CSV
const mockSpreadsheetData = {
  sheets: [{
    name: 'Portfolio',
    data: [
      ['Symbol', 'CompanyName', 'MarketValueDelayed', 'AveragePricePaid', 'Quantity', 'ProfitLoss', 'ProfitLossPercentage'],
      ['TSLA', 'Tesla Inc', 89675.40, 245.80, 365, -7041.70, -7.28],
      ['NVDA', 'NVIDIA Corporation', 156890.25, 118.45, 1350, 36765.75, 30.61],
      ['RELIANCE', 'Reliance Industries Ltd', 285670.80, 2456.30, 1200, -12455.20, -4.18],
      ['AMZN', 'Amazon.com Inc', 98234.60, 145.20, 677, -4085.40, -3.99]
    ]
  }]
};

async function testLosingPositionsQuery() {
  console.log('Testing: "Show me all my losing positions"');
  
  try {
    const result = await EnhancedQueryProcessor.processQuery(
      'Show me all my losing positions',
      mockSpreadsheetData
    );
    
    console.log('\n=== QUERY ANALYSIS RESULTS ===');
    console.log('Target Metric:', result.summary.targetMetric);
    console.log('Expected Output:', result.summary.expectedOutput);
    console.log('Data Requirements:', result.summary.dataRequirements);
    console.log('\n=== EXCEL GUIDANCE ===');
    console.log('Primary Function:', result.excelGuidance.primaryFunction);
    console.log('Example Formula:', result.excelGuidance.exampleFormula);
    console.log('\n=== CONFIDENCE ===');
    console.log('Overall:', result.confidence.overall);
    console.log('Breakdown:', result.confidence.breakdown);
    console.log('Reasoning:', result.confidence.reasoning);
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test
testLosingPositionsQuery();