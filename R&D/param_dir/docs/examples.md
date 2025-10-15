# Examples

This document provides practical examples of using the Excel Context Engine for various spreadsheet analysis tasks.

## Basic Examples

### 1. Simple Formula Assistance

**Scenario**: You have a sales spreadsheet and want to calculate totals.

**Spreadsheet Data**:
```
A       B        C
Product Quantity Price
Apple   10       1.50
Banana  15       0.80
Orange  8        2.00
```

**Request**: "Help me create a formula to calculate the total value for each product"

**API Call**:
```bash
curl -X POST http://localhost:3000/api/v1/analyze-context \
  -H "Content-Type: application/json" \
  -d '{
    "request": "Help me create a formula to calculate the total value for each product",
    "spreadsheetId": "abc123",
    "currentSelection": {
      "sheet": "Sheet1",
      "range": "A1:C4",
      "activeCell": "D1"
    }
  }'
```

**Expected Response**:
```json
{
  "requestId": "req_001",
  "requestAnalysis": {
    "intent": "formula_assistance",
    "scope": "current_selection",
    "confidence": 0.95
  },
  "context": {
    "immediate": {
      "selectedData": [
        ["Product", "Quantity", "Price"],
        ["Apple", 10, 1.50],
        ["Banana", 15, 0.80],
        ["Orange", 8, 2.00]
      ],
      "activeCell": { "value": null, "dataType": "number" }
    }
  },
  "naturalLanguageDescription": "The user has selected a product sales table with columns for Product, Quantity, and Price. They want to create a formula to calculate the total value (Quantity × Price) for each product in column D.",
  "actionableInfo": {
    "targetCells": ["D2", "D3", "D4"],
    "suggestedOperations": ["MULTIPLY", "=B2*C2"],
    "constraints": ["numeric_columns_only"]
  }
}
```

### 2. Data Analysis Request

**Scenario**: Analyzing monthly sales trends.

**Spreadsheet Data**:
```
A       B      C
Month   Sales  Growth
Jan     1000   -
Feb     1200   20%
Mar     1100   -8.3%
Apr     1350   22.7%
May     1400   3.7%
```

**Request**: "What trends do you see in this sales data?"

**API Call**:
```bash
curl -X POST http://localhost:3000/api/v1/analyze-context \
  -H "Content-Type: application/json" \
  -d '{
    "request": "What trends do you see in this sales data?",
    "spreadsheetId": "def456",
    "currentSelection": {
      "sheet": "Sales",
      "range": "A1:C6",
      "activeCell": "B2"
    }
  }'
```

**Expected Response**:
```json
{
  "requestId": "req_002",
  "requestAnalysis": {
    "intent": "data_analysis",
    "scope": "current_selection",
    "confidence": 0.92
  },
  "context": {
    "patterns": {
      "dataPatterns": [
        {
          "type": "trend",
          "description": "Overall upward trend with volatility",
          "confidence": 0.88
        },
        {
          "type": "growth_rate",
          "description": "Variable growth rates ranging from -8.3% to 22.7%",
          "confidence": 0.95
        }
      ],
      "insights": [
        "Sales show overall growth from $1,000 to $1,400 (40% total increase)",
        "March shows a temporary decline (-8.3%) followed by strong recovery",
        "April shows the highest growth rate at 22.7%"
      ]
    }
  },
  "naturalLanguageDescription": "The data shows monthly sales figures with calculated growth rates. There's an overall upward trend with some volatility, particularly a dip in March followed by strong recovery in April and May."
}
```

## Advanced Examples

### 3. Complex Formula Troubleshooting

**Scenario**: VLOOKUP formula returning errors.

**Spreadsheet Data**:
```
Sheet1:
A        B
Product  Price
Apple    1.50
Banana   0.80

Sheet2:
A        B           C
Order    Product     Total
1        Apple       =VLOOKUP(B2,Sheet1!A:B,2,FALSE)*10
2        Bannana     =VLOOKUP(B3,Sheet1!A:B,2,FALSE)*15
```

**Request**: "Why is my VLOOKUP formula returning #N/A errors?"

**API Call**:
```bash
curl -X POST http://localhost:3000/api/v1/analyze-context \
  -H "Content-Type: application/json" \
  -d '{
    "request": "Why is my VLOOKUP formula returning #N/A errors?",
    "spreadsheetId": "ghi789",
    "currentSelection": {
      "sheet": "Sheet2",
      "range": "C3",
      "activeCell": "C3"
    }
  }'
```

