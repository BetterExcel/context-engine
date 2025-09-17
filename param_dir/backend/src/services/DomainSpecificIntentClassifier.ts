/**
 * Domain-Specific Intent Classifier
 * 
 * Provides specialized intent classification for different business domains
 * with context-aware scope determination and domain expertise.
 */

import {
  IntentClassification,
  BusinessContext,
  BusinessUseCase,
  StakeholderType,
  ComplexityLevel,
  UrgencyLevel,
  QueryToken,
  TokenType,
  MatchedPattern,
  PatternType,
  AnalysisType,
  MetricType,
  ComparisonType
} from '../types/intent-analysis';
import { IntentType } from '../types/context';
import { DomainType, IntelligentSpreadsheetData } from '../types/enhanced-intelligence';

export interface DomainClassificationResult {
  domain: DomainType;
  subDomain?: string;
  confidence: number;
  indicators: DomainIndicator[];
  applicableIntents: IntentType[];
  suggestedAnalytics: AnalyticSuggestion[];
}

export interface DomainIndicator {
  type: 'keyword' | 'pattern' | 'data_structure' | 'column_name' | 'value_pattern';
  value: string;
  confidence: number;
  weight: number;
}

export interface AnalyticSuggestion {
  name: string;
  type: AnalysisType;
  description: string;
  applicability: number;
  requiredData: string[];
}

export interface DomainIntentPattern {
  intent: IntentType;
  keywords: string[];
  phrases: string[];
  contextRequirements: string[];
  confidence: number;
  businessValue: number;
}

export interface DomainRule {
  patterns: DomainIntentPattern[];
  dataIndicators: DataIndicator[];
  businessRules: BusinessRule[];
  stakeholderPreferences: StakeholderPreference[];
}

export interface DataIndicator {
  columnNames: string[];
  valuePatterns: RegExp[];
  dataTypes: string[];
  relationships: string[];
}

export interface BusinessRule {
  condition: string;
  action: string;
  priority: number;
  applicableRoles: StakeholderType[];
}

export interface StakeholderPreference {
  role: StakeholderType;
  preferredIntents: IntentType[];
  preferredMetrics: MetricType[];
  outputFormat: 'summary' | 'detailed' | 'technical';
}

export class DomainSpecificIntentClassifier {
  private readonly domainRules: Map<DomainType, DomainRule>;
  private readonly financialPatterns: FinancialPatterns;
  private readonly salesPatterns: SalesPatterns;
  private readonly operationalPatterns: OperationalPatterns;

  constructor() {
    this.domainRules = this.initializeDomainRules();
    this.financialPatterns = new FinancialPatterns();
    this.salesPatterns = new SalesPatterns();
    this.operationalPatterns = new OperationalPatterns();
  }

  /**
   * Classifies domain from data context and query
   */
  public async classifyDomain(
    query: string,
    tokens: QueryToken[],
    dataContext?: IntelligentSpreadsheetData
  ): Promise<DomainClassificationResult> {
    const indicators: DomainIndicator[] = [];
    const domainScores = new Map<DomainType, number>();

    // Analyze query keywords and patterns
    const queryIndicators = this.analyzeQueryForDomain(query, tokens);
    indicators.push(...queryIndicators);

    // Analyze data structure if available
    if (dataContext) {
      const dataIndicators = this.analyzeDataStructureForDomain(dataContext);
      indicators.push(...dataIndicators);
    }

    // Calculate domain scores
    for (const indicator of indicators) {
      for (const domain of Object.values(DomainType)) {
        const rule = this.domainRules.get(domain);
        if (rule && this.indicatorMatchesDomain(indicator, rule)) {
          const currentScore = domainScores.get(domain) || 0;
          domainScores.set(domain, currentScore + (indicator.confidence * indicator.weight));
        }
      }
    }

    // Determine primary domain
    const sortedDomains = Array.from(domainScores.entries())
      .sort(([, a], [, b]) => b - a);

    const primaryDomain = sortedDomains[0]?.[0] || DomainType.GENERAL;
    const confidence = sortedDomains[0]?.[1] || 0.5;

    // Get applicable intents and analytics for the domain
    const applicableIntents = this.getApplicableIntents(primaryDomain);
    const suggestedAnalytics = this.getSuggestedAnalytics(primaryDomain, tokens);

    return {
      domain: primaryDomain,
      confidence: Math.min(confidence, 1.0),
      indicators,
      applicableIntents,
      suggestedAnalytics
    };
  }

