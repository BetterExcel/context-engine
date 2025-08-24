# User Guide

This guide covers how to use the Excel Context Engine effectively for various spreadsheet analysis tasks.

## Overview

The Excel Context Engine helps you by:
- Understanding your natural language requests about spreadsheet data
- Extracting relevant context from your spreadsheets
- Providing structured information that can be used by AI assistants
- Learning from your interactions to improve accuracy over time

## Using the Web Interface

### 1. Uploading Spreadsheets

#### Supported Formats
- Excel files (.xlsx, .xls)
- CSV files (.csv)
- File size limit: 50MB (configurable)

#### Upload Methods
1. **Drag and Drop**: Drag your file onto the upload zone
2. **Click to Browse**: Click the upload area to select a file
3. **API Upload**: Use the REST API for programmatic uploads

#### What Happens During Upload
- File format validation
- Data parsing and structure analysis
- Formula dependency mapping
- Data type detection
- Storage of parsed data

### 2. Spreadsheet Viewer

The interactive spreadsheet viewer provides:

#### Navigation
- **Cell Selection**: Click any cell to select it
- **Range Selection**: Click and drag or use Shift+Click
- **Sheet Tabs**: Switch between multiple sheets
- **Keyboard Navigation**: Use arrow keys to move between cells

#### Features
- **Formula Bar**: Shows formulas for selected cells
- **Data Type Indicators**: Visual indicators for different data types
- **Cell Formatting**: Preserves original formatting
- **Responsive Design**: Works on desktop, tablet, and mobile

### 3. Making Requests

#### Request Types
The system can help with various types of requests:

1. **Formula Assistance**
   - "Help me create a SUM formula for column C"
   - "How do I calculate the average of these values?"
   - "Fix this VLOOKUP formula that's returning #N/A"

2. **Data Analysis**
   - "What patterns do you see in this sales data?"
   - "Identify any outliers in column D"
   - "Summarize the trends in this dataset"

3. **Formatting**
   - "How can I format these cells as currency?"
   - "Apply conditional formatting to highlight values above 100"
   - "Format this column as dates"

4. **Troubleshooting**
   - "Why is my formula returning an error?"
   - "Find circular references in this spreadsheet"
   - "Validate the data in this range"

5. **General Assistance**
   - "Explain what this spreadsheet contains"
   - "How is this data organized?"
   - "What calculations are being performed here?"

#### Best Practices for Requests
- **Be Specific**: Include details about what you want to accomplish
- **Select Relevant Data**: Highlight the cells or ranges you're working with
- **Provide Context**: Mention the purpose or goal of your analysis
- **Use Natural Language**: Write as you would ask a human colleague

### 4. Understanding Context Results

#### Context Structure
The system provides context in multiple formats:

1. **Structured JSON**: Machine-readable data for AI processing
2. **Natural Language**: Human-readable description
3. **Visual Indicators**: Confidence scores and relevance indicators

#### Context Components

##### Immediate Context
- Selected cells and their values
- Active cell information
- Visible data range
- Current formulas

##### Related Context
- Dependent cells (cells that reference selected cells)
- Precedent cells (cells referenced by selected cells)
- Related formulas and calculations
- Named ranges

##### Structural Context
- Sheet organization and headers
- Data types and patterns
- Table structures and relationships
- Cross-sheet references

##### Historical Context
- Recent user actions
- Previous requests and responses
- Session continuity information
- User interaction patterns

##### Pattern Insights (AI-Enhanced)
- Data trends and patterns
- Anomalies and outliers
- Relationships between variables
- Suggested analyses or actions

#### Confidence Scores
- **High (0.8-1.0)**: System is very confident in the analysis
- **Medium (0.5-0.8)**: Good confidence, may need clarification
- **Low (0.0-0.5)**: Uncertain, may request more information

## Advanced Features

### 1. Session Management

The system tracks your session to provide continuity:
- **Request History**: Previous requests and contexts
- **Action Tracking**: User interactions and modifications
- **Context Continuity**: Building on previous analyses
- **Learning**: Improving accuracy based on your patterns

### 2. Feedback System

Help improve the system by providing feedback:
- **Accuracy Rating**: Rate how accurate the context was
- **Corrections**: Provide corrections for misunderstood requests
- **Suggestions**: Suggest improvements or missing features

