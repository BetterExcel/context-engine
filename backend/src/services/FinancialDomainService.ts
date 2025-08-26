/**
 * Financial Domain Intelligence Service
 * Provides specialized financial analysis and portfolio management capabilities
 */

import {
  DomainClassification,
  FinancialFormula,
  FinancialFormulaCategory,
  PortfolioTemplate,
  RiskMetric,
  MetricDefinition,
  MetricCategory,
  FinancialPattern,
  DomainPattern,
  KPIDefinition,
  BusinessInsight,
  RiskAssessment,
  RiskFactor
} from '../types/domain-intelligence';
import { IntelligentSpreadsheetData, DomainType, EnhancedDataType } from '../types/enhanced-intelligence';

export class FinancialDomainService {
  private financialFormulas: Map<string, FinancialFormula> = new Map();
  private portfolioTemplates: Map<string, PortfolioTemplate> = new Map();
  private riskMetrics: Map<string, RiskMetric> = new Map();
  private financialKPIs: Map<string, KPIDefinition> = new Map();

  constructor() {
    this.initializeFinancialFormulas();
    this.initializePortfolioTemplates();
    this.initializeRiskMetrics();
    this.initializeFinancialKPIs();
  }

  /**
   * Detect financial patterns in spreadsheet data
   */
  public detectFinancialPatterns(data: IntelligentSpreadsheetData): DomainPattern[] {
    const patterns: DomainPattern[] = [];

    // Detect portfolio holdings pattern
    const portfolioPattern = this.detectPortfolioPattern(data);
    if (portfolioPattern) patterns.push(portfolioPattern);

    // Detect P&L pattern
    const plPattern = this.detectProfitLossPattern(data);
    if (plPattern) patterns.push(plPattern);

    // Detect trading data pattern
    const tradingPattern = this.detectTradingPattern(data);
    if (tradingPattern) patterns.push(tradingPattern);

    // Detect risk metrics pattern
    const riskPattern = this.detectRiskMetricsPattern(data);
    if (riskPattern) patterns.push(riskPattern);

    return patterns;
  }

  /**
   * Get applicable financial formulas based on detected patterns
   */
  public getApplicableFormulas(patterns: DomainPattern[], columnNames: string[]): FinancialFormula[] {
    const applicableFormulas: FinancialFormula[] = [];

    for (const pattern of patterns) {
      switch (pattern.type) {
        case FinancialPattern.PORTFOLIO_HOLDINGS:
          applicableFormulas.push(...this.getPortfolioFormulas());
          break;
        case FinancialPattern.PROFIT_LOSS:
          applicableFormulas.push(...this.getProfitLossFormulas());
          break;
        case FinancialPattern.TRADING_DATA:
          applicableFormulas.push(...this.getTradingFormulas());
          break;
        case FinancialPattern.RISK_METRICS:
          applicableFormulas.push(...this.getRiskFormulas());
          break;
      }
    }

    // Filter by available columns
    return applicableFormulas.filter(formula => 
      this.hasRequiredColumns(formula, columnNames)
    );
  }

  /**
   * Generate financial insights from data analysis
   */
  public generateFinancialInsights(
    data: IntelligentSpreadsheetData,
    patterns: DomainPattern[]
  ): BusinessInsight[] {
    const insights: BusinessInsight[] = [];

    for (const pattern of patterns) {
      switch (pattern.type) {
        case FinancialPattern.PORTFOLIO_HOLDINGS:
          insights.push(...this.analyzePortfolioHoldings(data, pattern));
          break;
        case FinancialPattern.PROFIT_LOSS:
          insights.push(...this.analyzeProfitLoss(data, pattern));
          break;
        case FinancialPattern.TRADING_DATA:
          insights.push(...this.analyzeTradingData(data, pattern));
          break;
      }
    }

    return insights;
  }

  /**
   * Assess financial risk based on data patterns
   */
  public assessFinancialRisk(
    data: IntelligentSpreadsheetData,
    patterns: DomainPattern[]
  ): RiskAssessment | null {
    const riskFactors: RiskFactor[] = [];

    // Analyze concentration risk
    const concentrationRisk = this.analyzeConcentrationRisk(data, patterns);
    if (concentrationRisk) riskFactors.push(concentrationRisk);

    // Analyze volatility risk
    const volatilityRisk = this.analyzeVolatilityRisk(data, patterns);
    if (volatilityRisk) riskFactors.push(volatilityRisk);

    // Analyze liquidity risk
    const liquidityRisk = this.analyzeLiquidityRisk(data, patterns);
    if (liquidityRisk) riskFactors.push(liquidityRisk);

    if (riskFactors.length === 0) return null;

    const overallRisk = this.calculateOverallRisk(riskFactors);

    return {
      overallRisk,
      riskFactors,
      mitigationStrategies: this.generateMitigationStrategies(riskFactors),
      monitoringRecommendations: this.generateMonitoringRecommendations(riskFactors)
    };
  }

