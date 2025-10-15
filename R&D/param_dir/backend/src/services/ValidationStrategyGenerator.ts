/**
 * Validation Strategy Generator
 * 
 * Generates comprehensive validation strategies for agent prompts including
 * data validation, formula validation, result validation, and error handling.
 */

import {
  ValidationStep,
  ErrorHandlingStep,
  TestingStrategy,
  TestCase,
  ValidationMethod,
  ValidationCriteria,
  AutomationGuidance
} from '../types/agent-prompt';
import { ComprehensiveContext } from '../types/context-synthesis';
import { IntelligentSpreadsheetData } from '../types/enhanced-intelligence';

export interface ValidationConfig {
  strictness: 'lenient' | 'standard' | 'strict' | 'critical';
  automationLevel: 'manual' | 'semi-automated' | 'fully-automated';
  includePerformanceValidation: boolean;
  includeBusinessLogicValidation: boolean;
  includeDataQualityValidation: boolean;
  includeFormulaValidation: boolean;
}

export interface ValidationPlan {
  strategy: ValidationStrategy;
  steps: ValidationStep[];
  errorHandling: ErrorHandlingStep[];
  testing: TestingStrategy;
  automation: AutomationGuidance[];
  metrics: ValidationMetrics;
}

export interface ValidationStrategy {
  approach: string;
  phases: ValidationPhase[];
  criticalPoints: CriticalValidationPoint[];
  fallbackStrategies: FallbackStrategy[];
}

export interface ValidationPhase {
  name: string;
  description: string;
  order: number;
  methods: ValidationMethod[];
  criteria: ValidationCriteria[];
  automatable: boolean;
}

export interface CriticalValidationPoint {
  location: string;
  importance: 'high' | 'critical';
  validationType: string;
  failureImpact: string;
  mitigationStrategy: string;
}

export interface FallbackStrategy {
  trigger: string;
  action: string;
  description: string;
  automatable: boolean;
}

export interface ValidationMetrics {
  coverageScore: number;
  automationScore: number;
  reliabilityScore: number;
  efficiencyScore: number;
  overallScore: number;
}

export class ValidationStrategyGenerator {
  /**
   * Generate comprehensive validation plan
   */
  generateValidationPlan(
    context: ComprehensiveContext,
    config: ValidationConfig = this.getDefaultConfig()
  ): ValidationPlan {
    const strategy = this.generateValidationStrategy(context, config);
    const steps = this.generateValidationSteps(context, config);
    const errorHandling = this.generateErrorHandlingSteps(context, config);
    const testing = this.generateTestingStrategy(context, config);
    const automation = this.generateAutomationGuidance(context, config);
    const metrics = this.calculateValidationMetrics(strategy, steps, config);

    return {
      strategy,
      steps,
      errorHandling,
      testing,
      automation,
      metrics
    };
  }

  /**
   * Generate validation strategy based on context and requirements
   */
  private generateValidationStrategy(
    context: ComprehensiveContext,
    config: ValidationConfig
  ): ValidationStrategy {
    const phases = this.generateValidationPhases(context, config);
    const criticalPoints = this.identifyCriticalValidationPoints(context, config);
    const fallbackStrategies = this.generateFallbackStrategies(context, config);

    return {
      approach: this.determineValidationApproach(context, config),
      phases,
      criticalPoints,
      fallbackStrategies
    };
  }

  /**
   * Generate detailed validation steps
   */
  private generateValidationSteps(
    context: ComprehensiveContext,
    config: ValidationConfig
  ): ValidationStep[] {
    const steps: ValidationStep[] = [];
    let stepNumber = 1;

    // Data Quality Validation
    if (config.includeDataQualityValidation) {
      steps.push(...this.generateDataQualitySteps(context, config, stepNumber));
      stepNumber += steps.length;
    }

    // Formula Validation
    if (config.includeFormulaValidation) {
      steps.push(...this.generateFormulaValidationSteps(context, config, stepNumber));
      stepNumber = steps.length + 1;
    }

    // Business Logic Validation
    if (config.includeBusinessLogicValidation) {
      steps.push(...this.generateBusinessLogicSteps(context, config, stepNumber));
      stepNumber = steps.length + 1;
    }

    // Performance Validation
    if (config.includePerformanceValidation) {
      steps.push(...this.generatePerformanceValidationSteps(context, config, stepNumber));
    }

    return steps;
  }

