import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecommendationsPanel } from '../RecommendationsPanel';

// Mock fetch
global.fetch = jest.fn();

describe('RecommendationsPanel', () => {
  const defaultProps = {
    request: 'Create a SUM formula',
    intent: 'formula_assistance',
    contextType: 'current_selection',
    isVisible: true,
    onToggle: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  it('should render collapsed state', () => {
    render(<RecommendationsPanel {...defaultProps} isVisible={false} />);
    
    expect(screen.getByText('Recommendations')).toBeInTheDocument();
    expect(screen.queryByText('Loading recommendations...')).not.toBeInTheDocument();
  });

  it('should toggle visibility when header is clicked', async () => {
    const user = userEvent.setup();
    const mockOnToggle = jest.fn();
    
    render(<RecommendationsPanel {...defaultProps} onToggle={mockOnToggle} />);
    
    const toggleButton = screen.getByRole('button');
    await user.click(toggleButton);
    
    expect(mockOnToggle).toHaveBeenCalled();
  });

  it('should fetch recommendations when visible and request is provided', async () => {
    const mockRecommendations = [
      {
        id: 'rec-1',
        type: 'context_suggestion',
        title: 'Include Cell References',
        description: 'Include all referenced cells for better context',
        confidence: 0.9,
        relevanceScore: 0.8,
        source: 'rule_based',
        metadata: { successRate: 0.85 },
        actionable: true,
        suggestions: ['Include cell references', 'Show data types']
      }
    ];

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { recommendations: mockRecommendations }
      })
    });

    render(<RecommendationsPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Include Cell References')).toBeInTheDocument();
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/feedback/recommendations?request=Create%20a%20SUM%20formula&intent=formula_assistance&contextType=current_selection'
    );
  });

  it('should show loading state while fetching', () => {
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<RecommendationsPanel {...defaultProps} />);
    
    expect(screen.getByText('Loading recommendations...')).toBeInTheDocument();
  });

  it('should show error state when fetch fails', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({
        success: false,
        error: { message: 'Failed to fetch recommendations' }
      })
    });

    render(<RecommendationsPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch recommendations')).toBeInTheDocument();
    });
  });

  it('should show no recommendations message when empty', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { recommendations: [] }
      })
    });

    render(<RecommendationsPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('No recommendations available for this request.')).toBeInTheDocument();
    });
  });

  it('should display recommendation details', async () => {
    const mockRecommendations = [
      {
        id: 'rec-1',
        type: 'context_suggestion',
        title: 'Include Cell References',
        description: 'Include all referenced cells for better context',
        confidence: 0.9,
        relevanceScore: 0.8,
        source: 'rule_based',
        metadata: { 
          successRate: 0.85,
          similarRequests: 15,
          sampleSize: 20
        },
        actionable: true,
        suggestions: ['Include cell references', 'Show data types', 'Provide formula dependencies']
      }
    ];

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { recommendations: mockRecommendations }
      })
    });

    render(<RecommendationsPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Include Cell References')).toBeInTheDocument();
      expect(screen.getByText('Include all referenced cells for better context')).toBeInTheDocument();
      expect(screen.getByText('Rule')).toBeInTheDocument(); // Source badge
      expect(screen.getByText('90%')).toBeInTheDocument(); // Confidence
      expect(screen.getByText('Success Rate: 85%')).toBeInTheDocument();
      expect(screen.getByText('Similar Requests: 15')).toBeInTheDocument();
      expect(screen.getByText('Sample Size: 20')).toBeInTheDocument();
    });
  });

  it('should expand and collapse suggestions', async () => {
    const user = userEvent.setup();
    const mockRecommendations = [
      {
        id: 'rec-1',
        type: 'context_suggestion',
        title: 'Include Cell References',
        description: 'Include all referenced cells for better context',
        confidence: 0.9,
        relevanceScore: 0.8,
        source: 'rule_based',
        metadata: {},
        actionable: true,
        suggestions: ['Include cell references', 'Show data types', 'Provide formula dependencies']
      }
    ];

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { recommendations: mockRecommendations }
      })
    });

    render(<RecommendationsPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Show Suggestions')).toBeInTheDocument();
    });

    // Expand suggestions
    const showSuggestionsButton = screen.getByText('Show Suggestions');
    await user.click(showSuggestionsButton);

    expect(screen.getByText('Hide Suggestions')).toBeInTheDocument();
    expect(screen.getByText('Include cell references')).toBeInTheDocument();
    expect(screen.getByText('Show data types')).toBeInTheDocument();
    expect(screen.getByText('Provide formula dependencies')).toBeInTheDocument();

    // Collapse suggestions
    const hideSuggestionsButton = screen.getByText('Hide Suggestions');
    await user.click(hideSuggestionsButton);

    expect(screen.getByText('Show Suggestions')).toBeInTheDocument();
    expect(screen.queryByText('Include cell references')).not.toBeInTheDocument();
  });

  it('should display different recommendation types with appropriate icons', async () => {
    const mockRecommendations = [
      {
        id: 'rec-1',
        type: 'context_suggestion',
        title: 'Context Suggestion',
        description: 'A context suggestion',
        confidence: 0.9,
        relevanceScore: 0.8,
        source: 'rule_based',
        metadata: {},
        actionable: true,
        suggestions: []
      },
      {
        id: 'rec-2',
        type: 'approach_suggestion',
        title: 'Approach Suggestion',
        description: 'An approach suggestion',
        confidence: 0.8,
        relevanceScore: 0.7,
        source: 'ai_generated',
        metadata: {},
        actionable: true,
        suggestions: []
      },
      {
        id: 'rec-3',
        type: 'similar_request',
        title: 'Similar Request',
        description: 'A similar request',
        confidence: 0.7,
        relevanceScore: 0.6,
        source: 'similar_feedback',
        metadata: {},
        actionable: true,
        suggestions: []
      },
      {
        id: 'rec-4',
        type: 'best_practice',
        title: 'Best Practice',
        description: 'A best practice',
        confidence: 0.6,
        relevanceScore: 0.5,
        source: 'learned_pattern',
        metadata: {},
        actionable: true,
        suggestions: []
      }
    ];

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { recommendations: mockRecommendations }
      })
    });

    render(<RecommendationsPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Context Suggestion')).toBeInTheDocument();
      expect(screen.getByText('Approach Suggestion')).toBeInTheDocument();
      expect(screen.getByText('Similar Request')).toBeInTheDocument();
      expect(screen.getByText('Best Practice')).toBeInTheDocument();
    });

    // Check source badges
    expect(screen.getByText('Rule')).toBeInTheDocument();
    expect(screen.getByText('AI')).toBeInTheDocument();
    expect(screen.getByText('Similar')).toBeInTheDocument();
    expect(screen.getByText('Learned')).toBeInTheDocument();
  });

  it('should show recommendation count in header', async () => {
    const mockRecommendations = [
      {
        id: 'rec-1',
        type: 'context_suggestion',
        title: 'Recommendation 1',
        description: 'Description 1',
        confidence: 0.9,
        relevanceScore: 0.8,
        source: 'rule_based',
        metadata: {},
        actionable: true,
        suggestions: []
      },
      {
        id: 'rec-2',
        type: 'approach_suggestion',
        title: 'Recommendation 2',
        description: 'Description 2',
        confidence: 0.8,
        relevanceScore: 0.7,
        source: 'ai_generated',
        metadata: {},
        actionable: true,
        suggestions: []
      }
    ];

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { recommendations: mockRecommendations }
      })
    });

    render(<RecommendationsPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument(); // Count badge
    });
  });

  it('should not fetch recommendations when request is empty', () => {
    render(<RecommendationsPanel {...defaultProps} request="" />);
    
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should refetch recommendations when request changes', async () => {
    const { rerender } = render(<RecommendationsPanel {...defaultProps} />);

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { recommendations: [] }
      })
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    // Change request
    rerender(<RecommendationsPanel {...defaultProps} request="Different request" />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  it('should handle network errors gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<RecommendationsPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });
});