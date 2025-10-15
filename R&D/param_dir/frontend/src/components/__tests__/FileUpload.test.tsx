import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import FileUpload from '../FileUpload';

// Mock react-dropzone
vi.mock('react-dropzone', () => ({
  useDropzone: vi.fn()
}));

const mockUseDropzone = vi.mocked(await import('react-dropzone')).useDropzone;

describe('FileUpload Component', () => {
  const defaultProps = {
    onFileUpload: vi.fn(),
    acceptedFormats: ['.xlsx', '.xls', '.csv'],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    isUploading: false
  };

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

  it('renders the file upload component correctly', () => {
    render(<FileUpload {...defaultProps} />);
    
    expect(screen.getByText('Drag & drop your spreadsheet here')).toBeInTheDocument();
    expect(screen.getByText('or click to browse files')).toBeInTheDocument();
    expect(screen.getByText('Supports .xlsx, .xls, .csv files up to 10MB')).toBeInTheDocument();
  });

  it('shows drag active state when dragging files', () => {
    mockUseDropzone.mockReturnValue({
      ...mockDropzoneProps,
      isDragActive: true
    } as any);

    render(<FileUpload {...defaultProps} />);
    
    expect(screen.getByText('Drop your spreadsheet here')).toBeInTheDocument();
  });

  it('shows uploading state when isUploading is true', () => {
    render(<FileUpload {...defaultProps} isUploading={true} />);
    
    expect(screen.getByText('Uploading file...')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument(); // Loading spinner
  });

  it('configures dropzone with correct accept types', () => {
    render(<FileUpload {...defaultProps} />);
    
    expect(mockUseDropzone).toHaveBeenCalledWith(
      expect.objectContaining({
        accept: {
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
          'application/vnd.ms-excel': ['.xls'],
          'text/csv': ['.csv']
        },
        maxFiles: 1,
        disabled: false
      })
    );
  });

  it('disables dropzone when uploading', () => {
    render(<FileUpload {...defaultProps} isUploading={true} />);
    
    expect(mockUseDropzone).toHaveBeenCalledWith(
      expect.objectContaining({
        disabled: true
      })
    );
  });
});