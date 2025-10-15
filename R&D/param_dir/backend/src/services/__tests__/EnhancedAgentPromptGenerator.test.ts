/**
 * Tests for Enhanced Agent Prompt Generator
 */

import { EnhancedAgentPromptGenerator } from '../EnhancedAgentPromptGenerator';
import { ExcelFormulaGenerator } from '../ExcelFormulaGenerator';
import { ExecutionStepOptimizer } from '../ExecutionStepOptimizer';
import { ValidationStrategyGenerator } from '../ValidationStrategyGenerator';
import {
  AgentPromptConfig,
  EnhancedAgentPrompt,
  MultiFormatOutput,
  ComplexityLevel
} from '../../types/agent-prompt';
import { ComprehensiveContext } from '../../types/context-synthesis';

describe('EnhancedAgentPromptGenerator', () => {
  let generator: EnhancedAgentPromptGenerator;
  let mockContext: ComprehensiveContext;
  let defaultConfig: AgentPromptConfig;

  beforeEach(() => {
    generator = new EnhancedAgentPromptGenerator();
    
    // Mock comprehensive context
    mockContext = {
      id: 'test-context-1',
      timestamp: new Date(),
      query: 'Calculate portfolio performance metrics',
      dataContext: {
        spreadsheetData: {} as any, // Mock IntelligentSpreadsheetData
        selectedRanges: [],
        relationshipMap: {} as any,
        dataQuality: {
          overallScore: 0.85,
          completeness: 0.95,
          accuracy: 0.9,
          consistency: 0.88,
          timeliness: 0.92,
          issues: []
        },
        dataCharacteristics: {
          size: { rows: 100, columns: 10, cells: 1000, nonEmptyCells: 950, dataVolume: 'medium' },
          complexity: { level: 'moderate' as ComplexityLevel, factors: [], score: 0.6 },
          structure: { type: 'tabular', organization: 'structured', hierarchical: false, normalized: true },
          temporality: { hasTimeData: true, timeColumns: ['Date'], frequency: 'daily', coverage: 'complete' },
          relationships: { density: 0.7, complexity: 'moderate', types: ['correlation'], strength: 0.8 }
        }
      },
      businessContext: {
        domain: { primaryDomain: 'financial' as any, subDomains: [], confidence: 0.9, applicableRules: [], suggestedMetrics: [] },
        useCase: { primary: 'portfolio_analysis', secondary: [], context: 'investment_management', objectives: [] },
        stakeholders: [],
        objectives: [],
        constraints: []
      },
      analyticalContext: {
        intent: {
          query: {
            original: 'Calculate portfolio performance metrics',
            normalized: 'calculate portfolio performance metrics',
            entities: [],
            tokens: []
          },
          intent: {
            primary: { type: 'data_analysis' as any, confidence: 0.9, reasoning: [], matchedPatterns: [], domainSpecific: true },
            secondary: [],
            confidence: 0.9,
            ambiguities: [],
            clarificationNeeded: false
          },
          scope: {
            dataScope: 'portfolio_level' as any,
            analyticalScope: 'comprehensive' as any,
            temporalScope: 'current' as any
          },
          context: {
            businessContext: {} as any,
            userContext: {} as any,
            sessionContext: {} as any
          }
        },
        analysisType: [],
        requiredMetrics: [],
        comparisons: [],
        benchmarks: [],
        validationRules: []
      },
      insights: [
        {
          id: 'insight-1',
          type: 'pattern' as any,
          category: 'financial' as any,
          title: 'Tech Stock Correlation',
          description: 'Strong correlation between tech stocks',
          evidence: [],
          confidence: 0.8,
          impact: { magnitude: 0.7, scope: ['portfolio'], timeframe: 'medium', confidence: 0.8 },
          actionability: { score: 0.9, factors: [], recommendations: [] },
          priority: 'medium' as any,
          relatedInsights: [],
          tags: ['correlation', 'tech']
        }
      ],
      risks: [
        {
          id: 'risk-1',
          type: 'financial' as any,
          category: 'short_term' as any,
          title: 'Concentration Risk',
          description: 'High concentration in tech sector',
          probability: 0.7,
          impact: 'major' as any,
          severity: 'high' as any,
          evidence: [],
          mitigationStrategies: [],
          timeframe: { immediate: false, shortTerm: true, mediumTerm: false, longTerm: false },
          affectedAreas: ['portfolio'],
          confidence: 0.8
        }
      ],
      opportunities: [
        {
          id: 'opp-1',
          type: 'efficiency_improvement' as any,
          category: 'short_term' as any,
          title: 'Portfolio Optimization',
          description: 'Potential for better risk-adjusted returns',
          potential: { qualitative: 'medium', timeframe: 'quarterly' },
          feasibility: { technical: 0.8, financial: 0.9, operational: 0.7, strategic: 0.8, overall: 0.8 },
          evidence: [],
          requirements: [],
          timeframe: { implementation: '1 month', realization: '3 months', duration: '6 months' },
          confidence: 0.6,
          priority: 'medium' as any
        }
      ],
      patterns: [],
      confidence: {
        score: 0.85,
        level: 'high' as any,
        components: [],
        factors: [
          { type: 'positive' as any, name: 'Data Quality', impact: 0.3, description: 'High quality data', evidence: [] },
          { type: 'positive' as any, name: 'Intent Clarity', impact: 0.3, description: 'Clear intent', evidence: [] },
          { type: 'positive' as any, name: 'Domain Knowledge', impact: 0.4, description: 'Strong domain context', evidence: [] }
        ],
        uncertainty: {
          dataUncertainty: 0.1,
          modelUncertainty: 0.15,
          contextualUncertainty: 0.1,
          overallUncertainty: 0.12,
          uncertaintyFactors: [],
          confidenceInterval: { lower: 0.75, upper: 0.95, level: 0.95 }
        },
        reliability: {
          consistency: 0.9,
          stability: 0.85,
          reproducibility: 0.8,
          validity: 0.9
        }
      },
      reliability: {
        dataReliability: 0.9,
        methodReliability: 0.85,
        contextReliability: 0.8,
        overallReliability: 0.85,
        factors: []
      },
      nextSteps: [
        {
          id: 'action-1',
          type: 'analytical' as any,
          title: 'Calculate Portfolio Metrics',
          description: 'Calculate portfolio performance metrics',
          priority: 'high' as any,
          effort: 'medium' as any,
          impact: 'major' as any,
          timeframe: { start: 'immediate', duration: '1 hour', milestones: [] },
          prerequisites: ['data_validation'],
          steps: [],
          resources: [],
          risks: [],
          success_criteria: ['Portfolio performance summary generated']
        }
      ],
      alternatives: [],
      processingTime: 1500,
      dataQuality: 0.85,
      complexity: 'moderate' as ComplexityLevel
    } as ComprehensiveContext;

    defaultConfig = {
      outputFormat: 'comprehensive',
      detailLevel: 'detailed',
      includeAlternatives: true,
      includeValidation: true,
      includeOptimization: true,
      includeTesting: true,
      targetAudience: 'intermediate',
      complexityPreference: 'moderate'
    };
  });

  describe('generateAgentPrompt', () => {
    it('should generate comprehensive agent prompt', async () => {
      const result = await generator.generateAgentPrompt(mockContext, defaultConfig);

      expect(result).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.instructions).toBeDefined();
      expect(result.context).toBeDefined();
      expect(result.execution).toBeDefined();
      expect(result.formulas).toBeDefined();
      expect(result.optimization).toBeDefined();
      expect(result.testing).toBeDefined();
    });

    it('should include proper metadata', async () => {
      const result = await generator.generateAgentPrompt(mockContext, defaultConfig);

      expect(result.metadata.promptId).toBeDefined();
      expect(result.metadata.generatedAt).toBeInstanceOf(Date);
      expect(result.metadata.confidence).toBeDefined();
      expect(result.metadata.estimatedComplexity).toBeDefined();
      expect(result.metadata.version).toBeDefined();
      expect(result.metadata.generationTime).toBeGreaterThanOrEqual(0);
    });

    it('should generate appropriate instructions for different intents', async () => {
      // Test formula assistance intent
      const formulaContext = { ...mockContext };
      formulaContext.analyticalContext.intent.intent.primary.type = 'formula_assistance' as any;
      
      const formulaResult = await generator.generateAgentPrompt(formulaContext, defaultConfig);
      expect(formulaResult.instructions.summary).toBeDefined();

      // Test data analysis intent
      const analysisContext = { ...mockContext };
      analysisContext.analyticalContext.intent.intent.primary.type = 'data_analysis' as any;
      
      const analysisResult = await generator.generateAgentPrompt(analysisContext, defaultConfig);
      expect(analysisResult.instructions.summary).toBeDefined();
    });

    it('should include validation steps when requested', async () => {
      const configWithValidation = { ...defaultConfig, includeValidation: true };
      const result = await generator.generateAgentPrompt(mockContext, configWithValidation);

      expect(result.execution.validationSteps).toBeDefined();
      expect(result.execution.validationSteps.length).toBeGreaterThan(0);
    });

    it('should exclude validation steps when not requested', async () => {
      const configWithoutValidation = { ...defaultConfig, includeValidation: false };
      const result = await generator.generateAgentPrompt(mockContext, configWithoutValidation);

      expect(result.execution.validationSteps).toBeDefined();
      expect(result.execution.validationSteps.length).toBe(0);
    });

    it('should include alternatives when requested', async () => {
      const configWithAlternatives = { ...defaultConfig, includeAlternatives: true };
      const result = await generator.generateAgentPrompt(mockContext, configWithAlternatives);

      expect(result.execution.alternativeApproaches).toBeDefined();
      // Note: Actual alternatives depend on context, so we just check structure
    });

    it('should adapt to different target audiences', async () => {
      // Test beginner audience
      const beginnerConfig = { ...defaultConfig, targetAudience: 'beginner' as const };
      const beginnerResult = await generator.generateAgentPrompt(mockContext, beginnerConfig);
      
      // Test expert audience
      const expertConfig = { ...defaultConfig, targetAudience: 'expert' as const };
      const expertResult = await generator.generateAgentPrompt(mockContext, expertConfig);

      // Instructions should be different for different audiences
      expect(beginnerResult.instructions.naturalLanguage).toBeDefined();
      expect(expertResult.instructions.naturalLanguage).toBeDefined();
    });
  });

  describe('generateMultiFormatOutput', () => {
    it('should generate all output formats', async () => {
      const prompt = await generator.generateAgentPrompt(mockContext, defaultConfig);
      const multiFormat = await generator.generateMultiFormatOutput(prompt, defaultConfig);

      expect(multiFormat.naturalLanguage).toBeDefined();
      expect(multiFormat.stepByStep).toBeDefined();
      expect(multiFormat.technical).toBeDefined();
      expect(multiFormat.formulas).toBeDefined();
      expect(multiFormat.validation).toBeDefined();
    });

    it('should adapt format based on configuration', async () => {
      const prompt = await generator.generateAgentPrompt(mockContext, defaultConfig);
      
      const technicalConfig = { ...defaultConfig, outputFormat: 'technical' as const };
      const businessConfig = { ...defaultConfig, outputFormat: 'business' as const };

      const technicalOutput = await generator.generateMultiFormatOutput(prompt, technicalConfig);
      const businessOutput = await generator.generateMultiFormatOutput(prompt, businessConfig);

      expect(technicalOutput).toBeDefined();
      expect(businessOutput).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle missing context gracefully', async () => {
      const incompleteContext = {
        dataContext: mockContext.dataContext,
        // Missing other required fields
      } as Partial<ComprehensiveContext>;

      // Should not throw, but handle gracefully
      await expect(
        generator.generateAgentPrompt(incompleteContext as ComprehensiveContext, defaultConfig)
      ).resolves.toBeDefined();
    });

    it('should handle invalid configuration gracefully', async () => {
      const invalidConfig = {
        ...defaultConfig,
        targetAudience: 'invalid' as any
      };

      // Should not throw, but use defaults
      await expect(
        generator.generateAgentPrompt(mockContext, invalidConfig)
      ).resolves.toBeDefined();
    });
  });

  describe('performance', () => {
    it('should generate prompt within reasonable time', async () => {
      const startTime = Date.now();
      await generator.generateAgentPrompt(mockContext, defaultConfig);
      const endTime = Date.now();

      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle large contexts efficiently', async () => {
      // Create a large context with many insights
      const largeContext = {
        ...mockContext,
        insights: Array.from({ length: 50 }, (_, i) => ({
          id: `insight-${i}`,
          type: 'pattern' as any,
          category: 'financial' as any,
          title: `Insight ${i}`,
          description: `Insight ${i}`,
          evidence: [],
          confidence: 0.8,
          impact: { magnitude: 0.7, scope: ['portfolio'], timeframe: 'medium', confidence: 0.8 },
          actionability: { score: 0.9, factors: [], recommendations: [`Recommendation ${i}`] },
          priority: 'medium' as any,
          relatedInsights: [],
          tags: []
        }))
      };

      const startTime = Date.now();
      const result = await generator.generateAgentPrompt(largeContext, defaultConfig);
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(10000); // Should handle large contexts within 10 seconds
    });
  });

  describe('integration with other services', () => {
    it('should work with ExcelFormulaGenerator', () => {
      const formulaGenerator = new ExcelFormulaGenerator();
      expect(formulaGenerator).toBeDefined();
      
      // Test basic formula generation
      const config = {
        excelVersion: 'Excel365' as const,
        preferArrayFormulas: true,
        includeErrorHandling: true,
        optimizeForPerformance: true,
        includeComments: true
      };

      const formulaInstruction = formulaGenerator.generateAggregationFormula('SUM', 'A1:A10', undefined, config);
      expect(formulaInstruction).toBeDefined();
      expect(formulaInstruction.formula).toContain('SUM');
    });

    it('should work with ExecutionStepOptimizer', () => {
      const optimizer = new ExecutionStepOptimizer();
      expect(optimizer).toBeDefined();

      const mockSteps = [
        {
          stepNumber: 1,
          action: 'Validate data',
          description: 'Check data quality',
          expectedResult: 'Clean data',
          validationCriteria: ['No missing values'],
          dependencies: [],
          estimatedTime: 60,
          complexity: 'simple' as ComplexityLevel
        }
      ];

      const result = optimizer.optimizeSteps(mockSteps, mockContext, defaultConfig);
      expect(result).toBeDefined();
      expect(result.optimizedSteps).toBeDefined();
    });

    it('should work with ValidationStrategyGenerator', () => {
      const validationGenerator = new ValidationStrategyGenerator();
      expect(validationGenerator).toBeDefined();

      const validationConfig = {
        strictness: 'standard' as const,
        automationLevel: 'semi-automated' as const,
        includePerformanceValidation: true,
        includeBusinessLogicValidation: true,
        includeDataQualityValidation: true,
        includeFormulaValidation: true
      };

      const validationPlan = validationGenerator.generateValidationPlan(mockContext, validationConfig);
      expect(validationPlan).toBeDefined();
      expect(validationPlan.strategy).toBeDefined();
      expect(validationPlan.steps).toBeDefined();
    });
  });
});