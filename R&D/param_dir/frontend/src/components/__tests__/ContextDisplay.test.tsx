import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ContextDisplay from '../ContextDisplay';
import { ContextAnalysisResponse, DataType } from '../../types';

import { vi } from 'vitest';

// Mock react-syntax-highlighter to avoid issues in test environment
vi.mock('react-syntax-highlighter', () => ({
  Prism: ({ children }: { children: string }) => <pre data-testid="syntax-highlighter">{children}</pre>
}));

vi.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({
  tomorrow: {}
}));

const mockContextData: ContextAnalysisResponse = {
  requestAnalysis: {
    intent: 'formula_assistance',
    scope: 'current_selection',
    confidence: 0.85
  },
  spreadsheetContext: {
    currentSelection: {
      range: 'A1:C10',
      data: [
        [
          { value: 'Name', dataType: DataType.TEXT, address: 'A1' },
          { value: 'Age', dataType: DataType.TEXT, address: 'B1' },
          { value: 'Salary', dataType: DataType.TEXT, address: 'C1' }
        ],
        [
          { value: 'John', dataType: DataType.TEXT, address: 'A2' },
          { value: 25, dataType: DataType.NUMBER, address: 'B2' },
          { value: 50000, dataType: DataType.NUMBER, address: 'C2' }
        ]
      ],
      dataTypes: ['text', 'number']
    },
    relatedFormulas: [
      {
        id: 'formula1',
        cellAddress: 'D2',
        formula: '=SUM(C:C)',
        dependencies: ['C:C'],
        precedents: [],
        isValid: true
      }
    ],
    dependencies: ['C:C'],
    dataSummary: {
      rowCount: 10,
      patterns: ['increasing_trend', 'missing_values'],
      statistics: {
        average_salary: 45000,
        max_age: 65,
        min_age: 22
      }
    }
  },
  actionableInfo: {
    targetCells: ['D1:D10'],
    suggestedOperations: ['SUM', 'AVERAGE'],
    constraints: ['non_empty_cells_only', 'numeric_values_only']
  },
  naturalLanguageDescription: 'The user is working with a dataset in range A1:C10 containing employee information with columns for Name, Age, and Salary. They have selected the range and appear to want help creating formulas for calculations.'
};

