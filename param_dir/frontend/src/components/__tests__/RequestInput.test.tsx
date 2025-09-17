import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RequestInput from '../RequestInput';

describe('RequestInput', () => {
  const mockOnSubmit = vi.fn();
  const defaultProps = {
    onSubmit: mockOnSubmit,
    isProcessing: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with default props', () => {
    render(<RequestInput {...defaultProps} />);
    
    expect(screen.getByText('Ask About Your Spreadsheet')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ask me anything about your spreadsheet...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /analyze context/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
  });

  it('renders with custom placeholder and maxLength', () => {
    render(
      <RequestInput
        {...defaultProps}
        placeholder="Custom placeholder"
        maxLength={500}
      />
    );
    
    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
    expect(screen.getByText('500 characters remaining')).toBeInTheDocument();
  });

  it('updates character count as user types', async () => {
    const user = userEvent.setup();
    render(<RequestInput {...defaultProps} maxLength={100} />);
    
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Hello world');
    
    expect(screen.getByText('89 characters remaining')).toBeInTheDocument();
  });

  it('shows warning color when near character limit', async () => {
    const user = userEvent.setup();
    render(<RequestInput {...defaultProps} maxLength={60} />);
    
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'This is a long message that will exceed the limit soon');
    
    const remainingText = screen.getByText(/characters remaining/);
    expect(remainingText).toHaveClass('text-orange-600');
  });

  it('prevents typing beyond character limit', async () => {
    const user = userEvent.setup();
    render(<RequestInput {...defaultProps} maxLength={10} />);
    
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    await user.type(textarea, '1234567890extra');
    
    expect(textarea.value).toBe('1234567890');
    expect(screen.getByText('0 characters remaining')).toBeInTheDocument();
  });

  it('validates empty request on submit', async () => {
    const user = userEvent.setup();
    render(<RequestInput {...defaultProps} />);
    
    await user.click(screen.getByRole('button', { name: /analyze context/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a request')).toBeInTheDocument();
    });
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('validates minimum length on submit', async () => {
    const user = userEvent.setup();
    render(<RequestInput {...defaultProps} />);
    
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Hi');
    
    const submitButton = screen.getByRole('button', { name: /analyze context/i });
    await user.click(submitButton);
    
    expect(screen.getByText('Request must be at least 3 characters long')).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('validates maximum length on submit', async () => {
    const user = userEvent.setup();
    
    // Create a component with a very small maxLength to easily trigger the validation
    const { rerender } = render(<RequestInput {...defaultProps} maxLength={5} />);
    
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Hello');
    
    // Now change the component to have an even smaller limit to trigger validation
    rerender(<RequestInput {...defaultProps} maxLength={3} />);
    
    const submitButton = screen.getByRole('button', { name: /analyze context/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Request must be less than 3 characters')).toBeInTheDocument();
    });
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('submits valid request', async () => {
    const user = userEvent.setup();
    render(<RequestInput {...defaultProps} />);
    
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Help me with formulas');
    
    const submitButton = screen.getByRole('button', { name: /analyze context/i });
    await user.click(submitButton);
    
    expect(mockOnSubmit).toHaveBeenCalledWith('Help me with formulas');
    expect(screen.queryByText(/Please enter a request|Request must be/)).not.toBeInTheDocument();
  });

  it('submits on Ctrl+Enter', async () => {
    const user = userEvent.setup();
    render(<RequestInput {...defaultProps} />);
    
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Help me with formulas');
    await user.keyboard('{Control>}{Enter}{/Control}');
    
    expect(mockOnSubmit).toHaveBeenCalledWith('Help me with formulas');
  });

  it('submits on Cmd+Enter (Mac)', async () => {
    const user = userEvent.setup();
    render(<RequestInput {...defaultProps} />);
    
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Help me with formulas');
    await user.keyboard('{Meta>}{Enter}{/Meta}');
    
    expect(mockOnSubmit).toHaveBeenCalledWith('Help me with formulas');
  });

  it('clears error when user starts typing', async () => {
    const user = userEvent.setup();
    render(<RequestInput {...defaultProps} />);
    
    // Trigger validation error
    const submitButton = screen.getByRole('button', { name: /analyze context/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a request')).toBeInTheDocument();
    });
    
    // Start typing
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'H');
    
    await waitFor(() => {
      expect(screen.queryByText('Please enter a request')).not.toBeInTheDocument();
    });
  });

  it('clears input when clear button is clicked', async () => {
    const user = userEvent.setup();
    render(<RequestInput {...defaultProps} />);
    
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    await user.type(textarea, 'Some text');
    
    expect(textarea.value).toBe('Some text');
    
    const clearButton = screen.getByRole('button', { name: /clear/i });
    await user.click(clearButton);
    
    expect(textarea.value).toBe('');
  });

  it('disables form when processing', () => {
    render(<RequestInput {...defaultProps} isProcessing={true} />);
    
    const textarea = screen.getByRole('textbox');
    const submitButton = screen.getByRole('button', { name: /analyzing/i });
    const clearButton = screen.getByRole('button', { name: /clear/i });
    
    expect(textarea).toBeDisabled();
    expect(submitButton).toBeDisabled();
    expect(clearButton).toBeDisabled();
  });

  it('shows processing state correctly', () => {
    render(<RequestInput {...defaultProps} isProcessing={true} />);
    
    expect(screen.getAllByText('Analyzing...')).toHaveLength(2); // One in overlay, one in button
    expect(screen.getByRole('button', { name: /analyzing/i })).toBeInTheDocument();
    
    // Check that textarea is disabled
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('disables form when disabled prop is true', () => {
    render(<RequestInput {...defaultProps} disabled={true} />);
    
    const textarea = screen.getByRole('textbox');
    const submitButton = screen.getByRole('button', { name: /analyze context/i });
    const clearButton = screen.getByRole('button', { name: /clear/i });
    
    expect(textarea).toBeDisabled();
    expect(submitButton).toBeDisabled();
    expect(clearButton).toBeDisabled();
  });

  it('disables clear button when input is empty but allows submit for validation', () => {
    render(<RequestInput {...defaultProps} />);
    
    const submitButton = screen.getByRole('button', { name: /analyze context/i });
    const clearButton = screen.getByRole('button', { name: /clear/i });
    
    // Submit button should be enabled to allow validation
    expect(submitButton).not.toBeDisabled();
    // Clear button should be disabled when input is empty
    expect(clearButton).toBeDisabled();
  });

  it('enables clear button when input has content', async () => {
    const user = userEvent.setup();
    render(<RequestInput {...defaultProps} />);
    
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Some content');
    
    const submitButton = screen.getByRole('button', { name: /analyze context/i });
    const clearButton = screen.getByRole('button', { name: /clear/i });
    
    // Both buttons should be enabled when there's content
    expect(submitButton).not.toBeDisabled();
    expect(clearButton).not.toBeDisabled();
  });

  it('auto-resizes textarea as content grows', async () => {
    const user = userEvent.setup();
    render(<RequestInput {...defaultProps} />);
    
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    
    // Mock scrollHeight to simulate content growth
    Object.defineProperty(textarea, 'scrollHeight', {
      configurable: true,
      value: 120,
    });
    
    // Add multiple lines of content
    await user.type(textarea, 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5');
    
    // The useEffect should have been triggered and height should be set
    expect(textarea.style.height).toBe('120px');
  });

  it('shows example requests in help text', () => {
    render(<RequestInput {...defaultProps} />);
    
    expect(screen.getByText('Example requests:')).toBeInTheDocument();
    expect(screen.getByText('"Help me create a formula to calculate the total sales"')).toBeInTheDocument();
    expect(screen.getByText('"What patterns do you see in this data?"')).toBeInTheDocument();
    expect(screen.getByText('"How can I format these cells to show currency?"')).toBeInTheDocument();
    expect(screen.getByText('"Find errors in my formulas"')).toBeInTheDocument();
  });

  it('trims whitespace from request before submission', async () => {
    const user = userEvent.setup();
    render(<RequestInput {...defaultProps} />);
    
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, '   Help me with formulas   ');
    
    const submitButton = screen.getByRole('button', { name: /analyze context/i });
    await user.click(submitButton);
    
    expect(mockOnSubmit).toHaveBeenCalledWith('Help me with formulas');
  });
});