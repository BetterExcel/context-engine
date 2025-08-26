# Financial Portfolio Analysis Examples

This document provides comprehensive examples of using the Excel Context Engine for financial portfolio analysis, using real portfolio data to demonstrate advanced capabilities.

## Sample Portfolio Data

The examples in this guide use a real portfolio dataset (`OpenPositions_7_28_2025.csv`) containing:

- **10 equity positions** across US and Indian markets
- **Portfolio metrics**: Market value, average price paid, quantity, P&L
- **Multi-currency holdings**: USD and INR positions
- **Diverse sectors**: Technology, healthcare, aerospace, consumer goods

### Portfolio Overview

```csv
Symbol,CompanyName,MarketValueDelayed,AveragePricePaid,Quantity,ProfitLoss,ProfitLossPercentage,Currency,Exchange,SecurityType,MarginRequirements
500820,Asian Paints Ltd,37363.45,2868.4,1000,-8069.19,-17.76,INR,BO,Equity,0
AAPL,Apple Inc,146642.33,226.55,500,-8563.56,-5.52,USD,US,Equity,0
COIN,Coinbase Global Inc,146630.25,257.32,282,47204.98,47.48,USD,US,Equity,0
DJT,Trump Media & Technology Group Corp,128727.37,16.2,5000,17743.69,15.99,USD,US,Equity,0
EL,Estee Lauder Cos Inc,138177.15,66.79,1090,38427.35,38.52,USD,US,Equity,0
```

## Basic Portfolio Analysis Examples

### 1. Portfolio Performance Overview

**Scenario**: Get a comprehensive overview of portfolio performance.

**Request**: "Analyze the overall performance of this investment portfolio"

**API Call**:
```bash
curl -X POST http://localhost:3000/api/v1/analyze-context \
  -H "Content-Type: application/json" \
  -d '{
    "request": "Analyze the overall performance of this investment portfolio",
    "spreadsheetId": "portfolio_001",
    "currentSelection": {
      "sheet": "Portfolio",
      "range": "A1:K11",
      "activeCell": "A1"
    }
  }'
```

**Expected Context Analysis**:
```json
{
  "requestId": "req_portfolio_001",
  "requestAnalysis": {
    "intent": "portfolio_analysis",
    "scope": "comprehensive_overview",
    "confidence": 0.96,
    "domainContext": "financial_portfolio"
  },
  "context": {
    "immediate": {
      "portfolioMetrics": {
        "totalPositions": 10,
        "totalMarketValue": 1070161.95,
        "totalProfitLoss": 86018.51,
        "averageReturn": 8.74,
        "currencies": ["USD", "INR"],
        "exchanges": ["US", "BO"]
      }
    },
    "patterns": {
      "performanceInsights": [
        "Portfolio shows strong overall performance with 8.74% average return",
        "Top performer: Coinbase (COIN) with 47.48% gain",
        "Largest loss: Asian Paints (500820) with -17.76% decline",
        "Technology sector dominance with Apple, Coinbase, and Trump Media",
        "Geographic diversification across US and Indian markets"
      ],
      "riskAnalysis": [
        "High concentration risk with top 3 positions representing 60% of portfolio",
        "Significant exposure to volatile tech stocks (COIN, DJT)",
        "Currency risk from INR exposure (Asian Paints position)"
      ]
    }
  },
  "naturalLanguageDescription": "This is a diversified equity portfolio with 10 positions valued at approximately $1.07M. The portfolio shows strong performance with an 8.74% average return, led by significant gains in Coinbase (+47.48%) and Trump Media (+15.99%). However, there are notable losses in Asian Paints (-17.76%) and Apple (-5.52%). The portfolio has good geographic diversification across US and Indian markets but shows concentration risk in technology stocks.",
  "actionableInfo": {
    "suggestedAnalyses": [
      "Calculate portfolio beta and risk metrics",
      "Analyze sector allocation and diversification",
      "Review position sizing and concentration risk",
      "Assess currency hedging needs for INR exposure"
    ],
    "keyMetrics": [
      "Total Return: +8.74%",
      "Best Performer: COIN (+47.48%)",
      "Worst Performer: 500820 (-17.76%)",
      "Portfolio Value: $1,070,162"
    ]
  }
}
```

