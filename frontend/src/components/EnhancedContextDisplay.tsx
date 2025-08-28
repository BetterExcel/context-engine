import React, { useState, useEffect } from 'react';
import { EnhancedContextSummary } from './EnhancedContextSummary';
import { ConfidenceVisualization } from './ConfidenceVisualization';
import { ActionableInsightsPanel } from './ActionableInsightsPanel';
import { StreamingContextDisplay } from './StreamingContextDisplay';
import { 
  ComprehensiveContext, 
  StreamingContext, 
  DisclosureLevel,
  InteractiveExploration,
  ContextInsight,
  RecommendedAction,
  Risk,
  Opportunity
} from '../types/enhanced-context';

interface EnhancedContextDisplayProps {
  context: ComprehensiveContext | null;
  streamingContext?: StreamingContext;
  isLoading: boolean;
  error?: string | null;
  onInsightExplore?: (insight: ContextInsight) => void;
  onActionExecute?: (action: RecommendedAction) => void;
  onRiskMitigate?: (risk: Risk) => void;
  onOpportunityPursue?: (opportunity: Opportunity) => void;
  enableStreaming?: boolean;
  enableProgressiveDisclosure?: boolean;
}

type DisplayMode = 'summary' | 'insights' | 'confidence' | 'streaming' | 'detailed';

