# Domain-Specific Usage Guide

This guide provides specialized usage patterns and best practices for different business domains and use cases with the Excel Context Engine.

## Table of Contents

- [Financial Services](#financial-services)
- [Healthcare & Life Sciences](#healthcare--life-sciences)
- [Sales & Marketing](#sales--marketing)
- [Operations & Supply Chain](#operations--supply-chain)
- [Human Resources](#human-resources)
- [Research & Analytics](#research--analytics)
- [Education](#education)
- [Real Estate](#real-estate)

## Financial Services

### Portfolio Management

**Common Use Cases**:
- Portfolio performance analysis
- Risk assessment and attribution
- Rebalancing recommendations
- Tax-loss harvesting
- Compliance reporting

**Optimized Request Patterns**:

```javascript
// Portfolio analysis requests
const portfolioRequests = {
  performance: "Analyze portfolio performance and calculate key metrics like Sharpe ratio, alpha, and beta",
  risk: "Identify concentration risk and suggest position sizing adjustments",
  attribution: "Calculate performance attribution by sector and individual holdings",
  rebalancing: "Suggest portfolio rebalancing to optimize risk-return profile",
  compliance: "Check portfolio compliance with investment mandates and limits"
};

// Example API usage for portfolio analysis
async function analyzePortfolio(spreadsheetId) {
  const analyses = await Promise.all([
    analyzeContext(spreadsheetId, portfolioRequests.performance, "A1:K100"),
    analyzeContext(spreadsheetId, portfolioRequests.risk, "A1:K100"),
    analyzeContext(spreadsheetId, portfolioRequests.attribution, "A1:K100")
  ]);
  
  return {
    performance: analyses[0],
    risk: analyses[1],
    attribution: analyses[2]
  };
}
```

**Financial Formulas and Calculations**:

The system recognizes and helps with financial formulas:
- **Sharpe Ratio**: `=(Portfolio_Return - Risk_Free_Rate) / Portfolio_Volatility`
- **Beta Calculation**: `=COVAR(Stock_Returns, Market_Returns) / VAR(Market_Returns)`
- **Value at Risk**: `=PERCENTILE(Returns, 0.05) * Portfolio_Value`
- **Maximum Drawdown**: `=MIN(Running_Returns) - MAX(Running_Returns)`

### Trading and Risk Management

**Request Examples**:
```bash
# Position sizing analysis
curl -X POST http://localhost:3000/api/v1/analyze-context \
  -H "Content-Type: application/json" \
  -d '{
    "request": "Calculate optimal position sizes based on Kelly Criterion and risk limits",
    "spreadsheetId": "trading_001",
    "currentSelection": {
      "sheet": "Positions",
      "range": "A1:J50",
      "activeCell": "A1"
    }
  }'

# Risk metrics calculation
curl -X POST http://localhost:3000/api/v1/analyze-context \
  -H "Content-Type: application/json" \
  -d '{
    "request": "Calculate VaR, CVaR, and stress test scenarios for this trading portfolio",
    "spreadsheetId": "trading_001", 
    "currentSelection": {
      "sheet": "Risk",
      "range": "A1:M100",
      "activeCell": "A1"
    }
  }'
```

### Credit Analysis

**Specialized Requests**:
- "Analyze credit portfolio default probabilities and expected losses"
- "Calculate credit risk metrics including PD, LGD, and EAD"
- "Assess loan portfolio concentration by industry and geography"
- "Generate stress test scenarios for credit losses"

## Healthcare & Life Sciences

### Clinical Trial Data

**Common Analysis Patterns**:

```javascript
const clinicalRequests = {
  efficacy: "Analyze primary and secondary endpoint results for statistical significance",
  safety: "Identify adverse events patterns and safety signals",
  demographics: "Analyze patient demographics and baseline characteristics",
  compliance: "Calculate protocol compliance and deviation rates",
  biomarkers: "Correlate biomarker levels with treatment outcomes"
};

// Clinical data analysis workflow
async function analyzeClinicalTrial(spreadsheetId) {
  return {
    efficacy: await analyzeContext(spreadsheetId, clinicalRequests.efficacy, "A1:Z1000"),
    safety: await analyzeContext(spreadsheetId, clinicalRequests.safety, "AA1:AZ1000"),
    demographics: await analyzeContext(spreadsheetId, clinicalRequests.demographics, "A1:M500")
  };
}
```

**Statistical Analysis Support**:
- P-value calculations and significance testing
- Confidence interval calculations
- Survival analysis (Kaplan-Meier)
- Regression analysis for biomarkers
- Power analysis for sample size

### Pharmaceutical Research

**Request Examples**:
```bash
# Drug efficacy analysis
curl -X POST http://localhost:3000/api/v1/analyze-context \
  -H "Content-Type: application/json" \
  -d '{
    "request": "Analyze drug efficacy data and calculate statistical significance using t-tests and ANOVA",
    "spreadsheetId": "pharma_study_001",
    "currentSelection": {
      "sheet": "Efficacy",
      "range": "A1:P500",
      "activeCell": "A1"
    }
  }'

# Adverse events analysis
curl -X POST http://localhost:3000/api/v1/analyze-context \
  -H "Content-Type: application/json" \
  -d '{
    "request": "Identify patterns in adverse events and calculate incidence rates by treatment group",
    "spreadsheetId": "pharma_study_001",
    "currentSelection": {
      "sheet": "Safety",
      "range": "A1:L1000",
      "activeCell": "A1"
    }
  }'
```

### Healthcare Operations

**Specialized Use Cases**:
- Patient flow analysis and capacity planning
- Resource utilization optimization
- Quality metrics tracking (readmission rates, infection rates)
- Cost analysis and budget variance reporting
- Staffing optimization based on patient acuity

## Sales & Marketing

### Sales Performance Analysis

**Key Metrics and Requests**:

```javascript
const salesRequests = {
  performance: "Analyze sales performance by rep, region, and product line",
  pipeline: "Evaluate sales pipeline health and conversion rates",
  forecasting: "Generate sales forecasts based on historical trends and pipeline data",
  territory: "Analyze territory performance and identify optimization opportunities",
  customer: "Segment customers by value and identify upselling opportunities"
};

// Sales dashboard analysis
async function generateSalesDashboard(spreadsheetId) {
  const analyses = await Promise.all([
    analyzeContext(spreadsheetId, salesRequests.performance, "A1:R1000"),
    analyzeContext(spreadsheetId, salesRequests.pipeline, "S1:Z1000"),
    analyzeContext(spreadsheetId, salesRequests.forecasting, "A1:Z1000")
  ]);
  
  return {
    performance: analyses[0],
    pipeline: analyses[1],
    forecasting: analyses[2]
  };
}
```

**Sales Formulas and KPIs**:
- **Conversion Rate**: `=Closed_Won / Total_Opportunities`
- **Average Deal Size**: `=SUM(Deal_Values) / COUNT(Deals)`
- **Sales Velocity**: `=(Opportunities * Win_Rate * Average_Deal_Size) / Sales_Cycle_Length`
- **Customer Lifetime Value**: `=Average_Purchase_Value * Purchase_Frequency * Customer_Lifespan`

### Marketing Campaign Analysis

**Request Examples**:
```bash
# Campaign ROI analysis
curl -X POST http://localhost:3000/api/v1/analyze-context \
  -H "Content-Type: application/json" \
  -d '{
    "request": "Calculate ROI and ROAS for each marketing campaign and identify top performers",
    "spreadsheetId": "marketing_campaigns_q3",
    "currentSelection": {
      "sheet": "Campaign_Data",
      "range": "A1:O500",
      "activeCell": "A1"
    }
  }'

# Customer acquisition analysis
curl -X POST http://localhost:3000/api/v1/analyze-context \
  -H "Content-Type: application/json" \
  -d '{
    "request": "Analyze customer acquisition costs by channel and calculate payback periods",
    "spreadsheetId": "marketing_campaigns_q3",
    "currentSelection": {
      "sheet": "Acquisition",
      "range": "A1:M1000",
      "activeCell": "A1"
    }
  }'
```

### Customer Analytics

**Specialized Analysis**:
- Customer segmentation using RFM analysis
- Churn prediction and retention analysis
- Net Promoter Score (NPS) analysis
- Customer journey mapping and touchpoint analysis
- Cohort analysis for retention tracking

## Operations & Supply Chain

### Inventory Management

**Common Requests**:

```javascript
const inventoryRequests = {
  optimization: "Optimize inventory levels to minimize carrying costs while avoiding stockouts",
  turnover: "Calculate inventory turnover rates and identify slow-moving items",
  forecasting: "Generate demand forecasts based on historical sales patterns",
  abc_analysis: "Perform ABC analysis to categorize inventory by value and importance",
  safety_stock: "Calculate optimal safety stock levels based on demand variability"
};

// Inventory analysis workflow
async function analyzeInventory(spreadsheetId) {
  return {
    optimization: await analyzeContext(spreadsheetId, inventoryRequests.optimization, "A1:P5000"),
    turnover: await analyzeContext(spreadsheetId, inventoryRequests.turnover, "A1:P5000"),
    abc_analysis: await analyzeContext(spreadsheetId, inventoryRequests.abc_analysis, "A1:P5000")
  };
}
```

**Inventory Formulas**:
- **Inventory Turnover**: `=Cost_of_Goods_Sold / Average_Inventory`
- **Days Sales Outstanding**: `=Average_Inventory / (COGS / 365)`
- **Economic Order Quantity**: `=SQRT((2 * Annual_Demand * Order_Cost) / Holding_Cost)`
- **Safety Stock**: `=Z_Score * SQRT(Lead_Time) * Demand_Standard_Deviation`

### Supply Chain Analytics

**Request Examples**:
```bash
# Supplier performance analysis
curl -X POST http://localhost:3000/api/v1/analyze-context \
  -H "Content-Type: application/json" \
  -d '{
    "request": "Analyze supplier performance metrics including on-time delivery, quality scores, and cost trends",
    "spreadsheetId": "supplier_scorecard_2024",
    "currentSelection": {
      "sheet": "Supplier_Metrics",
      "range": "A1:T1000",
      "activeCell": "A1"
    }
  }'

# Logistics optimization
curl -X POST http://localhost:3000/api/v1/analyze-context \
  -H "Content-Type: application/json" \
  -d '{
    "request": "Optimize shipping routes and identify cost reduction opportunities in logistics network",
    "spreadsheetId": "logistics_data_2024",
    "currentSelection": {
      "sheet": "Shipping",
      "range": "A1:R2000",
      "activeCell": "A1"
    }
  }'
```

### Manufacturing Analytics

**Specialized Use Cases**:
- Overall Equipment Effectiveness (OEE) analysis
- Quality control and defect rate analysis
- Production capacity planning and optimization
- Maintenance scheduling and predictive analytics
- Cost analysis and variance reporting

## Human Resources

### Workforce Analytics

**Key HR Metrics**:

```javascript
const hrRequests = {
  turnover: "Analyze employee turnover rates by department, role, and tenure",
  performance: "Evaluate performance ratings and identify high/low performers",
  compensation: "Analyze compensation equity and market competitiveness",
  engagement: "Assess employee engagement survey results and identify improvement areas",
  diversity: "Analyze workforce diversity metrics and track progress on inclusion goals"
};

// HR analytics dashboard
async function generateHRDashboard(spreadsheetId) {
  const analyses = await Promise.all([
    analyzeContext(spreadsheetId, hrRequests.turnover, "A1:M2000"),
    analyzeContext(spreadsheetId, hrRequests.performance, "N1:Z2000"),
    analyzeContext(spreadsheetId, hrRequests.compensation, "AA1:AO2000")
  ]);
  
  return {
    turnover: analyses[0],
    performance: analyses[1],
    compensation: analyses[2]
  };
}
```

**HR Formulas and Calculations**:
- **Turnover Rate**: `=Departures / Average_Headcount * 100`
- **Time to Fill**: `=AVERAGE(Hire_Date - Requisition_Date)`
- **Cost per Hire**: `=Total_Recruiting_Costs / Number_of_Hires`
- **Employee Engagement Score**: `=AVERAGE(Engagement_Survey_Scores)`

### Talent Management

**Request Examples**:
```bash
# Performance analysis
curl -X POST http://localhost:3000/api/v1/analyze-context \
  -H "Content-Type: application/json" \
  -d '{
    "request": "Analyze performance review data to identify top talent and development opportunities",
    "spreadsheetId": "performance_reviews_2024",
    "currentSelection": {
      "sheet": "Reviews",
      "range": "A1:S1500",
      "activeCell": "A1"
    }
  }'

# Compensation equity analysis
curl -X POST http://localhost:3000/api/v1/analyze-context \
  -H "Content-Type: application/json" \
  -d '{
    "request": "Analyze compensation data for pay equity issues and market competitiveness",
    "spreadsheetId": "compensation_analysis_2024",
    "currentSelection": {
      "sheet": "Salary_Data",
      "range": "A1:P2000",
      "activeCell": "A1"
    }
  }'
```

## Research & Analytics

### Scientific Research

**Research Data Analysis**:

```javascript
const researchRequests = {
  statistical: "Perform statistical analysis including hypothesis testing and correlation analysis",
  experimental: "Analyze experimental results and calculate effect sizes and confidence intervals",
  survey: "Analyze survey data and identify significant patterns and relationships",
  longitudinal: "Analyze longitudinal data trends and perform time series analysis",
  meta_analysis: "Combine results from multiple studies for meta-analysis"
};

// Research analysis workflow
async function analyzeResearchData(spreadsheetId) {
  return {
    statistical: await analyzeContext(spreadsheetId, researchRequests.statistical, "A1:Z1000"),
    experimental: await analyzeContext(spreadsheetId, researchRequests.experimental, "A1:Z1000")
  };
}
```

**Statistical Analysis Support**:
- Descriptive statistics (mean, median, standard deviation)
- Inferential statistics (t-tests, ANOVA, chi-square)
- Correlation and regression analysis
- Non-parametric tests (Mann-Whitney, Kruskal-Wallis)
- Power analysis and sample size calculations

### Market Research

**Request Examples**:
```bash
# Consumer survey analysis
curl -X POST http://localhost:3000/api/v1/analyze-context \
  -H "Content-Type: application/json" \
  -d '{
    "request": "Analyze consumer survey responses and identify key insights about brand preferences",
    "spreadsheetId": "consumer_survey_2024",
    "currentSelection": {
      "sheet": "Survey_Responses",
      "range": "A1:AZ5000",
      "activeCell": "A1"
    }
  }'

# Competitive analysis
curl -X POST http://localhost:3000/api/v1/analyze-context \
  -H "Content-Type: application/json" \
  -d '{
    "request": "Analyze competitive pricing data and identify market positioning opportunities",
    "spreadsheetId": "competitive_analysis_q4",
    "currentSelection": {
      "sheet": "Pricing_Data",
      "range": "A1:O500",
      "activeCell": "A1"
    }
  }'
```

## Education

### Academic Performance Analysis

**Educational Metrics**:

```javascript
const educationRequests = {
  performance: "Analyze student performance data and identify at-risk students",
  curriculum: "Evaluate curriculum effectiveness and learning outcomes",
  assessment: "Analyze assessment results and identify knowledge gaps",
  engagement: "Measure student engagement and participation metrics",
  retention: "Analyze retention rates and factors affecting student success"
};

// Academic analytics
async function analyzeAcademicData(spreadsheetId) {
  return {
    performance: await analyzeContext(spreadsheetId, educationRequests.performance, "A1:T2000"),
    curriculum: await analyzeContext(spreadsheetId, educationRequests.curriculum, "A1:T2000")
  };
}
```

**Educational Formulas**:
- **GPA Calculation**: `=SUMPRODUCT(Grades, Credit_Hours) / SUM(Credit_Hours)`
- **Pass Rate**: `=COUNTIF(Grades, ">=70") / COUNT(Grades) * 100`
- **Retention Rate**: `=Students_Continuing / Students_Enrolled * 100`
- **Completion Rate**: `=Students_Graduated / Students_Started * 100`

### Learning Analytics

**Request Examples**:
```bash
# Student performance analysis
curl -X POST http://localhost:3000/api/v1/analyze-context \
  -H "Content-Type: application/json" \
  -d '{
    "request": "Analyze student grade data to identify performance trends and at-risk students",
    "spreadsheetId": "student_grades_fall2024",
    "currentSelection": {
      "sheet": "Grades",
      "range": "A1:R1000",
      "activeCell": "A1"
    }
  }'

# Course effectiveness analysis
curl -X POST http://localhost:3000/api/v1/analyze-context \
  -H "Content-Type: application/json" \
  -d '{
    "request": "Evaluate course effectiveness by analyzing learning outcomes and student feedback",
    "spreadsheetId": "course_evaluation_2024",
    "currentSelection": {
      "sheet": "Evaluations",
      "range": "A1:P500",
      "activeCell": "A1"
    }
  }'
```

## Real Estate

### Property Analysis

**Real Estate Metrics**:

```javascript
const realEstateRequests = {
  valuation: "Analyze property values and calculate comparative market analysis",
  investment: "Evaluate investment properties and calculate ROI metrics",
  market_trends: "Analyze market trends and price movements by location",
  rental_analysis: "Analyze rental yields and cash flow projections",
  portfolio: "Evaluate real estate portfolio performance and diversification"
};

// Real estate analysis
async function analyzeRealEstate(spreadsheetId) {
  return {
    valuation: await analyzeContext(spreadsheetId, realEstateRequests.valuation, "A1:S1000"),
    investment: await analyzeContext(spreadsheetId, realEstateRequests.investment, "A1:S1000")
  };
}
```

**Real Estate Formulas**:
- **Cap Rate**: `=Net_Operating_Income / Property_Value * 100`
- **Cash-on-Cash Return**: `=Annual_Cash_Flow / Initial_Investment * 100`
- **Gross Rent Multiplier**: `=Property_Price / Annual_Rental_Income`
- **Debt Service Coverage Ratio**: `=Net_Operating_Income / Annual_Debt_Service`

### Market Analysis

**Request Examples**:
```bash
# Property valuation analysis
curl -X POST http://localhost:3000/api/v1/analyze-context \
  -H "Content-Type: application/json" \
  -d '{
    "request": "Analyze comparable property sales to determine fair market value",
    "spreadsheetId": "property_comps_2024",
    "currentSelection": {
      "sheet": "Comparables",
      "range": "A1:T500",
      "activeCell": "A1"
    }
  }'

# Investment analysis
curl -X POST http://localhost:3000/api/v1/analyze-context \
  -H "Content-Type: application/json" \
  -d '{
    "request": "Calculate investment returns and cash flow projections for rental properties",
    "spreadsheetId": "investment_properties_2024",
    "currentSelection": {
      "sheet": "Investments",
      "range": "A1:R200",
      "activeCell": "A1"
    }
  }'
```

## Best Practices by Domain

### Data Quality Considerations

**Financial Services**:
- Ensure price data is current and adjusted for splits/dividends
- Validate currency conversions and exchange rates
- Check for missing or stale market data
- Implement data reconciliation processes

**Healthcare**:
- Maintain patient privacy and HIPAA compliance
- Validate clinical data entry and coding
- Ensure statistical significance in analysis
- Document data provenance and audit trails

**Sales & Marketing**:
- Clean and deduplicate customer data
- Standardize product and territory codes
- Validate attribution models and conversion tracking
- Ensure data freshness for real-time analysis

### Performance Optimization by Domain

**Large Datasets (Research, Healthcare)**:
- Use statistical sampling for initial analysis
- Implement progressive data loading
- Cache frequently accessed calculations
- Optimize database queries with proper indexing

**Real-time Analysis (Sales, Trading)**:
- Implement streaming data processing
- Use in-memory caching for hot data
- Optimize API response times
- Set up automated refresh schedules

**Complex Calculations (Finance, Research)**:
- Break complex formulas into components
- Use vectorized operations where possible
- Implement parallel processing for independent calculations
- Cache intermediate results

This domain-specific guide provides tailored approaches for maximizing the Excel Context Engine's effectiveness across different business verticals and use cases.