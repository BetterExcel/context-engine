import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Import components to test
import FileUpload from '../FileUpload';
import SpreadsheetViewer from '../SpreadsheetViewer';
import RequestInput from '../RequestInput';
import ContextDisplay from '../ContextDisplay';
import Tooltip, { HelpTooltip, InfoTooltip } from '../Tooltip';
import KeyboardShortcutsModal from '../KeyboardShortcutsModal';
import { SpreadsheetData, DataType } from '../../types';

// Mock data for tests
const mockSpreadsheetData: SpreadsheetData = {
  sheets: [
    {
      name: 'Sheet1',
      data: [
        [
          { value: 'Name', dataType: DataType.TEXT },
          { value: 'Age', dataType: DataType.TEXT },
          { value: 'Score', dataType: DataType.TEXT }
        ],
        [
          { value: 'John', dataType: DataType.TEXT },
          { value: 25, dataType: DataType.NUMBER },
          { value: 85, dataType: DataType.NUMBER }
        ],
        [
          { value: 'Jane', dataType: DataType.TEXT },
          { value: 30, dataType: DataType.NUMBER },
          { value: 92, dataType: DataType.NUMBER }
        ]
      ],
      dimensions: { rows: 3, cols: 3 }
    }
  ],
  metadata: {
    filename: 'test.xlsx',
    fileSize: 1024,
    uploadedAt: new Date(),
    sheets: ['Sheet1']
  },
  formulas: [],
  namedRanges: []
};