  /**
   * Classifies intent with domain-specific expertise
   */
  public async classifyDomainSpecificIntent(
    query: string,
    tokens: QueryToken[],
    domain: DomainType,
    dataContext?: IntelligentSpreadsheetData
  ): Promise<IntentClassification[]> {
    const domainRule = this.domainRules.get(domain);
    if (!domainRule) {
      return this.classifyGenericIntent(query, tokens);
    }

    const classifications: IntentClassification[] = [];

    // Use domain-specific patterns
    for (const pattern of domainRule.patterns) {
      const score = this.calculatePatternScore(query, tokens, pattern);
      
      if (score > 0.1) {
        const classification: IntentClassification = {
          type: pattern.intent,
          confidence: score,
          reasoning: this.generateDomainReasoning(pattern, query, tokens, domain),
          matchedPatterns: this.getMatchedPatterns(query, pattern),
          domainSpecific: true,
          subType: this.determineIntentSubType(pattern.intent, domain, tokens)
        };

        classifications.push(classification);
      }
    }

    // Apply domain-specific business rules
    const enhancedClassifications = this.applyBusinessRules(
      classifications, 
      domainRule.businessRules, 
      tokens, 
      dataContext
    );

    return enhancedClassifications
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  }

  /**
   * Determines business context with domain expertise
   */
  public async determineBusinessContext(
    query: string,
    tokens: QueryToken[],
    domain: DomainType,
    intentClassifications: IntentClassification[]
  ): Promise<BusinessContext> {
    const useCase = this.determineBusinessUseCase(domain, tokens, intentClassifications);
    const stakeholder = this.inferStakeholder(tokens, useCase);
    const urgency = this.assessUrgency(tokens);
    const complexity = this.assessComplexity(tokens, domain, intentClassifications);

    return {
      domain,
      subDomain: this.determineSubDomain(domain, tokens),
      industry: this.inferIndustry(domain, tokens),
      useCase,
      stakeholder,
      urgency,
      complexity
    };
  }

  /**
   * Analyzes query for domain indicators
   */
  private analyzeQueryForDomain(query: string, tokens: QueryToken[]): DomainIndicator[] {
    const indicators: DomainIndicator[] = [];

    // Financial domain indicators
    const financialKeywords = [
      'revenue', 'profit', 'loss', 'ebitda', 'roi', 'margin', 'cash flow',
      'balance sheet', 'income statement', 'financial', 'accounting', 'budget'
    ];

    for (const keyword of financialKeywords) {
      if (query.toLowerCase().includes(keyword)) {
        indicators.push({
          type: 'keyword',
          value: keyword,
          confidence: 0.9,
          weight: 2.0 // Increased weight for financial keywords
        });
      }
    }

    // Sales domain indicators
    const salesKeywords = [
      'sales', 'customer', 'lead', 'conversion', 'pipeline', 'quota',
      'deal', 'prospect', 'crm', 'funnel', 'acquisition'
    ];

    for (const keyword of salesKeywords) {
      if (query.toLowerCase().includes(keyword)) {
        indicators.push({
          type: 'keyword',
          value: keyword,
          confidence: 0.8,
          weight: 1.0
        });
      }
    }

    // Operational domain indicators
    const operationalKeywords = [
      'inventory', 'supply chain', 'logistics', 'production', 'quality',
      'efficiency', 'capacity', 'utilization', 'performance', 'kpi'
    ];

    for (const keyword of operationalKeywords) {
      if (query.toLowerCase().includes(keyword)) {
        indicators.push({
          type: 'keyword',
          value: keyword,
          confidence: 0.8,
          weight: 1.0
        });
      }
    }

    // Pattern-based indicators
    const patterns = [
      { pattern: /\$[\d,]+/, domain: DomainType.FINANCIAL, confidence: 0.9 },
      { pattern: /\d+%/, domain: DomainType.FINANCIAL, confidence: 0.7 },
      { pattern: /Q[1-4]\s+\d{4}/, domain: DomainType.FINANCIAL, confidence: 0.8 },
      { pattern: /\b[A-Z]{2,5}\b/, domain: DomainType.FINANCIAL, confidence: 0.6 }
    ];

    for (const { pattern, domain, confidence } of patterns) {
      if (pattern.test(query)) {
        indicators.push({
          type: 'pattern',
          value: pattern.source,
          confidence,
          weight: 0.8
        });
      }
    }

    return indicators;
  }

