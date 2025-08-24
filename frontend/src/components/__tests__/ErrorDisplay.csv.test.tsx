/**
 * Tests for CSV-specific error handling in ErrorDisplay component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import ErrorDisplay, { ApiError } from '../ErrorDisplay';

describe('ErrorDisplay - CSV Error Handling', () => {
  const createCSVError = (code: string, details?: Record<string, any>): ApiError => ({
    code,
    message: `CSV error: ${code}`,
    details: {
      errorType: 'CSV_ERROR',
      ...details
    },
    suggestions: [
      'This is a CSV-specific suggestion',
      'Try fixing the CSV format'
    ],
    timestamp: new Date().toISOString()
  });

  describe('CSV error styling', () => {
    it('should apply orange styling for CSV errors', () => {
      const csvError = createCSVError('CSV_DELIMITER_DETECTION_FAILED');
      render(<ErrorDisplay error={csvError} />);

      const errorContainer = screen.getByRole('alert', { hidden: true }) || 
                           screen.getByText(/CSV error/).closest('div');
      expect(errorContainer).toHaveClass('bg-orange-50', 'border-orange-200');
    });

    it('should use CSV-specific icon for CSV errors', () => {
      const csvError = createCSVError('CSV_MALFORMED');
      render(<ErrorDisplay error={csvError} />);

      // Check for the presence of an SVG icon (CSV errors use document icon)
      const icon = screen.getByRole('img', { hidden: true }) || 
                  document.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should apply orange text colors for CSV errors', () => {
      const csvError = createCSVError('CSV_ENCODING_DETECTION_FAILED');
      render(<ErrorDisplay error={csvError} />);

      const title = screen.getByText('Error');
      expect(title).toHaveClass('text-orange-800');
    });
  });

  describe('CSV error details display', () => {
    it('should display detected delimiter information', () => {
      const csvError = createCSVError('CSV_DELIMITER_DETECTION_FAILED', {
        detectedDelimiter: ';'
      });
      render(<ErrorDisplay error={csvError} />);

      expect(screen.getByText(/Detected delimiter:/)).toBeInTheDocument();
      expect(screen.getByText(/";"/)).toBeInTheDocument();
    });

    it('should display detected encoding information', () => {
      const csvError = createCSVError('CSV_ENCODING_DETECTION_FAILED', {
        detectedEncoding: 'utf8'
      });
      render(<ErrorDisplay error={csvError} />);

      expect(screen.getByText(/Detected encoding:/)).toBeInTheDocument();
      expect(screen.getByText(/utf8/)).toBeInTheDocument();
    });

    it('should display row number for row-specific errors', () => {
      const csvError = createCSVError('CSV_ROW_PARSING_FAILED', {
        rowNumber: 15
      });
      render(<ErrorDisplay error={csvError} />);

      expect(screen.getByText(/Problem at row:/)).toBeInTheDocument();
      expect(screen.getByText(/15/)).toBeInTheDocument();
    });

    it('should display column mismatch information', () => {
      const csvError = createCSVError('CSV_COLUMN_COUNT_MISMATCH', {
        expectedColumns: 10,
        actualColumns: 7
      });
      render(<ErrorDisplay error={csvError} />);

      expect(screen.getByText(/Column mismatch:/)).toBeInTheDocument();
      expect(screen.getByText(/Expected 10, found 7/)).toBeInTheDocument();
    });

    it('should display multiple CSV details when available', () => {
      const csvError = createCSVError('CSV_MALFORMED', {
        detectedDelimiter: ',',
        detectedEncoding: 'utf8',
        rowNumber: 5
      });
      render(<ErrorDisplay error={csvError} />);

      expect(screen.getByText(/Detected delimiter:/)).toBeInTheDocument();
      expect(screen.getByText(/Detected encoding:/)).toBeInTheDocument();
      expect(screen.getByText(/Problem at row:/)).toBeInTheDocument();
    });

    it('should not display CSV details section for non-CSV errors', () => {
      const nonCSVError: ApiError = {
        code: 'INVALID_FILE_FORMAT',
        message: 'Invalid file format',
        details: {},
        suggestions: ['Try a different format'],
        timestamp: new Date().toISOString()
      };
      render(<ErrorDisplay error={nonCSVError} />);

      expect(screen.queryByText(/Detected delimiter:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Detected encoding:/)).not.toBeInTheDocument();
    });
  });

  describe('CSV error suggestions', () => {
    it('should display CSV-specific suggestions title', () => {
      const csvError = createCSVError('CSV_DELIMITER_DETECTION_FAILED');
      render(<ErrorDisplay error={csvError} />);

      expect(screen.getByText('How to fix this CSV issue:')).toBeInTheDocument();
    });

    it('should display regular suggestions title for non-CSV errors', () => {
      const nonCSVError: ApiError = {
        code: 'INVALID_FILE_FORMAT',
        message: 'Invalid file format',
        details: {},
        suggestions: ['Try a different format'],
        timestamp: new Date().toISOString()
      };
      render(<ErrorDisplay error={nonCSVError} />);

      expect(screen.getByText('Suggestions:')).toBeInTheDocument();
      expect(screen.queryByText('How to fix this CSV issue:')).not.toBeInTheDocument();
    });

    it('should display CSV error suggestions', () => {
      const csvError = createCSVError('CSV_MALFORMED');
      render(<ErrorDisplay error={csvError} />);

      expect(screen.getByText('This is a CSV-specific suggestion')).toBeInTheDocument();
      expect(screen.getByText('Try fixing the CSV format')).toBeInTheDocument();
    });
  });

  describe('CSV error codes', () => {
    const csvErrorCodes = [
      'CSV_DELIMITER_DETECTION_FAILED',
      'CSV_ENCODING_DETECTION_FAILED',
      'CSV_MALFORMED',
      'CSV_INCONSISTENT_COLUMNS',
      'CSV_EMPTY_FILE',
      'CSV_PARSE_ERROR',
      'CSV_INVALID_DELIMITER',
      'CSV_ENCODING_CONVERSION_FAILED',
      'CSV_ROW_PARSING_FAILED',
      'CSV_COLUMN_COUNT_MISMATCH'
    ];

    csvErrorCodes.forEach(errorCode => {
      it(`should handle ${errorCode} error code correctly`, () => {
        const csvError = createCSVError(errorCode);
        render(<ErrorDisplay error={csvError} />);

        // Check that the error code is displayed
        expect(screen.getByText(errorCode)).toBeInTheDocument();
        
        // Check that orange styling is applied
        const errorContainer = screen.getByText(/CSV error/).closest('div');
        expect(errorContainer).toHaveClass('bg-orange-50');
      });
    });
  });

  describe('CSV error interactions', () => {
    it('should handle retry button for CSV errors', () => {
      const onRetry = vi.fn();
      const csvError = createCSVError('CSV_PARSE_ERROR');
      render(<ErrorDisplay error={csvError} onRetry={onRetry} />);

      const retryButton = screen.getByText('Try Again');
      expect(retryButton).toBeInTheDocument();
      expect(retryButton).toHaveClass('text-orange-700', 'bg-orange-100');

      fireEvent.click(retryButton);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should handle dismiss button for CSV errors', () => {
      const onDismiss = vi.fn();
      const csvError = createCSVError('CSV_EMPTY_FILE');
      render(<ErrorDisplay error={csvError} onDismiss={onDismiss} />);

      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      expect(dismissButton).toBeInTheDocument();
      expect(dismissButton).toHaveClass('text-orange-500');

      fireEvent.click(dismissButton);
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('CSV error badge styling', () => {
    it('should apply orange badge styling for CSV error codes', () => {
      const csvError = createCSVError('CSV_DELIMITER_DETECTION_FAILED');
      render(<ErrorDisplay error={csvError} />);

      const badge = screen.getByText('CSV_DELIMITER_DETECTION_FAILED');
      expect(badge).toHaveClass('bg-orange-100', 'text-orange-800');
    });
  });

  describe('CSV error accessibility', () => {
    it('should provide accessible error information for CSV errors', () => {
      const csvError = createCSVError('CSV_MALFORMED', {
        rowNumber: 10,
        detectedDelimiter: ','
      });
      render(<ErrorDisplay error={csvError} />);

      // Check that error information is accessible
      expect(screen.getByText(/CSV error/)).toBeInTheDocument();
      expect(screen.getByText(/Problem at row:/)).toBeInTheDocument();
      expect(screen.getByText(/Detected delimiter:/)).toBeInTheDocument();
    });

    it('should maintain proper heading hierarchy for CSV errors', () => {
      const csvError = createCSVError('CSV_ENCODING_DETECTION_FAILED');
      render(<ErrorDisplay error={csvError} title="CSV Upload Error" />);

      const title = screen.getByText('CSV Upload Error');
      expect(title.tagName).toBe('H3');
      
      const suggestionsTitle = screen.getByText('How to fix this CSV issue:');
      expect(suggestionsTitle.tagName).toBe('H4');
    });
  });

  describe('Edge cases', () => {
    it('should handle CSV error with no details', () => {
      const csvError: ApiError = {
        code: 'CSV_PARSE_ERROR',
        message: 'CSV parsing failed',
        suggestions: ['Check the file'],
        timestamp: new Date().toISOString()
      };
      render(<ErrorDisplay error={csvError} />);

      expect(screen.getByText('CSV parsing failed')).toBeInTheDocument();
      expect(screen.queryByText(/Detected delimiter:/)).not.toBeInTheDocument();
    });

    it('should handle CSV error with empty details object', () => {
      const csvError = createCSVError('CSV_MALFORMED', {});
      render(<ErrorDisplay error={csvError} />);

      expect(screen.getByText(/CSV error/)).toBeInTheDocument();
      expect(screen.queryByText(/Detected delimiter:/)).not.toBeInTheDocument();
    });

    it('should handle CSV error with partial details', () => {
      const csvError = createCSVError('CSV_INCONSISTENT_COLUMNS', {
        rowNumber: 5,
        // Missing expectedColumns and actualColumns
      });
      render(<ErrorDisplay error={csvError} />);

      expect(screen.getByText(/Problem at row:/)).toBeInTheDocument();
      expect(screen.queryByText(/Column mismatch:/)).not.toBeInTheDocument();
    });
  });
});