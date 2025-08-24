import { UploadResponse, ApiError, SpreadsheetData } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export class ApiService {
  static async uploadSpreadsheet(file: File): Promise<UploadResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/upload-spreadsheet`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        try {
          const errorData = await response.json();
          // Handle backend error structure
          if (errorData.error && errorData.error.message) {
            throw new Error(errorData.error.message);
          } else if (errorData.message) {
            throw new Error(errorData.message);
          } else {
            throw new Error(`Upload failed with status ${response.status}`);
          }
        } catch (parseError) {
          throw new Error(`Upload failed with status ${response.status}: ${response.statusText}`);
        }
      }

      const data = await response.json();
      
      // Handle the actual backend response structure
      if (data.success && data.data && data.data.spreadsheetId) {
        return {
          success: true,
          message: 'File uploaded successfully',
          spreadsheetId: data.data.spreadsheetId
        };
      } else {
        throw new Error('Invalid response structure from server');
      }
    } catch (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        message: 'Upload failed',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  static async getSpreadsheetData(spreadsheetId: string): Promise<SpreadsheetData> {
    try {
      const response = await fetch(`${API_BASE_URL}/spreadsheet/${spreadsheetId}`);
      
      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch spreadsheet data');
      }

      const result = await response.json();
      return result.data.spreadsheetData;
    } catch (error) {
      console.error('Failed to fetch spreadsheet data:', error);
      throw error;
    }
  }

  static async analyzeContext(request: {
    request: string;
    spreadsheetId: string;
    currentSelection: {
      sheet: string;
      range: string;
      activeCell: string;
    };
    userContext: {
      sessionId: string;
      recentActions: any[];
      preferences: any;
      interactionHistory: any[];
    };
  }): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/analyze-context`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.error?.message || 'Context analysis failed');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Context analysis error:', error);
      throw error;
    }
  }

  static async generateLLMResponse(request: {
    userRequest: string;
    contextAnalysis: any;
    responseType?: 'explanation' | 'formula' | 'steps' | 'analysis' | 'general';
    includeCode?: boolean;
    includeExamples?: boolean;
  }): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/generate-response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.error?.message || 'LLM response generation failed');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('LLM response generation error:', error);
      throw error;
    }
  }

  static async checkHealth(): Promise<{ status: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }
}