  /**
   * Analyzes data structure for domain indicators
   */
  private analyzeDataStructureForDomain(dataContext: IntelligentSpreadsheetData): DomainIndicator[] {
    const indicators: DomainIndicator[] = [];

    // Analyze column names
    if (dataContext.searchIndex?.byColumn) {
      for (const [columnName, columnInfo] of dataContext.searchIndex.byColumn) {
        const domainScore = this.scoreColumnForDomain(columnName);
        
        if (domainScore.score > 0.5) {
          indicators.push({
            type: 'column_name',
            value: columnName,
            confidence: domainScore.score,
            weight: 1.2
          });
        }
      }
    }

    // Analyze data patterns
    if (dataContext.dataPatterns) {
      for (const pattern of dataContext.dataPatterns.headerPatterns) {
        for (const header of pattern.content) {
          const domainScore = this.scoreColumnForDomain(header);
          
          if (domainScore.score > 0.5) {
            indicators.push({
              type: 'data_structure',
              value: header,
              confidence: domainScore.score * pattern.confidence,
              weight: 1.0
            });
          }
        }
      }
    }

    // Analyze domain context if already detected
    if (dataContext.domainContext) {
      indicators.push({
        type: 'data_structure',
        value: dataContext.domainContext.domain,
        confidence: dataContext.domainContext.confidence,
        weight: 1.5
      });
    }

    return indicators;
  }

  /**
   * Scores a column name for domain relevance
   */
  private scoreColumnForDomain(columnName: string): { domain: DomainType; score: number } {
    const name = columnName.toLowerCase();
    
    // Financial column patterns
    const financialPatterns = [
      'revenue', 'profit', 'loss', 'ebitda', 'margin', 'cash', 'balance',
      'income', 'expense', 'cost', 'price', 'value', 'amount', 'total'
    ];

    // Sales column patterns
    const salesPatterns = [
      'sales', 'customer', 'lead', 'conversion', 'deal', 'quota',
      'pipeline', 'prospect', 'opportunity', 'account', 'territory'
    ];

    // Operational column patterns
    const operationalPatterns = [
      'inventory', 'stock', 'quantity', 'production', 'capacity',
      'efficiency', 'utilization', 'performance', 'quality', 'defect'
    ];

    let maxScore = 0;
    let bestDomain = DomainType.GENERAL;

    // Check financial patterns
    for (const pattern of financialPatterns) {
      if (name.includes(pattern)) {
        const score = 0.9;
        if (score > maxScore) {
          maxScore = score;
          bestDomain = DomainType.FINANCIAL;
        }
      }
    }

    // Check sales patterns
    for (const pattern of salesPatterns) {
      if (name.includes(pattern)) {
        const score = 0.9;
        if (score > maxScore) {
          maxScore = score;
          bestDomain = DomainType.SALES;
        }
      }
    }

    // Check operational patterns
    for (const pattern of operationalPatterns) {
      if (name.includes(pattern)) {
        const score = 0.9;
        if (score > maxScore) {
          maxScore = score;
          bestDomain = DomainType.BUSINESS;
        }
      }
    }

    return { domain: bestDomain, score: maxScore };
  }

  /**
   * Calculates pattern score for domain-specific intent
   */
  private calculatePatternScore(
    query: string,
    tokens: QueryToken[],
    pattern: DomainIntentPattern
  ): number {
    let score = 0;
    const queryLower = query.toLowerCase();

    // Keyword matching
    for (const keyword of pattern.keywords) {
      if (queryLower.includes(keyword)) {
        score += 0.3;
      }
    }

    // Phrase matching
    for (const phrase of pattern.phrases) {
      if (queryLower.includes(phrase)) {
        score += 0.5;
      }
    }

    // Context requirements
    let contextMet = 0;
    for (const requirement of pattern.contextRequirements) {
      if (queryLower.includes(requirement)) {
        contextMet++;
      }
    }

    if (pattern.contextRequirements.length > 0) {
      const contextScore = contextMet / pattern.contextRequirements.length;
      score *= contextScore;
    }

    // Apply pattern confidence and business value
    score *= pattern.confidence * pattern.businessValue;

    return Math.min(score, 1.0);
  }

