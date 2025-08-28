/**
 * Formula Library Service
 * Comprehensive library of financial and business formulas with Excel syntax
 */

import {
  FinancialFormula,
  FinancialFormulaCategory,
  FormulaParameter,
  ValidationRule,
  FormulaExample,
  MetricDefinition,
  MetricCategory
} from '../types/domain-intelligence';
import { DomainType } from '../types/enhanced-intelligence';

export class FormulaLibraryService {
  private formulas: Map<string, FinancialFormula> = new Map();
  private formulasByCategory: Map<FinancialFormulaCategory, FinancialFormula[]> = new Map();

  constructor() {
    this.initializeFormulaLibrary();
    this.organizeFormulasByCategory();
  }

  /**
   * Get all available formulas
   */
  public getAllFormulas(): FinancialFormula[] {
    return Array.from(this.formulas.values());
  }

  /**
   * Get formulas by category
   */
  public getFormulasByCategory(category: FinancialFormulaCategory): FinancialFormula[] {
    return this.formulasByCategory.get(category) || [];
  }

  /**
   * Get formula by ID
   */
  public getFormula(id: string): FinancialFormula | undefined {
    return this.formulas.get(id);
  }

  /**
   * Search formulas by name or description
   */
  public searchFormulas(query: string): FinancialFormula[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.formulas.values()).filter(formula =>
      formula.name.toLowerCase().includes(lowerQuery) ||
      formula.description.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get formulas applicable to specific column names
   */
  public getApplicableFormulas(columnNames: string[]): FinancialFormula[] {
    const lowerColumnNames = columnNames.map(name => name.toLowerCase());
    
    return Array.from(this.formulas.values()).filter(formula => {
      return formula.parameters.every(param => {
        if (!param.required) return true;
        return lowerColumnNames.some(colName => 
          colName.includes(param.name.toLowerCase()) ||
          this.isColumnSynonym(colName, param.name)
        );
      });
    });
  }

  /**
   * Generate Excel formula with actual cell references
   */
  public generateExcelFormula(
    formulaId: string, 
    cellMappings: Record<string, string>
  ): string | null {
    const formula = this.formulas.get(formulaId);
    if (!formula) return null;

    let excelFormula = formula.excelSyntax;

    // Replace parameter placeholders with actual cell references
    for (const param of formula.parameters) {
      const cellRef = cellMappings[param.name];
      if (cellRef) {
        const placeholder = new RegExp(param.name, 'gi');
        excelFormula = excelFormula.replace(placeholder, cellRef);
      }
    }

    return excelFormula;
  }

  /**
   * Validate formula parameters
   */
  public validateFormulaParameters(
    formulaId: string,
    parameters: Record<string, any>
  ): { isValid: boolean; errors: string[] } {
    const formula = this.formulas.get(formulaId);
    if (!formula) {
      return { isValid: false, errors: ['Formula not found'] };
    }

    const errors: string[] = [];

    for (const param of formula.parameters) {
      const value = parameters[param.name];

      // Check required parameters
      if (param.required && (value === undefined || value === null)) {
        errors.push(`Required parameter '${param.name}' is missing`);
        continue;
      }

      // Type validation
      if (value !== undefined && value !== null) {
        const typeError = this.validateParameterType(param, value);
        if (typeError) {
          errors.push(typeError);
        }
      }

      // Custom validation
      if (param.validation && value !== undefined) {
        const validationError = this.validateParameterRule(param, value);
        if (validationError) {
          errors.push(validationError);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Private helper methods

  private initializeFormulaLibrary(): void {
    // Portfolio Analysis Formulas
    this.addPortfolioFormulas();
    
    // Risk Management Formulas
    this.addRiskManagementFormulas();
    
    // Performance Analysis Formulas
    this.addPerformanceFormulas();
    
    // Valuation Formulas
    this.addValuationFormulas();
    
    // Business Metrics Formulas
    this.addBusinessFormulas();
  }

  private addPortfolioFormulas(): void {
    // Portfolio Return
    this.formulas.set('portfolio_return', {
      id: 'portfolio_return',
      name: 'Portfolio Return',
      formula: '(Current Value - Initial Value) / Initial Value',
      description: 'Calculate the total return of a portfolio over a period',
      category: FinancialFormulaCategory.PORTFOLIO_ANALYSIS,
      parameters: [
        {
          name: 'current_value',
          type: 'number',
          description: 'Current total portfolio value',
          required: true
        },
        {
          name: 'initial_value',
          type: 'number',
          description: 'Initial portfolio value',
          required: true,
          validation: 'value > 0'
        }
      ],
      excelSyntax: '=(current_value-initial_value)/initial_value',
      validation: [
        {
          type: 'business_logic',
          condition: 'initial_value > 0',
          message: 'Initial value must be positive',
          severity: 'error'
        }
      ],
      examples: [
        {
          description: 'Portfolio grew from $100,000 to $110,000',
          input: { current_value: 110000, initial_value: 100000 },
          expectedOutput: 0.1,
          excelFormula: '=(110000-100000)/100000'
        }
      ]
    });

    // Portfolio Weight
    this.formulas.set('portfolio_weight', {
      id: 'portfolio_weight',
      name: 'Portfolio Weight',
      formula: 'Position Value / Total Portfolio Value',
      description: 'Calculate the weight of a position in the portfolio',
      category: FinancialFormulaCategory.PORTFOLIO_ANALYSIS,
      parameters: [
        {
          name: 'position_value',
          type: 'number',
          description: 'Value of the individual position',
          required: true
        },
        {
          name: 'total_portfolio_value',
          type: 'number',
          description: 'Total portfolio value',
          required: true,
          validation: 'value > 0'
        }
      ],
      excelSyntax: '=position_value/total_portfolio_value',
      examples: [
        {
          description: 'Position worth $10,000 in $100,000 portfolio',
          input: { position_value: 10000, total_portfolio_value: 100000 },
          expectedOutput: 0.1,
          excelFormula: '=10000/100000'
        }
      ]
    });

    // Weighted Average Return
    this.formulas.set('weighted_average_return', {
      id: 'weighted_average_return',
      name: 'Weighted Average Return',
      formula: 'Σ(Weight × Return)',
      description: 'Calculate portfolio return as weighted average of individual returns',
      category: FinancialFormulaCategory.PORTFOLIO_ANALYSIS,
      parameters: [
        {
          name: 'weights',
          type: 'range',
          description: 'Range of portfolio weights',
          required: true
        },
        {
          name: 'returns',
          type: 'range',
          description: 'Range of individual asset returns',
          required: true
        }
      ],
      excelSyntax: '=SUMPRODUCT(weights,returns)'
    });
  }

  private addRiskManagementFormulas(): void {
    // Sharpe Ratio
    this.formulas.set('sharpe_ratio', {
      id: 'sharpe_ratio',
      name: 'Sharpe Ratio',
      formula: '(Portfolio Return - Risk Free Rate) / Portfolio Standard Deviation',
      description: 'Risk-adjusted return measure',
      category: FinancialFormulaCategory.RISK_MANAGEMENT,
      parameters: [
        {
          name: 'portfolio_return',
          type: 'number',
          description: 'Portfolio return',
          required: true
        },
        {
          name: 'risk_free_rate',
          type: 'number',
          description: 'Risk-free rate (e.g., Treasury rate)',
          required: true
        },
        {
          name: 'portfolio_std',
          type: 'number',
          description: 'Portfolio standard deviation',
          required: true,
          validation: 'value > 0'
        }
      ],
      excelSyntax: '=(portfolio_return-risk_free_rate)/portfolio_std',
      examples: [
        {
          description: '12% return, 2% risk-free rate, 15% volatility',
          input: { portfolio_return: 0.12, risk_free_rate: 0.02, portfolio_std: 0.15 },
          expectedOutput: 0.667,
          excelFormula: '=(0.12-0.02)/0.15'
        }
      ]
    });

    // Value at Risk (VaR)
    this.formulas.set('value_at_risk', {
      id: 'value_at_risk',
      name: 'Value at Risk (VaR)',
      formula: 'Portfolio Value × (Mean Return - Z-Score × Standard Deviation)',
      description: 'Maximum expected loss at a given confidence level',
      category: FinancialFormulaCategory.RISK_MANAGEMENT,
      parameters: [
        {
          name: 'portfolio_value',
          type: 'number',
          description: 'Current portfolio value',
          required: true
        },
        {
          name: 'mean_return',
          type: 'number',
          description: 'Mean daily return',
          required: true
        },
        {
          name: 'std_deviation',
          type: 'number',
          description: 'Standard deviation of returns',
          required: true
        },
        {
          name: 'confidence_level',
          type: 'number',
          description: 'Confidence level (e.g., 0.95 for 95%)',
          required: false,
          defaultValue: 0.95
        }
      ],
      excelSyntax: '=portfolio_value*(mean_return-NORM.S.INV(confidence_level)*std_deviation)'
    });

    // Beta
    this.formulas.set('beta', {
      id: 'beta',
      name: 'Beta',
      formula: 'Covariance(Asset, Market) / Variance(Market)',
      description: 'Measure of systematic risk relative to market',
      category: FinancialFormulaCategory.RISK_MANAGEMENT,
      parameters: [
        {
          name: 'asset_returns',
          type: 'range',
          description: 'Range of asset returns',
          required: true
        },
        {
          name: 'market_returns',
          type: 'range',
          description: 'Range of market returns',
          required: true
        }
      ],
      excelSyntax: '=COVARIANCE.P(asset_returns,market_returns)/VAR.P(market_returns)'
    });
  }

  private addPerformanceFormulas(): void {
    // Annualized Return
    this.formulas.set('annualized_return', {
      id: 'annualized_return',
      name: 'Annualized Return',
      formula: '((1 + Total Return) ^ (1/Years)) - 1',
      description: 'Convert total return to annualized return',
      category: FinancialFormulaCategory.PERFORMANCE,
      parameters: [
        {
          name: 'total_return',
          type: 'number',
          description: 'Total return over the period',
          required: true
        },
        {
          name: 'years',
          type: 'number',
          description: 'Number of years in the period',
          required: true,
          validation: 'value > 0'
        }
      ],
      excelSyntax: '=POWER(1+total_return,1/years)-1',
      examples: [
        {
          description: '50% return over 3 years',
          input: { total_return: 0.5, years: 3 },
          expectedOutput: 0.1447,
          excelFormula: '=POWER(1+0.5,1/3)-1'
        }
      ]
    });

    // Maximum Drawdown
    this.formulas.set('max_drawdown', {
      id: 'max_drawdown',
      name: 'Maximum Drawdown',
      formula: '(Trough Value - Peak Value) / Peak Value',
      description: 'Largest peak-to-trough decline',
      category: FinancialFormulaCategory.PERFORMANCE,
      parameters: [
        {
          name: 'portfolio_values',
          type: 'range',
          description: 'Range of portfolio values over time',
          required: true
        }
      ],
      excelSyntax: '=(MIN(portfolio_values)-MAX(portfolio_values))/MAX(portfolio_values)'
    });
  }

  private addValuationFormulas(): void {
    // Price-to-Earnings Ratio
    this.formulas.set('pe_ratio', {
      id: 'pe_ratio',
      name: 'Price-to-Earnings Ratio',
      formula: 'Stock Price / Earnings Per Share',
      description: 'Valuation multiple comparing price to earnings',
      category: FinancialFormulaCategory.VALUATION,
      parameters: [
        {
          name: 'stock_price',
          type: 'number',
          description: 'Current stock price',
          required: true
        },
        {
          name: 'earnings_per_share',
          type: 'number',
          description: 'Earnings per share',
          required: true,
          validation: 'value > 0'
        }
      ],
      excelSyntax: '=stock_price/earnings_per_share'
    });

    // Dividend Yield
    this.formulas.set('dividend_yield', {
      id: 'dividend_yield',
      name: 'Dividend Yield',
      formula: 'Annual Dividends Per Share / Stock Price',
      description: 'Annual dividend return as percentage of stock price',
      category: FinancialFormulaCategory.VALUATION,
      parameters: [
        {
          name: 'annual_dividend',
          type: 'number',
          description: 'Annual dividend per share',
          required: true
        },
        {
          name: 'stock_price',
          type: 'number',
          description: 'Current stock price',
          required: true,
          validation: 'value > 0'
        }
      ],
      excelSyntax: '=annual_dividend/stock_price'
    });
  }

  private addBusinessFormulas(): void {
    // Return on Investment (ROI)
    this.formulas.set('roi', {
      id: 'roi',
      name: 'Return on Investment (ROI)',
      formula: '(Gain - Cost) / Cost',
      description: 'Efficiency measure of an investment',
      category: FinancialFormulaCategory.PERFORMANCE,
      parameters: [
        {
          name: 'gain',
          type: 'number',
          description: 'Total gain from investment',
          required: true
        },
        {
          name: 'cost',
          type: 'number',
          description: 'Cost of investment',
          required: true,
          validation: 'value > 0'
        }
      ],
      excelSyntax: '=(gain-cost)/cost'
    });

    // Compound Annual Growth Rate (CAGR)
    this.formulas.set('cagr', {
      id: 'cagr',
      name: 'Compound Annual Growth Rate (CAGR)',
      formula: '((Ending Value / Beginning Value) ^ (1/Years)) - 1',
      description: 'Mean annual growth rate over a specified period',
      category: FinancialFormulaCategory.PERFORMANCE,
      parameters: [
        {
          name: 'ending_value',
          type: 'number',
          description: 'Final value',
          required: true
        },
        {
          name: 'beginning_value',
          type: 'number',
          description: 'Initial value',
          required: true,
          validation: 'value > 0'
        },
        {
          name: 'years',
          type: 'number',
          description: 'Number of years',
          required: true,
          validation: 'value > 0'
        }
      ],
      excelSyntax: '=POWER(ending_value/beginning_value,1/years)-1'
    });
  }

  private organizeFormulasByCategory(): void {
    for (const formula of this.formulas.values()) {
      const categoryFormulas = this.formulasByCategory.get(formula.category) || [];
      categoryFormulas.push(formula);
      this.formulasByCategory.set(formula.category, categoryFormulas);
    }
  }

  private isColumnSynonym(columnName: string, parameterName: string): boolean {
    const synonyms: Record<string, string[]> = {
      'current_value': ['market_value', 'value', 'current', 'total'],
      'initial_value': ['cost', 'purchase_price', 'initial', 'original'],
      'portfolio_return': ['return', 'gain', 'profit'],
      'stock_price': ['price', 'quote', 'last_price'],
      'earnings_per_share': ['eps', 'earnings'],
      'annual_dividend': ['dividend', 'div', 'annual_div']
    };

    return synonyms[parameterName]?.some(synonym => 
      columnName.includes(synonym)
    ) || false;
  }

  private validateParameterType(param: FormulaParameter, value: any): string | null {
    switch (param.type) {
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return `Parameter '${param.name}' must be a valid number`;
        }
        break;
      case 'range':
        if (!Array.isArray(value)) {
          return `Parameter '${param.name}' must be a range (array) of values`;
        }
        break;
      case 'text':
        if (typeof value !== 'string') {
          return `Parameter '${param.name}' must be text`;
        }
        break;
      case 'date':
        if (!(value instanceof Date) && typeof value !== 'string') {
          return `Parameter '${param.name}' must be a valid date`;
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          return `Parameter '${param.name}' must be true or false`;
        }
        break;
    }
    return null;
  }

  private validateParameterRule(param: FormulaParameter, value: any): string | null {
    if (!param.validation) return null;

    // Simple validation rule parsing
    if (param.validation === 'value > 0' && value <= 0) {
      return `Parameter '${param.name}' must be greater than 0`;
    }

    return null;
  }
}