  /**
   * Generate data quality validation steps
   */
  private generateDataQualitySteps(
    context: ComprehensiveContext,
    config: ValidationConfig,
    startStepNumber: number
  ): ValidationStep[] {
    const steps: ValidationStep[] = [];

    // Completeness validation
    steps.push({
      stepNumber: startStepNumber,
      type: 'data',
      description: 'Validate data completeness and missing value handling',
      method: 'Check for missing values, empty cells, and data gaps',
      expectedValue: 'Less than 5% missing values in critical columns',
      tolerance: 0.05,
      criticalLevel: 'high',
      automatable: true
    });

    // Data type validation
    steps.push({
      stepNumber: startStepNumber + 1,
      type: 'data',
      description: 'Validate data types and format consistency',
      method: 'Use ISNUMBER, ISTEXT, ISDATE functions to verify data types',
      criticalLevel: 'high',
      automatable: true
    });

    // Range validation
    steps.push({
      stepNumber: startStepNumber + 2,
      type: 'data',
      description: 'Validate data ranges and outlier detection',
      method: 'Check for values outside expected ranges using statistical methods',
      criticalLevel: 'medium',
      automatable: true
    });

    // Consistency validation
    steps.push({
      stepNumber: startStepNumber + 3,
      type: 'data',
      description: 'Validate data consistency across related fields',
      method: 'Cross-reference related data points for logical consistency',
      criticalLevel: 'medium',
      automatable: config.automationLevel !== 'manual'
    });

    return steps;
  }

  /**
   * Generate formula validation steps
   */
  private generateFormulaValidationSteps(
    context: ComprehensiveContext,
    config: ValidationConfig,
    startStepNumber: number
  ): ValidationStep[] {
    const steps: ValidationStep[] = [];

    // Syntax validation
    steps.push({
      stepNumber: startStepNumber,
      type: 'formula',
      description: 'Validate formula syntax and structure',
      method: 'Check for proper parentheses, operators, and function names',
      criticalLevel: 'critical',
      automatable: true
    });

    // Reference validation
    steps.push({
      stepNumber: startStepNumber + 1,
      type: 'formula',
      description: 'Validate cell and range references',
      method: 'Ensure all references point to valid cells and ranges',
      criticalLevel: 'critical',
      automatable: true
    });

    // Logic validation
    steps.push({
      stepNumber: startStepNumber + 2,
      type: 'formula',
      description: 'Validate formula logic and calculations',
      method: 'Test formulas with known inputs and verify expected outputs',
      criticalLevel: 'high',
      automatable: false
    });

    // Error handling validation
    steps.push({
      stepNumber: startStepNumber + 3,
      type: 'formula',
      description: 'Validate error handling in formulas',
      method: 'Test formulas with invalid inputs to ensure proper error handling',
      criticalLevel: 'medium',
      automatable: true
    });

    return steps;
  }

  /**
   * Generate business logic validation steps
   */
  private generateBusinessLogicSteps(
    context: ComprehensiveContext,
    config: ValidationConfig,
    startStepNumber: number
  ): ValidationStep[] {
    const steps: ValidationStep[] = [];

    // Domain-specific validation
    steps.push({
      stepNumber: startStepNumber,
      type: 'logic',
      description: 'Validate domain-specific business rules',
      method: 'Apply business rules specific to the data domain (financial, inventory, etc.)',
      criticalLevel: 'high',
      automatable: false
    });

    // Calculation accuracy
    steps.push({
      stepNumber: startStepNumber + 1,
      type: 'result',
      description: 'Validate calculation accuracy against known benchmarks',
      method: 'Compare results with manual calculations or external sources',
      criticalLevel: 'high',
      automatable: false
    });

    // Reasonableness check
    steps.push({
      stepNumber: startStepNumber + 2,
      type: 'result',
      description: 'Perform reasonableness checks on results',
      method: 'Verify results fall within expected ranges and make business sense',
      criticalLevel: 'medium',
      automatable: config.automationLevel === 'fully-automated'
    });

    return steps;
  }

