/**
 * Context Analysis Route with Intelligent Context Analyzer
 * This route provides sophisticated context analysis for Excel spreadsheets
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { IntelligentContextAnalyzer } from '../services/IntelligentContextAnalyzer';
import { OpenAIService } from '../services/OpenAIService';
import { SpreadsheetParser } from '../services/SpreadsheetParser';
import { 
  AnalyzeContextRequest, 
  AnalyzeContextResponse, 
  ContextAnalysisResult 
} from '../types/api';
import { 
  SpreadsheetData
} from '../types/spreadsheet';
import { IntentType } from '../types/context';

const router = Router();

/**
 * Main context analysis endpoint with intelligent processing
 */
router.post('/analyze-context', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const requestId = uuidv4();
  
  console.log(`[${requestId}] Starting context analysis with intelligent processing`);
  
  try {
    // Extract and validate request parameters
    const {
      request,
      spreadsheetId,
      currentSelection
    }: AnalyzeContextRequest = req.body;

    // Validate required fields
    if (!request?.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Request parameter is required and cannot be empty'
        },
        requestId,
        processingTime: Date.now() - startTime
      });
    }

    if (!currentSelection?.range) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SELECTION',
          message: 'Current selection with valid range is required'
        },
        requestId,
        processingTime: Date.now() - startTime
      });
    }

    // Get spreadsheet data from app locals or request
    let spreadsheetData: SpreadsheetData;
    
    if (req.file) {
      // Handle file upload case
      console.log(`[${requestId}] Processing uploaded file: ${req.file.originalname}`);
      spreadsheetData = await SpreadsheetParser.parseFile(
        req.file.buffer, 
        req.file.originalname,
        req.file.mimetype,
        {
          includeFormulas: true,
          includeDependencies: true
        }
      );
    } else if (spreadsheetId && req.app.locals['spreadsheetData']) {
      // Handle existing spreadsheet case
      console.log(`[${requestId}] Using existing spreadsheet data for ID: ${spreadsheetId}`);
      spreadsheetData = req.app.locals['spreadsheetData'];
    } else {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_SPREADSHEET_DATA',
          message: 'No spreadsheet data available. Please upload a file or provide a valid spreadsheet ID.'
        },
        requestId,
        processingTime: Date.now() - startTime
      });
    }

    console.log(`[${requestId}] Spreadsheet data loaded:`, {
      sheets: spreadsheetData.sheets.length,
      currentSelection: currentSelection.range
    });

    try {
      // Step 1: Extract basic context first
      const { ImprovedContextExtractor } = await import('../services/ImprovedContextExtractor');
      console.log(`[${requestId}] Extracting basic context with ImprovedContextExtractor`);
      
      const contextData = ImprovedContextExtractor.extractRealContext(
        spreadsheetData,
        currentSelection
      );
      
      console.log(`[${requestId}] Basic context extraction completed`);
      
      // Step 2: Perform intelligent analysis
      console.log(`[${requestId}] Starting intelligent analysis...`);
      const openAIService = req.app.locals['openAIService'] as OpenAIService;
      
      if (!openAIService) {
        throw new Error('OpenAI service not available');
      }
      
      const intelligentAnalyzer = new IntelligentContextAnalyzer(openAIService);
      const intelligentAnalysis = await intelligentAnalyzer.analyzeContext(
        contextData,
        request,
        currentSelection,
        spreadsheetData
      );
      
      console.log(`[${requestId}] Intelligent analysis completed:`, {
        dataType: intelligentAnalysis.semantics.dataType,
        userIntent: intelligentAnalysis.userIntent.primary,
        confidence: intelligentAnalysis.confidence,
        actionsGenerated: intelligentAnalysis.suggestedActions.length,
        processingTime: intelligentAnalysis.processingTime
      });
      
      // Step 3: Create comprehensive response using intelligent analysis
      const result: ContextAnalysisResult = {
        requestAnalysis: {
          intent: IntentType.DATA_ANALYSIS,
          scope: 'current_selection',
          confidence: intelligentAnalysis.userIntent.confidence,
          keywords: intelligentAnalysis.userIntent.entities.map(e => e.text),
          clarificationNeeded: false,
          suggestedQuestions: []
        },
        
        context: contextData,
        
        naturalLanguageDescription: intelligentAnalysis.contextualResponse,
        
        actionableInfo: {
          targetCells: [currentSelection.range],
          suggestedOperations: intelligentAnalysis.suggestedActions.map(action => 
            action.excelFormula ? `${action.description}: ${action.excelFormula}` : action.description
          ).slice(0, 5),
          constraints: [
            `Data type: ${intelligentAnalysis.semantics.dataType}`,
            `Confidence: ${(intelligentAnalysis.confidence * 100).toFixed(1)}%`,
            `Analysis scope: ${intelligentAnalysis.userIntent.scope}`
          ],
          expectedOutcome: intelligentAnalysis.suggestedActions[0]?.expectedResult || 'Analyzed data insights',
          riskLevel: intelligentAnalysis.confidence > 0.8 ? 'low' : 
                    intelligentAnalysis.confidence > 0.6 ? 'medium' : 'high'
        },
        
        suggestions: [
          ...intelligentAnalysis.suggestedActions.map(action => action.description).slice(0, 3),
          `This appears to be ${intelligentAnalysis.semantics.dataType} data`,
          `Key entities identified: ${intelligentAnalysis.semantics.keyEntities.join(', ')}`
        ],
        
        confidence: intelligentAnalysis.confidence,
        
        formattedContext: {
          context: `
Data Analysis Context:
- Data Type: ${intelligentAnalysis.semantics.dataType}
- Key Entities: ${intelligentAnalysis.semantics.keyEntities.join(', ')}
- Selected Range: ${currentSelection.range}
- User Intent: ${intelligentAnalysis.userIntent.primary}
- Confidence: ${(intelligentAnalysis.confidence * 100).toFixed(1)}%

Context Data: ${JSON.stringify(contextData, null, 2)}

Intelligent Analysis:
${intelligentAnalysis.contextualResponse}

Agent Instructions:
${intelligentAnalysis.agentPrompt.systemContext}
${intelligentAnalysis.agentPrompt.userContext}
${intelligentAnalysis.agentPrompt.dataContext}
${intelligentAnalysis.agentPrompt.taskInstructions}
${intelligentAnalysis.agentPrompt.excelFormulasAndMethods}
`,
          instructions: `
You are working with ${intelligentAnalysis.semantics.dataType} data. 

Task: ${request}
Target Range: ${currentSelection.range}

Please provide:
1. Specific Excel formulas that solve the user's request
2. Step-by-step instructions
3. Contextual insights about the data

Available Excel Methods:
${intelligentAnalysis.agentPrompt.excelFormulasAndMethods}

Task Instructions:
${intelligentAnalysis.agentPrompt.taskInstructions}
`,
          constraints: [
            ...intelligentAnalysis.agentPrompt.constraintsAndGuidelines.split('\n').filter(c => c.trim()),
            `Data type: ${intelligentAnalysis.semantics.dataType}`,
            `Confidence level: ${(intelligentAnalysis.confidence * 100).toFixed(1)}%`,
            `Selected range: ${currentSelection.range}`
          ],
          examples: intelligentAnalysis.suggestedActions
            .filter(action => action.excelFormula)
            .map(action => `${action.description}: ${action.excelFormula}`)
            .slice(0, 3),
          expectedFormat: 'Excel formulas with step-by-step instructions and contextual insights'
        }
      };
      
      // Cache the result if caching is available
      const cacheService = req.app.locals['cacheService'];
      if (cacheService?.isAvailable() && !req.file) {
        try {
          const cacheKey = `context_${spreadsheetId}_${Buffer.from(request).toString('base64').slice(0, 20)}`;
          await cacheService.set(cacheKey, result, { ttl: 300 }); // Cache for 5 minutes
        } catch (cacheError) {
          console.warn(`[${requestId}] Cache operation failed:`, cacheError);
        }
      }
      
      const response: AnalyzeContextResponse = {
        success: true,
        data: result,
        requestId,
        processingTime: Date.now() - startTime
      };
      
      console.log(`[${requestId}] Analysis completed successfully in ${response.processingTime}ms`);
      return res.status(200).json(response);
      
    } catch (error) {
      console.error(`[${requestId}] Error in intelligent context analysis:`, error);
      
      // Fallback to basic analysis if intelligent analysis fails
      console.log(`[${requestId}] Falling back to basic context analysis`);
      
      try {
        const { ImprovedContextExtractor } = await import('../services/ImprovedContextExtractor');
        const contextData = ImprovedContextExtractor.extractRealContext(
          spreadsheetData,
          currentSelection
        );
        
        // Create basic result structure
        const fallbackResult: ContextAnalysisResult = {
          requestAnalysis: {
            intent: IntentType.GENERAL_ASSISTANCE,
            scope: 'current_selection',
            confidence: 0.7,
            keywords: [request],
            clarificationNeeded: false,
            suggestedQuestions: []
          },
          
          context: contextData,
          
          naturalLanguageDescription: `I understand you're asking about "${request}" for the selected range ${currentSelection.range}. While I'm experiencing some technical difficulties with my advanced analysis capabilities, I can see you've selected data in your spreadsheet. For the best results, please try being more specific about what you'd like to know about this data, or select a smaller range if you're working with a large dataset.`,
          
          actionableInfo: {
            targetCells: [currentSelection.range],
            suggestedOperations: [
              'Try a more specific query',
              'Select a smaller data range', 
              'Check data formatting',
              'Use built-in Excel functions for analysis'
            ],
            constraints: ['Basic analysis mode', 'Limited context understanding'],
            expectedOutcome: 'Basic data insights',
            riskLevel: 'medium' as const
          },
          
          suggestions: [
            'Try a more specific query about your data',
            'Select a smaller range if working with large datasets',
            'Use descriptive column headers for better analysis',
            'Check if your data is properly formatted'
          ],
          
          confidence: 0.7
        };
        
        const response: AnalyzeContextResponse = {
          success: true,
          data: fallbackResult,
          requestId,
          processingTime: Date.now() - startTime
        };
        
        console.log(`[${requestId}] Fallback analysis completed in ${response.processingTime}ms`);
        return res.status(200).json(response);
        
      } catch (fallbackError) {
        console.error(`[${requestId}] Fallback analysis also failed:`, fallbackError);
        throw error; // Let the main error handler deal with it
      }
    }
    
  } catch (error) {
    // General error handling
    console.error(`[${requestId}] Error in analyze-context route:`, error);
    
    let errorMessage = 'Failed to analyze context';
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      if (error.message.includes('Invalid selection')) {
        statusCode = 400;
      } else if (error.message.includes('File not found')) {
        statusCode = 404;
      } else if (error.message.includes('Unauthorized')) {
        statusCode = 401;
      }
    }
    
    const response: AnalyzeContextResponse = {
      success: false,
      error: {
        code: statusCode.toString(),
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined,
        timestamp: new Date().toISOString()
      },
      requestId,
      processingTime: Date.now() - startTime
    };
    
    return res.status(statusCode).json(response);
  }
});

export default router;