**Expected Response**:
```json
{
  "requestId": "req_003",
  "requestAnalysis": {
    "intent": "troubleshooting",
    "scope": "formula_error",
    "confidence": 0.97
  },
  "context": {
    "immediate": {
      "activeCell": {
        "formula": "=VLOOKUP(B3,Sheet1!A:B,2,FALSE)*15",
        "value": "#N/A",
        "dataType": "error"
      }
    },
    "related": {
      "precedentCells": [
        { "cell": "B3", "value": "Bannana" }
      ],
      "lookupRange": {
        "sheet": "Sheet1",
        "range": "A:B",
        "data": [["Apple", 1.50], ["Banana", 0.80]]
      }
    }
  },
  "naturalLanguageDescription": "The VLOOKUP formula is searching for 'Bannana' (with double 'n') in Sheet1, but the actual value in the lookup table is 'Banana' (single 'n'). This spelling mismatch is causing the #N/A error.",
  "actionableInfo": {
    "errorType": "lookup_value_not_found",
    "suggestedFixes": [
      "Correct spelling: Change 'Bannana' to 'Banana' in cell B3",
      "Use approximate match: Change FALSE to TRUE in VLOOKUP",
      "Add error handling: Wrap formula in IFERROR function"
    ]
  }
}
```

### 4. Multi-Sheet Analysis

**Scenario**: Analyzing data across multiple sheets.

**Request**: "Compare sales performance across all regions"

**API Call**:
```bash
curl -X POST http://localhost:3000/api/v1/analyze-context \
  -H "Content-Type: application/json" \
  -d '{
    "request": "Compare sales performance across all regions",
    "spreadsheetId": "jkl012",
    "currentSelection": {
      "sheet": "Summary",
      "range": "A1:E10",
      "activeCell": "A1"
    }
  }'
```

**Expected Response**:
```json
{
  "requestId": "req_004",
  "requestAnalysis": {
    "intent": "data_analysis",
    "scope": "multi_sheet",
    "confidence": 0.89
  },
  "context": {
    "structural": {
      "sheets": [
        { "name": "North", "type": "regional_data" },
        { "name": "South", "type": "regional_data" },
        { "name": "East", "type": "regional_data" },
        { "name": "West", "type": "regional_data" },
        { "name": "Summary", "type": "consolidated" }
      ],
      "crossSheetReferences": [
        "=SUM(North!C:C)",
        "=SUM(South!C:C)",
        "=SUM(East!C:C)",
        "=SUM(West!C:C)"
      ]
    },
    "patterns": {
      "insights": [
        "North region has highest total sales: $125,000",
        "West region shows strongest growth rate: 15.2%",
        "East region has most consistent performance",
        "South region needs attention with declining trend"
      ]
    }
  },
  "naturalLanguageDescription": "The workbook contains regional sales data across four sheets (North, South, East, West) with a Summary sheet consolidating the results. Each region has similar data structure with sales figures and performance metrics."
}
```

## Integration Examples

### 5. Using with ChatGPT/Claude

**Scenario**: Getting AI assistance with the generated context.

**Step 1**: Get context from Excel Context Engine
```bash
curl -X POST http://localhost:3000/api/v1/analyze-context \
  -H "Content-Type: application/json" \
  -d '{
    "request": "Help me create a dashboard for this sales data",
    "spreadsheetId": "mno345",
    "currentSelection": {
      "sheet": "Sales",
      "range": "A1:F100",
      "activeCell": "A1"
    }
  }'
```

**Step 2**: Use the context with an AI assistant
```
Prompt to ChatGPT:
"Based on this spreadsheet context, help me create a dashboard:

Context: {paste the naturalLanguageDescription and actionableInfo from the response}

Please suggest:
1. Key metrics to display
2. Chart types for visualization
3. Excel formulas needed
4. Dashboard layout recommendations"
```

### 6. Programmatic Integration

**Scenario**: Building an automated analysis pipeline.

```javascript
// Example Node.js integration
const axios = require('axios');

class ExcelAnalyzer {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async uploadFile(filePath) {
    const FormData = require('form-data');
    const fs = require('fs');
    
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    
    const response = await axios.post(`${this.baseUrl}/upload-spreadsheet`, form, {
      headers: form.getHeaders()
    });
    
    return response.data.spreadsheetId;
  }

  async analyzeContext(spreadsheetId, request, selection) {
    const response = await axios.post(`${this.baseUrl}/analyze-context`, {
      request,
      spreadsheetId,
      currentSelection: selection
    });
    
    return response.data;
  }

  async generateReport(filePath) {
    // Upload file
    const spreadsheetId = await this.uploadFile(filePath);
    
    // Analyze different aspects
    const analyses = await Promise.all([
      this.analyzeContext(spreadsheetId, "Summarize the key metrics", {
        sheet: "Sheet1",
        range: "A1:Z1000",
        activeCell: "A1"
      }),
      this.analyzeContext(spreadsheetId, "Identify any data quality issues", {
        sheet: "Sheet1",
        range: "A1:Z1000",
        activeCell: "A1"
      }),
      this.analyzeContext(spreadsheetId, "Suggest visualizations for this data", {
        sheet: "Sheet1",
        range: "A1:Z1000",
        activeCell: "A1"
      })
    ]);
    
    return {
      summary: analyses[0],
      dataQuality: analyses[1],
      visualizations: analyses[2]
    };
  }
}

// Usage
const analyzer = new ExcelAnalyzer('http://localhost:3000/api/v1');
analyzer.generateReport('./sales-data.xlsx')
  .then(report => console.log(report))
  .catch(error => console.error(error));
```

