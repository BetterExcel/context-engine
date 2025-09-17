import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ContextDisplayProps, ContextDisplayTab } from '../types';

const ContextDisplay: React.FC<ContextDisplayProps> = ({
  context,
  isLoading,
  error
}) => {
  const [activeTab, setActiveTab] = useState<ContextDisplayTab>('natural');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const renderConfidenceIndicator = (confidence: number) => {
    const percentage = Math.round(confidence * 100);
    const getConfidenceColor = (conf: number) => {
      if (conf >= 0.8) return 'bg-green-500';
      if (conf >= 0.6) return 'bg-yellow-500';
      return 'bg-red-500';
    };

    return (
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-600">Confidence:</span>
        <div className="flex items-center space-x-1">
          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${getConfidenceColor(confidence)} transition-all duration-300`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <span className="text-sm font-medium">{percentage}%</span>
        </div>
      </div>
    );
  };

  const renderExpandableSection = (
    title: string,
    content: React.ReactNode,
    sectionId: string
  ) => {
    const isExpanded = expandedSections.has(sectionId);
    
    return (
      <div className="border border-gray-200 rounded-lg mb-4">
        <button
          onClick={() => toggleSection(sectionId)}
          className="w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 transition-colors duration-200 flex items-center justify-between"
          aria-expanded={isExpanded}
          aria-controls={`section-${sectionId}`}
        >
          <span className="font-medium text-gray-900" id={`button-${sectionId}`}>{title}</span>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        {isExpanded && (
          <div 
            className="px-4 py-3 border-t border-gray-200"
            id={`section-${sectionId}`}
            role="region"
            aria-labelledby={`button-${sectionId}`}
          >
            {content}
          </div>
        )}
      </div>
    );
  };

  const renderNaturalLanguageTab = () => {
    if (!context) return null;

    return (
      <div className="space-y-6">
        {/* Analysis Scope Banner */}
        <div className={`p-4 rounded-lg border ${
          context.spreadsheetContext.currentSelection.range && 
          context.spreadsheetContext.currentSelection.range !== 'A1' && 
          !context.spreadsheetContext.currentSelection.range.includes('A1:A1')
            ? 'bg-blue-50 border-blue-200'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              context.spreadsheetContext.currentSelection.range && 
              context.spreadsheetContext.currentSelection.range !== 'A1' && 
              !context.spreadsheetContext.currentSelection.range.includes('A1:A1')
                ? 'bg-blue-100'
                : 'bg-amber-100'
            }`}>
              {context.spreadsheetContext.currentSelection.range && 
               context.spreadsheetContext.currentSelection.range !== 'A1' && 
               !context.spreadsheetContext.currentSelection.range.includes('A1:A1') ? (
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <h4 className={`text-sm font-medium ${
                context.spreadsheetContext.currentSelection.range && 
                context.spreadsheetContext.currentSelection.range !== 'A1' && 
                !context.spreadsheetContext.currentSelection.range.includes('A1:A1')
                  ? 'text-blue-800'
                  : 'text-amber-800'
              }`}>
                {context.spreadsheetContext.currentSelection.range && 
                 context.spreadsheetContext.currentSelection.range !== 'A1' && 
                 !context.spreadsheetContext.currentSelection.range.includes('A1:A1')
                  ? 'Full Data Range Analysis'
                  : 'Targeted Selection Analysis'
                }
              </h4>
              <p className={`text-sm mt-1 ${
                context.spreadsheetContext.currentSelection.range && 
                context.spreadsheetContext.currentSelection.range !== 'A1' && 
                !context.spreadsheetContext.currentSelection.range.includes('A1:A1')
                  ? 'text-blue-700'
                  : 'text-amber-700'
              }`}>
                {context.spreadsheetContext.currentSelection.range && 
                 context.spreadsheetContext.currentSelection.range !== 'A1' && 
                 !context.spreadsheetContext.currentSelection.range.includes('A1:A1')
                  ? `Analysis includes the entire data range (${context.spreadsheetContext.currentSelection.range}) with ${context.spreadsheetContext.dataSummary.rowCount} rows of data.`
                  : `Analysis focused on selected range (${context.spreadsheetContext.currentSelection.range}). Consider selecting the full data range for comprehensive analysis.`
                }
              </p>
            </div>
          </div>
        </div>

        {/* Confidence Indicator */}
        <div className="bg-blue-50 p-4 rounded-lg">
          {renderConfidenceIndicator(context.requestAnalysis.confidence)}
        </div>

        {/* Natural Language Description */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Context Summary</h3>
          <p className="text-gray-700 leading-relaxed">
            {context.naturalLanguageDescription}
          </p>
        </div>

        {/* Request Analysis */}
        {renderExpandableSection(
          'Request Analysis',
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Intent:</span>
              <span className="font-medium capitalize">
                {context.requestAnalysis.intent.replace('_', ' ')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Scope:</span>
              <span className="font-medium capitalize">
                {context.requestAnalysis.scope.replace('_', ' ')}
              </span>
            </div>
          </div>,
          'request-analysis'
        )}

        {/* Data Summary */}
        {renderExpandableSection(
          'Data Summary',
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Rows:</span>
              <span className="font-medium">{context.spreadsheetContext.dataSummary.rowCount}</span>
            </div>
            <div>
              <span className="text-gray-600">Patterns:</span>
              <div className="mt-1 flex flex-wrap gap-2">
                {context.spreadsheetContext.dataSummary.patterns.map((pattern, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                  >
                    {pattern.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>
            {Object.keys(context.spreadsheetContext.dataSummary.statistics).length > 0 && (
              <div>
                <span className="text-gray-600">Statistics:</span>
                <div className="mt-1 space-y-1">
                  {Object.entries(context.spreadsheetContext.dataSummary.statistics).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-gray-500 capitalize">{key.replace('_', ' ')}:</span>
                      <span className="font-medium">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>,
          'data-summary'
        )}

        {/* Actionable Information */}
        {renderExpandableSection(
          'Actionable Information',
          <div className="space-y-3">
            {context.actionableInfo.targetCells.length > 0 && (
              <div>
                <span className="text-gray-600">Target Cells:</span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {context.actionableInfo.targetCells.map((cell, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-green-100 text-green-800 text-sm rounded font-mono"
                    >
                      {cell}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {context.actionableInfo.suggestedOperations.length > 0 && (
              <div>
                <span className="text-gray-600">Suggested Operations:</span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {context.actionableInfo.suggestedOperations.map((operation, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-purple-100 text-purple-800 text-sm rounded"
                    >
                      {operation}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {context.actionableInfo.constraints.length > 0 && (
              <div>
                <span className="text-gray-600">Constraints:</span>
                <ul className="mt-1 space-y-1">
                  {context.actionableInfo.constraints.map((constraint, index) => (
                    <li key={index} className="text-sm text-gray-700 flex items-start">
                      <span className="text-orange-500 mr-2">•</span>
                      {constraint.replace('_', ' ')}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>,
          'actionable-info'
        )}
      </div>
    );
  };

  const renderJsonTab = () => {
    if (!context) return null;

    return (
      <div className="space-y-4">
        {/* Analysis Scope Banner */}
        <div className={`p-4 rounded-lg border ${
          context.spreadsheetContext.currentSelection.range && 
          context.spreadsheetContext.currentSelection.range !== 'A1' && 
          !context.spreadsheetContext.currentSelection.range.includes('A1:A1')
            ? 'bg-blue-50 border-blue-200'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              context.spreadsheetContext.currentSelection.range && 
              context.spreadsheetContext.currentSelection.range !== 'A1' && 
              !context.spreadsheetContext.currentSelection.range.includes('A1:A1')
                ? 'bg-blue-100'
                : 'bg-amber-100'
            }`}>
              {context.spreadsheetContext.currentSelection.range && 
               context.spreadsheetContext.currentSelection.range !== 'A1' && 
               !context.spreadsheetContext.currentSelection.range.includes('A1:A1') ? (
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <h4 className={`text-sm font-medium ${
                context.spreadsheetContext.currentSelection.range && 
                context.spreadsheetContext.currentSelection.range !== 'A1' && 
                !context.spreadsheetContext.currentSelection.range.includes('A1:A1')
                  ? 'text-blue-800'
                  : 'text-amber-800'
              }`}>
                {context.spreadsheetContext.currentSelection.range && 
                 context.spreadsheetContext.currentSelection.range !== 'A1' && 
                 !context.spreadsheetContext.currentSelection.range.includes('A1:A1')
                  ? 'Full Data Range Analysis'
                  : 'Targeted Selection Analysis'
                }
              </h4>
              <p className={`text-sm mt-1 ${
                context.spreadsheetContext.currentSelection.range && 
                context.spreadsheetContext.currentSelection.range !== 'A1' && 
                !context.spreadsheetContext.currentSelection.range.includes('A1:A1')
                  ? 'text-blue-700'
                  : 'text-amber-700'
              }`}>
                {context.spreadsheetContext.currentSelection.range && 
                 context.spreadsheetContext.currentSelection.range !== 'A1' && 
                 !context.spreadsheetContext.currentSelection.range.includes('A1:A1')
                  ? `Analysis includes the entire data range (${context.spreadsheetContext.currentSelection.range}) with ${context.spreadsheetContext.dataSummary.rowCount} rows of data.`
                  : `Analysis focused on selected range (${context.spreadsheetContext.currentSelection.range}). Consider selecting the full data range for comprehensive analysis.`
                }
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          {renderConfidenceIndicator(context.requestAnalysis.confidence)}
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900">JSON Context Data</h3>
          </div>
          <div className="overflow-x-auto">
            <SyntaxHighlighter
              language="json"
              style={tomorrow}
              customStyle={{
                margin: 0,
                padding: '1rem',
                background: 'transparent',
                fontSize: '0.875rem',
              }}
              wrapLongLines={true}
            >
              {JSON.stringify(context, null, 2)}
            </SyntaxHighlighter>
          </div>
        </div>
      </div>
    );
  };

  const renderVisualTab = () => {
    if (!context) return null;

    return (
      <div className="space-y-6">
        {/* Analysis Scope Banner */}
        <div className={`p-4 rounded-lg border ${
          context.spreadsheetContext.currentSelection.range && 
          context.spreadsheetContext.currentSelection.range !== 'A1' && 
          !context.spreadsheetContext.currentSelection.range.includes('A1:A1')
            ? 'bg-blue-50 border-blue-200'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              context.spreadsheetContext.currentSelection.range && 
              context.spreadsheetContext.currentSelection.range !== 'A1' && 
              !context.spreadsheetContext.currentSelection.range.includes('A1:A1')
                ? 'bg-blue-100'
                : 'bg-amber-100'
            }`}>
              {context.spreadsheetContext.currentSelection.range && 
               context.spreadsheetContext.currentSelection.range !== 'A1' && 
               !context.spreadsheetContext.currentSelection.range.includes('A1:A1') ? (
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <h4 className={`text-sm font-medium ${
                context.spreadsheetContext.currentSelection.range && 
                context.spreadsheetContext.currentSelection.range !== 'A1' && 
                !context.spreadsheetContext.currentSelection.range.includes('A1:A1')
                  ? 'text-blue-800'
                  : 'text-amber-800'
              }`}>
                {context.spreadsheetContext.currentSelection.range && 
                 context.spreadsheetContext.currentSelection.range !== 'A1' && 
                 !context.spreadsheetContext.currentSelection.range.includes('A1:A1')
                  ? 'Full Data Range Analysis'
                  : 'Targeted Selection Analysis'
                }
              </h4>
              <p className={`text-sm mt-1 ${
                context.spreadsheetContext.currentSelection.range && 
                context.spreadsheetContext.currentSelection.range !== 'A1' && 
                !context.spreadsheetContext.currentSelection.range.includes('A1:A1')
                  ? 'text-blue-700'
                  : 'text-amber-700'
              }`}>
                {context.spreadsheetContext.currentSelection.range && 
                 context.spreadsheetContext.currentSelection.range !== 'A1' && 
                 !context.spreadsheetContext.currentSelection.range.includes('A1:A1')
                  ? `Analysis includes the entire data range (${context.spreadsheetContext.currentSelection.range}) with ${context.spreadsheetContext.dataSummary.rowCount} rows of data.`
                  : `Analysis focused on selected range (${context.spreadsheetContext.currentSelection.range}). Consider selecting the full data range for comprehensive analysis.`
                }
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          {renderConfidenceIndicator(context.requestAnalysis.confidence)}
        </div>

        {/* Visual representation of context */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Intent & Scope Card */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Analysis</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="text-gray-600">Intent</span>
                <span className="font-medium text-blue-800 capitalize">
                  {context.requestAnalysis.intent.replace('_', ' ')}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-gray-600">Scope</span>
                <span className="font-medium text-green-800 capitalize">
                  {context.requestAnalysis.scope.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          {/* Data Overview Card */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Overview</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Selected Range</span>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-sm bg-gray-200 px-2 py-1 rounded">
                    {context.spreadsheetContext.currentSelection.range}
                  </span>
                  {/* Selection Type Indicator */}
                  {context.spreadsheetContext.currentSelection.range && 
                   context.spreadsheetContext.currentSelection.range !== 'A1' && 
                   !context.spreadsheetContext.currentSelection.range.includes('A1:A1') && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Full Range
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Row Count</span>
                <span className="font-medium">
                  {context.spreadsheetContext.dataSummary.rowCount}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Analysis Scope</span>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">
                    {context.spreadsheetContext.currentSelection.range && 
                     context.spreadsheetContext.currentSelection.range !== 'A1' && 
                     !context.spreadsheetContext.currentSelection.range.includes('A1:A1')
                      ? 'Entire Data Range'
                      : 'Selected Cells'
                    }
                  </span>
                  {context.spreadsheetContext.currentSelection.range && 
                   context.spreadsheetContext.currentSelection.range !== 'A1' && 
                   !context.spreadsheetContext.currentSelection.range.includes('A1:A1') && (
                    <div className="relative group">
                      <svg className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                        Analysis includes all data in the spreadsheet
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Data Types Visualization */}
        {context.spreadsheetContext.currentSelection.dataTypes.length > 0 && (
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Types</h3>
            <div className="flex flex-wrap gap-2">
              {context.spreadsheetContext.currentSelection.dataTypes.map((type, index) => (
                <span
                  key={index}
                  className="px-3 py-2 bg-indigo-100 text-indigo-800 text-sm rounded-lg font-medium"
                >
                  {type.toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Patterns Visualization */}
        {context.spreadsheetContext.dataSummary.patterns.length > 0 && (
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Detected Patterns</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {context.spreadsheetContext.dataSummary.patterns.map((pattern, index) => (
                <div
                  key={index}
                  className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-center"
                >
                  <span className="text-yellow-800 font-medium">
                    {pattern.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              ))}
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
        <span className="text-gray-600">Analyzing context...</span>
      </div>
    </div>
  );

  const renderErrorState = () => (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
      <div className="flex items-center space-x-3">
        <svg
          className="w-6 h-6 text-red-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div>
          <h3 className="text-lg font-medium text-red-800">Error Loading Context</h3>
          <p className="text-red-700 mt-1">{error}</p>
        </div>
      </div>
    </div>
  );

  const renderEmptyState = () => (
    <div className="text-center py-12">
      <svg
        className="w-16 h-16 text-gray-300 mx-auto mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <h3 className="text-lg font-medium text-gray-900 mb-2">No Context Available</h3>
      <p className="text-gray-600">
        Submit a request to see the generated context analysis.
      </p>
    </div>
  );

  if (isLoading) {
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

  if (!context) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {renderEmptyState()}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          {[
            { id: 'natural', label: 'Natural Language', icon: '📝' },
            { id: 'json', label: 'JSON Data', icon: '{ }' },
            { id: 'visual', label: 'Visual', icon: '📊' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ContextDisplayTab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'natural' && renderNaturalLanguageTab()}
        {activeTab === 'json' && renderJsonTab()}
        {activeTab === 'visual' && renderVisualTab()}
      </div>
    </div>
  );
};

export default ContextDisplay;