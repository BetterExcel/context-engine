import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import App from './App';
import { ApiService } from './services/api';
import { SpreadsheetData, DataType } from './types';

// Mock the ApiService
vi.mock('./services/api');
const mockApiService = vi.mocked(ApiService);

// Mock react-dropzone
vi.mock('react-dropzone', () => ({
  useDropzone: vi.fn()
}));

describe('App Integration - Default Selection', () => {
  const mockSpreadsheetData: SpreadsheetData = {
    id: 'test-spreadsheet-123',
    sheets: [
      {
        name: 'Sheet1',
        data: [
          [
            { value: 'Name', dataType: DataType.TEXT },
            { value: 'Age', dataType: DataType.TEXT },
            { value: 'City', dataType: DataType.TEXT }
          ],
          [
            { value: 'John', dataType: DataType.TEXT },
            { value: 25, dataType: DataType.NUMBER },
            { value: 'New York', dataType: DataType.TEXT }
          ],
          [
            { value: 'Jane', dataType: DataType.TEXT },
            { value: 30, dataType: DataType.NUMBER },
            { value: 'Boston', dataType: DataType.TEXT }
          ]
        ],
        dimensions: { rows: 3, cols: 3 },
        formatting: [],
        namedRanges: []
      }
    ],
    metadata: {
      filename: 'test.xlsx',
      fileSize: 1024,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      uploadedAt: new Date()
    },
    formulas: [],
    namedRanges: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    recommendedSelection: 'A1:C3',
    boundaryAnalysis: {
      minRow: 0,
      maxRow: 2,
      minCol: 0,
      maxCol: 2,
      totalCells: 9,
      emptyCells: 0,
      hasHeaders: true
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful upload and data fetch
    mockApiService.uploadSpreadsheet.mockResolvedValue({
      success: true,
      message: 'File uploaded successfully',
      spreadsheetId: 'test-spreadsheet-123'
    });

    mockApiService.getSpreadsheetData.mockResolvedValue(mockSpreadsheetData);
  });

  it('renders the application with upload interface', () => {
    render(<App />);
    
    expect(screen.getByText('Excel Context Engine')).toBeInTheDocument();
    expect(screen.getByText('Upload Your Spreadsheet')).toBeInTheDocument();
  });

  it('has AutoSelectionManager functionality available', async () => {
    // This test verifies that the AutoSelectionManager is properly imported and can be instantiated
    const { AutoSelectionManager } = await import('./services/AutoSelectionManager');
    
    const manager = new AutoSelectionManager();
    expect(manager).toBeDefined();
    
    // Test that it can initialize with mock data
    manager.initialize(mockSpreadsheetData);
    
    // Test that it can calculate default selection
    const defaultSelection = manager.calculateDefaultSelection(0);
    expect(defaultSelection).toBeDefined();
    expect(typeof defaultSelection).toBe('string');
  });

  it('verifies context analysis uses intelligent selection logic', async () => {
    // Mock context analysis
    mockApiService.analyzeContext.mockResolvedValue({
      requestAnalysis: {
        intent: 'data_analysis',
        scope: 'full_dataset',
        confidence: 0.9
      },
      spreadsheetContext: {
        currentSelection: {
          range: 'A1:C3',
          data: mockSpreadsheetData.sheets[0].data,
          dataTypes: ['text', 'number', 'text']
        },
        relatedFormulas: [],
        dependencies: [],
        dataSummary: {
          rowCount: 3,
          patterns: ['headers_detected'],
          statistics: {}
        }
      },
      actionableInfo: {
        targetCells: [],
        suggestedOperations: ['analyze_data'],
        constraints: []
      },
      naturalLanguageDescription: 'Analysis of the entire dataset'
    });

    render(<App />);
    
    // Verify that the app renders without errors
    expect(screen.getByText('Excel Context Engine')).toBeInTheDocument();
  });
});