### 2. Risk Analysis and Position Sizing

**Request**: "Identify concentration risk and suggest optimal position sizing"

**API Call**:
```bash
curl -X POST http://localhost:3000/api/v1/analyze-context \
  -H "Content-Type: application/json" \
  -d '{
    "request": "Identify concentration risk and suggest optimal position sizing for this portfolio",
    "spreadsheetId": "portfolio_001",
    "currentSelection": {
      "sheet": "Portfolio",
      "range": "A1:K11",
      "activeCell": "C2"
    }
  }'
```

**Expected Analysis**:
```json
{
  "requestAnalysis": {
    "intent": "risk_analysis",
    "scope": "position_sizing",
    "confidence": 0.94
  },
  "context": {
    "patterns": {
      "concentrationAnalysis": [
        {
          "position": "AAPL",
          "marketValue": 146642.33,
          "portfolioWeight": "13.7%",
          "riskLevel": "moderate",
          "recommendation": "Consider reducing to 8-10% maximum"
        },
        {
          "position": "COIN", 
          "marketValue": 146630.25,
          "portfolioWeight": "13.7%",
          "riskLevel": "high",
          "recommendation": "High volatility - reduce to 5% maximum"
        },
        {
          "position": "EL",
          "marketValue": 138177.15,
          "portfolioWeight": "12.9%",
          "riskLevel": "moderate",
          "recommendation": "Appropriate sizing for consumer staples"
        }
      ],
      "riskMetrics": {
        "top3Concentration": "40.3%",
        "singlePositionMax": "13.7%",
        "recommendedMaxSingle": "10%",
        "diversificationScore": 6.2
      }
    }
  },
  "actionableInfo": {
    "riskRecommendations": [
      "Reduce COIN position from 13.7% to 5% (high volatility crypto exposure)",
      "Trim AAPL position from 13.7% to 10% (large cap tech concentration)",
      "Consider adding defensive sectors (utilities, consumer staples)",
      "Implement stop-loss orders for high-beta positions (COIN, DJT)"
    ],
    "positionSizingFormulas": [
      "=C2/SUM(C:C) // Calculate individual position weights",
      "=IF(C2/SUM(C:C)>0.1,\"Overweight\",\"Appropriate\") // Flag overweight positions",
      "=STDEV(F:F) // Calculate portfolio volatility from P&L percentages"
    ]
  }
}
```

### 3. Sector and Geographic Allocation Analysis

**Request**: "Analyze sector allocation and geographic diversification"

**Expected Analysis**:
```json
{
  "context": {
    "patterns": {
      "sectorAllocation": [
        {
          "sector": "Technology",
          "positions": ["AAPL", "COIN", "DJT", "AMAT"],
          "totalValue": 517520.35,
          "portfolioWeight": "48.4%",
          "recommendation": "Overweight - consider rebalancing"
        },
        {
          "sector": "Healthcare/Biotech",
          "positions": ["BSX"],
          "totalValue": 72509.34,
          "portfolioWeight": "6.8%",
          "recommendation": "Underweight - consider increasing"
        },
        {
          "sector": "Consumer Discretionary",
          "positions": ["EL"],
          "totalValue": 138177.15,
          "portfolioWeight": "12.9%",
          "recommendation": "Appropriate allocation"
        }
      ],
      "geographicAllocation": [
        {
          "region": "United States",
          "positions": 9,
          "totalValue": 1032798.50,
          "portfolioWeight": "96.5%"
        },
        {
          "region": "India",
          "positions": 1,
          "totalValue": 37363.45,
          "portfolioWeight": "3.5%"
        }
      ]
    }
  },
  "actionableInfo": {
    "rebalancingRecommendations": [
      "Reduce technology allocation from 48.4% to 30-35%",
      "Increase healthcare exposure to 10-15%",
      "Add financial services sector (currently 0%)",
      "Consider increasing international exposure beyond 3.5%"
    ]
  }
}
```

## Advanced Financial Analysis Examples

### 4. Performance Attribution Analysis

