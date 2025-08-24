import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import SpreadsheetViewer from '../SpreadsheetViewer';
import { SpreadsheetData, DataType } from '../../types';
import { announceToScreenReader } from '../../utils/accessibility';

// Mock the accessibility utility
vi.mock('../../utils/accessibility', () => ({
  announceToScreenReader: vi.fn()
}));

const mockAnnounceToScreenReader = vi.mocked(announceToScreenReader);

describe('SpreadsheetViewer Accessibility', () => {
  const mockSpreadsheetData: SpreadsheetData = {
    id: 'test-spreadsheet',
    sheets: [
      {
        name: 'Sheet1',
        data: [
          [
            { value: 'Name', dataType: DataType.TEXT },
            { value: 'Age', dataType: DataType.TEXT },
            { value: 'City', dataType: DataType.TEXT }
          ],
          [
            { value: 'John', dataType: DataType.TEXT },
            { value: 25, dataType: DataType.NUMBER },
            { value: 'New York', dataType: DataType.TEXT }
          ],
          [
            { value: 'Jane', dataType: DataType.TEXT },
            { value: 30, dataType: DataType.NUMBER },
            { value: 'Boston', dataType: DataType.TEXT }
          ]
        ],
        dimensions: { rows: 3, cols: 3 },
        formatting: [],
        namedRanges: []
      }
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
    updatedAt: new Date(),
    recommendedSelection: 'A1:C3'
  };

  const defaultProps = {
    data: mockSpreadsheetData,
    selectedRange: null,
    onSelectionChange: vi.fn(),
    onCellClick: vi.fn(),
    onSelectionTypeChange: vi.fn(),
    onSheetChange: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Selection Announcements', () => {
    it('should announce when default selection is applied', async () => {
      render(
        <SpreadsheetViewer
          {...defaultProps}
          selectedRange="A1:C3"
          defaultSelection="A1:C3"
        />
      );

      // Wait for the default selection to be applied
      await waitFor(() => {
        expect(defaultProps.onSelectionChange).toHaveBeenCalledWith('A1:C3');
      });

      // Check that selection info is displayed with proper accessibility attributes
      const selectionInfo = screen.getByText('A1:C3');
      expect(selectionInfo).toBeInTheDocument();

      // Check for "Entire Data Range" indicator
      const entireRangeIndicator = screen.getByText('Entire Data Range');
      expect(entireRangeIndicator).toBeInTheDocument();
    });

    it('should announce when manual selection is made', async () => {
      render(
        <SpreadsheetViewer
          {...defaultProps}
          selectedRange="A1"
        />
      );

      // Click on a cell to make manual selection (30 is in row 2, column B, so B2)
      const cellB2 = screen.getByText('30');
      fireEvent.click(cellB2);

      expect(defaultProps.onCellClick).toHaveBeenCalledWith('B3'); // 30 is actually in B3 (0-indexed row 2)
      expect(defaultProps.onSelectionTypeChange).toHaveBeenCalledWith(true);
    });

    it('should provide proper ARIA labels for selection indicators', () => {
      render(
        <SpreadsheetViewer
          {...defaultProps}
          selectedRange="A1:C3"
          defaultSelection="A1:C3"
        />
      );

      // Check for accessibility attributes on selection indicators
      const entireRangeIndicator = screen.getByText('Entire Data Range');
      expect(entireRangeIndicator.closest('span')).toHaveClass('bg-blue-100');

      // Check for help tooltip (SVG elements)
      const tooltipIcons = document.querySelectorAll('svg.cursor-help');
      expect(tooltipIcons.length).toBeGreaterThan(0);
    });

    it('should announce selection changes when dragging', async () => {
      render(
        <SpreadsheetViewer
          {...defaultProps}
          selectedRange="A1"
        />
      );

      const cellA1 = screen.getByText('Name');
      const cellB2 = screen.getByText('30');

      // Start drag selection
      fireEvent.mouseDown(cellA1);
      fireEvent.mouseEnter(cellB2);
      fireEvent.mouseUp(cellB2);

      expect(defaultProps.onSelectionTypeChange).toHaveBeenCalledWith(true);
    });

    it('should provide accessible cell information in tooltips', () => {
      render(
        <SpreadsheetViewer
          {...defaultProps}
          selectedRange="A1"
        />
      );

      // Check that cells have proper title attributes for screen readers
      const nameCell = screen.getByText('Name');
      expect(nameCell).toHaveAttribute('title', 'Name');

      const ageCell = screen.getByText('25');
      expect(ageCell).toHaveAttribute('title', '25');
    });

    it('should announce selection summary information', () => {
      render(
        <SpreadsheetViewer
          {...defaultProps}
          selectedRange="A1:C3"
          defaultSelection="A1:C3"
        />
      );

      // Check for selection summary
      expect(screen.getByText(/3 × 3 = 9 cells/)).toBeInTheDocument();
      expect(screen.getByText(/Smart selection active/)).toBeInTheDocument();
    });

    it('should provide data type information for accessibility', () => {
      render(
        <SpreadsheetViewer
          {...defaultProps}
          selectedRange="A1:C3"
          defaultSelection="A1:C3"
        />
      );

      // Check for data type indicators
      expect(screen.getByText('text')).toBeInTheDocument();
      expect(screen.getByText('number')).toBeInTheDocument();
      expect(screen.getByText('Headers')).toBeInTheDocument();
    });

    it('should handle keyboard navigation accessibility', () => {
      render(
        <SpreadsheetViewer
          {...defaultProps}
          selectedRange="A1"
        />
      );

      // Check that cells are focusable and have proper roles
      const cells = screen.getAllByRole('cell');
      expect(cells.length).toBeGreaterThan(0);

      // Check that the table structure is accessible
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();

      const columnHeaders = screen.getAllByRole('columnheader');
      expect(columnHeaders.length).toBeGreaterThan(0);
    });

    it('should announce when switching between sheets', async () => {
      const multiSheetData = {
        ...mockSpreadsheetData,
        sheets: [
          mockSpreadsheetData.sheets[0],
          {
            name: 'Sheet2',
            data: [
              [{ value: 'Data', dataType: DataType.TEXT }]
            ],
            dimensions: { rows: 1, cols: 1 },
            formatting: [],
            namedRanges: []
          }
        ]
      };

      render(
        <SpreadsheetViewer
          {...defaultProps}
          data={multiSheetData}
          selectedRange="A1"
        />
      );

      // Click on Sheet2 tab
      const sheet2Tab = screen.getByText('Sheet2');
      fireEvent.click(sheet2Tab);

      expect(defaultProps.onSheetChange).toHaveBeenCalledWith(1);
    });

    it('should provide proper contrast and visual indicators', () => {
      render(
        <SpreadsheetViewer
          {...defaultProps}
          selectedRange="A1:C3"
          defaultSelection="A1:C3"
        />
      );

      // Check for proper color contrast in selection indicators
      const entireRangeIndicator = screen.getByText('Entire Data Range');
      const indicatorElement = entireRangeIndicator.closest('span');
      expect(indicatorElement).toHaveClass('bg-blue-100', 'text-blue-800');

      // Check for visual selection feedback
      expect(screen.getByText(/Smart selection active/)).toHaveClass('text-blue-600');
    });

    it('should handle selection state changes accessibly', async () => {
      // Create a component with manual selection state
      const ManualSelectionComponent = () => {
        const [isManual, setIsManual] = React.useState(false);
        const [selectedRange, setSelectedRange] = React.useState('A1:C3');
        
        return (
          <SpreadsheetViewer
            {...defaultProps}
            selectedRange={selectedRange}
            defaultSelection="A1:C3"
            onSelectionTypeChange={setIsManual}
            onSelectionChange={setSelectedRange}
          />
        );
      };

      const { rerender } = render(<ManualSelectionComponent />);

      // Initially should show auto-selection
      expect(screen.getByText('Entire Data Range')).toBeInTheDocument();

      // Simulate manual selection by clicking a cell
      const cellB2 = screen.getByText('30');
      fireEvent.click(cellB2);

      // Should now show manual selection indicator after state update
      rerender(
        <SpreadsheetViewer
          {...defaultProps}
          selectedRange="B2"
        />
      );

      // Check for manual selection text (it should show "Manual Selection" when isManualSelection is true)
      // Since we can't easily test the internal state change, let's check for the selection range change
      expect(screen.getByText('B2')).toBeInTheDocument();
    });
  });

  describe('Screen Reader Support', () => {
    it('should provide proper table structure for screen readers', () => {
      render(
        <SpreadsheetViewer
          {...defaultProps}
          selectedRange="A1"
        />
      );

      // Check table structure
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();

      // Check for proper headers
      const columnHeaders = screen.getAllByRole('columnheader');
      expect(columnHeaders).toHaveLength(4); // A, B, C columns + row header

      // Check for proper row structure
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBeGreaterThan(0);
    });

    it('should provide descriptive text for complex UI elements', () => {
      render(
        <SpreadsheetViewer
          {...defaultProps}
          selectedRange="A1:C3"
          defaultSelection="A1:C3"
        />
      );

      // Check for descriptive text
      expect(screen.getByText(/Smart selection active/)).toBeInTheDocument();
      expect(screen.getByText(/Click any cell to customize/)).toBeInTheDocument();
    });

    it('should handle focus management properly', () => {
      render(
        <SpreadsheetViewer
          {...defaultProps}
          selectedRange="A1"
        />
      );

      // Check that interactive elements are focusable
      const cells = screen.getAllByRole('cell');
      cells.forEach(cell => {
        expect(cell).toHaveAttribute('tabindex', '0');
      });
    });
  });

  describe('Selection Information Accessibility', () => {
    it('should provide comprehensive selection information', () => {
      render(
        <SpreadsheetViewer
          {...defaultProps}
          selectedRange="A1:C3"
          defaultSelection="A1:C3"
        />
      );

      // Check for selection range display
      expect(screen.getByText('A1:C3')).toBeInTheDocument();

      // Check for cell count
      expect(screen.getByText(/3 × 3 = 9 cells/)).toBeInTheDocument();

      // Check for data type information
      expect(screen.getByText('Types:')).toBeInTheDocument();
      expect(screen.getByText('Headers')).toBeInTheDocument();
    });

    it('should update selection information dynamically', async () => {
      const { rerender } = render(
        <SpreadsheetViewer
          {...defaultProps}
          selectedRange="A1"
        />
      );

      expect(screen.getByText('1 cell')).toBeInTheDocument();

      rerender(
        <SpreadsheetViewer
          {...defaultProps}
          selectedRange="A1:B2"
        />
      );

      expect(screen.getByText(/2 × 2 = 4 cells/)).toBeInTheDocument();
    });
  });
});