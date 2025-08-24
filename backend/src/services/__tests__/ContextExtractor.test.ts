/**
 * Unit tests for ContextExtractor service
 */

import { ContextExtractor, ContextExtractionError } from '../ContextExtractor';
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

describe('ContextExtractor', () => {
  // Test data setup
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
    includeRelated: false,
    includeHistory: false,
    maxCells: 1000
  });

  describe('extractRelevantData', () => {
    it('should extract basic context for a simple selection', async () => {
      // Arrange
      const testData = [
        [
          createTestCell('Name', DataType.TEXT, undefined, 'A1'),
          createTestCell('Age', DataType.TEXT, undefined, 'B1'),
          createTestCell('Score', DataType.TEXT, undefined, 'C1')
        ],
        [
          createTestCell('John', DataType.TEXT, undefined, 'A2'),
          createTestCell(25, DataType.NUMBER, undefined, 'B2'),
          createTestCell(85.5, DataType.NUMBER, undefined, 'C2')
        ],
        [
          createTestCell('Jane', DataType.TEXT, undefined, 'A3'),
          createTestCell(30, DataType.NUMBER, undefined, 'B3'),
          createTestCell(92.0, DataType.NUMBER, undefined, 'C3')
        ]
      ];

      const sheet = createTestSheet('Sheet1', testData);
      const spreadsheetData = createTestSpreadsheetData([sheet]);
      
      const selectionInfo: SelectionInfo = {
        sheet: 'Sheet1',
        range: 'A1:C3',
        activeCell: 'B2'
      };

      const scope = createBasicScope();

      // Act
      const result = await ContextExtractor.extractRelevantData(
        spreadsheetData,
        selectionInfo,
        scope
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.immediate).toBeDefined();
      expect(result.immediate.selectedData).toHaveLength(3);
      expect(result.immediate.selectedData[0]).toHaveLength(3);
      expect(result.immediate.activeCell.value).toBe(25);
      expect(result.immediate.activeCell.dataType).toBe(DataType.NUMBER);
      
      expect(result.structural).toBeDefined();
      expect(result.structural.rowCount).toBe(3);
      expect(result.structural.columnCount).toBe(3);
      expect(result.structural.headers).toEqual(['Name', 'Age', 'Score']);
      
      expect(result.summary).toBeDefined();
      expect(result.summary.cellCount).toBe(9);
      expect(result.summary.emptyCount).toBe(0);
      
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.generatedAt).toBeInstanceOf(Date);
    });

    it('should handle single cell selection', async () => {
      // Arrange
      const testData = [
        [createTestCell('Hello', DataType.TEXT, undefined, 'A1')]
      ];

      const sheet = createTestSheet('Sheet1', testData);
      const spreadsheetData = createTestSpreadsheetData([sheet]);
      
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

      // Assert
      expect(result.immediate.selectedData).toHaveLength(1);
      expect(result.immediate.selectedData[0]).toHaveLength(1);
      expect(result.immediate.selectedData[0]?.[0]?.value).toBe('Hello');
      expect(result.structural.rowCount).toBe(1);
      expect(result.structural.columnCount).toBe(1);
    });

    it('should handle empty cells in selection', async () => {
      // Arrange
      const testData = [
        [
          createTestCell('A', DataType.TEXT, undefined, 'A1'),
          createTestCell(null, DataType.EMPTY, undefined, 'B1'),
          createTestCell('C', DataType.TEXT, undefined, 'C1')
        ]
      ];

      const sheet = createTestSheet('Sheet1', testData);
      const spreadsheetData = createTestSpreadsheetData([sheet]);
      
      const selectionInfo: SelectionInfo = {
        sheet: 'Sheet1',
        range: 'A1:C1',
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
      expect(result.summary.emptyCount).toBe(1);
      expect(result.patterns.dataPatterns).toHaveLength(1);
      expect(result.patterns.dataPatterns[0]?.type).toBe('missing_data');
    });

    it('should handle formulas in selection', async () => {
      // Arrange
      const testData = [
        [
          createTestCell(10, DataType.NUMBER, undefined, 'A1'),
          createTestCell(20, DataType.NUMBER, undefined, 'B1'),
          createTestCell(30, DataType.FORMULA, '=A1+B1', 'C1')
        ]
      ];

      const sheet = createTestSheet('Sheet1', testData);
      const formulas: Formula[] = [
        {
          id: 'Sheet1_C1',
          cell: 'C1',
          sheet: 'Sheet1',
          formula: '=A1+B1',
          dependencies: ['A1', 'B1'],
          precedents: [],
          isValid: true
        }
      ];
      const spreadsheetData = createTestSpreadsheetData([sheet], formulas);
      
      const selectionInfo: SelectionInfo = {
        sheet: 'Sheet1',
        range: 'A1:C1',
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
      expect(result.immediate.currentFormulas).toHaveLength(1);
      expect(result.immediate.currentFormulas[0]?.formula).toBe('=A1+B1');
      expect(result.structural.hasFormulas).toBe(true);
      expect(result.summary.formulaCount).toBe(1);
    });

    it('should include statistics when requested', async () => {
      // Arrange
      const testData = [
        [createTestCell(10, DataType.NUMBER, undefined, 'A1')],
        [createTestCell(20, DataType.NUMBER, undefined, 'A2')],
        [createTestCell(30, DataType.NUMBER, undefined, 'A3')]
      ];

      const sheet = createTestSheet('Sheet1', testData);
      const spreadsheetData = createTestSpreadsheetData([sheet]);
      
      const selectionInfo: SelectionInfo = {
        sheet: 'Sheet1',
        range: 'A1:A3',
        activeCell: 'A1'
      };

      const scope = createBasicScope();

      // Act
      const result = await ContextExtractor.extractRelevantData(
        spreadsheetData,
        selectionInfo,
        scope,
        { includeStatistics: true }
      );

      // Assert
      expect(result.summary.statistics).toBeDefined();
      expect(result.summary.statistics?.['hasNumericData']).toBe(true);
      expect(result.summary.statistics?.['count']).toBe(3);
      expect(result.summary.statistics?.['sum']).toBe(60);
      expect(result.summary.statistics?.['mean']).toBe(20);
      expect(result.summary.statistics?.['min']).toBe(10);
      expect(result.summary.statistics?.['max']).toBe(30);
    });

    it('should respect maxCells limit', async () => {
      // Arrange
      const testData = Array.from({ length: 10 }, (_, row) =>
        Array.from({ length: 10 }, (_, col) =>
          createTestCell(`R${row}C${col}`, DataType.TEXT, undefined, `${String.fromCharCode(65 + col)}${row + 1}`)
        )
      );

      const sheet = createTestSheet('Sheet1', testData);
      const spreadsheetData = createTestSpreadsheetData([sheet]);
      
      const selectionInfo: SelectionInfo = {
        sheet: 'Sheet1',
        range: 'A1:J10',
        activeCell: 'A1'
      };

      const scope: ScopeInfo = {
        type: 'current_selection',
        includeRelated: false,
        includeHistory: false,
        maxCells: 50
      };

      // Act
      const result = await ContextExtractor.extractRelevantData(
        spreadsheetData,
        selectionInfo,
        scope
      );

      // Assert
      const totalSelectedCells = result.immediate.selectedData.flat().length;
      expect(totalSelectedCells).toBeLessThanOrEqual(50);
    });

    it('should throw error for non-existent sheet', async () => {
      // Arrange
      const sheet = createTestSheet('Sheet1', []);
      const spreadsheetData = createTestSpreadsheetData([sheet]);
      
      const selectionInfo: SelectionInfo = {
        sheet: 'NonExistentSheet',
        range: 'A1:A1',
        activeCell: 'A1'
      };

      const scope = createBasicScope();

      // Act & Assert
      await expect(async () => {
        await ContextExtractor.extractRelevantData(
          spreadsheetData,
          selectionInfo,
          scope
        );
      }).rejects.toThrow(ContextExtractionError);
    });

    it('should detect mixed data types pattern', async () => {
      // Arrange
      const testData = [
        [
          createTestCell('Text', DataType.TEXT, undefined, 'A1'),
          createTestCell(123, DataType.NUMBER, undefined, 'B1'),
          createTestCell(true, DataType.BOOLEAN, undefined, 'C1')
        ]
      ];

      const sheet = createTestSheet('Sheet1', testData);
      const spreadsheetData = createTestSpreadsheetData([sheet]);
      
      const selectionInfo: SelectionInfo = {
        sheet: 'Sheet1',
        range: 'A1:C1',
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
      expect(result.patterns.dataPatterns.some(p => p.type === 'outlier')).toBe(true);
      expect(result.structural.dataTypes).toContain(DataType.TEXT);
      expect(result.structural.dataTypes).toContain(DataType.NUMBER);
      expect(result.structural.dataTypes).toContain(DataType.BOOLEAN);
    });

    it('should analyze column information correctly', async () => {
      // Arrange
      const testData = [
        [
          createTestCell('Name', DataType.TEXT, undefined, 'A1'),
          createTestCell('Score', DataType.TEXT, undefined, 'B1')
        ],
        [
          createTestCell('John', DataType.TEXT, undefined, 'A2'),
          createTestCell(85, DataType.NUMBER, undefined, 'B2')
        ],
        [
          createTestCell('Jane', DataType.TEXT, undefined, 'A3'),
          createTestCell(92, DataType.NUMBER, undefined, 'B3')
        ]
      ];

      const sheet = createTestSheet('Sheet1', testData);
      const spreadsheetData = createTestSpreadsheetData([sheet]);
      
      const selectionInfo: SelectionInfo = {
        sheet: 'Sheet1',
        range: 'A1:B3',
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
      expect(result.structural.sheetStructure.dataColumns).toHaveLength(2);
      
      const nameColumn = result.structural.sheetStructure.dataColumns[0];
      expect(nameColumn?.header).toBe('Name');
      expect(nameColumn?.dataType).toBe(DataType.TEXT);
      expect(nameColumn?.isEmpty).toBe(false);
      expect(nameColumn?.hasFormulas).toBe(false);
      
      const scoreColumn = result.structural.sheetStructure.dataColumns[1];
      expect(scoreColumn?.header).toBe('Score');
      expect(scoreColumn?.dataType).toBe(DataType.NUMBER);
      expect(scoreColumn?.isEmpty).toBe(false);
      expect(scoreColumn?.hasFormulas).toBe(false);
    });

    it('should handle out-of-bounds cell access gracefully', async () => {
      // Arrange
      const testData = [
        [createTestCell('A1', DataType.TEXT, undefined, 'A1')]
      ];

      const sheet = createTestSheet('Sheet1', testData);
      const spreadsheetData = createTestSpreadsheetData([sheet]);
      
      const selectionInfo: SelectionInfo = {
        sheet: 'Sheet1',
        range: 'A1:C3', // Extends beyond actual data
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
      expect(result.immediate.selectedData).toHaveLength(3);
      expect(result.immediate.selectedData[0]).toHaveLength(3);
      
      // Check that out-of-bounds cells are treated as empty
      expect(result.immediate.selectedData[0]?.[1]?.dataType).toBe(DataType.EMPTY);
      expect(result.immediate.selectedData[1]?.[0]?.dataType).toBe(DataType.EMPTY);
    });

    it('should include visible data around selection', async () => {
      // Arrange
      const testData = Array.from({ length: 20 }, (_, row) =>
        Array.from({ length: 10 }, (_, col) =>
          createTestCell(`R${row}C${col}`, DataType.TEXT, undefined, `${String.fromCharCode(65 + col)}${row + 1}`)
        )
      );

      const sheet = createTestSheet('Sheet1', testData);
      const spreadsheetData = createTestSpreadsheetData([sheet]);
      
      const selectionInfo: SelectionInfo = {
        sheet: 'Sheet1',
        range: 'E5:F6', // Small selection in middle of data
        activeCell: 'E5'
      };

      const scope = createBasicScope();

      // Act
      const result = await ContextExtractor.extractRelevantData(
        spreadsheetData,
        selectionInfo,
        scope
      );

      // Assert
      expect(result.immediate.selectedData).toHaveLength(2); // 2 rows selected
      expect(result.immediate.selectedData[0]).toHaveLength(2); // 2 cols selected
      
      // Visible data should be larger than selection (includes buffer)
      const visibleCellCount = result.immediate.visibleData.flat().length;
      const selectedCellCount = result.immediate.selectedData.flat().length;
      expect(visibleCellCount).toBeGreaterThan(selectedCellCount);
    });
  });

  describe('error handling', () => {
    it('should throw ContextExtractionError for invalid range format', async () => {
      // Arrange
      const sheet = createTestSheet('Sheet1', [[createTestCell('A1', DataType.TEXT)]]);
      const spreadsheetData = createTestSpreadsheetData([sheet]);
      
      const selectionInfo: SelectionInfo = {
        sheet: 'Sheet1',
        range: 'INVALID_RANGE',
        activeCell: 'A1'
      };

      const scope = createBasicScope();

      // Act & Assert
      await expect(async () => {
        await ContextExtractor.extractRelevantData(
          spreadsheetData,
          selectionInfo,
          scope
        );
      }).rejects.toThrow(ContextExtractionError);
    });

    it('should throw ContextExtractionError for invalid cell address', async () => {
      // Arrange
      const sheet = createTestSheet('Sheet1', [[createTestCell('A1', DataType.TEXT)]]);
      const spreadsheetData = createTestSpreadsheetData([sheet]);
      
      const selectionInfo: SelectionInfo = {
        sheet: 'Sheet1',
        range: 'A1',
        activeCell: 'INVALID_CELL'
      };

      const scope = createBasicScope();

      // Act & Assert
      await expect(async () => {
        await ContextExtractor.extractRelevantData(
          spreadsheetData,
          selectionInfo,
          scope
        );
      }).rejects.toThrow(ContextExtractionError);
    });
  });

  describe('scope detection', () => {
    it('should handle different scope types', async () => {
      // Arrange
      const testData = [
        [createTestCell('Test', DataType.TEXT, undefined, 'A1')]
      ];

      const sheet = createTestSheet('Sheet1', testData);
      const spreadsheetData = createTestSpreadsheetData([sheet]);
      
      const selectionInfo: SelectionInfo = {
        sheet: 'Sheet1',
        range: 'A1',
        activeCell: 'A1'
      };

      // Test different scope types
      const scopes: ScopeInfo[] = [
        { type: 'current_selection', includeRelated: false, includeHistory: false },
        { type: 'sheet', includeRelated: true, includeHistory: false },
        { type: 'workbook', includeRelated: false, includeHistory: true }
      ];

      // Act & Assert
      for (const scope of scopes) {
        const result = await ContextExtractor.extractRelevantData(
          spreadsheetData,
          selectionInfo,
          scope
        );
        
        expect(result).toBeDefined();
        expect(result.immediate).toBeDefined();
        expect(result.structural).toBeDefined();
      }
    });
  });

  describe('data type analysis', () => {
    it('should correctly identify all data types', async () => {
      // Arrange
      const testData = [
        [
          createTestCell('Text', DataType.TEXT, undefined, 'A1'),
          createTestCell(123, DataType.NUMBER, undefined, 'B1'),
          createTestCell(true, DataType.BOOLEAN, undefined, 'C1'),
          createTestCell(new Date(), DataType.DATE, undefined, 'D1'),
          createTestCell(null, DataType.EMPTY, undefined, 'E1'),
          createTestCell('#ERROR!', DataType.ERROR, undefined, 'F1'),
          createTestCell(456, DataType.FORMULA, '=B1*2', 'G1')
        ]
      ];

      const sheet = createTestSheet('Sheet1', testData);
      const spreadsheetData = createTestSpreadsheetData([sheet]);
      
      const selectionInfo: SelectionInfo = {
        sheet: 'Sheet1',
        range: 'A1:G1',
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
      expect(result.summary.dataTypes[DataType.TEXT]).toBe(1);
      expect(result.summary.dataTypes[DataType.NUMBER]).toBe(1);
      expect(result.summary.dataTypes[DataType.BOOLEAN]).toBe(1);
      expect(result.summary.dataTypes[DataType.DATE]).toBe(1);
      expect(result.summary.dataTypes[DataType.EMPTY]).toBe(1);
      expect(result.summary.dataTypes[DataType.ERROR]).toBe(1);
      expect(result.summary.dataTypes[DataType.FORMULA]).toBe(1);
    });
  });
});