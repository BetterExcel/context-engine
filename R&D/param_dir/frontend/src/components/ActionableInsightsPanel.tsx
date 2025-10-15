import React, { useState, useMemo } from 'react';
import { 
  ContextInsight, 
  RecommendedAction, 
  Risk, 
  Opportunity,
  InsightType,
  RiskSeverity
} from '../types/enhanced-context';

interface ActionableInsightsPanelProps {
  insights: ContextInsight[];
  actions: RecommendedAction[];
  risks: Risk[];
  opportunities: Opportunity[];
  onInsightSelect?: (insight: ContextInsight) => void;
  onActionSelect?: (action: RecommendedAction) => void;
  onRiskSelect?: (risk: Risk) => void;
  onOpportunitySelect?: (opportunity: Opportunity) => void;
}

export const ActionableInsightsPanel: React.FC<ActionableInsightsPanelProps> = ({
  insights,
  actions,
  risks,
  opportunities,
  onInsightSelect,
  onActionSelect,
  onRiskSelect,
  onOpportunitySelect
}) => {
  const [activeTab, setActiveTab] = useState<'insights' | 'actions' | 'risks' | 'opportunities'>('insights');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'confidence' | 'impact'>('priority');

  // Prioritization and filtering logic
  const prioritizedInsights = useMemo(() => {
    let filtered = insights;
    
    if (filterPriority !== 'all') {
      filtered = filtered.filter(insight => insight.priority === filterPriority);
    }

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'confidence':
          return b.confidence - a.confidence;
        case 'impact':
          return b.impact.magnitude - a.impact.magnitude;
        case 'priority':
        default:
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          const aPriority = priorityOrder[a.priority] || 0;
          const bPriority = priorityOrder[b.priority] || 0;
          if (aPriority !== bPriority) return bPriority - aPriority;
          return b.confidence - a.confidence;
      }
    });
  }, [insights, filterPriority, sortBy]);

  const prioritizedActions = useMemo(() => {
    return [...actions].sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority] || 0;
      const bPriority = priorityOrder[b.priority] || 0;
      if (aPriority !== bPriority) return bPriority - aPriority;
      
      const impactOrder = { catastrophic: 6, severe: 5, major: 4, moderate: 3, minor: 2, negligible: 1 };
      const aImpact = impactOrder[a.impact] || 0;
      const bImpact = impactOrder[b.impact] || 0;
      return bImpact - aImpact;
    });
  }, [actions]);

  const criticalRisks = useMemo(() => {
    return risks
      .filter(risk => risk.severity === RiskSeverity.CRITICAL || risk.severity === RiskSeverity.HIGH)
      .sort((a, b) => b.probability * (b.confidence || 1) - a.probability * (a.confidence || 1));
  }, [risks]);

  const topOpportunities = useMemo(() => {
    return [...opportunities]
      .sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority] || 0;
        const bPriority = priorityOrder[b.priority] || 0;
        if (aPriority !== bPriority) return bPriority - aPriority;
        return b.feasibility.overall - a.feasibility.overall;
      })
      .slice(0, 10);
  }, [opportunities]);

  const getInsightIcon = (type: InsightType) => {
    switch (type) {
      case InsightType.TREND: return '📈';
      case InsightType.ANOMALY: return '⚠️';
      case InsightType.CORRELATION: return '🔗';
      case InsightType.PATTERN: return '🔍';
      case InsightType.OPPORTUNITY: return '💡';
      case InsightType.RISK: return '🚨';
      case InsightType.RECOMMENDATION: return '💭';
      case InsightType.VALIDATION: return '✅';
      case InsightType.PREDICTION: return '🔮';
      case InsightType.COMPARISON: return '⚖️';
      default: return '📊';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getActionTypeIcon = (type: string) => {
    switch (type) {
      case 'immediate': return '⚡';
      case 'analytical': return '🔬';
      case 'strategic': return '🎯';
      case 'operational': return '⚙️';
      case 'investigative': return '🔍';
      case 'corrective': return '🔧';
      default: return '📋';
    }
  };

  const renderInsightCard = (insight: ContextInsight) => (
    <div
      key={insight.id}
      className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all cursor-pointer bg-white"
      onClick={() => onInsightSelect?.(insight)}
    >
      <div className="flex items-start space-x-3">
        <span className="text-2xl flex-shrink-0">{getInsightIcon(insight.type)}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-900 truncate">{insight.title}</h4>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(insight.priority)}`}>
                {insight.priority}
              </span>
              {insight.actionable && (
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                  Actionable
                </span>
              )}
            </div>
          </div>
          
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{insight.description}</p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <span className="text-xs text-gray-500">Confidence:</span>
                <div className="w-12 h-1 bg-gray-200 rounded">
                  <div
                    className="h-1 bg-blue-500 rounded"
                    style={{ width: `${insight.confidence * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium">{Math.round(insight.confidence * 100)}%</span>
              </div>
              
              <div className="flex items-center space-x-1">
                <span className="text-xs text-gray-500">Impact:</span>
                <span className="text-xs font-medium">{insight.impact.magnitude}/10</span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-1">
              {insight.tags.slice(0, 2).map((tag, index) => (
                <span key={index} className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderActionCard = (action: RecommendedAction) => (
    <div
      key={action.id}
      className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all cursor-pointer bg-white"
      onClick={() => onActionSelect?.(action)}
    >
      <div className="flex items-start space-x-3">
        <span className="text-2xl flex-shrink-0">{getActionTypeIcon(action.type)}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-900 truncate">{action.title}</h4>
            <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(action.priority)}`}>
              {action.priority}
            </span>
          </div>
          
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{action.description}</p>
          
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-gray-500">Effort:</span>
              <div className="font-medium capitalize">{action.effort}</div>
            </div>
            <div>
              <span className="text-gray-500">Impact:</span>
              <div className="font-medium capitalize">{action.impact}</div>
            </div>
            <div>
              <span className="text-gray-500">Duration:</span>
              <div className="font-medium">{action.timeframe.duration}</div>
            </div>
          </div>
          
          {action.steps.length > 0 && (
            <div className="mt-3 text-xs text-gray-600">
              {action.steps.length} steps • {action.successCriteria.length} success criteria
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderRiskCard = (risk: Risk) => (
    <div
      key={risk.id}
      className="p-4 border border-red-200 bg-red-50 rounded-lg hover:shadow-md transition-all cursor-pointer"
      onClick={() => onRiskSelect?.(risk)}
    >
      <div className="flex items-start space-x-3">
        <span className="text-red-500 text-xl flex-shrink-0">🚨</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-red-900 truncate">{risk.title}</h4>
            <span className={`px-2 py-1 text-xs rounded border ${
              risk.severity === 'critical' ? 'bg-red-200 text-red-900 border-red-300' :
              risk.severity === 'high' ? 'bg-orange-200 text-orange-900 border-orange-300' :
              'bg-yellow-200 text-yellow-900 border-yellow-300'
            }`}>
              {risk.severity}
            </span>
          </div>
          
          <p className="text-sm text-red-700 mb-3 line-clamp-2">{risk.description}</p>
          
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-red-600">Probability:</span>
              <div className="font-medium">{Math.round(risk.probability * 100)}%</div>
            </div>
            <div>
              <span className="text-red-600">Impact:</span>
              <div className="font-medium capitalize">{risk.impact}</div>
            </div>
          </div>
          
          {risk.mitigation.length > 0 && (
            <div className="mt-3 text-xs text-red-600">
              {risk.mitigation.length} mitigation strategies available
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderOpportunityCard = (opportunity: Opportunity) => (
    <div
      key={opportunity.id}
      className="p-4 border border-green-200 bg-green-50 rounded-lg hover:shadow-md transition-all cursor-pointer"
      onClick={() => onOpportunitySelect?.(opportunity)}
    >
      <div className="flex items-start space-x-3">
        <span className="text-green-500 text-xl flex-shrink-0">💡</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-green-900 truncate">{opportunity.title}</h4>
            <span className={`px-2 py-1 text-xs rounded border ${
              opportunity.priority === 'critical' ? 'bg-green-200 text-green-900 border-green-300' :
              opportunity.priority === 'high' ? 'bg-blue-200 text-blue-900 border-blue-300' :
              'bg-gray-200 text-gray-900 border-gray-300'
            }`}>
              {opportunity.priority}
            </span>
          </div>
          
          <p className="text-sm text-green-700 mb-3 line-clamp-2">{opportunity.description}</p>
          
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-green-600">Feasibility:</span>
              <div className="font-medium">{Math.round(opportunity.feasibility.overall * 100)}%</div>
            </div>
            <div>
              <span className="text-green-600">Value:</span>
              <div className="font-medium">{opportunity.potential.value}</div>
            </div>
          </div>
          
          {opportunity.requirements.length > 0 && (
            <div className="mt-3 text-xs text-green-600">
              {opportunity.requirements.length} requirements to implement
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderFiltersAndSort = () => (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center space-x-4">
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="text-sm border border-gray-300 rounded px-3 py-1"
        >
          <option value="all">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'priority' | 'confidence' | 'impact')}
          className="text-sm border border-gray-300 rounded px-3 py-1"
        >
          <option value="priority">Sort by Priority</option>
          <option value="confidence">Sort by Confidence</option>
          <option value="impact">Sort by Impact</option>
        </select>
      </div>
      
      <div className="text-sm text-gray-600">
        {activeTab === 'insights' && `${prioritizedInsights.length} insights`}
        {activeTab === 'actions' && `${prioritizedActions.length} actions`}
        {activeTab === 'risks' && `${criticalRisks.length} risks`}
        {activeTab === 'opportunities' && `${topOpportunities.length} opportunities`}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          {[
            { id: 'insights', label: 'Insights', count: insights.length, icon: '💡' },
            { id: 'actions', label: 'Actions', count: actions.length, icon: '⚡' },
            { id: 'risks', label: 'Risks', count: criticalRisks.length, icon: '🚨' },
            { id: 'opportunities', label: 'Opportunities', count: topOpportunities.length, icon: '🎯' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {renderFiltersAndSort()}
        
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {activeTab === 'insights' && (
            <>
              {prioritizedInsights.length > 0 ? (
                prioritizedInsights.map(renderInsightCard)
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No insights match the current filters
                </div>
              )}
            </>
          )}
          
          {activeTab === 'actions' && (
            <>
              {prioritizedActions.length > 0 ? (
                prioritizedActions.map(renderActionCard)
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No recommended actions available
                </div>
              )}
            </>
          )}
          
          {activeTab === 'risks' && (
            <>
              {criticalRisks.length > 0 ? (
                criticalRisks.map(renderRiskCard)
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No critical risks identified
                </div>
              )}
            </>
          )}
          
          {activeTab === 'opportunities' && (
            <>
              {topOpportunities.length > 0 ? (
                topOpportunities.map(renderOpportunityCard)
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No opportunities identified
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};