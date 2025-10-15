import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import ErrorDisplay, { ApiError } from '../ErrorDisplay';

describe('ErrorDisplay', () => {
  const mockApiError: ApiError = {
    code: 'INVALID_FILE_FORMAT',
    message: 'Unsupported file format',
    details: {
      receivedFormat: '.txt',
      supportedFormats: ['xlsx', 'xls', 'csv']
    },
    suggestions: [
      'Convert your file to Excel format (.xlsx or .xls)',
      'Save as CSV if working with simple tabular data'
    ],
    timestamp: '2023-01-01T00:00:00.000Z'
  };

  it('should render string error message', () => {
    render(<ErrorDisplay error="Simple error message" />);

    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Simple error message')).toBeInTheDocument();
  });

  it('should render API error with all details', () => {
    render(<ErrorDisplay error={mockApiError} title="Upload Failed" />);

    expect(screen.getByText('Upload Failed')).toBeInTheDocument();
    expect(screen.getByText('Unsupported file format')).toBeInTheDocument();
    expect(screen.getByText('INVALID_FILE_FORMAT')).toBeInTheDocument();
    expect(screen.getByText('Suggestions:')).toBeInTheDocument();
    expect(screen.getByText('Convert your file to Excel format (.xlsx or .xls)')).toBeInTheDocument();
    expect(screen.getByText('Save as CSV if working with simple tabular data')).toBeInTheDocument();
  });

  it('should show timestamp when provided', () => {
    render(<ErrorDisplay error={mockApiError} />);

    // Check that some timestamp is displayed (format may vary by timezone)
    const timestampElement = screen.getByText(/\d{1,2}\/\d{1,2}\/\d{4}/);
    expect(timestampElement).toBeInTheDocument();
  });

  it('should show technical details when showDetails is true', () => {
    render(<ErrorDisplay error={mockApiError} showDetails={true} />);

    expect(screen.getByText('Technical Details')).toBeInTheDocument();
    
    // Click to expand details
    fireEvent.click(screen.getByText('Technical Details'));
    
    expect(screen.getByText(/"receivedFormat": "\.txt"/)).toBeInTheDocument();
  });

  it('should not show technical details when showDetails is false', () => {
    render(<ErrorDisplay error={mockApiError} showDetails={false} />);

    expect(screen.queryByText('Technical Details')).not.toBeInTheDocument();
  });

  it('should call onRetry when retry button is clicked', () => {
    const onRetry = vi.fn();
    render(<ErrorDisplay error={mockApiError} onRetry={onRetry} />);

    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('should call onDismiss when dismiss button is clicked', () => {
    const onDismiss = vi.fn();
    render(<ErrorDisplay error={mockApiError} onDismiss={onDismiss} />);

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('should not show retry button when onRetry is not provided', () => {
    render(<ErrorDisplay error={mockApiError} />);

    expect(screen.queryByRole('button', { name: 'Try Again' })).not.toBeInTheDocument();
  });

  it('should not show dismiss button when onDismiss is not provided', () => {
    render(<ErrorDisplay error={mockApiError} />);

    expect(screen.queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument();
  });

  it('should apply different colors for different error types', () => {
    const rateLimitError: ApiError = {
      ...mockApiError,
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Rate limit exceeded'
    };

    const { rerender } = render(<ErrorDisplay error={rateLimitError} />);

    // Check for yellow styling (rate limit) - need to find the root container
    const container = screen.getByText('Rate limit exceeded').closest('.bg-yellow-50');
    expect(container).toBeInTheDocument();

    // Test AI service error (blue styling)
    const aiError: ApiError = {
      ...mockApiError,
      code: 'AI_SERVICE_UNAVAILABLE',
      message: 'AI service unavailable'
    };

    rerender(<ErrorDisplay error={aiError} />);
    const blueContainer = screen.getByText('AI service unavailable').closest('.bg-blue-50');
    expect(blueContainer).toBeInTheDocument();

    // Test file error (orange styling)
    const fileError: ApiError = {
      ...mockApiError,
      code: 'FILE_TOO_LARGE',
      message: 'File too large'
    };

    rerender(<ErrorDisplay error={fileError} />);
    const orangeContainer = screen.getByText('File too large').closest('.bg-orange-50');
    expect(orangeContainer).toBeInTheDocument();
  });

  it('should render appropriate icons for different error types', () => {
    const fileError: ApiError = {
      ...mockApiError,
      code: 'INVALID_FILE_FORMAT'
    };

    render(<ErrorDisplay error={fileError} />);

    // Check that an SVG icon is rendered (SVGs don't have img role by default)
    const svgElement = document.querySelector('svg');
    expect(svgElement).toBeInTheDocument();
  });

  it('should handle errors without suggestions', () => {
    const errorWithoutSuggestions: ApiError = {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
      timestamp: '2023-01-01T00:00:00.000Z'
    };

    render(<ErrorDisplay error={errorWithoutSuggestions} />);

    expect(screen.getByText('Internal server error')).toBeInTheDocument();
    expect(screen.queryByText('Suggestions:')).not.toBeInTheDocument();
  });

  it('should handle errors without details', () => {
    const errorWithoutDetails: ApiError = {
      code: 'SIMPLE_ERROR',
      message: 'Simple error',
      timestamp: '2023-01-01T00:00:00.000Z'
    };

    render(<ErrorDisplay error={errorWithoutDetails} showDetails={true} />);

    expect(screen.getByText('Simple error')).toBeInTheDocument();
    expect(screen.queryByText('Technical Details')).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<ErrorDisplay error="Test error" className="custom-class" />);

    // The custom class should be on the root container
    const rootContainer = screen.getByText('Test error').closest('.custom-class');
    expect(rootContainer).toBeInTheDocument();
  });
});