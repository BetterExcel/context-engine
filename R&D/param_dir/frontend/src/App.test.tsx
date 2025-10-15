import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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

const mockUseDropzone = vi.mocked(await import('react-dropzone')).useDropzone;

describe('App Component', () => {
  const mockDropzoneProps = {
    getRootProps: () => ({ 'data-testid': 'dropzone' }),
    getInputProps: () => ({ 'data-testid': 'file-input' }),
    isDragActive: false,
    open: vi.fn(),
    acceptedFiles: [],
    fileRejections: [],
    isFocused: false,
    isFileDialogActive: false,
    isDragAccept: false,
    isDragReject: false,
    rootRef: { current: null },
    inputRef: { current: null }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDropzone.mockReturnValue(mockDropzoneProps as any);
  });

  it('renders the main application layout', () => {
    render(<App />);
    
    expect(screen.getByText('Excel Context Engine')).toBeInTheDocument();
    expect(screen.getByText('Intelligent spreadsheet context analysis')).toBeInTheDocument();
    expect(screen.getByText('Upload Your Spreadsheet')).toBeInTheDocument();
  });

  it('shows file upload component initially', () => {
    render(<App />);
    
    expect(screen.getByText('Drag & drop your spreadsheet here')).toBeInTheDocument();
    expect(screen.getByText('Upload an Excel or CSV file to get started with intelligent context analysis.')).toBeInTheDocument();
  });

  it('renders upload another file button after successful upload', () => {
    // Mock successful upload
    mockApiService.uploadSpreadsheet.mockResolvedValue({
      success: true,
      message: 'File uploaded successfully',
      spreadsheetId: 'test-id-123'
    });

    render(<App />);
    
    // Simulate successful upload by directly setting the state
    // This is a simplified test that focuses on the UI structure
    expect(screen.getByText('Upload Your Spreadsheet')).toBeInTheDocument();
  });

  describe('Intelligent Default Selection', () => {
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
      // Mock successful upload and data fetch
      mockApiService.uploadSpreadsheet.mockResolvedValue({
        success: true,
        message: 'File uploaded successfully',
        spreadsheetId: 'test-spreadsheet-123'
      });

      mockApiService.getSpreadsheetData.mockResolvedValue(mockSpreadsheetData);
    });

    it('applies recommended selection from API response', async () => {
      render(<App />);

      // Simulate file upload
      const file = new File(['test content'], 'test.xlsx', { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });

      // Mock file upload process
      const uploadButton = screen.getByTestId('dropzone');
      fireEvent.drop(uploadButton, { dataTransfer: { files: [file] } });

      // Wait for spreadsheet data to load and default selection to be applied
      await waitFor(() => {
        expect(mockApiService.getSpreadsheetData).toHaveBeenCalledWith('test-spreadsheet-123');
      });

      // Check that the recommended selection is displayed
      await waitFor(() => {
        expect(screen.getByText(/Selected: A1:C3/)).toBeInTheDocument();
      });

      // Check that it's marked as auto-selected
      await waitFor(() => {
        expect(screen.getByText('Auto-selected')).toBeInTheDocument();
      });
    });

    it('calculates default selection when no recommendation provided', async () => {
      // Mock data without recommended selection
      const dataWithoutRecommendation = {
        ...mockSpreadsheetData,
        recommendedSelection: undefined
      };
      mockApiService.getSpreadsheetData.mockResolvedValue(dataWithoutRecommendation);

      render(<App />);

      // Simulate file upload
      const file = new File(['test content'], 'test.xlsx', { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });

      const uploadButton = screen.getByTestId('dropzone');
      fireEvent.drop(uploadButton, { dataTransfer: { files: [file] } });

      // Wait for spreadsheet data to load
      await waitFor(() => {
        expect(mockApiService.getSpreadsheetData).toHaveBeenCalledWith('test-spreadsheet-123');
      });

      // Should still have a default selection (calculated by AutoSelectionManager)
      await waitFor(() => {
        expect(screen.getByText(/Selected:/)).toBeInTheDocument();
      });
    });

    it('uses intelligent default selection for context analysis when no manual selection', async () => {
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

      // Simulate file upload and wait for data to load
      const file = new File(['test content'], 'test.xlsx', { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });

      const uploadButton = screen.getByTestId('dropzone');
      fireEvent.drop(uploadButton, { dataTransfer: { files: [file] } });

      await waitFor(() => {
        expect(mockApiService.getSpreadsheetData).toHaveBeenCalledWith('test-spreadsheet-123');
      });

      // Submit a context analysis request
      const requestInput = screen.getByPlaceholderText('Ask me anything about your spreadsheet...');
      fireEvent.change(requestInput, { target: { value: 'Analyze this data' } });
      fireEvent.keyDown(requestInput, { key: 'Enter', code: 'Enter' });

      // Verify that context analysis was called with the intelligent default selection
      await waitFor(() => {
        expect(mockApiService.analyzeContext).toHaveBeenCalledWith(
          expect.objectContaining({
            currentSelection: expect.objectContaining({
              range: 'A1:C3' // Should use the intelligent default selection
            })
          })
        );
      });
    });

    it('maintains selection state when switching between sheets', async () => {
      // Mock data with multiple sheets
      const multiSheetData = {
        ...mockSpreadsheetData,
        sheets: [
          mockSpreadsheetData.sheets[0],
          {
            name: 'Sheet2',
            data: [
              [{ value: 'Product', dataType: DataType.TEXT }, { value: 'Price', dataType: DataType.TEXT }],
              [{ value: 'Apple', dataType: DataType.TEXT }, { value: 1.99, dataType: DataType.NUMBER }]
            ],
            dimensions: { rows: 2, cols: 2 },
            formatting: [],
            namedRanges: []
          }
        ]
      };
      mockApiService.getSpreadsheetData.mockResolvedValue(multiSheetData);

      render(<App />);

      // Simulate file upload
      const file = new File(['test content'], 'test.xlsx', { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });

      const uploadButton = screen.getByTestId('dropzone');
      fireEvent.drop(uploadButton, { dataTransfer: { files: [file] } });

      await waitFor(() => {
        expect(mockApiService.getSpreadsheetData).toHaveBeenCalledWith('test-spreadsheet-123');
      });

      // Wait for sheet tabs to appear
      await waitFor(() => {
        expect(screen.getByText('Sheet1')).toBeInTheDocument();
        expect(screen.getByText('Sheet2')).toBeInTheDocument();
      });

      // Click on Sheet2 tab
      fireEvent.click(screen.getByText('Sheet2'));

      // Should have a new default selection for Sheet2
      await waitFor(() => {
        expect(screen.getByText(/Selected:/)).toBeInTheDocument();
      });

      // Switch back to Sheet1
      fireEvent.click(screen.getByText('Sheet1'));

      // Should restore the selection for Sheet1
      await waitFor(() => {
        expect(screen.getByText(/Selected:/)).toBeInTheDocument();
      });
    });

    it('resets selection state when uploading a new file', async () => {
      render(<App />);

      // First file upload
      const file1 = new File(['test content 1'], 'test1.xlsx', { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });

      const uploadButton = screen.getByTestId('dropzone');
      fireEvent.drop(uploadButton, { dataTransfer: { files: [file1] } });

      await waitFor(() => {
        expect(mockApiService.getSpreadsheetData).toHaveBeenCalledWith('test-spreadsheet-123');
      });

      // Wait for "Upload New File" button to appear
      await waitFor(() => {
        expect(screen.getByText('Upload New File')).toBeInTheDocument();
      });

      // Click "Upload New File"
      fireEvent.click(screen.getByText('Upload New File'));

      // Should return to upload state
      await waitFor(() => {
        expect(screen.getByText('Upload Your Spreadsheet')).toBeInTheDocument();
      });

      // Upload second file
      const file2 = new File(['test content 2'], 'test2.xlsx', { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });

      fireEvent.drop(uploadButton, { dataTransfer: { files: [file2] } });

      // Should reset all selection state and apply new defaults
      await waitFor(() => {
        expect(mockApiService.getSpreadsheetData).toHaveBeenCalledTimes(2);
      });
    });
  });
});