**Request**: "Calculate performance attribution by sector and identify key drivers"

**Expected Analysis**:
```json
{
  "context": {
    "patterns": {
      "performanceAttribution": [
        {
          "sector": "Technology",
          "contribution": "+6.2%",
          "keyDrivers": [
            "COIN: +47.48% contributed +6.5% to portfolio return",
            "DJT: +15.99% contributed +2.1% to portfolio return",
            "AAPL: -5.52% detracted -0.8% from portfolio return"
          ]
        },
        {
          "sector": "Consumer Discretionary", 
          "contribution": "+4.9%",
          "keyDrivers": [
            "EL: +38.52% contributed +4.9% to portfolio return"
          ]
        }
      ],
      "topContributors": [
        "COIN: +6.5% portfolio contribution",
        "EL: +4.9% portfolio contribution", 
        "DJT: +2.1% portfolio contribution"
      ],
      "topDetractors": [
        "500820: -0.7% portfolio contribution",
        "AAPL: -0.8% portfolio contribution"
      ]
    }
  },
  "actionableInfo": {
    "attributionFormulas": [
      "=F2*(C2/SUM(C:C)) // Individual position contribution to portfolio return",
      "=SUMPRODUCT((F2:F11)*(C2:C11)/SUM(C2:C11)) // Total portfolio return",
      "=SUMIFS(contribution_range,sector_range,\"Technology\") // Sector contribution"
    ]
  }
}
```

### 5. Risk-Adjusted Returns and Sharpe Ratio Analysis

**Request**: "Calculate risk-adjusted returns and Sharpe ratios for each position"

**Expected Analysis**:
```json
{
  "context": {
    "patterns": {
      "riskAdjustedMetrics": [
        {
          "symbol": "BSX",
          "return": "1.12%",
          "estimatedVolatility": "18%",
          "sharpeRatio": 0.062,
          "riskRating": "Low"
        },
        {
          "symbol": "COIN",
          "return": "47.48%", 
          "estimatedVolatility": "85%",
          "sharpeRatio": 0.559,
          "riskRating": "Very High"
        },
        {
          "symbol": "AAPL",
          "return": "-5.52%",
          "estimatedVolatility": "25%",
          "sharpeRatio": -0.221,
          "riskRating": "Moderate"
        }
      ],
      "portfolioMetrics": {
        "portfolioReturn": "8.74%",
        "portfolioVolatility": "28.5%",
        "portfolioSharpe": 0.307,
        "maxDrawdown": "-17.76%"
      }
    }
  },
  "actionableInfo": {
    "riskFormulas": [
      "=F2/ESTIMATED_VOLATILITY // Simple Sharpe approximation",
      "=STDEV(historical_returns)*SQRT(252) // Annualized volatility",
      "=MAX(running_max-current_value)/running_max // Maximum drawdown calculation"
    ],
    "riskRecommendations": [
      "COIN shows high return but extreme volatility - consider position sizing",
      "BSX offers good risk-adjusted returns - consider increasing allocation",
      "Portfolio Sharpe ratio of 0.307 is moderate - room for improvement"
    ]
  }
}
```

### 6. Currency Risk Analysis

**Request**: "Analyze currency exposure and hedging requirements"

**Expected Analysis**:
```json
{
  "context": {
    "patterns": {
      "currencyExposure": [
        {
          "currency": "USD",
          "exposure": 1032798.50,
          "portfolioWeight": "96.5%",
          "hedgingRecommendation": "Consider partial hedging if base currency is not USD"
        },
        {
          "currency": "INR", 
          "exposure": 37363.45,
          "portfolioWeight": "3.5%",
          "hedgingRecommendation": "Small exposure - natural hedge acceptable"
        }
      ],
      "currencyRisk": {
        "primaryRisk": "USD exposure represents 96.5% of portfolio",
        "secondaryRisk": "INR volatility affects Asian Paints position",
        "hedgingCost": "Estimated 1-2% annually for full USD hedge"
      }
    }
  },
  "actionableInfo": {
    "hedgingStrategies": [
      "Consider currency ETFs for USD exposure if base currency differs",
      "Monitor USD/INR exchange rate for Asian Paints impact",
      "Evaluate cost-benefit of currency hedging vs natural diversification"
    ]
  }
}
```

