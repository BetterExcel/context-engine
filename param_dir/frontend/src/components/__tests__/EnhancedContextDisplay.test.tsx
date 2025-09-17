import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { EnhancedContextDisplay } from '../EnhancedContextDisplay';
import { 
  ComprehensiveContext, 
  ComplexityLevel, 
  ConfidenceLevel,
  InsightType,
  InsightCategory,
  InsightPriority
} from '../../types/enhanced-context';

// Mock modules using Vitest
vi.mock('../EnhancedContextSummary', () => ({
  EnhancedContextSummary: ({ context }: { context: any }) => (
    <div data-testid="enhanced-context-summary">
      Enhanced Context Summary for {context.id}
    </div>
  )
}));

vi.mock('../ConfidenceVisualization', () => ({
  ConfidenceVisualization: ({ confidence }: { confidence: any }) => (
    <div data-testid="confidence-visualization">
      Confidence: {Math.round(confidence.score * 100)}%
    </div>
  )
}));

vi.mock('../ActionableInsightsPanel', () => ({
  ActionableInsightsPanel: ({ insights }: { insights: any[] }) => (
    <div data-testid="actionable-insights-panel">
      {insights.length} insights
    </div>
  )
}));

vi.mock('../StreamingContextDisplay', () => ({
  StreamingContextDisplay: ({ streamingContext }: { streamingContext: any }) => (
    <div data-testid="streaming-context-display">
      Streaming: {streamingContext.isStreaming ? 'Yes' : 'No'}
    </div>
  )
}));

const mockContext: ComprehensiveContext = {
  id: 'test-context-1',
  timestamp: new Date(),
  query: 'Test query',
  dataContext: {
    size: { rows: 100, columns: 5, cells: 500 },
    dataQuality: {
      overallScore: 0.85,
      completeness: 0.9,
      accuracy: 0.8,
      consistency: 0.85,
      issues: []
    },
    characteristics: {
      hasHeaders: true,
      hasTimeData: false,
      dataTypes: ['text', 'number'],
      patterns: ['header_row', 'data_block']
    }
  },
  businessContext: {
    domain: {
      primaryDomain: 'financial',
      subDomains: ['stocks'],
      confidence: 0.9
    },
    useCase: {
      primary: 'analysis',
      secondary: [],
      objectives: ['analyze data']
    },
    stakeholders: []
  },
  analyticalContext: {
    intent: {
      primary: 'data_analysis',
      secondary: [],
      confidence: 0.85
    },
    analysisType: ['statistical'],
    scope: 'full_dataset',
    complexity: ComplexityLevel.MODERATE
  },
  insights: [
    {
      id: 'insight-1',
      type: InsightType.TREND,
      category: InsightCategory.PERFORMANCE,
      title: 'Test Insight',
      description: 'This is a test insight',
      confidence: 0.8,
      priority: InsightPriority.HIGH,
      impact: {
        magnitude: 7,
        scope: ['performance'],
        timeframe: 'short_term'
      },
      actionable: true,
      evidence: [],
      tags: ['test']
    }
  ],
  risks: [],
  opportunities: [],
  patterns: [],
  confidence: {
    score: 0.85,
    level: ConfidenceLevel.HIGH,
    components: [
      {
        name: 'Data Quality',
        score: 0.9,
        weight: 0.5,
        description: 'High quality data'
      }
    ],
    factors: []
  },
  reliability: {
    dataReliability: 0.9,
    methodReliability: 0.8,
    contextReliability: 0.85,
    overallReliability: 0.85
  },
  nextSteps: [],
  alternatives: [],
  processingTime: 1500,
  dataQuality: 0.85,
  complexity: ComplexityLevel.MODERATE
};

describe('EnhancedContextDisplay', () => {
  it('renders loading state correctly', () => {
    render(
      <EnhancedContextDisplay
        context={null}
        isLoading={true}
        error={null}
      />
    );

    expect(screen.getByText('Initializing enhanced analysis...')).toBeInTheDocument();
  });

  it('renders error state correctly', () => {
    const errorMessage = 'Test error message';
    render(
      <EnhancedContextDisplay
        context={null}
        isLoading={false}
        error={errorMessage}
      />
    );

    expect(screen.getByText('Enhanced Analysis Error')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('renders empty state when no context is provided', () => {
    render(
      <EnhancedContextDisplay
        context={null}
        isLoading={false}
        error={null}
      />
    );

    expect(screen.getByText('No Enhanced Context Available')).toBeInTheDocument();
  });

  it('renders context summary by default', () => {
    render(
      <EnhancedContextDisplay
        context={mockContext}
        isLoading={false}
        error={null}
      />
    );

    expect(screen.getByTestId('enhanced-context-summary')).toBeInTheDocument();
    expect(screen.getByText(`Enhanced Context Summary for ${mockContext.id}`)).toBeInTheDocument();
  });

  it('displays mode selector tabs', () => {
    render(
      <EnhancedContextDisplay
        context={mockContext}
        isLoading={false}
        error={null}
      />
    );

    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText('Insights')).toBeInTheDocument();
    expect(screen.getByText('Confidence')).toBeInTheDocument();
  });

  it('displays performance metrics in footer', () => {
    render(
      <EnhancedContextDisplay
        context={mockContext}
        isLoading={false}
        error={null}
      />
    );

    expect(screen.getByText(/Analysis completed in 1500ms/)).toBeInTheDocument();
    expect(screen.getByText(/Complexity: moderate/)).toBeInTheDocument();
    expect(screen.getByText(/Data Quality: 85%/)).toBeInTheDocument();
  });
});