### 3. Multi-Sheet Analysis

Working with complex workbooks:
- **Cross-Sheet References**: Understanding relationships between sheets
- **Workbook Structure**: Analyzing overall organization
- **Sheet-Specific Context**: Focusing on individual sheets
- **Consolidated Analysis**: Combining data from multiple sheets

### 4. Large Dataset Handling

For large spreadsheets:
- **Sampling**: System may sample data for analysis
- **Progressive Loading**: Data loaded as needed
- **Performance Optimization**: Efficient processing of large files
- **Memory Management**: Automatic cleanup of unused data

## Common Use Cases

### 1. Formula Creation
```
Request: "Create a formula to calculate the total sales for each region"
Selection: Sales data with Region and Sales columns
Result: Context includes data structure, suggested SUM/SUMIF formulas, target cells
```

### 2. Data Validation
```
Request: "Check if there are any duplicate entries in this customer list"
Selection: Customer data range
Result: Context includes data analysis, duplicate detection, validation suggestions
```

### 3. Trend Analysis
```
Request: "Analyze the sales trend over the past 12 months"
Selection: Time series sales data
Result: Context includes pattern analysis, trend identification, visualization suggestions
```

### 4. Error Troubleshooting
```
Request: "Why is this VLOOKUP returning #N/A?"
Selection: Cell with error formula
Result: Context includes formula analysis, data validation, error diagnosis
```

### 5. Data Summarization
```
Request: "Summarize the key metrics from this financial report"
Selection: Financial data tables
Result: Context includes data summary, key metrics identification, calculation suggestions
```

## Tips for Better Results

### 1. Effective Cell Selection
- Select the specific data you're working with
- Include headers when relevant
- Select complete ranges for calculations
- Use multiple selections for complex analyses

### 2. Clear Request Writing
- Use specific terminology when possible
- Mention the desired outcome
- Include any constraints or requirements
- Reference specific columns or data by name

### 3. Iterative Refinement
- Start with broad requests, then get more specific
- Use follow-up questions to clarify
- Build on previous analyses
- Provide feedback to improve accuracy

### 4. Context Optimization
- Keep related data together
- Use meaningful column headers
- Organize data consistently
- Document complex formulas with comments

## Keyboard Shortcuts

### Spreadsheet Navigation
- **Arrow Keys**: Move between cells
- **Ctrl+Arrow**: Jump to data boundaries
- **Shift+Arrow**: Extend selection
- **Ctrl+A**: Select all data
- **Ctrl+Home**: Go to cell A1

### Interface Shortcuts
- **Ctrl+U**: Focus upload area
- **Ctrl+R**: Focus request input
- **Ctrl+Enter**: Submit request
- **Esc**: Clear current selection

## Accessibility Features

The interface is designed to be accessible:
- **Screen Reader Support**: Full ARIA labeling
- **Keyboard Navigation**: Complete keyboard accessibility
- **High Contrast**: Support for high contrast themes
- **Font Scaling**: Respects system font size settings
- **Focus Indicators**: Clear visual focus indicators

## Privacy and Security

### Data Handling
- **Temporary Storage**: Uploaded files are processed and stored temporarily
- **Session Isolation**: Each user session is isolated
- **Data Cleanup**: Automatic cleanup of processed data
- **No Permanent Storage**: Files are not permanently stored without explicit consent

### API Security
- **Rate Limiting**: Protection against abuse
- **Input Validation**: All inputs are validated and sanitized
- **Error Handling**: Secure error messages without data leakage
- **HTTPS Support**: Encrypted communication in production

## Getting Help

### In-App Help
- **Tooltips**: Hover over interface elements for help
- **Examples**: Built-in examples for common requests
- **Status Messages**: Clear feedback on system status
- **Error Messages**: Helpful error messages with suggestions

### Documentation
- **API Reference**: Complete API documentation
- **Examples**: Comprehensive examples and use cases
- **Troubleshooting**: Common issues and solutions
- **FAQ**: Frequently asked questions

### Support Channels
- **GitHub Issues**: Report bugs or request features
- **Documentation**: Comprehensive guides and references
- **Community**: User community and discussions