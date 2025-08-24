/**
 * PatternAnalyzer Example
 * 
 * This example demonstrates how to use the PatternAnalyzer to identify
 * patterns, trends, anomalies, and generate insights from spreadsheet data.
 */

import { PatternAnalyzer } from '../services/PatternAnalyzer';
import { OpenAIService } from '../services/OpenAIService';
import {
  ContextData,
  ImmediateContext,
  StructuralContext,
  RelatedContext,
  HistoricalContext
} from '../types/context';
import { Cell, DataType } from '../types/spreadsheet';

async function runPatternAnalysisExample() {
  console.log('🔍 Pattern Analysis Example');
  console.log('============================\n');

  // Create sample spreadsheet data with various patterns
  const sampleData = createSampleSpreadsheetData();
  
  // Initialize PatternAnalyzer (without OpenAI for this example)
  const patternAnalyzer = new PatternAnalyzer();
  
  try {
    // Analyze patterns in the data
    console.log('📊 Analyzing patterns in sample data...\n');
    const result = await patternAnalyzer.analyzePatterns(sampleData, {
      includeStatistics: true,
      enableAIAnalysis: false, // Using rule-based analysis for this example
      confidenceThreshold: 0.7
    });

    // Display results
    console.log('📈 Data Patterns Found:');
    console.log('========================');
    result.dataPatterns.forEach((pattern, index) => {
      console.log(`${index + 1}. ${pattern.type.toUpperCase()}`);
      console.log(`   Description: ${pattern.description}`);
      console.log(`   Confidence: ${(pattern.confidence * 100).toFixed(1)}%`);
      console.log(`   Severity: ${pattern.severity}`);
      console.log(`   Affected Range: ${pattern.affectedRange}\n`);
    });

    console.log('🔗 Relationships Found:');
    console.log('========================');
    result.relationships.forEach((relationship, index) => {
      console.log(`${index + 1}. ${relationship.type.toUpperCase()}`);
      console.log(`   ${relationship.source} ↔ ${relationship.target}`);
      console.log(`   Strength: ${(relationship.strength * 100).toFixed(1)}%`);
      console.log(`   Description: ${relationship.description}\n`);
    });

    console.log('⚠️  Anomalies Detected:');
    console.log('=======================');
    result.anomalies.forEach((anomaly, index) => {
      console.log(`${index + 1}. ${anomaly.type.toUpperCase()}`);
      console.log(`   Location: ${anomaly.cellAddress}`);
      console.log(`   Description: ${anomaly.description}`);
      console.log(`   Severity: ${anomaly.severity}`);
      if (anomaly.suggestedFix) {
        console.log(`   Suggested Fix: ${anomaly.suggestedFix}`);
      }
      console.log('');
    });

    console.log('💡 Generated Insights:');
    console.log('======================');
    result.insights.forEach((insight, index) => {
      console.log(`${index + 1}. ${insight.title} (${insight.priority} priority)`);
      console.log(`   Type: ${insight.type}`);
      console.log(`   Description: ${insight.description}`);
      console.log(`   Actionable: ${insight.actionable ? 'Yes' : 'No'}`);
      if (insight.suggestedActions && insight.suggestedActions.length > 0) {
        console.log(`   Suggested Actions:`);
        insight.suggestedActions.forEach(action => {
          console.log(`   - ${action}`);
        });
      }
      console.log('');
    });

    console.log(`🎯 Overall Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('❌ Error during pattern analysis:', error);
  }
}

function createSampleSpreadsheetData(): ContextData {
  // Create sample data with trends, missing values, and outliers
  const selectedData: Cell[][] = [
    // Headers
    [
      { value: 'Month', dataType: DataType.TEXT, address: 'A1' },
      { value: 'Sales', dataType: DataType.TEXT, address: 'B1' },
      { value: 'Profit', dataType: DataType.TEXT, address: 'C1' }
    ],
    // Data with increasing trend
    [
      { value: 'Jan', dataType: DataType.TEXT, address: 'A2' },
      { value: 1000, dataType: DataType.NUMBER, address: 'B2' },
      { value: 200, dataType: DataType.NUMBER, address: 'C2' }
    ],
    [
      { value: 'Feb', dataType: DataType.TEXT, address: 'A3' },
      { value: 1200, dataType: DataType.NUMBER, address: 'B3' },
      { value: 240, dataType: DataType.NUMBER, address: 'C3' }
    ],
    [
      { value: 'Mar', dataType: DataType.TEXT, address: 'A4' },
      { value: 1400, dataType: DataType.NUMBER, address: 'B4' },
      { value: 280, dataType: DataType.NUMBER, address: 'C4' }
    ],
    [
      { value: 'Apr', dataType: DataType.TEXT, address: 'A5' },
      { value: null, dataType: DataType.EMPTY, address: 'B5' }, // Missing data
      { value: 320, dataType: DataType.NUMBER, address: 'C5' }
    ],
    [
      { value: 'May', dataType: DataType.TEXT, address: 'A6' },
      { value: 1800, dataType: DataType.NUMBER, address: 'B6' },
      { value: 360, dataType: DataType.NUMBER, address: 'C6' }
    ],
    [
      { value: 'Jun', dataType: DataType.TEXT, address: 'A7' },
      { value: 5000, dataType: DataType.NUMBER, address: 'B7' }, // Outlier
      { value: 400, dataType: DataType.NUMBER, address: 'C7' }
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
        range: 'A1:C7',
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
      headers: ['Month', 'Sales', 'Profit'],
      dataTypes: [DataType.TEXT, DataType.NUMBER, DataType.NUMBER],
      columnCount: 3,
      rowCount: 7,
      hasFormulas: false,
      hasNamedRanges: false,
      sheetStructure: {
        hasHeaders: true,
        headerRow: 0,
        dataStartRow: 1,
        dataEndRow: 6,
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
      rowCount: 7,
      columnCount: 3,
      cellCount: 21,
      formulaCount: 0,
      emptyCount: 1,
      dataTypes: { [DataType.TEXT]: 8, [DataType.NUMBER]: 12, [DataType.EMPTY]: 1 },
      patterns: []
    },
    confidence: 0.8,
    generatedAt: new Date()
  };
}

// Example with OpenAI integration (requires API key)
async function runAIPatternAnalysisExample() {
  console.log('\n🤖 AI-Enhanced Pattern Analysis Example');
  console.log('=========================================\n');

  // Check if OpenAI API key is available
  if (!process.env['OPENAI_API_KEY'] || process.env['OPENAI_API_KEY'] === 'your_openai_api_key_here') {
    console.log('⚠️  OpenAI API key not configured. Skipping AI analysis example.');
    return;
  }

  try {
    // Initialize OpenAI service
    const openAIService = new OpenAIService({
      apiKey: process.env['OPENAI_API_KEY'],
      maxRetries: 2,
      timeout: 15000
    });

    // Initialize PatternAnalyzer with AI capabilities
    const aiPatternAnalyzer = new PatternAnalyzer(openAIService);
    
    const sampleData = createSampleSpreadsheetData();
    
    console.log('🧠 Analyzing patterns with AI assistance...\n');
    const result = await aiPatternAnalyzer.analyzePatterns(sampleData, {
      includeStatistics: true,
      enableAIAnalysis: true,
      confidenceThreshold: 0.6
    });

    console.log('🎯 AI-Enhanced Results:');
    console.log(`   Patterns Found: ${result.dataPatterns.length}`);
    console.log(`   Relationships: ${result.relationships.length}`);
    console.log(`   Anomalies: ${result.anomalies.length}`);
    console.log(`   Insights: ${result.insights.length}`);
    console.log(`   Overall Confidence: ${(result.confidence * 100).toFixed(1)}%\n`);

    // Display AI-generated insights
    if (result.insights.length > 0) {
      console.log('🤖 AI-Generated Insights:');
      result.insights.forEach((insight, index) => {
        console.log(`${index + 1}. ${insight.title}`);
        console.log(`   ${insight.description}\n`);
      });
    }

  } catch (error) {
    console.error('❌ Error during AI pattern analysis:', error);
  }
}

// Run the examples
if (require.main === module) {
  (async () => {
    await runPatternAnalysisExample();
    await runAIPatternAnalysisExample();
  })();
}

export { runPatternAnalysisExample, runAIPatternAnalysisExample };