export const EnhancedContextDisplay: React.FC<EnhancedContextDisplayProps> = ({
  context,
  streamingContext,
  isLoading,
  error,
  onInsightExplore,
  onActionExecute,
  onRiskMitigate,
  onOpportunityPursue,
  enableStreaming = true,
  enableProgressiveDisclosure = true
}) => {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('summary');
  const [disclosureLevel, setDisclosureLevel] = useState<DisclosureLevel>(DisclosureLevel.STANDARD);
  const [interactiveExploration, setInteractiveExploration] = useState<InteractiveExploration>({
    drillDownPath: [],
    filters: {
      insightTypes: [],
      priorities: [],
      categories: [],
      confidenceThreshold: 0.5
    }
  });

  // Auto-switch to streaming mode when streaming is active
  useEffect(() => {
    if (streamingContext?.isStreaming && enableStreaming) {
      setDisplayMode('streaming');
    } else if (context && displayMode === 'streaming') {
      setDisplayMode('summary');
    }
  }, [streamingContext?.isStreaming, context, enableStreaming, displayMode]);

  const handleInsightSelect = (insight: ContextInsight) => {
    setInteractiveExploration(prev => ({
      ...prev,
      selectedInsight: insight.id,
      drillDownPath: [...prev.drillDownPath, `insight:${insight.id}`]
    }));
    onInsightExplore?.(insight);
  };

  const handleActionSelect = (action: RecommendedAction) => {
    setInteractiveExploration(prev => ({
      ...prev,
      selectedAction: action.id,
      drillDownPath: [...prev.drillDownPath, `action:${action.id}`]
    }));
    onActionExecute?.(action);
  };

  const handleRiskSelect = (risk: Risk) => {
    setInteractiveExploration(prev => ({
      ...prev,
      selectedRisk: risk.id,
      drillDownPath: [...prev.drillDownPath, `risk:${risk.id}`]
    }));
    onRiskMitigate?.(risk);
  };

  const handleOpportunitySelect = (opportunity: Opportunity) => {
    setInteractiveExploration(prev => ({
      ...prev,
      selectedOpportunity: opportunity.id,
      drillDownPath: [...prev.drillDownPath, `opportunity:${opportunity.id}`]
    }));
    onOpportunityPursue?.(opportunity);
  };

  const renderModeSelector = () => {
    if (!context && !streamingContext?.isStreaming) return null;

    const modes = [
      { id: 'summary', label: 'Summary', icon: '📋', available: !!context },
      { id: 'insights', label: 'Insights', icon: '💡', available: !!context?.insights.length },
      { id: 'confidence', label: 'Confidence', icon: '📊', available: !!context?.confidence },
      { id: 'streaming', label: 'Progress', icon: '⚡', available: !!streamingContext?.isStreaming },
      { id: 'detailed', label: 'Detailed', icon: '🔍', available: !!context }
    ];

    return (
      <div className="border-b border-gray-200 bg-white">
        <nav className="flex space-x-8 px-6" aria-label="Display modes">
          {modes.filter(mode => mode.available).map((mode) => (
            <button
              key={mode.id}
              onClick={() => setDisplayMode(mode.id as DisplayMode)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 flex items-center space-x-2 ${
                displayMode === mode.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>{mode.icon}</span>
              <span>{mode.label}</span>
            </button>
          ))}
        </nav>
      </div>
    );
  };

  const renderDisclosureLevelSelector = () => {
    if (!enableProgressiveDisclosure || !context) return null;

    const levels = [
      { id: DisclosureLevel.SUMMARY, label: 'Summary', description: 'Key highlights only' },
      { id: DisclosureLevel.STANDARD, label: 'Standard', description: 'Balanced detail level' },
      { id: DisclosureLevel.DETAILED, label: 'Detailed', description: 'Comprehensive analysis' },
      { id: DisclosureLevel.EXPERT, label: 'Expert', description: 'Technical deep-dive' }
    ];

    return (
      <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Detail Level:</span>
          <select
            value={disclosureLevel}
            onChange={(e) => setDisclosureLevel(e.target.value as DisclosureLevel)}
            className="text-sm border border-gray-300 rounded px-3 py-1"
          >
            {levels.map(level => (
              <option key={level.id} value={level.id}>
                {level.label} - {level.description}
              </option>
            ))}
          </select>
        </div>

        {interactiveExploration.drillDownPath.length > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">Path:</span>
            <div className="flex items-center space-x-1">
              {interactiveExploration.drillDownPath.map((path, index) => (
                <React.Fragment key={index}>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {path.split(':')[0]}
                  </span>
                  {index < interactiveExploration.drillDownPath.length - 1 && (
                    <span className="text-xs text-gray-400">→</span>
                  )}
                </React.Fragment>
              ))}
              <button
                onClick={() => setInteractiveExploration(prev => ({ ...prev, drillDownPath: [] }))}
                className="text-xs text-gray-500 hover:text-gray-700 ml-2"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderLoadingState = () => (
    <div className="flex items-center justify-center py-12">
      <div className="flex items-center space-x-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="text-gray-600">Initializing enhanced analysis...</span>
      </div>
    </div>
  );

  const renderErrorState = () => (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
      <div className="flex items-center space-x-3">
        <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h3 className="text-lg font-medium text-red-800">Enhanced Analysis Error</h3>
          <p className="text-red-700 mt-1">{error}</p>
        </div>
      </div>
    </div>
  );

  const renderEmptyState = () => (
    <div className="text-center py-12">
      <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <h3 className="text-lg font-medium text-gray-900 mb-2">No Enhanced Context Available</h3>
      <p className="text-gray-600">
        Upload a spreadsheet and submit a request to see enhanced contextual analysis.
      </p>
    </div>
  );

  const renderContent = () => {
    // Show streaming display when streaming is active
    if (streamingContext?.isStreaming || displayMode === 'streaming') {
      return streamingContext ? (
        <StreamingContextDisplay
          streamingContext={streamingContext}
          showProgressDetails={disclosureLevel !== DisclosureLevel.SUMMARY}
        />
      ) : (
        <div className="text-center py-8 text-gray-500">
          No streaming context available
        </div>
      );
    }

    // Show content based on selected mode
    if (!context) return renderEmptyState();

    switch (displayMode) {
      case 'summary':
        return (
          <EnhancedContextSummary
            context={context}
            onInsightClick={handleInsightSelect}
            onActionClick={handleActionSelect}
          />
        );

      case 'insights':
        return (
          <ActionableInsightsPanel
            insights={context.insights}
            actions={context.nextSteps}
            risks={context.risks}
            opportunities={context.opportunities}
            onInsightSelect={handleInsightSelect}
            onActionSelect={handleActionSelect}
            onRiskSelect={handleRiskSelect}
            onOpportunitySelect={handleOpportunitySelect}
          />
        );

      case 'confidence':
        return (
          <ConfidenceVisualization
            confidence={context.confidence}
            showDetails={disclosureLevel !== DisclosureLevel.SUMMARY}
            interactive={true}
            size="large"
          />
        );

      case 'detailed':
        return (
          <div className="space-y-8">
            <EnhancedContextSummary
              context={context}
              onInsightClick={handleInsightSelect}
              onActionClick={handleActionSelect}
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Analysis Confidence</h3>
                <ConfidenceVisualization
                  confidence={context.confidence}
                  showDetails={true}
                  interactive={true}
                  size="medium"
                />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Actionable Items</h3>
                <ActionableInsightsPanel
                  insights={context.insights.slice(0, 3)}
                  actions={context.nextSteps.slice(0, 3)}
                  risks={context.risks.slice(0, 2)}
                  opportunities={context.opportunities.slice(0, 2)}
                  onInsightSelect={handleInsightSelect}
                  onActionSelect={handleActionSelect}
                  onRiskSelect={handleRiskSelect}
                  onOpportunitySelect={handleOpportunitySelect}
                />
              </div>
            </div>
          </div>
        );

      default:
        return renderEmptyState();
    }
  };

  if (isLoading && !streamingContext?.isStreaming) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {renderLoadingState()}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {renderErrorState()}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {renderModeSelector()}
      {renderDisclosureLevelSelector()}
      
      <div className="p-6">
        {renderContent()}
      </div>

      {/* Performance indicator */}
      {context && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
          Analysis completed in {context.processingTime}ms • 
          Complexity: {context.complexity} • 
          Data Quality: {Math.round(context.dataQuality * 100)}%
        </div>
      )}
    </div>
  );
};