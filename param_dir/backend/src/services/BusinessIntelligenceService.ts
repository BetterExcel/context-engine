/**
 * Business Intelligence Service
 * Provides business domain expertise and KPI analysis capabilities
 */

import {
  DomainClassification,
  MetricDefinition,
  MetricCategory,
  BusinessPattern,
  DomainPattern,
  KPIDefinition,
  BusinessInsight,
  DomainRecommendation
} from '../types/domain-intelligence';
import { IntelligentSpreadsheetData, DomainType } from '../types/enhanced-intelligence';

export class BusinessIntelligenceService {
  private businessKPIs: Map<string, KPIDefinition> = new Map();
  private businessMetrics: Map<string, MetricDefinition> = new Map();
  private industryBenchmarks: Map<string, Record<string, number>> = new Map();

  constructor() {
    this.initializeBusinessKPIs();
    this.initializeBusinessMetrics();
    this.initializeIndustryBenchmarks();
  }

  /**
   * Detect business patterns in spreadsheet data
   */
  public detectBusinessPatterns(data: IntelligentSpreadsheetData): DomainPattern[] {
    const patterns: DomainPattern[] = [];

    // Detect sales data pattern
    const salesPattern = this.detectSalesPattern(data);
    if (salesPattern) patterns.push(salesPattern);

    // Detect KPI dashboard pattern
    const kpiPattern = this.detectKPIPattern(data);
    if (kpiPattern) patterns.push(kpiPattern);

    // Detect employee data pattern
    const employeePattern = this.detectEmployeePattern(data);
    if (employeePattern) patterns.push(employeePattern);

    // Detect inventory pattern
    const inventoryPattern = this.detectInventoryPattern(data);
    if (inventoryPattern) patterns.push(inventoryPattern);

    // Detect customer data pattern
    const customerPattern = this.detectCustomerPattern(data);
    if (customerPattern) patterns.push(customerPattern);

    // Detect marketing metrics pattern
    const marketingPattern = this.detectMarketingPattern(data);
    if (marketingPattern) patterns.push(marketingPattern);

    return patterns;
  }

  /**
   * Get applicable business KPIs based on detected patterns
   */
  public getApplicableKPIs(patterns: DomainPattern[]): KPIDefinition[] {
    const kpis: KPIDefinition[] = [];

    for (const pattern of patterns) {
      switch (pattern.type) {
        case BusinessPattern.SALES_DATA:
          kpis.push(
            this.businessKPIs.get('revenue_growth')!,
            this.businessKPIs.get('conversion_rate')!,
            this.businessKPIs.get('average_deal_size')!,
            this.businessKPIs.get('sales_cycle_length')!
          );
          break;
        case BusinessPattern.KPI_DASHBOARD:
          kpis.push(...Array.from(this.businessKPIs.values()));
          break;
        case BusinessPattern.EMPLOYEE_DATA:
          kpis.push(
            this.businessKPIs.get('employee_turnover')!,
            this.businessKPIs.get('productivity_per_employee')!,
            this.businessKPIs.get('training_completion_rate')!
          );
          break;
        case BusinessPattern.INVENTORY:
          kpis.push(
            this.businessKPIs.get('inventory_turnover')!,
            this.businessKPIs.get('stockout_rate')!,
            this.businessKPIs.get('carrying_cost_ratio')!
          );
          break;
        case BusinessPattern.CUSTOMER_DATA:
          kpis.push(
            this.businessKPIs.get('customer_lifetime_value')!,
            this.businessKPIs.get('customer_acquisition_cost')!,
            this.businessKPIs.get('churn_rate')!,
            this.businessKPIs.get('nps_score')!
          );
          break;
        case BusinessPattern.MARKETING_METRICS:
          kpis.push(
            this.businessKPIs.get('marketing_roi')!,
            this.businessKPIs.get('lead_conversion_rate')!,
            this.businessKPIs.get('cost_per_lead')!,
            this.businessKPIs.get('brand_awareness')!
          );
          break;
      }
    }

    return kpis.filter(kpi => kpi !== undefined);
  }