  /**
   * Generate performance validation steps
   */
  private generatePerformanceValidationSteps(
    context: ComprehensiveContext,
    config: ValidationConfig,
    startStepNumber: number
  ): ValidationStep[] {
    const steps: ValidationStep[] = [];

    // Execution time validation
    steps.push({
      stepNumber: startStepNumber,
      type: 'data',
      description: 'Validate execution time performance',
      method: 'Measure calculation time and compare against benchmarks',
      expectedValue: 'Less than 30 seconds for typical datasets',
      criticalLevel: 'low',
      automatable: true
    });

    // Memory usage validation
    steps.push({
      stepNumber: startStepNumber + 1,
      type: 'data',
      description: 'Validate memory usage efficiency',
      method: 'Monitor memory consumption during calculations',
      criticalLevel: 'low',
      automatable: true
    });

    return steps;
  }

  /**
   * Generate comprehensive error handling steps
   */
  private generateErrorHandlingSteps(
    context: ComprehensiveContext,
    config: ValidationConfig
  ): ErrorHandlingStep[] {
    const steps: ErrorHandlingStep[] = [];

    // Formula errors
    steps.push({
      errorType: 'Formula Error (#DIV/0!, #N/A, #VALUE!, etc.)',
      description: 'Excel formula returns standard error values',
      detectionMethod: 'Use ISERROR, ISNA, or specific error checking functions',
      resolution: 'Implement IFERROR or IFNA wrapper functions with appropriate fallback values',
      preventionStrategy: 'Validate inputs before calculation and use defensive programming',
      fallbackAction: 'Display user-friendly error message or default value',
      severity: 'high'
    });

    // Data type errors
    steps.push({
      errorType: 'Data Type Mismatch',
      description: 'Formula expects specific data type but receives incompatible data',
      detectionMethod: 'Use TYPE, ISNUMBER, ISTEXT functions to validate data types',
      resolution: 'Convert data types using VALUE, TEXT, or DATEVALUE functions',
      preventionStrategy: 'Implement data validation rules and input formatting',
      fallbackAction: 'Skip invalid entries with warning or use default values',
      severity: 'medium'
    });

    // Range reference errors
    steps.push({
      errorType: 'Invalid Range Reference',
      description: 'Formula references cells or ranges that don\'t exist or are empty',
      detectionMethod: 'Check range validity using COUNTA or ISBLANK functions',
      resolution: 'Use dynamic range references or adjust formulas to handle empty ranges',
      preventionStrategy: 'Use named ranges, table references, or OFFSET/COUNTA combinations',
      fallbackAction: 'Use alternative range or prompt user for correct range',
      severity: 'high'
    });

    // Circular reference errors
    steps.push({
      errorType: 'Circular Reference',
      description: 'Formula creates circular dependency in calculations',
      detectionMethod: 'Excel will display circular reference warning',
      resolution: 'Restructure formulas to eliminate circular dependencies',
      preventionStrategy: 'Plan formula dependencies and use helper columns when needed',
      fallbackAction: 'Break circular reference by using iterative calculation or restructuring',
      severity: 'critical'
    });

    // Performance errors
    steps.push({
      errorType: 'Performance Degradation',
      description: 'Calculations take too long or cause Excel to become unresponsive',
      detectionMethod: 'Monitor calculation time and system responsiveness',
      resolution: 'Optimize formulas, use array formulas, or break into smaller chunks',
      preventionStrategy: 'Design efficient formulas and avoid volatile functions when possible',
      fallbackAction: 'Simplify calculations or process data in smaller batches',
      severity: 'medium'
    });

    return steps;
  }

