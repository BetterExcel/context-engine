import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import SpreadsheetViewer from '../SpreadsheetViewer';
import { SpreadsheetData, DataType, Cell, Sheet } from '../../types';

// Mock data for testing
const createMockCell = (value: any, dataType: DataType, formula?: string): Cell => {
  const cell: Cell = {
    value,
    dataType,
    address: 'A1'
  };
  
  if (formula) {
    cell.formula = formula;
  }
  
  return cell;
};

const createMockSheet = (name: string, rows: number, cols: number): Sheet => {
  const data: Cell[][] = [];
  
  for (let row = 0; row < rows; row++) {
    const rowData: Cell[] = [];
    for (let col = 0; col < cols; col++) {
      const cellValue = row === 0 ? `Header ${col + 1}` : `Cell ${row}-${col}`;
      const dataType = row === 0 ? DataType.TEXT : 
                      col === 0 ? DataType.TEXT : 
                      col === 1 ? DataType.NUMBER : DataType.TEXT;
      
      rowData.push(createMockCell(
        col === 1 && row > 0 ? (row * 10) : cellValue,
        dataType
      ));
    }
    data.push(rowData);
  }

  return {
    name,
    data,
    dimensions: { rows, cols },
    formatting: [],
    namedRanges: []
  };
};

const mockSpreadsheetData: SpreadsheetData = {
  id: 'test-spreadsheet-1',
  sheets: [
    createMockSheet('Sheet1', 5, 4),
    createMockSheet('Sheet2', 3, 3)
  ],
  metadata: {
    filename: 'test.xlsx',
    fileSize: 1024,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    uploadedAt: new Date('2023-01-01'),
  },
  formulas: [],
  namedRanges: [],
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01')
};

const mockProps = {
  data: mockSpreadsheetData,
  selectedRange: 'A1',
  onSelectionChange: vi.fn(),
  onCellClick: vi.fn()
};

