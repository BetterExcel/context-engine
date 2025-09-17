/**
 * Quick OpenAI API Test
 * 
 * This script tests if the OpenAI API key is working correctly
 * with our Excel Context Engine implementation.
 */

import dotenv from 'dotenv';
import { OpenAIService } from './services/OpenAIService';
import { PatternAnalyzer } from './services/PatternAnalyzer';
import {
  ContextData,
  ImmediateContext,
  StructuralContext,
  RelatedContext,
  HistoricalContext
} from './types/context';
import { Cell, DataType } from './types/spreadsheet';

// Load environment variables
dotenv.config();

async function testOpenAIConnection() {
  console.log('🔑 Testing OpenAI API Connection');
  console.log('=================================\n');

  // Check if API key is configured
  const apiKey = process.env['OPENAI_API_KEY'];
  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    console.log('❌ OpenAI API key not found in environment variables');
    console.log('Please set OPENAI_API_KEY in your .env file\n');
    return false;
  }

  console.log('✅ API key found in environment');
  console.log(`Key preview: ${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}\n`);

  try {
    // Try different models that might be available
    const modelsToTry = ['gpt-4o-mini', 'gpt-4o', 'gpt-4', 'gpt-3.5-turbo'];
    let workingModel = null;
    let openAIService = null;

    console.log('🚀 Testing different OpenAI models...');
    
    for (const model of modelsToTry) {
      try {
        console.log(`  Trying ${model}...`);
        const testService = new OpenAIService({
          apiKey: apiKey,
          maxRetries: 1,
          timeout: 10000,
          model: model
        });

        // Test with a simple completion
        await testService.classifyIntent("test", {});
        
        console.log(`  ✅ ${model} works!`);
        workingModel = model;
        openAIService = testService;
        break;
      } catch (error: any) {
        console.log(`  ❌ ${model} failed: ${error.message.split('\n')[0]}`);
        continue;
      }
    }

    if (!openAIService || !workingModel) {
      console.log('\n❌ None of the tested models are available to your account');
      console.log('This could mean:');
      console.log('  1. Your account needs credits/billing setup');
      console.log('  2. Your account doesn\'t have access to these models yet');
      console.log('  3. There might be a temporary API issue');
      console.log('\nPlease check your OpenAI account at https://platform.openai.com/');
      return false;
    }

    console.log(`\n✅ Successfully connected using model: ${workingModel}\n`);


    // Test intent classification
    console.log('🧠 Testing intent classification...');
    const intentResult = await openAIService.classifyIntent(
      "Help me create a VLOOKUP formula to find customer data",
      { currentSelection: "A1:B10", dataTypes: ["text", "number"] }
    );

    console.log('Intent Classification Result:');
    console.log(`  Intent: ${intentResult.intent}`);
    console.log(`  Confidence: ${(intentResult.confidence * 100).toFixed(1)}%`);
    console.log(`  Reasoning: ${intentResult.reasoning}\n`);

    // Test pattern analysis with sample data
    console.log('📊 Testing pattern analysis...');
    const sampleData = createTestData();
    const patternResult = await openAIService.analyzePatterns(sampleData);

    console.log('Pattern Analysis Result:');
    console.log(`  Patterns found: ${patternResult.patterns.length}`);
    console.log(`  Relationships: ${patternResult.relationships.length}`);
    console.log(`  Anomalies: ${patternResult.anomalies.length}`);
    console.log(`  Insights: ${patternResult.insights.length}`);
    console.log(`  Overall confidence: ${(patternResult.confidence * 100).toFixed(1)}%\n`);

    // Show some details if available
    if (patternResult.insights.length > 0) {
      console.log('Sample AI Insights:');
      patternResult.insights.slice(0, 2).forEach((insight, index) => {
        console.log(`  ${index + 1}. ${insight.description}`);
      });
      console.log('');
    }

    // Test PatternAnalyzer with AI
    console.log('🤖 Testing PatternAnalyzer with AI integration...');
    const patternAnalyzer = new PatternAnalyzer(openAIService);
    const analysisResult = await patternAnalyzer.analyzePatterns(sampleData, {
      enableAIAnalysis: true,
      includeStatistics: true,
      confidenceThreshold: 0.6
    });

    console.log('PatternAnalyzer AI Result:');
    console.log(`  Data patterns: ${analysisResult.dataPatterns.length}`);
    console.log(`  Relationships: ${analysisResult.relationships.length}`);
    console.log(`  Anomalies: ${analysisResult.anomalies.length}`);
    console.log(`  Insights: ${analysisResult.insights.length}`);
    console.log(`  Confidence: ${(analysisResult.confidence * 100).toFixed(1)}%\n`);

    console.log('🎉 All OpenAI tests passed successfully!');
    console.log('Your API key is working correctly with the Excel Context Engine.\n');
    
    return true;

  } catch (error: any) {
    console.log('❌ OpenAI test failed:');
    console.log(`Error: ${error.message}`);
    
    if (error.message.includes('401')) {
      console.log('This looks like an authentication error. Please check your API key.');
    } else if (error.message.includes('429')) {
      console.log('Rate limit exceeded. Please try again in a moment.');
    } else if (error.message.includes('timeout')) {
      console.log('Request timed out. Please check your internet connection.');
    }
    
    console.log('');
    return false;
  }
}