  /**
   * Get financial KPIs applicable to the data
   */
  public getApplicableKPIs(patterns: DomainPattern[]): KPIDefinition[] {
    const kpis: KPIDefinition[] = [];

    for (const pattern of patterns) {
      switch (pattern.type) {
        case FinancialPattern.PORTFOLIO_HOLDINGS:
          kpis.push(
            this.financialKPIs.get('portfolio_return')!,
            this.financialKPIs.get('sharpe_ratio')!,
            this.financialKPIs.get('portfolio_volatility')!
          );
          break;
        case FinancialPattern.PROFIT_LOSS:
          kpis.push(
            this.financialKPIs.get('net_profit_margin')!,
            this.financialKPIs.get('gross_profit_margin')!,
            this.financialKPIs.get('operating_margin')!
          );
          break;
        case FinancialPattern.TRADING_DATA:
          kpis.push(
            this.financialKPIs.get('win_rate')!,
            this.financialKPIs.get('profit_factor')!,
            this.financialKPIs.get('max_drawdown')!
          );
          break;
      }
    }

    return kpis.filter(kpi => kpi !== undefined);
  }

  // Private helper methods

  private detectPortfolioPattern(data: IntelligentSpreadsheetData): DomainPattern | null {
    const requiredColumns = ['symbol', 'quantity', 'price', 'value'];
    
    // Extract column names from the first sheet's first row (headers)
    const firstSheet = data.sheets[0];
    if (!firstSheet || !firstSheet.data || firstSheet.data.length === 0) {
      return null;
    }
    
    const headerRow = firstSheet.data[0];
    const columnNames = headerRow.map(cell => cell.value?.toString().toLowerCase() || '');
    
    const matchedColumns = requiredColumns.filter(col => 
      columnNames.some(name => name.includes(col) || this.isColumnSynonym(name, col))
    );

    if (matchedColumns.length >= 3) {
      return {
        type: FinancialPattern.PORTFOLIO_HOLDINGS,
        confidence: matchedColumns.length / requiredColumns.length,
        location: {
          startRow: 0,
          endRow: firstSheet.data.length - 1,
          startCol: 0,
          endCol: columnNames.length - 1
        },
        keyColumns: matchedColumns,
        metadata: {
          detectedColumns: matchedColumns,
          totalColumns: columnNames.length
        }
      };
    }

    return null;
  }

  private detectProfitLossPattern(data: IntelligentSpreadsheetData): DomainPattern | null {
    const plKeywords = ['revenue', 'income', 'expense', 'cost', 'profit', 'loss', 'ebitda'];
    
    const firstSheet = data.sheets[0];
    if (!firstSheet || !firstSheet.data || firstSheet.data.length === 0) {
      return null;
    }
    
    const headerRow = firstSheet.data[0];
    const columnNames = headerRow.map(cell => cell.value?.toString().toLowerCase() || '');
    
    const matchedKeywords = plKeywords.filter(keyword => 
      columnNames.some(name => name.includes(keyword))
    );

    if (matchedKeywords.length >= 3) {
      return {
        type: FinancialPattern.PROFIT_LOSS,
        confidence: matchedKeywords.length / plKeywords.length,
        location: {
          startRow: 0,
          endRow: firstSheet.data.length - 1,
          startCol: 0,
          endCol: columnNames.length - 1
        },
        keyColumns: matchedKeywords,
        metadata: {
          detectedKeywords: matchedKeywords
        }
      };
    }

    return null;
  }

  private detectTradingPattern(data: IntelligentSpreadsheetData): DomainPattern | null {
    const tradingKeywords = ['entry', 'exit', 'buy', 'sell', 'trade', 'position', 'pnl'];
    
    const firstSheet = data.sheets[0];
    if (!firstSheet || !firstSheet.data || firstSheet.data.length === 0) {
      return null;
    }
    
    const headerRow = firstSheet.data[0];
    const columnNames = headerRow.map(cell => cell.value?.toString().toLowerCase() || '');
    
    const matchedKeywords = tradingKeywords.filter(keyword => 
      columnNames.some(name => name.includes(keyword))
    );

    if (matchedKeywords.length >= 3) {
      return {
        type: FinancialPattern.TRADING_DATA,
        confidence: matchedKeywords.length / tradingKeywords.length,
        location: {
          startRow: 0,
          endRow: firstSheet.data.length - 1,
          startCol: 0,
          endCol: columnNames.length - 1
        },
        keyColumns: matchedKeywords,
        metadata: {
          detectedKeywords: matchedKeywords
        }
      };
    }

    return null;
  }

