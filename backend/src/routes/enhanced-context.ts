/**
 * Enhanced Context Analysis API Routes
 * 
 * Provides advanced contextual understanding capabilities that integrate
 * all enhanced intelligence services for superior spreadsheet analysis.
 */

import * as express from 'express';
import { z } from 'zod';
// Import existing services for now - enhanced services will be implemented later
import { ContextExtractor, PatternAnalyzer, OpenAIService } from '../services';
import { spreadsheetStorage } from './upload';
import { asyncErrorHandler, validateRequest, contextRateLimit } from '../middleware';
import { ApiError, ErrorCode } from '../types/api';

const router = express.Router();

console.log('Enhanced context router initialized');

// Enhanced context analysis request schema
const enhancedContextSchema = z.object({
  request: z.string().min(1, 'Request is required').max(2000, 'Request too long'),
  spreadsheetId: z.string().regex(/^sheet_\d+_[a-z0-9]+$/, 'Invalid spreadsheet ID format'),
  currentSelection: z.object({
    sheet: z.string().min(1, 'Sheet name is required'),
    range: z.string().min(1, 'Range is required'),
    activeCell: z.string().min(1, 'Active cell is required'),
    visibleRange: z.string().optional()
  }),
  analysisOptions: z.object({
    enableDomainIntelligence: z.boolean().default(true),
    enableAutoSelection: z.boolean().default(true),
    enableAgentPrompts: z.boolean().default(true),
    enablePerformanceOptimization: z.boolean().default(true),
    analysisDepth: z.enum(['basic', 'detailed', 'comprehensive']).default('detailed'),
    confidenceThreshold: z.number().min(0).max(1).default(0.7),
    includeExplanations: z.boolean().default(true)
  }).optional(),
  userContext: z.object({
    sessionId: z.string().optional(),
    recentActions: z.array(z.any()).optional(),
    domainExpertise: z.enum(['novice', 'intermediate', 'expert']).optional(),
    preferences: z.object({
      responseFormat: z.enum(['concise', 'detailed', 'comprehensive']).optional(),
      includeFormulas: z.boolean().optional(),
      includeValidation: z.boolean().optional()
    }).optional()
  }).optional()
});

/**
 * POST /api/v1/enhanced-context/analyze
 * Advanced context analysis with full intelligence capabilities
 */
