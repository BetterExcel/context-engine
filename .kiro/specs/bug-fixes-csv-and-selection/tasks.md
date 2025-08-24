# Implementation Plan

- [x] 1. Enhance CSV parsing in SpreadsheetParser
  - Add delimiter detection algorithm that analyzes first 10 rows for comma, semicolon, tab, and pipe delimiters
  - Implement encoding detection using character frequency analysis for UTF-8, UTF-16, and Windows-1252
  - Create robust CSV parsing method that handles quoted fields, escaped characters, and inconsistent row lengths
  - Add comprehensive error handling for malformed CSV files with specific error messages
  - Write unit tests for various CSV formats, encodings, and edge cases
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.1, 4.2, 4.3, 4.4_

- [x] 2. Create DataBoundaryAnalyzer service
  - Implement analyzeDataBoundaries method that scans sheet data to find actual min/max row and column boundaries
  - Add detectHeaders method that analyzes first row patterns to identify if headers are present
  - Create calculateOptimalRange method that determines intelligent default selection based on data boundaries
  - Add validation to ensure selected ranges don't exceed reasonable size limits (max 100k cells)
  - Write unit tests for boundary detection with various data patterns including sparse data and headers
  - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Implement AutoSelectionManager for frontend
  - Create AutoSelectionManager class that manages default and user selections per sheet
  - Add calculateDefaultSelection method that uses DataBoundaryAnalyzer results to determine optimal range
  - Implement selection state tracking that distinguishes between automatic and manual user selections
  - Add methods to reset selections and apply defaults when new files are loaded
  - Write unit tests for selection management logic and state persistence
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 4. Update SpreadsheetParser to include boundary analysis
  - Integrate DataBoundaryAnalyzer into the parsing pipeline for both Excel and CSV files
  - Add recommendedSelection field to SpreadsheetData interface and parsing results
  - Modify parseFile method to automatically analyze boundaries and calculate default selection
  - Update API responses to include boundary analysis and recommended selection information
  - Write integration tests to verify boundary analysis works correctly with parsed spreadsheet data
  - _Requirements: 2.1, 3.1, 3.2, 3.3, 3.4_

- [x] 5. Enhance CSV file upload handling in backend
  - Update multer file filter to properly handle CSV MIME type variations (text/csv, application/csv, text/plain)
  - Modify SpreadsheetParser.parseWorkbook to use enhanced CSV parsing with delimiter and encoding detection
  - Add specific CSV error handling in upload route with detailed error messages for CSV parsing failures
  - Update file validation to better detect CSV files regardless of MIME type inconsistencies
  - Write integration tests for CSV upload scenarios including various delimiters and encodings
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.1, 4.2, 4.3_

- [x] 6. Update SpreadsheetViewer component for auto-selection
  - Add defaultSelection prop to SpreadsheetViewer component interface
  - Implement useEffect hook that applies default selection when spreadsheet data loads
  - Modify selection state management to track whether selection is automatic or manual
  - Update handleCellClick and selection methods to mark selections as manual when user interacts
  - Add visual indicators to show when entire data range is selected vs. manual selection
  - Write component tests for auto-selection behavior and user interaction handling
  - _Requirements: 2.1, 2.2, 2.4, 5.1, 5.2, 5.3_

- [x] 7. Update App component to handle intelligent default selection
  - Modify fetchSpreadsheetData effect to extract and apply recommended selection from API response
  - Update handleFileUpload to reset selection state and apply new defaults for new files
  - Add logic to pass default selection information to SpreadsheetViewer component
  - Ensure selection state is properly managed when switching between sheets
  - Update context analysis to use intelligent default selection when no manual selection exists
  - Write integration tests for end-to-end default selection workflow
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 5.4, 5.5_

- [x] 8. Add CSV-specific error handling and user feedback
  - Create CSVError class with specific error codes for delimiter detection, encoding issues, and malformed data
  - Update ErrorDisplay component to show CSV-specific error messages and suggestions
  - Add user-friendly error messages for common CSV issues (wrong delimiter, encoding problems, inconsistent columns)
  - Implement fallback strategies for CSV parsing failures (try different delimiters, encodings)
  - Write tests for CSV error scenarios and verify appropriate error messages are displayed
  - _Requirements: 1.4, 1.5, 4.1, 4.2, 4.3, 4.4_

- [x] 9. Update API types and interfaces for new selection features
  - Add DataBoundaries, SelectionState, and CSVParseResult interfaces to shared types
  - Update SpreadsheetData interface to include recommendedSelection and boundaryAnalysis fields
  - Modify UploadResult interface to include CSV-specific parsing information and warnings
  - Add new error codes for CSV and selection-related errors to ErrorCode enum
  - Update API documentation to reflect new selection and CSV parsing capabilities
  - _Requirements: 1.1, 1.2, 2.1, 3.1, 4.1_

- [x] 10. Add comprehensive testing for bug fixes
  - Create test CSV files with various delimiters (comma, semicolon, tab) and encodings (UTF-8, Windows-1252)
  - Write end-to-end tests that upload CSV files and verify correct parsing and default selection
  - Add performance tests for large CSV files and spreadsheets with many rows/columns
  - Create regression tests to ensure Excel file processing still works correctly after CSV enhancements
  - Test boundary detection accuracy with various data patterns including headers, sparse data, and edge cases
  - Write tests for selection state management across sheet switching and file uploads
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 3.1, 3.2, 3.3, 4.1, 5.1, 5.2, 5.3_

- [x] 11. Update user interface for better selection feedback
  - Add visual indicators in SpreadsheetViewer to clearly show when entire data range is selected
  - Update selection info display to show "Entire Data Range" vs. specific cell ranges
  - Add tooltip or help text explaining intelligent default selection behavior
  - Implement selection summary that shows total cells, data types, and boundary information
  - Update context analysis display to indicate when analysis is based on full data range vs. manual selection
  - Write accessibility tests to ensure selection changes are properly announced to screen readers
  - _Requirements: 2.2, 2.4, 3.1, 5.1, 5.2_

- [x] 12. Optimize performance for large datasets
  - Implement efficient boundary detection algorithm that stops scanning when clear boundaries are found
  - Add progressive boundary analysis for very large spreadsheets to avoid blocking UI
  - Implement selection range validation to prevent performance issues with extremely large selections
  - Add caching for boundary analysis results to avoid recalculation on repeated operations
  - Create performance benchmarks for CSV parsing and boundary detection with large files
  - Write performance tests to ensure new features don't significantly impact upload and parsing speed
  - _Requirements: 3.4, 3.5, 4.1, 4.4_