## Portfolio Optimization Examples

### 7. Rebalancing Recommendations

**Request**: "Suggest portfolio rebalancing to optimize risk-return profile"

**Expected Analysis**:
```json
{
  "context": {
    "patterns": {
      "currentAllocation": {
        "technology": "48.4%",
        "healthcare": "6.8%", 
        "consumer": "12.9%",
        "aerospace": "9.1%",
        "materials": "4.1%",
        "paints": "3.5%"
      },
      "targetAllocation": {
        "technology": "30%",
        "healthcare": "15%",
        "consumer": "15%",
        "aerospace": "10%",
        "financials": "10%",
        "materials": "10%",
        "international": "10%"
      },
      "rebalancingActions": [
        {
          "action": "SELL",
          "symbol": "COIN",
          "currentWeight": "13.7%",
          "targetWeight": "5%",
          "amountToSell": "$93,000"
        },
        {
          "action": "TRIM",
          "symbol": "AAPL", 
          "currentWeight": "13.7%",
          "targetWeight": "10%",
          "amountToSell": "$40,000"
        },
        {
          "action": "BUY",
          "sector": "Financials",
          "currentWeight": "0%",
          "targetWeight": "10%",
          "amountToBuy": "$107,000"
        }
      ]
    }
  },
  "actionableInfo": {
    "rebalancingFormulas": [
      "=C2-(TARGET_WEIGHT*SUM(C:C)) // Calculate over/under weight amounts",
      "=ABS(CURRENT_WEIGHT-TARGET_WEIGHT)*PORTFOLIO_VALUE // Rebalancing amount needed",
      "=SUMPRODUCT(ABS(current_weights-target_weights))/2 // Portfolio turnover required"
    ],
    "implementationSteps": [
      "1. Reduce COIN position by $93,000 (high volatility)",
      "2. Trim AAPL by $40,000 (concentration risk)",
      "3. Add financial sector ETF or individual stocks",
      "4. Consider international diversification beyond Asian Paints"
    ]
  }
}
```

### 8. Tax-Loss Harvesting Opportunities

**Request**: "Identify tax-loss harvesting opportunities in this portfolio"

**Expected Analysis**:
```json
{
  "context": {
    "patterns": {
      "taxLossOpportunities": [
        {
          "symbol": "500820",
          "unrealizedLoss": -8069.19,
          "lossPercentage": "-17.76%",
          "taxBenefit": "~$2,017 (assuming 25% tax rate)",
          "recommendation": "Strong candidate for tax-loss harvesting"
        },
        {
          "symbol": "AAPL",
          "unrealizedLoss": -8563.56,
          "lossPercentage": "-5.52%", 
          "taxBenefit": "~$2,141 (assuming 25% tax rate)",
          "recommendation": "Consider harvesting if no wash sale concerns"
        },
        {
          "symbol": "AMAT",
          "unrealizedLoss": -2317.64,
          "lossPercentage": "-4.97%",
          "taxBenefit": "~$579 (assuming 25% tax rate)",
          "recommendation": "Smaller benefit but still worthwhile"
        }
      ],
      "taxStrategy": {
        "totalHarvestableLosse": -18950.39,
        "estimatedTaxSavings": 4737.60,
        "offsetGains": "Can offset gains from COIN, EL, DJT, BSX, BA"
      }
    }
  },
  "actionableInfo": {
    "harvestingStrategy": [
      "Harvest Asian Paints loss (-$8,069) - largest tax benefit",
      "Consider AAPL loss harvesting (-$8,564) if no recent purchases",
      "Use losses to offset gains from COIN (+$47,205) and EL (+$38,427)",
      "Maintain portfolio exposure through similar securities or ETFs"
    ],
    "washSaleConsiderations": [
      "Wait 31 days before repurchasing identical securities",
      "Consider similar but not identical alternatives (e.g., different tech ETFs)",
      "Track purchase dates to avoid wash sale violations"
    ]
  }
}
```

## Performance Monitoring Examples

