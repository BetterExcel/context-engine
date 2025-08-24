import { useState, useEffect } from 'react';
import { FileUpload, SpreadsheetViewer, RequestInput, ErrorBoundary, ErrorDisplay } from './components';
import HistorySidebar from './components/HistorySidebar';
import { FeedbackModal } from './components/FeedbackModal';
import { RecommendationsPanel } from './components/RecommendationsPanel';
import DataVisualization from './components/DataVisualization';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import { SpreadsheetSkeleton, ContextAnalysisSkeleton, FileUploadSkeleton } from './components/LoadingSkeleton';
import Tooltip, { HelpTooltip } from './components/Tooltip';
import { useKeyboardShortcuts, createSpreadsheetShortcuts } from './hooks/useKeyboardShortcuts';
import { useResponsive } from './hooks/useResponsive';
import { announceToScreenReader } from './utils/accessibility';
import { ApiService } from './services/api';
import { SessionService, ActionType, ContextHistoryEntry } from './services/sessionService';
import { AutoSelectionManager } from './services/AutoSelectionManager';
import { UploadResponse, SpreadsheetData, ContextAnalysisResponse } from './types';
import { ApiError } from './components/ErrorDisplay';

function App(): JSX.Element {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [spreadsheetData, setSpreadsheetData] = useState<SpreadsheetData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [selectedRange, setSelectedRange] = useState<string | null>(null);
  const [activeCell, setActiveCell] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [contextResult, setContextResult] = useState<ContextAnalysisResponse | null>(null);
  const [analysisError, setAnalysisError] = useState<ApiError | string | null>(null);
  const [uploadError, setUploadError] = useState<ApiError | string | null>(null);
  const [isHistorySidebarOpen, setIsHistorySidebarOpen] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isRecommendationsPanelOpen, setIsRecommendationsPanelOpen] = useState(false);
  const [currentRequest, setCurrentRequest] = useState<string>('');
  const [isKeyboardShortcutsOpen, setIsKeyboardShortcutsOpen] = useState(false);
  const [showDataVisualization, setShowDataVisualization] = useState(false);
  const [llmResponse, setLlmResponse] = useState<any | null>(null);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);
  const [llmError, setLlmError] = useState<string | null>(null);
  const [autoSelectionManager, setAutoSelectionManager] = useState<AutoSelectionManager | null>(null);
  const [currentSheetIndex, setCurrentSheetIndex] = useState(0);
  const [defaultSelection, setDefaultSelection] = useState<string | null>(null);
  const [isManualSelection, setIsManualSelection] = useState(false);

  // Responsive design
  const { isMobile, isTablet } = useResponsive();

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadResult(null);
    setUploadedFile(file);
    setUploadError(null);

    try {
      const result = await ApiService.uploadSpreadsheet(file);
      setUploadResult(result);

      // Create or get session when file is uploaded
      if (result.success && result.spreadsheetId) {
        try {
          const session = await SessionService.createOrGetSession(undefined, result.spreadsheetId);
          setCurrentSessionId(session.sessionId);
        } catch (sessionError) {
          console.warn('Failed to create session:', sessionError);
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      
      // Handle API errors with proper structure
      if (error && typeof error === 'object' && 'response' in error) {
        const apiResponse = (error as any).response;
        if (apiResponse?.data?.error) {
          setUploadError(apiResponse.data.error);
        } else {
          setUploadError('Upload failed: ' + (apiResponse?.statusText || 'Unknown error'));
        }
      } else if (error instanceof Error) {
        setUploadError(error.message);
      } else {
        setUploadError('An unexpected error occurred during upload');
      }

      setUploadResult({
        success: false,
        message: 'Upload failed',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleNewUpload = () => {
    setUploadResult(null);
    setUploadedFile(null);
    setSpreadsheetData(null);
    setSelectedRange(null);
    setActiveCell(null);
    setContextResult(null);
    setAnalysisError(null);
    setUploadError(null);
    setIsHistorySidebarOpen(false);
    setShowDataVisualization(false);
    setLlmResponse(null);
    setLlmError(null);
    setIsGeneratingResponse(false);
    
    // Reset selection state and manager
    setAutoSelectionManager(null);
    setCurrentSheetIndex(0);
    setDefaultSelection(null);
    setIsManualSelection(false);
    
    // Clear session
    SessionService.clearSession();
    setCurrentSessionId(null);
    
    // Announce to screen readers
    announceToScreenReader('New file upload started');
  };

  // Keyboard shortcuts
  const shortcuts = createSpreadsheetShortcuts({
    onNewFile: handleNewUpload,
    onToggleHistory: () => setIsHistorySidebarOpen(!isHistorySidebarOpen),
    onToggleFeedback: () => setIsFeedbackModalOpen(!isFeedbackModalOpen),
    onHelp: () => setIsKeyboardShortcutsOpen(true),
    onFind: () => {
      // Focus on request input
      const requestInput = document.querySelector('textarea[placeholder*="Ask"]') as HTMLTextAreaElement;
      if (requestInput) {
        requestInput.focus();
      }
    },
  });

  useKeyboardShortcuts({ shortcuts });

  const handleSelectionChange = (range: string) => {
    setSelectedRange(range);
    
    // Update selection in AutoSelectionManager if it exists
    if (autoSelectionManager && isManualSelection) {
      autoSelectionManager.updateUserSelection(currentSheetIndex, range, true);
    }
    
    // Track range selection action
    if (currentSessionId) {
      SessionService.trackAction(ActionType.RANGE_SELECT, { 
        range, 
        isManual: isManualSelection,
        sheetIndex: currentSheetIndex 
      }, undefined, range);
    }
  };

  const handleCellClick = (cell: string) => {
    setActiveCell(cell);
    
    // Track cell selection action
    if (currentSessionId) {
      SessionService.trackAction(ActionType.CELL_SELECT, { 
        cell, 
        isManual: isManualSelection,
        sheetIndex: currentSheetIndex 
      }, cell);
    }
  };

  const handleSelectionTypeChange = (isManual: boolean) => {
    setIsManualSelection(isManual);
    
    // Track selection type change
    if (currentSessionId) {
      SessionService.trackAction(ActionType.RANGE_SELECT, { 
        selectionType: isManual ? 'manual' : 'automatic',
        sheetIndex: currentSheetIndex 
      });
    }
  };

  const handleContextAnalysis = async (request: string) => {
    if (!uploadResult?.spreadsheetId || !spreadsheetData) {
      setAnalysisError('No spreadsheet data available for analysis');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setContextResult(null);
    setCurrentRequest(request);

    try {
      // Determine the selection to use for analysis
      let analysisRange = selectedRange || '';
      
      // If no manual selection exists, use intelligent default selection
      if (!isManualSelection && autoSelectionManager) {
        const currentRange = autoSelectionManager.getCurrentRange(currentSheetIndex);
        if (currentRange && currentRange !== 'A1:J20') { // Don't use fallback range
          analysisRange = currentRange;
        }
      }

      const result = await ApiService.analyzeContext({
        request,
        spreadsheetId: uploadResult.spreadsheetId,
        currentSelection: {
          sheet: spreadsheetData.sheets[currentSheetIndex]?.name || 'Sheet1',
          range: analysisRange,
          activeCell: activeCell || '',
        },
        userContext: {
          sessionId: currentSessionId || '',
          recentActions: [],
          preferences: {},
          interactionHistory: []
        }
      });

      setContextResult(result);
      
      // Generate LLM response based on context
      setIsGeneratingResponse(true);
      setLlmError(null);
      setLlmResponse(null);
      
      try {
        const llmResult = await ApiService.generateLLMResponse({
          userRequest: request,
          contextAnalysis: result,
          responseType: 'general',
          includeCode: true,
          includeExamples: true
        });
        
        setLlmResponse(llmResult);
        console.log('LLM response generated:', llmResult);
      } catch (llmError) {
        console.error('LLM response error:', llmError);
        setLlmError(llmError instanceof Error ? llmError.message : 'Failed to generate response');
      } finally {
        setIsGeneratingResponse(false);
      }
      
      // Auto-open recommendations panel for new requests
      if (request.trim()) {
        setIsRecommendationsPanelOpen(true);
      }
      
      // Announce success to screen readers
      announceToScreenReader('Context analysis completed successfully');
    } catch (error) {
      console.error('Context analysis error:', error);
      
      // Handle API errors with proper structure
      if (error && typeof error === 'object' && 'response' in error) {
        const apiResponse = (error as any).response;
        if (apiResponse?.data?.error) {
          setAnalysisError(apiResponse.data.error);
        } else {
          setAnalysisError('Analysis failed: ' + (apiResponse?.statusText || 'Unknown error'));
        }
      } else if (error instanceof Error) {
        setAnalysisError(error.message);
      } else {
        setAnalysisError('An unexpected error occurred during analysis');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Fetch spreadsheet data when upload is successful
  useEffect(() => {
    const fetchSpreadsheetData = async () => {
      if (uploadResult?.success && uploadResult.spreadsheetId) {
        setIsLoadingData(true);
        try {
          const data = await ApiService.getSpreadsheetData(uploadResult.spreadsheetId);
          setSpreadsheetData(data);
          
          // Initialize AutoSelectionManager with the new data
          const manager = new AutoSelectionManager();
          manager.initialize(data);
          setAutoSelectionManager(manager);
          
          // Extract and apply recommended selection from API response
          let recommendedRange = data.recommendedSelection;
          
          // If no recommended selection from backend, calculate it using AutoSelectionManager
          if (!recommendedRange) {
            recommendedRange = manager.calculateDefaultSelection(0);
          }
          
          // Apply the default selection
          setDefaultSelection(recommendedRange);
          setSelectedRange(recommendedRange);
          setCurrentSheetIndex(0);
          setIsManualSelection(false);
          
          // Announce intelligent selection to screen readers
          announceToScreenReader(`Intelligent default selection applied: ${recommendedRange}`);
          
        } catch (error) {
          console.error('Failed to load spreadsheet data:', error);
          setUploadError('Failed to load spreadsheet data: ' + (error instanceof Error ? error.message : 'Unknown error'));
        } finally {
          setIsLoadingData(false);
        }
      }
    };

    fetchSpreadsheetData();
  }, [uploadResult]);

  const handleHistoryEntrySelect = (entry: ContextHistoryEntry) => {
    // You could restore the context or show details
    console.log('Selected history entry:', entry);
    setIsHistorySidebarOpen(false);
  };

  const handleSheetChange = (sheetIndex: number) => {
    if (!autoSelectionManager || !spreadsheetData) return;
    
    setCurrentSheetIndex(sheetIndex);
    
    // Get or calculate default selection for the new sheet
    let sheetDefaultSelection = autoSelectionManager.getCurrentRange(sheetIndex);
    
    // If no selection exists for this sheet, calculate it
    if (!sheetDefaultSelection || sheetDefaultSelection === 'A1:J20') {
      sheetDefaultSelection = autoSelectionManager.calculateDefaultSelection(sheetIndex);
      autoSelectionManager.applyDefaultSelection(sheetIndex);
    }
    
    // Apply the selection for the new sheet
    setSelectedRange(sheetDefaultSelection);
    setDefaultSelection(sheetDefaultSelection);
    setIsManualSelection(autoSelectionManager.isManualSelection(sheetIndex));
    
    // Reset active cell
    setActiveCell(null);
    
    // Track sheet change action
    if (currentSessionId) {
      SessionService.trackAction(ActionType.RANGE_SELECT, { 
        action: 'sheet_change',
        fromSheet: currentSheetIndex,
        toSheet: sheetIndex,
        newSelection: sheetDefaultSelection
      });
    }
  };

  const handleFeedbackSubmit = async (feedbackData: {
    satisfaction: number;
    feedback?: string;
    corrections?: Array<{
      field: string;
      expectedValue: any;
      actualValue: any;
      importance: 'low' | 'medium' | 'high';
    }>;
  }) => {
    if (!contextResult?.requestId || !contextResult?.contextHistoryId) {
      throw new Error('No context available for feedback');
    }

    try {
      const response = await fetch('/api/v1/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: contextResult.requestId,
          contextId: contextResult.contextHistoryId,
          satisfaction: feedbackData.satisfaction,
          feedback: feedbackData.feedback,
          corrections: feedbackData.corrections
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to submit feedback');
      }

      const result = await response.json();
      console.log('Feedback submitted successfully:', result);
      
      // Track feedback action in session
      if (currentSessionId) {
        SessionService.trackAction(ActionType.REQUEST_SUBMIT, {
          action: 'feedback_submitted',
          satisfaction: feedbackData.satisfaction,
          hasComments: !!feedbackData.feedback,
          hasCorrections: !!feedbackData.corrections?.length
        });
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className={`font-bold text-gray-900 ${isMobile ? 'text-xl' : 'text-3xl'}`}>
                Excel Context Engine
              </h1>
              <HelpTooltip content="Intelligent spreadsheet context analysis powered by AI" />
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              {!isMobile && (
                <div className="text-sm text-gray-500 hidden sm:block">
                  Intelligent spreadsheet context analysis
                </div>
              )}
              
              {/* Action buttons */}
              <div className="flex items-center space-x-2">
                <Tooltip content="Show keyboard shortcuts (F1)">
                  <button
                    onClick={() => setIsKeyboardShortcutsOpen(true)}
                    className="inline-flex items-center p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                    aria-label="Show keyboard shortcuts"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                    </svg>
                  </button>
                </Tooltip>

                {spreadsheetData && (
                  <Tooltip content="Toggle data visualization">
                    <button
                      onClick={() => setShowDataVisualization(!showDataVisualization)}
                      className={`inline-flex items-center p-2 transition-colors duration-200 ${
                        showDataVisualization 
                          ? 'text-blue-600 hover:text-blue-700' 
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                      aria-label="Toggle data visualization"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </button>
                  </Tooltip>
                )}

                {currentSessionId && (
                  <Tooltip content="View history (Ctrl+Shift+H)">
                    <button
                      onClick={() => setIsHistorySidebarOpen(true)}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {!isMobile && 'History'}
                    </button>
                  </Tooltip>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {!uploadResult?.success ? (
            /* File Upload Section */
            <div className="animate-fade-in">
              {isUploading ? (
                <FileUploadSkeleton />
              ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      Upload Your Spreadsheet
                    </h2>
                    <p className="text-gray-600">
                      Upload an Excel or CSV file to get started with intelligent context analysis.
                    </p>
                  </div>
                  
                  <FileUpload
                    onFileUpload={handleFileUpload}
                    acceptedFormats={['.xlsx', '.xls', '.csv']}
                    maxFileSize={10 * 1024 * 1024} // 10MB
                    isUploading={isUploading}
                  />

                  {(uploadResult && !uploadResult.success) || uploadError ? (
                    <div className="mt-4 animate-slide-in-up">
                      <ErrorDisplay
                        error={uploadError || uploadResult?.error || uploadResult?.message || 'Upload failed'}
                        title="Upload Failed"
                        onRetry={() => {
                          setUploadError(null);
                          setUploadResult(null);
                        }}
                        showDetails={import.meta.env.DEV}
                      />
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ) : (
            /* Success State */
            <div className="space-y-6 animate-fade-in">
              {/* Success Message */}
              <div className="bg-green-50 border border-green-200 rounded-md p-4 animate-slide-in-down">
                <div className="flex">
                  <svg
                    className="w-5 h-5 text-green-400 mr-2 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-green-800">
                      File Uploaded Successfully
                    </h3>
                    <p className="text-sm text-green-700 mt-1">
                      {uploadedFile?.name} has been processed and is ready for analysis.
                    </p>
                  </div>
                </div>
              </div>

              {/* Spreadsheet Viewer */}
              {isLoadingData ? (
                <SpreadsheetSkeleton />
              ) : spreadsheetData ? (
                <div className="space-y-4">
                  {/* File Info */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 animate-slide-in-up">
                    <div className={`flex items-center ${isMobile ? 'flex-col space-y-3' : 'justify-between'}`}>
                      <div className={isMobile ? 'text-center' : ''}>
                        <h3 className="text-lg font-medium text-gray-900">
                          {spreadsheetData.metadata.filename}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {spreadsheetData.sheets.length} sheet{spreadsheetData.sheets.length !== 1 ? 's' : ''} • 
                          {' '}{(spreadsheetData.metadata.fileSize / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <Tooltip content="Upload a new spreadsheet file (Ctrl+N)">
                        <button
                          onClick={handleNewUpload}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                        >
                          Upload New File
                        </button>
                      </Tooltip>
                    </div>
                  </div>

                  {/* Data Visualization */}
                  {showDataVisualization && (
                    <div className="animate-slide-in-up">
                      <DataVisualization
                        data={spreadsheetData}
                        selectedRange={selectedRange || ''}
                        className="mb-4"
                      />
                    </div>
                  )}

                  {/* Spreadsheet Viewer */}
                  <div className="animate-slide-in-up">
                    <SpreadsheetViewer
                      data={spreadsheetData}
                      selectedRange={selectedRange}
                      onSelectionChange={handleSelectionChange}
                      onCellClick={handleCellClick}
                      defaultSelection={defaultSelection}
                      onSelectionTypeChange={handleSelectionTypeChange}
                      onSheetChange={handleSheetChange}
                    />
                  </div>

                  {/* Request Input */}
                  <div className="animate-slide-in-up">
                    <RequestInput
                      onSubmit={handleContextAnalysis}
                      isProcessing={isAnalyzing}
                      placeholder="Ask me anything about your spreadsheet..."
                      maxLength={1000}
                    />
                  </div>

                  {/* Recommendations Panel */}
                  {currentRequest && (
                    <div className="animate-slide-in-up">
                      <RecommendationsPanel
                        request={currentRequest}
                        intent={contextResult?.requestAnalysis?.intent || 'general'}
                        contextType="general"
                        isVisible={isRecommendationsPanelOpen}
                        onToggle={() => setIsRecommendationsPanelOpen(!isRecommendationsPanelOpen)}
                      />
                    </div>
                  )}

                  {/* Context Analysis Results */}
                  {(contextResult || analysisError || isAnalyzing) && (
                    <div className="animate-slide-in-up">
                      {isAnalyzing ? (
                        <ContextAnalysisSkeleton />
                      ) : (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                          <div className={`flex items-center ${isMobile ? 'flex-col space-y-3' : 'justify-between'} mb-4`}>
                            <h3 className="text-lg font-medium text-gray-900">
                              Context Analysis Results
                            </h3>
                            {contextResult && (
                              <Tooltip content="Provide feedback on the analysis (Ctrl+Shift+F)">
                                <button
                                  onClick={() => setIsFeedbackModalOpen(true)}
                                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                                >
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10m0 0V6a2 2 0 00-2-2H9a2 2 0 00-2 2v2m0 0v10a2 2 0 002 2h10a2 2 0 002-2V8M9 12h6m-6 4h6" />
                                  </svg>
                                  Provide Feedback
                                </button>
                              </Tooltip>
                            )}
                          </div>

                          {analysisError && (
                            <div className="mb-4 animate-slide-in-up">
                              <ErrorDisplay
                                error={analysisError}
                                title="Analysis Failed"
                                onRetry={() => setAnalysisError(null)}
                                onDismiss={() => setAnalysisError(null)}
                                showDetails={import.meta.env.DEV}
                              />
                            </div>
                          )}

                          {contextResult && (
                            <div className="space-y-6">
                              {/* Natural Language Description */}
                              <div className="bg-blue-50 rounded-md p-4 animate-fade-in">
                                <h4 className="text-sm font-medium text-blue-800 mb-2">
                                  Context Summary
                                </h4>
                                <p className="text-sm text-blue-700">
                                  {contextResult.naturalLanguageDescription}
                                </p>
                              </div>

                              {/* Request Analysis */}
                              <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : isTablet ? 'grid-cols-2' : 'grid-cols-3'}`}>
                                <div className="bg-gray-50 rounded-md p-4 animate-scale-in">
                                  <h4 className="text-sm font-medium text-gray-800 mb-2">
                                    Intent
                                  </h4>
                                  <p className="text-sm text-gray-600 capitalize">
                                    {contextResult.requestAnalysis.intent.replace(/_/g, ' ')}
                                  </p>
                                </div>
                                <div className="bg-gray-50 rounded-md p-4 animate-scale-in" style={{ animationDelay: '0.1s' }}>
                                  <h4 className="text-sm font-medium text-gray-800 mb-2">
                                    Scope
                                  </h4>
                                  <p className="text-sm text-gray-600 capitalize">
                                    {contextResult.requestAnalysis.scope.replace(/_/g, ' ')}
                                  </p>
                                </div>
                                <div className={`bg-gray-50 rounded-md p-4 animate-scale-in ${isMobile || isTablet ? 'col-span-full' : ''}`} style={{ animationDelay: '0.2s' }}>
                                  <h4 className="text-sm font-medium text-gray-800 mb-2">
                                    Confidence
                                  </h4>
                                  <div className="flex items-center">
                                    <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                                      <div
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-1000 ease-out"
                                        style={{ width: `${contextResult.requestAnalysis.confidence * 100}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-sm text-gray-600">
                                      {Math.round(contextResult.requestAnalysis.confidence * 100)}%
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Current Selection Info */}
                              <div className="bg-gray-50 rounded-md p-4 animate-fade-in">
                                <h4 className="text-sm font-medium text-gray-800 mb-2">
                                  Current Selection
                                </h4>
                                <div className="text-sm text-gray-600 space-y-1">
                                  <p><strong>Range:</strong> {selectedRange || 'None'}</p>
                                  <p><strong>Active Cell:</strong> {activeCell || 'None'}</p>
                                  <p><strong>Data Types:</strong> {contextResult.spreadsheetContext.currentSelection.dataTypes.join(', ')}</p>
                                  <p><strong>Row Count:</strong> {contextResult.spreadsheetContext.dataSummary.rowCount}</p>
                                </div>
                              </div>

                              {/* Actionable Information */}
                              {contextResult.actionableInfo.suggestedOperations.length > 0 && (
                                <div className="bg-green-50 rounded-md p-4 animate-fade-in">
                                  <h4 className="text-sm font-medium text-green-800 mb-2">
                                    Suggested Actions
                                  </h4>
                                  <div className="text-sm text-green-700">
                                    <p className="mb-2"><strong>Operations:</strong></p>
                                    <ul className="list-disc list-inside space-y-1">
                                      {contextResult.actionableInfo.suggestedOperations.map((operation, index) => (
                                        <li key={index}>{operation}</li>
                                      ))}
                                    </ul>
                                    {contextResult.actionableInfo.targetCells.length > 0 && (
                                      <p className="mt-2">
                                        <strong>Target Cells:</strong> {contextResult.actionableInfo.targetCells.join(', ')}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Data Patterns */}
                              {contextResult.spreadsheetContext.dataSummary.patterns.length > 0 && (
                                <div className="bg-yellow-50 rounded-md p-4 animate-fade-in">
                                  <h4 className="text-sm font-medium text-yellow-800 mb-2">
                                    Data Patterns
                                  </h4>
                                  <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                                    {contextResult.spreadsheetContext.dataSummary.patterns.map((pattern, index) => (
                                      <li key={index} className="capitalize">
                                        {pattern.replace(/_/g, ' ')}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}

                          {/* LLM Response Section */}
                          {(llmResponse || isGeneratingResponse || llmError) && (
                            <div className="animate-slide-in-up">
                              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
                                <div className={`flex items-center ${isMobile ? 'flex-col space-y-3' : 'justify-between'} mb-4`}>
                                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                                    <svg className="w-5 h-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                    </svg>
                                    AI Assistant Response
                                  </h3>
                                </div>

                                {isGeneratingResponse && (
                                  <div className="flex items-center justify-center py-8">
                                    <div className="flex items-center space-x-3">
                                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                                      <span className="text-gray-600">Generating intelligent response...</span>
                                    </div>
                                  </div>
                                )}

                                {llmError && (
                                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                                    <div className="flex">
                                      <svg className="w-5 h-5 text-red-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      <div>
                                        <h4 className="text-sm font-medium text-red-800">
                                          Response Generation Failed
                                        </h4>
                                        <p className="text-sm text-red-700 mt-1">
                                          {llmError}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {llmResponse && (
                                  <div className="space-y-4">
                                    {/* Main Response */}
                                    <div className="bg-purple-50 rounded-md p-4">
                                      <div className="prose prose-sm max-w-none">
                                        <div className="whitespace-pre-wrap text-gray-800">
                                          {llmResponse.response}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Code Examples */}
                                    {llmResponse.codeExamples && llmResponse.codeExamples.length > 0 && (
                                      <div className="space-y-3">
                                        <h4 className="text-sm font-medium text-gray-800">Code Examples:</h4>
                                        {llmResponse.codeExamples.map((example: any, index: number) => (
                                          <div key={index} className="bg-gray-900 rounded-md p-4">
                                            <div className="flex items-center justify-between mb-2">
                                              <span className="text-xs text-gray-400 uppercase tracking-wide">
                                                {example.language || 'Excel'}
                                              </span>
                                              <button
                                                onClick={() => navigator.clipboard.writeText(example.code)}
                                                className="text-xs text-gray-400 hover:text-white transition-colors"
                                              >
                                                Copy
                                              </button>
                                            </div>
                                            <pre className="text-sm text-green-400 overflow-x-auto">
                                              <code>{example.code}</code>
                                            </pre>
                                            {example.description && (
                                              <p className="text-xs text-gray-400 mt-2">{example.description}</p>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {/* Follow-up Questions */}
                                    {llmResponse.followUpQuestions && llmResponse.followUpQuestions.length > 0 && (
                                      <div className="bg-blue-50 rounded-md p-4">
                                        <h4 className="text-sm font-medium text-blue-800 mb-2">
                                          Follow-up Questions:
                                        </h4>
                                        <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                                          {llmResponse.followUpQuestions.map((question: string, index: number) => (
                                            <li key={index} className="cursor-pointer hover:text-blue-800 transition-colors"
                                                onClick={() => {
                                                  const requestInput = document.querySelector('textarea[placeholder*="Ask"]') as HTMLTextAreaElement;
                                                  if (requestInput) {
                                                    requestInput.value = question;
                                                    requestInput.focus();
                                                  }
                                                }}>
                                              {question}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    {/* Response Metadata */}
                                    <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                                      <span>Response Type: {llmResponse.responseType}</span>
                                      <span>Confidence: {Math.round(llmResponse.confidence * 100)}%</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-center py-12">
                    <svg
                      className="w-12 h-12 text-red-400 mx-auto mb-4"
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
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Failed to Load Spreadsheet
                    </h3>
                    <p className="text-gray-600 mb-4">
                      There was an error loading your spreadsheet data.
                    </p>
                    <button
                      onClick={handleNewUpload}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Try Another File
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* History Sidebar */}
      <HistorySidebar
        isOpen={isHistorySidebarOpen}
        onClose={() => setIsHistorySidebarOpen(false)}
        onSelectHistoryEntry={handleHistoryEntrySelect}
        currentSessionId={currentSessionId || ''}
      />

      {/* Feedback Modal */}
      {contextResult && (
        <FeedbackModal
          isOpen={isFeedbackModalOpen}
          onClose={() => setIsFeedbackModalOpen(false)}
          onSubmit={handleFeedbackSubmit}
          requestId={contextResult.requestId}
          contextId={contextResult.contextHistoryId || ''}
          contextPreview={contextResult.naturalLanguageDescription}
        />
      )}

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={isKeyboardShortcutsOpen}
        onClose={() => setIsKeyboardShortcutsOpen(false)}
        shortcuts={shortcuts}
      />
      </div>
    </ErrorBoundary>
  );
}

export default App;
