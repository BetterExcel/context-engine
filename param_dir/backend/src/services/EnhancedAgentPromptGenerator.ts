/**
 * Enhanced Agent Prompt Generator
 * 
 * Generates comprehensive, executable agent instructions with multi-format output,
 * validation strategies, error handling, and Excel formula generation.
 * 
 * Key Features:
 * - Multi-format output (natural language, step-by-step, technical, formulas)
 * - Comprehensive validation and error handling strategies
 * - Excel formula generation with proper syntax and validation
 * - Execution step optimization and alternative approaches
 * - Performance and accuracy optimization recommendations
 */

import {
  EnhancedAgentPrompt,
  AgentPromptMetadata,
  AgentInstructions,
  AgentContext,
  ExecutionApproach,
  ValidationStep,
  ErrorHandlingStep,
  FormulaInstruction,
  OptimizationRecommendations,
  TestingStrategy,
  PromptGenerationContext,
  AgentPromptConfig,
  MultiFormatOutput,
  ComplexityLevel,
  OverallConfidence,
  ExecutionStep,
  TechnicalInstruction,
  FormulaParameter,
  FormulaValidation,
  AlternativeFormula,
  PerformanceMetrics
} from '../types/agent-prompt';

import { ComprehensiveContext } from '../types/context-synthesis';
import { EnhancedIntent } from '../types/intent-analysis';
import { SelectionCandidate } from '../types/intelligent-selection';
import { DomainEnhancedAnalysis } from '../types/domain-intelligence';
import { IntelligentSpreadsheetData } from '../types/enhanced-intelligence';

export class EnhancedAgentPromptGenerator {
  private readonly version = '1.0.0';

  /**
   * Generate comprehensive agent prompt from context synthesis
   */
  async generateAgentPrompt(
    context: ComprehensiveContext,
    config: AgentPromptConfig = this.getDefaultConfig()
  ): Promise<EnhancedAgentPrompt> {
    const startTime = Date.now();

    // Generate metadata
    const metadata = this.generateMetadata(context, startTime);

    // Generate core instructions
    const instructions = await this.generateInstructions(context, config);

    // Generate context information
    const agentContext = this.generateContext(context);

    // Generate execution approaches
    const execution = await this.generateExecution(context, config);

    // Generate formula instructions
    const formulas = await this.generateFormulas(context, config);

    // Generate optimization recommendations
    const optimization = this.generateOptimizations(context, config);

    // Generate testing strategy
    const testing = this.generateTestingStrategy(context, config);

    return {
      metadata,
      instructions,
      context: agentContext,
      execution,
      formulas,
      optimization,
      testing
    };
  }

  /**
   * Generate multi-format output for different consumption needs
   */
  async generateMultiFormatOutput(
    prompt: EnhancedAgentPrompt,
    config: AgentPromptConfig
  ): Promise<MultiFormatOutput> {
    return {
      naturalLanguage: this.generateNaturalLanguageOutput(prompt, config),
      stepByStep: this.generateStepByStepOutput(prompt, config),
      technical: this.generateTechnicalOutput(prompt, config),
      formulas: this.generateFormulaOutput(prompt, config),
      validation: this.generateValidationOutput(prompt, config)
    };
  }

  /**
   * Generate prompt metadata with confidence and complexity assessment
   */
  private generateMetadata(context: ComprehensiveContext, startTime: number): AgentPromptMetadata {
    const confidence = this.calculateOverallConfidence(context);
    const complexity = this.assessComplexity(context);

    return {
      promptId: this.generatePromptId(),
      generatedAt: new Date(),
      confidence,
      estimatedComplexity: complexity,
      version: this.version,
      generationTime: Date.now() - startTime
    };
  }

  /**
   * Generate comprehensive instructions in multiple formats
   */
  private async generateInstructions(
    context: ComprehensiveContext,
    config: AgentPromptConfig
  ): Promise<AgentInstructions> {
    const summary = this.generateSummary(context);
    const naturalLanguage = this.generateNaturalLanguageInstructions(context, config);
    const stepByStep = await this.generateStepByStepInstructions(context, config);
    const technicalDetails = this.generateTechnicalInstructions(context, config);

    return {
      summary,
      naturalLanguage,
      stepByStep,
      technicalDetails
    };
  }

