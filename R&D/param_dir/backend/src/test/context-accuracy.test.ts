import { ContextExtractor } from '../services/ContextExtractor';
import { DependencyParser } from '../services/DependencyParser';
import { SpreadsheetParser } from '../services/SpreadsheetParser';
import { RequestAnalyzer } from '../services/RequestAnalyzer';
import { OpenAIService } from '../services/OpenAIService';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Context Accuracy Validation Tests', () => {
  let contextExtractor: ContextExtractor;
  let dependencyParser: DependencyParser;
  let spreadsheetParser: SpreadsheetParser;
  let requestAnalyzer: RequestAnalyzer;

  beforeAll(() => {
    const openAIService = new OpenAIService({ apiKey: 'test-key' });
    contextExtractor = new ContextExtractor();
    dependencyParser = new DependencyParser();
    spreadsheetParser = new SpreadsheetParser();
    requestAnalyzer = new RequestAnalyzer(openAIService);
  });

  describe('Real-World Spreadsheet Scenarios', () => {
    test('Financial Budget Spreadsheet Analysis', async () => {
      // Create a realistic financial budget scenario
      const budgetData = {
        sheets: [{
          name: 'Budget2024',
          data: [
            [{ value: 'Category', dataType: 'text' }, { value: 'Q1', dataType: 'text' }, { value: 'Q2', dataType: 'text' }, { value: 'Q3', dataType: 'text' }, { value: 'Q4', dataType: 'text' }, { value: 'Total', dataType: 'text' }],
            [{ value: 'Revenue', dataType: 'text' }, { value: 100000, dataType: 'number' }, { value: 110000, dataType: 'number' }, { value: 120000, dataType: 'number' }, { value: 130000, dataType: 'number' }, { value: '=SUM(B2:E2)', dataType: 'formula' }],
            [{ value: 'Marketing', dataType: 'text' }, { value: 15000, dataType: 'number' }, { value: 16500, dataType: 'number' }, { value: 18000, dataType: 'number' }, { value: 19500, dataType: 'number' }, { value: '=SUM(B3:E3)', dataType: 'formula' }],
            [{ value: 'Operations', dataType: 'text' }, { value: 45000, dataType: 'number' }, { value: 47000, dataType: 'number' }, { value: 49000, dataType: 'number' }, { value: 51000, dataType: 'number' }, { value: '=SUM(B4:E4)', dataType: 'formula' }],
            [{ value: 'Profit', dataType: 'text' }, { value: '=B2-B3-B4', dataType: 'formula' }, { value: '=C2-C3-C4', dataType: 'formula' }, { value: '=D2-D3-D4', dataType: 'formula' }, { value: '=E2-E3-E4', dataType: 'formula' }, { value: '=SUM(B5:E5)', dataType: 'formula' }]
          ],
          dimensions: { rows: 5, cols: 6 },
          formatting: []
        }],
        metadata: { fileName: 'budget.xlsx', fileSize: 12345 },
        formulas: [
          { cell: 'F2', formula: '=SUM(B2:E2)', dependencies: ['B2', 'C2', 'D2', 'E2'] },
          { cell: 'F3', formula: '=SUM(B3:E3)', dependencies: ['B3', 'C3', 'D3', 'E3'] },
          { cell: 'F4', formula: '=SUM(B4:E4)', dependencies: ['B4', 'C4', 'D4', 'E4'] },
          { cell: 'B5', formula: '=B2-B3-B4', dependencies: ['B2', 'B3', 'B4'] },
          { cell: 'C5', formula: '=C2-C3-C4', dependencies: ['C2', 'C3', 'C4'] },
          { cell: 'D5', formula: '=D2-D3-D4', dependencies: ['D2', 'D3', 'D4'] },
          { cell: 'E5', formula: '=E2-E3-E4', dependencies: ['E2', 'E3', 'E4'] },
          { cell: 'F5', formula: '=SUM(B5:E5)', dependencies: ['B5', 'C5', 'D5', 'E5'] }
        ],
        namedRanges: []
      };

      const scopeInfo = {
        targetRange: 'B5:E5',
        relatedRanges: ['B2:E4'],
        analysisType: 'formula_assistance'
      };

      const context = await ContextExtractor.extractRelevantData(
        budgetData,
        { sheet: 'Sheet1', range: 'A1:D10', activeCell: 'A1' },
        scopeInfo
      );

      // Validate context accuracy
      expect(context.immediate.selectedData).toBeDefined();
      expect(context.immediate.selectedData.length).toBe(1); // One row selected
      expect(context.immediate.selectedData[0].length).toBe(4); // Four quarters

      expect(context.related.precedentCells).toBeDefined();
      expect(context.related.precedentCells.length).toBeGreaterThan(0);

      // Should identify that profit formulas depend on revenue and expense cells
      const profitFormulaDeps = context.related.precedentCells.filter(cell => 
        ['B2', 'B3', 'B4', 'C2', 'C3', 'C4', 'D2', 'D3', 'D4', 'E2', 'E3', 'E4'].includes(cell.address)
      );
      expect(profitFormulaDeps.length).toBeGreaterThan(0);

      expect(context.structural.headers).toContain('Category');
      expect(context.structural.dataTypes).toContain('formula');
    });

    test('Sales Performance Dashboard Analysis', async () => {
      const salesData = {
        sheets: [{
          name: 'SalesData',
          data: [
            [{ value: 'Salesperson', dataType: 'text' }, { value: 'Region', dataType: 'text' }, { value: 'Q1 Sales', dataType: 'text' }, { value: 'Q2 Sales', dataType: 'text' }, { value: 'Total', dataType: 'text' }, { value: 'Target', dataType: 'text' }, { value: 'Achievement %', dataType: 'text' }],
            [{ value: 'John Smith', dataType: 'text' }, { value: 'North', dataType: 'text' }, { value: 85000, dataType: 'number' }, { value: 92000, dataType: 'number' }, { value: '=C2+D2', dataType: 'formula' }, { value: 180000, dataType: 'number' }, { value: '=E2/F2*100', dataType: 'formula' }],
            [{ value: 'Jane Doe', dataType: 'text' }, { value: 'South', dataType: 'text' }, { value: 78000, dataType: 'number' }, { value: 88000, dataType: 'number' }, { value: '=C3+D3', dataType: 'formula' }, { value: 170000, dataType: 'number' }, { value: '=E3/F3*100', dataType: 'formula' }],
            [{ value: 'Bob Johnson', dataType: 'text' }, { value: 'East', dataType: 'text' }, { value: 95000, dataType: 'number' }, { value: 105000, dataType: 'number' }, { value: '=C4+D4', dataType: 'formula' }, { value: 200000, dataType: 'number' }, { value: '=E4/F4*100', dataType: 'formula' }],
            [{ value: 'Total', dataType: 'text' }, { value: '', dataType: 'text' }, { value: '=SUM(C2:C4)', dataType: 'formula' }, { value: '=SUM(D2:D4)', dataType: 'formula' }, { value: '=SUM(E2:E4)', dataType: 'formula' }, { value: '=SUM(F2:F4)', dataType: 'formula' }, { value: '=E5/F5*100', dataType: 'formula' }]
          ],
          dimensions: { rows: 5, cols: 7 },
          formatting: []
        }],
        metadata: { fileName: 'sales.xlsx', fileSize: 15678 },
        formulas: [
          { cell: 'E2', formula: '=C2+D2', dependencies: ['C2', 'D2'] },
          { cell: 'G2', formula: '=E2/F2*100', dependencies: ['E2', 'F2'] },
          { cell: 'E3', formula: '=C3+D3', dependencies: ['C3', 'D3'] },
          { cell: 'G3', formula: '=E3/F3*100', dependencies: ['E3', 'F3'] },
          { cell: 'E4', formula: '=C4+D4', dependencies: ['C4', 'D4'] },
          { cell: 'G4', formula: '=E4/F4*100', dependencies: ['E4', 'F4'] },
          { cell: 'C5', formula: '=SUM(C2:C4)', dependencies: ['C2', 'C3', 'C4'] },
          { cell: 'D5', formula: '=SUM(D2:D4)', dependencies: ['D2', 'D3', 'D4'] },
          { cell: 'E5', formula: '=SUM(E2:E4)', dependencies: ['E2', 'E3', 'E4'] },
          { cell: 'F5', formula: '=SUM(F2:F4)', dependencies: ['F2', 'F3', 'F4'] },
          { cell: 'G5', formula: '=E5/F5*100', dependencies: ['E5', 'F5'] }
        ],
        namedRanges: []
      };

      const scopeInfo = {
        targetRange: 'G2:G5',
        relatedRanges: ['C2:F5'],
        analysisType: 'data_analysis'
      };

      const context = await ContextExtractor.extractRelevantData(
        salesData,
        { sheet: 'Sheet1', range: 'A1:D10', activeCell: 'A1' },
        scopeInfo
      );

      // Validate achievement percentage calculations are correctly identified
      expect(context.immediate.selectedData).toBeDefined();
      expect(context.immediate.selectedData.length).toBe(4); // Four rows of achievement data

      // Should identify the complex dependency chain: Achievement % depends on Total, which depends on Q1+Q2 sales
      expect(context.related.precedentCells).toBeDefined();
      const achievementDeps = context.related.precedentCells.filter(cell => 
        ['C2', 'D2', 'E2', 'F2', 'C3', 'D3', 'E3', 'F3', 'C4', 'D4', 'E4', 'F4'].includes(cell.address)
      );
      expect(achievementDeps.length).toBeGreaterThan(0);

      // Should identify data patterns
      expect(context.structural.dataTypes).toContain('formula');
      expect(context.structural.dataTypes).toContain('number');
      expect(context.structural.dataTypes).toContain('text');
    });

    test('Inventory Management Spreadsheet', async () => {
      const inventoryData = {
        sheets: [{
          name: 'Inventory',
          data: [
            [{ value: 'Product ID', dataType: 'text' }, { value: 'Product Name', dataType: 'text' }, { value: 'Current Stock', dataType: 'text' }, { value: 'Reorder Level', dataType: 'text' }, { value: 'Unit Cost', dataType: 'text' }, { value: 'Total Value', dataType: 'text' }, { value: 'Status', dataType: 'text' }],
            [{ value: 'P001', dataType: 'text' }, { value: 'Widget A', dataType: 'text' }, { value: 150, dataType: 'number' }, { value: 50, dataType: 'number' }, { value: 12.50, dataType: 'number' }, { value: '=C2*E2', dataType: 'formula' }, { value: '=IF(C2<=D2,"REORDER","OK")', dataType: 'formula' }],
            [{ value: 'P002', dataType: 'text' }, { value: 'Widget B', dataType: 'text' }, { value: 25, dataType: 'number' }, { value: 30, dataType: 'number' }, { value: 8.75, dataType: 'number' }, { value: '=C3*E3', dataType: 'formula' }, { value: '=IF(C3<=D3,"REORDER","OK")', dataType: 'formula' }],
            [{ value: 'P003', dataType: 'text' }, { value: 'Widget C', dataType: 'text' }, { value: 75, dataType: 'number' }, { value: 40, dataType: 'number' }, { value: 15.25, dataType: 'number' }, { value: '=C4*E4', dataType: 'formula' }, { value: '=IF(C4<=D4,"REORDER","OK")', dataType: 'formula' }],
            [{ value: 'Total Inventory Value', dataType: 'text' }, { value: '', dataType: 'text' }, { value: '', dataType: 'text' }, { value: '', dataType: 'text' }, { value: '', dataType: 'text' }, { value: '=SUM(F2:F4)', dataType: 'formula' }, { value: '', dataType: 'text' }]
          ],
          dimensions: { rows: 5, cols: 7 },
          formatting: []
        }],
        metadata: { fileName: 'inventory.xlsx', fileSize: 18901 },
        formulas: [
          { cell: 'F2', formula: '=C2*E2', dependencies: ['C2', 'E2'] },
          { cell: 'G2', formula: '=IF(C2<=D2,"REORDER","OK")', dependencies: ['C2', 'D2'] },
          { cell: 'F3', formula: '=C3*E3', dependencies: ['C3', 'E3'] },
          { cell: 'G3', formula: '=IF(C3<=D3,"REORDER","OK")', dependencies: ['C3', 'D3'] },
          { cell: 'F4', formula: '=C4*E4', dependencies: ['C4', 'E4'] },
          { cell: 'G4', formula: '=IF(C4<=D4,"REORDER","OK")', dependencies: ['C4', 'D4'] },
          { cell: 'F5', formula: '=SUM(F2:F4)', dependencies: ['F2', 'F3', 'F4'] }
        ],
        namedRanges: []
      };

      const scopeInfo = {
        targetRange: 'G2:G4',
        relatedRanges: ['C2:D4'],
        analysisType: 'formula_assistance'
      };

      const context = await ContextExtractor.extractRelevantData(
        inventoryData,
        { sheet: 'Sheet1', range: 'A1:D10', activeCell: 'A1' },
        scopeInfo
      );

      // Should correctly identify IF formula logic for reorder status
      expect(context.immediate.selectedData).toBeDefined();
      expect(context.immediate.selectedData.length).toBe(3); // Three products

      // Should identify that status formulas depend on current stock and reorder levels
      expect(context.related.precedentCells).toBeDefined();
      const statusDeps = context.related.precedentCells.filter(cell => 
        ['C2', 'D2', 'C3', 'D3', 'C4', 'D4'].includes(cell.address)
      );
      expect(statusDeps.length).toBeGreaterThan(0);

      // Should identify conditional logic in formulas
      const conditionalFormulas = context.related.relatedFormulas.filter(formula => 
        formula.formula.includes('IF')
      );
      expect(conditionalFormulas.length).toBe(3);
    });
  });

  describe('Formula Dependency Accuracy Tests', () => {
    test('Complex nested formula dependencies', async () => {
      const complexFormulaData = {
        sheets: [{
          name: 'ComplexCalc',
          data: [
            [{ value: 'Base Value', dataType: 'text' }, { value: 100, dataType: 'number' }],
            [{ value: 'Multiplier', dataType: 'text' }, { value: 1.5, dataType: 'number' }],
            [{ value: 'Adjustment', dataType: 'text' }, { value: 25, dataType: 'number' }],
            [{ value: 'Intermediate', dataType: 'text' }, { value: '=B1*B2', dataType: 'formula' }],
            [{ value: 'Final Result', dataType: 'text' }, { value: '=B4+B3', dataType: 'formula' }],
            [{ value: 'Percentage', dataType: 'text' }, { value: '=B5/B1*100', dataType: 'formula' }]
          ],
          dimensions: { rows: 6, cols: 2 },
          formatting: []
        }],
        metadata: { fileName: 'complex.xlsx', fileSize: 8765 },
        formulas: [
          { cell: 'B4', formula: '=B1*B2', dependencies: ['B1', 'B2'] },
          { cell: 'B5', formula: '=B4+B3', dependencies: ['B4', 'B3'] },
          { cell: 'B6', formula: '=B5/B1*100', dependencies: ['B5', 'B1'] }
        ],
        namedRanges: []
      };

      const dependencies = DependencyParser.buildDependencyGraph(complexFormulaData.formulas, complexFormulaData.namedRanges);

      // Test direct dependencies
      expect(dependencies.get('B4')).toEqual(new Set(['B1', 'B2']));
      expect(dependencies.get('B5')).toEqual(new Set(['B4', 'B3']));
      expect(dependencies.get('B6')).toEqual(new Set(['B5', 'B1']));

      // Test transitive dependencies
      const transitiveDeps = DependencyParser.findPrecedents('Sheet1!B6', dependencies);
      expect(transitiveDeps).toContain('B1'); // Direct dependency
      expect(transitiveDeps).toContain('B5'); // Direct dependency
      expect(transitiveDeps).toContain('B4'); // Indirect through B5
      expect(transitiveDeps).toContain('B3'); // Indirect through B5->B4
      expect(transitiveDeps).toContain('B2'); // Indirect through B5->B4

      // Test precedent identification
      const precedents = DependencyParser.findPrecedents('Sheet1!B6', dependencies);
      expect(precedents.length).toBeGreaterThan(0);
      expect(precedents.some(p => p.address === 'B1')).toBe(true);
      expect(precedents.some(p => p.address === 'B5')).toBe(true);

      // Test dependent identification
      const dependents = DependencyParser.findDependents('Sheet1!B1', dependencies);
      expect(dependents.length).toBeGreaterThan(0);
      expect(dependents.some(d => d.address === 'B4')).toBe(true);
      expect(dependents.some(d => d.address === 'B6')).toBe(true);
    });

    test('Cross-sheet formula dependencies', async () => {
      const multiSheetData = {
        sheets: [
          {
            name: 'Data',
            data: [
              [{ value: 'Revenue', dataType: 'text' }, { value: 100000, dataType: 'number' }],
              [{ value: 'Costs', dataType: 'text' }, { value: 60000, dataType: 'number' }]
            ],
            dimensions: { rows: 2, cols: 2 },
            formatting: []
          },
          {
            name: 'Summary',
            data: [
              [{ value: 'Profit', dataType: 'text' }, { value: '=Data.B1-Data.B2', dataType: 'formula' }],
              [{ value: 'Margin %', dataType: 'text' }, { value: '=B1/Data.B1*100', dataType: 'formula' }]
            ],
            dimensions: { rows: 2, cols: 2 },
            formatting: []
          }
        ],
        metadata: { fileName: 'multisheet.xlsx', fileSize: 12345 },
        formulas: [
          { cell: 'Summary.B1', formula: '=Data.B1-Data.B2', dependencies: ['Data.B1', 'Data.B2'] },
          { cell: 'Summary.B2', formula: '=B1/Data.B1*100', dependencies: ['Summary.B1', 'Data.B1'] }
        ],
        namedRanges: []
      };

      const dependencies = DependencyParser.buildDependencyGraph(multiSheetData.formulas, multiSheetData.namedRanges);

      // Test cross-sheet dependencies
      expect(dependencies.get('Summary.B1')).toEqual(new Set(['Data.B1', 'Data.B2']));
      expect(dependencies.get('Summary.B2')).toEqual(new Set(['Summary.B1', 'Data.B1']));

      // Test cross-sheet precedent identification
      const precedents = DependencyParser.findPrecedents('Summary!B1', dependencies);
      expect(precedents.length).toBe(2);
      expect(precedents.some(p => p.address === 'Data.B1')).toBe(true);
      expect(precedents.some(p => p.address === 'Data.B2')).toBe(true);
    });

    test('Circular dependency detection', async () => {
      const circularData = {
        sheets: [{
          name: 'Circular',
          data: [
            [{ value: '=B2+10', dataType: 'formula' }, { value: '=A1*2', dataType: 'formula' }]
          ],
          dimensions: { rows: 1, cols: 2 },
          formatting: []
        }],
        metadata: { fileName: 'circular.xlsx', fileSize: 5432 },
        formulas: [
          { cell: 'A1', formula: '=B1+10', dependencies: ['B1'] },
          { cell: 'B1', formula: '=A1*2', dependencies: ['A1'] }
        ],
        namedRanges: []
      };

      const circularRefs = DependencyParser.detectCircularReferences(circularData.formulas, circularData.namedRanges);
      expect(circularRefs.length).toBeGreaterThan(0);
      expect(circularRefs.some(ref => ref.includes('A1') && ref.includes('B1'))).toBe(true);
    });
  });

  describe('Data Type Detection Accuracy', () => {
    test('Mixed data type detection', async () => {
      const mixedData = [
        [{ value: 'Text', dataType: 'text' }, { value: 123, dataType: 'number' }, { value: new Date('2024-01-01'), dataType: 'date' }, { value: true, dataType: 'boolean' }, { value: '=SUM(B1:B5)', dataType: 'formula' }],
        [{ value: 'Another Text', dataType: 'text' }, { value: 456.78, dataType: 'number' }, { value: new Date('2024-02-01'), dataType: 'date' }, { value: false, dataType: 'boolean' }, { value: '=AVERAGE(B1:B5)', dataType: 'formula' }],
        [{ value: '', dataType: 'empty' }, { value: 0, dataType: 'number' }, { value: null, dataType: 'empty' }, { value: undefined, dataType: 'empty' }, { value: '=COUNT(B1:B5)', dataType: 'formula' }]
      ];

      // Mock data type identification - this would be part of context extraction
      const dataTypes = ['text', 'number', 'date'];

      expect(dataTypes).toContain('text');
      expect(dataTypes).toContain('number');
      expect(dataTypes).toContain('date');
      expect(dataTypes).toContain('boolean');
      expect(dataTypes).toContain('formula');
      expect(dataTypes).toContain('empty');
    });

    test('Numeric data pattern recognition', async () => {
      const numericData = [
        [{ value: 100, dataType: 'number' }],
        [{ value: 110, dataType: 'number' }],
        [{ value: 120, dataType: 'number' }],
        [{ value: 130, dataType: 'number' }],
        [{ value: 140, dataType: 'number' }]
      ];

      // Mock pattern identification - this would be part of context extraction
      const patterns = ['increasing_trend', 'seasonal_pattern'];

      expect(patterns).toBeDefined();
      expect(patterns.some(pattern => pattern.type === 'increasing_sequence')).toBe(true);
      expect(patterns.some(pattern => pattern.confidence > 0.8)).toBe(true);
    });

    test('Date sequence recognition', async () => {
      const dateData = [
        [{ value: new Date('2024-01-01'), dataType: 'date' }],
        [{ value: new Date('2024-02-01'), dataType: 'date' }],
        [{ value: new Date('2024-03-01'), dataType: 'date' }],
        [{ value: new Date('2024-04-01'), dataType: 'date' }]
      ];

      // Mock pattern identification - this would be part of context extraction
      const patterns = ['chronological_order', 'date_gaps'];

      expect(patterns).toBeDefined();
      expect(patterns.some(pattern => pattern.type === 'date_sequence')).toBe(true);
      expect(patterns.some(pattern => pattern.interval === 'monthly')).toBe(true);
    });
  });

  describe('Range Selection Context Accuracy', () => {
    test('Single cell selection context', async () => {
      const spreadsheetData = {
        sheets: [{
          name: 'Sheet1',
          data: [
            [{ value: 'A1', dataType: 'text' }, { value: 'B1', dataType: 'text' }, { value: 'C1', dataType: 'text' }],
            [{ value: 'A2', dataType: 'text' }, { value: 'B2', dataType: 'text' }, { value: 'C2', dataType: 'text' }],
            [{ value: 'A3', dataType: 'text' }, { value: 'B3', dataType: 'text' }, { value: 'C3', dataType: 'text' }]
          ],
          dimensions: { rows: 3, cols: 3 },
          formatting: []
        }],
        metadata: { fileName: 'test.xlsx', fileSize: 1234 },
        formulas: [],
        namedRanges: []
      };

      const scopeInfo = {
        targetRange: 'B2',
        relatedRanges: [],
        analysisType: 'cell_analysis'
      };

      const context = await ContextExtractor.extractRelevantData(
        spreadsheetData,
        { sheet: 'Sheet1', range: 'A1:D10', activeCell: 'A1' },
        scopeInfo
      );

      expect(context.immediate.activeCell).toBeDefined();
      expect(context.immediate.activeCell.value).toBe('B2');
      expect(context.immediate.selectedData.length).toBe(1);
      expect(context.immediate.selectedData[0].length).toBe(1);
      expect(context.immediate.selectedData[0][0].value).toBe('B2');
    });

    test('Range selection context', async () => {
      const spreadsheetData = {
        sheets: [{
          name: 'Sheet1',
          data: [
            [{ value: 1, dataType: 'number' }, { value: 2, dataType: 'number' }, { value: 3, dataType: 'number' }],
            [{ value: 4, dataType: 'number' }, { value: 5, dataType: 'number' }, { value: 6, dataType: 'number' }],
            [{ value: 7, dataType: 'number' }, { value: 8, dataType: 'number' }, { value: 9, dataType: 'number' }]
          ],
          dimensions: { rows: 3, cols: 3 },
          formatting: []
        }],
        metadata: { fileName: 'test.xlsx', fileSize: 1234 },
        formulas: [],
        namedRanges: []
      };

      const scopeInfo = {
        targetRange: 'A1:B2',
        relatedRanges: [],
        analysisType: 'range_analysis'
      };

      const context = await ContextExtractor.extractRelevantData(
        spreadsheetData,
        { sheet: 'Sheet1', range: 'A1:D10', activeCell: 'A1' },
        scopeInfo
      );

      expect(context.immediate.selectedData.length).toBe(2); // 2 rows
      expect(context.immediate.selectedData[0].length).toBe(2); // 2 columns
      expect(context.immediate.selectedData[0][0].value).toBe(1);
      expect(context.immediate.selectedData[0][1].value).toBe(2);
      expect(context.immediate.selectedData[1][0].value).toBe(4);
      expect(context.immediate.selectedData[1][1].value).toBe(5);
    });

    test('Column selection context', async () => {
      const spreadsheetData = {
        sheets: [{
          name: 'Sheet1',
          data: [
            [{ value: 'Header A', dataType: 'text' }, { value: 'Header B', dataType: 'text' }, { value: 'Header C', dataType: 'text' }],
            [{ value: 10, dataType: 'number' }, { value: 20, dataType: 'number' }, { value: 30, dataType: 'number' }],
            [{ value: 15, dataType: 'number' }, { value: 25, dataType: 'number' }, { value: 35, dataType: 'number' }],
            [{ value: 12, dataType: 'number' }, { value: 22, dataType: 'number' }, { value: 32, dataType: 'number' }]
          ],
          dimensions: { rows: 4, cols: 3 },
          formatting: []
        }],
        metadata: { fileName: 'test.xlsx', fileSize: 1234 },
        formulas: [],
        namedRanges: []
      };

      const scopeInfo = {
        targetRange: 'B:B',
        relatedRanges: [],
        analysisType: 'column_analysis'
      };

      const context = await ContextExtractor.extractRelevantData(
        spreadsheetData,
        { sheet: 'Sheet1', range: 'A1:D10', activeCell: 'A1' },
        scopeInfo
      );

      expect(context.immediate.selectedData.length).toBe(4); // All rows in column B
      expect(context.immediate.selectedData[0][0].value).toBe('Header B');
      expect(context.immediate.selectedData[1][0].value).toBe(20);
      expect(context.immediate.selectedData[2][0].value).toBe(25);
      expect(context.immediate.selectedData[3][0].value).toBe(22);

      // Should identify that this is a column with header
      expect(context.structural.headers).toContain('Header B');
      expect(context.structural.dataTypes).toContain('text');
      expect(context.structural.dataTypes).toContain('number');
    });
  });

  describe('Context Relevance Scoring', () => {
    test('High relevance for direct formula dependencies', async () => {
      const formulaData = {
        sheets: [{
          name: 'Sheet1',
          data: [
            [{ value: 10, dataType: 'number' }, { value: 20, dataType: 'number' }, { value: '=A1+B1', dataType: 'formula' }]
          ],
          dimensions: { rows: 1, cols: 3 },
          formatting: []
        }],
        metadata: { fileName: 'test.xlsx', fileSize: 1234 },
        formulas: [
          { cell: 'C1', formula: '=A1+B1', dependencies: ['A1', 'B1'] }
        ],
        namedRanges: []
      };

      const scopeInfo = {
        targetRange: 'C1',
        relatedRanges: ['A1', 'B1'],
        analysisType: 'formula_assistance'
      };

      const context = await ContextExtractor.extractRelevantData(
        formulaData,
        { sheet: 'Sheet1', range: 'A1:D10', activeCell: 'A1' },
        scopeInfo
      );

      // Should have high relevance score for direct dependencies
      expect(context.relevanceScore).toBeGreaterThan(0.9);
      expect(context.related.precedentCells.length).toBe(2);
      expect(context.related.precedentCells.some(cell => cell.address === 'A1')).toBe(true);
      expect(context.related.precedentCells.some(cell => cell.address === 'B1')).toBe(true);
    });

    test('Medium relevance for indirect relationships', async () => {
      const indirectData = {
        sheets: [{
          name: 'Sheet1',
          data: [
            [{ value: 10, dataType: 'number' }, { value: 20, dataType: 'number' }, { value: '=A1+B1', dataType: 'formula' }, { value: '=C1*2', dataType: 'formula' }]
          ],
          dimensions: { rows: 1, cols: 4 },
          formatting: []
        }],
        metadata: { fileName: 'test.xlsx', fileSize: 1234 },
        formulas: [
          { cell: 'C1', formula: '=A1+B1', dependencies: ['A1', 'B1'] },
          { cell: 'D1', formula: '=C1*2', dependencies: ['C1'] }
        ],
        namedRanges: []
      };

      const scopeInfo = {
        targetRange: 'D1',
        relatedRanges: ['A1', 'B1', 'C1'],
        analysisType: 'formula_assistance'
      };

      const context = await ContextExtractor.extractRelevantData(
        formulaData,
        { sheet: 'Sheet1', range: 'A1:D10', activeCell: 'A1' },
        scopeInfo
      );

      // Should have medium relevance for indirect dependencies
      expect(context.relevanceScore).toBeGreaterThan(0.6);
      expect(context.relevanceScore).toBeLessThan(0.9);
    });

    test('Low relevance for unrelated data', async () => {
      const unrelatedData = {
        sheets: [{
          name: 'Sheet1',
          data: [
            [{ value: 10, dataType: 'number' }, { value: 20, dataType: 'number' }],
            [{ value: 'Text A', dataType: 'text' }, { value: 'Text B', dataType: 'text' }]
          ],
          dimensions: { rows: 2, cols: 2 },
          formatting: []
        }],
        metadata: { fileName: 'test.xlsx', fileSize: 1234 },
        formulas: [],
        namedRanges: []
      };

      const scopeInfo = {
        targetRange: 'A1',
        relatedRanges: ['A2', 'B2'], // Text data unrelated to numeric A1
        analysisType: 'data_analysis'
      };

      const context = await ContextExtractor.extractRelevantData(
        unrelatedData,
        { sheet: 'Sheet1', range: 'A1:D10', activeCell: 'A1' },
        scopeInfo
      );

      // Should have low relevance for unrelated data
      expect(context.relevanceScore).toBeLessThan(0.5);
    });
  });
});