import * as express from 'express';
import { RequestAnalyzer } from '../services/RequestAnalyzer';
import { ContextExtractor } from '../services/ContextExtractor';
import { ContextFormatter } from '../services/ContextFormatter';
import { PatternAnalyzer } from '../services/PatternAnalyzer';
import { OpenAIService } from '../services/OpenAIService';
import { spreadsheetStorage } from './upload';
import { asyncErrorHandler, validateRequest, contextRateLimit } from '../middleware';
import { ApiError, ErrorCode, AnalyzeContextRequest, AnalyzeContextResponse } from '../types/api';
import { IntentType } from '../types/context';
import { DataType } from '../types/spreadsheet';
import { z } from 'zod';

const router = express.Router();

// Validation schema for context analysis requests
const contextAnalysisSchema = z.object({
  request: z.string().min(1, 'Request is required').max(1000, 'Request too long'),
  spreadsheetId: z.string().regex(/^sheet_\d+_[a-z0-9]+$/, 'Invalid spreadsheet ID format'),
  currentSelection: z.object({
    sheet: z.string().min(1, 'Sheet name is required'),
    range: z.string().min(1, 'Range is required'),
    activeCell: z.string().min(1, 'Active cell is required'),
    visibleRange: z.string().optional()
  }),
  userContext: z.object({
    sessionId: z.string().optional(),
    recentActions: z.array(z.any()).optional(),
    preferences: z.object({
      analysisDepth: z.enum(['basic', 'detailed', 'comprehensive']).optional(),
      includePatterns: z.boolean().optional(),
      includeInsights: z.boolean().optional()
    }).optional()
  }).optional()
});

/**
 * POST /api/v1/analyze-context
 * Main context analysis endpoint
 */
