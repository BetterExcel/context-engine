import React, { useState, useEffect } from 'react';
import { StreamingContext, StreamingPhase } from '../types/enhanced-context';

interface StreamingContextDisplayProps {
  streamingContext: StreamingContext;
  onStreamingComplete?: () => void;
  showProgressDetails?: boolean;
}

export const StreamingContextDisplay: React.FC<StreamingContextDisplayProps> = ({
  streamingContext,

  onStreamingComplete,
  showProgressDetails = true
}) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [currentPhaseStartTime, setCurrentPhaseStartTime] = useState<number>(Date.now());

  useEffect(() => {
    // Animate progress bar
    const timer = setTimeout(() => {
      setAnimatedProgress(streamingContext.progress);
    }, 100);
    return () => clearTimeout(timer);
  }, [streamingContext.progress]);

  useEffect(() => {
    // Track phase changes
    setCurrentPhaseStartTime(Date.now());
  }, [streamingContext.currentPhase]);

  useEffect(() => {
    // Check if streaming is complete
    if (streamingContext.progress >= 100 && !streamingContext.isStreaming) {
      onStreamingComplete?.();
    }
  }, [streamingContext.progress, streamingContext.isStreaming, onStreamingComplete]);

  const getPhaseInfo = (phase: StreamingPhase) => {
    switch (phase) {
      case StreamingPhase.DATA_PARSING:
        return {
          title: 'Parsing Data',
          description: 'Analyzing spreadsheet structure and content',
          icon: '📊',
          color: 'blue'
        };
      case StreamingPhase.PATTERN_DETECTION:
        return {
          title: 'Detecting Patterns',
          description: 'Identifying data patterns and relationships',
          icon: '🔍',
          color: 'indigo'
        };
      case StreamingPhase.INSIGHT_GENERATION:
        return {
          title: 'Generating Insights',
          description: 'Creating actionable insights from analysis',
          icon: '💡',
          color: 'yellow'
        };
      case StreamingPhase.RISK_ASSESSMENT:
        return {
          title: 'Assessing Risks',
          description: 'Evaluating potential risks and issues',
          icon: '⚠️',
          color: 'red'
        };
      case StreamingPhase.OPPORTUNITY_ANALYSIS:
        return {
          title: 'Finding Opportunities',
          description: 'Identifying improvement opportunities',
          icon: '🎯',
          color: 'green'
        };
      case StreamingPhase.CONFIDENCE_CALCULATION:
        return {
          title: 'Calculating Confidence',
          description: 'Determining analysis reliability',
          icon: '📈',
          color: 'purple'
        };
      case StreamingPhase.FINALIZATION:
        return {
          title: 'Finalizing Results',
          description: 'Preparing comprehensive analysis',
          icon: '✅',
          color: 'green'
        };
      default:
        return {
          title: 'Processing',
          description: 'Analyzing your data',
          icon: '⚙️',
          color: 'gray'
        };
    }
  };

  const getColorClasses = (color: string, variant: 'bg' | 'text' | 'border' = 'bg') => {
    const colorMap: Record<string, Record<string, string>> = {
      blue: { bg: 'bg-blue-500', text: 'text-blue-600', border: 'border-blue-200' },
      indigo: { bg: 'bg-indigo-500', text: 'text-indigo-600', border: 'border-indigo-200' },
      yellow: { bg: 'bg-yellow-500', text: 'text-yellow-600', border: 'border-yellow-200' },
      red: { bg: 'bg-red-500', text: 'text-red-600', border: 'border-red-200' },
      green: { bg: 'bg-green-500', text: 'text-green-600', border: 'border-green-200' },
      purple: { bg: 'bg-purple-500', text: 'text-purple-600', border: 'border-purple-200' },
      gray: { bg: 'bg-gray-500', text: 'text-gray-600', border: 'border-gray-200' }
    };
    return colorMap[color]?.[variant] || colorMap['gray'][variant];
  };

  const formatTimeRemaining = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const renderPhaseIndicator = (phase: StreamingPhase, index: number) => {
    const phaseInfo = getPhaseInfo(phase);
    const isCompleted = streamingContext.completedPhases.includes(phase);
    const isCurrent = streamingContext.currentPhase === phase;


    return (
      <div
        key={phase}
        className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-300 ${
          isCurrent 
            ? `bg-${phaseInfo.color}-50 border-2 ${getColorClasses(phaseInfo.color, 'border')}` 
            : isCompleted 
              ? 'bg-green-50 border-2 border-green-200' 
              : 'bg-gray-50 border-2 border-gray-200'
        }`}
      >
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isCurrent 
            ? getColorClasses(phaseInfo.color, 'bg') + ' text-white'
            : isCompleted 
              ? 'bg-green-500 text-white' 
              : 'bg-gray-300 text-gray-600'
        }`}>
          {isCompleted ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          ) : isCurrent ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <span className="text-sm font-medium">{index + 1}</span>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className={`font-medium ${
            isCurrent 
              ? getColorClasses(phaseInfo.color, 'text')
              : isCompleted 
                ? 'text-green-800' 
                : 'text-gray-600'
          }`}>
            {phaseInfo.title}
          </div>
          <div className={`text-sm ${
            isCurrent 
              ? getColorClasses(phaseInfo.color, 'text')
              : isCompleted 
                ? 'text-green-600' 
                : 'text-gray-500'
          }`}>
            {phaseInfo.description}
          </div>
        </div>
        
        <div className="flex-shrink-0 text-2xl">
          {phaseInfo.icon}
        </div>
      </div>
    );
  };

  const renderProgressBar = () => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
          Analysis Progress
        </span>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">
            {Math.round(streamingContext.progress)}%
          </span>
          {streamingContext.estimatedTimeRemaining > 0 && (
            <span className="text-xs text-gray-500">
              • {formatTimeRemaining(streamingContext.estimatedTimeRemaining)} remaining
            </span>
          )}
        </div>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className="h-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-500 ease-out relative"
          style={{ width: `${animatedProgress}%` }}
        >
          {streamingContext.isStreaming && (
            <div className="absolute inset-0 bg-white opacity-30 animate-pulse"></div>
          )}
        </div>
      </div>
    </div>
  );

  const renderCurrentPhaseDetails = () => {
    const currentPhaseInfo = getPhaseInfo(streamingContext.currentPhase);
    const phaseElapsedTime = (Date.now() - currentPhaseStartTime) / 1000;
    
    return (
      <div className={`p-4 rounded-lg border-2 ${getColorClasses(currentPhaseInfo.color, 'border')} bg-white`}>
        <div className="flex items-center space-x-3 mb-3">
          <div className={`w-10 h-10 rounded-full ${getColorClasses(currentPhaseInfo.color, 'bg')} flex items-center justify-center text-white text-xl`}>
            {currentPhaseInfo.icon}
          </div>
          <div>
            <h3 className={`font-semibold ${getColorClasses(currentPhaseInfo.color, 'text')}`}>
              {currentPhaseInfo.title}
            </h3>
            <p className="text-sm text-gray-600">
              {currentPhaseInfo.description}
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            Phase {streamingContext.completedPhases.length + 1} of {Object.keys(StreamingPhase).length}
          </span>
          <span className="text-gray-500">
            {Math.round(phaseElapsedTime)}s elapsed
          </span>
        </div>
      </div>
    );
  };

  if (!streamingContext.isStreaming && streamingContext.progress >= 100) {
    return (
      <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-green-800">Analysis Complete</h3>
            <p className="text-sm text-green-600">
              Your comprehensive context analysis is ready
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main progress indicator */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center space-x-4 mb-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Analyzing Your Data
            </h2>
            <p className="text-sm text-gray-600">
              Generating comprehensive contextual insights
            </p>
          </div>
        </div>
        
        {renderProgressBar()}
      </div>

      {/* Current phase details */}
      {showProgressDetails && renderCurrentPhaseDetails()}

      {/* Phase timeline */}
      {showProgressDetails && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Analysis Phases</h3>
          <div className="space-y-3">
            {Object.values(StreamingPhase).map((phase, index) => 
              renderPhaseIndicator(phase, index)
            )}
          </div>
        </div>
      )}

      {/* Performance metrics */}
      {showProgressDetails && streamingContext.completedPhases.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h4 className="font-medium text-gray-900 mb-2">Performance Metrics</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Completed Phases:</span>
              <div className="font-medium">{streamingContext.completedPhases.length}</div>
            </div>
            <div>
              <span className="text-gray-600">Processing Speed:</span>
              <div className="font-medium">
                {streamingContext.completedPhases.length > 0 
                  ? `${Math.round(streamingContext.progress / ((Date.now() - currentPhaseStartTime) / 1000))}%/s`
                  : 'Calculating...'
                }
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};