  /**
   * Generates domain-specific reasoning
   */
  private generateDomainReasoning(
    pattern: DomainIntentPattern,
    query: string,
    tokens: QueryToken[],
    domain: DomainType
  ): string[] {
    const reasoning: string[] = [];

    reasoning.push(`Domain-specific pattern match for ${domain}`);

    const matchedKeywords = pattern.keywords.filter(k => query.toLowerCase().includes(k));
    if (matchedKeywords.length > 0) {
      reasoning.push(`Matched domain keywords: ${matchedKeywords.join(', ')}`);
    }

    const matchedPhrases = pattern.phrases.filter(p => query.toLowerCase().includes(p));
    if (matchedPhrases.length > 0) {
      reasoning.push(`Matched domain phrases: ${matchedPhrases.join(', ')}`);
    }

    reasoning.push(`Business value score: ${pattern.businessValue}`);

    return reasoning;
  }

  /**
   * Gets matched patterns for intent
   */
  private getMatchedPatterns(query: string, pattern: DomainIntentPattern): MatchedPattern[] {
    const matches: MatchedPattern[] = [];
    const queryLower = query.toLowerCase();

    for (const keyword of pattern.keywords) {
      if (queryLower.includes(keyword)) {
        matches.push({
          pattern: keyword,
          type: PatternType.DOMAIN_SPECIFIC,
          confidence: 0.8,
          weight: 1.0,
          context: `Domain keyword for ${pattern.intent}`
        });
      }
    }

    return matches;
  }

  /**
   * Determines intent subtype based on domain
   */
  private determineIntentSubType(
    intent: IntentType,
    domain: DomainType,
    tokens: QueryToken[]
  ): string | undefined {
    switch (domain) {
      case DomainType.FINANCIAL:
        return this.financialPatterns.getSubType(intent, tokens);
      case DomainType.SALES:
        return this.salesPatterns.getSubType(intent, tokens);
      case DomainType.BUSINESS:
        return this.operationalPatterns.getSubType(intent, tokens);
      default:
        return undefined;
    }
  }

  /**
   * Applies business rules to classifications
   */
  private applyBusinessRules(
    classifications: IntentClassification[],
    businessRules: BusinessRule[],
    tokens: QueryToken[],
    dataContext?: IntelligentSpreadsheetData
  ): IntentClassification[] {
    // Apply business rules to modify or enhance classifications
    for (const rule of businessRules) {
      // Simplified rule application
      if (this.ruleConditionMet(rule.condition, tokens)) {
        // Apply rule action (boost confidence, add reasoning, etc.)
        classifications.forEach(classification => {
          classification.confidence *= 1.1; // Boost confidence
          classification.reasoning.push(`Business rule applied: ${rule.action}`);
        });
      }
    }

    return classifications;
  }

  /**
   * Determines business use case from domain and tokens
   */
  private determineBusinessUseCase(
    domain: DomainType,
    tokens: QueryToken[],
    intentClassifications: IntentClassification[]
  ): BusinessUseCase {
    const tokenTexts = tokens.map(t => t.text.toLowerCase());

    switch (domain) {
      case DomainType.FINANCIAL:
        if (tokenTexts.some(t => ['budget', 'forecast', 'plan'].includes(t))) {
          return BusinessUseCase.BUDGETING_PLANNING;
        }
        if (tokenTexts.some(t => ['risk', 'exposure', 'volatility'].includes(t))) {
          return BusinessUseCase.RISK_ASSESSMENT;
        }
        if (tokenTexts.some(t => ['performance', 'analysis', 'trend'].includes(t))) {
          return BusinessUseCase.PERFORMANCE_REPORTING;
        }
        return BusinessUseCase.FINANCIAL_ANALYSIS;

      case DomainType.SALES:
        return BusinessUseCase.SALES_ANALYSIS;

      case DomainType.BUSINESS:
        return BusinessUseCase.OPERATIONAL_ANALYSIS;

      default:
        return BusinessUseCase.FINANCIAL_ANALYSIS;
    }
  }

