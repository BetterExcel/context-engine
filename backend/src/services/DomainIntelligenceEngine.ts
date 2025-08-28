/**
 * Domain Intelligence Engine
 * Main orchestrator for domain-specific analysis and business intelligence
 */

import {
  DomainClassification,
  DomainEnhancedAnalysis,
  DomainPattern,
  MetricDefinition,
  FinancialFormula,
  KPIDefinition,
  BusinessInsight,
  DomainRecommendation,
  RiskAssessment
} from '../types/domain-intelligence';
import { IntelligentSpreadsheetData, DomainType } from '../types/enhanced-intelligence';
import { FinancialDomainService } from './FinancialDomainService';
import { BusinessIntelligenceService } from './BusinessIntelligenceService';

export class DomainIntelligenceEngine {
  private financialService: FinancialDomainService;
  private businessService: BusinessIntelligenceService;

  constructor() {
    this.financialService = new FinancialDomainService();
    this.businessService = new BusinessIntelligenceService();
  }

  /**
   * Identify the primary domain of the spreadsheet data
   */
  public identifyDomain(data: IntelligentSpreadsheetData): DomainClassification {
    const financialPatterns = this.financialService.detectFinancialPatterns(data);
    const businessPatterns = this.businessService.detectBusinessPatterns(data);

    // Calculate domain scores
    const financialScore = this.calculateDomainScore(financialPatterns);
    const businessScore = this.calculateDomainScore(businessPatterns);

    // Determine primary domain
    let primaryDomain: DomainType;
    let confidence: number;
    let detectedPatterns: DomainPattern[];

    if (financialScore > businessScore && financialScore > 0.3) {
      primaryDomain = DomainType.FINANCIAL;
      confidence = financialScore;
      detectedPatterns = financialPatterns;
    } else if (businessScore > 0.3) {
      primaryDomain = this.determinePrimaryBusinessDomain(businessPatterns);
      confidence = businessScore;
      detectedPatterns = businessPatterns;
    } else {
      primaryDomain = DomainType.GENERAL;
      confidence = 0.5;
      detectedPatterns = [...financialPatterns, ...businessPatterns];
    }

    // Determine sub-domains
    const subDomains = this.identifySubDomains(detectedPatterns, primaryDomain);

    // Get applicable rules and metrics
    const applicableRules = this.getApplicableRules(primaryDomain, detectedPatterns);
    const suggestedMetrics = this.getSuggestedMetrics(primaryDomain, detectedPatterns);

    return {
      primaryDomain,
      subDomains,
      confidence,
      applicableRules,
      suggestedMetrics,
      detectedPatterns
    };
  }

  /**
   * Apply domain knowledge to enhance analysis
   */
  public applyDomainKnowledge(
    data: IntelligentSpreadsheetData,
    domainClassification: DomainClassification
  ): DomainEnhancedAnalysis {
    const { primaryDomain, detectedPatterns } = domainClassification;

    // Get applicable metrics and formulas
    const applicableMetrics = this.getApplicableMetrics(primaryDomain, detectedPatterns);
    const suggestedFormulas = this.getSuggestedFormulas(primaryDomain, detectedPatterns);
    const kpiRecommendations = this.getKPIRecommendations(primaryDomain, detectedPatterns);

    // Generate insights
    const businessInsights = this.generateDomainInsights(data, primaryDomain, detectedPatterns);

    // Assess risks (primarily for financial domain)
    const riskAssessment = primaryDomain === DomainType.FINANCIAL 
      ? this.financialService.assessFinancialRisk(data, detectedPatterns)
      : undefined;

    // Generate recommendations
    const recommendations = this.generateDomainRecommendations(
      primaryDomain, 
      detectedPatterns, 
      businessInsights
    );

    // Get template matches (for portfolio analysis)
    const templateMatches = primaryDomain === DomainType.FINANCIAL 
      ? [] // Would implement portfolio template matching
      : [];

    return {
      domainClassification,
      applicableMetrics,
      suggestedFormulas,
      kpiRecommendations,
      templateMatches,
      businessInsights,
      riskAssessment,
      recommendations
    };
  }

