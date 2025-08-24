import { AutoSelectionManager } from '../AutoSelectionManager';

// Mock data for testing
const mockSheetData = {
  name: 'Sheet1',
  data: [
    [
      { value: 'Name', type: 'string' },
      { value: 'Age', type: 'string' },
      { value: 'City', type: 'string' },
      { value: 'Salary', type: 'string' }
    ],
    [
      { value: 'John Doe', type: 'string' },
      { value: 30, type: 'number' },
      { value: 'New York', type: 'string' },
      { value: 75000, type: 'number' }
    ],
    [
      { value: 'Jane Smith', type: 'string' },
      { value: 25, type: 'number' },
      { value: 'Los Angeles', type: 'string' },
      { value: 65000, type: 'number' }
    ],
    [
      { value: 'Bob Johnson', type: 'string' },
      { value: 35, type: 'number' },
      { value: 'Chicago', type: 'string' },
      { value: 80000, type: 'number' }
    ]
  ]
};

const mockSparseSheetData = {
  name: 'SparseSheet',
  data: [
    [
      { value: 'Product', type: 'string' },
      { value: 'Category', type: 'string' },
      { value: 'Price', type: 'string' },
      { value: '', type: 'string' },
      { value: 'Notes', type: 'string' }
    ],
    [
      { value: 'Laptop', type: 'string' },
      { value: 'Electronics', type: 'string' },
      { value: 999.99, type: 'number' },
      { value: '', type: 'string' },
      { value: '', type: 'string' }
    ],
    [
      { value: '', type: 'string' },
      { value: 'Electronics', type: 'string' },
      { value: 299.99, type: 'number' },
      { value: '', type: 'string' },
      { value: 'Refurbished', type: 'string' }
    ],
    [
      { value: '', type: 'string' },
      { value: '', type: 'string' },
      { value: '', type: 'string' },
      { value: '', type: 'string' },
      { value: '', type: 'string' }
    ],
    [
      { value: 'Mouse', type: 'string' },
      { value: 'Accessories', type: 'string' },
      { value: 29.99, type: 'number' },
      { value: '', type: 'string' },
      { value: 'Wireless', type: 'string' }
    ]
  ]
};

