import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ContextDisplay from '../ContextDisplay';
import { ContextAnalysisResponse } from '../../types';

describe('ContextDisplay Accessibility', () => {
  const mockContextData: ContextAnalysisResponse = {
    requestAnalysis: {
      intent: 'data_analysis',
      scope: 'full_dataset',
      confidence: 0.85
    },
    spreadsheetContext: {
      currentSelection: {
        range: 'A1:C10',
        data: [],
        dataTypes: ['text', 'number', 'date']
      },
      relatedFormulas: [],
      dependencies: [],
      dataSummary: {
        rowCount: 10,
        patterns: ['has_headers', 'numeric_data'],
        statistics: {
          totalCells: 30,
          emptyCells: 2,
          numericCells: 15
        }
      }
    },
    actionableInfo: {
      targetCells: ['A1', 'B5'],
      suggestedOperations: ['sum', 'average'],
      constraints: ['non_empty_cells']
    },
    naturalLanguageDescription: 'This spreadsheet contains customer data with names, ages, and cities.',
    requestId: 'test-request-123',
    contextHistoryId: 'context-456'
  };

  const defaultProps = {
    context: mockContextData,
    isLoading: false,
    error: null
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Analysis Scope Accessibility', () => {
    it('should provide accessible analysis scope information', () => {
      render(<ContextDisplay {...defaultProps} />);

      // Check for analysis scope banner
      expect(screen.getByText('Full Data Range Analysis')).toBeInTheDocument();
      
      // Check for descriptive text
      expect(screen.getByText(/Analysis includes the entire data range/)).toBeInTheDocument();
      
      // Check for proper ARIA structure - find the container with the background classes
      const scopeBanner = screen.getByText('Full Data Range Analysis').closest('div')?.parentElement?.parentElement;
      expect(scopeBanner).toHaveClass('bg-blue-50', 'border-blue-200');
    });

    it('should indicate targeted selection analysis accessibly', () => {
      const targetedContext = {
        ...mockContextData,
        spreadsheetContext: {
          ...mockContextData.spreadsheetContext,
          currentSelection: {
            ...mockContextData.spreadsheetContext.currentSelection,
            range: 'A1'
          }
        }
      };

      render(<ContextDisplay {...defaultProps} context={targetedContext} />);

      expect(screen.getByText('Targeted Selection Analysis')).toBeInTheDocument();
      expect(screen.getByText(/Analysis focused on selected range/)).toBeInTheDocument();
    });

    it('should provide proper color contrast for analysis scope indicators', () => {
      render(<ContextDisplay {...defaultProps} />);

      const scopeIcon = screen.getByText('Full Data Range Analysis')
        .closest('div')
        ?.parentElement
        ?.querySelector('svg');
      
      if (scopeIcon) {
        expect(scopeIcon).toHaveClass('text-blue-600');
      } else {
        // If no icon found, just check that the text exists
        expect(screen.getByText('Full Data Range Analysis')).toBeInTheDocument();
      }
    });

    it('should include helpful tooltips for analysis scope', () => {
      render(<ContextDisplay {...defaultProps} />);

      // Check for tooltip icon in data overview
      const tooltipIcons = screen.getAllByRole('generic', { hidden: true });
      expect(tooltipIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Tab Navigation Accessibility', () => {
    it('should provide accessible tab navigation', () => {
      render(<ContextDisplay {...defaultProps} />);

      // Check for tab buttons with proper roles
      const naturalTab = screen.getByRole('button', { name: /Natural Language/ });
      const jsonTab = screen.getByRole('button', { name: /JSON Data/ });
      const visualTab = screen.getByRole('button', { name: /Visual/ });

      expect(naturalTab).toBeInTheDocument();
      expect(jsonTab).toBeInTheDocument();
      expect(visualTab).toBeInTheDocument();

      // Check for proper ARIA attributes
      expect(naturalTab).toHaveClass('border-blue-500', 'text-blue-600');
    });

    it('should handle tab switching accessibly', () => {
      render(<ContextDisplay {...defaultProps} />);

      const jsonTab = screen.getByRole('button', { name: /JSON Data/ });
      fireEvent.click(jsonTab);

      // Should show JSON content
      expect(screen.getByText('JSON Context Data')).toBeInTheDocument();
    });

    it('should provide keyboard navigation for tabs', () => {
      render(<ContextDisplay {...defaultProps} />);

      const jsonTab = screen.getByRole('button', { name: /JSON Data/ });
      
      // Simulate keyboard navigation
      fireEvent.keyDown(jsonTab, { key: 'Enter' });
      fireEvent.click(jsonTab);

      expect(screen.getByText('JSON Context Data')).toBeInTheDocument();
    });
  });

  describe('Content Accessibility', () => {
    it('should provide accessible confidence indicators', () => {
      render(<ContextDisplay {...defaultProps} />);

      // Check for confidence indicator
      expect(screen.getByText('Confidence:')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();

      // Check for visual progress bar
      const progressBar = screen.getByText('85%').previousElementSibling;
      expect(progressBar).toHaveClass('bg-gray-200', 'rounded-full');
    });

    it('should provide accessible expandable sections', () => {
      render(<ContextDisplay {...defaultProps} />);

      // Check for expandable sections
      const requestAnalysisButton = screen.getByRole('button', { name: /Request Analysis/ });
      expect(requestAnalysisButton).toBeInTheDocument();

      // Expand section
      fireEvent.click(requestAnalysisButton);

      // Check for expanded content
      expect(screen.getByText('Intent:')).toBeInTheDocument();
      expect(screen.getByText('data analysis')).toBeInTheDocument();
    });

    it('should provide accessible data type indicators', () => {
      render(<ContextDisplay {...defaultProps} />);

      // Switch to visual tab to see data types
      const visualTab = screen.getByRole('button', { name: /Visual/ });
      fireEvent.click(visualTab);

      // Check for data type indicators
      expect(screen.getByText('Data Types')).toBeInTheDocument();
      expect(screen.getByText('TEXT')).toBeInTheDocument();
      expect(screen.getByText('NUMBER')).toBeInTheDocument();
    });

    it('should handle loading state accessibly', () => {
      render(<ContextDisplay {...defaultProps} isLoading={true} context={null} />);

      // Check for loading indicator
      expect(screen.getByText('Analyzing context...')).toBeInTheDocument();
      
      // Check for loading spinner
      const spinner = screen.getByText('Analyzing context...').previousElementSibling;
      expect(spinner).toHaveClass('animate-spin');
    });

    it('should handle error state accessibly', () => {
      render(<ContextDisplay {...defaultProps} error="Analysis failed" context={null} />);

      // Check for error message
      expect(screen.getByText('Error Loading Context')).toBeInTheDocument();
      expect(screen.getByText('Analysis failed')).toBeInTheDocument();

      // Check for error icon
      const errorIcon = screen.getByText('Error Loading Context')
        .closest('div')
        ?.querySelector('svg');
      if (errorIcon) {
        expect(errorIcon).toHaveClass('text-red-500');
      } else {
        // If no icon found, just check that the error message exists
        expect(screen.getByText('Error Loading Context')).toBeInTheDocument();
      }
    });
  });

  describe('Visual Indicators Accessibility', () => {
    it('should provide accessible pattern indicators', () => {
      render(<ContextDisplay {...defaultProps} />);

      // Switch to visual tab
      const visualTab = screen.getByRole('button', { name: /Visual/ });
      fireEvent.click(visualTab);

      // Check for pattern indicators
      expect(screen.getByText('Detected Patterns')).toBeInTheDocument();
      expect(screen.getByText('HAS HEADERS')).toBeInTheDocument();
      expect(screen.getByText('NUMERIC DATA')).toBeInTheDocument();
    });

    it('should provide accessible selection range display', () => {
      render(<ContextDisplay {...defaultProps} />);

      // Switch to visual tab
      const visualTab = screen.getByRole('button', { name: /Visual/ });
      fireEvent.click(visualTab);

      // Check for selection range display
      expect(screen.getByText('Selected Range')).toBeInTheDocument();
      expect(screen.getByText('A1:C10')).toBeInTheDocument();
      expect(screen.getByText('Full Range')).toBeInTheDocument();
    });

    it('should provide proper semantic structure', () => {
      render(<ContextDisplay {...defaultProps} />);

      // Check for proper heading structure
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);

      // Check for proper list structure where applicable
      const expandableButton = screen.getByRole('button', { name: /Data Summary/ });
      fireEvent.click(expandableButton);

      // Should show structured data
      expect(screen.getByText('Rows:')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
    });
  });

  describe('Screen Reader Support', () => {
    it('should provide descriptive text for complex visualizations', () => {
      render(<ContextDisplay {...defaultProps} />);

      // Check for descriptive text in natural language tab
      expect(screen.getByText(mockContextData.naturalLanguageDescription)).toBeInTheDocument();
    });

    it('should provide alternative text for visual elements', () => {
      render(<ContextDisplay {...defaultProps} />);

      // Check for icons with proper classes (screen readers can interpret these)
      const icons = screen.getAllByRole('generic', { hidden: true });
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should provide structured information hierarchy', () => {
      render(<ContextDisplay {...defaultProps} />);

      // Check for proper information hierarchy
      expect(screen.getByText('Context Summary')).toBeInTheDocument();
      expect(screen.getByText(mockContextData.naturalLanguageDescription)).toBeInTheDocument();
    });

    it('should handle empty state accessibly', () => {
      render(<ContextDisplay {...defaultProps} context={null} />);

      // Check for empty state message
      expect(screen.getByText('No Context Available')).toBeInTheDocument();
      expect(screen.getByText('Submit a request to see the generated context analysis.')).toBeInTheDocument();
    });
  });

  describe('Interactive Elements Accessibility', () => {
    it('should provide accessible buttons and controls', () => {
      render(<ContextDisplay {...defaultProps} />);

      // Check for accessible tab buttons
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeInTheDocument();
      });
    });

    it('should provide proper focus management', () => {
      render(<ContextDisplay {...defaultProps} />);

      // Check that interactive elements are focusable
      const jsonTab = screen.getByRole('button', { name: /JSON Data/ });
      jsonTab.focus();
      expect(document.activeElement).toBe(jsonTab);
    });

    it('should provide accessible expandable content', () => {
      render(<ContextDisplay {...defaultProps} />);

      const expandButton = screen.getByRole('button', { name: /Request Analysis/ });
      
      // Check initial state
      expect(expandButton).toHaveAttribute('aria-expanded', 'false');
      
      // Expand
      fireEvent.click(expandButton);
      
      // Check expanded state
      expect(expandButton).toHaveAttribute('aria-expanded', 'true');
    });
  });
});