  /**
   * Generate business insights from data analysis
   */
  public generateBusinessInsights(
    data: IntelligentSpreadsheetData,
    patterns: DomainPattern[]
  ): BusinessInsight[] {
    const insights: BusinessInsight[] = [];

    for (const pattern of patterns) {
      switch (pattern.type) {
        case BusinessPattern.SALES_DATA:
          insights.push(...this.analyzeSalesData(data, pattern));
          break;
        case BusinessPattern.EMPLOYEE_DATA:
          insights.push(...this.analyzeEmployeeData(data, pattern));
          break;
        case BusinessPattern.INVENTORY:
          insights.push(...this.analyzeInventoryData(data, pattern));
          break;
        case BusinessPattern.CUSTOMER_DATA:
          insights.push(...this.analyzeCustomerData(data, pattern));
          break;
        case BusinessPattern.MARKETING_METRICS:
          insights.push(...this.analyzeMarketingData(data, pattern));
          break;
      }
    }

    return insights;
  }

  /**
   * Get business recommendations based on analysis
   */
  public getBusinessRecommendations(
    patterns: DomainPattern[],
    insights: BusinessInsight[]
  ): DomainRecommendation[] {
    const recommendations: DomainRecommendation[] = [];

    // Generate recommendations based on patterns
    for (const pattern of patterns) {
      recommendations.push(...this.getPatternRecommendations(pattern));
    }

    // Generate recommendations based on insights
    for (const insight of insights) {
      if (insight.actionable && insight.suggestedActions) {
        recommendations.push({
          type: 'analysis',
          priority: insight.impact === 'high' ? 'high' : 'medium',
          title: `Action for ${insight.title}`,
          description: insight.description,
          implementation: insight.suggestedActions.join('; '),
          expectedBenefit: `Address ${insight.type} with ${insight.impact} impact`,
          effort: 'medium'
        });
      }
    }

    return recommendations;
  }

  /**
   * Calculate business metrics for given data
   */
  public calculateBusinessMetrics(
    data: IntelligentSpreadsheetData,
    patterns: DomainPattern[]
  ): Record<string, number> {
    const metrics: Record<string, number> = {};

    for (const pattern of patterns) {
      const patternMetrics = this.calculatePatternMetrics(data, pattern);
      Object.assign(metrics, patternMetrics);
    }

    return metrics;
  }

  // Private helper methods

  private getColumnNames(data: IntelligentSpreadsheetData): string[] {
    const firstSheet = data.sheets[0];
    if (!firstSheet || !firstSheet.data || firstSheet.data.length === 0) {
      return [];
    }
    
    const headerRow = firstSheet.data[0];
    return headerRow.map(cell => cell.value?.toString().toLowerCase() || '');
  }

  private getDataRowCount(data: IntelligentSpreadsheetData): number {
    const firstSheet = data.sheets[0];
    if (!firstSheet || !firstSheet.data) {
      return 0;
    }
    return firstSheet.data.length;
  }

  private detectSalesPattern(data: IntelligentSpreadsheetData): DomainPattern | null {
    const salesKeywords = ['revenue', 'sales', 'deal', 'customer', 'product', 'price', 'quantity', 'total'];
    
    const firstSheet = data.sheets[0];
    if (!firstSheet || !firstSheet.data || firstSheet.data.length === 0) {
      return null;
    }
    
    const headerRow = firstSheet.data[0];
    const columnNames = headerRow.map(cell => cell.value?.toString().toLowerCase() || '');
    
    const matchedKeywords = salesKeywords.filter(keyword => 
      columnNames.some(name => name.includes(keyword))
    );

    if (matchedKeywords.length >= 4) {
      return {
        type: BusinessPattern.SALES_DATA,
        confidence: matchedKeywords.length / salesKeywords.length,
        location: {
          startRow: 0,
          endRow: this.getDataRowCount(data) - 1,
          startCol: 0,
          endCol: columnNames.length - 1
        },
        keyColumns: matchedKeywords,
        metadata: {
          detectedKeywords: matchedKeywords,
          suggestedAnalysis: ['Revenue trends', 'Product performance', 'Customer analysis']
        }
      };
    }

    return null;
  }

