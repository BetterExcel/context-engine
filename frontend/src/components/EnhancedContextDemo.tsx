import React, { useState, useEffect } from 'react';
import { EnhancedContextDisplay } from './EnhancedContextDisplay';
import { useEnhancedContext } from '../hooks/useEnhancedContext';
import { 
  ComprehensiveContext, 
  StreamingPhase,
  InsightType,
  InsightCategory,
  InsightPriority,
  RiskType,
  RiskSeverity,
  OpportunityType,
  OpportunityPriority,
  ActionType,
  ActionPriority,
  EffortLevel,
  ImpactLevel,
  ConfidenceLevel,
  ComplexityLevel,
  PatternType
} from '../types/enhanced-context';

export const EnhancedContextDemo: React.FC = () => {
  const {
    context,
    streamingContext,
    progressiveDisclosure,
    interactiveExploration,
    isLoading,
    error,
    setContext,
    startStreaming,
    updateStreamingProgress,
    completeStreaming,
    updateExploration,
    resetExploration
  } = useEnhancedContext({
    enableStreaming: true,

    autoAdvanceDisclosure: true
  });

  const [demoMode, setDemoMode] = useState<'simple' | 'complex' | 'streaming'>('simple');

  // Mock data generators
  const generateMockContext = (complexity: 'simple' | 'complex'): ComprehensiveContext => {
    const baseContext: ComprehensiveContext = {
      id: `demo-${Date.now()}`,
      timestamp: new Date(),
      query: complexity === 'simple' 
        ? "What is the average price for Apple Inc?" 
        : "Analyze portfolio performance and identify optimization opportunities",
      
      dataContext: {
        size: {
          rows: complexity === 'simple' ? 50 : 1000,
          columns: complexity === 'simple' ? 5 : 15,
          cells: complexity === 'simple' ? 250 : 15000
        },
        dataQuality: {
          overallScore: complexity === 'simple' ? 0.95 : 0.78,
          completeness: complexity === 'simple' ? 0.98 : 0.85,
          accuracy: complexity === 'simple' ? 0.96 : 0.82,
          consistency: complexity === 'simple' ? 0.94 : 0.75,
          issues: complexity === 'simple' ? [] : [
            {
              type: 'missing_data',
              severity: 'medium',
              description: 'Some price data is missing for recent dates',
              affectedCells: ['C15:C20'],
              impact: 0.15
            }
          ]
        },
        characteristics: {
          hasHeaders: true,
          hasTimeData: true,
          dataTypes: ['text', 'number', 'date', 'currency'],
          patterns: complexity === 'simple' 
            ? ['header_row', 'data_block'] 
            : ['header_row', 'data_block', 'time_series', 'financial_statement']
        }
      },

      businessContext: {
        domain: {
          primaryDomain: 'financial',
          subDomains: complexity === 'simple' ? ['stocks'] : ['portfolio_management', 'risk_analysis'],
          confidence: 0.92
        },
        useCase: {
          primary: complexity === 'simple' ? 'data_lookup' : 'portfolio_analysis',
          secondary: complexity === 'simple' ? [] : ['risk_assessment', 'performance_optimization'],
          objectives: complexity === 'simple' 
            ? ['Find specific stock price'] 
            : ['Optimize portfolio returns', 'Minimize risk exposure', 'Identify underperforming assets']
        },
        stakeholders: [
          {
            type: 'analyst',
            role: 'financial_analyst',
            interests: ['accurate_data', 'actionable_insights']
          }
        ]
      },

      analyticalContext: {
        intent: {
          primary: complexity === 'simple' ? 'data_retrieval' : 'comprehensive_analysis',
          secondary: complexity === 'simple' ? [] : ['trend_analysis', 'risk_assessment'],
          confidence: 0.88
        },
        analysisType: complexity === 'simple' ? ['lookup'] : ['statistical', 'financial', 'predictive'],
        scope: complexity === 'simple' ? 'single_value' : 'portfolio_wide',
        complexity: complexity === 'simple' ? ComplexityLevel.SIMPLE : ComplexityLevel.COMPLEX
      },

      insights: complexity === 'simple' ? [
        {
          id: 'insight-1',
          type: InsightType.RECOMMENDATION,
          category: InsightCategory.FINANCIAL,
          title: 'Apple Inc. Current Price Found',
          description: 'Located Apple Inc. stock price at $150.25 in row 15, column C',
          confidence: 0.95,
          priority: InsightPriority.HIGH,
          impact: {
            magnitude: 8,
            scope: ['data_accuracy'],
            timeframe: 'immediate'
          },
          actionable: true,
          evidence: [
            {
              type: 'data_match',
              description: 'Exact company name match found',
              strength: 0.95
            }
          ],
          tags: ['stock_price', 'apple', 'current_value']
        }
      ] : [
        {
          id: 'insight-1',
          type: InsightType.TREND,
          category: InsightCategory.PERFORMANCE,
          title: 'Portfolio Showing Upward Trend',
          description: 'Overall portfolio value has increased 12% over the last quarter',
          confidence: 0.87,
          priority: InsightPriority.HIGH,
          impact: {
            magnitude: 9,
            scope: ['portfolio_value', 'returns'],
            timeframe: 'quarterly'
          },
          actionable: true,
          evidence: [
            {
              type: 'statistical_analysis',
              description: 'Consistent positive returns across 8 of 10 holdings',
              strength: 0.89
            }
          ],
          tags: ['performance', 'growth', 'quarterly']
        },
        {
          id: 'insight-2',
          type: InsightType.RISK,
          category: InsightCategory.FINANCIAL,
          title: 'High Concentration Risk Detected',
          description: 'Tech sector represents 65% of portfolio, creating concentration risk',
          confidence: 0.92,
          priority: InsightPriority.CRITICAL,
          impact: {
            magnitude: 8,
            scope: ['risk_exposure', 'diversification'],
            timeframe: 'ongoing'
          },
          actionable: true,
          evidence: [
            {
              type: 'sector_analysis',
              description: 'Technology holdings exceed recommended 40% allocation',
              strength: 0.94
            }
          ],
          tags: ['risk', 'concentration', 'diversification']
        }
      ],

      risks: complexity === 'simple' ? [] : [
        {
          id: 'risk-1',
          type: RiskType.FINANCIAL,
          title: 'Sector Concentration Risk',
          description: 'Over-exposure to technology sector increases volatility risk',
          probability: 0.75,
          impact: ImpactLevel.MAJOR,
          severity: RiskSeverity.HIGH,
          timeframe: 'medium_term',
          confidence: 0.88,
          mitigation: [
            {
              description: 'Diversify into other sectors (healthcare, utilities)',
              effectiveness: 0.85,
              effort: 'medium'
            }
          ]
        }
      ],

      opportunities: complexity === 'simple' ? [] : [
        {
          id: 'opportunity-1',
          type: OpportunityType.EFFICIENCY_IMPROVEMENT,
          title: 'Rebalancing Opportunity',
          description: 'Rebalancing portfolio could improve risk-adjusted returns by 8-12%',
          priority: OpportunityPriority.HIGH,
          potential: {
            value: '8-12% improvement in Sharpe ratio',
            timeframe: '3-6 months'
          },
          feasibility: {
            technical: 0.95,
            financial: 0.88,
            operational: 0.92,
            overall: 0.92
          },
          requirements: [
            {
              type: 'analysis',
              description: 'Detailed sector allocation analysis',
              effort: 'low'
            }
          ],
          confidence: 0.84
        }
      ],

      patterns: complexity === 'simple' ? [] : [
        {
          id: 'pattern-1',
          type: PatternType.TEMPORAL,
          name: 'Quarterly Growth Pattern',
          description: 'Portfolio shows consistent growth in Q1 and Q3, with slower growth in Q2 and Q4',
          strength: 0.78,
          significance: 'medium',
          confidence: 0.82,
          implications: [
            {
              type: 'seasonal',
              description: 'Consider seasonal rebalancing strategy',
              actionable: true
            }
          ]
        }
      ],

      confidence: {
        score: complexity === 'simple' ? 0.92 : 0.78,
        level: complexity === 'simple' ? ConfidenceLevel.VERY_HIGH : ConfidenceLevel.HIGH,
        components: [
          {
            name: 'Data Quality',
            score: complexity === 'simple' ? 0.95 : 0.82,
            weight: 0.3,
            description: 'Quality and completeness of input data'
          },
          {
            name: 'Pattern Recognition',
            score: complexity === 'simple' ? 0.88 : 0.75,
            weight: 0.25,
            description: 'Confidence in identified patterns and trends'
          },
          {
            name: 'Domain Knowledge',
            score: 0.92,
            weight: 0.25,
            description: 'Accuracy of financial domain understanding'
          },
          {
            name: 'Analysis Depth',
            score: complexity === 'simple' ? 0.85 : 0.88,
            weight: 0.2,
            description: 'Comprehensiveness of analysis performed'
          }
        ],
        factors: [
          {
            type: 'positive',
            name: 'High Data Quality',
            impact: 0.15,
            description: 'Clean, well-structured financial data'
          },
          {
            type: 'negative',
            name: 'Limited Historical Data',
            impact: -0.08,
            description: 'Only 1 year of historical performance data available'
          }
        ],
        ...(complexity === 'complex' ? {
          uncertainty: {
            dataUncertainty: 0.12,
            modelUncertainty: 0.08,
            contextualUncertainty: 0.15,
            overallUncertainty: 0.18,
            uncertaintyFactors: [
              {
                source: 'market_volatility',
                magnitude: 0.12,
                description: 'Current market conditions add uncertainty to projections'
              }
            ]
          }
        } : {})
      },

      reliability: {
        dataReliability: complexity === 'simple' ? 0.94 : 0.85,
        methodReliability: 0.88,
        contextReliability: 0.91,
        overallReliability: complexity === 'simple' ? 0.91 : 0.88
      },

      nextSteps: complexity === 'simple' ? [
        {
          id: 'action-1',
          type: ActionType.IMMEDIATE,
          title: 'Verify Apple Inc. Price',
          description: 'Cross-reference the found price with current market data',
          priority: ActionPriority.MEDIUM,
          effort: EffortLevel.MINIMAL,
          impact: ImpactLevel.MINOR,
          timeframe: {
            start: 'immediate',
            duration: '5 minutes'
          },
          steps: [
            {
              order: 1,
              description: 'Check real-time market data for AAPL',
              duration: '2 minutes'
            }
          ],
          resources: [
            {
              type: 'data_source',
              description: 'Financial data provider access',
              quantity: '1'
            }
          ],
          successCriteria: ['Price accuracy confirmed within 1%']
        }
      ] : [
        {
          id: 'action-1',
          type: ActionType.STRATEGIC,
          title: 'Portfolio Rebalancing Analysis',
          description: 'Conduct comprehensive sector allocation analysis and rebalancing recommendations',
          priority: ActionPriority.HIGH,
          effort: EffortLevel.MEDIUM,
          impact: ImpactLevel.MAJOR,
          timeframe: {
            start: 'within 1 week',
            duration: '2-3 weeks'
          },
          steps: [
            {
              order: 1,
              description: 'Analyze current sector allocations',
              duration: '3 days'
            },
            {
              order: 2,
              description: 'Model optimal allocation scenarios',
              duration: '5 days'
            },
            {
              order: 3,
              description: 'Generate rebalancing recommendations',
              duration: '2 days'
            }
          ],
          resources: [
            {
              type: 'analyst_time',
              description: 'Senior financial analyst',
              quantity: '40 hours'
            }
          ],
          successCriteria: [
            'Sector allocation analysis completed',
            'Risk-adjusted return projections generated',
            'Implementation timeline defined'
          ]
        }
      ],

      alternatives: [],
      processingTime: complexity === 'simple' ? 1200 : 4500,
      dataQuality: complexity === 'simple' ? 0.95 : 0.78,
      complexity: complexity === 'simple' ? ComplexityLevel.SIMPLE : ComplexityLevel.COMPLEX
    };

    return baseContext;
  };

  const simulateStreaming = async () => {
    const phases = Object.values(StreamingPhase);
    startStreaming(phases);

    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      
      // Simulate phase processing
      for (let progress = 0; progress <= 100; progress += 20) {
        await new Promise(resolve => setTimeout(resolve, 200));
        if (phase) {
          updateStreamingProgress(phase, progress);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Complete streaming with final context
    const finalContext = generateMockContext('complex');
    completeStreaming(finalContext);
  };

  const handleDemoModeChange = (mode: 'simple' | 'complex' | 'streaming') => {
    setDemoMode(mode);
    resetExploration();
    
    if (mode === 'streaming') {
      simulateStreaming();
    } else {
      setContext(generateMockContext(mode));
    }
  };

  // Initialize with simple demo
  useEffect(() => {
    setContext(generateMockContext('simple'));
  }, []);

  return (
    <div className="space-y-6">
      {/* Demo Controls */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-3">Enhanced Context Display Demo</h3>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-blue-800">Demo Mode:</span>
          <div className="flex space-x-2">
            {[
              { id: 'simple', label: 'Simple Analysis', description: 'Basic data lookup' },
              { id: 'complex', label: 'Complex Analysis', description: 'Portfolio analysis with insights' },
              { id: 'streaming', label: 'Streaming Demo', description: 'Real-time analysis simulation' }
            ].map(mode => (
              <button
                key={mode.id}
                onClick={() => handleDemoModeChange(mode.id as any)}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  demoMode === mode.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-blue-700 hover:bg-blue-100'
                }`}
                title={mode.description}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Enhanced Context Display */}
      <EnhancedContextDisplay
        context={context}
        {...(streamingContext ? { streamingContext } : {})}
        isLoading={isLoading}
        error={error}
        onInsightExplore={(insight) => {
          console.log('Exploring insight:', insight);
          updateExploration({ selectedInsight: insight.id });
        }}
        onActionExecute={(action) => {
          console.log('Executing action:', action);
          updateExploration({ selectedAction: action.id });
        }}
        onRiskMitigate={(risk) => {
          console.log('Mitigating risk:', risk);
          updateExploration({ selectedRisk: risk.id });
        }}
        onOpportunityPursue={(opportunity) => {
          console.log('Pursuing opportunity:', opportunity);
          updateExploration({ selectedOpportunity: opportunity.id });
        }}
        enableStreaming={true}
        enableProgressiveDisclosure={true}
      />

      {/* Debug Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs">
        <h4 className="font-medium text-gray-900 mb-2">Debug Information</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <strong>Current Mode:</strong> {demoMode}<br />
            <strong>Disclosure Level:</strong> {progressiveDisclosure.level}<br />
            <strong>Is Streaming:</strong> {streamingContext?.isStreaming ? 'Yes' : 'No'}
          </div>
          <div>
            <strong>Selected Insight:</strong> {interactiveExploration.selectedInsight || 'None'}<br />
            <strong>Selected Action:</strong> {interactiveExploration.selectedAction || 'None'}<br />
            <strong>Drill-down Path:</strong> {interactiveExploration.drillDownPath.join(' → ') || 'None'}
          </div>
        </div>
      </div>
    </div>
  );
};