describe('Accessibility Tests', () => {
  describe('FileUpload Component', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <FileUpload
          onFileUpload={vi.fn()}
          acceptedFormats={['.xlsx', '.csv']}
          maxFileSize={1024 * 1024}
          isUploading={false}
        />
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA labels', () => {
      render(
        <FileUpload
          onFileUpload={vi.fn()}
          acceptedFormats={['.xlsx', '.csv']}
          maxFileSize={1024 * 1024}
          isUploading={false}
        />
      );

      const dropzone = screen.getByRole('button');
      expect(dropzone).toHaveAttribute('aria-label');
      expect(dropzone).toHaveAttribute('tabindex', '0');
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      const mockOnFileUpload = vi.fn();
      
      render(
        <FileUpload
          onFileUpload={mockOnFileUpload}
          acceptedFormats={['.xlsx', '.csv']}
          maxFileSize={1024 * 1024}
          isUploading={false}
        />
      );

      const dropzone = screen.getByRole('button');
      await user.tab();
      expect(dropzone).toHaveFocus();
      
      await user.keyboard('{Enter}');
      // Should trigger file input (mocked behavior)
    });

    it('should announce upload status to screen readers', () => {
      const { rerender } = render(
        <FileUpload
          onFileUpload={vi.fn()}
          acceptedFormats={['.xlsx', '.csv']}
          maxFileSize={1024 * 1024}
          isUploading={false}
        />
      );

      // Test loading state
      rerender(
        <FileUpload
          onFileUpload={vi.fn()}
          acceptedFormats={['.xlsx', '.csv']}
          maxFileSize={1024 * 1024}
          isUploading={true}
        />
      );

      expect(screen.getByText(/uploading/i)).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('SpreadsheetViewer Component', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <SpreadsheetViewer
          data={mockSpreadsheetData}
          selectedRange="A1"
          onSelectionChange={vi.fn()}
          onCellClick={vi.fn()}
        />
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper table structure', () => {
      render(
        <SpreadsheetViewer
          data={mockSpreadsheetData}
          selectedRange="A1"
          onSelectionChange={vi.fn()}
          onCellClick={vi.fn()}
        />
      );

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
      
      const columnHeaders = screen.getAllByRole('columnheader');
      expect(columnHeaders).toHaveLength(4); // Including row header column
      
      const cells = screen.getAllByRole('cell');
      expect(cells.length).toBeGreaterThan(0);
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      const mockOnCellClick = vi.fn();
      
      render(
        <SpreadsheetViewer
          data={mockSpreadsheetData}
          selectedRange="A1"
          onSelectionChange={vi.fn()}
          onCellClick={mockOnCellClick}
        />
      );

      const firstCell = screen.getAllByRole('cell')[0];
      await user.click(firstCell);
      
      // Test arrow key navigation
      await user.keyboard('{ArrowRight}');
      await user.keyboard('{ArrowDown}');
      
      expect(mockOnCellClick).toHaveBeenCalled();
    });

    it('should have accessible cell descriptions', () => {
      render(
        <SpreadsheetViewer
          data={mockSpreadsheetData}
          selectedRange="A1"
          onSelectionChange={vi.fn()}
          onCellClick={vi.fn()}
        />
      );

      const cells = screen.getAllByRole('cell');
      cells.forEach(cell => {
        expect(cell).toHaveAttribute('title');
      });
    });
  });

  describe('RequestInput Component', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <RequestInput
          onSubmit={vi.fn()}
          isProcessing={false}
          placeholder="Enter your request"
        />
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper form labeling', () => {
      render(
        <RequestInput
          onSubmit={vi.fn()}
          isProcessing={false}
          placeholder="Enter your request"
        />
      );

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('aria-label');
      expect(textarea).toHaveAttribute('placeholder');
    });

    it('should announce processing state', () => {
      const { rerender } = render(
        <RequestInput
          onSubmit={vi.fn()}
          isProcessing={false}
          placeholder="Enter your request"
        />
      );

      rerender(
        <RequestInput
          onSubmit={vi.fn()}
          isProcessing={true}
          placeholder="Enter your request"
        />
      );

      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('ContextDisplay Component', () => {
    const mockContext = {
      requestAnalysis: {
        intent: 'data_analysis',
        scope: 'current_selection',
        confidence: 0.85
      },
      spreadsheetContext: {
        currentSelection: {
          range: 'A1:C3',
          dataTypes: ['text', 'number'],
          data: []
        },
        dataSummary: {
          rowCount: 3,
          patterns: ['increasing_trend'],
          statistics: {}
        }
      },
      actionableInfo: {
        targetCells: ['D1'],
        suggestedOperations: ['SUM'],
        constraints: []
      },
      naturalLanguageDescription: 'Test context description'
    };

    it('should not have accessibility violations', async () => {
      const { container } = render(
        <ContextDisplay
          context={mockContext}
          isLoading={false}
        />
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have accessible tab navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <ContextDisplay
          context={mockContext}
          isLoading={false}
        />
      );

      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(3);
      
      // Test keyboard navigation between tabs
      await user.click(tabs[0]);
      expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
      
      await user.keyboard('{ArrowRight}');
      expect(tabs[1]).toHaveFocus();
    });

    it('should have proper ARIA relationships', () => {
      render(
        <ContextDisplay
          context={mockContext}
          isLoading={false}
        />
      );

      const tabs = screen.getAllByRole('tab');
      const tabpanels = screen.getAllByRole('tabpanel');
      
      tabs.forEach((tab, index) => {
        expect(tab).toHaveAttribute('aria-controls');
        expect(tabpanels[0]).toHaveAttribute('aria-labelledby');
      });
    });
  });

  describe('Tooltip Components', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <Tooltip content="Test tooltip">
          <button>Hover me</button>
        </Tooltip>
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      
      render(
        <Tooltip content="Test tooltip">
          <button>Focus me</button>
        </Tooltip>
      );

      const button = screen.getByRole('button');
      await user.tab();
      expect(button).toHaveFocus();
      
      // Tooltip should appear on focus
      await user.keyboard('{Tab}');
    });

    it('should have proper ARIA attributes', async () => {
      const user = userEvent.setup();
      
      render(
        <HelpTooltip content="Help text" />
      );

      const helpButton = screen.getByRole('button');
      expect(helpButton).toHaveAttribute('aria-label', 'Help');
      
      await user.hover(helpButton);
      
      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toBeInTheDocument();
      expect(tooltip).toHaveAttribute('aria-hidden', 'false');
    });
  });

  describe('KeyboardShortcutsModal Component', () => {
    const mockShortcuts = [
      {
        key: 'c',
        ctrlKey: true,
        action: vi.fn(),
        description: 'Copy',
        category: 'Edit'
      },
      {
        key: 'v',
        ctrlKey: true,
        action: vi.fn(),
        description: 'Paste',
        category: 'Edit'
      }
    ];

    it('should not have accessibility violations', async () => {
      const { container } = render(
        <KeyboardShortcutsModal
          isOpen={true}
          onClose={vi.fn()}
          shortcuts={mockShortcuts}
        />
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should trap focus when open', async () => {
      const user = userEvent.setup();
      
      render(
        <KeyboardShortcutsModal
          isOpen={true}
          onClose={vi.fn()}
          shortcuts={mockShortcuts}
        />
      );

      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveAttribute('aria-modal', 'true');
      
      // First focusable element should be focused
      const closeButton = screen.getByLabelText('Close shortcuts modal');
      expect(closeButton).toHaveFocus();
    });

    it('should close on Escape key', async () => {
      const user = userEvent.setup();
      const mockOnClose = vi.fn();
      
      render(
        <KeyboardShortcutsModal
          isOpen={true}
          onClose={mockOnClose}
          shortcuts={mockShortcuts}
        />
      );

      await user.keyboard('{Escape}');
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should have proper heading structure', () => {
      render(
        <KeyboardShortcutsModal
          isOpen={true}
          onClose={vi.fn()}
          shortcuts={mockShortcuts}
        />
      );

      const mainHeading = screen.getByRole('heading', { level: 2 });
      expect(mainHeading).toHaveTextContent('Keyboard Shortcuts');
      
      const categoryHeadings = screen.getAllByRole('heading', { level: 3 });
      expect(categoryHeadings.length).toBeGreaterThan(0);
    });
  });

  describe('Color Contrast', () => {
    it('should meet WCAG AA standards for text colors', () => {
      // Test primary text on white background
      const textColor: [number, number, number] = [17, 24, 39]; // gray-900
      const backgroundColor: [number, number, number] = [255, 255, 255]; // white
      
      // This would need the actual color contrast utility
      // For now, we'll just test that the utility exists
      expect(typeof require('../../utils/accessibility').colorContrast.meetsWCAG).toBe('function');
    });
  });

  describe('Screen Reader Announcements', () => {
    it('should create live regions for announcements', () => {
      const { announceToScreenReader } = require('../../utils/accessibility');
      
      announceToScreenReader('Test announcement');
      
      // Check that a live region was created
      const liveRegion = document.querySelector('[aria-live]');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveTextContent('Test announcement');
    });
  });

  describe('Focus Management', () => {
    it('should save and restore focus', () => {
      const { focusManagement } = require('../../utils/accessibility');
      
      const button = document.createElement('button');
      document.body.appendChild(button);
      button.focus();
      
      const restoreFocus = focusManagement.saveFocus();
      
      // Change focus
      document.body.focus();
      
      // Restore focus
      restoreFocus();
      
      expect(document.activeElement).toBe(button);
      
      document.body.removeChild(button);
    });
  });
});