  private detectRiskMetricsPattern(data: IntelligentSpreadsheetData): DomainPattern | null {
    const riskKeywords = ['volatility', 'var', 'beta', 'correlation', 'risk', 'deviation'];
    
    const firstSheet = data.sheets[0];
    if (!firstSheet || !firstSheet.data || firstSheet.data.length === 0) {
      return null;
    }
    
    const headerRow = firstSheet.data[0];
    const columnNames = headerRow.map(cell => cell.value?.toString().toLowerCase() || '');
    
    const matchedKeywords = riskKeywords.filter(keyword => 
      columnNames.some(name => name.includes(keyword))
    );

    if (matchedKeywords.length >= 2) {
      return {
        type: FinancialPattern.RISK_METRICS,
        confidence: matchedKeywords.length / riskKeywords.length,
        location: {
          startRow: 0,
          endRow: firstSheet.data.length - 1,
          startCol: 0,
          endCol: columnNames.length - 1
        },
        keyColumns: matchedKeywords,
        metadata: {
          detectedKeywords: matchedKeywords
        }
      };
    }

    return null;
  }

  private isColumnSynonym(columnName: string, targetColumn: string): boolean {
    const synonyms: Record<string, string[]> = {
      'symbol': ['ticker', 'stock', 'security', 'instrument'],
      'quantity': ['shares', 'units', 'amount', 'position'],
      'price': ['cost', 'value', 'rate', 'quote'],
      'value': ['market_value', 'worth', 'total', 'amount']
    };

    return synonyms[targetColumn]?.some(synonym => 
      columnName.includes(synonym)
    ) || false;
  }

  private hasRequiredColumns(formula: FinancialFormula, columnNames: string[]): boolean {
    return formula.parameters.every(param => {
      if (!param.required) return true;
      return columnNames.some(name => 
        name.toLowerCase().includes(param.name.toLowerCase())
      );
    });
  }

  private getPortfolioFormulas(): FinancialFormula[] {
    return Array.from(this.financialFormulas.values()).filter(
      formula => formula.category === FinancialFormulaCategory.PORTFOLIO_ANALYSIS
    );
  }

  private getProfitLossFormulas(): FinancialFormula[] {
    return Array.from(this.financialFormulas.values()).filter(
      formula => formula.category === FinancialFormulaCategory.PERFORMANCE
    );
  }

  private getTradingFormulas(): FinancialFormula[] {
    return Array.from(this.financialFormulas.values()).filter(
      formula => formula.category === FinancialFormulaCategory.PERFORMANCE ||
                formula.category === FinancialFormulaCategory.RISK_MANAGEMENT
    );
  }

  private getRiskFormulas(): FinancialFormula[] {
    return Array.from(this.financialFormulas.values()).filter(
      formula => formula.category === FinancialFormulaCategory.RISK_MANAGEMENT
    );
  }

  private analyzePortfolioHoldings(data: IntelligentSpreadsheetData, pattern: DomainPattern): BusinessInsight[] {
    const insights: BusinessInsight[] = [];

    // Analyze concentration
    insights.push({
      type: 'risk',
      title: 'Portfolio Concentration Analysis',
      description: 'Analyzing portfolio concentration risk across holdings',
      confidence: 0.85,
      impact: 'medium',
      actionable: true,
      suggestedActions: [
        'Review top 10 holdings for concentration risk',
        'Consider diversification across sectors',
        'Monitor position sizes relative to portfolio'
      ],
      supportingData: []
    });

    return insights;
  }

  private analyzeProfitLoss(data: IntelligentSpreadsheetData, pattern: DomainPattern): BusinessInsight[] {
    const insights: BusinessInsight[] = [];

    insights.push({
      type: 'trend',
      title: 'Profitability Analysis',
      description: 'Analyzing profit and loss trends and margins',
      confidence: 0.9,
      impact: 'high',
      actionable: true,
      suggestedActions: [
        'Calculate key profitability ratios',
        'Analyze expense trends',
        'Compare margins to industry benchmarks'
      ],
      supportingData: []
    });

    return insights;
  }

  private analyzeTradingData(data: IntelligentSpreadsheetData, pattern: DomainPattern): BusinessInsight[] {
    const insights: BusinessInsight[] = [];

    insights.push({
      type: 'opportunity',
      title: 'Trading Performance Analysis',
      description: 'Analyzing trading performance metrics and patterns',
      confidence: 0.8,
      impact: 'medium',
      actionable: true,
      suggestedActions: [
        'Calculate win rate and profit factor',
        'Analyze drawdown periods',
        'Review risk-adjusted returns'
      ],
      supportingData: []
    });

    return insights;
  }

