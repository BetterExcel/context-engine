import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import HistorySidebar from '../HistorySidebar';
import { SessionService, ContextHistoryEntry } from '../../services/sessionService';

// Mock the SessionService
vi.mock('../../services/sessionService', () => ({
  SessionService: {
    getContextHistory: vi.fn(),
    submitFeedback: vi.fn(),
  },
}));

const mockSessionService = SessionService as any;

describe('HistorySidebar', () => {
  const mockOnClose = vi.fn();
  const mockOnSelectHistoryEntry = vi.fn();
  const mockSessionId = 'session-123';

  const mockHistoryEntry: ContextHistoryEntry = {
    id: 'ctx-1',
    request: 'Calculate the sum of column A',
    context: {},
    timestamp: new Date().toISOString(),
    confidence: 0.85,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when closed', () => {
    render(
      <HistorySidebar
        isOpen={false}
        onClose={mockOnClose}
        onSelectHistoryEntry={mockOnSelectHistoryEntry}
        currentSessionId={mockSessionId}
      />
    );

    expect(screen.queryByText('Request History')).not.toBeInTheDocument();
  });

  it('should render and load history when opened', async () => {
    mockSessionService.getContextHistory.mockResolvedValue([mockHistoryEntry]);

    render(
      <HistorySidebar
        isOpen={true}
        onClose={mockOnClose}
        onSelectHistoryEntry={mockOnSelectHistoryEntry}
        currentSessionId={mockSessionId}
      />
    );

    expect(screen.getByText('Request History')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(mockSessionService.getContextHistory).toHaveBeenCalledWith(mockSessionId, 20);
    });

    await waitFor(() => {
      expect(screen.getByText('Calculate the sum of column A')).toBeInTheDocument();
    });
  });

  it('should display loading state', () => {
    mockSessionService.getContextHistory.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <HistorySidebar
        isOpen={true}
        onClose={mockOnClose}
        onSelectHistoryEntry={mockOnSelectHistoryEntry}
        currentSessionId={mockSessionId}
      />
    );

    expect(screen.getByText('Request History')).toBeInTheDocument();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument(); // Loading spinner
  });

  it('should display error state', async () => {
    const errorMessage = 'Failed to load history';
    mockSessionService.getContextHistory.mockRejectedValue(new Error(errorMessage));

    render(
      <HistorySidebar
        isOpen={true}
        onClose={mockOnClose}
        onSelectHistoryEntry={mockOnSelectHistoryEntry}
        currentSessionId={mockSessionId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('should display empty state when no history', async () => {
    mockSessionService.getContextHistory.mockResolvedValue([]);

    render(
      <HistorySidebar
        isOpen={true}
        onClose={mockOnClose}
        onSelectHistoryEntry={mockOnSelectHistoryEntry}
        currentSessionId={mockSessionId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No request history yet')).toBeInTheDocument();
    });

    expect(screen.getByText('Your context analysis requests will appear here')).toBeInTheDocument();
  });

  it('should handle history entry selection', async () => {
    mockSessionService.getContextHistory.mockResolvedValue([mockHistoryEntry]);

    render(
      <HistorySidebar
        isOpen={true}
        onClose={mockOnClose}
        onSelectHistoryEntry={mockOnSelectHistoryEntry}
        currentSessionId={mockSessionId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Calculate the sum of column A')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Calculate the sum of column A'));

    expect(mockOnSelectHistoryEntry).toHaveBeenCalledWith(mockHistoryEntry);
  });

  it('should close sidebar when close button is clicked', () => {
    mockSessionService.getContextHistory.mockResolvedValue([]);

    render(
      <HistorySidebar
        isOpen={true}
        onClose={mockOnClose}
        onSelectHistoryEntry={mockOnSelectHistoryEntry}
        currentSessionId={mockSessionId}
      />
    );

    const closeButton = document.querySelector('button');
    if (closeButton) {
      fireEvent.click(closeButton);
    }

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should close sidebar when backdrop is clicked', () => {
    mockSessionService.getContextHistory.mockResolvedValue([]);

    render(
      <HistorySidebar
        isOpen={true}
        onClose={mockOnClose}
        onSelectHistoryEntry={mockOnSelectHistoryEntry}
        currentSessionId={mockSessionId}
      />
    );

    // Click the backdrop
    const backdrop = document.querySelector('.fixed.inset-0.bg-black');
    if (backdrop) {
      fireEvent.click(backdrop);
    }

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should display confidence levels with appropriate colors', async () => {
    const highConfidenceEntry = { ...mockHistoryEntry, confidence: 0.9 };
    const mediumConfidenceEntry = { ...mockHistoryEntry, id: 'ctx-2', confidence: 0.7 };
    const lowConfidenceEntry = { ...mockHistoryEntry, id: 'ctx-3', confidence: 0.4 };

    mockSessionService.getContextHistory.mockResolvedValue([
      highConfidenceEntry,
      mediumConfidenceEntry,
      lowConfidenceEntry
    ]);

    render(
      <HistorySidebar
        isOpen={true}
        onClose={mockOnClose}
        onSelectHistoryEntry={mockOnSelectHistoryEntry}
        currentSessionId={mockSessionId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('90% confidence')).toBeInTheDocument();
      expect(screen.getByText('70% confidence')).toBeInTheDocument();
      expect(screen.getByText('40% confidence')).toBeInTheDocument();
    });
  });

  it('should open feedback modal when rate button is clicked', async () => {
    mockSessionService.getContextHistory.mockResolvedValue([mockHistoryEntry]);

    render(
      <HistorySidebar
        isOpen={true}
        onClose={mockOnClose}
        onSelectHistoryEntry={mockOnSelectHistoryEntry}
        currentSessionId={mockSessionId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Rate this analysis')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Rate this analysis'));

    expect(screen.getByText('Provide Feedback')).toBeInTheDocument();
  });

  it('should submit feedback successfully', async () => {
    mockSessionService.getContextHistory.mockResolvedValue([mockHistoryEntry]);
    mockSessionService.submitFeedback.mockResolvedValue(undefined);

    render(
      <HistorySidebar
        isOpen={true}
        onClose={mockOnClose}
        onSelectHistoryEntry={mockOnSelectHistoryEntry}
        currentSessionId={mockSessionId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Rate this analysis')).toBeInTheDocument();
    });

    // Open feedback modal
    fireEvent.click(screen.getByText('Rate this analysis'));

    // Set rating
    const fourthStar = screen.getAllByRole('button')[5]; // 4th star (0-indexed + close button)
    fireEvent.click(fourthStar);

    // Add corrections
    const correctionsTextarea = screen.getByPlaceholderText('What could be improved?');
    fireEvent.change(correctionsTextarea, { target: { value: 'Good analysis overall' } });

    // Submit feedback
    fireEvent.click(screen.getByText('Submit Feedback'));

    await waitFor(() => {
      expect(mockSessionService.submitFeedback).toHaveBeenCalledWith(
        mockHistoryEntry.id,
        4,
        true,
        'Good analysis overall',
        mockSessionId
      );
    });
  });

  it('should truncate long requests', async () => {
    const longRequestEntry = {
      ...mockHistoryEntry,
      request: 'This is a very long request that should be truncated because it exceeds the maximum length allowed for display in the history sidebar'
    };

    mockSessionService.getContextHistory.mockResolvedValue([longRequestEntry]);

    render(
      <HistorySidebar
        isOpen={true}
        onClose={mockOnClose}
        onSelectHistoryEntry={mockOnSelectHistoryEntry}
        currentSessionId={mockSessionId}
      />
    );

    await waitFor(() => {
      const truncatedText = screen.getByText(/This is a very long request that should be truncated because it exceeds/);
      expect(truncatedText.textContent).toMatch(/\.\.\.$/);
    });
  });

  it('should format timestamps correctly', async () => {
    const recentEntry = {
      ...mockHistoryEntry,
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString() // 5 minutes ago
    };

    mockSessionService.getContextHistory.mockResolvedValue([recentEntry]);

    render(
      <HistorySidebar
        isOpen={true}
        onClose={mockOnClose}
        onSelectHistoryEntry={mockOnSelectHistoryEntry}
        currentSessionId={mockSessionId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('5m ago')).toBeInTheDocument();
    });
  });
});