  /**
   * Generate comprehensive testing strategy
   */
  private generateTestingStrategy(
    context: ComprehensiveContext,
    config: ValidationConfig
  ): TestingStrategy {
    return {
      unitTests: this.generateUnitTests(context, config),
      integrationTests: this.generateIntegrationTests(context, config),
      validationTests: this.generateValidationTests(context, config),
      performanceTests: this.generatePerformanceTests(context, config)
    };
  }

  /**
   * Generate unit tests for individual components
   */
  private generateUnitTests(
    context: ComprehensiveContext,
    config: ValidationConfig
  ): TestCase[] {
    const tests: TestCase[] = [];

    // Formula accuracy tests
    tests.push({
      name: 'Basic Formula Accuracy',
      description: 'Test individual formulas with known inputs and expected outputs',
      input: { values: [1, 2, 3, 4, 5], operation: 'SUM' },
      expectedOutput: 15,
      validationCriteria: ['Result equals expected value', 'No error values returned'],
      automatable: true,
      priority: 'critical'
    });

    // Edge case tests
    tests.push({
      name: 'Edge Case Handling',
      description: 'Test formulas with edge cases (empty cells, zero values, text in numeric fields)',
      input: { values: [null, 0, '', 'text', 5], operation: 'SUM' },
      expectedOutput: 5,
      validationCriteria: ['Handles null and empty values correctly', 'Ignores text values appropriately'],
      automatable: true,
      priority: 'high'
    });

    // Data type validation tests
    tests.push({
      name: 'Data Type Validation',
      description: 'Test data type detection and handling',
      input: { mixed_data: [123, '456', true, new Date(), null] },
      expectedOutput: { numbers: 2, text: 1, boolean: 1, date: 1, null: 1 },
      validationCriteria: ['Correctly identifies all data types', 'Handles mixed data appropriately'],
      automatable: true,
      priority: 'high'
    });

    return tests;
  }

  /**
   * Generate integration tests for complete workflows
   */
  private generateIntegrationTests(
    context: ComprehensiveContext,
    config: ValidationConfig
  ): TestCase[] {
    const tests: TestCase[] = [];

    // End-to-end workflow test
    tests.push({
      name: 'Complete Analysis Workflow',
      description: 'Test entire analysis process from data input to final results',
      input: 'Complete sample dataset',
      expectedOutput: 'Final analysis results with all calculations completed',
      validationCriteria: [
        'All steps execute without errors',
        'Results are within expected ranges',
        'Performance meets requirements'
      ],
      automatable: false,
      priority: 'critical'
    });

    // Data integration test
    tests.push({
      name: 'Multi-Source Data Integration',
      description: 'Test integration of data from multiple sources or sheets',
      input: 'Data from multiple worksheets or files',
      expectedOutput: 'Correctly integrated and analyzed data',
      validationCriteria: [
        'Data correctly merged from all sources',
        'No data loss during integration',
        'Relationships maintained correctly'
      ],
      automatable: false,
      priority: 'high'
    });

    return tests;
  }

  /**
   * Generate validation-specific tests
   */
  private generateValidationTests(
    context: ComprehensiveContext,
    config: ValidationConfig
  ): TestCase[] {
    const tests: TestCase[] = [];

    // Data quality validation test
    tests.push({
      name: 'Data Quality Assessment',
      description: 'Test data quality validation rules and thresholds',
      input: 'Dataset with known quality issues',
      expectedOutput: 'Quality assessment report with identified issues',
      validationCriteria: [
        'All quality issues correctly identified',
        'Quality scores within expected ranges',
        'Recommendations provided for improvements'
      ],
      automatable: true,
      priority: 'high'
    });

    // Business rule validation test
    tests.push({
      name: 'Business Rule Compliance',
      description: 'Test compliance with domain-specific business rules',
      input: 'Data that violates known business rules',
      expectedOutput: 'Business rule violation report',
      validationCriteria: [
        'All rule violations detected',
        'Appropriate severity levels assigned',
        'Corrective actions suggested'
      ],
      automatable: false,
      priority: 'high'
    });

    return tests;
  }

