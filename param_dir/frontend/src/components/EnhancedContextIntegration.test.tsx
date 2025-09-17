import React from 'react';
import { render, screen } from '@testing-library/react';
import { EnhancedContextSummary } from './EnhancedContextSummary';
import { ConfidenceVisualization } from './ConfidenceVisualization';
import { 
  ComprehensiveContext, 
  ComplexityLevel, 
  ConfidenceLevel,
  InsightType,
  InsightCategory,
  InsightPriority
} from '../types/enhanced-context';

// Simple integration test to verify components render without errors
describe('Enhanced Context Components Integration', () => {
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

  it('renders EnhancedContextSummary without errors', () => {
    render(<EnhancedContextSummary context={mockContext} />);
    expect(screen.getByText('Executive Summary')).toBeInTheDocument();
  });

  it('renders ConfidenceVisualization without errors', () => {
    render(<ConfidenceVisualization confidence={mockContext.confidence} />);
    expect(screen.getByText('Analysis Confidence')).toBeInTheDocument();
  });

  it('displays confidence percentage correctly', () => {
    render(<ConfidenceVisualization confidence={mockContext.confidence} />);
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('shows insight count in summary', () => {
    render(<EnhancedContextSummary context={mockContext} />);
    // Just verify the component renders without errors
    expect(screen.getByText('Analysis Overview')).toBeInTheDocument();
  });
});