  private detectKPIPattern(data: IntelligentSpreadsheetData): DomainPattern | null {
    const kpiKeywords = ['kpi', 'metric', 'target', 'actual', 'variance', 'performance', 'goal'];
    
    const firstSheet = data.sheets[0];
    if (!firstSheet || !firstSheet.data || firstSheet.data.length === 0) {
      return null;
    }
    
    const headerRow = firstSheet.data[0];
    const columnNames = headerRow.map(cell => cell.value?.toString().toLowerCase() || '');
    
    const matchedKeywords = kpiKeywords.filter(keyword => 
      columnNames.some(name => name.includes(keyword))
    );

    if (matchedKeywords.length >= 3) {
      return {
        type: BusinessPattern.KPI_DASHBOARD,
        confidence: matchedKeywords.length / kpiKeywords.length,
        location: {
          startRow: 0,
          endRow: firstSheet.data.length - 1,
          startCol: 0,
          endCol: columnNames.length - 1
        },
        keyColumns: matchedKeywords,
        metadata: {
          detectedKeywords: matchedKeywords,
          suggestedAnalysis: ['Performance tracking', 'Target vs actual analysis', 'Trend analysis']
        }
      };
    }

    return null;
  }

  private detectEmployeePattern(data: IntelligentSpreadsheetData): DomainPattern | null {
    const employeeKeywords = ['employee', 'staff', 'name', 'department', 'salary', 'hire_date', 'performance'];
    
    const firstSheet = data.sheets[0];
    if (!firstSheet || !firstSheet.data || firstSheet.data.length === 0) {
      return null;
    }
    
    const headerRow = firstSheet.data[0];
    const columnNames = headerRow.map(cell => cell.value?.toString().toLowerCase() || '');
    
    const matchedKeywords = employeeKeywords.filter(keyword => 
      columnNames.some(name => name.includes(keyword))
    );

    if (matchedKeywords.length >= 3) {
      return {
        type: BusinessPattern.EMPLOYEE_DATA,
        confidence: matchedKeywords.length / employeeKeywords.length,
        location: {
          startRow: 0,
          endRow: this.getDataRowCount(data) - 1,
          startCol: 0,
          endCol: columnNames.length - 1
        },
        keyColumns: matchedKeywords,
        metadata: {
          detectedKeywords: matchedKeywords,
          suggestedAnalysis: ['Headcount analysis', 'Compensation analysis', 'Performance metrics']
        }
      };
    }

    return null;
  }

  private detectInventoryPattern(data: IntelligentSpreadsheetData): DomainPattern | null {
    const inventoryKeywords = ['inventory', 'stock', 'sku', 'product', 'quantity', 'warehouse', 'reorder'];
    const columnNames = this.getColumnNames(data);
    
    if (columnNames.length === 0) return null;
    
    const matchedKeywords = inventoryKeywords.filter(keyword => 
      columnNames.some(name => name.includes(keyword))
    );

    if (matchedKeywords.length >= 3) {
      return {
        type: BusinessPattern.INVENTORY,
        confidence: matchedKeywords.length / inventoryKeywords.length,
        location: {
          startRow: 0,
          endRow: this.getDataRowCount(data) - 1,
          startCol: 0,
          endCol: columnNames.length - 1
        },
        keyColumns: matchedKeywords,
        metadata: {
          detectedKeywords: matchedKeywords,
          suggestedAnalysis: ['Stock levels', 'Turnover rates', 'Reorder analysis']
        }
      };
    }

    return null;
  }

  private detectCustomerPattern(data: IntelligentSpreadsheetData): DomainPattern | null {
    const customerKeywords = ['customer', 'client', 'contact', 'email', 'phone', 'address', 'segment'];
    const columnNames = this.getColumnNames(data);
    
    if (columnNames.length === 0) return null;
    
    const matchedKeywords = customerKeywords.filter(keyword => 
      columnNames.some(name => name.includes(keyword))
    );

    if (matchedKeywords.length >= 3) {
      return {
        type: BusinessPattern.CUSTOMER_DATA,
        confidence: matchedKeywords.length / customerKeywords.length,
        location: {
          startRow: 0,
          endRow: this.getDataRowCount(data) - 1,
          startCol: 0,
          endCol: columnNames.length - 1
        },
        keyColumns: matchedKeywords,
        metadata: {
          detectedKeywords: matchedKeywords,
          suggestedAnalysis: ['Customer segmentation', 'Lifetime value', 'Churn analysis']
        }
      };
    }

    return null;
  }