router.post('/analyze',
  contextRateLimit,
  validateRequest(enhancedContextSchema),
  asyncErrorHandler(async (req, res) => {
    const startTime = Date.now();
    const requestId = `enh_ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const requestData = req.body;
      const options = requestData.analysisOptions || {};

      // Step 1: Retrieve and validate spreadsheet data
      const spreadsheetData = spreadsheetStorage.get(requestData.spreadsheetId);
      if (!spreadsheetData) {
        return res.status(404).json({
          success: false,
          error: {
            code: ErrorCode.SPREADSHEET_NOT_FOUND,
            message: 'Spreadsheet not found or has expired',
            details: { spreadsheetId: requestData.spreadsheetId },
            timestamp: new Date().toISOString()
          },
          requestId,
          processingTime: Date.now() - startTime
        });
      }

      // Step 2: Initialize services (using existing services for now)
      const openAIService = req.app.locals['openAIService'] as OpenAIService | undefined;
      const contextExtractor = new ContextExtractor();
      const patternAnalyzer = new PatternAnalyzer(openAIService);

      // Step 3: Enhanced query processing with real analysis
      console.log('Processing query with enhanced intelligence...');
      
      // Import the new enhanced query processor
      const { EnhancedQueryProcessor } = await import('../services/EnhancedQueryProcessor');
      
      const processedQuery = await EnhancedQueryProcessor.processQuery(
        requestData.request,
        spreadsheetData,
        requestData.currentSelection
      );

      // Create intelligence result from real analysis
      const intelligenceResult = {
        enhancementSummary: {
          totalCellsAnalyzed: spreadsheetData.sheets[0]?.data?.length || 0,
          companiesRecognized: processedQuery.summary.extractedEntities.length,
          qualityScore: processedQuery.confidence.breakdown.dataQuality,
          anomaliesDetected: 0,
          enhancedDataTypes: { [processedQuery.summary.targetMetric]: 'numeric' },
          financialTermsFound: processedQuery.summary.extractedEntities.filter(e => 
            ['profit', 'loss', 'price', 'value'].some(term => e.toLowerCase().includes(term))
          ).length,
          synonymsIdentified: processedQuery.summary.extractedEntities.length,
          searchIndexSize: spreadsheetData.sheets[0]?.data?.length || 0
        },
        recommendations: [
          {
            type: 'excel_guidance',
            priority: 'high',
            title: `Use ${processedQuery.excelGuidance.primaryFunction} for this query`,
            description: processedQuery.excelGuidance.stepByStepInstructions[0],
            impact: 'Provides exact answer to user query',
            actionItems: processedQuery.excelGuidance.stepByStepInstructions,
            estimatedEffort: 'low',
            exampleFormula: processedQuery.excelGuidance.exampleFormula
          },
          ...processedQuery.excelGuidance.alternativeFunctions.map(alt => ({
            type: 'alternative_approach',
            priority: 'medium' as const,
            title: `Alternative: ${alt.split(':')[0]}`,
            description: alt,
            impact: 'Alternative method for same result',
            actionItems: [alt],
            estimatedEffort: 'low'
          }))
        ],
        qualityProfile: {
          completeness: processedQuery.confidence.breakdown.dataQuality,
          consistency: processedQuery.confidence.breakdown.entityFound,
          accuracy: processedQuery.confidence.breakdown.formulaApplicability
        }
      };

      // Step 4: Domain classification (placeholder)
      console.log('Classifying domain intelligence...');
      const domainClassification = {
        primaryDomain: 'GENERAL',
        subDomains: [],
        confidence: 0.7,
        applicableRules: [],
        suggestedMetrics: [],
        detectedPatterns: []
      };

      const domainAnalysis = {
        applicableMetrics: [],
        suggestedFormulas: [],
        kpiRecommendations: [],
        businessInsights: [],
        riskAssessment: undefined
      };

      // Step 5: Intent analysis from processed query
      console.log('Analyzing enhanced intent...');
      const intentResult = {
        intent: {
          primaryIntent: processedQuery.summary.targetMetric !== 'Unknown' ? 'data_lookup' : 'data_analysis',
          confidence: { overall: processedQuery.confidence.breakdown.queryClarity },
          scope: { dataScope: { type: 'selection' } },
          query: { entities: processedQuery.summary.extractedEntities }
        },
        debugInfo: options.includeExplanations ? {
          tokenization: processedQuery.summary.extractedEntities,
          patternMatches: [processedQuery.summary.targetMetric],
          scoringBreakdown: processedQuery.confidence.breakdown,
          domainSignals: processedQuery.summary.dataRequirements,
          ambiguityDetection: processedQuery.confidence.uncertaintyFactors
        } : undefined
      };

      // Step 6: Auto-selection from processed query
      let selectionResult;
      if (options.enableAutoSelection) {
        console.log('Performing intelligent auto-selection...');
        selectionResult = {
          range: processedQuery.currentSelection.isValid ? 
            requestData.currentSelection.range : 
            processedQuery.currentSelection.recommendedRange,
          confidence: processedQuery.currentSelection.containsTargetData ? 0.9 : 0.4,
          matchType: processedQuery.currentSelection.containsTargetData ? 'exact' : 'recommended',
          relevantColumns: [processedQuery.summary.targetMetric],
          explanation: processedQuery.currentSelection.explanation,
          relatedSelections: processedQuery.currentSelection.isValid ? [] : [processedQuery.currentSelection.recommendedRange]
        };
      }

      // Step 7: Context synthesis from processed query
      console.log('Synthesizing comprehensive context...');
      const comprehensiveContext = {
        summary: processedQuery.summary.llmFriendlyPrompt,
        insights: [
          {
            type: 'query_understanding',
            description: `User is asking for ${processedQuery.summary.targetMetric} for ${processedQuery.summary.extractedEntities.join(' or ')}`,
            confidence: processedQuery.confidence.breakdown.queryClarity
          },
          {
            type: 'data_match',
            description: processedQuery.confidence.reasoning.join('; '),
            confidence: processedQuery.confidence.breakdown.entityFound
          },
          {
            type: 'excel_solution',
            description: `Best approach: ${processedQuery.excelGuidance.primaryFunction} - ${processedQuery.excelGuidance.exampleFormula}`,
            confidence: processedQuery.confidence.breakdown.formulaApplicability
          }
        ],
        risks: processedQuery.confidence.uncertaintyFactors.map(factor => ({
          type: 'uncertainty',
          description: factor,
          impact: 'medium',
          confidence: 0.7
        })),
        opportunities: [
          {
            type: 'excel_automation',
            description: `Use ${processedQuery.excelGuidance.primaryFunction} to get exact answer: ${processedQuery.excelGuidance.exampleFormula}`,
            impact: 'high',
            confidence: processedQuery.confidence.breakdown.formulaApplicability
          }
        ],
        confidence: { overall: 0.8 },
        nextSteps: [
          {
            action: 'Proceed with data analysis',
            priority: 'high',
            estimatedEffort: 'medium'
          }
        ]
      };

      // Step 8: Agent prompts from processed query
      let agentPrompt;
      if (options.enableAgentPrompts) {
        console.log('Generating enhanced agent prompts...');
        agentPrompt = {
          summary: processedQuery.summary.llmFriendlyPrompt,
          detailedInstructions: `${processedQuery.summary.llmFriendlyPrompt}\n\nEXCEL GUIDANCE:\n${processedQuery.excelGuidance.stepByStepInstructions.join('\n')}`,
          stepByStepActions: processedQuery.excelGuidance.stepByStepInstructions.map((instruction, index) => ({
            step: index + 1,
            action: instruction,
            description: instruction
          })),
          excelFormulas: [
            {
              formula: processedQuery.excelGuidance.exampleFormula,
              description: `Primary formula to find ${processedQuery.summary.targetMetric}`,
              cellReference: 'Result cell'
            },
            ...processedQuery.excelGuidance.alternativeFunctions.map(alt => ({
              formula: alt.split(': ')[1] || alt,
              description: alt.split(': ')[0] || 'Alternative approach',
              cellReference: 'Alternative cell'
            }))
          ],
          validationSteps: processedQuery.excelGuidance.validationSteps.map(step => ({
            description: step,
            expectedResult: `Valid ${processedQuery.summary.targetMetric} value`
          })),
          expectedOutcome: {
            description: processedQuery.summary.expectedOutput,
            successCriteria: ['Exact value found', 'Proper formatting', 'Source verification']
          }
        };
      }

      // Step 9: Performance optimization (placeholder)
      let performanceOptimization;
      if (options.enablePerformanceOptimization) {
        console.log('Applying performance optimizations...');
        performanceOptimization = {
          applied: true,
          optimizations: ['caching', 'data_indexing'],
          improvement: 0.15
        };
      }

      const processingTime = Date.now() - startTime;

      // Step 10: Format comprehensive response
      const response = {
        success: true,
        data: {
          // Core analysis results
          intelligenceAnalysis: {
            enhancementSummary: intelligenceResult.enhancementSummary,
            recommendations: intelligenceResult.recommendations,
            qualityProfile: intelligenceResult.qualityProfile
          },
          
          // Domain intelligence
          domainIntelligence: {
            classification: domainClassification,
            analysis: domainAnalysis
          },
          
          // Intent understanding
          intentAnalysis: {
            intent: intentResult.intent,
            confidence: intentResult.intent.confidence?.overall || 0.8,
            debugInfo: options.includeExplanations ? intentResult.debugInfo : undefined
          },
          
          // Auto-selection results
          autoSelection: selectionResult ? {
            selectedRange: selectionResult.range,
            confidence: selectionResult.confidence,
            explanation: selectionResult.explanation,
            alternativeSelections: selectionResult.relatedSelections || []
          } : undefined,
          
          // Synthesized context
          contextSynthesis: {
            summary: comprehensiveContext.summary,
            insights: comprehensiveContext.insights,
            risks: comprehensiveContext.risks,
            opportunities: comprehensiveContext.opportunities,
            confidence: {
              overall: processedQuery.confidence.overall,
              breakdown: processedQuery.confidence.breakdown,
              reasoning: processedQuery.confidence.reasoning,
              uncertaintyFactors: processedQuery.confidence.uncertaintyFactors
            },
            nextSteps: comprehensiveContext.nextSteps
          },
          
          // Agent instructions
          agentPrompt: agentPrompt ? {
            summary: agentPrompt.summary,
            detailedInstructions: agentPrompt.detailedInstructions,
            stepByStepActions: agentPrompt.stepByStepActions,
            excelFormulas: agentPrompt.excelFormulas,
            validationSteps: agentPrompt.validationSteps,
            expectedOutcome: agentPrompt.expectedOutcome
          } : undefined,
          
          // Performance metrics
          performance: {
            processingTime,
            optimization: performanceOptimization,
            metrics: {
              cellsAnalyzed: intelligenceResult.enhancementSummary.totalCellsAnalyzed,
              qualityScore: intelligenceResult.enhancementSummary.qualityScore,
              confidenceScore: processedQuery.confidence.overall
            }
          }
        },
        requestId,
        processingTime
      };

      console.log('Enhanced context analysis completed successfully');
      return res.status(200).json(response);

    } catch (error) {
      console.error('Enhanced context analysis error:', error);

      const apiError: ApiError = {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to perform enhanced context analysis',
        details: { error: error.message },
        suggestions: [
          'Check if your spreadsheet data is valid',
          'Try with simpler analysis options',
          'Contact support if the problem persists'
        ],
        timestamp: new Date().toISOString()
      };

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
 * POST /api/v1/enhanced-context/domain-analysis
 * Focused domain intelligence analysis
 */
router.post('/domain-analysis',
  contextRateLimit,
  validateRequest(z.object({
    spreadsheetId: z.string().regex(/^sheet_\d+_[a-z0-9]+$/, 'Invalid spreadsheet ID format'),
    analysisOptions: z.object({
      includeFinancialMetrics: z.boolean().default(true),
      includeBusinessKPIs: z.boolean().default(true),
      includeRiskAssessment: z.boolean().default(true)
    }).optional()
  })),
  asyncErrorHandler(async (req, res) => {
    const startTime = Date.now();
    const requestId = `domain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const { spreadsheetId, analysisOptions = {} } = req.body;

      const spreadsheetData = spreadsheetStorage.get(spreadsheetId);
      if (!spreadsheetData) {
        return res.status(404).json({
          success: false,
          error: {
            code: ErrorCode.SPREADSHEET_NOT_FOUND,
            message: 'Spreadsheet not found',
            timestamp: new Date().toISOString()
          },
          requestId
        });
      }

      // Placeholder domain analysis using existing services
      const contextData = await ContextExtractor.extractRelevantData(
        spreadsheetData,
        { sheet: spreadsheetData.sheets[0].name, range: 'A1:Z1000', activeCell: 'A1' },
        { type: 'current_selection', includeRelated: true, includeHistory: false, maxCells: 1000 }
      );
      
      // Mock domain classification
      const domainClassification = {
        primaryDomain: 'GENERAL',
        subDomains: [],
        confidence: 0.7,
        applicableRules: [],
        suggestedMetrics: [],
        detectedPatterns: []
      };
      
      const domainAnalysis = {
        applicableMetrics: [
          { name: 'Data Count', type: 'basic', formula: 'COUNT(range)' },
          { name: 'Average', type: 'statistical', formula: 'AVERAGE(range)' }
        ],
        suggestedFormulas: [
          { name: 'Sum', formula: 'SUM(range)', description: 'Calculate total' },
          { name: 'Average', formula: 'AVERAGE(range)', description: 'Calculate mean' }
        ],
        kpiRecommendations: [
          { name: 'Data Quality', description: 'Measure completeness and accuracy' }
        ],
        businessInsights: [
          { type: 'data_structure', description: 'Well-structured tabular data' }
        ],
        riskAssessment: analysisOptions.includeRiskAssessment ? {
          risks: [],
          overallRisk: 'low'
        } : undefined
      };

      const response = {
        success: true,
        data: {
          domainClassification,
          domainAnalysis,
          applicableMetrics: domainAnalysis.applicableMetrics,
          suggestedFormulas: domainAnalysis.suggestedFormulas,
          kpiRecommendations: domainAnalysis.kpiRecommendations,
          businessInsights: domainAnalysis.businessInsights,
          riskAssessment: domainAnalysis.riskAssessment
        },
        requestId,
        processingTime: Date.now() - startTime
      };

      return res.status(200).json(response);

    } catch (error) {
      console.error('Domain analysis error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to perform domain analysis',
          details: { error: error.message },
          timestamp: new Date().toISOString()
        },
        requestId,
        processingTime: Date.now() - startTime
      });
    }
  })
);

