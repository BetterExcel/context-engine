/**
 * Enhanced Agent Prompt Generator Example
 * 
 * Demonstrates how to use the enhanced agent prompt generation system
 * to create comprehensive, executable agent instructions.
 */

import { EnhancedAgentPromptGenerator } from '../services/EnhancedAgentPromptGenerator';
import { ExcelFormulaGenerator } from '../services/ExcelFormulaGenerator';
import { ExecutionStepOptimizer } from '../services/ExecutionStepOptimizer';
import { ValidationStrategyGenerator } from '../services/ValidationStrategyGenerator';
import {
  ComprehensiveContext,
  ComplexityLevel,
  AgentPromptConfig,
  EnhancedAgentPrompt
} from '../types';

async function demonstrateEnhancedAgentPromptGeneration() {
  console.log('🚀 Enhanced Agent Prompt Generator Demo\n');

  // Create sample comprehensive context
  const sampleContext: ComprehensiveContext = {
    id: 'demo-context-1',
    timestamp: new Date(),
    query: 'Calculate portfolio performance metrics and risk analysis',
    
    dataContext: {
      spreadsheetData: {} as any,
      selectedRanges: [],
      relationshipMap: {} as any,
      dataQuality: {
        overallScore: 0.92,
        completeness: 0.95,
        accuracy: 0.94,
        consistency: 0.89,
        timeliness: 0.96,
        issues: []
      },
      dataCharacteristics: {
        size: { rows: 500, columns: 15, cells: 7500, nonEmptyCells: 7200, dataVolume: 'medium' },
        complexity: { level: 'MODERATE' as any, factors: [], score: 0.7 },
        structure: { type: 'financial_portfolio', organization: 'structured', hierarchical: false, normalized: true },
        temporality: { hasTimeData: true, timeColumns: ['Date', 'Quarter'], frequency: 'daily', coverage: 'complete' },
        relationships: { density: 0.8, complexity: 'moderate', types: ['correlation', 'dependency'], strength: 0.85 }
      }
    },
    
    businessContext: {
      domain: { 
        primaryDomain: 'financial' as any, 
        subDomains: [], 
        confidence: 0.95, 
        applicableRules: [], 
        suggestedMetrics: [],
        detectedPatterns: []
      },
      useCase: { 
        primary: 'portfolio_performance_analysis', 
        secondary: ['risk_assessment', 'compliance_reporting'], 
        context: 'quarterly_review', 
        objectives: ['measure_performance', 'assess_risk', 'optimize_allocation'] 
      },
      stakeholders: [
        { type: 'portfolio_manager', role: 'primary_user', interests: ['performance', 'risk'], influence: 0.9 }
      ],
      objectives: [
        { id: 'obj1', description: 'Calculate quarterly returns', priority: 1, measurable: true, timeframe: 'immediate' }
      ],
      constraints: [
        { type: 'regulatory', description: 'SEC compliance requirements', severity: 'high', impact: ['reporting'] }
      ]
    },
    
    analyticalContext: {
      intent: {
        query: {
          original: 'Calculate portfolio performance metrics and risk analysis',
          normalized: 'calculate portfolio performance metrics risk analysis',
          entities: [],
          tokens: []
        },
        intent: {
          primary: { type: 'data_analysis' as any, confidence: 0.95, reasoning: ['financial_calculations'], matchedPatterns: [], domainSpecific: true },
          secondary: [],
          confidence: 0.95,
          ambiguities: [],
          clarificationNeeded: false
        },
        scope: {
          dataScope: 'portfolio_level' as any,
          analyticalScope: 'comprehensive' as any,
          temporalScope: 'quarterly' as any
        },
        context: {
          businessContext: {} as any,
          userContext: {} as any,
          sessionContext: {} as any
        }
      },
      analysisType: [
        { name: 'performance_analysis', category: 'financial', complexity: 'moderate', requirements: ['returns_calculation'] },
        { name: 'risk_analysis', category: 'financial', complexity: 'complex', requirements: ['volatility_calculation', 'var_calculation'] }
      ],
      requiredMetrics: [
        { name: 'total_return', type: 'percentage', dependencies: ['price_data'], priority: 1 },
        { name: 'sharpe_ratio', type: 'ratio', formula: '(return - risk_free_rate) / volatility', dependencies: ['returns', 'risk_free_rate', 'volatility'], priority: 2 }
      ],
      comparisons: [],
      benchmarks: [],
      validationRules: []
    },
    
    insights: [
      {
        id: 'insight-1',
        type: 'trend' as any,
        category: 'performance' as any,
        title: 'Strong Performance Trend',
        description: 'Portfolio shows consistent outperformance over benchmark',
        evidence: [{ type: 'statistical', description: 'Returns exceed benchmark by 2.3%', strength: 0.9, source: 'performance_data' }],
        confidence: 0.88,
        impact: { magnitude: 0.8, scope: ['portfolio_value'], timeframe: 'quarterly', confidence: 0.85 },
        actionability: { score: 0.9, factors: [], recommendations: ['Continue current strategy', 'Consider increasing allocation'] },
        priority: 'high' as any,
        relatedInsights: [],
        tags: ['performance', 'outperformance']
      }
    ],
    
    risks: [
      {
        id: 'risk-1',
        type: 'market' as any,
        category: 'short_term' as any,
        title: 'Concentration Risk',
        description: 'High concentration in technology sector increases volatility risk',
        probability: 0.65,
        impact: 'moderate' as any,
        severity: 'medium' as any,
        evidence: [{ type: 'sector_analysis', description: '45% allocation to tech sector', strength: 0.9, source: 'allocation_data' }],
        mitigationStrategies: [
          { id: 'mit1', description: 'Diversify across sectors', effectiveness: 0.8, cost: 'low', timeframe: '1-2 months' }
        ],
        timeframe: { immediate: false, shortTerm: true, mediumTerm: false, longTerm: false },
        affectedAreas: ['portfolio_volatility', 'risk_metrics'],
        confidence: 0.82
      }
    ],
    
    opportunities: [
      {
        id: 'opp-1',
        type: 'efficiency_improvement' as any,
        category: 'medium_term' as any,
        title: 'Rebalancing Opportunity',
        description: 'Systematic rebalancing could improve risk-adjusted returns',
        potential: { quantitative: 0.15, qualitative: 'moderate improvement', currency: 'percentage', timeframe: 'annual' },
        feasibility: { technical: 0.9, financial: 0.85, operational: 0.8, strategic: 0.9, overall: 0.86 },
        evidence: [{ type: 'backtesting', description: 'Historical analysis shows 1.5% improvement', strength: 0.85, source: 'backtest_results' }],
        requirements: [
          { type: 'process', description: 'Implement systematic rebalancing', priority: 'high', effort: 'medium' }
        ],
        timeframe: { implementation: '2-3 months', realization: '6-12 months', duration: 'ongoing' },
        confidence: 0.78,
        priority: 'medium' as any
      }
    ],
    
    patterns: [],
    
    confidence: {
      score: 0.89,
      level: 'high' as any,
      components: [
        { name: 'data_quality', score: 0.92, weight: 0.3, description: 'High quality financial data', evidence: ['complete_price_data', 'verified_transactions'] },
        { name: 'domain_knowledge', score: 0.88, weight: 0.4, description: 'Strong financial domain understanding', evidence: ['recognized_patterns', 'validated_metrics'] },
        { name: 'intent_clarity', score: 0.87, weight: 0.3, description: 'Clear analytical intent', evidence: ['specific_metrics', 'defined_scope'] }
      ],
      factors: [
        { type: 'positive' as any, name: 'Data Completeness', impact: 0.25, description: 'Complete historical data available', evidence: ['full_price_series'] },
        { type: 'positive' as any, name: 'Domain Expertise', impact: 0.35, description: 'Strong financial analysis capabilities', evidence: ['validated_formulas'] },
        { type: 'negative' as any, name: 'Market Volatility', impact: -0.1, description: 'Current market conditions add uncertainty', evidence: ['increased_volatility'] }
      ],
      uncertainty: {
        dataUncertainty: 0.08,
        modelUncertainty: 0.12,
        contextualUncertainty: 0.09,
        overallUncertainty: 0.11,
        uncertaintyFactors: [
          { source: 'data_quality' as any, magnitude: 0.08, description: 'Minor data quality issues' },
          { source: 'model_limitations' as any, magnitude: 0.12, description: 'Model assumptions and limitations' }
        ],
        confidenceInterval: { lower: 0.78, upper: 0.94, level: 0.95 }
      },
      reliability: {
        consistency: 0.91,
        stability: 0.87,
        reproducibility: 0.89,
        validity: 0.92
      }
    },
    
    reliability: {
      dataReliability: 0.92,
      methodReliability: 0.88,
      contextReliability: 0.85,
      overallReliability: 0.88,
      factors: [
        { name: 'data_source_quality', impact: 0.3, description: 'High quality data sources' },
        { name: 'methodology_validation', impact: 0.25, description: 'Validated analytical methods' }
      ]
    },
    
    nextSteps: [
      {
        id: 'step-1',
        type: 'analytical' as any,
        title: 'Calculate Performance Metrics',
        description: 'Calculate comprehensive portfolio performance metrics including returns, volatility, and risk-adjusted measures',
        priority: 'critical' as any,
        effort: 'medium' as any,
        impact: 'major' as any,
        timeframe: { start: 'immediate', duration: '2-3 hours', milestones: ['data_validation', 'calculation_completion', 'results_review'] },
        prerequisites: ['data_quality_check', 'benchmark_data_availability'],
        steps: [
          { order: 1, description: 'Validate input data quality', duration: '30 minutes', dependencies: [] },
          { order: 2, description: 'Calculate basic return metrics', duration: '45 minutes', dependencies: ['step1'] },
          { order: 3, description: 'Calculate risk metrics', duration: '60 minutes', dependencies: ['step2'] }
        ],
        resources: [
          { type: 'data', description: 'Historical price data', quantity: 'complete', availability: 'available' },
          { type: 'benchmark', description: 'Market benchmark data', quantity: 'required', availability: 'available' }
        ],
        risks: [
          { description: 'Data quality issues', probability: 0.15, impact: 'medium', mitigation: 'Implement data validation checks' }
        ],
        success_criteria: [
          'All performance metrics calculated accurately',
          'Risk metrics within expected ranges',
          'Results validated against benchmarks'
        ]
      }
    ],
    
    alternatives: [],
    processingTime: 2500,
    dataQuality: 0.92,
    complexity: 'MODERATE' as any
  };

  // Configuration for comprehensive output
  const config: AgentPromptConfig = {
    outputFormat: 'comprehensive',
    detailLevel: 'detailed',
    includeAlternatives: true,
    includeValidation: true,
    includeOptimization: true,
    includeTesting: true,
    targetAudience: 'intermediate',
    complexityPreference: 'moderate'
  };

  // Initialize the generator
  const generator = new EnhancedAgentPromptGenerator();

  try {
    console.log('📋 Generating Enhanced Agent Prompt...\n');
    
    // Generate the comprehensive agent prompt
    const agentPrompt: EnhancedAgentPrompt = await generator.generateAgentPrompt(sampleContext, config);
    
    console.log('✅ Agent Prompt Generated Successfully!\n');
    
    // Display key components
    console.log('📊 Prompt Metadata:');
    console.log(`  - ID: ${agentPrompt.metadata.promptId}`);
    console.log(`  - Complexity: ${agentPrompt.metadata.estimatedComplexity}`);
    console.log(`  - Confidence: ${(agentPrompt.metadata.confidence.score * 100).toFixed(1)}%`);
    console.log(`  - Generation Time: ${agentPrompt.metadata.generationTime}ms\n`);
    
    console.log('📝 Instructions Summary:');
    console.log(`  ${agentPrompt.instructions.summary}\n`);
    
    console.log('🎯 Natural Language Instructions:');
    console.log(`  ${agentPrompt.instructions.naturalLanguage.substring(0, 200)}...\n`);
    
    console.log('⚡ Execution Steps:');
    agentPrompt.instructions.stepByStep.slice(0, 3).forEach((step, index) => {
      console.log(`  ${index + 1}. ${step.action}`);
      console.log(`     - ${step.description}`);
      console.log(`     - Expected: ${step.expectedResult}`);
      console.log(`     - Time: ${step.estimatedTime}s\n`);
    });
    
    console.log('📐 Required Formulas:');
    agentPrompt.formulas.required.slice(0, 2).forEach((formula, index) => {
      console.log(`  ${index + 1}. ${formula.purpose}`);
      console.log(`     - Formula: ${formula.formula}`);
      console.log(`     - Cell: ${formula.cellReference}\n`);
    });
    
    console.log('✅ Validation Steps:');
    agentPrompt.execution.validationSteps.slice(0, 2).forEach((step, index) => {
      console.log(`  ${index + 1}. ${step.description}`);
      console.log(`     - Method: ${step.method}`);
      console.log(`     - Critical Level: ${step.criticalLevel}\n`);
    });
    
    console.log('🔧 Optimization Recommendations:');
    agentPrompt.optimization.performance.slice(0, 2).forEach((opt, index) => {
      console.log(`  ${index + 1}. ${opt.area}: ${opt.recommendation}`);
      console.log(`     - Impact: ${opt.impact}, Effort: ${opt.effort}\n`);
    });
    
    // Generate multi-format output
    console.log('🎨 Generating Multi-Format Output...\n');
    const multiFormat = await generator.generateMultiFormatOutput(agentPrompt, config);
    
    console.log('📊 Available Output Formats:');
    console.log('  ✓ Natural Language');
    console.log('  ✓ Step-by-Step Guide');
    console.log('  ✓ Technical Documentation');
    console.log('  ✓ Formula Instructions');
    console.log('  ✓ Validation Guidelines\n');
    
    // Demonstrate integration with other services
    console.log('🔗 Integration Examples:\n');
    
    // Excel Formula Generator
    const formulaGenerator = new ExcelFormulaGenerator();
    const lookupFormula = formulaGenerator.generateLookupFormula(
      'A2', 
      'B:D', 
      2, 
      true, 
      { excelVersion: 'Excel365', preferArrayFormulas: true, includeErrorHandling: true, optimizeForPerformance: true, includeComments: true }
    );
    console.log('📐 Excel Formula Example:');
    console.log(`  Purpose: ${lookupFormula.purpose}`);
    console.log(`  Formula: ${lookupFormula.formula}\n`);
    
    // Execution Step Optimizer
    const optimizer = new ExecutionStepOptimizer();
    const optimizationResult = optimizer.optimizeSteps(
      agentPrompt.instructions.stepByStep, 
      sampleContext, 
      config
    );
    console.log('⚡ Optimization Results:');
    console.log(`  Original Steps: ${optimizationResult.originalSteps.length}`);
    console.log(`  Optimized Steps: ${optimizationResult.optimizedSteps.length}`);
    console.log(`  Improvements: ${optimizationResult.improvements.length}`);
    console.log(`  Overall Score: ${optimizationResult.metrics.overallScore.toFixed(1)}/100\n`);
    
    // Validation Strategy Generator
    const validationGenerator = new ValidationStrategyGenerator();
    const validationPlan = validationGenerator.generateValidationPlan(sampleContext, {
      strictness: 'standard',
      automationLevel: 'semi-automated',
      includePerformanceValidation: true,
      includeBusinessLogicValidation: true,
      includeDataQualityValidation: true,
      includeFormulaValidation: true
    });
    console.log('✅ Validation Strategy:');
    console.log(`  Approach: ${validationPlan.strategy.approach}`);
    console.log(`  Validation Steps: ${validationPlan.steps.length}`);
    console.log(`  Error Handling Steps: ${validationPlan.errorHandling.length}`);
    console.log(`  Coverage Score: ${validationPlan.metrics.coverageScore.toFixed(1)}%\n`);
    
    console.log('🎉 Enhanced Agent Prompt Generation Demo Complete!');
    console.log('\nKey Benefits:');
    console.log('  ✓ Comprehensive multi-format instructions');
    console.log('  ✓ Validated Excel formulas with error handling');
    console.log('  ✓ Optimized execution steps');
    console.log('  ✓ Robust validation strategies');
    console.log('  ✓ Performance and accuracy optimization');
    console.log('  ✓ Alternative approaches and fallback strategies');
    
  } catch (error) {
    console.error('❌ Error during agent prompt generation:', error);
  }
}

// Run the demonstration
if (require.main === module) {
  demonstrateEnhancedAgentPromptGeneration()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Demo failed:', error);
      process.exit(1);
    });
}

export { demonstrateEnhancedAgentPromptGeneration };