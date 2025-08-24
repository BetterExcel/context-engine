import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import SpreadsheetViewer from '../SpreadsheetViewer';
import { SpreadsheetData, DataType, Cell } from '../../types';

// Mock data for testing
const createMockCell = (value: any, dataType: DataType = DataType.TEXT): Cell => ({
  value,
  dataType,
});

const createMockSpreadsheetData = (sheetCount: number = 1): SpreadsheetData => ({
  id: 'test-spreadsheet-1',
  sheets: Array.from({ length: sheetCount }, (_, index) => ({
    name: `Sheet${index + 1}`,
    data: [
      [createMockCell('Header1'), createMockCell('Header2'), createMockCell('Header3')],
      [createMockCell('Data1'), createMockCell('Data2'), createMockCell('Data3')],
      [createMockCell('Data4'), createMockCell('Data5'), createMockCell('Data6')],
    ],
    dimensions: { rows: 3, cols: 3 },
    formatting: [],
    namedRanges: [],
  })),
  metadata: {
    filename: 'test.xlsx',
    fileSize: 1024,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    uploadedAt: new Date(),
  },
  formulas: [],
  namedRanges: [],
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('SpreadsheetViewer Auto-Selection', () => {
  const mockOnSelectionChange = vi.fn();
  const mockOnCellClick = vi.fn();
  const mockOnSelectionTypeChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Default Selection Application', () => {
    it('should apply default selection when provided', async () => {
      const mockData = createMockSpreadsheetData();
      const defaultSelection = 'A1:C3';

      render(
        <SpreadsheetViewer
          data={mockData}
          selectedRange=""
          onSelectionChange={mockOnSelectionChange}
          onCellClick={mockOnCellClick}
          defaultSelection={defaultSelection}
          onSelectionTypeChange={mockOnSelectionTypeChange}
        />
      );

      await waitFor(() => {
        expect(mockOnSelectionChange).toHaveBeenCalledWith(defaultSelection);
        expect(mockOnSelectionTypeChange).toHaveBeenCalledWith(false);
      });
    });

    it('should show auto-selection indicator when default selection is applied', async () => {
      const mockData = createMockSpreadsheetData();
      const defaultSelection = 'A1:C3';

      render(
        <SpreadsheetViewer
          data={mockData}
          selectedRange={defaultSelection}
          onSelectionChange={mockOnSelectionChange}
          onCellClick={mockOnCellClick}
          defaultSelection={defaultSelection}
          onSelectionTypeChange={mockOnSelectionTypeChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Auto-selected')).toBeInTheDocument();
        expect(screen.getByText(/Entire data range automatically selected/)).toBeInTheDocument();
      });
    });

    it('should handle gracefully when default selection is provided', async () => {
      const mockData = createMockSpreadsheetData();
      const defaultSelection = 'A1:C3';

      render(
        <SpreadsheetViewer
          data={mockData}
          selectedRange=""
          onSelectionChange={mockOnSelectionChange}
          onCellClick={mockOnCellClick}
          defaultSelection={defaultSelection}
          onSelectionTypeChange={mockOnSelectionTypeChange}
        />
      );

      await waitFor(() => {
        // Should apply the default selection successfully
        expect(mockOnSelectionChange).toHaveBeenCalledWith(defaultSelection);
        expect(mockOnSelectionTypeChange).toHaveBeenCalledWith(false);
      });
    });

    it('should not apply default selection if manual selection has been made', async () => {
      const mockData = createMockSpreadsheetData();
      const defaultSelection = 'A1:C3';

      const { rerender } = render(
        <SpreadsheetViewer
          data={mockData}
          selectedRange="A1"
          onSelectionChange={mockOnSelectionChange}
          onCellClick={mockOnCellClick}
          onSelectionTypeChange={mockOnSelectionTypeChange}
        />
      );

      // Simulate manual selection by clicking a cell
      const cellA1 = screen.getByText('Header1');
      fireEvent.click(cellA1);

      // Now provide default selection - it should not be applied
      rerender(
        <SpreadsheetViewer
          data={mockData}
          selectedRange="A1"
          onSelectionChange={mockOnSelectionChange}
          onCellClick={mockOnCellClick}
          defaultSelection={defaultSelection}
          onSelectionTypeChange={mockOnSelectionTypeChange}
        />
      );

      // Should not call onSelectionChange with default selection
      expect(mockOnSelectionChange).not.toHaveBeenCalledWith(defaultSelection);
    });
  });

  describe('Manual Selection Behavior', () => {
    it('should mark selection as manual when user clicks a cell', async () => {
      const mockData = createMockSpreadsheetData();

      render(
        <SpreadsheetViewer
          data={mockData}
          selectedRange=""
          onSelectionChange={mockOnSelectionChange}
          onCellClick={mockOnCellClick}
          onSelectionTypeChange={mockOnSelectionTypeChange}
        />
      );

      const cellA1 = screen.getByTitle('Header1');
      fireEvent.click(cellA1);

      expect(mockOnSelectionTypeChange).toHaveBeenCalledWith(true);
      expect(mockOnCellClick).toHaveBeenCalledWith('A1');
    });

    it('should show manual selection indicator after user interaction', async () => {
      const mockData = createMockSpreadsheetData();

      render(
        <SpreadsheetViewer
          data={mockData}
          selectedRange="A1"
          onSelectionChange={mockOnSelectionChange}
          onCellClick={mockOnCellClick}
          onSelectionTypeChange={mockOnSelectionTypeChange}
        />
      );

      const cellA1 = screen.getByTitle('Header1');
      fireEvent.click(cellA1);

      await waitFor(() => {
        expect(screen.getByText('Manual')).toBeInTheDocument();
        expect(screen.queryByText('Auto-selected')).not.toBeInTheDocument();
      });
    });

    it('should mark selection as manual during drag selection', async () => {
      const mockData = createMockSpreadsheetData();

      render(
        <SpreadsheetViewer
          data={mockData}
          selectedRange=""
          onSelectionChange={mockOnSelectionChange}
          onCellClick={mockOnCellClick}
          onSelectionTypeChange={mockOnSelectionTypeChange}
        />
      );

      const cellA1 = screen.getByTitle('Header1');
      const cellB2 = screen.getByTitle('Data2');

      // Start drag selection
      fireEvent.mouseDown(cellA1);
      fireEvent.mouseEnter(cellB2);

      expect(mockOnSelectionTypeChange).toHaveBeenCalledWith(true);
    });

    it('should extend selection with shift+click', async () => {
      const mockData = createMockSpreadsheetData();

      render(
        <SpreadsheetViewer
          data={mockData}
          selectedRange=""
          onSelectionChange={mockOnSelectionChange}
          onCellClick={mockOnCellClick}
          onSelectionTypeChange={mockOnSelectionTypeChange}
        />
      );

      const cellA1 = screen.getByTitle('Header1');
      const cellC3 = screen.getByTitle('Data6');

      // First click to establish selection start
      fireEvent.click(cellA1);
      
      // Shift+click to extend selection
      fireEvent.click(cellC3, { shiftKey: true });

      expect(mockOnSelectionChange).toHaveBeenCalledWith('A1:C3');
      expect(mockOnSelectionTypeChange).toHaveBeenCalledWith(true);
    });
  });

  describe('Sheet Switching Behavior', () => {
    it('should reset selection state when switching sheets', async () => {
      const mockData = createMockSpreadsheetData(2);
      const defaultSelection = 'A1:C3';

      render(
        <SpreadsheetViewer
          data={mockData}
          selectedRange=""
          onSelectionChange={mockOnSelectionChange}
          onCellClick={mockOnCellClick}
          defaultSelection={defaultSelection}
          onSelectionTypeChange={mockOnSelectionTypeChange}
        />
      );

      // Make a manual selection - use title attribute to find the specific cell
      const cellA1 = screen.getByTitle('Header1');
      fireEvent.click(cellA1);

      // Switch to Sheet2
      const sheet2Tab = screen.getByText('Sheet2');
      fireEvent.click(sheet2Tab);

      // Should reset to auto-selection state
      await waitFor(() => {
        expect(mockOnSelectionChange).toHaveBeenCalledWith(defaultSelection);
        expect(mockOnSelectionTypeChange).toHaveBeenCalledWith(false);
      });
    });

    it('should apply default selection to new sheet', async () => {
      const mockData = createMockSpreadsheetData(2);
      const defaultSelection = 'A1:C3';

      render(
        <SpreadsheetViewer
          data={mockData}
          selectedRange={defaultSelection}
          onSelectionChange={mockOnSelectionChange}
          onCellClick={mockOnCellClick}
          defaultSelection={defaultSelection}
          onSelectionTypeChange={mockOnSelectionTypeChange}
        />
      );

      // Switch to Sheet2
      const sheet2Tab = screen.getByText('Sheet2');
      fireEvent.click(sheet2Tab);

      await waitFor(() => {
        expect(screen.getByText('Auto-selected')).toBeInTheDocument();
      });
    });
  });

  describe('Data Change Behavior', () => {
    it('should reset selection state when data changes (new file)', async () => {
      const mockData1 = createMockSpreadsheetData();
      const mockData2 = { ...createMockSpreadsheetData(), id: 'test-spreadsheet-2' };
      const defaultSelection = 'A1:C3';

      const { rerender } = render(
        <SpreadsheetViewer
          data={mockData1}
          selectedRange=""
          onSelectionChange={mockOnSelectionChange}
          onCellClick={mockOnCellClick}
          defaultSelection={defaultSelection}
          onSelectionTypeChange={mockOnSelectionTypeChange}
        />
      );

      // Make a manual selection - use title attribute to find the specific cell
      const cellA1 = screen.getByTitle('Header1');
      fireEvent.click(cellA1);

      // Change data (simulate new file upload)
      rerender(
        <SpreadsheetViewer
          data={mockData2}
          selectedRange=""
          onSelectionChange={mockOnSelectionChange}
          onCellClick={mockOnCellClick}
          defaultSelection={defaultSelection}
          onSelectionTypeChange={mockOnSelectionTypeChange}
        />
      );

      // Should reset to auto-selection and apply default
      await waitFor(() => {
        expect(mockOnSelectionChange).toHaveBeenCalledWith(defaultSelection);
        expect(mockOnSelectionTypeChange).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('Visual Indicators', () => {
    it('should display correct cell count for selection', async () => {
      const mockData = createMockSpreadsheetData();

      render(
        <SpreadsheetViewer
          data={mockData}
          selectedRange="A1:C3"
          onSelectionChange={mockOnSelectionChange}
          onCellClick={mockOnCellClick}
          onSelectionTypeChange={mockOnSelectionTypeChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('3 × 3 cells')).toBeInTheDocument();
      });
    });

    it('should show selection range in selection info', async () => {
      const mockData = createMockSpreadsheetData();

      render(
        <SpreadsheetViewer
          data={mockData}
          selectedRange="A1:C3"
          onSelectionChange={mockOnSelectionChange}
          onCellClick={mockOnCellClick}
          onSelectionTypeChange={mockOnSelectionTypeChange}
        />
      );

      expect(screen.getByText(/Selected: A1:C3/)).toBeInTheDocument();
    });

    it('should highlight selected cells visually', async () => {
      const mockData = createMockSpreadsheetData();

      render(
        <SpreadsheetViewer
          data={mockData}
          selectedRange="A1"
          onSelectionChange={mockOnSelectionChange}
          onCellClick={mockOnCellClick}
          onSelectionTypeChange={mockOnSelectionTypeChange}
        />
      );

      const cellA1 = screen.getByTitle('Header1');
      fireEvent.click(cellA1);

      // Check if the cell has selection styling
      expect(cellA1).toHaveClass('ring-2', 'ring-blue-500', 'bg-blue-50');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty spreadsheet data gracefully', async () => {
      const emptyData: SpreadsheetData = {
        id: 'empty-spreadsheet',
        sheets: [{
          name: 'Sheet1',
          data: [],
          dimensions: { rows: 0, cols: 0 },
          formatting: [],
          namedRanges: [],
        }],
        metadata: {
          filename: 'empty.xlsx',
          fileSize: 0,
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          uploadedAt: new Date(),
        },
        formulas: [],
        namedRanges: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      render(
        <SpreadsheetViewer
          data={emptyData}
          selectedRange=""
          onSelectionChange={mockOnSelectionChange}
          onCellClick={mockOnCellClick}
          defaultSelection="A1:J20"
          onSelectionTypeChange={mockOnSelectionTypeChange}
        />
      );

      // Should not crash and should handle empty data gracefully
      // The component should render without crashing
      expect(screen.getByText('Cell:')).toBeInTheDocument();
    });

    it('should handle single cell default selection', async () => {
      const mockData = createMockSpreadsheetData();
      const singleCellSelection = 'B2';

      render(
        <SpreadsheetViewer
          data={mockData}
          selectedRange=""
          onSelectionChange={mockOnSelectionChange}
          onCellClick={mockOnCellClick}
          defaultSelection={singleCellSelection}
          onSelectionTypeChange={mockOnSelectionTypeChange}
        />
      );

      await waitFor(() => {
        expect(mockOnSelectionChange).toHaveBeenCalledWith(singleCellSelection);
      });
    });

    it('should handle mouse events correctly during selection', async () => {
      const mockData = createMockSpreadsheetData();

      render(
        <SpreadsheetViewer
          data={mockData}
          selectedRange=""
          onSelectionChange={mockOnSelectionChange}
          onCellClick={mockOnCellClick}
          onSelectionTypeChange={mockOnSelectionTypeChange}
        />
      );

      const cellA1 = screen.getByTitle('Header1');
      
      // Test right-click (should not trigger selection)
      fireEvent.mouseDown(cellA1, { button: 1 });
      expect(mockOnSelectionChange).not.toHaveBeenCalled();

      // Test left-click (should trigger selection)
      fireEvent.mouseDown(cellA1, { button: 0 });
      expect(mockOnSelectionChange).toHaveBeenCalled();
    });
  });
});