  /**
   * Generate contextual information for the agent
   */
  private generateContext(context: ComprehensiveContext): AgentContext {
    try {
      return {
        dataContext: this.buildDataContext(context),
        businessRationale: this.buildBusinessRationale(context),
        expectedOutcome: this.buildExpectedOutcome(context),
        successCriteria: this.buildSuccessCriteria(context),
        assumptions: this.buildAssumptions(context),
        limitations: this.buildLimitations(context)
      };
    } catch (error) {
      // Fallback for incomplete context
      return {
        dataContext: 'Context data not available',
        businessRationale: 'Business rationale not determined',
        expectedOutcome: 'Expected outcome not specified',
        successCriteria: ['Basic functionality'],
        assumptions: ['Standard Excel environment'],
        limitations: ['Limited context information']
      };
    }
  }

  /**
   * Generate execution approaches with alternatives
   */
  private async generateExecution(
    context: ComprehensiveContext,
    config: AgentPromptConfig
  ): Promise<{
    primaryApproach: ExecutionApproach;
    alternativeApproaches: ExecutionApproach[];
    validationSteps: ValidationStep[];
    errorHandling: ErrorHandlingStep[];
  }> {
    const primaryApproach = await this.generatePrimaryApproach(context, config);
    const alternativeApproaches = config.includeAlternatives 
      ? await this.generateAlternativeApproaches(context, config)
      : [];
    const validationSteps = config.includeValidation
      ? this.generateValidationSteps(context, config)
      : [];
    const errorHandling = this.generateErrorHandlingSteps(context, config);

    return {
      primaryApproach,
      alternativeApproaches,
      validationSteps,
      errorHandling
    };
  }

  /**
   * Generate Excel formula instructions with validation
   */
  private async generateFormulas(
    context: ComprehensiveContext,
    config: AgentPromptConfig
  ): Promise<{
    required: FormulaInstruction[];
    optional: FormulaInstruction[];
    validation: FormulaInstruction[];
  }> {
    const required = await this.generateRequiredFormulas(context, config);
    const optional = await this.generateOptionalFormulas(context, config);
    const validation = config.includeValidation
      ? await this.generateValidationFormulas(context, config)
      : [];

    return {
      required,
      optional,
      validation
    };
  }

  /**
   * Generate step-by-step execution instructions
   */
  private async generateStepByStepInstructions(
    context: ComprehensiveContext,
    config: AgentPromptConfig
  ): Promise<ExecutionStep[]> {
    const steps: ExecutionStep[] = [];
    let stepNumber = 1;

    // Data preparation steps
    if (this.requiresDataPreparation(context)) {
      steps.push(...this.generateDataPreparationSteps(context, stepNumber));
      stepNumber += steps.length;
    }

    // Analysis steps based on intent
    const analysisSteps = this.generateAnalysisSteps(context, stepNumber);
    steps.push(...analysisSteps);
    stepNumber += analysisSteps.length;

    // Formula implementation steps
    const formulaSteps = await this.generateFormulaImplementationSteps(context, stepNumber);
    steps.push(...formulaSteps);
    stepNumber += formulaSteps.length;

    // Validation steps
    if (config.includeValidation) {
      const validationSteps = this.generateValidationImplementationSteps(context, stepNumber);
      steps.push(...validationSteps);
    }

    return this.optimizeExecutionSteps(steps, config);
  }

  /**
   * Generate primary execution approach
   */
  private async generatePrimaryApproach(
    context: ComprehensiveContext,
    config: AgentPromptConfig
  ): Promise<ExecutionApproach> {
    const steps = await this.generateStepByStepInstructions(context, config);
    
    return {
      name: 'Primary Approach',
      description: this.generateApproachDescription(context, 'primary'),
      steps,
      advantages: this.identifyApproachAdvantages(context, 'primary'),
      disadvantages: this.identifyApproachDisadvantages(context, 'primary'),
      suitability: this.assessApproachSuitability(context, 'primary'),
      estimatedTime: this.calculateEstimatedTime(steps),
      complexity: this.assessApproachComplexity(steps),
      confidence: this.calculateApproachConfidence(context, steps)
    };
  }

  /**
   * Generate alternative execution approaches
   */
  private async generateAlternativeApproaches(
    context: ComprehensiveContext,
    config: AgentPromptConfig
  ): Promise<ExecutionApproach[]> {
    const alternatives: ExecutionApproach[] = [];

    // Generate formula-based alternative
    if (this.canUseFormulaApproach(context)) {
      alternatives.push(await this.generateFormulaBasedApproach(context, config));
    }

    // Generate pivot table alternative
    if (this.canUsePivotApproach(context)) {
      alternatives.push(await this.generatePivotBasedApproach(context, config));
    }

    // Generate VBA/macro alternative for complex operations
    if (this.canUseVBAApproach(context)) {
      alternatives.push(await this.generateVBABasedApproach(context, config));
    }

    return alternatives;
  }

