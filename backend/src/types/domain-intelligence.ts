/**
 * Domain Intelligence types and interfaces
 * Supporting domain-specific analysis and business intelligence
 */

import { EnhancedDataType, DomainType, IntelligentSpreadsheetData } from './enhanced-intelligence';
import { CellReference } from './enhanced-intelligence';

// Domain classification with confidence scoring
export interface DomainClassification {
  primaryDomain: DomainType;
  subDomains: DomainType[];
  confidence: number;
  applicableRules: DomainRule[];
  suggestedMetrics: MetricDefinition[];
  detectedPatterns: DomainPattern[];
}

// Domain-specific business rules
export interface DomainRule {
  id: string;
  name: string;
  domain: DomainType;
  description: string;
  condition: string;
  severity: 'info' | 'warning' | 'error';
  suggestedFix?: string;
  applicableColumns?: string[];
}

// Financial domain patterns
export enum FinancialPattern {
  PORTFOLIO_HOLDINGS = 'portfolio_holdings',
  PROFIT_LOSS = 'profit_loss',
  BALANCE_SHEET = 'balance_sheet',
  CASH_FLOW = 'cash_flow',
  TRADING_DATA = 'trading_data',
  RISK_METRICS = 'risk_metrics',
  PERFORMANCE_METRICS = 'performance_metrics'
}

// Business domain patterns
export enum BusinessPattern {
  SALES_DATA = 'sales_data',
  KPI_DASHBOARD = 'kpi_dashboard',
  EMPLOYEE_DATA = 'employee_data',
  INVENTORY = 'inventory',
  CUSTOMER_DATA = 'customer_data',
  MARKETING_METRICS = 'marketing_metrics',
  OPERATIONAL_METRICS = 'operational_metrics'
}

// Domain pattern detection
export interface DomainPattern {
  type: FinancialPattern | BusinessPattern | string;
  confidence: number;
  location: {
    startRow: number;
    endRow: number;
    startCol: number;
    endCol: number;
  };
  keyColumns: string[];
  metadata: Record<string, any>;
}

// Metric definitions for business intelligence
export interface MetricDefinition {
  id: string;
  name: string;
  formula: string;
  description: string;
  category: MetricCategory;
  domain: DomainType;
  applicableColumns?: string[];
  dependencies?: string[];
  unit?: string;
  format?: string;
}

// Metric categories
export enum MetricCategory {
  // Financial metrics
  PROFITABILITY = 'profitability',
  LIQUIDITY = 'liquidity',
  EFFICIENCY = 'efficiency',
  LEVERAGE = 'leverage',
  VALUATION = 'valuation',
  RISK = 'risk',
  RETURN = 'return',
  
  // Business metrics
  SALES = 'sales',
  MARKETING = 'marketing',
  OPERATIONS = 'operations',
  CUSTOMER = 'customer',
  EMPLOYEE = 'employee',
  QUALITY = 'quality',
  GROWTH = 'growth'
}

// Financial formula library
export interface FinancialFormula {
  id: string;
  name: string;
  formula: string;
  description: string;
  category: FinancialFormulaCategory;
  parameters: FormulaParameter[];
  excelSyntax: string;
  validation?: ValidationRule[];
  examples?: FormulaExample[];
}

// Financial formula categories
export enum FinancialFormulaCategory {
  PORTFOLIO_ANALYSIS = 'portfolio_analysis',
  RISK_MANAGEMENT = 'risk_management',
  VALUATION = 'valuation',
  PERFORMANCE = 'performance',
  DERIVATIVES = 'derivatives',
  FIXED_INCOME = 'fixed_income',
  EQUITY_ANALYSIS = 'equity_analysis'
}

// Formula parameters
export interface FormulaParameter {
  name: string;
  type: 'number' | 'range' | 'text' | 'date' | 'boolean';
  description: string;
  required: boolean;
  defaultValue?: any;
  validation?: string;
}

// Formula examples
export interface FormulaExample {
  description: string;
  input: Record<string, any>;
  expectedOutput: any;
  excelFormula: string;
}

// Validation rules for formulas
export interface ValidationRule {
  type: 'range' | 'format' | 'dependency' | 'business_logic';
  condition: string;
  message: string;
  severity: 'warning' | 'error';
}

// Business KPI definitions
export interface KPIDefinition {
  id: string;
  name: string;
  description: string;
  category: MetricCategory;
  formula: string;
  unit: string;
  target?: number;
  benchmark?: number;
  trend: 'higher_better' | 'lower_better' | 'target_based';
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
}

// Portfolio analysis templates
export interface PortfolioTemplate {
  id: string;
  name: string;
  description: string;
  requiredColumns: PortfolioColumn[];
  calculations: PortfolioCalculation[];
  riskMetrics: RiskMetric[];
  reports: ReportTemplate[];
}

// Portfolio column definitions
export interface PortfolioColumn {
  name: string;
  type: EnhancedDataType;
  required: boolean;
  description: string;
  validation?: ValidationRule[];
  synonyms?: string[];
}

// Portfolio calculations
export interface PortfolioCalculation {
  name: string;
  formula: string;
  description: string;
  dependencies: string[];
  outputColumn: string;
}

// Risk metrics for portfolio analysis
export interface RiskMetric {
  name: string;
  formula: string;
  description: string;
  category: 'volatility' | 'downside' | 'correlation' | 'concentration';
  interpretation: string;
}

// Report templates
export interface ReportTemplate {
  name: string;
  sections: ReportSection[];
  charts?: ChartDefinition[];
  summary: string;
}

// Report sections
export interface ReportSection {
  title: string;
  content: string;
  calculations: string[];
  visualizations?: string[];
}

// Chart definitions
export interface ChartDefinition {
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'histogram';
  title: string;
  xAxis: string;
  yAxis: string;
  data: string[];
}

// Domain-enhanced analysis result
export interface DomainEnhancedAnalysis {
  domainClassification: DomainClassification;
  applicableMetrics: MetricDefinition[];
  suggestedFormulas: FinancialFormula[];
  kpiRecommendations: KPIDefinition[];
  templateMatches: PortfolioTemplate[];
  businessInsights: BusinessInsight[];
  riskAssessment?: RiskAssessment;
  recommendations: DomainRecommendation[];
}

// Business insights from domain analysis
export interface BusinessInsight {
  type: 'trend' | 'anomaly' | 'opportunity' | 'risk' | 'benchmark';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  actionable: boolean;
  suggestedActions?: string[];
  supportingData: CellReference[];
}

// Risk assessment for financial data
export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high';
  riskFactors: RiskFactor[];
  mitigationStrategies: string[];
  monitoringRecommendations: string[];
}

// Individual risk factors
export interface RiskFactor {
  type: 'market' | 'credit' | 'operational' | 'liquidity' | 'concentration';
  severity: 'low' | 'medium' | 'high';
  description: string;
  probability: number;
  impact: number;
  mitigation?: string;
}

// Domain-specific recommendations
export interface DomainRecommendation {
  type: 'analysis' | 'formula' | 'visualization' | 'validation' | 'optimization';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  implementation: string;
  expectedBenefit: string;
  effort: 'low' | 'medium' | 'high';
}

// Industry-specific validation
export interface IndustryValidation {
  industry: string;
  rules: ValidationRule[];
  benchmarks: Record<string, number>;
  standards: IndustryStandard[];
}

// Industry standards
export interface IndustryStandard {
  name: string;
  description: string;
  requirement: string;
  compliance: 'mandatory' | 'recommended' | 'optional';
  source: string;
}