  /**
   * Infers stakeholder type from tokens and use case
   */
  private inferStakeholder(tokens: QueryToken[], useCase: BusinessUseCase): StakeholderType | undefined {
    const tokenTexts = tokens.map(t => t.text.toLowerCase());

    // Look for role indicators
    if (tokenTexts.some(t => ['cfo', 'finance', 'accounting'].includes(t))) {
      return StakeholderType.ACCOUNTANT;
    }
    if (tokenTexts.some(t => ['analyst', 'analysis'].includes(t))) {
      return StakeholderType.ANALYST;
    }
    if (tokenTexts.some(t => ['manager', 'management'].includes(t))) {
      return StakeholderType.MANAGER;
    }

    // Infer from use case
    switch (useCase) {
      case BusinessUseCase.FINANCIAL_ANALYSIS:
        return StakeholderType.ANALYST;
      case BusinessUseCase.BUDGETING_PLANNING:
        return StakeholderType.MANAGER;
      case BusinessUseCase.COMPLIANCE_REPORTING:
        return StakeholderType.ACCOUNTANT;
      default:
        return undefined;
    }
  }

  /**
   * Assesses urgency from tokens
   */
  private assessUrgency(tokens: QueryToken[]): UrgencyLevel {
    const urgentWords = ['urgent', 'asap', 'immediately', 'now', 'quickly', 'rush'];
    const tokenTexts = tokens.map(t => t.text.toLowerCase());

    if (tokenTexts.some(t => urgentWords.includes(t))) {
      return UrgencyLevel.HIGH;
    }

    const timeWords = ['today', 'tomorrow', 'this week'];
    if (tokenTexts.some(t => timeWords.includes(t))) {
      return UrgencyLevel.MEDIUM;
    }

    return UrgencyLevel.LOW;
  }

  /**
   * Assesses complexity from tokens, domain, and intents
   */
  private assessComplexity(
    tokens: QueryToken[],
    domain: DomainType,
    intentClassifications: IntentClassification[]
  ): ComplexityLevel {
    const complexWords = ['complex', 'advanced', 'detailed', 'comprehensive', 'sophisticated'];
    const tokenTexts = tokens.map(t => t.text.toLowerCase());

    if (tokenTexts.some(t => complexWords.includes(t))) {
      return ComplexityLevel.COMPLEX;
    }

    // Multiple intents indicate complexity
    if (intentClassifications.length > 2) {
      return ComplexityLevel.COMPLEX;
    }

    // Domain-specific complexity
    if (domain === DomainType.FINANCIAL && tokenTexts.some(t => ['derivative', 'hedge', 'portfolio'].includes(t))) {
      return ComplexityLevel.EXPERT;
    }

    return ComplexityLevel.MODERATE;
  }

  // Helper methods and initialization

  private initializeDomainRules(): Map<DomainType, DomainRule> {
    const rules = new Map<DomainType, DomainRule>();

    // Financial domain rules
    rules.set(DomainType.FINANCIAL, {
      patterns: [
        {
          intent: IntentType.DATA_ANALYSIS,
          keywords: ['analyze', 'trend', 'performance', 'compare', 'benchmark'],
          phrases: ['financial analysis', 'performance review', 'trend analysis'],
          contextRequirements: ['revenue', 'profit', 'financial'],
          confidence: 0.9,
          businessValue: 0.95
        },
        {
          intent: IntentType.FORMULA_ASSISTANCE,
          keywords: ['calculate', 'formula', 'ratio', 'margin', 'return'],
          phrases: ['calculate roi', 'profit margin', 'financial ratio'],
          contextRequirements: [],
          confidence: 0.85,
          businessValue: 0.8
        }
      ],
      dataIndicators: [{
        columnNames: ['revenue', 'profit', 'ebitda', 'cash_flow', 'balance'],
        valuePatterns: [/\$[\d,]+/, /\d+%/],
        dataTypes: ['currency', 'percentage'],
        relationships: ['income_statement', 'balance_sheet']
      }],
      businessRules: [
        {
          condition: 'quarterly_analysis',
          action: 'boost_temporal_analysis',
          priority: 1,
          applicableRoles: [StakeholderType.ANALYST, StakeholderType.MANAGER]
        }
      ],
      stakeholderPreferences: [
        {
          role: StakeholderType.EXECUTIVE,
          preferredIntents: [IntentType.DATA_ANALYSIS],
          preferredMetrics: [MetricType.SUM, MetricType.GROWTH_RATE],
          outputFormat: 'summary'
        }
      ]
    });

    // Add more domain rules...

    return rules;
  }

  private classifyGenericIntent(query: string, tokens: QueryToken[]): IntentClassification[] {
    // Fallback to generic classification
    return [{
      type: IntentType.GENERAL_ASSISTANCE,
      confidence: 0.5,
      reasoning: ['No domain-specific patterns found'],
      matchedPatterns: [],
      domainSpecific: false
    }];
  }