function createTestData(): ContextData {
  // Create sample data for testing
  const selectedData: Cell[][] = [
    [
      { value: 'Product', dataType: DataType.TEXT, address: 'A1' },
      { value: 'Sales', dataType: DataType.TEXT, address: 'B1' },
      { value: 'Profit', dataType: DataType.TEXT, address: 'C1' }
    ],
    [
      { value: 'Widget A', dataType: DataType.TEXT, address: 'A2' },
      { value: 1000, dataType: DataType.NUMBER, address: 'B2' },
      { value: 200, dataType: DataType.NUMBER, address: 'C2' }
    ],
    [
      { value: 'Widget B', dataType: DataType.TEXT, address: 'A3' },
      { value: 1500, dataType: DataType.NUMBER, address: 'B3' },
      { value: 300, dataType: DataType.NUMBER, address: 'C3' }
    ],
    [
      { value: 'Widget C', dataType: DataType.TEXT, address: 'A4' },
      { value: 2000, dataType: DataType.NUMBER, address: 'B4' },
      { value: 400, dataType: DataType.NUMBER, address: 'C4' }
    ]
  ];

  return {
    immediate: {
      selectedData,
      activeCell: selectedData[0]?.[0] || { value: null, dataType: DataType.EMPTY, address: 'A1' },
      visibleData: selectedData,
      currentFormulas: [],
      selectionInfo: {
        sheet: 'Sheet1',
        range: 'A1:C4',
        activeCell: 'A1'
      }
    } as ImmediateContext,
    related: {
      dependentCells: [],
      precedentCells: [],
      relatedFormulas: [],
      namedRanges: [],
      crossSheetReferences: []
    } as RelatedContext,
    structural: {
      headers: ['Product', 'Sales', 'Profit'],
      dataTypes: [DataType.TEXT, DataType.NUMBER, DataType.NUMBER],
      columnCount: 3,
      rowCount: 4,
      hasFormulas: false,
      hasNamedRanges: false,
      sheetStructure: {
        hasHeaders: true,
        headerRow: 0,
        dataStartRow: 1,
        dataEndRow: 3,
        dataColumns: []
      }
    } as StructuralContext,
    historical: {
      recentActions: [],
      previousRequests: [],
      sessionDuration: 0,
      interactionCount: 0
    } as HistoricalContext,
    patterns: {
      dataPatterns: [],
      relationships: [],
      anomalies: [],
      insights: [],
      confidence: 0.5
    },
    summary: {
      rowCount: 4,
      columnCount: 3,
      cellCount: 12,
      formulaCount: 0,
      emptyCount: 0,
      dataTypes: { [DataType.TEXT]: 4, [DataType.NUMBER]: 8 },
      patterns: []
    },
    confidence: 0.8,
    generatedAt: new Date()
  };
}

// Run the test
if (require.main === module) {
  testOpenAIConnection()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
}

export { testOpenAIConnection };