  /**
   * Suggest domain-specific actions based on analysis
   */
  public suggestDomainSpecificActions(analysis: DomainEnhancedAnalysis): DomainRecommendation[] {
    const actions: DomainRecommendation[] = [];

    // Add formula recommendations
    for (const formula of analysis.suggestedFormulas.slice(0, 3)) {
      actions.push({
        type: 'formula',
        priority: 'medium',
        title: `Implement ${formula.name}`,
        description: formula.description,
        implementation: `Use formula: ${formula.excelSyntax}`,
        expectedBenefit: `Calculate ${formula.name} for better analysis`,
        effort: 'low'
      });
    }

    // Add KPI recommendations
    for (const kpi of analysis.kpiRecommendations.slice(0, 2)) {
      actions.push({
        type: 'analysis',
        priority: 'high',
        title: `Track ${kpi.name}`,
        description: kpi.description,
        implementation: `Calculate using: ${kpi.formula}`,
        expectedBenefit: `Monitor ${kpi.name} for performance insights`,
        effort: 'medium'
      });
    }

    // Add visualization recommendations
    if (analysis.businessInsights.length > 0) {
      actions.push({
        type: 'visualization',
        priority: 'medium',
        title: 'Create Domain-Specific Dashboard',
        description: 'Build visualizations tailored to your domain',
        implementation: 'Create charts and graphs for key metrics and trends',
        expectedBenefit: 'Improved data visualization and insights',
        effort: 'medium'
      });
    }

    return [...actions, ...analysis.recommendations];
  }

  /**
   * Validate domain logic and business rules
   */
  public validateDomainLogic(
    data: IntelligentSpreadsheetData,
    domainClassification: DomainClassification
  ): { isValid: boolean; violations: string[]; suggestions: string[] } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Apply domain-specific validation rules
    for (const rule of domainClassification.applicableRules) {
      const violation = this.checkBusinessRule(data, rule);
      if (violation) {
        violations.push(violation);
        if (rule.suggestedFix) {
          suggestions.push(rule.suggestedFix);
        }
      }
    }

    // Domain-specific validations
    switch (domainClassification.primaryDomain) {
      case DomainType.FINANCIAL:
        const financialValidation = this.validateFinancialData(data);
        violations.push(...financialValidation.violations);
        suggestions.push(...financialValidation.suggestions);
        break;
      case DomainType.BUSINESS:
        const businessValidation = this.validateBusinessData(data);
        violations.push(...businessValidation.violations);
        suggestions.push(...businessValidation.suggestions);
        break;
    }