  /**
   * Generate required Excel formulas
   */
  private async generateRequiredFormulas(
    context: ComprehensiveContext,
    config: AgentPromptConfig
  ): Promise<FormulaInstruction[]> {
    const formulas: FormulaInstruction[] = [];

    // Generate formulas based on intent and data context
    const intent = context.analyticalContext?.intent?.intent?.primary?.type || 'general_assistance';
    
    switch (intent) {
      case 'formula_assistance':
        formulas.push(...this.generateCalculationFormulas(context));
        break;
      case 'data_analysis':
        formulas.push(...this.generateAnalysisFormulas(context));
        break;
      case 'data_manipulation':
        formulas.push(...this.generateLookupFormulas(context));
        break;
      default:
        formulas.push(...this.generateGeneralFormulas(context));
    }

    return formulas.map(formula => this.enhanceFormulaInstruction(formula, context));
  }

  /**
   * Generate calculation formulas
   */
  private generateCalculationFormulas(context: ComprehensiveContext): FormulaInstruction[] {
    const formulas: FormulaInstruction[] = [];
    
    // Basic aggregation formulas
    formulas.push({
      purpose: 'Calculate sum of selected range',
      formula: '=SUM({range})',
      syntax: 'SUM(number1, [number2], ...)',
      parameters: [
        {
          name: 'range',
          type: 'range',
          description: 'Range of cells to sum',
          example: 'A1:A10',
          validation: 'Must be numeric range',
          required: true
        }
      ],
      cellReference: this.determineCellReference(context, 'sum'),
      dependencies: this.identifyFormulaDependencies(context, 'sum'),
      validation: this.createFormulaValidation('sum'),
      alternatives: this.generateFormulaAlternatives('sum'),
      performance: this.assessFormulaPerformance('sum', context)
    });

    // Add more calculation formulas based on context
    if (this.hasNumericData(context)) {
      formulas.push(this.generateAverageFormula(context));
      formulas.push(this.generateCountFormula(context));
    }

    return formulas;
  }

  /**
   * Generate lookup formulas
   */
  private generateLookupFormulas(context: ComprehensiveContext): FormulaInstruction[] {
    const formulas: FormulaInstruction[] = [];

    // VLOOKUP formula
    if (this.canUseVLookup(context)) {
      formulas.push({
        purpose: 'Find value in table',
        formula: '=VLOOKUP({lookup_value}, {table_array}, {col_index_num}, FALSE)',
        syntax: 'VLOOKUP(lookup_value, table_array, col_index_num, [range_lookup])',
        parameters: [
          {
            name: 'lookup_value',
            type: 'value',
            description: 'Value to search for',
            example: 'A2',
            validation: 'Must match data type in lookup column',
            required: true
          },
          {
            name: 'table_array',
            type: 'range',
            description: 'Table to search in',
            example: 'A:D',
            validation: 'Must include lookup and return columns',
            required: true
          },
          {
            name: 'col_index_num',
            type: 'value',
            description: 'Column number to return value from',
            example: '2',
            validation: 'Must be within table range',
            required: true
          }
        ],
        cellReference: this.determineCellReference(context, 'vlookup'),
        dependencies: this.identifyFormulaDependencies(context, 'vlookup'),
        validation: this.createFormulaValidation('vlookup'),
        alternatives: [
          {
            formula: '=XLOOKUP({lookup_value}, {lookup_array}, {return_array})',
            description: 'Modern alternative to VLOOKUP',
            advantages: ['More flexible', 'Better error handling', 'Can search right to left'],
            disadvantages: ['Requires newer Excel version'],
            useCase: 'When XLOOKUP is available',
            performance: 'faster'
          }
        ],
        performance: this.assessFormulaPerformance('vlookup', context)
      });
    }

    return formulas;
  }

  /**
   * Generate validation steps for execution
   */
  private generateValidationSteps(
    context: ComprehensiveContext,
    config: AgentPromptConfig
  ): ValidationStep[] {
    const steps: ValidationStep[] = [];

    // Data validation
    steps.push({
      stepNumber: 1,
      type: 'data',
      description: 'Validate input data quality and completeness',
      method: 'Check for missing values, data types, and ranges',
      criticalLevel: 'high',
      automatable: true
    });

    // Formula validation
    steps.push({
      stepNumber: 2,
      type: 'formula',
      description: 'Validate formula syntax and logic',
      method: 'Test formulas with sample data and edge cases',
      criticalLevel: 'critical',
      automatable: true
    });

    // Result validation
    steps.push({
      stepNumber: 3,
      type: 'result',
      description: 'Validate calculation results against expected outcomes',
      method: 'Compare with manual calculations or known benchmarks',
      criticalLevel: 'high',
      automatable: false
    });

    return steps;
  }