  private analyzeConcentrationRisk(data: IntelligentSpreadsheetData, patterns: DomainPattern[]): RiskFactor | null {
    // Simplified concentration risk analysis
    return {
      type: 'concentration',
      severity: 'medium',
      description: 'Portfolio may have concentration risk in top holdings',
      probability: 0.6,
      impact: 0.7,
      mitigation: 'Consider diversifying across more positions and sectors'
    };
  }

  private analyzeVolatilityRisk(data: IntelligentSpreadsheetData, patterns: DomainPattern[]): RiskFactor | null {
    return {
      type: 'market',
      severity: 'medium',
      description: 'Market volatility may impact portfolio performance',
      probability: 0.7,
      impact: 0.6,
      mitigation: 'Monitor volatility metrics and consider hedging strategies'
    };
  }

  private analyzeLiquidityRisk(data: IntelligentSpreadsheetData, patterns: DomainPattern[]): RiskFactor | null {
    return {
      type: 'liquidity',
      severity: 'low',
      description: 'Some positions may have limited liquidity',
      probability: 0.3,
      impact: 0.4,
      mitigation: 'Review position sizes relative to average daily volume'
    };
  }

  private calculateOverallRisk(riskFactors: RiskFactor[]): 'low' | 'medium' | 'high' {
    const avgSeverity = riskFactors.reduce((sum, factor) => {
      const severityScore = factor.severity === 'low' ? 1 : factor.severity === 'medium' ? 2 : 3;
      return sum + severityScore;
    }, 0) / riskFactors.length;

    if (avgSeverity <= 1.5) return 'low';
    if (avgSeverity <= 2.5) return 'medium';
    return 'high';
  }

  private generateMitigationStrategies(riskFactors: RiskFactor[]): string[] {
    return riskFactors
      .map(factor => factor.mitigation)
      .filter(mitigation => mitigation !== undefined) as string[];
  }

  private generateMonitoringRecommendations(riskFactors: RiskFactor[]): string[] {
    const recommendations = [
      'Monitor portfolio concentration regularly',
      'Track volatility metrics and correlations',
      'Review liquidity conditions for all positions',
      'Set up alerts for risk threshold breaches'
    ];

    return recommendations;
  }

  // Initialize financial formulas library
  private initializeFinancialFormulas(): void {
    // Portfolio Analysis Formulas
    this.financialFormulas.set('portfolio_return', {
      id: 'portfolio_return',
      name: 'Portfolio Return',
      formula: '(Current Value - Initial Value) / Initial Value',
      description: 'Calculate the total return of a portfolio',
      category: FinancialFormulaCategory.PORTFOLIO_ANALYSIS,
      parameters: [
        { name: 'current_value', type: 'number', description: 'Current portfolio value', required: true },
        { name: 'initial_value', type: 'number', description: 'Initial portfolio value', required: true }
      ],
      excelSyntax: '=(CurrentValue-InitialValue)/InitialValue',
      examples: [{
        description: 'Portfolio with $110,000 current value and $100,000 initial value',
        input: { current_value: 110000, initial_value: 100000 },
        expectedOutput: 0.1,
        excelFormula: '=(110000-100000)/100000'
      }]
    });

    this.financialFormulas.set('sharpe_ratio', {
      id: 'sharpe_ratio',
      name: 'Sharpe Ratio',
      formula: '(Portfolio Return - Risk Free Rate) / Portfolio Standard Deviation',
      description: 'Risk-adjusted return measure',
      category: FinancialFormulaCategory.RISK_MANAGEMENT,
      parameters: [
        { name: 'portfolio_return', type: 'number', description: 'Portfolio return', required: true },
        { name: 'risk_free_rate', type: 'number', description: 'Risk-free rate', required: true },
        { name: 'portfolio_std', type: 'number', description: 'Portfolio standard deviation', required: true }
      ],
      excelSyntax: '=(PortfolioReturn-RiskFreeRate)/PortfolioStd'
    });

    // Add more formulas...
  }

  private initializePortfolioTemplates(): void {
    // Initialize portfolio analysis templates
  }

  private initializeRiskMetrics(): void {
    // Initialize risk metrics
  }

  private initializeFinancialKPIs(): void {
    this.financialKPIs.set('portfolio_return', {
      id: 'portfolio_return',
      name: 'Portfolio Return',
      description: 'Total return of the portfolio over a period',
      category: MetricCategory.RETURN,
      formula: '(Current Value - Initial Value) / Initial Value',
      unit: '%',
      trend: 'higher_better',
      frequency: 'monthly'
    });

    this.financialKPIs.set('sharpe_ratio', {
      id: 'sharpe_ratio',
      name: 'Sharpe Ratio',
      description: 'Risk-adjusted return measure',
      category: MetricCategory.RISK,
      formula: '(Portfolio Return - Risk Free Rate) / Portfolio Volatility',
      unit: 'ratio',
      trend: 'higher_better',
      frequency: 'monthly'
    });

    // Add more KPIs...
  }
}