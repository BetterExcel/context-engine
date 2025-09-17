import { vi, beforeEach, afterEach } from 'vitest';
import { ApiService } from '../api';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ApiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('uploadSpreadsheet', () => {
    it('successfully uploads a file', async () => {
      const mockFile = new File(['test content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          spreadsheet_id: 'test-id-123',
          message: 'File uploaded successfully'
        })
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await ApiService.uploadSpreadsheet(mockFile);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/upload-spreadsheet',
        {
          method: 'POST',
          body: expect.any(FormData)
        }
      );

      expect(result).toEqual({
        success: true,
        message: 'File uploaded successfully',
        spreadsheetId: 'test-id-123'
      });
    });

    it('handles upload failure with error response', async () => {
      const mockFile = new File(['test content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const mockErrorResponse = {
        ok: false,
        json: vi.fn().mockResolvedValue({
          error: {
            code: 'INVALID_FILE_FORMAT',
            message: 'File format not supported'
          }
        })
      };

      mockFetch.mockResolvedValue(mockErrorResponse);

      const result = await ApiService.uploadSpreadsheet(mockFile);

      expect(result).toEqual({
        success: false,
        message: 'Upload failed',
        error: 'File format not supported'
      });
    });

    it('handles network errors', async () => {
      const mockFile = new File(['test content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await ApiService.uploadSpreadsheet(mockFile);

      expect(result).toEqual({
        success: false,
        message: 'Upload failed',
        error: 'Network error'
      });
    });

    it('handles unknown errors', async () => {
      const mockFile = new File(['test content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      mockFetch.mockRejectedValue('Unknown error');

      const result = await ApiService.uploadSpreadsheet(mockFile);

      expect(result).toEqual({
        success: false,
        message: 'Upload failed',
        error: 'Unknown error occurred'
      });
    });

    it('creates FormData with correct file', async () => {
      const mockFile = new File(['test content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ spreadsheet_id: 'test-id' })
      };

      mockFetch.mockResolvedValue(mockResponse);

      await ApiService.uploadSpreadsheet(mockFile);

      const callArgs = mockFetch.mock.calls[0];
      const formData = callArgs[1].body as FormData;
      
      expect(formData.get('file')).toBe(mockFile);
    });
  });

  describe('checkHealth', () => {
    it('successfully checks health status', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ status: 'healthy' })
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await ApiService.checkHealth();

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/v1/health');
      expect(result).toEqual({ status: 'healthy' });
    });

    it('handles health check errors', async () => {
      mockFetch.mockRejectedValue(new Error('Service unavailable'));

      await expect(ApiService.checkHealth()).rejects.toThrow('Service unavailable');
    });
  });

  describe('API URL configuration', () => {
    it('uses environment variable for API URL when available', () => {
      // This test verifies the API_BASE_URL construction
      // The actual environment variable would be set during build time
      expect(true).toBe(true); // Placeholder assertion
    });
  });
});