  private detectMarketingPattern(data: IntelligentSpreadsheetData): DomainPattern | null {
    const marketingKeywords = ['campaign', 'leads', 'conversion', 'ctr', 'impressions', 'clicks', 'roi'];
    const columnNames = this.getColumnNames(data);
    
    if (columnNames.length === 0) return null;
    
    const matchedKeywords = marketingKeywords.filter(keyword => 
      columnNames.some(name => name.includes(keyword))
    );

    if (matchedKeywords.length >= 3) {
      return {
        type: BusinessPattern.MARKETING_METRICS,
        confidence: matchedKeywords.length / marketingKeywords.length,
        location: {
          startRow: 0,
          endRow: this.getDataRowCount(data) - 1,
          startCol: 0,
          endCol: columnNames.length - 1
        },
        keyColumns: matchedKeywords,
        metadata: {
          detectedKeywords: matchedKeywords,
          suggestedAnalysis: ['Campaign performance', 'ROI analysis', 'Conversion funnel']
        }
      };
    }

    return null;
  }

  private analyzeSalesData(data: IntelligentSpreadsheetData, pattern: DomainPattern): BusinessInsight[] {
    const insights: BusinessInsight[] = [];

    insights.push({
      type: 'trend',
      title: 'Sales Performance Analysis',
      description: 'Analyzing sales trends, product performance, and revenue patterns',
      confidence: 0.9,
      impact: 'high',
      actionable: true,
      suggestedActions: [
        'Calculate revenue growth rates',
        'Identify top-performing products',
        'Analyze seasonal trends',
        'Review customer acquisition patterns'
      ],
      supportingData: []
    });

    return insights;
  }

  private analyzeEmployeeData(data: IntelligentSpreadsheetData, pattern: DomainPattern): BusinessInsight[] {
    const insights: BusinessInsight[] = [];

    insights.push({
      type: 'opportunity',
      title: 'Human Resources Analysis',
      description: 'Analyzing employee metrics, performance, and organizational health',
      confidence: 0.85,
      impact: 'medium',
      actionable: true,
      suggestedActions: [
        'Calculate employee turnover rates',
        'Analyze compensation benchmarks',
        'Review performance distributions',
        'Identify training needs'
      ],
      supportingData: []
    });

    return insights;
  }

  private analyzeInventoryData(data: IntelligentSpreadsheetData, pattern: DomainPattern): BusinessInsight[] {
    const insights: BusinessInsight[] = [];

    insights.push({
      type: 'risk',
      title: 'Inventory Management Analysis',
      description: 'Analyzing inventory levels, turnover rates, and stock optimization',
      confidence: 0.8,
      impact: 'medium',
      actionable: true,
      suggestedActions: [
        'Calculate inventory turnover ratios',
        'Identify slow-moving stock',
        'Optimize reorder points',
        'Analyze carrying costs'
      ],
      supportingData: []
    });

    return insights;
  }

  private analyzeCustomerData(data: IntelligentSpreadsheetData, pattern: DomainPattern): BusinessInsight[] {
    const insights: BusinessInsight[] = [];

    insights.push({
      type: 'opportunity',
      title: 'Customer Analytics',
      description: 'Analyzing customer behavior, segmentation, and lifetime value',
      confidence: 0.88,
      impact: 'high',
      actionable: true,
      suggestedActions: [
        'Calculate customer lifetime value',
        'Perform customer segmentation',
        'Analyze churn patterns',
        'Identify upselling opportunities'
      ],
      supportingData: []
    });

    return insights;
  }

  private analyzeMarketingData(data: IntelligentSpreadsheetData, pattern: DomainPattern): BusinessInsight[] {
    const insights: BusinessInsight[] = [];

    insights.push({
      type: 'benchmark',
      title: 'Marketing Performance Analysis',
      description: 'Analyzing marketing campaign effectiveness and ROI',
      confidence: 0.82,
      impact: 'medium',
      actionable: true,
      suggestedActions: [
        'Calculate marketing ROI',
        'Analyze conversion funnels',
        'Compare campaign performance',
        'Optimize budget allocation'
      ],
      supportingData: []
    });

    return insights;
  }