  /**
   * Generate performance tests
   */
  private generatePerformanceTests(
    context: ComprehensiveContext,
    config: ValidationConfig
  ): TestCase[] {
    const tests: TestCase[] = [];

    // Large dataset performance test
    tests.push({
      name: 'Large Dataset Performance',
      description: 'Test performance with large datasets (10,000+ rows)',
      input: 'Large dataset with 10,000+ rows',
      expectedOutput: 'Analysis completed within acceptable time limits',
      validationCriteria: [
        'Calculation completes within 60 seconds',
        'Memory usage remains reasonable',
        'Excel remains responsive during calculation'
      ],
      automatable: true,
      priority: 'medium'
    });

    // Formula efficiency test
    tests.push({
      name: 'Formula Efficiency Comparison',
      description: 'Compare performance of different formula approaches',
      input: 'Same calculation using different formula methods',
      expectedOutput: 'Performance comparison report',
      validationCriteria: [
        'All methods produce same results',
        'Performance differences documented',
        'Recommendations for optimal approach'
      ],
      automatable: true,
      priority: 'low'
    });

    return tests;
  }

  /**
   * Generate automation guidance
   */
  private generateAutomationGuidance(
    context: ComprehensiveContext,
    config: ValidationConfig
  ): AutomationGuidance[] {
    const guidance: AutomationGuidance[] = [];

    // Formula validation automation
    guidance.push({
      area: 'Formula Validation',
      method: 'Automated formula testing with predefined test cases',
      tools: ['Excel VBA', 'Power Query', 'Custom validation functions'],
      implementation: 'Create validation macros that test formulas with known inputs',
      benefits: ['Consistent testing', 'Faster validation', 'Reduced human error'],
      limitations: ['Requires VBA knowledge', 'May not catch all edge cases']
    });

    // Data quality automation
    guidance.push({
      area: 'Data Quality Assessment',
      method: 'Automated data profiling and quality scoring',
      tools: ['Excel functions', 'Conditional formatting', 'Data validation rules'],
      implementation: 'Use built-in Excel features to automatically flag data quality issues',
      benefits: ['Real-time quality monitoring', 'Visual indicators', 'Preventive validation'],
      limitations: ['Limited to Excel capabilities', 'May require manual review']
    });

    // Performance monitoring automation
    if (config.includePerformanceValidation) {
      guidance.push({
        area: 'Performance Monitoring',
        method: 'Automated performance benchmarking',
        tools: ['VBA timing functions', 'Application.CalculationState monitoring'],
        implementation: 'Create performance monitoring macros that track calculation times',
        benefits: ['Objective performance measurement', 'Trend analysis', 'Early warning system'],
        limitations: ['Requires macro-enabled workbooks', 'May impact performance during monitoring']
      });
    }

    return guidance;
  }

  // === HELPER METHODS ===

  private getDefaultConfig(): ValidationConfig {
    return {
      strictness: 'standard',
      automationLevel: 'semi-automated',
      includePerformanceValidation: true,
      includeBusinessLogicValidation: true,
      includeDataQualityValidation: true,
      includeFormulaValidation: true
    };
  }

  private determineValidationApproach(context: ComprehensiveContext, config: ValidationConfig): string {
    switch (config.strictness) {
      case 'critical':
        return 'Multi-layered validation with comprehensive testing and manual verification';
      case 'strict':
        return 'Thorough validation with automated testing and selective manual checks';
      case 'standard':
        return 'Balanced validation approach with key automated checks and targeted manual validation';
      case 'lenient':
        return 'Basic validation focusing on critical errors and essential checks';
      default:
        return 'Standard validation approach';
    }
  }