## Performance Examples

### 7. Large Dataset Analysis

**Scenario**: Analyzing a large dataset efficiently.

```bash
# Upload large file (10MB+)
curl -X POST http://localhost:3000/api/v1/upload-spreadsheet \
  -F "file=@large-dataset.xlsx" \
  --max-time 60

# Analyze with strategic selection
curl -X POST http://localhost:3000/api/v1/analyze-context \
  -H "Content-Type: application/json" \
  -d '{
    "request": "Analyze patterns in this large sales dataset",
    "spreadsheetId": "large123",
    "currentSelection": {
      "sheet": "Data",
      "range": "A1:J1000",
      "activeCell": "A1"
    }
  }'
```

**Tips for Large Datasets**:
- Select representative samples rather than entire datasets
- Focus on specific columns of interest
- Use summary sheets when available
- Break complex analyses into smaller requests

### 8. Batch Processing

**Scenario**: Processing multiple files in sequence.

```bash
#!/bin/bash

# Batch analysis script
files=("sales-q1.xlsx" "sales-q2.xlsx" "sales-q3.xlsx" "sales-q4.xlsx")

for file in "${files[@]}"; do
  echo "Processing $file..."
  
  # Upload file
  spreadsheet_id=$(curl -s -X POST http://localhost:3000/api/v1/upload-spreadsheet \
    -F "file=@$file" | jq -r '.spreadsheetId')
  
  # Analyze quarterly trends
  curl -s -X POST http://localhost:3000/api/v1/analyze-context \
    -H "Content-Type: application/json" \
    -d "{
      \"request\": \"Analyze quarterly sales trends and key metrics\",
      \"spreadsheetId\": \"$spreadsheet_id\",
      \"currentSelection\": {
        \"sheet\": \"Sales\",
        \"range\": \"A1:F1000\",
        \"activeCell\": \"A1\"
      }
    }" > "analysis-$file.json"
  
  echo "Analysis saved to analysis-$file.json"
done
```

## Error Handling Examples

### 9. Handling API Errors

```javascript
async function robustAnalysis(request, spreadsheetId, selection) {
  try {
    const response = await fetch('/api/v1/analyze-context', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request, spreadsheetId, currentSelection: selection })
    });

    if (!response.ok) {
      const error = await response.json();
      
      switch (error.error.code) {
        case 'INVALID_SPREADSHEET_ID':
          console.log('Please upload a spreadsheet first');
          break;
        case 'RATE_LIMIT_EXCEEDED':
          console.log('Too many requests, please wait');
          break;
        case 'OPENAI_API_ERROR':
          console.log('AI service temporarily unavailable, using basic analysis');
          break;
        default:
          console.log('Analysis failed:', error.error.message);
      }
      
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Network error:', error);
    return null;
  }
}
```

### 10. Fallback Strategies

```javascript
async function analyzeWithFallback(request, spreadsheetId, selection) {
  // Try full analysis first
  let result = await robustAnalysis(request, spreadsheetId, selection);
  
  if (!result) {
    // Fallback to simpler request
    console.log('Trying simplified analysis...');
    result = await robustAnalysis(
      'Provide basic information about this data',
      spreadsheetId,
      selection
    );
  }
  
  if (!result) {
    // Final fallback - just get data structure
    console.log('Getting basic data structure...');
    result = await robustAnalysis(
      'Describe the structure of this spreadsheet',
      spreadsheetId,
      { sheet: selection.sheet, range: 'A1:Z10', activeCell: 'A1' }
    );
  }
  
  return result;
}
```

## Best Practices Summary

### Request Optimization
- Be specific about your goals
- Select relevant data ranges
- Use clear, natural language
- Build on previous analyses

### Performance Tips
- Upload files once, analyze multiple times
- Use strategic cell selections
- Break complex requests into smaller parts
- Cache spreadsheet IDs for repeated use

### Error Prevention
- Validate file formats before upload
- Check file size limits
- Handle network timeouts gracefully
- Implement retry logic for transient errors

### Integration Patterns
- Use context results with AI assistants
- Build automated analysis pipelines
- Implement batch processing for multiple files
- Create custom analysis workflows