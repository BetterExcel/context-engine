import { AutoSelectionManager, DefaultSelectionConfig } from '../AutoSelectionManager';
import { SpreadsheetData, Sheet, Cell, DataType } from '../../types';

describe('AutoSelectionManager', () => {
  let manager: AutoSelectionManager;
  let mockSpreadsheetData: SpreadsheetData;

  // Helper function to create a cell
  const createCell = (value: any, dataType: DataType = DataType.TEXT): Cell => ({
    value,
    dataType,
  });

  // Helper function to create a sheet with data
  const createSheet = (name: string, data: Cell[][]): Sheet => ({
    name,
    data,
    dimensions: {
      rows: data.length,
      cols: data.length > 0 ? Math.max(...data.map(row => row.length)) : 0
    },
    formatting: [],
    namedRanges: []
  });

  beforeEach(() => {
    manager = new AutoSelectionManager();
    
    // Create mock spreadsheet data
    mockSpreadsheetData = {
      id: 'test-spreadsheet',
      sheets: [
        createSheet('Sheet1', [
          [createCell('Name'), createCell('Age'), createCell('City')],
          [createCell('John'), createCell(25, DataType.NUMBER), createCell('New York')],
          [createCell('Jane'), createCell(30, DataType.NUMBER), createCell('Boston')],
          [createCell('Bob'), createCell(35, DataType.NUMBER), createCell('Chicago')]
        ]),
        createSheet('Sheet2', [
          [createCell('Product'), createCell('Price')],
          [createCell('Apple'), createCell(1.50, DataType.NUMBER)],
          [createCell('Banana'), createCell(0.75, DataType.NUMBER)]
        ])
      ],
      metadata: {
        filename: 'test.xlsx',
        fileSize: 1024,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        uploadedAt: new Date()
      },
      formulas: [],
      namedRanges: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      expect(manager).toBeDefined();
    });

    it('should initialize with custom config', () => {
      const customConfig: Partial<DefaultSelectionConfig> = {
        maxCells: 50000,
        minimumRange: 'A1:E10'
      };
      
      const customManager = new AutoSelectionManager(customConfig);
      expect(customManager).toBeDefined();
    });

    it('should initialize spreadsheet data and calculate default selections', () => {
      manager.initialize(mockSpreadsheetData);
      
      // Should have selections for both sheets
      const sheet1Selection = manager.getActiveSelection(0);
      const sheet2Selection = manager.getActiveSelection(1);
      
      expect(sheet1Selection).toBeDefined();
      expect(sheet2Selection).toBeDefined();
      expect(sheet1Selection?.isManual).toBe(false);
      expect(sheet2Selection?.isManual).toBe(false);
    });
  });

  describe('calculateDefaultSelection', () => {
    beforeEach(() => {
      manager.initialize(mockSpreadsheetData);
    });

    it('should calculate correct range for sheet with headers', () => {
      const range = manager.calculateDefaultSelection(0);
      expect(range).toBe('A1:C4'); // Name,Age,City + 3 data rows
    });

    it('should calculate correct range for smaller sheet', () => {
      const range = manager.calculateDefaultSelection(1);
      expect(range).toBe('A1:B3'); // Product,Price + 2 data rows
    });

    it('should return minimum range for invalid sheet index', () => {
      const range = manager.calculateDefaultSelection(99);
      expect(range).toBe('A1:J20'); // Default minimum range
    });

    it('should handle empty sheet', () => {
      const emptySheet = createSheet('Empty', []);
      mockSpreadsheetData.sheets.push(emptySheet);
      manager.initialize(mockSpreadsheetData);
      
      const range = manager.calculateDefaultSelection(2);
      expect(range).toBe('A1:J20'); // Default minimum range
    });

    it('should handle sheet with sparse data', () => {
      const sparseData = [
        [createCell(''), createCell(''), createCell('Header')],
        [createCell(''), createCell(''), createCell('')],
        [createCell(''), createCell(''), createCell('Data')]
      ];
      const sparseSheet = createSheet('Sparse', sparseData);
      mockSpreadsheetData.sheets.push(sparseSheet);
      manager.initialize(mockSpreadsheetData);
      
      const range = manager.calculateDefaultSelection(2);
      expect(range).toBe('C1:C3'); // Only column C has data
    });

    it('should limit range size for very large datasets', () => {
      // Create a large dataset that would exceed maxCells
      const customManager = new AutoSelectionManager({ maxCells: 100 });
      
      // Create large data (20 rows x 10 cols = 200 cells, exceeds limit of 100)
      const largeData: Cell[][] = [];
      for (let row = 0; row < 20; row++) {
        const rowData: Cell[] = [];
        for (let col = 0; col < 10; col++) {
          rowData.push(createCell(`R${row}C${col}`));
        }
        largeData.push(rowData);
      }
      
      const largeSheet = createSheet('Large', largeData);
      const largeSpreadsheetData = {
        ...mockSpreadsheetData,
        sheets: [largeSheet]
      };
      
      customManager.initialize(largeSpreadsheetData);
      const range = customManager.calculateDefaultSelection(0);
      
      // Should be limited to fit within 100 cells (10 rows x 10 cols = 100 cells)
      expect(range).toBe('A1:J10');
    });
  });

  describe('selection state management', () => {
    beforeEach(() => {
      manager.initialize(mockSpreadsheetData);
    });

    it('should track manual user selections', () => {
      manager.updateUserSelection(0, 'B2:C3', true);
      
      const selection = manager.getActiveSelection(0);
      expect(selection?.range).toBe('B2:C3');
      expect(selection?.isManual).toBe(true);
      expect(selection?.sheetIndex).toBe(0);
    });

    it('should distinguish between manual and automatic selections', () => {
      // Initial selection should be automatic
      expect(manager.isManualSelection(0)).toBe(false);
      
      // Update to manual selection
      manager.updateUserSelection(0, 'A1:A1', true);
      expect(manager.isManualSelection(0)).toBe(true);
      
      // Reset to default (automatic)
      manager.resetSheetToDefault(0);
      expect(manager.isManualSelection(0)).toBe(false);
    });

    it('should get current range for sheet', () => {
      const initialRange = manager.getCurrentRange(0);
      expect(initialRange).toBe('A1:C4');
      
      manager.updateUserSelection(0, 'B1:B2');
      const updatedRange = manager.getCurrentRange(0);
      expect(updatedRange).toBe('B1:B2');
    });

    it('should reset selections to defaults', () => {
      // Make manual selections
      manager.updateUserSelection(0, 'A1:A1');
      manager.updateUserSelection(1, 'B1:B1');
      
      expect(manager.isManualSelection(0)).toBe(true);
      expect(manager.isManualSelection(1)).toBe(true);
      
      // Reset all to defaults
      manager.resetToDefaults();
      
      expect(manager.isManualSelection(0)).toBe(false);
      expect(manager.isManualSelection(1)).toBe(false);
      expect(manager.getCurrentRange(0)).toBe('A1:C4');
      expect(manager.getCurrentRange(1)).toBe('A1:B3');
    });

    it('should reset individual sheet to default', () => {
      manager.updateUserSelection(0, 'A1:A1');
      expect(manager.isManualSelection(0)).toBe(true);
      
      const newRange = manager.resetSheetToDefault(0);
      expect(newRange).toBe('A1:C4');
      expect(manager.isManualSelection(0)).toBe(false);
    });
  });

  describe('selection analysis', () => {
    beforeEach(() => {
      manager.initialize(mockSpreadsheetData);
    });

    it('should identify entire data range selections', () => {
      const defaultRange = manager.getCurrentRange(0);
      expect(manager.isEntireDataRange(0, defaultRange)).toBe(true);
      
      // Partial selection should not be entire range
      expect(manager.isEntireDataRange(0, 'A1:B2')).toBe(false);
    });

    it('should provide selection summary', () => {
      const summary = manager.getSelectionSummary(0);
      
      expect(summary.range).toBe('A1:C4');
      expect(summary.isManual).toBe(false);
      expect(summary.isEntireRange).toBe(true);
      expect(summary.cellCount).toBe(12); // 4 rows x 3 cols
      expect(summary.hasHeaders).toBe(true);
    });

    it('should provide summary for manual selection', () => {
      manager.updateUserSelection(0, 'B2:C3');
      const summary = manager.getSelectionSummary(0);
      
      expect(summary.range).toBe('B2:C3');
      expect(summary.isManual).toBe(true);
      expect(summary.isEntireRange).toBe(false);
      expect(summary.cellCount).toBe(4); // 2 rows x 2 cols
    });
  });

  describe('header detection', () => {
    it('should detect headers in typical data', () => {
      manager.initialize(mockSpreadsheetData);
      const summary = manager.getSelectionSummary(0);
      expect(summary.hasHeaders).toBe(true);
    });

    it('should not detect headers when first row is numeric', () => {
      const numericFirstRow = [
        [createCell(1, DataType.NUMBER), createCell(2, DataType.NUMBER), createCell(3, DataType.NUMBER)],
        [createCell(4, DataType.NUMBER), createCell(5, DataType.NUMBER), createCell(6, DataType.NUMBER)],
        [createCell(7, DataType.NUMBER), createCell(8, DataType.NUMBER), createCell(9, DataType.NUMBER)]
      ];
      
      const numericSheet = createSheet('Numeric', numericFirstRow);
      const numericData = {
        ...mockSpreadsheetData,
        sheets: [numericSheet]
      };
      
      manager.initialize(numericData);
      const summary = manager.getSelectionSummary(0);
      expect(summary.hasHeaders).toBe(false);
    });

    it('should handle single row data', () => {
      const singleRowData = [
        [createCell('Only'), createCell('One'), createCell('Row')]
      ];
      
      const singleRowSheet = createSheet('SingleRow', singleRowData);
      const singleRowSpreadsheetData = {
        ...mockSpreadsheetData,
        sheets: [singleRowSheet]
      };
      
      manager.initialize(singleRowSpreadsheetData);
      const summary = manager.getSelectionSummary(0);
      expect(summary.hasHeaders).toBe(false); // Can't determine headers with only one row
    });
  });

  describe('error handling', () => {
    it('should handle invalid range formats gracefully', () => {
      manager.initialize(mockSpreadsheetData);
      
      // This should not throw an error
      expect(manager.isEntireDataRange(0, 'invalid-range')).toBe(false);
    });

    it('should handle missing spreadsheet data', () => {
      // Don't initialize with data
      const range = manager.calculateDefaultSelection(0);
      expect(range).toBe('A1:J20'); // Should return minimum range
    });

    it('should handle empty selection states', () => {
      const selection = manager.getActiveSelection(0);
      expect(selection).toBeNull();
      
      const range = manager.getCurrentRange(0);
      expect(range).toBe('A1:J20'); // Should return minimum range
    });
  });

  describe('state persistence', () => {
    beforeEach(() => {
      manager.initialize(mockSpreadsheetData);
    });

    it('should provide all selection states', () => {
      manager.updateUserSelection(0, 'A1:B2');
      manager.updateUserSelection(1, 'C1:D2');
      
      const allStates = manager.getAllSelectionStates();
      expect(allStates.size).toBe(2);
      expect(allStates.get(0)?.range).toBe('A1:B2');
      expect(allStates.get(1)?.range).toBe('C1:D2');
    });

    it('should maintain timestamps for selections', () => {
      const beforeTime = new Date();
      manager.updateUserSelection(0, 'A1:B2');
      const afterTime = new Date();
      
      const selection = manager.getActiveSelection(0);
      expect(selection?.timestamp).toBeDefined();
      expect(selection!.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(selection!.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  describe('boundary analysis edge cases', () => {
    it('should handle sheets with only empty cells', () => {
      const emptyData = [
        [createCell('', DataType.EMPTY), createCell('', DataType.EMPTY)],
        [createCell('', DataType.EMPTY), createCell('', DataType.EMPTY)]
      ];
      
      const emptySheet = createSheet('Empty', emptyData);
      const emptySpreadsheetData = {
        ...mockSpreadsheetData,
        sheets: [emptySheet]
      };
      
      manager.initialize(emptySpreadsheetData);
      const range = manager.calculateDefaultSelection(0);
      expect(range).toBe('A1:J20'); // Should fall back to minimum range
    });

    it('should handle sheets with data in bottom-right corner', () => {
      const cornerData: Cell[][] = [];
      
      // Create 5x5 grid with data only in bottom-right corner
      for (let row = 0; row < 5; row++) {
        const rowData: Cell[] = [];
        for (let col = 0; col < 5; col++) {
          if (row === 4 && col === 4) {
            rowData.push(createCell('Data'));
          } else {
            rowData.push(createCell('', DataType.EMPTY));
          }
        }
        cornerData.push(rowData);
      }
      
      const cornerSheet = createSheet('Corner', cornerData);
      const cornerSpreadsheetData = {
        ...mockSpreadsheetData,
        sheets: [cornerSheet]
      };
      
      manager.initialize(cornerSpreadsheetData);
      const range = manager.calculateDefaultSelection(0);
      expect(range).toBe('E5:E5'); // Should select only the cell with data
    });

    it('should handle very wide spreadsheets', () => {
      // Create data that spans many columns
      const wideData = [
        Array.from({ length: 50 }, (_, i) => createCell(`Col${i}`))
      ];
      
      const wideSheet = createSheet('Wide', wideData);
      const wideSpreadsheetData = {
        ...mockSpreadsheetData,
        sheets: [wideSheet]
      };
      
      manager.initialize(wideSpreadsheetData);
      const range = manager.calculateDefaultSelection(0);
      expect(range).toBe('A1:AX1'); // Should span from A to AX (50 columns)
    });
  });
});