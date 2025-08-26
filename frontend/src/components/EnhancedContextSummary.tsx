import React, { useState, useMemo } from 'react';
import { ComprehensiveContext, InsightType, RiskSeverity, ContextInsight, RecommendedAction } from '../types/enhanced-context';

interface EnhancedContextSummaryProps {
  context: ComprehensiveContext;
  onInsightClick?: (insight: ContextInsight) => void;
  onActionClick?: (action: RecommendedAction) => void;
  showStreaming?: boolean;
}

export const EnhancedContextSummary: React.FC<EnhancedContextSummaryProps> = ({
  context,
  onInsightClick,
  onActionClick,
  showStreaming = false
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary']));
  const [streamingProgress] = useState(0);

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  // Prioritize insights by type and confidence
  const prioritizedInsights = useMemo(() => {
    return [...context.insights]
      .sort((a, b) => {
        // Sort by priority first, then confidence
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority] || 0;
        const bPriority = priorityOrder[b.priority] || 0;
        
        if (aPriority !== bPriority) return bPriority - aPriority;
        return b.confidence - a.confidence;
      })
      .slice(0, 5); // Show top 5 insights
  }, [context.insights]);

  // Categorize risks by severity
  const criticalRisks = useMemo(() => {
    return context.risks.filter(risk => 
      risk.severity === RiskSeverity.CRITICAL || risk.severity === RiskSeverity.HIGH
    ).slice(0, 3);
  }, [context.risks]);

  // Top opportunities
  const topOpportunities = useMemo(() => {
    return [...context.opportunities]
      .sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority] || 0;
        const bPriority = priorityOrder[b.priority] || 0;
        return bPriority - aPriority;
      })
      .slice(0, 3);
  }, [context.opportunities]);

  const renderConfidenceIndicator = (confidence: number, label?: string) => {
    const percentage = Math.round(confidence * 100);
    const getConfidenceColor = (conf: number) => {
      if (conf >= 0.8) return 'bg-green-500';
      if (conf >= 0.6) return 'bg-yellow-500';
      return 'bg-red-500';
    };

    const getConfidenceText = (conf: number) => {
      if (conf >= 0.9) return 'Very High';
      if (conf >= 0.8) return 'High';
      if (conf >= 0.6) return 'Medium';
      if (conf >= 0.4) return 'Low';
      return 'Very Low';
    };

    return (
      <div className="flex items-center space-x-2">
        {label && <span className="text-sm text-gray-600">{label}:</span>}
        <div className="flex items-center space-x-2">
          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${getConfidenceColor(confidence)} transition-all duration-300`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <span className="text-sm font-medium">{percentage}%</span>
          <span className="text-xs text-gray-500">({getConfidenceText(confidence)})</span>
        </div>
      </div>
    );
  };

  const renderStreamingProgress = () => {
    if (!showStreaming) return null;

    return (
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <div className="flex-1">
            <div className="text-sm text-blue-800 font-medium">Analyzing context...</div>
            <div className="w-full bg-blue-200 rounded-full h-2 mt-1">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${streamingProgress}%` }}
              />
            </div>
          </div>
          <span className="text-sm text-blue-600">{Math.round(streamingProgress)}%</span>
        </div>
      </div>
    );
  };

  const renderExpandableSection = (
    title: string,
    content: React.ReactNode,
    sectionId: string,
    badge?: React.ReactNode
  ) => {
    const isExpanded = expandedSections.has(sectionId);
    
    return (
      <div className="border border-gray-200 rounded-lg mb-4">
        <button
          onClick={() => toggleSection(sectionId)}
          className="w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 transition-colors duration-200 flex items-center justify-between"
          aria-expanded={isExpanded}
        >
          <div className="flex items-center space-x-3">
            <span className="font-medium text-gray-900">{title}</span>
            {badge}
          </div>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isExpanded && (
          <div className="px-4 py-3 border-t border-gray-200">
            {content}
          </div>
        )}
      </div>
    );
  };

  const renderInsightCard = (insight: any) => {
    const getInsightIcon = (type: InsightType) => {
      switch (type) {
        case InsightType.TREND: return '📈';
        case InsightType.ANOMALY: return '⚠️';
        case InsightType.OPPORTUNITY: return '💡';
        case InsightType.RISK: return '🚨';
        case InsightType.RECOMMENDATION: return '💭';
        default: return '📊';
      }
    };

    const getPriorityColor = (priority: string) => {
      switch (priority) {
        case 'critical': return 'bg-red-100 text-red-800 border-red-200';
        case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
        case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    };

    return (
      <div
        key={insight.id}
        className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => onInsightClick?.(insight)}
      >
        <div className="flex items-start space-x-3">
          <span className="text-2xl">{getInsightIcon(insight.type)}</span>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">{insight.title}</h4>
              <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(insight.priority)}`}>
                {insight.priority}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
            <div className="flex items-center justify-between">
              {renderConfidenceIndicator(insight.confidence)}
              <span className="text-xs text-gray-500 capitalize">{insight.type.replace('_', ' ')}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {renderStreamingProgress()}

      {/* Executive Summary */}
      {renderExpandableSection(
        'Executive Summary',
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-800">{context.insights.length}</div>
              <div className="text-sm text-blue-600">Key Insights</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-800">{criticalRisks.length}</div>
              <div className="text-sm text-red-600">Critical Risks</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-800">{topOpportunities.length}</div>
              <div className="text-sm text-green-600">Opportunities</div>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Analysis Overview</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Based on your {context.businessContext.domain.primaryDomain} data analysis, 
              we've identified {prioritizedInsights.length} key insights with 
              {renderConfidenceIndicator(context.confidence.score, 'overall confidence')}. 
              The analysis reveals {context.patterns.length} significant patterns and 
              {context.nextSteps.length} recommended actions for immediate consideration.
            </p>
          </div>
        </div>,
        'summary'
      )}

      {/* Key Insights */}
      {prioritizedInsights.length > 0 && renderExpandableSection(
        'Key Insights',
        <div className="space-y-3">
          {prioritizedInsights.map(renderInsightCard)}
        </div>,
        'insights',
        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
          {prioritizedInsights.length}
        </span>
      )}

      {/* Critical Risks */}
      {criticalRisks.length > 0 && renderExpandableSection(
        'Critical Risks',
        <div className="space-y-3">
          {criticalRisks.map(risk => (
            <div key={risk.id} className="p-4 border border-red-200 bg-red-50 rounded-lg">
              <div className="flex items-start space-x-3">
                <span className="text-red-500 text-xl">🚨</span>
                <div className="flex-1">
                  <h4 className="font-medium text-red-900">{risk.title}</h4>
                  <p className="text-sm text-red-700 mt-1">{risk.description}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-red-600">
                      Impact: {risk.impact} | Probability: {Math.round(risk.probability * 100)}%
                    </span>
                    <span className="bg-red-200 text-red-800 text-xs px-2 py-1 rounded">
                      {risk.severity}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>,
        'risks',
        <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
          {criticalRisks.length}
        </span>
      )}

      {/* Top Opportunities */}
      {topOpportunities.length > 0 && renderExpandableSection(
        'Top Opportunities',
        <div className="space-y-3">
          {topOpportunities.map(opportunity => (
            <div key={opportunity.id} className="p-4 border border-green-200 bg-green-50 rounded-lg">
              <div className="flex items-start space-x-3">
                <span className="text-green-500 text-xl">💡</span>
                <div className="flex-1">
                  <h4 className="font-medium text-green-900">{opportunity.title}</h4>
                  <p className="text-sm text-green-700 mt-1">{opportunity.description}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-green-600">
                      Feasibility: {Math.round(opportunity.feasibility.overall * 100)}%
                    </span>
                    <span className="bg-green-200 text-green-800 text-xs px-2 py-1 rounded">
                      {opportunity.priority}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>,
        'opportunities',
        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
          {topOpportunities.length}
        </span>
      )}

      {/* Recommended Actions */}
      {context.nextSteps.length > 0 && renderExpandableSection(
        'Recommended Actions',
        <div className="space-y-3">
          {context.nextSteps.slice(0, 5).map((action, index) => (
            <div
              key={action.id}
              className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onActionClick?.(action)}
            >
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{action.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className="text-xs text-gray-500">
                      Priority: <span className="font-medium">{action.priority}</span>
                    </span>
                    <span className="text-xs text-gray-500">
                      Effort: <span className="font-medium">{action.effort}</span>
                    </span>
                    <span className="text-xs text-gray-500">
                      Impact: <span className="font-medium">{action.impact}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>,
        'actions',
        <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
          {context.nextSteps.length}
        </span>
      )}

      {/* Confidence & Reliability */}
      {renderExpandableSection(
        'Analysis Confidence',
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Overall Confidence</h4>
              {renderConfidenceIndicator(context.confidence.score)}
              
              <div className="space-y-2">
                {context.confidence.components.map((component, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{component.name}:</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-12 h-1 bg-gray-200 rounded">
                        <div
                          className="h-1 bg-blue-500 rounded"
                          style={{ width: `${component.score * 100}%` }}
                        />
                      </div>
                      <span className="font-medium">{Math.round(component.score * 100)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Data Quality</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Completeness:</span>
                  <span className="font-medium">{Math.round(context.dataContext.dataQuality.completeness * 100)}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Accuracy:</span>
                  <span className="font-medium">{Math.round(context.dataContext.dataQuality.accuracy * 100)}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Consistency:</span>
                  <span className="font-medium">{Math.round(context.dataContext.dataQuality.consistency * 100)}%</span>
                </div>
              </div>
            </div>
          </div>

          {context.confidence.uncertainty && (
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h4 className="font-medium text-yellow-900 mb-2">Uncertainty Factors</h4>
              <div className="space-y-1">
                {context.confidence.uncertainty.uncertaintyFactors.map((factor, index) => (
                  <div key={index} className="text-sm text-yellow-800">
                    • {factor.description} (Impact: {Math.round(factor.magnitude * 100)}%)
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>,
        'confidence'
      )}
    </div>
  );
};