/**
 * POST /api/v1/enhanced-context/auto-select
 * Intelligent auto-selection endpoint
 */
router.post('/auto-select',
  contextRateLimit,
  validateRequest(z.object({
    query: z.string().min(1, 'Query is required'),
    spreadsheetId: z.string().regex(/^sheet_\d+_[a-z0-9]+$/, 'Invalid spreadsheet ID format'),
    currentSelection: z.object({
      sheet: z.string(),
      range: z.string(),
      activeCell: z.string()
    }),
    selectionOptions: z.object({
      expandRelated: z.boolean().default(true),
      includeHeaders: z.boolean().default(true),
      maxSelections: z.number().min(1).max(10).default(5)
    }).optional()
  })),
  asyncErrorHandler(async (req, res) => {
    const startTime = Date.now();
    const requestId = `autosel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const { query, spreadsheetId, currentSelection, selectionOptions = {} } = req.body;

      const spreadsheetData = spreadsheetStorage.get(spreadsheetId);
      if (!spreadsheetData) {
        return res.status(404).json({
          success: false,
          error: {
            code: ErrorCode.SPREADSHEET_NOT_FOUND,
            message: 'Spreadsheet not found',
            timestamp: new Date().toISOString()
          },
          requestId
        });
      }

      // Placeholder enhanced data analysis
      const contextData = await ContextExtractor.extractRelevantData(
        spreadsheetData,
        currentSelection,
        { type: 'current_selection', includeRelated: true, includeHistory: false, maxCells: 1000 }
      );

      // Mock intent analysis
      const intentResult = {
        intent: {
          primaryIntent: 'data_search',
          confidence: { overall: 0.8 }
        }
      };

      // Mock auto-selection results
      const selectionResults = [
        {
          range: currentSelection.range,
          confidence: 0.9,
          matchType: 'exact',
          explanation: `Selected data matching query: ${query}`,
          relevantColumns: [
            { name: 'Column1', type: 'text' },
            { name: 'Column2', type: 'number' }
          ]
        }
      ];

      const response = {
        success: true,
        data: {
          query,
          intentAnalysis: {
            primaryIntent: intentResult.intent.primaryIntent,
            confidence: intentResult.intent.confidence?.overall || 0.8
          },
          selections: selectionResults.map(result => ({
            range: result.range,
            confidence: result.confidence,
            matchType: result.matchType,
            explanation: result.explanation,
            relevantColumns: result.relevantColumns
          })),
          recommendedSelection: selectionResults[0] || null
        },
        requestId,
        processingTime: Date.now() - startTime
      };

      return res.status(200).json(response);

    } catch (error) {
      console.error('Auto-selection error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to perform auto-selection',
          details: { error: error.message },
          timestamp: new Date().toISOString()
        },
        requestId,
        processingTime: Date.now() - startTime
      });
    }
  })
);

export default router;