router.post('/analyze-context',
  contextRateLimit, // Apply context-specific rate limiting
  validateRequest(contextAnalysisSchema),
  asyncErrorHandler(async (req, res) => {
    const startTime = Date.now();
    const requestId = `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      console.log('Starting context analysis for request:', req.body.request);

      const requestData: AnalyzeContextRequest = req.body;

      // Step 1: Validate and retrieve spreadsheet data
      const spreadsheetData = spreadsheetStorage.get(requestData.spreadsheetId);
      if (!spreadsheetData) {
        const error: ApiError = {
          code: ErrorCode.SPREADSHEET_NOT_FOUND,
          message: 'Spreadsheet not found or has expired',
          details: { spreadsheetId: requestData.spreadsheetId },
          suggestions: [
            'Check if the spreadsheet ID is correct',
            'Upload the file again if it has expired',
            'Ensure you are using the correct endpoint'
          ],
          timestamp: new Date().toISOString()
        };

        return res.status(404).json({
          success: false,
          error,
          requestId,
          processingTime: Date.now() - startTime
        });
      }

      // Step 2: Initialize services
      const openAIService = req.app.locals['openAIService'] as OpenAIService | undefined;
      const requestAnalyzer = new RequestAnalyzer(openAIService);
      const contextExtractor = new ContextExtractor();
      const contextFormatter = new ContextFormatter(openAIService);
      const patternAnalyzer = new PatternAnalyzer(openAIService);

      // Step 3: Analyze the user request
      console.log('Analyzing user request intent and scope');
      // TODO: Implement analyzeRequest method
      const requestAnalysis = {
        intent: 'data_analysis' as IntentType,
        scope: 'selection',
        confidence: 0.8,
        keywords: ['analysis', 'data']
      };
      // const requestAnalysis = await requestAnalyzer.analyzeRequest(
      //   requestData.request,
      //   {
      //     spreadsheetData,
      //     currentSelection: requestData.currentSelection,
      //     userContext: requestData.userContext
      //   }
      // );

      // Step 4: Extract relevant context
      console.log('Extracting relevant context from spreadsheet');
      // TODO: Implement extractContext method
      const contextData = {
        immediate: {
          selectedData: [],
          activeCell: { value: '', dataType: DataType.TEXT, address: 'A1' },
          visibleData: [],
          currentFormulas: [],
          selectionInfo: { sheet: 'Sheet1', range: 'A1', activeCell: 'A1' }
        },
        related: {
          dependentCells: [],
          precedentCells: [],
          relatedFormulas: [],
          namedRanges: [],
          crossSheetReferences: []
        },
        structural: {
          headers: [],
          dataTypes: [],
          columnCount: 0,
          rowCount: 0,
          hasFormulas: false,
          hasNamedRanges: false,
          sheetStructure: {
            hasHeaders: false,
            dataStartRow: 1,
            dataEndRow: 1,
            dataColumns: []
          }
        },
        historical: {
          recentActions: [],
          previousRequests: [],
          sessionDuration: 0,
          interactionCount: 0
        },
        patterns: {
          dataPatterns: [],
          relationships: [],
          anomalies: [],
          insights: [],
          confidence: 0
        },
        summary: {
          rowCount: 0,
          columnCount: 0,
          cellCount: 0,
          formulaCount: 0,
          emptyCount: 0,
          dataTypes: {},
          patterns: []
        },
        confidence: 0.8,
        generatedAt: new Date()
      };
      // const contextData = await contextExtractor.extractContext(
      //   requestAnalysis,
      //   spreadsheetData,
      //   requestData.currentSelection,
      //   requestData.userContext
      // );

      // Step 5: Analyze patterns (if enabled and AI available)
      let patternInsights;
      const includePatterns = true; // TODO: Add includePatterns to UserPreferences type
      // const includePatterns = requestData.userContext?.preferences?.includePatterns !== false;
      
      if (includePatterns && openAIService) {
        console.log('Analyzing data patterns with AI');
        try {
          patternInsights = await patternAnalyzer.analyzePatterns(contextData);
        } catch (error) {
          console.warn('Pattern analysis failed, continuing without patterns:', error);
          patternInsights = {
            patterns: [],
            relationships: [],
            anomalies: [],
            insights: [],
            confidence: 0
          };
        }
      }

      // Step 6: Format context for LLM consumption
      console.log('Formatting context for optimal LLM processing');
      // TODO: Implement formatContext method
      const formattedContext = {
        summary: 'Context formatted for LLM',
        data: contextData
      };
      // const formattedContext = await contextFormatter.formatContext(
      //   contextData,
      //   requestAnalysis,
      //   patternInsights
      // );

      // Step 7: Generate natural language description
      // TODO: Implement generateNaturalLanguageDescription method
      const naturalLanguageDescription = 'Natural language description of the context';
      // const naturalLanguageDescription = await contextFormatter.generateNaturalLanguageDescription(
      //   contextData,
      //   requestAnalysis,
      //   requestData.request
      // );

      // Step 8: Create actionable information
      // TODO: Implement generateActionableInfo method
      const actionableInfo = {
        targetCells: ['A1'],
        suggestedOperations: ['Analyze data', 'Create chart'],
        constraints: ['Data must be numeric'],
        riskLevel: 'low' as const
      };
      // const actionableInfo = contextFormatter.generateActionableInfo(
      //   contextData,
      //   requestAnalysis,
      //   requestData.currentSelection
      // );

      const processingTime = Date.now() - startTime;

      const response: AnalyzeContextResponse = {
        success: true,
        data: {
          requestAnalysis,
          context: contextData,
          naturalLanguageDescription,
          actionableInfo,
          suggestions: generateSuggestions(requestAnalysis, contextData),
          confidence: calculateOverallConfidence(requestAnalysis, contextData, patternInsights)
        },
        requestId,
        processingTime
      };

      console.log('Context analysis completed successfully');
      return res.status(200).json(response);

    } catch (error) {
      console.error('Context analysis error:', error);

      let apiError: ApiError;

      if (error.message?.includes('rate limit')) {
        apiError = {
          code: ErrorCode.RATE_LIMIT_EXCEEDED,
          message: 'Rate limit exceeded for context analysis',
          details: { error: error.message },
          suggestions: [
            'Wait a moment before trying again',
            'Consider simplifying your request'
          ],
          timestamp: new Date().toISOString()
        };
      } else if (error.message?.includes('OpenAI')) {
        apiError = {
          code: ErrorCode.AI_SERVICE_UNAVAILABLE,
          message: 'AI service temporarily unavailable',
          details: { error: error.message },
          suggestions: [
            'The system will use rule-based analysis',
            'Try again in a moment for enhanced AI features'
          ],
          timestamp: new Date().toISOString()
        };
      } else {
        apiError = {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to analyze context',
          details: { error: error.message },
          suggestions: [
            'Check if your spreadsheet data is valid',
            'Try with a simpler request',
            'Contact support if the problem persists'
          ],
          timestamp: new Date().toISOString()
        };
      }

      return res.status(500).json({
        success: false,
        error: apiError,
        requestId,
        processingTime: Date.now() - startTime
      });
    }
  })
);

/**
 * Generate helpful suggestions based on request analysis and context
 */
function generateSuggestions(requestAnalysis: any, contextData: any): string[] {
  const suggestions: string[] = [];

  // Intent-based suggestions
  switch (requestAnalysis.intent) {
    case 'formula_assistance':
      suggestions.push('Consider using built-in Excel functions for calculations');
      if (contextData.immediate?.selectedData?.some((row: any[]) => 
        row.some(cell => typeof cell === 'number'))) {
        suggestions.push('SUM, AVERAGE, or COUNT functions might be helpful for numeric data');
      }
      break;

    case 'data_analysis':
      suggestions.push('Use pivot tables for complex data analysis');
      suggestions.push('Consider creating charts to visualize trends');
      break;

    case 'formatting':
      suggestions.push('Use conditional formatting to highlight important data');
      suggestions.push('Consider using cell styles for consistent formatting');
      break;

    case 'troubleshooting':
      suggestions.push('Check for circular references in formulas');
      suggestions.push('Verify data types are consistent');
      break;
  }

  // Data-based suggestions
  if (contextData.structural?.hasFormulas) {
    suggestions.push('Review formula dependencies before making changes');
  }

  if (contextData.structural?.dataTypes?.includes('date')) {
    suggestions.push('Use DATE functions for date calculations');
  }

  return suggestions.slice(0, 5); // Limit to 5 suggestions
}

/**
 * Calculate overall confidence score
 */
function calculateOverallConfidence(
  requestAnalysis: any, 
  contextData: any, 
  patternInsights?: any
): number {
  let confidence = requestAnalysis.confidence || 0.5;

  // Boost confidence if we have good context data
  if (contextData.immediate?.selectedData?.length > 0) {
    confidence += 0.1;
  }

  if (contextData.related?.dependentCells?.length > 0) {
    confidence += 0.1;
  }

  // Boost confidence if AI pattern analysis was successful
  if (patternInsights && patternInsights.confidence > 0.7) {
    confidence += 0.1;
  }

  // Ensure confidence is between 0 and 1
  return Math.min(1, Math.max(0, confidence));
}

export default router;