  /**
   * Generate error handling steps
   */
  private generateErrorHandlingSteps(
    context: ComprehensiveContext,
    config: AgentPromptConfig
  ): ErrorHandlingStep[] {
    return [
      {
        errorType: 'Formula Error',
        description: 'Excel formula returns error value (#DIV/0!, #N/A, etc.)',
        detectionMethod: 'Check for error values in result cells',
        resolution: 'Use IFERROR or IFNA functions to handle gracefully',
        preventionStrategy: 'Validate inputs before calculation',
        fallbackAction: 'Display user-friendly error message',
        severity: 'medium'
      },
      {
        errorType: 'Data Type Mismatch',
        description: 'Formula expects numeric data but receives text',
        detectionMethod: 'Use ISNUMBER or TYPE functions to check data types',
        resolution: 'Convert data types or filter invalid entries',
        preventionStrategy: 'Implement data validation rules',
        fallbackAction: 'Skip invalid entries with warning',
        severity: 'high'
      },
      {
        errorType: 'Range Reference Error',
        description: 'Formula references invalid or empty ranges',
        detectionMethod: 'Check range validity before formula execution',
        resolution: 'Adjust range references or use dynamic ranges',
        preventionStrategy: 'Use named ranges or table references',
        fallbackAction: 'Use default range or prompt user',
        severity: 'high'
      }
    ];
  }

  /**
   * Generate optimization recommendations
   */
  private generateOptimizations(
    context: ComprehensiveContext,
    config: AgentPromptConfig
  ): OptimizationRecommendations {
    return {
      performance: [
        {
          area: 'Formula Efficiency',
          recommendation: 'Use array formulas instead of multiple single-cell formulas',
          impact: 'high',
          effort: 'medium',
          description: 'Reduces calculation time and memory usage for large datasets'
        },
        {
          area: 'Data Structure',
          recommendation: 'Convert ranges to Excel tables for better performance',
          impact: 'medium',
          effort: 'low',
          description: 'Improves formula readability and automatic range expansion'
        }
      ],
      accuracy: [
        {
          area: 'Data Validation',
          recommendation: 'Implement comprehensive input validation',
          riskReduction: 85,
          validationMethod: 'Data validation rules and conditional formatting',
          description: 'Prevents common data entry errors that lead to incorrect calculations'
        }
      ],
      maintainability: [
        {
          area: 'Formula Documentation',
          recommendation: 'Add comments and use named ranges',
          benefit: 'Easier to understand and modify formulas',
          implementation: 'Use Insert > Name > Define and cell comments',
          description: 'Makes spreadsheet more maintainable for future updates'
        }
      ],
      scalability: [
        {
          area: 'Dynamic Ranges',
          recommendation: 'Use dynamic named ranges or table references',
          scalabilityFactor: 10,
          limitations: ['Requires Excel 2007 or later'],
          description: 'Automatically adjusts formulas when data size changes'
        }
      ]
    };
  }

  /**
   * Generate testing strategy
   */
  private generateTestingStrategy(
    context: ComprehensiveContext,
    config: AgentPromptConfig
  ): TestingStrategy {
    return {
      unitTests: [
        {
          name: 'Formula Accuracy Test',
          description: 'Test individual formulas with known inputs and outputs',
          input: 'Sample data with known results',
          expectedOutput: 'Correct calculated values',
          validationCriteria: ['Results match expected values within tolerance'],
          automatable: true,
          priority: 'critical'
        }
      ],
      integrationTests: [
        {
          name: 'End-to-End Workflow Test',
          description: 'Test complete analysis workflow from data input to final results',
          input: 'Complete dataset',
          expectedOutput: 'Final analysis results',
          validationCriteria: ['All steps execute successfully', 'Results are reasonable'],
          automatable: false,
          priority: 'high'
        }
      ],
      validationTests: [
        {
          name: 'Data Quality Validation',
          description: 'Validate data meets quality requirements',
          input: 'Raw data',
          expectedOutput: 'Quality assessment report',
          validationCriteria: ['No critical data quality issues'],
          automatable: true,
          priority: 'high'
        }
      ],
      performanceTests: [
        {
          name: 'Large Dataset Performance',
          description: 'Test performance with large datasets',
          input: 'Dataset with 10,000+ rows',
          expectedOutput: 'Results within acceptable time limits',
          validationCriteria: ['Calculation completes within 30 seconds'],
          automatable: true,
          priority: 'medium'
        }
      ]
    };
  }