  private indicatorMatchesDomain(indicator: DomainIndicator, rule: DomainRule): boolean {
    // Check if indicator matches domain rule
    switch (indicator.type) {
      case 'keyword':
        return rule.patterns.some(p => p.keywords.includes(indicator.value));
      case 'column_name':
        return rule.dataIndicators.some(dataIndicator =>
          dataIndicator.columnNames.some(col => 
            col.toLowerCase().includes(indicator.value.toLowerCase())
          )
        );
      default:
        return false;
    }
  }

  private getApplicableIntents(domain: DomainType): IntentType[] {
    const rule = this.domainRules.get(domain);
    return rule ? rule.patterns.map(p => p.intent) : Object.values(IntentType);
  }

  private getSuggestedAnalytics(domain: DomainType, tokens: QueryToken[]): AnalyticSuggestion[] {
    const suggestions: AnalyticSuggestion[] = [];

    switch (domain) {
      case DomainType.FINANCIAL:
        suggestions.push({
          name: 'Financial Performance Analysis',
          type: AnalysisType.COMPARATIVE,
          description: 'Compare financial metrics across periods',
          applicability: 0.9,
          requiredData: ['revenue', 'profit', 'dates']
        });
        break;

      case DomainType.SALES:
        suggestions.push({
          name: 'Sales Trend Analysis',
          type: AnalysisType.TREND_ANALYSIS,
          description: 'Analyze sales trends and patterns',
          applicability: 0.85,
          requiredData: ['sales', 'dates', 'customers']
        });
        break;
    }

    return suggestions;
  }

  private determineSubDomain(domain: DomainType, tokens: QueryToken[]): string | undefined {
    const tokenTexts = tokens.map(t => t.text.toLowerCase());

    switch (domain) {
      case DomainType.FINANCIAL:
        if (tokenTexts.some(t => ['investment', 'portfolio'].includes(t))) return 'Investment Management';
        if (tokenTexts.some(t => ['accounting', 'bookkeeping'].includes(t))) return 'Accounting';
        if (tokenTexts.some(t => ['budget', 'forecast'].includes(t))) return 'Financial Planning';
        break;
    }

    return undefined;
  }

  private inferIndustry(domain: DomainType, tokens: QueryToken[]): string | undefined {
    // Simplified industry inference
    return undefined;
  }

  private ruleConditionMet(condition: string, tokens: QueryToken[]): boolean {
    // Simplified rule condition checking
    const tokenTexts = tokens.map(t => t.text.toLowerCase());
    return tokenTexts.some(t => condition.toLowerCase().includes(t));
  }
}

// Supporting pattern classes
class FinancialPatterns {
  getSubType(intent: IntentType, tokens: QueryToken[]): string | undefined {
    const tokenTexts = tokens.map(t => t.text.toLowerCase());

    switch (intent) {
      case IntentType.DATA_ANALYSIS:
        if (tokenTexts.some(t => ['profitability', 'margin'].includes(t))) return 'Profitability Analysis';
        if (tokenTexts.some(t => ['liquidity', 'cash'].includes(t))) return 'Liquidity Analysis';
        if (tokenTexts.some(t => ['efficiency', 'turnover'].includes(t))) return 'Efficiency Analysis';
        break;
    }

    return undefined;
  }
}

class SalesPatterns {
  getSubType(intent: IntentType, tokens: QueryToken[]): string | undefined {
    const tokenTexts = tokens.map(t => t.text.toLowerCase());

    switch (intent) {
      case IntentType.DATA_ANALYSIS:
        if (tokenTexts.some(t => ['conversion', 'funnel'].includes(t))) return 'Conversion Analysis';
        if (tokenTexts.some(t => ['customer', 'retention'].includes(t))) return 'Customer Analysis';
        break;
    }

    return undefined;
  }
}

class OperationalPatterns {
  getSubType(intent: IntentType, tokens: QueryToken[]): string | undefined {
    const tokenTexts = tokens.map(t => t.text.toLowerCase());

    switch (intent) {
      case IntentType.DATA_ANALYSIS:
        if (tokenTexts.some(t => ['efficiency', 'productivity'].includes(t))) return 'Efficiency Analysis';
        if (tokenTexts.some(t => ['quality', 'defect'].includes(t))) return 'Quality Analysis';
        break;
    }

    return undefined;
  }
}