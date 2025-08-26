# Excel Context Engine Documentation

Welcome to the Excel Context Engine documentation. This intelligent system analyzes user requests in spreadsheet environments and generates optimal context for LLM processing.

## Table of Contents

- [Getting Started](./getting-started.md)
- [API Reference](./api-reference.md)
- [User Guide](./user-guide.md)
- [Examples](./examples.md)
- [Financial Portfolio Examples](./financial-portfolio-examples.md)
- [Domain-Specific Usage Guide](./domain-specific-guide.md)
- [Performance Optimization](./performance-optimization.md)
- [Deployment Guide](./deployment.md)
- [Troubleshooting](./troubleshooting.md)

## Quick Start

1. **Upload a spreadsheet file**
   ```bash
   curl -X POST http://localhost:3000/api/v1/upload-spreadsheet \
     -F "file=@your-spreadsheet.xlsx"
   ```

2. **Analyze context for a request**
   ```bash
   curl -X POST http://localhost:3000/api/v1/analyze-context \
     -H "Content-Type: application/json" \
     -d '{
       "request": "Help me create a SUM formula for column C",
       "spreadsheetId": "your-spreadsheet-id",
       "currentSelection": {
         "sheet": "Sheet1",
         "range": "C1:C10",
         "activeCell": "C11"
       }
     }'
   ```

## Features

- **Intelligent Request Analysis**: Automatically classifies user intent and determines optimal scope
- **Context Extraction**: Extracts relevant data, formulas, and relationships from spreadsheets
- **Pattern Recognition**: Uses AI to identify data patterns and relationships
- **Multi-format Support**: Handles Excel (.xlsx, .xls) and CSV files
- **Natural Language Output**: Provides both structured JSON and human-readable context descriptions
- **Learning System**: Improves accuracy over time through user feedback
- **Domain Intelligence**: Specialized analysis for financial, healthcare, sales, and other business domains
- **Performance Optimization**: Handles large datasets efficiently with intelligent sampling and caching

## Comprehensive Documentation

### 📊 [Financial Portfolio Examples](./financial-portfolio-examples.md)
Live examples using real portfolio data demonstrating:
- Portfolio performance analysis and risk assessment
- Sector allocation and rebalancing recommendations
- Tax-loss harvesting and compliance reporting
- Advanced financial calculations and formulas

### 🏢 [Domain-Specific Usage Guide](./domain-specific-guide.md)
Specialized guidance for different business domains:
- **Financial Services**: Portfolio management, trading, credit analysis
- **Healthcare**: Clinical trials, pharmaceutical research, operations
- **Sales & Marketing**: Performance analysis, campaign ROI, customer analytics
- **Operations**: Supply chain, inventory management, manufacturing
- **Human Resources**: Workforce analytics, talent management
- **Research**: Statistical analysis, market research, academic performance

### ⚡ [Performance Optimization Guide](./performance-optimization.md)
Comprehensive performance tuning recommendations:
- Large dataset processing strategies
- Memory management and caching
- API optimization and response compression
- Database performance tuning
- Frontend optimization techniques

## Architecture

The system consists of:

- **Backend API**: Node.js/Express server with TypeScript
- **Frontend UI**: React application with TypeScript
- **Database**: PostgreSQL for data persistence
- **AI Integration**: OpenAI API for enhanced analysis
- **Monitoring**: Comprehensive logging and metrics

## Support

For questions, issues, or contributions, please refer to:

- [GitHub Issues](https://github.com/your-org/excel-context-engine/issues)
- [API Documentation](http://localhost:3000/api/docs)
- [User Guide](./user-guide.md)

## License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.