  private generateValidationPhases(context: ComprehensiveContext, config: ValidationConfig): ValidationPhase[] {
    return [
      {
        name: 'Pre-Processing Validation',
        description: 'Validate data quality and structure before analysis',
        order: 1,
        methods: [],
        criteria: [],
        automatable: true
      },
      {
        name: 'Formula Validation',
        description: 'Validate formula syntax, logic, and accuracy',
        order: 2,
        methods: [],
        criteria: [],
        automatable: config.automationLevel !== 'manual'
      },
      {
        name: 'Result Validation',
        description: 'Validate final results and business logic',
        order: 3,
        methods: [],
        criteria: [],
        automatable: false
      },
      {
        name: 'Post-Processing Validation',
        description: 'Final checks and quality assurance',
        order: 4,
        methods: [],
        criteria: [],
        automatable: config.automationLevel === 'fully-automated'
      }
    ];
  }

  private identifyCriticalValidationPoints(context: ComprehensiveContext, config: ValidationConfig): CriticalValidationPoint[] {
    return [
      {
        location: 'Data Input Stage',
        importance: 'critical',
        validationType: 'Data Quality',
        failureImpact: 'Incorrect analysis results throughout entire process',
        mitigationStrategy: 'Implement comprehensive data validation rules and quality checks'
      },
      {
        location: 'Formula Calculation Stage',
        importance: 'critical',
        validationType: 'Formula Accuracy',
        failureImpact: 'Incorrect calculations and unreliable results',
        mitigationStrategy: 'Test formulas with known inputs and implement error handling'
      },
      {
        location: 'Final Results Stage',
        importance: 'high',
        validationType: 'Business Logic',
        failureImpact: 'Results that don\'t make business sense or violate domain rules',
        mitigationStrategy: 'Apply domain-specific validation rules and reasonableness checks'
      }
    ];
  }

  private generateFallbackStrategies(context: ComprehensiveContext, config: ValidationConfig): FallbackStrategy[] {
    return [
      {
        trigger: 'Data quality issues detected',
        action: 'Clean data using automated rules or flag for manual review',
        description: 'When data quality falls below acceptable thresholds',
        automatable: config.automationLevel !== 'manual'
      },
      {
        trigger: 'Formula errors encountered',
        action: 'Use alternative calculation methods or simplified formulas',
        description: 'When primary formulas fail or produce errors',
        automatable: false
      },
      {
        trigger: 'Performance issues detected',
        action: 'Switch to optimized calculation methods or process in smaller chunks',
        description: 'When calculations take too long or cause system issues',
        automatable: true
      }
    ];
  }

  private calculateValidationMetrics(strategy: ValidationStrategy, steps: ValidationStep[], config: ValidationConfig): ValidationMetrics {
    const coverageScore = this.calculateCoverageScore(steps);
    const automationScore = this.calculateAutomationScore(steps, config);
    const reliabilityScore = this.calculateReliabilityScore(strategy, steps);
    const efficiencyScore = this.calculateEfficiencyScore(steps, config);
    const overallScore = (coverageScore + automationScore + reliabilityScore + efficiencyScore) / 4;

    return {
      coverageScore,
      automationScore,
      reliabilityScore,
      efficiencyScore,
      overallScore
    };
  }

  private calculateCoverageScore(steps: ValidationStep[]): number {
    // Calculate based on types of validation covered
    const validationTypes = new Set(steps.map(step => step.type));
    const maxTypes = 5; // data, formula, result, format, logic
    return (validationTypes.size / maxTypes) * 100;
  }

  private calculateAutomationScore(steps: ValidationStep[], config: ValidationConfig): number {
    const automatableSteps = steps.filter(step => step.automatable).length;
    return (automatableSteps / steps.length) * 100;
  }

  private calculateReliabilityScore(strategy: ValidationStrategy, steps: ValidationStep[]): number {
    const criticalSteps = steps.filter(step => step.criticalLevel === 'critical' || step.criticalLevel === 'high').length;
    return (criticalSteps / steps.length) * 100;
  }

  private calculateEfficiencyScore(steps: ValidationStep[], config: ValidationConfig): number {
    // Higher automation and fewer manual steps = higher efficiency
    const manualSteps = steps.filter(step => !step.automatable).length;
    return Math.max(0, 100 - (manualSteps / steps.length) * 100);
  }
}