describe('ContextDisplay', () => {
  const user = userEvent.setup();

  describe('Loading State', () => {
    it('displays loading spinner when isLoading is true', () => {
      render(<ContextDisplay context={null} isLoading={true} />);
      
      expect(screen.getByText('Analyzing context...')).toBeInTheDocument();
      const spinner = screen.getByText('Analyzing context...').previousElementSibling;
      expect(spinner).toHaveClass('animate-spin');
    });
  });

  describe('Error State', () => {
    it('displays error message when error prop is provided', () => {
      const errorMessage = 'Failed to analyze context';
      render(<ContextDisplay context={null} isLoading={false} error={errorMessage} />);
      
      expect(screen.getByText('Error Loading Context')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('displays empty state when no context is provided', () => {
      render(<ContextDisplay context={null} isLoading={false} />);
      
      expect(screen.getByText('No Context Available')).toBeInTheDocument();
      expect(screen.getByText('Submit a request to see the generated context analysis.')).toBeInTheDocument();
    });
  });

  describe('Context Display with Data', () => {
    beforeEach(() => {
      render(<ContextDisplay context={mockContextData} isLoading={false} />);
    });

    it('renders tab navigation correctly', () => {
      expect(screen.getByRole('button', { name: /📝 Natural Language/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /{ } JSON Data/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /📊 Visual/i })).toBeInTheDocument();
    });

    it('displays natural language tab by default', () => {
      expect(screen.getByText('Context Summary')).toBeInTheDocument();
      expect(screen.getByText(mockContextData.naturalLanguageDescription)).toBeInTheDocument();
    });

    it('displays confidence indicator', () => {
      expect(screen.getByText('Confidence:')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
    });

    it('switches to JSON tab when clicked', async () => {
      const jsonTab = screen.getByRole('button', { name: /{ } JSON Data/i });
      await user.click(jsonTab);
      
      expect(screen.getByText('JSON Context Data')).toBeInTheDocument();
      expect(screen.getByTestId('syntax-highlighter')).toBeInTheDocument();
    });

    it('switches to visual tab when clicked', async () => {
      const visualTab = screen.getByRole('button', { name: /📊 Visual/i });
      await user.click(visualTab);
      
      expect(screen.getByText('Request Analysis')).toBeInTheDocument();
      expect(screen.getByText('Data Overview')).toBeInTheDocument();
    });

    it('displays active tab with correct styling', async () => {
      const naturalTab = screen.getByRole('button', { name: /📝 Natural Language/i });
      const jsonTab = screen.getByRole('button', { name: /{ } JSON Data/i });
      
      // Natural tab should be active by default
      expect(naturalTab).toHaveClass('border-blue-500', 'text-blue-600');
      expect(jsonTab).toHaveClass('border-transparent', 'text-gray-500');
      
      // Switch to JSON tab
      await user.click(jsonTab);
      
      expect(jsonTab).toHaveClass('border-blue-500', 'text-blue-600');
      expect(naturalTab).toHaveClass('border-transparent', 'text-gray-500');
    });
  });

  describe('Natural Language Tab', () => {
    beforeEach(() => {
      render(<ContextDisplay context={mockContextData} isLoading={false} />);
    });

    it('displays request analysis information', async () => {
      const requestAnalysisButton = screen.getByRole('button', { name: /Request Analysis/i });
      await user.click(requestAnalysisButton);
      
      expect(screen.getByText('formula assistance')).toBeInTheDocument();
      expect(screen.getByText('current selection')).toBeInTheDocument();
    });

    it('displays data summary with row count', async () => {
      const dataSummaryButton = screen.getByRole('button', { name: /Data Summary/i });
      await user.click(dataSummaryButton);
      
      expect(screen.getByText('10')).toBeInTheDocument(); // row count
    });

    it('displays detected patterns as badges', async () => {
      const dataSummaryButton = screen.getByRole('button', { name: /Data Summary/i });
      await user.click(dataSummaryButton);
      
      expect(screen.getByText('increasing trend')).toBeInTheDocument();
      expect(screen.getByText('missing values')).toBeInTheDocument();
    });

    it('displays statistics when available', async () => {
      const dataSummaryButton = screen.getByRole('button', { name: /Data Summary/i });
      await user.click(dataSummaryButton);
      
      expect(screen.getByText('average salary:')).toBeInTheDocument();
      expect(screen.getByText('45000')).toBeInTheDocument();
    });

    it('displays actionable information', async () => {
      const actionableButton = screen.getByRole('button', { name: /Actionable Information/i });
      await user.click(actionableButton);
      
      expect(screen.getByText('D1:D10')).toBeInTheDocument();
      expect(screen.getByText('SUM')).toBeInTheDocument();
      expect(screen.getByText('AVERAGE')).toBeInTheDocument();
    });

    it('displays constraints', async () => {
      const actionableButton = screen.getByRole('button', { name: /Actionable Information/i });
      await user.click(actionableButton);
      
      expect(screen.getByText('non empty_cells_only')).toBeInTheDocument();
      expect(screen.getByText('numeric values_only')).toBeInTheDocument();
    });
  });

  describe('Expandable Sections', () => {
    beforeEach(() => {
      render(<ContextDisplay context={mockContextData} isLoading={false} />);
    });

    it('expands and collapses sections when clicked', async () => {
      const requestAnalysisButton = screen.getByRole('button', { name: /Request Analysis/i });
      
      // Section should be collapsed by default
      expect(screen.queryByText('Intent:')).not.toBeInTheDocument();
      
      // Click to expand
      await user.click(requestAnalysisButton);
      expect(screen.getByText('Intent:')).toBeInTheDocument();
      expect(screen.getByText('Scope:')).toBeInTheDocument();
      
      // Click to collapse
      await user.click(requestAnalysisButton);
      expect(screen.queryByText('Intent:')).not.toBeInTheDocument();
    });

    it('rotates chevron icon when expanding/collapsing', async () => {
      const requestAnalysisButton = screen.getByRole('button', { name: /Request Analysis/i });
      const chevronIcon = requestAnalysisButton.querySelector('svg');
      
      expect(chevronIcon).not.toHaveClass('rotate-180');
      
      await user.click(requestAnalysisButton);
      expect(chevronIcon).toHaveClass('rotate-180');
      
      await user.click(requestAnalysisButton);
      expect(chevronIcon).not.toHaveClass('rotate-180');
    });

    it('allows multiple sections to be expanded simultaneously', async () => {
      const requestAnalysisButton = screen.getByRole('button', { name: /Request Analysis/i });
      const dataSummaryButton = screen.getByRole('button', { name: /Data Summary/i });
      
      await user.click(requestAnalysisButton);
      await user.click(dataSummaryButton);
      
      expect(screen.getByText('Intent:')).toBeInTheDocument();
      expect(screen.getByText('Rows:')).toBeInTheDocument();
    });
  });

  describe('Visual Tab', () => {
    beforeEach(async () => {
      render(<ContextDisplay context={mockContextData} isLoading={false} />);
      const visualTab = screen.getByRole('button', { name: /📊 Visual/i });
      await user.click(visualTab);
    });

    it('displays request analysis cards', () => {
      expect(screen.getByText('Request Analysis')).toBeInTheDocument();
      expect(screen.getByText('formula assistance')).toBeInTheDocument();
      expect(screen.getByText('current selection')).toBeInTheDocument();
    });

    it('displays data overview cards', () => {
      expect(screen.getByText('Data Overview')).toBeInTheDocument();
      expect(screen.getByText('A1:C10')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument(); // row count
    });

    it('displays data types visualization', () => {
      expect(screen.getByText('Data Types')).toBeInTheDocument();
      expect(screen.getByText('TEXT')).toBeInTheDocument();
      expect(screen.getByText('NUMBER')).toBeInTheDocument();
    });

    it('displays detected patterns visualization', () => {
      expect(screen.getByText('Detected Patterns')).toBeInTheDocument();
      expect(screen.getByText('INCREASING TREND')).toBeInTheDocument();
      expect(screen.getByText('MISSING VALUES')).toBeInTheDocument();
    });
  });

  describe('JSON Tab', () => {
    beforeEach(async () => {
      render(<ContextDisplay context={mockContextData} isLoading={false} />);
      const jsonTab = screen.getByRole('button', { name: /{ } JSON Data/i });
      await user.click(jsonTab);
    });

    it('displays JSON context data with syntax highlighting', () => {
      expect(screen.getByText('JSON Context Data')).toBeInTheDocument();
      expect(screen.getByTestId('syntax-highlighter')).toBeInTheDocument();
    });

    it('displays confidence indicator in JSON tab', () => {
      expect(screen.getByText('Confidence:')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
    });
  });

  describe('Confidence Indicator', () => {
    it('displays green color for high confidence', () => {
      const highConfidenceData = {
        ...mockContextData,
        requestAnalysis: { ...mockContextData.requestAnalysis, confidence: 0.9 }
      };
      
      render(<ContextDisplay context={highConfidenceData} isLoading={false} />);
      
      const confidenceBar = screen.getByText('90%').previousElementSibling?.querySelector('div');
      expect(confidenceBar).toHaveClass('bg-green-500');
    });

    it('displays yellow color for medium confidence', () => {
      const mediumConfidenceData = {
        ...mockContextData,
        requestAnalysis: { ...mockContextData.requestAnalysis, confidence: 0.7 }
      };
      
      render(<ContextDisplay context={mediumConfidenceData} isLoading={false} />);
      
      const confidenceBar = screen.getByText('70%').previousElementSibling?.querySelector('div');
      expect(confidenceBar).toHaveClass('bg-yellow-500');
    });

    it('displays red color for low confidence', () => {
      const lowConfidenceData = {
        ...mockContextData,
        requestAnalysis: { ...mockContextData.requestAnalysis, confidence: 0.4 }
      };
      
      render(<ContextDisplay context={lowConfidenceData} isLoading={false} />);
      
      const confidenceBar = screen.getByText('40%').previousElementSibling?.querySelector('div');
      expect(confidenceBar).toHaveClass('bg-red-500');
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      render(<ContextDisplay context={mockContextData} isLoading={false} />);
    });

    it('has proper ARIA labels for tab navigation', () => {
      const tabList = screen.getByRole('navigation', { name: 'Tabs' });
      expect(tabList).toBeInTheDocument();
    });

    it('has proper button roles for expandable sections', () => {
      const expandButtons = screen.getAllByRole('button');
      const sectionButtons = expandButtons.filter(button => 
        button.textContent?.includes('Request Analysis') ||
        button.textContent?.includes('Data Summary') ||
        button.textContent?.includes('Actionable Information')
      );
      
      expect(sectionButtons.length).toBeGreaterThan(0);
    });

    it('supports keyboard navigation for tabs', async () => {
      const naturalTab = screen.getByRole('button', { name: /📝 Natural Language/i });
      const jsonTab = screen.getByRole('button', { name: /{ } JSON Data/i });
      
      naturalTab.focus();
      expect(naturalTab).toHaveFocus();
      
      await user.keyboard('{Tab}');
      expect(jsonTab).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty arrays gracefully', () => {
      const emptyArraysData = {
        ...mockContextData,
        spreadsheetContext: {
          ...mockContextData.spreadsheetContext,
          dataSummary: {
            ...mockContextData.spreadsheetContext.dataSummary,
            patterns: []
          }
        },
        actionableInfo: {
          targetCells: [],
          suggestedOperations: [],
          constraints: []
        }
      };
      
      render(<ContextDisplay context={emptyArraysData} isLoading={false} />);
      
      // Should not crash and should still display other information
      expect(screen.getByText('Context Summary')).toBeInTheDocument();
    });

    it('handles missing statistics gracefully', () => {
      const noStatsData = {
        ...mockContextData,
        spreadsheetContext: {
          ...mockContextData.spreadsheetContext,
          dataSummary: {
            ...mockContextData.spreadsheetContext.dataSummary,
            statistics: {}
          }
        }
      };
      
      render(<ContextDisplay context={noStatsData} isLoading={false} />);
      
      // Should not display statistics section
      expect(screen.queryByText('Statistics:')).not.toBeInTheDocument();
    });

    it('handles very long text content', () => {
      const longTextData = {
        ...mockContextData,
        naturalLanguageDescription: 'A'.repeat(1000)
      };
      
      render(<ContextDisplay context={longTextData} isLoading={false} />);
      
      expect(screen.getByText('A'.repeat(1000))).toBeInTheDocument();
    });
  });
});