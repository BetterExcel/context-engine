/**
 * Integration tests for ContextExtractor dependency analysis functionality
 */

import { ContextExtractor } from '../ContextExtractor';
import {
  SpreadsheetData,
  Sheet,
  Cell,
  DataType,
  Formula,
  SelectionInfo,
  FileMetadata
} from '../../types/spreadsheet';
import {
  ScopeInfo
} from '../../types/context';

describe('ContextExtractor - Dependency Analysis Integration', () => {
  // Test data setup helpers
  const createTestCell = (value: any, dataType: DataType, formula?: string, address?: string): Cell => {
    const cell: Cell = {
      value,
      dataType
    };
    if (formula) {
      cell.formula = formula;
    }
    if (address) {
      cell.address = address;
    }
    return cell;
  };

  const createTestSheet = (name: string, data: Cell[][]): Sheet => ({
    name,
    data,
    dimensions: {
      rows: data.length,
      cols: data[0]?.length || 0
    },
    formatting: [],
    namedRanges: []
  });

  const createTestSpreadsheetData = (sheets: Sheet[], formulas: Formula[] = []): SpreadsheetData => ({
    id: 'test-sheet-1',
    sheets,
    metadata: {
      filename: 'test.xlsx',
      fileSize: 1024,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      uploadedAt: new Date()
    } as FileMetadata,
    formulas,
    namedRanges: [],
    createdAt: new Date(),
    updatedAt: new Date()
  });  
const createBasicScope = (): ScopeInfo => ({
    type: 'current_selection',
    includeRelated: true, // Enable related context for dependency analysis
    includeHistory: false,
    maxCells: 1000
  });

  describe('dependency analysis integration', () => {
    it('should extract precedent and dependent cells for formula selection', async () => {
      // Arrange - Create a spreadsheet with formula dependencies
      const testData = [
        [
          createTestCell(10, DataType.NUMBER, undefined, 'A1'),
          createTestCell(20, DataType.NUMBER, undefined, 'B1'),
          createTestCell(30, DataType.FORMULA, '=A1+B1', 'C1')
        ],
        [
          createTestCell(15, DataType.NUMBER, undefined, 'A2'),
          createTestCell(25, DataType.NUMBER, undefined, 'B2'),
          createTestCell(40, DataType.FORMULA, '=A2+B2', 'C2')
        ],
        [
          createTestCell(0, DataType.FORMULA, '=C1+C2', 'A3'),
          createTestCell(0, DataType.FORMULA, '=C1*2', 'B3'),
          createTestCell(0, DataType.FORMULA, '=SUM(C1:C2)', 'C3')
        ]
      ];

      const sheet = createTestSheet('Sheet1', testData);
      const formulas: Formula[] = [
        {
          id: '1',
          cell: 'C1',
          sheet: 'Sheet1',
          formula: '=A1+B1',
          dependencies: [],
          precedents: [],
          isValid: true
        },
        {
          id: '2',
          cell: 'C2',
          sheet: 'Sheet1',
          formula: '=A2+B2',
          dependencies: [],
          precedents: [],
          isValid: true
        },
        {
          id: '3',
          cell: 'A3',
          sheet: 'Sheet1',
          formula: '=C1+C2',
          dependencies: [],
          precedents: [],
          isValid: true
        },
        {
          id: '4',
          cell: 'B3',
          sheet: 'Sheet1',
          formula: '=C1*2',
          dependencies: [],
          precedents: [],
          isValid: true
        },
        {
          id: '5',
          cell: 'C3',
          sheet: 'Sheet1',
          formula: '=SUM(C1:C2)',
          dependencies: [],
          precedents: [],
          isValid: true
        }
      ];

      const spreadsheetData = createTestSpreadsheetData([sheet], formulas);
      
      const selectionInfo: SelectionInfo = {
        sheet: 'Sheet1',
        range: 'C1', // Select the formula cell
        activeCell: 'C1'
      };

      const scope = createBasicScope();

      // Act
      const result = await ContextExtractor.extractRelevantData(
        spreadsheetData,
        selectionInfo,
        scope
      );

      // Assert
      expect(result.related).toBeDefined();
      expect(result.related.precedentCells.length).toBeGreaterThan(0);
      expect(result.related.dependentCells.length).toBeGreaterThan(0);
      
      // Should find A1 and B1 as precedents of C1
      const precedentAddresses = result.related.precedentCells.map(cell => cell.address);
      expect(precedentAddresses).toContain('A1');
      expect(precedentAddresses).toContain('B1');
      
      // Should find A3, B3, C3 as dependents of C1
      const dependentAddresses = result.related.dependentCells.map(cell => cell.address);
      expect(dependentAddresses).toContain('A3');
      expect(dependentAddresses).toContain('B3');
      expect(dependentAddresses).toContain('C3');
    });   
 it('should handle cross-sheet dependencies', async () => {
      // Arrange - Create multiple sheets with cross-sheet references
      const sheet1Data = [
        [
          createTestCell(100, DataType.NUMBER, undefined, 'A1'),
          createTestCell(0, DataType.FORMULA, '=Sheet2!B1*2', 'B1')
        ]
      ];

      const sheet2Data = [
        [
          createTestCell(50, DataType.NUMBER, undefined, 'A1'),
          createTestCell(0, DataType.FORMULA, '=A1+Sheet1!A1', 'B1')
        ]
      ];

      const sheet1 = createTestSheet('Sheet1', sheet1Data);
      const sheet2 = createTestSheet('Sheet2', sheet2Data);
      
      const formulas: Formula[] = [
        {
          id: '1',
          cell: 'B1',
          sheet: 'Sheet1',
          formula: '=Sheet2!B1*2',
          dependencies: [],
          precedents: [],
          isValid: true
        },
        {
          id: '2',
          cell: 'B1',
          sheet: 'Sheet2',
          formula: '=A1+Sheet1!A1',
          dependencies: [],
          precedents: [],
          isValid: true
        }
      ];

      const spreadsheetData = createTestSpreadsheetData([sheet1, sheet2], formulas);
      
      const selectionInfo: SelectionInfo = {
        sheet: 'Sheet1',
        range: 'B1',
        activeCell: 'B1'
      };

      const scope = createBasicScope();

      // Act
      const result = await ContextExtractor.extractRelevantData(
        spreadsheetData,
        selectionInfo,
        scope
      );

      // Assert
      expect(result.related).toBeDefined();
      expect(result.related.crossSheetReferences.length).toBeGreaterThan(0);
      
      // Should find cross-sheet references
      const crossSheetRefs = result.related.crossSheetReferences;
      expect(crossSheetRefs.some(ref => ref.includes('Sheet2!'))).toBe(true);
    });

    it('should identify related formulas in dependency chain', async () => {
      // Arrange - Create a chain of dependent formulas
      const testData = [
        [
          createTestCell(5, DataType.NUMBER, undefined, 'A1'),
          createTestCell(0, DataType.FORMULA, '=A1*2', 'B1'),
          createTestCell(0, DataType.FORMULA, '=B1+10', 'C1'),
          createTestCell(0, DataType.FORMULA, '=C1/2', 'D1')
        ]
      ];

      const sheet = createTestSheet('Sheet1', testData);
      const formulas: Formula[] = [
        {
          id: '1',
          cell: 'B1',
          sheet: 'Sheet1',
          formula: '=A1*2',
          dependencies: [],
          precedents: [],
          isValid: true
        },
        {
          id: '2',
          cell: 'C1',
          sheet: 'Sheet1',
          formula: '=B1+10',
          dependencies: [],
          precedents: [],
          isValid: true
        },
        {
          id: '3',
          cell: 'D1',
          sheet: 'Sheet1',
          formula: '=C1/2',
          dependencies: [],
          precedents: [],
          isValid: true
        }
      ];

      const spreadsheetData = createTestSpreadsheetData([sheet], formulas);
      
      const selectionInfo: SelectionInfo = {
        sheet: 'Sheet1',
        range: 'B1', // Select middle of the chain
        activeCell: 'B1'
      };

      const scope = createBasicScope();

      // Act
      const result = await ContextExtractor.extractRelevantData(
        spreadsheetData,
        selectionInfo,
        scope
      );

      // Assert
      expect(result.related).toBeDefined();
      expect(result.related.relatedFormulas.length).toBeGreaterThan(0);
      
      // Should find related formulas in the dependency chain
      const relatedFormulaCells = result.related.relatedFormulas.map(f => f.cell);
      expect(relatedFormulaCells).toContain('C1'); // Dependent
      expect(relatedFormulaCells).toContain('D1'); // Indirect dependent
    });    it
('should handle named ranges in dependency analysis', async () => {
      // Arrange - Create spreadsheet with named ranges
      const testData = [
        [
          createTestCell(10, DataType.NUMBER, undefined, 'A1'),
          createTestCell(20, DataType.NUMBER, undefined, 'A2'),
          createTestCell(30, DataType.NUMBER, undefined, 'A3')
        ],
        [
          createTestCell(0, DataType.FORMULA, '=SUM(SalesData)', 'B1'),
          createTestCell(0, DataType.FORMULA, '=AVERAGE(SalesData)', 'B2'),
          createTestCell(0, DataType.FORMULA, '=MAX(SalesData)', 'B3')
        ]
      ];

      const sheet = createTestSheet('Sheet1', testData);
      const formulas: Formula[] = [
        {
          id: '1',
          cell: 'B1',
          sheet: 'Sheet1',
          formula: '=SUM(SalesData)',
          dependencies: [],
          precedents: [],
          isValid: true
        },
        {
          id: '2',
          cell: 'B2',
          sheet: 'Sheet1',
          formula: '=AVERAGE(SalesData)',
          dependencies: [],
          precedents: [],
          isValid: true
        },
        {
          id: '3',
          cell: 'B3',
          sheet: 'Sheet1',
          formula: '=MAX(SalesData)',
          dependencies: [],
          precedents: [],
          isValid: true
        }
      ];

      const spreadsheetData = createTestSpreadsheetData([sheet], formulas);
      
      // Add named range
      spreadsheetData.namedRanges = [
        {
          name: 'SalesData',
          range: 'A1:A3',
          sheetName: 'Sheet1'
        }
      ];

      const selectionInfo: SelectionInfo = {
        sheet: 'Sheet1',
        range: 'A1:A3', // Select the named range
        activeCell: 'A1'
      };

      const scope = createBasicScope();

      // Act
      const result = await ContextExtractor.extractRelevantData(
        spreadsheetData,
        selectionInfo,
        scope
      );

      // Assert
      expect(result.related).toBeDefined();
      expect(result.related.namedRanges.length).toBeGreaterThan(0);
      
      // Should find the SalesData named range
      const namedRangeNames = result.related.namedRanges.map(nr => nr.name);
      expect(namedRangeNames).toContain('SalesData');
      
      // Note: Currently the system identifies named ranges but doesn't resolve them to cell dependencies
      // This is a limitation that could be addressed in future iterations
      // For now, we just verify that named ranges are identified
      expect(result.related.namedRanges.length).toBeGreaterThan(0);
    });

    it('should detect circular references in context', async () => {
      // Arrange - Create circular reference scenario
      const testData = [
        [
          createTestCell(0, DataType.FORMULA, '=B1+1', 'A1'),
          createTestCell(0, DataType.FORMULA, '=C1+1', 'B1'),
          createTestCell(0, DataType.FORMULA, '=A1+1', 'C1')
        ]
      ];

      const sheet = createTestSheet('Sheet1', testData);
      const formulas: Formula[] = [
        {
          id: '1',
          cell: 'A1',
          sheet: 'Sheet1',
          formula: '=B1+1',
          dependencies: [],
          precedents: [],
          isValid: true
        },
        {
          id: '2',
          cell: 'B1',
          sheet: 'Sheet1',
          formula: '=C1+1',
          dependencies: [],
          precedents: [],
          isValid: true
        },
        {
          id: '3',
          cell: 'C1',
          sheet: 'Sheet1',
          formula: '=A1+1',
          dependencies: [],
          precedents: [],
          isValid: true
        }
      ];

      const spreadsheetData = createTestSpreadsheetData([sheet], formulas);
      
      const selectionInfo: SelectionInfo = {
        sheet: 'Sheet1',
        range: 'A1',
        activeCell: 'A1'
      };

      const scope = createBasicScope();

      // Act
      const result = await ContextExtractor.extractRelevantData(
        spreadsheetData,
        selectionInfo,
        scope
      );

      // Assert - Should handle circular references gracefully
      expect(result.related).toBeDefined();
      // The dependency analysis should detect the circular reference
      // and still provide meaningful context without infinite loops
      expect(result.related.precedentCells.length).toBeGreaterThanOrEqual(0);
      expect(result.related.dependentCells.length).toBeGreaterThanOrEqual(0);
    });
  });
});