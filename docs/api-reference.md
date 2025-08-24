# API Reference

Complete API documentation for the Excel Context Engine.

## Base URL

- **Development**: `http://localhost:3000/api/v1`
- **Production**: `https://api.your-domain.com/api/v1`

## Interactive Documentation

For interactive API documentation with request/response examples, visit:
- **Swagger UI**: `http://localhost:3000/api/docs`

## Authentication

Currently, the API does not require authentication. Future versions may include API key authentication.

## Rate Limiting

- **Limit**: 100 requests per 15 minutes per IP address
- **Headers**: Rate limit information is included in response headers
  - `X-RateLimit-Limit`: Request limit
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset time

## Endpoints

### Health Check

#### GET /health

Check the health status of the API server.

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "service": "excel-context-engine-backend",
  "version": "1.0.0",
  "uptime": 3600,
  "checks": {
    "database": { "status": "healthy", "responseTime": 15 },
    "openai": { "status": "healthy", "responseTime": 200 },
    "memory": { "status": "healthy", "usagePercent": "45.2%" },
    "disk": { "status": "healthy", "responseTime": 5 }
  }
}
```

### Metrics

#### GET /metrics

Get Prometheus-compatible metrics for monitoring.

**Response**: Prometheus metrics format

### File Upload

#### POST /upload-spreadsheet

Upload and parse a spreadsheet file.

**Request**:
- **Content-Type**: `multipart/form-data`
- **Body**: Form data with `file` field

**Response**:
```json
{
  "spreadsheetId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "File uploaded and parsed successfully",
  "data": {
    "sheets": [...],
    "metadata": {...},
    "formulas": [...],
    "namedRanges": [...],
    "recommendedSelection": "A1:J25",
    "boundaryAnalysis": {
      "minRow": 0,
      "maxRow": 24,
      "minCol": 0,
      "maxCol": 9,
      "totalCells": 250,
      "emptyCells": 15,
      "hasHeaders": true
    },
    "csvParseResult": {
      "delimiter": ",",
      "encoding": "UTF-8",
      "headers": ["Name", "Age", "City"],
      "dataTypes": ["text", "number", "text"],
      "warnings": [],
      "rowCount": 25,
      "columnCount": 10,
      "hasHeaders": true,
      "confidence": 0.95
    }
  },
  "warnings": ["Some cells contain mixed data types"]
}
```

### Context Analysis

#### POST /analyze-context

Analyze user request and generate context.

**Request**:
```json
{
  "request": "Help me create a SUM formula for column C",
  "spreadsheetId": "550e8400-e29b-41d4-a716-446655440000",
  "currentSelection": {
    "sheet": "Sheet1",
    "range": "C1:C10",
    "activeCell": "C11"
  },
  "userContext": {
    "sessionId": "session_123",
    "recentActions": ["selected_range", "clicked_cell"]
  }
}
```

**Response**:
```json
{
  "requestId": "req_123456789",
  "requestAnalysis": {
    "intent": "formula_assistance",
    "scope": "current_selection",
    "confidence": 0.95
  },
  "context": {
    "immediate": {...},
    "related": {...},
    "structural": {...},
    "historical": {...},
    "patterns": {...}
  },
  "naturalLanguageDescription": "The user has selected column C containing numeric values...",
  "actionableInfo": {
    "targetCells": ["C11"],
    "suggestedOperations": ["SUM"],
    "constraints": ["non_empty_cells_only"]
  }
}
```

## Error Responses

All error responses follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "additional_info"
    },
    "suggestions": [
      "Suggestion 1",
      "Suggestion 2"
    ]
  },
  "requestId": "req_123456789"
}
```

### Common Error Codes

#### General Errors
- `INVALID_FILE_FORMAT`: Unsupported file format
- `FILE_TOO_LARGE`: File exceeds size limit
- `MISSING_REQUIRED_FIELD`: Required field missing
- `INVALID_SPREADSHEET_ID`: Spreadsheet not found
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `OPENAI_API_ERROR`: AI service error
- `DATABASE_ERROR`: Database connection error
- `INTERNAL_SERVER_ERROR`: Unexpected server error