  private getPatternRecommendations(pattern: DomainPattern): DomainRecommendation[] {
    const recommendations: DomainRecommendation[] = [];

    switch (pattern.type) {
      case BusinessPattern.SALES_DATA:
        recommendations.push({
          type: 'analysis',
          priority: 'high',
          title: 'Sales Performance Dashboard',
          description: 'Create comprehensive sales analytics dashboard',
          implementation: 'Build pivot tables and charts for revenue, product, and customer analysis',
          expectedBenefit: 'Improved sales visibility and decision-making',
          effort: 'medium'
        });
        break;
      case BusinessPattern.KPI_DASHBOARD:
        recommendations.push({
          type: 'visualization',
          priority: 'medium',
          title: 'KPI Visualization Enhancement',
          description: 'Enhance KPI dashboard with interactive visualizations',
          implementation: 'Add charts, conditional formatting, and trend indicators',
          expectedBenefit: 'Better performance monitoring and insights',
          effort: 'low'
        });
        break;
    }

    return recommendations;
  }

  private calculatePatternMetrics(data: IntelligentSpreadsheetData, pattern: DomainPattern): Record<string, number> {
    const metrics: Record<string, number> = {};

    // This would contain actual metric calculations based on the data
    // For now, returning placeholder values
    switch (pattern.type) {
      case BusinessPattern.SALES_DATA:
        metrics['total_revenue'] = 0; // Calculate from data
        metrics['average_deal_size'] = 0; // Calculate from data
        break;
      case BusinessPattern.EMPLOYEE_DATA:
        metrics['headcount'] = this.getDataRowCount(data) - 1; // Subtract header row
        metrics['average_salary'] = 0; // Calculate from data
        break;
    }

    return metrics;
  }

  // Initialize business KPIs
  private initializeBusinessKPIs(): void {
    // Sales KPIs
    this.businessKPIs.set('revenue_growth', {
      id: 'revenue_growth',
      name: 'Revenue Growth Rate',
      description: 'Percentage increase in revenue over a period',
      category: MetricCategory.SALES,
      formula: '((Current Period Revenue - Previous Period Revenue) / Previous Period Revenue) * 100',
      unit: '%',
      trend: 'higher_better',
      frequency: 'monthly'
    });

    this.businessKPIs.set('conversion_rate', {
      id: 'conversion_rate',
      name: 'Lead Conversion Rate',
      description: 'Percentage of leads that convert to customers',
      category: MetricCategory.SALES,
      formula: '(Number of Conversions / Number of Leads) * 100',
      unit: '%',
      trend: 'higher_better',
      frequency: 'monthly'
    });

    // Customer KPIs
    this.businessKPIs.set('customer_lifetime_value', {
      id: 'customer_lifetime_value',
      name: 'Customer Lifetime Value',
      description: 'Total revenue expected from a customer over their lifetime',
      category: MetricCategory.CUSTOMER,
      formula: 'Average Purchase Value * Purchase Frequency * Customer Lifespan',
      unit: '$',
      trend: 'higher_better',
      frequency: 'quarterly'
    });

    this.businessKPIs.set('churn_rate', {
      id: 'churn_rate',
      name: 'Customer Churn Rate',
      description: 'Percentage of customers who stop using the service',
      category: MetricCategory.CUSTOMER,
      formula: '(Customers Lost / Total Customers at Start) * 100',
      unit: '%',
      trend: 'lower_better',
      frequency: 'monthly'
    });

    // Add more KPIs...
  }

  private initializeBusinessMetrics(): void {
    // Initialize business metrics definitions
  }

  private initializeIndustryBenchmarks(): void {
    // Initialize industry benchmark data
    this.industryBenchmarks.set('retail', {
      'gross_margin': 0.25,
      'inventory_turnover': 6.0,
      'customer_acquisition_cost': 50
    });

    this.industryBenchmarks.set('saas', {
      'monthly_churn_rate': 0.05,
      'customer_lifetime_value': 1200,
      'gross_margin': 0.80
    });
  }
}