  // === HELPER METHODS ===

  private getDefaultConfig(): AgentPromptConfig {
    return {
      outputFormat: 'comprehensive',
      detailLevel: 'detailed',
      includeAlternatives: true,
      includeValidation: true,
      includeOptimization: true,
      includeTesting: true,
      targetAudience: 'intermediate',
      complexityPreference: 'moderate'
    };
  }

  private generatePromptId(): string {
    return `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateOverallConfidence(context: ComprehensiveContext): OverallConfidence {
    // Implementation would calculate confidence based on various factors
    return {
      score: 0.85,
      factors: [
        { factor: 'Data Quality', weight: 0.3, score: 0.9, impact: 'High quality data increases confidence' },
        { factor: 'Intent Clarity', weight: 0.25, score: 0.8, impact: 'Clear intent improves accuracy' },
        { factor: 'Domain Knowledge', weight: 0.25, score: 0.85, impact: 'Strong domain context available' },
        { factor: 'Formula Complexity', weight: 0.2, score: 0.8, impact: 'Moderate complexity, well understood' }
      ],
      explanation: 'High confidence based on good data quality and clear intent',
      reliability: 'high'
    };
  }

  private assessComplexity(context: ComprehensiveContext): ComplexityLevel {
    // Implementation would assess complexity based on various factors
    return 'moderate';
  }

  private generateSummary(context: ComprehensiveContext): string {
    try {
      const intentType = context.analyticalContext?.intent?.intent?.primary?.type || 'general_assistance';
      const dataQuality = context.dataContext?.dataQuality?.overallScore || 0.5;
      return `Generate comprehensive Excel analysis for ${intentType} operation with ${dataQuality > 0.8 ? 'high' : 'moderate'} confidence.`;
    } catch (error) {
      return 'Generate Excel analysis with available context.';
    }
  }

  private generateNaturalLanguageInstructions(context: ComprehensiveContext, config: AgentPromptConfig): string {
    try {
      const intentType = context.analyticalContext?.intent?.intent?.primary?.type || 'general_assistance';
      const domainType = context.businessContext?.domain?.primaryDomain || 'general';
      return `Based on your request to perform ${intentType} on the data, I'll help you create a comprehensive Excel solution. The analysis shows you're working with ${domainType} data, and I've identified the most effective approach to achieve your goals. This solution will include proper formulas, validation steps, and optimization recommendations to ensure accurate and efficient results.`;
    } catch (error) {
      return 'I\'ll help you create a comprehensive Excel solution based on the available context.';
    }
  }

  // Additional helper methods would be implemented here...
  // (Keeping the file manageable while showing the complete structure)

  private generateTechnicalInstructions(context: ComprehensiveContext, config: AgentPromptConfig): TechnicalInstruction[] {
    return [];
  }

  private buildDataContext(context: ComprehensiveContext): string {
    try {
      const domainType = context.businessContext?.domain?.primaryDomain || 'unknown';
      const dataQuality = context.dataContext?.dataQuality?.overallScore || 0.5;
      return `Domain Type: ${domainType}, Data Quality: ${dataQuality}`;
    } catch (error) {
      return 'Data context not available';
    }
  }

  private buildBusinessRationale(context: ComprehensiveContext): string {
    return 'Business rationale based on context analysis';
  }

  private buildExpectedOutcome(context: ComprehensiveContext): string {
    return 'Expected outcome based on intent and context';
  }

  private buildSuccessCriteria(context: ComprehensiveContext): string[] {
    return ['Accurate results', 'Efficient execution', 'Proper validation'];
  }

  private buildAssumptions(context: ComprehensiveContext): string[] {
    return ['Data is properly formatted', 'Excel version supports required functions'];
  }

  private buildLimitations(context: ComprehensiveContext): string[] {
    return ['Limited to Excel functionality', 'Requires manual validation of results'];
  }

  // Placeholder implementations for remaining methods
  private requiresDataPreparation(context: ComprehensiveContext): boolean { return false; }
  private generateDataPreparationSteps(context: ComprehensiveContext, stepNumber: number): ExecutionStep[] { return []; }
  private generateAnalysisSteps(context: ComprehensiveContext, stepNumber: number): ExecutionStep[] { return []; }
  private generateFormulaImplementationSteps(context: ComprehensiveContext, stepNumber: number): Promise<ExecutionStep[]> { return Promise.resolve([]); }
  private generateValidationImplementationSteps(context: ComprehensiveContext, stepNumber: number): ExecutionStep[] { return []; }
  private optimizeExecutionSteps(steps: ExecutionStep[], config: AgentPromptConfig): ExecutionStep[] { return steps; }
  private generateApproachDescription(context: ComprehensiveContext, type: string): string { return ''; }
  private identifyApproachAdvantages(context: ComprehensiveContext, type: string): string[] { return []; }
  private identifyApproachDisadvantages(context: ComprehensiveContext, type: string): string[] { return []; }
  private assessApproachSuitability(context: ComprehensiveContext, type: string): string { return ''; }
  private calculateEstimatedTime(steps: ExecutionStep[]): number { return 0; }
  private assessApproachComplexity(steps: ExecutionStep[]): ComplexityLevel { return 'moderate'; }
  private calculateApproachConfidence(context: ComprehensiveContext, steps: ExecutionStep[]): number { return 0.8; }
  private canUseFormulaApproach(context: ComprehensiveContext): boolean { return true; }
  private canUsePivotApproach(context: ComprehensiveContext): boolean { return false; }
  private canUseVBAApproach(context: ComprehensiveContext): boolean { return false; }
  private generateFormulaBasedApproach(context: ComprehensiveContext, config: AgentPromptConfig): Promise<ExecutionApproach> { return Promise.resolve({} as ExecutionApproach); }
  private generatePivotBasedApproach(context: ComprehensiveContext, config: AgentPromptConfig): Promise<ExecutionApproach> { return Promise.resolve({} as ExecutionApproach); }
  private generateVBABasedApproach(context: ComprehensiveContext, config: AgentPromptConfig): Promise<ExecutionApproach> { return Promise.resolve({} as ExecutionApproach); }
  private generateOptionalFormulas(context: ComprehensiveContext, config: AgentPromptConfig): Promise<FormulaInstruction[]> { return Promise.resolve([]); }
  private generateValidationFormulas(context: ComprehensiveContext, config: AgentPromptConfig): Promise<FormulaInstruction[]> { return Promise.resolve([]); }
  private generateAnalysisFormulas(context: ComprehensiveContext): FormulaInstruction[] { return []; }
  private generateComparisonFormulas(context: ComprehensiveContext): FormulaInstruction[] { return []; }
  private generateSummaryFormulas(context: ComprehensiveContext): FormulaInstruction[] { return []; }
  private generateGeneralFormulas(context: ComprehensiveContext): FormulaInstruction[] { return []; }
  private enhanceFormulaInstruction(formula: FormulaInstruction, context: ComprehensiveContext): FormulaInstruction { return formula; }
  private determineCellReference(context: ComprehensiveContext, type: string): string { return 'A1'; }
  private identifyFormulaDependencies(context: ComprehensiveContext, type: string): string[] { return []; }
  private createFormulaValidation(type: string): FormulaValidation { return {} as FormulaValidation; }
  private generateFormulaAlternatives(type: string): AlternativeFormula[] { return []; }
  private assessFormulaPerformance(type: string, context: ComprehensiveContext): PerformanceMetrics { return {} as PerformanceMetrics; }
  private hasNumericData(context: ComprehensiveContext): boolean { return true; }
  private generateAverageFormula(context: ComprehensiveContext): FormulaInstruction { return {} as FormulaInstruction; }
  private generateCountFormula(context: ComprehensiveContext): FormulaInstruction { return {} as FormulaInstruction; }
  private canUseVLookup(context: ComprehensiveContext): boolean { return true; }
  private generateNaturalLanguageOutput(prompt: EnhancedAgentPrompt, config: AgentPromptConfig): any { return {}; }
  private generateStepByStepOutput(prompt: EnhancedAgentPrompt, config: AgentPromptConfig): any { return {}; }
  private generateTechnicalOutput(prompt: EnhancedAgentPrompt, config: AgentPromptConfig): any { return {}; }
  private generateFormulaOutput(prompt: EnhancedAgentPrompt, config: AgentPromptConfig): any { return {}; }
  private generateValidationOutput(prompt: EnhancedAgentPrompt, config: AgentPromptConfig): any { return {}; }
}