    return {
      isValid: violations.length === 0,
      violations,
      suggestions
    };
  }

  // Private helper methods

  private calculateDomainScore(patterns: DomainPattern[]): number {
    if (patterns.length === 0) return 0;
    
    const totalConfidence = patterns.reduce((sum, pattern) => sum + pattern.confidence, 0);
    const averageConfidence = totalConfidence / patterns.length;
    
    // Weight by number of patterns detected
    const patternWeight = Math.min(patterns.length / 3, 1); // Max weight at 3+ patterns
    
    return averageConfidence * patternWeight;
  }

  private determinePrimaryBusinessDomain(patterns: DomainPattern[]): DomainType {
    // Count pattern types to determine most likely business domain
    const patternCounts = new Map<string, number>();
    
    for (const pattern of patterns) {
      const count = patternCounts.get(pattern.type) || 0;
      patternCounts.set(pattern.type, count + 1);
    }

    // Map patterns to domains
    if (patternCounts.has('sales_data')) return DomainType.SALES;
    if (patternCounts.has('marketing_metrics')) return DomainType.MARKETING;
    if (patternCounts.has('employee_data')) return DomainType.HR;
    if (patternCounts.has('inventory')) return DomainType.INVENTORY;
    
    return DomainType.BUSINESS;
  }

  private identifySubDomains(patterns: DomainPattern[], primaryDomain: DomainType): DomainType[] {
    const subDomains: Set<DomainType> = new Set();

    for (const pattern of patterns) {
      switch (pattern.type) {
        case 'sales_data':
          subDomains.add(DomainType.SALES);
          break;
        case 'marketing_metrics':
          subDomains.add(DomainType.MARKETING);
          break;
        case 'employee_data':
          subDomains.add(DomainType.HR);
          break;
        case 'inventory':
          subDomains.add(DomainType.INVENTORY);
          break;
        case 'portfolio_holdings':
        case 'profit_loss':
        case 'trading_data':
          subDomains.add(DomainType.FINANCIAL);
          break;
      }
    }

    // Remove primary domain from sub-domains
    subDomains.delete(primaryDomain);
    
    return Array.from(subDomains);
  }

  private getApplicableRules(primaryDomain: DomainType, patterns: DomainPattern[]) {
    // Return domain-specific business rules
    // This would be expanded with actual rule definitions
    return [];
  }

  private getSuggestedMetrics(primaryDomain: DomainType, patterns: DomainPattern[]): MetricDefinition[] {
    const metrics: MetricDefinition[] = [];

    switch (primaryDomain) {
      case DomainType.FINANCIAL:
        // Add financial metrics based on patterns
        break;
      case DomainType.SALES:
        // Add sales metrics
        break;
      case DomainType.MARKETING:
        // Add marketing metrics
        break;
    }

    return metrics;
  }

  private getApplicableMetrics(primaryDomain: DomainType, patterns: DomainPattern[]): MetricDefinition[] {
    // This would return metrics based on domain and patterns
    return [];
  }

  private getSuggestedFormulas(primaryDomain: DomainType, patterns: DomainPattern[]): FinancialFormula[] {
    if (primaryDomain === DomainType.FINANCIAL) {
      return this.financialService.getApplicableFormulas(patterns, []);
    }
    return [];
  }

  private getKPIRecommendations(primaryDomain: DomainType, patterns: DomainPattern[]): KPIDefinition[] {
    switch (primaryDomain) {
      case DomainType.FINANCIAL:
        return this.financialService.getApplicableKPIs(patterns);
      case DomainType.BUSINESS:
      case DomainType.SALES:
      case DomainType.MARKETING:
        return this.businessService.getApplicableKPIs(patterns);
      default:
        return [];
    }
  }

  private generateDomainInsights(
    data: IntelligentSpreadsheetData,
    primaryDomain: DomainType,
    patterns: DomainPattern[]
  ): BusinessInsight[] {
    const insights: BusinessInsight[] = [];

    switch (primaryDomain) {
      case DomainType.FINANCIAL:
        insights.push(...this.financialService.generateFinancialInsights(data, patterns));
        break;
      case DomainType.BUSINESS:
      case DomainType.SALES:
      case DomainType.MARKETING:
        insights.push(...this.businessService.generateBusinessInsights(data, patterns));
        break;
    }

    return insights;
  }

  private generateDomainRecommendations(
    primaryDomain: DomainType,
    patterns: DomainPattern[],
    insights: BusinessInsight[]
  ): DomainRecommendation[] {
    const recommendations: DomainRecommendation[] = [];

    switch (primaryDomain) {
      case DomainType.BUSINESS:
      case DomainType.SALES:
      case DomainType.MARKETING:
        recommendations.push(...this.businessService.getBusinessRecommendations(patterns, insights));
        break;
    }

    return recommendations;
  }

  private checkBusinessRule(data: IntelligentSpreadsheetData, rule: any): string | null {
    // Implement business rule checking logic
    return null;
  }

  private validateFinancialData(data: IntelligentSpreadsheetData): { violations: string[]; suggestions: string[] } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Example financial validations
    // Check for negative portfolio values
    // Validate percentage calculations
    // Ensure proper date formats for time series

    return { violations, suggestions };
  }

  private validateBusinessData(data: IntelligentSpreadsheetData): { violations: string[]; suggestions: string[] } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Example business validations
    // Check for reasonable KPI ranges
    // Validate employee data consistency
    // Ensure proper sales data formats

    return { violations, suggestions };
  }
}