describe('AutoSelectionManager', () => {
  let selectionManager: AutoSelectionManager;

  beforeEach(() => {
    selectionManager = new AutoSelectionManager();
  });

  describe('Default Selection Calculation', () => {
    test('should calculate correct default selection for regular data', () => {
      const defaultSelection = selectionManager.calculateDefaultSelection(mockSheetData);
      
      expect(defaultSelection).toBe('A1:D4');
    });

    test('should handle sparse data correctly', () => {
      const defaultSelection = selectionManager.calculateDefaultSelection(mockSparseSheetData);
      
      // Should include the full range that encompasses all data
      expect(defaultSelection).toBe('A1:E5');
    });

    test('should handle empty sheet', () => {
      const emptySheet = {
        name: 'Empty',
        data: []
      };
      
      const defaultSelection = selectionManager.calculateDefaultSelection(emptySheet);
      
      // Should provide a reasonable fallback
      expect(defaultSelection).toBe('A1:J20');
    });

    test('should handle single cell sheet', () => {
      const singleCellSheet = {
        name: 'Single',
        data: [[{ value: 'Test', type: 'string' }]]
      };
      
      const defaultSelection = selectionManager.calculateDefaultSelection(singleCellSheet);
      
      expect(defaultSelection).toBe('A1:A1');
    });
  });

  describe('Selection State Management', () => {
    test('should track manual vs automatic selections', () => {
      // Apply default selection
      selectionManager.applyDefaultSelection(0, mockSheetData);
      let state = selectionManager.getActiveSelection(0);
      
      expect(state.range).toBe('A1:D4');
      expect(state.isManual).toBe(false);
      
      // Update with manual selection
      selectionManager.updateUserSelection('A1:B2', true);
      state = selectionManager.getActiveSelection(0);
      
      expect(state.range).toBe('A1:B2');
      expect(state.isManual).toBe(true);
    });

    test('should maintain separate state per sheet', () => {
      // Set selection for sheet 0
      selectionManager.applyDefaultSelection(0, mockSheetData);
      selectionManager.updateUserSelection('A1:B2', true);
      
      // Set selection for sheet 1
      selectionManager.applyDefaultSelection(1, mockSparseSheetData);
      
      const state0 = selectionManager.getActiveSelection(0);
      const state1 = selectionManager.getActiveSelection(1);
      
      expect(state0.range).toBe('A1:B2');
      expect(state0.isManual).toBe(true);
      
      expect(state1.range).toBe('A1:E5');
      expect(state1.isManual).toBe(false);
    });

    test('should reset all selections', () => {
      // Set up some selections
      selectionManager.applyDefaultSelection(0, mockSheetData);
      selectionManager.updateUserSelection('A1:B2', true);
      selectionManager.applyDefaultSelection(1, mockSparseSheetData);
      
      // Reset
      selectionManager.resetToDefaults();
      
      // Should have no active selections
      expect(() => selectionManager.getActiveSelection(0)).toThrow();
      expect(() => selectionManager.getActiveSelection(1)).toThrow();
    });

    test('should preserve selection timestamps', () => {
      const beforeTime = new Date();
      
      selectionManager.applyDefaultSelection(0, mockSheetData);
      const state = selectionManager.getActiveSelection(0);
      
      const afterTime = new Date();
      
      expect(state.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(state.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  describe('Boundary Analysis Integration', () => {
    test('should include boundary information in selection state', () => {
      selectionManager.applyDefaultSelection(0, mockSheetData);
      const state = selectionManager.getActiveSelection(0);
      
      expect(state.boundaries).toBeDefined();
      expect(state.boundaries.minRow).toBe(0);
      expect(state.boundaries.maxRow).toBe(3);
      expect(state.boundaries.minCol).toBe(0);
      expect(state.boundaries.maxCol).toBe(3);
      expect(state.boundaries.hasHeaders).toBe(true);
    });

    test('should detect headers correctly', () => {
      selectionManager.applyDefaultSelection(0, mockSheetData);
      const state = selectionManager.getActiveSelection(0);
      
      expect(state.boundaries.hasHeaders).toBe(true);
    });

    test('should handle data without headers', () => {
      const noHeadersSheet = {
        name: 'NoHeaders',
        data: [
          [
            { value: 1, type: 'number' },
            { value: 'John Doe', type: 'string' },
            { value: 30, type: 'number' }
          ],
          [
            { value: 2, type: 'number' },
            { value: 'Jane Smith', type: 'string' },
            { value: 25, type: 'number' }
          ]
        ]
      };
      
      selectionManager.applyDefaultSelection(0, noHeadersSheet);
      const state = selectionManager.getActiveSelection(0);
      
      expect(state.boundaries.hasHeaders).toBe(false);
    });
  });

  describe('Range Validation', () => {
    test('should validate range size limits', () => {
      // Create a very large sheet
      const largeData = Array.from({ length: 1000 }, (_, rowIndex) =>
        Array.from({ length: 100 }, (_, colIndex) => ({
          value: `Cell_${rowIndex}_${colIndex}`,
          type: 'string'
        }))
      );
      
      const largeSheet = {
        name: 'Large',
        data: largeData
      };
      
      const defaultSelection = selectionManager.calculateDefaultSelection(largeSheet);
      
      // Should limit the selection to prevent performance issues
      // Exact behavior depends on implementation, but should not select all 100k cells
      expect(defaultSelection).not.toBe('A1:CV1000');
    });

    test('should handle invalid range inputs gracefully', () => {
      expect(() => {
        selectionManager.updateUserSelection('INVALID_RANGE', true);
      }).toThrow();
    });
  });

  describe('Performance Considerations', () => {
    test('should calculate default selection efficiently for large datasets', () => {
      const startTime = Date.now();
      
      // Create moderately large dataset
      const largeData = Array.from({ length: 100 }, (_, rowIndex) =>
        Array.from({ length: 50 }, (_, colIndex) => ({
          value: `Cell_${rowIndex}_${colIndex}`,
          type: 'string'
        }))
      );
      
      const largeSheet = {
        name: 'Performance',
        data: largeData
      };
      
      const defaultSelection = selectionManager.calculateDefaultSelection(largeSheet);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(defaultSelection).toMatch(/^[A-Z]+\d+:[A-Z]+\d+$/);
    });
  });
});