/**
 * Example demonstrating ContextExtractor functionality
 *
 * This example shows how to use the ContextExtractor to analyze
 * spreadsheet data and extract relevant context for LLM processing.
 */

import { ContextExtractor } from '../services/ContextExtractor';
import {
  SpreadsheetData,
  Sheet,
  Cell,
  DataType,
  SelectionInfo,
  FileMetadata,
} from '../types/spreadsheet';
import { ScopeInfo } from '../types/context';

// Create sample spreadsheet data
function createSampleSpreadsheet(): SpreadsheetData {
  // Sample data representing a sales report
  const sampleData: Cell[][] = [
    // Header row
    [
      { value: 'Date', dataType: DataType.TEXT, address: 'A1' },
      { value: 'Product', dataType: DataType.TEXT, address: 'B1' },
      { value: 'Quantity', dataType: DataType.TEXT, address: 'C1' },
      { value: 'Price', dataType: DataType.TEXT, address: 'D1' },
      { value: 'Total', dataType: DataType.TEXT, address: 'E1' },
    ],
    // Data rows
    [
      { value: '2024-01-15', dataType: DataType.DATE, address: 'A2' },
      { value: 'Widget A', dataType: DataType.TEXT, address: 'B2' },
      { value: 10, dataType: DataType.NUMBER, address: 'C2' },
      { value: 25.5, dataType: DataType.NUMBER, address: 'D2' },
      {
        value: 255,
        dataType: DataType.FORMULA,
        formula: '=C2*D2',
        address: 'E2',
      },
    ],
    [
      { value: '2024-01-16', dataType: DataType.DATE, address: 'A3' },
      { value: 'Widget B', dataType: DataType.TEXT, address: 'B3' },
      { value: 5, dataType: DataType.NUMBER, address: 'C3' },
      { value: 45.0, dataType: DataType.NUMBER, address: 'D3' },
      {
        value: 225,
        dataType: DataType.FORMULA,
        formula: '=C3*D3',
        address: 'E3',
      },
    ],
    [
      { value: '2024-01-17', dataType: DataType.DATE, address: 'A4' },
      { value: 'Widget A', dataType: DataType.TEXT, address: 'B4' },
      { value: 8, dataType: DataType.NUMBER, address: 'C4' },
      { value: 25.5, dataType: DataType.NUMBER, address: 'D4' },
      {
        value: 204,
        dataType: DataType.FORMULA,
        formula: '=C4*D4',
        address: 'E4',
      },
    ],
    [
      { value: null, dataType: DataType.EMPTY, address: 'A5' },
      { value: 'Total', dataType: DataType.TEXT, address: 'B5' },
      { value: null, dataType: DataType.EMPTY, address: 'C5' },
      { value: null, dataType: DataType.EMPTY, address: 'D5' },
      {
        value: 684,
        dataType: DataType.FORMULA,
        formula: '=SUM(E2:E4)',
        address: 'E5',
      },
    ],
  ];

  const sheet: Sheet = {
    name: 'Sales Report',
    data: sampleData,
    dimensions: {
      rows: sampleData.length,
      cols: sampleData[0]?.length || 0,
    },
    formatting: [],
    namedRanges: [],
  };

  const spreadsheetData: SpreadsheetData = {
    id: 'example-sheet-1',
    sheets: [sheet],
    metadata: {
      filename: 'sales-report.xlsx',
      fileSize: 2048,
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      uploadedAt: new Date(),
    } as FileMetadata,
    formulas: [
      {
        id: 'Sales Report_E2',
        cellAddress: 'Sales Report!E2',
        formula: '=C2*D2',
        dependencies: ['C2', 'D2'],
        precedents: [],
        isValid: true,
      },
      {
        id: 'Sales Report_E3',
        cellAddress: 'Sales Report!E3',
        formula: '=C3*D3',
        dependencies: ['C3', 'D3'],
        precedents: [],
        isValid: true,
      },
      {
        id: 'Sales Report_E4',
        cellAddress: 'Sales Report!E4',
        formula: '=C4*D4',
        dependencies: ['C4', 'D4'],
        precedents: [],
        isValid: true,
      },
      {
        id: 'Sales Report_E5',
        cellAddress: 'Sales Report!E5',
        formula: '=SUM(E2:E4)',
        dependencies: ['E2:E4'],
        precedents: [],
        isValid: true,
      },
    ],
    namedRanges: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return spreadsheetData;
}

// Example usage scenarios
function runContextExtractionExamples() {
  console.log('=== Context Extraction Examples ===\n');

  const spreadsheetData = createSampleSpreadsheet();

  // Example 1: Analyze data range selection
  console.log('Example 1: Analyzing data range (B2:D4)');
  console.log('User request: "Calculate the average price for Widget A"');

  const selection1: SelectionInfo = {
    sheet: 'Sales Report',
    range: 'B2:D4',
    activeCell: 'D2',
  };

  const scope1: ScopeInfo = {
    type: 'current_selection',
    includeRelated: false,
    includeHistory: false,
    maxCells: 1000,
  };

  const context1 = ContextExtractor.extractRelevantData(
    spreadsheetData,
    selection1,
    scope1,
    { includeStatistics: true }
  );

  console.log('Context Summary:');
  console.log(`- Selected cells: ${context1.summary.cellCount}`);
  console.log(
    `- Data types found: ${Object.keys(context1.summary.dataTypes).join(', ')}`
  );
  console.log(`- Headers detected: ${context1.structural.headers.join(', ')}`);
  console.log(`- Has formulas: ${context1.structural.hasFormulas}`);
  console.log(`- Confidence: ${(context1.confidence * 100).toFixed(1)}%`);

  if (context1.summary.statistics?.['hasNumericData']) {
    console.log('Numeric Statistics:');
    console.log(`- Count: ${context1.summary.statistics['count']}`);
    console.log(`- Average: ${context1.summary.statistics['mean']}`);
    console.log(`- Min: ${context1.summary.statistics['min']}`);
    console.log(`- Max: ${context1.summary.statistics['max']}`);
  }

  console.log('\n---\n');

  // Example 2: Analyze formula cell
  console.log('Example 2: Analyzing formula cell (E5)');
  console.log('User request: "Explain this total formula"');

  const selection2: SelectionInfo = {
    sheet: 'Sales Report',
    range: 'E5',
    activeCell: 'E5',
  };

  const scope2: ScopeInfo = {
    type: 'current_selection',
    includeRelated: true,
    includeHistory: false,
    maxCells: 1000,
  };

  const context2 = ContextExtractor.extractRelevantData(
    spreadsheetData,
    selection2,
    scope2
  );

  console.log('Context Summary:');
  console.log(`- Active cell value: ${context2.immediate.activeCell.value}`);
  console.log(
    `- Active cell formula: ${context2.immediate.activeCell.formula || 'None'}`
  );
  console.log(
    `- Formulas in selection: ${context2.immediate.currentFormulas.length}`
  );
  console.log(
    `- Pattern insights: ${context2.patterns.dataPatterns.length} patterns detected`
  );

  if (context2.immediate.currentFormulas.length > 0) {
    console.log('Formula Details:');
    context2.immediate.currentFormulas.forEach(formula => {
      console.log(`- ${formula.cellAddress}: ${formula.formula}`);
      console.log(`  Dependencies: ${formula.dependencies.join(', ')}`);
    });
  }

  console.log('\n---\n');

  // Example 3: Analyze entire data set
  console.log('Example 3: Analyzing entire dataset (A1:E5)');
  console.log('User request: "Give me insights about this sales data"');

  const selection3: SelectionInfo = {
    sheet: 'Sales Report',
    range: 'A1:E5',
    activeCell: 'A1',
  };

  const scope3: ScopeInfo = {
    type: 'current_selection',
    includeRelated: true,
    includeHistory: false,
    maxCells: 1000,
  };

  const context3 = ContextExtractor.extractRelevantData(
    spreadsheetData,
    selection3,
    scope3,
    { includeStatistics: true }
  );

  console.log('Context Summary:');
  console.log(`- Total cells analyzed: ${context3.summary.cellCount}`);
  console.log(`- Empty cells: ${context3.summary.emptyCount}`);
  console.log(`- Formula cells: ${context3.summary.formulaCount}`);
  console.log(
    `- Sheet structure detected: ${context3.structural.sheetStructure.hasHeaders ? 'Has headers' : 'No headers'}`
  );
  console.log(
    `- Data columns: ${context3.structural.sheetStructure.dataColumns.length}`
  );

  console.log('\nColumn Analysis:');
  context3.structural.sheetStructure.dataColumns.forEach((col, index) => {
    console.log(
      `- Column ${index + 1} (${col.header || 'No header'}): ${col.dataType}, ${col.uniqueValues} unique values`
    );
  });

  console.log('\nData Patterns:');
  context3.patterns.dataPatterns.forEach(pattern => {
    console.log(
      `- ${pattern.type}: ${pattern.description} (confidence: ${(pattern.confidence * 100).toFixed(1)}%)`
    );
  });

  console.log('\n=== End Examples ===');
}

// Run the examples
if (require.main === module) {
  runContextExtractionExamples();
}

export { runContextExtractionExamples, createSampleSpreadsheet };