### 9. Portfolio Tracking Dashboard

**Request**: "Create a comprehensive portfolio tracking dashboard with key metrics"

**Expected Analysis**:
```json
{
  "context": {
    "patterns": {
      "dashboardMetrics": [
        {
          "category": "Performance",
          "metrics": [
            "Total Return: +8.74%",
            "Total P&L: +$86,019",
            "Best Position: COIN (+47.48%)",
            "Worst Position: 500820 (-17.76%)",
            "Win Rate: 60% (6 of 10 positions positive)"
          ]
        },
        {
          "category": "Risk",
          "metrics": [
            "Portfolio Beta: ~1.2 (estimated)",
            "Max Drawdown: -17.76%",
            "Concentration Risk: 40.3% in top 3",
            "Sector Risk: 48.4% in Technology",
            "Currency Risk: 96.5% USD exposure"
          ]
        },
        {
          "category": "Allocation",
          "metrics": [
            "Total Positions: 10",
            "Total Value: $1,070,162",
            "Average Position Size: $107,016",
            "Largest Position: $146,642 (AAPL)",
            "Smallest Position: $37,363 (500820)"
          ]
        }
      ]
    }
  },
  "actionableInfo": {
    "dashboardFormulas": [
      "=SUM(F:F) // Total portfolio P&L",
      "=COUNTIF(F:F,\">0\")/COUNT(F:F) // Win rate calculation", 
      "=MAX(C:C)/SUM(C:C) // Largest position concentration",
      "=STDEV(F:F) // Portfolio volatility from returns",
      "=SUMIF(H:H,\"USD\",C:C)/SUM(C:C) // USD exposure percentage"
    ],
    "visualizationSuggestions": [
      "Pie chart for sector allocation",
      "Bar chart for individual position returns",
      "Line chart for portfolio value over time",
      "Heat map for risk-return positioning",
      "Gauge charts for key risk metrics"
    ]
  }
}
```

### 10. Automated Alerts and Monitoring

**Request**: "Set up automated alerts for portfolio risk management"

**Expected Analysis**:
```json
{
  "context": {
    "patterns": {
      "alertConditions": [
        {
          "type": "Position Size Alert",
          "condition": "Any position > 15% of portfolio",
          "currentTriggers": "None (max is 13.7%)",
          "formula": "=IF(C2/SUM(C:C)>0.15,\"ALERT: Overweight\",\"OK\")"
        },
        {
          "type": "Loss Alert", 
          "condition": "Any position down > 20%",
          "currentTriggers": "None (worst is -17.76%)",
          "formula": "=IF(F2<-0.20,\"ALERT: Large Loss\",\"OK\")"
        },
        {
          "type": "Concentration Alert",
          "condition": "Top 3 positions > 50% of portfolio",
          "currentTriggers": "None (currently 40.3%)",
          "formula": "=IF(SUM(LARGE(C:C,{1;2;3}))/SUM(C:C)>0.5,\"ALERT\",\"OK\")"
        }
      ],
      "monitoringMetrics": [
        "Daily P&L changes > 5%",
        "Individual position moves > 10%", 
        "Sector allocation drift > 5%",
        "Currency exposure changes",
        "New 52-week highs/lows"
      ]
    }
  },
  "actionableInfo": {
    "alertFormulas": [
      "=IF(ABS((TODAY_VALUE-YESTERDAY_VALUE)/YESTERDAY_VALUE)>0.05,\"Daily Alert\",\"\")",
      "=IF(COUNTIF(position_changes,\">10%\")>0,\"Position Alert\",\"\")",
      "=IF(MAX(sector_weights)-MIN(sector_weights)>target_range,\"Rebalance Alert\",\"\")"
    ],
    "implementationSteps": [
      "Set up daily portfolio valuation tracking",
      "Create conditional formatting for alert conditions", 
      "Implement email/SMS notifications for critical alerts",
      "Build automated rebalancing recommendations"
    ]
  }
}
```

## Integration with Financial Tools

### 11. Excel Integration for Portfolio Management

**Scenario**: Using context analysis to enhance Excel-based portfolio management.

