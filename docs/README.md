# Excel Context Engine Documentation

Welcome to the Excel Context Engine documentation. This intelligent system analyzes user requests in spreadsheet environments and generates optimal context for LLM processing.

## Table of Contents

- [Getting Started](./getting-started.md)
- [API Reference](./api-reference.md)
- [User Guide](./user-guide.md)
- [Examples](./examples.md)
- [Deployment Guide](./deployment.md)
- [Development Guide](./development.md)
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