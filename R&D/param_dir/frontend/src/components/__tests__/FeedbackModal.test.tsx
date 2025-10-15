import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeedbackModal } from '../FeedbackModal';

describe('FeedbackModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSubmit: jest.fn(),
    requestId: 'test-request-id',
    contextId: 'test-context-id',
    contextPreview: 'Test context preview'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render when open', () => {
    render(<FeedbackModal {...defaultProps} />);
    
    expect(screen.getByText('Provide Feedback')).toBeInTheDocument();
    expect(screen.getByText('Test context preview')).toBeInTheDocument();
    expect(screen.getByText('How satisfied were you with the context provided?')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<FeedbackModal {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Provide Feedback')).not.toBeInTheDocument();
  });

  it('should handle satisfaction rating selection', async () => {
    const user = userEvent.setup();
    render(<FeedbackModal {...defaultProps} />);
    
    const starButtons = screen.getAllByRole('button').filter(button => 
      button.querySelector('svg')
    );
    
    // Click on 4th star (rating 4)
    await user.click(starButtons[3]);
    
    expect(screen.getByText('Good')).toBeInTheDocument();
  });

  it('should handle feedback text input', async () => {
    const user = userEvent.setup();
    render(<FeedbackModal {...defaultProps} />);
    
    const textArea = screen.getByPlaceholderText('Tell us what worked well or what could be improved...');
    await user.type(textArea, 'This is my feedback');
    
    expect(textArea).toHaveValue('This is my feedback');
  });

  it('should show corrections section for low ratings', async () => {
    const user = userEvent.setup();
    render(<FeedbackModal {...defaultProps} />);
    
    const starButtons = screen.getAllByRole('button').filter(button => 
      button.querySelector('svg')
    );
    
    // Click on 2nd star (rating 2)
    await user.click(starButtons[1]);
    
    expect(screen.getByText('Context Corrections (Optional)')).toBeInTheDocument();
    expect(screen.getByText('+ Add Correction')).toBeInTheDocument();
  });

  it('should add and remove corrections', async () => {
    const user = userEvent.setup();
    render(<FeedbackModal {...defaultProps} />);
    
    const starButtons = screen.getAllByRole('button').filter(button => 
      button.querySelector('svg')
    );
    
    // Click on 2nd star to show corrections section
    await user.click(starButtons[1]);
    
    // Add correction
    await user.click(screen.getByText('+ Add Correction'));
    expect(screen.getByText('Correction 1')).toBeInTheDocument();
    
    // Fill correction fields
    const fieldInput = screen.getByPlaceholderText('e.g., selectedRange, dataTypes');
    await user.type(fieldInput, 'intent');
    
    const expectedValueInput = screen.getByPlaceholderText('What should it have been?');
    await user.type(expectedValueInput, 'formula_assistance');
    
    const actualValueInput = screen.getByPlaceholderText('What was provided?');
    await user.type(actualValueInput, 'data_analysis');
    
    expect(fieldInput).toHaveValue('intent');
    expect(expectedValueInput).toHaveValue('formula_assistance');
    expect(actualValueInput).toHaveValue('data_analysis');
    
    // Remove correction
    const removeButton = screen.getByRole('button', { name: /remove correction/i });
    await user.click(removeButton);
    
    expect(screen.queryByText('Correction 1')).not.toBeInTheDocument();
  });

  it('should submit feedback successfully', async () => {
    const user = userEvent.setup();
    const mockOnSubmit = jest.fn().mockResolvedValue(undefined);
    
    render(<FeedbackModal {...defaultProps} onSubmit={mockOnSubmit} />);
    
    // Select rating
    const starButtons = screen.getAllByRole('button').filter(button => 
      button.querySelector('svg')
    );
    await user.click(starButtons[4]); // 5 stars
    
    // Add feedback text
    const textArea = screen.getByPlaceholderText('Tell us what worked well or what could be improved...');
    await user.type(textArea, 'Excellent context!');
    
    // Submit
    const submitButton = screen.getByRole('button', { name: /submit feedback/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        satisfaction: 5,
        feedback: 'Excellent context!',
        corrections: undefined
      });
    });
  });

  it('should submit feedback with corrections', async () => {
    const user = userEvent.setup();
    const mockOnSubmit = jest.fn().mockResolvedValue(undefined);
    
    render(<FeedbackModal {...defaultProps} onSubmit={mockOnSubmit} />);
    
    // Select low rating to show corrections
    const starButtons = screen.getAllByRole('button').filter(button => 
      button.querySelector('svg')
    );
    await user.click(starButtons[1]); // 2 stars
    
    // Add correction
    await user.click(screen.getByText('+ Add Correction'));
    
    const fieldInput = screen.getByPlaceholderText('e.g., selectedRange, dataTypes');
    await user.type(fieldInput, 'intent');
    
    const expectedValueInput = screen.getByPlaceholderText('What should it have been?');
    await user.type(expectedValueInput, 'formula_assistance');
    
    const actualValueInput = screen.getByPlaceholderText('What was provided?');
    await user.type(actualValueInput, 'data_analysis');
    
    // Submit
    const submitButton = screen.getByRole('button', { name: /submit feedback/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        satisfaction: 2,
        feedback: undefined,
        corrections: [
          {
            field: 'intent',
            expectedValue: 'formula_assistance',
            actualValue: 'data_analysis',
            importance: 'medium'
          }
        ]
      });
    });
  });

  it('should prevent submission without rating', async () => {
    const user = userEvent.setup();
    const mockOnSubmit = jest.fn();
    
    // Mock window.alert
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    
    render(<FeedbackModal {...defaultProps} onSubmit={mockOnSubmit} />);
    
    const submitButton = screen.getByRole('button', { name: /submit feedback/i });
    await user.click(submitButton);
    
    expect(alertSpy).toHaveBeenCalledWith('Please provide a satisfaction rating');
    expect(mockOnSubmit).not.toHaveBeenCalled();
    
    alertSpy.mockRestore();
  });

  it('should handle submission errors', async () => {
    const user = userEvent.setup();
    const mockOnSubmit = jest.fn().mockRejectedValue(new Error('Submission failed'));
    
    render(<FeedbackModal {...defaultProps} onSubmit={mockOnSubmit} />);
    
    // Select rating
    const starButtons = screen.getAllByRole('button').filter(button => 
      button.querySelector('svg')
    );
    await user.click(starButtons[3]); // 4 stars
    
    // Submit
    const submitButton = screen.getByRole('button', { name: /submit feedback/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to submit feedback. Please try again.')).toBeInTheDocument();
    });
  });

  it('should show success message after submission', async () => {
    const user = userEvent.setup();
    const mockOnSubmit = jest.fn().mockResolvedValue(undefined);
    const mockOnClose = jest.fn();
    
    render(<FeedbackModal {...defaultProps} onSubmit={mockOnSubmit} onClose={mockOnClose} />);
    
    // Select rating
    const starButtons = screen.getAllByRole('button').filter(button => 
      button.querySelector('svg')
    );
    await user.click(starButtons[4]); // 5 stars
    
    // Submit
    const submitButton = screen.getByRole('button', { name: /submit feedback/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Feedback submitted successfully!')).toBeInTheDocument();
    });
    
    // Should close after delay
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('should close when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnClose = jest.fn();
    
    render(<FeedbackModal {...defaultProps} onClose={mockOnClose} />);
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should close when X button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnClose = jest.fn();
    
    render(<FeedbackModal {...defaultProps} onClose={mockOnClose} />);
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should disable form during submission', async () => {
    const user = userEvent.setup();
    const mockOnSubmit = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
    
    render(<FeedbackModal {...defaultProps} onSubmit={mockOnSubmit} />);
    
    // Select rating
    const starButtons = screen.getAllByRole('button').filter(button => 
      button.querySelector('svg')
    );
    await user.click(starButtons[3]); // 4 stars
    
    // Submit
    const submitButton = screen.getByRole('button', { name: /submit feedback/i });
    await user.click(submitButton);
    
    // Form should be disabled
    expect(screen.getByText('Submitting...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
    
    // Star buttons should be disabled
    starButtons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });
});