#### CSV-Specific Errors
- `CSV_DELIMITER_DETECTION_FAILED`: Could not detect CSV delimiter
- `CSV_ENCODING_DETECTION_FAILED`: Could not detect file encoding
- `CSV_MALFORMED`: CSV format is invalid or corrupted
- `CSV_INCONSISTENT_COLUMNS`: Rows have different column counts
- `CSV_EMPTY_FILE`: CSV file contains no data
- `CSV_PARSE_ERROR`: General CSV parsing failure
- `CSV_INVALID_DELIMITER`: Specified delimiter is invalid
- `CSV_ENCODING_CONVERSION_FAILED`: Could not convert file encoding
- `CSV_ROW_PARSING_FAILED`: Specific row could not be parsed
- `CSV_COLUMN_COUNT_MISMATCH`: Column count doesn't match header

#### Selection-Related Errors
- `SELECTION_INVALID_RANGE`: Invalid cell range format
- `SELECTION_RANGE_TOO_LARGE`: Selected range exceeds size limits
- `SELECTION_NO_DATA_FOUND`: No data found in selected range
- `BOUNDARY_ANALYSIS_FAILED`: Could not analyze data boundaries

## Data Models

### SpreadsheetData

```typescript
interface SpreadsheetData {
  sheets: Sheet[];
  metadata: FileMetadata;
  formulas: Formula[];
  namedRanges: NamedRange[];
  recommendedSelection?: string;
  boundaryAnalysis?: DataBoundaries;
}
```

### DataBoundaries

```typescript
interface DataBoundaries {
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
  totalCells: number;
  emptyCells: number;
  hasHeaders: boolean;
}
```

### SelectionState

```typescript
interface SelectionState {
  range: string;
  isManual: boolean;
  timestamp: Date;
  boundaries: DataBoundaries;
  sheetIndex?: number;
}
```

### CSVParseResult

```typescript
interface CSVParseResult {
  data: any[][];
  delimiter: string;
  encoding: string;
  headers?: string[];
  dataTypes: DataType[];
  warnings: string[];
  rowCount: number;
  columnCount: number;
  hasHeaders: boolean;
  confidence: number;
}
```

### ContextData

```typescript
interface ContextData {
  immediate: ImmediateContext;
  related: RelatedContext;
  structural: StructuralContext;
  historical: HistoricalContext;
  patterns: PatternInsights;
}
```

For complete type definitions, see the [Swagger documentation](http://localhost:3000/api/docs).

## SDKs and Libraries

### JavaScript/Node.js

```javascript
const ExcelContextEngine = require('excel-context-engine-client');

const client = new ExcelContextEngine({
  baseUrl: 'http://localhost:3000/api/v1'
});

// Upload file
const result = await client.uploadFile('./data.xlsx');

// Analyze context
const context = await client.analyzeContext({
  request: 'Help me with formulas',
  spreadsheetId: result.spreadsheetId,
  currentSelection: { sheet: 'Sheet1', range: 'A1:C10' }
});
```

### Python

```python
import excel_context_engine

client = excel_context_engine.Client(base_url='http://localhost:3000/api/v1')

# Upload file
result = client.upload_file('data.xlsx')

# Analyze context
context = client.analyze_context(
    request='Help me with formulas',
    spreadsheet_id=result['spreadsheetId'],
    current_selection={'sheet': 'Sheet1', 'range': 'A1:C10'}
)
```

## Webhooks

Future versions will support webhooks for real-time notifications:

```json
{
  "event": "analysis_completed",
  "data": {
    "requestId": "req_123",
    "status": "completed",
    "context": {...}
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Changelog

### v1.0.0
- Initial API release
- File upload and parsing
- Context analysis
- Health checks and metrics

For detailed API documentation with interactive examples, visit the [Swagger UI](http://localhost:3000/api/docs).