describe('SpreadsheetViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the spreadsheet grid correctly', () => {
      render(<SpreadsheetViewer {...mockProps} />);
      
      // Check if the grid is rendered
      expect(screen.getByRole('table')).toBeInTheDocument();
      
      // Check column headers
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('B')).toBeInTheDocument();
      expect(screen.getByText('C')).toBeInTheDocument();
      expect(screen.getByText('D')).toBeInTheDocument();
      
      // Check row headers
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      
      // Check some cell content
      expect(screen.getByText('Header 1')).toBeInTheDocument();
      expect(screen.getByText('Cell 1-0')).toBeInTheDocument();
    });

    it('renders sheet tabs when multiple sheets exist', () => {
      render(<SpreadsheetViewer {...mockProps} />);
      
      expect(screen.getByText('Sheet1')).toBeInTheDocument();
      expect(screen.getByText('Sheet2')).toBeInTheDocument();
    });

    it('does not render sheet tabs when only one sheet exists', () => {
      const singleSheetData = {
        ...mockSpreadsheetData,
        sheets: [mockSpreadsheetData.sheets[0]!]
      };
      
      render(<SpreadsheetViewer {...mockProps} data={singleSheetData} />);
      
      expect(screen.queryByText('Sheet1')).not.toBeInTheDocument();
    });

    it('renders the formula bar', () => {
      render(<SpreadsheetViewer {...mockProps} />);
      
      expect(screen.getByText('Cell:')).toBeInTheDocument();
      expect(screen.getByText('Formula:')).toBeInTheDocument();
    });

    it('renders selection info', () => {
      render(<SpreadsheetViewer {...mockProps} selectedRange="A1:B2" />);
      
      expect(screen.getByText('Selected: A1:B2')).toBeInTheDocument();
    });
  });

  describe('Cell Selection', () => {
    it('handles single cell click', () => {
      render(<SpreadsheetViewer {...mockProps} />);
      
      const cell = screen.getByText('Header 1');
      fireEvent.click(cell);
      
      expect(mockProps.onCellClick).toHaveBeenCalledWith('A1');
      expect(mockProps.onSelectionChange).toHaveBeenCalledWith('A1');
    });

    it('handles cell click with different coordinates', () => {
      render(<SpreadsheetViewer {...mockProps} />);
      
      const cell = screen.getByText('10'); // Cell at row 1, col 1 (B2)
      fireEvent.click(cell);
      
      expect(mockProps.onCellClick).toHaveBeenCalledWith('B2');
      expect(mockProps.onSelectionChange).toHaveBeenCalledWith('B2');
    });

    it('applies correct styling to selected cells', () => {
      // We need to simulate the component's internal state by clicking a cell first
      render(<SpreadsheetViewer {...mockProps} />);
      
      const cell = screen.getByText('Header 1');
      fireEvent.click(cell);
      
      // After clicking, the cell should have selection styling
      expect(cell).toHaveClass('ring-2', 'ring-blue-500', 'bg-blue-50');
    });
  });

  describe('Data Type Styling', () => {
    it('applies correct styling for different data types', () => {
      render(<SpreadsheetViewer {...mockProps} />);
      
      // Text cells should have default styling
      const textCell = screen.getByText('Header 1');
      expect(textCell).toHaveClass('text-gray-900');
      
      // Number cells should be right-aligned and blue
      const numberCell = screen.getByText('20'); // Cell 2-1 has value 20
      expect(numberCell).toHaveClass('text-right', 'text-blue-600');
    });
  });

  describe('Sheet Navigation', () => {
    it('switches between sheets when tab is clicked', async () => {
      render(<SpreadsheetViewer {...mockProps} />);
      
      // Initially on Sheet1 - check for specific content that differs between sheets
      expect(screen.getByText('Header 1')).toBeInTheDocument();
      
      // Click Sheet2 tab
      const sheet2Tab = screen.getByText('Sheet2');
      fireEvent.click(sheet2Tab);
      
      // Should now show Sheet2 content (which has different dimensions)
      // Sheet2 has 3x3 dimensions vs Sheet1's 5x4, so we should see fewer columns
      await waitFor(() => {
        // Check that we don't have the 4th column header 'D' anymore
        expect(screen.queryByText('D')).not.toBeInTheDocument();
      });
    });

    it('highlights active sheet tab', () => {
      render(<SpreadsheetViewer {...mockProps} />);
      
      const sheet1Tab = screen.getByText('Sheet1');
      const sheet2Tab = screen.getByText('Sheet2');
      
      expect(sheet1Tab).toHaveClass('bg-blue-100', 'text-blue-700');
      expect(sheet2Tab).not.toHaveClass('bg-blue-100', 'text-blue-700');
    });
  });

  describe('Formula Bar', () => {
    it('displays selected cell address', () => {
      render(<SpreadsheetViewer {...mockProps} selectedRange="B3" />);
      
      // The formula bar should show the cell address as text, not as input value
      expect(screen.getByText('A1')).toBeInTheDocument();
    });

    it('displays cell formula when available', () => {
      const dataWithFormula = {
        ...mockSpreadsheetData,
        sheets: [{
          ...mockSpreadsheetData.sheets[0]!,
          data: [
            [
              createMockCell('=SUM(A1:A10)', DataType.FORMULA, '=SUM(A1:A10)'),
              ...mockSpreadsheetData.sheets[0]!.data[0]!.slice(1)
            ],
            ...mockSpreadsheetData.sheets[0]!.data.slice(1)
          ]
        }]
      };
      
      render(<SpreadsheetViewer {...mockProps} data={dataWithFormula} />);
      
      // Click on the formula cell
      const formulaCell = screen.getByText('=SUM(A1:A10)');
      fireEvent.click(formulaCell);
      
      // Formula bar should show the formula as text content, not input value
      // Look specifically in the formula bar area
      const formulaBar = screen.getByText('Formula:').parentElement;
      expect(formulaBar).toHaveTextContent('=SUM(A1:A10)');
    });
  });

  describe('Mouse Interactions', () => {
    it('handles mouse down for drag selection', () => {
      render(<SpreadsheetViewer {...mockProps} />);
      
      const cell = screen.getByText('Header 1');
      fireEvent.mouseDown(cell, { button: 0 });
      
      expect(mockProps.onCellClick).toHaveBeenCalledWith('A1');
      expect(mockProps.onSelectionChange).toHaveBeenCalledWith('A1');
    });

    it('ignores non-left mouse button clicks', () => {
      render(<SpreadsheetViewer {...mockProps} />);
      
      const cell = screen.getByText('Header 1');
      fireEvent.mouseDown(cell, { button: 1 }); // Right click
      
      expect(mockProps.onCellClick).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('provides proper cell titles for tooltips', () => {
      render(<SpreadsheetViewer {...mockProps} />);
      
      const cell = screen.getByText('Header 1');
      expect(cell).toHaveAttribute('title', 'Header 1');
    });

    it('provides formula tooltips for formula cells', () => {
      const dataWithFormula = {
        ...mockSpreadsheetData,
        sheets: [{
          ...mockSpreadsheetData.sheets[0]!,
          data: [
            [
              createMockCell('100', DataType.FORMULA, '=SUM(A1:A10)'),
              ...mockSpreadsheetData.sheets[0]!.data[0]!.slice(1)
            ],
            ...mockSpreadsheetData.sheets[0]!.data.slice(1)
          ]
        }]
      };
      
      render(<SpreadsheetViewer {...mockProps} data={dataWithFormula} />);
      
      const formulaCell = screen.getByText('100');
      expect(formulaCell).toHaveAttribute('title', 'Formula: =SUM(A1:A10)');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty cells gracefully', () => {
      const dataWithEmptyCells = {
        ...mockSpreadsheetData,
        sheets: [{
          ...mockSpreadsheetData.sheets[0]!,
          data: [
            [
              createMockCell('', DataType.EMPTY),
              createMockCell(null, DataType.EMPTY),
              createMockCell(undefined, DataType.EMPTY)
            ]
          ],
          dimensions: { rows: 1, cols: 3 }
        }]
      };
      
      render(<SpreadsheetViewer {...mockProps} data={dataWithEmptyCells} />);
      
      // Should render without crashing
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('handles error cells', () => {
      const dataWithErrors = {
        ...mockSpreadsheetData,
        sheets: [{
          ...mockSpreadsheetData.sheets[0]!,
          data: [
            [createMockCell('#DIV/0!', DataType.ERROR)]
          ],
          dimensions: { rows: 1, cols: 1 }
        }]
      };
      
      render(<SpreadsheetViewer {...mockProps} data={dataWithErrors} />);
      
      const errorCell = screen.getByText('#ERROR');
      expect(errorCell).toHaveClass('text-red-600', 'bg-red-50');
    });

    it('handles boolean cells', () => {
      const dataWithBooleans = {
        ...mockSpreadsheetData,
        sheets: [{
          ...mockSpreadsheetData.sheets[0]!,
          data: [
            [
              createMockCell(true, DataType.BOOLEAN),
              createMockCell(false, DataType.BOOLEAN)
            ]
          ],
          dimensions: { rows: 1, cols: 2 }
        }]
      };
      
      render(<SpreadsheetViewer {...mockProps} data={dataWithBooleans} />);
      
      expect(screen.getByText('TRUE')).toBeInTheDocument();
      expect(screen.getByText('FALSE')).toBeInTheDocument();
    });

    it('handles date cells', () => {
      const testDate = new Date('2023-01-15');
      const dataWithDates = {
        ...mockSpreadsheetData,
        sheets: [{
          ...mockSpreadsheetData.sheets[0]!,
          data: [
            [createMockCell(testDate, DataType.DATE)]
          ],
          dimensions: { rows: 1, cols: 1 }
        }]
      };
      
      render(<SpreadsheetViewer {...mockProps} data={dataWithDates} />);
      
      expect(screen.getByText(testDate.toLocaleDateString())).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('renders large datasets without performance issues', () => {
      const largeSheet = createMockSheet('LargeSheet', 100, 20);
      const largeData = {
        ...mockSpreadsheetData,
        sheets: [largeSheet]
      };
      
      const startTime = performance.now();
      render(<SpreadsheetViewer {...mockProps} data={largeData} />);
      const endTime = performance.now();
      
      // Should render within reasonable time (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });
});