**Excel Formulas Generated**:
```excel
// Portfolio Performance Calculations
=SUMPRODUCT((C2:C11/SUM(C2:C11)),F2:F11) // Weighted average return
=SQRT(SUMPRODUCT((F2:F11-portfolio_return)^2,(C2:C11/SUM(C2:C11)))) // Portfolio volatility
=portfolio_return/portfolio_volatility // Sharpe ratio approximation

// Risk Metrics
=MAX(C2:C11)/SUM(C2:C11) // Concentration ratio
=SUMPRODUCT((C2:C11/SUM(C2:C11))^2) // Herfindahl concentration index
=COUNTIF(F2:F11,">0")/COUNT(F2:F11) // Win rate

// Rebalancing Calculations
=C2-(target_weight*SUM(C2:C11)) // Amount to buy/sell for rebalancing
=ABS(current_weight-target_weight)*portfolio_value // Rebalancing amount
=SUMPRODUCT(ABS(current_weights-target_weights))/2 // Total turnover required
```

### 12. API Integration for Real-Time Analysis

**Python Integration Example**:
```python
import requests
import pandas as pd

class PortfolioAnalyzer:
    def __init__(self, api_base_url):
        self.api_url = api_base_url
    
    def upload_portfolio(self, csv_file_path):
        """Upload portfolio CSV and get spreadsheet ID"""
        with open(csv_file_path, 'rb') as f:
            files = {'file': f}
            response = requests.post(f"{self.api_url}/upload-spreadsheet", files=files)
        return response.json()['spreadsheetId']
    
    def analyze_performance(self, spreadsheet_id):
        """Get comprehensive portfolio performance analysis"""
        payload = {
            "request": "Analyze portfolio performance and identify key risks",
            "spreadsheetId": spreadsheet_id,
            "currentSelection": {
                "sheet": "Sheet1",
                "range": "A1:K20",
                "activeCell": "A1"
            }
        }
        response = requests.post(f"{self.api_url}/analyze-context", json=payload)
        return response.json()
    
    def get_rebalancing_recommendations(self, spreadsheet_id):
        """Get portfolio rebalancing recommendations"""
        payload = {
            "request": "Suggest portfolio rebalancing to optimize risk-return profile",
            "spreadsheetId": spreadsheet_id,
            "currentSelection": {
                "sheet": "Sheet1", 
                "range": "A1:K20",
                "activeCell": "C2"
            }
        }
        response = requests.post(f"{self.api_url}/analyze-context", json=payload)
        return response.json()

# Usage example
analyzer = PortfolioAnalyzer('http://localhost:3000/api/v1')
spreadsheet_id = analyzer.upload_portfolio('OpenPositions_7_28_2025.csv')
performance = analyzer.analyze_performance(spreadsheet_id)
rebalancing = analyzer.get_rebalancing_recommendations(spreadsheet_id)

print("Portfolio Performance:", performance['naturalLanguageDescription'])
print("Rebalancing Recommendations:", rebalancing['actionableInfo'])
```

## Best Practices for Financial Analysis

### Data Quality Considerations

1. **Ensure Data Accuracy**:
   - Verify market values are current
   - Check for missing or null values
   - Validate currency conversions
   - Confirm position quantities

2. **Handle Multi-Currency Portfolios**:
   - Convert to base currency for analysis
   - Track currency exposure separately
   - Consider hedging costs in calculations
   - Monitor exchange rate impacts

3. **Risk Management**:
   - Set position size limits (typically 5-10% max)
   - Monitor sector concentration
   - Track correlation between positions
   - Implement stop-loss levels

### Performance Optimization for Large Portfolios

1. **Efficient Data Processing**:
   - Use strategic cell selections for large portfolios
   - Focus analysis on specific metrics or positions
   - Implement caching for repeated calculations
   - Break complex analysis into smaller requests

2. **Batch Processing**:
   - Process multiple portfolios in sequence
   - Use consistent data formats
   - Implement error handling for failed uploads
   - Cache results for dashboard updates

This comprehensive guide demonstrates how the Excel Context Engine can transform basic portfolio data into sophisticated financial analysis, providing institutional-quality insights for investment decision-making.