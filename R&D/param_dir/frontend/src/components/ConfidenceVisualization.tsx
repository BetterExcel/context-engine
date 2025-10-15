import React, { useState } from 'react';
import { OverallConfidence, ConfidenceLevel } from '../types/enhanced-context';

interface ConfidenceVisualizationProps {
  confidence: OverallConfidence;
  showDetails?: boolean;
  interactive?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const ConfidenceVisualization: React.FC<ConfidenceVisualizationProps> = ({
  confidence,
  showDetails = true,
  interactive = true,
  size = 'medium'
}) => {
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [showUncertainty, setShowUncertainty] = useState(false);

  const getConfidenceColor = (score: number) => {
    if (score >= 0.9) return '#10B981'; // green-500
    if (score >= 0.8) return '#059669'; // green-600
    if (score >= 0.7) return '#F59E0B'; // amber-500
    if (score >= 0.6) return '#D97706'; // amber-600
    if (score >= 0.5) return '#EF4444'; // red-500
    return '#DC2626'; // red-600
  };

  const getConfidenceText = (level: ConfidenceLevel) => {
    switch (level) {
      case ConfidenceLevel.VERY_HIGH: return 'Very High';
      case ConfidenceLevel.HIGH: return 'High';
      case ConfidenceLevel.MEDIUM: return 'Medium';
      case ConfidenceLevel.LOW: return 'Low';
      case ConfidenceLevel.VERY_LOW: return 'Very Low';
      default: return 'Unknown';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'small': return { gauge: 'w-16 h-16', text: 'text-xs' };
      case 'large': return { gauge: 'w-32 h-32', text: 'text-lg' };
      default: return { gauge: 'w-24 h-24', text: 'text-sm' };
    }
  };

  const sizeClasses = getSizeClasses();
  const percentage = Math.round(confidence.score * 100);
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const renderGaugeVisualization = () => (
    <div className="flex flex-col items-center space-y-2">
      <div className={`relative ${sizeClasses.gauge}`}>
        <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="#E5E7EB"
            strokeWidth="8"
            fill="none"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke={getConfidenceColor(confidence.score)}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
          {/* Uncertainty indicator */}
          {confidence.uncertainty && showUncertainty && (
            <circle
              cx="50"
              cy="50"
              r="35"
              stroke="#FEF3C7"
              strokeWidth="4"
              fill="none"
              strokeDasharray="5,5"
              opacity="0.7"
            />
          )}
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-bold text-gray-900 ${sizeClasses.text}`}>
            {percentage}%
          </span>
          <span className="text-xs text-gray-500">
            {getConfidenceText(confidence.level)}
          </span>
        </div>
      </div>
    </div>
  );

  const renderComponentBreakdown = () => (
    <div className="space-y-3">
      <h4 className="font-medium text-gray-900">Confidence Components</h4>
      <div className="space-y-2">
        {confidence.components.map((component, index) => {
          const isSelected = selectedComponent === component.name;
          const componentPercentage = Math.round(component.score * 100);
          
          return (
            <div
              key={index}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                isSelected 
                  ? 'border-blue-300 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => interactive && setSelectedComponent(
                isSelected ? null : component.name
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">
                  {component.name}
                </span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    {componentPercentage}%
                  </span>
                  <span className="text-xs text-gray-500">
                    (weight: {Math.round(component.weight * 100)}%)
                  </span>
                </div>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${componentPercentage}%`,
                    backgroundColor: getConfidenceColor(component.score)
                  }}
                />
              </div>
              
              {isSelected && (
                <div className="mt-2 text-xs text-gray-600">
                  {component.description}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderFactorAnalysis = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">Confidence Factors</h4>
        {confidence.uncertainty && (
          <button
            onClick={() => setShowUncertainty(!showUncertainty)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            {showUncertainty ? 'Hide' : 'Show'} Uncertainty
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Positive factors */}
        <div className="space-y-2">
          <h5 className="text-sm font-medium text-green-800">Positive Factors</h5>
          {confidence.factors
            .filter(factor => factor.type === 'positive')
            .map((factor, index) => (
              <div key={index} className="p-2 bg-green-50 border border-green-200 rounded">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-green-800">{factor.name}</span>
                  <span className="text-xs text-green-600">
                    +{Math.round(factor.impact * 100)}%
                  </span>
                </div>
                <p className="text-xs text-green-700 mt-1">{factor.description}</p>
              </div>
            ))}
        </div>

        {/* Negative factors */}
        <div className="space-y-2">
          <h5 className="text-sm font-medium text-red-800">Risk Factors</h5>
          {confidence.factors
            .filter(factor => factor.type === 'negative')
            .map((factor, index) => (
              <div key={index} className="p-2 bg-red-50 border border-red-200 rounded">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-red-800">{factor.name}</span>
                  <span className="text-xs text-red-600">
                    {Math.round(factor.impact * 100)}%
                  </span>
                </div>
                <p className="text-xs text-red-700 mt-1">{factor.description}</p>
              </div>
            ))}
        </div>
      </div>
    </div>
  );

  const renderUncertaintyAnalysis = () => {
    if (!confidence.uncertainty || !showUncertainty) return null;

    return (
      <div className="space-y-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h4 className="font-medium text-yellow-900">Uncertainty Analysis</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-yellow-800">Data Uncertainty:</span>
              <span className="font-medium">
                {Math.round(confidence.uncertainty.dataUncertainty * 100)}%
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-yellow-800">Model Uncertainty:</span>
              <span className="font-medium">
                {Math.round(confidence.uncertainty.modelUncertainty * 100)}%
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-yellow-800">Context Uncertainty:</span>
              <span className="font-medium">
                {Math.round(confidence.uncertainty.contextualUncertainty * 100)}%
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="text-sm text-yellow-800">
              <span className="font-medium">Overall Uncertainty:</span>
              <div className="w-full bg-yellow-200 rounded-full h-2 mt-1">
                <div
                  className="bg-yellow-600 h-2 rounded-full"
                  style={{ 
                    width: `${confidence.uncertainty.overallUncertainty * 100}%` 
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {confidence.uncertainty.uncertaintyFactors.length > 0 && (
          <div className="space-y-1">
            <h5 className="text-sm font-medium text-yellow-900">Key Uncertainty Sources:</h5>
            {confidence.uncertainty.uncertaintyFactors.map((factor, index) => (
              <div key={index} className="text-xs text-yellow-800">
                • {factor.description} ({Math.round(factor.magnitude * 100)}% impact)
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Main gauge visualization */}
      <div className="flex flex-col items-center">
        {renderGaugeVisualization()}
        <div className="text-center mt-2">
          <div className="text-lg font-semibold text-gray-900">
            Analysis Confidence
          </div>
          <div className="text-sm text-gray-600">
            Based on {confidence.components.length} factors
          </div>
        </div>
      </div>

      {/* Detailed breakdown */}
      {showDetails && (
        <div className="space-y-6">
          {renderComponentBreakdown()}
          {renderFactorAnalysis()}
          {renderUncertaintyAnalysis()}
        </div>
      )}

      {/* Interactive legend */}
      {interactive && (
        <div className="text-xs text-gray-500 text-center">
          Click on components above to see detailed explanations
        </div>
      )}
    </div>
  );
};