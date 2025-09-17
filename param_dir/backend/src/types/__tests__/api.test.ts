/**
 * Unit tests for API data models
 */

import { ErrorCode } from '../api';

describe('API Data Models', () => {
  describe('ErrorCode enum', () => {
    it('should have all expected error codes', () => {
      expect(ErrorCode.INVALID_FILE_FORMAT).toBe('INVALID_FILE_FORMAT');
      expect(ErrorCode.FILE_TOO_LARGE).toBe('FILE_TOO_LARGE');
      expect(ErrorCode.PARSING_ERROR).toBe('PARSING_ERROR');
      expect(ErrorCode.INVALID_REQUEST).toBe('INVALID_REQUEST');
      expect(ErrorCode.MISSING_PARAMETERS).toBe('MISSING_PARAMETERS');
      expect(ErrorCode.CONTEXT_EXTRACTION_FAILED).toBe('CONTEXT_EXTRACTION_FAILED');
      expect(ErrorCode.AI_SERVICE_UNAVAILABLE).toBe('AI_SERVICE_UNAVAILABLE');
      expect(ErrorCode.RATE_LIMIT_EXCEEDED).toBe('RATE_LIMIT_EXCEEDED');
      expect(ErrorCode.INTERNAL_SERVER_ERROR).toBe('INTERNAL_SERVER_ERROR');
      expect(ErrorCode.SPREADSHEET_NOT_FOUND).toBe('SPREADSHEET_NOT_FOUND');
      expect(ErrorCode.SESSION_EXPIRED).toBe('SESSION_EXPIRED');
    });

    it('should have exactly 25 error codes', () => {
      const errorCodes = Object.values(ErrorCode);
      expect(errorCodes).toHaveLength(25);
    });
  });

  describe('AnalysisOptions interface validation', () => {
    it('should accept all options', () => {
      const options = {
        includePatterns: true,
        includeHistory: false,
        maxContextSize: 1000,
        aiEnhanced: true,
        responseFormat: 'both' as const
      };

      expect(options.includePatterns).toBe(true);
      expect(options.includeHistory).toBe(false);
      expect(options.maxContextSize).toBe(1000);
      expect(options.aiEnhanced).toBe(true);
      expect(options.responseFormat).toBe('both');
    });

    it('should accept partial options', () => {
      const options: {
        includePatterns?: boolean;
        includeHistory?: boolean;
        maxContextSize?: number;
        aiEnhanced?: boolean;
        responseFormat?: 'json' | 'natural_language' | 'both';
      } = {
        includePatterns: true,
        responseFormat: 'json' as const
      };

      expect(options.includePatterns).toBe(true);
      expect(options.responseFormat).toBe('json');
      expect(options.includeHistory).toBeUndefined();
    });
  });

  describe('UploadOptions interface validation', () => {
    it('should accept all upload options', () => {
      const options = {
        parseFormulas: true,
        extractPatterns: false,
        generatePreview: true
      };

      expect(options.parseFormulas).toBe(true);
      expect(options.extractPatterns).toBe(false);
      expect(options.generatePreview).toBe(true);
    });
  });

  describe('ActionableInfo interface validation', () => {
    it('should accept complete actionable info', () => {
      const actionableInfo = {
        targetCells: ['D1', 'D2', 'D3'],
        suggestedOperations: ['SUM', 'AVERAGE'],
        constraints: ['non_empty_cells_only', 'numeric_values_only'],
        expectedOutcome: 'Calculate totals for each row',
        riskLevel: 'low' as const
      };

      expect(actionableInfo.targetCells).toHaveLength(3);
      expect(actionableInfo.suggestedOperations).toHaveLength(2);
      expect(actionableInfo.constraints).toHaveLength(2);
      expect(actionableInfo.riskLevel).toBe('low');
    });

    it('should accept minimal actionable info', () => {
      const actionableInfo: {
        targetCells: string[];
        suggestedOperations: string[];
        constraints: string[];
        expectedOutcome?: string;
        riskLevel: 'low' | 'medium' | 'high';
      } = {
        targetCells: ['A1'],
        suggestedOperations: ['EDIT'],
        constraints: [],
        riskLevel: 'medium' as const
      };

      expect(actionableInfo.targetCells).toHaveLength(1);
      expect(actionableInfo.constraints).toHaveLength(0);
      expect(actionableInfo.expectedOutcome).toBeUndefined();
    });
  });

  describe('SpreadsheetPreview interface validation', () => {
    it('should accept complete preview', () => {
      const preview = {
        sheetNames: ['Sheet1', 'Sheet2', 'Data'],
        totalRows: 100,
        totalColumns: 10,
        hasFormulas: true,
        dataTypes: ['text', 'number', 'date'],
        sampleData: [
          ['Name', 'Age', 'Date'],
          ['John', 25, '2024-01-01'],
          ['Jane', 30, '2024-01-02']
        ]
      };

      expect(preview.sheetNames).toHaveLength(3);
      expect(preview.totalRows).toBe(100);
      expect(preview.hasFormulas).toBe(true);
      expect(preview.dataTypes).toHaveLength(3);
      expect(preview.sampleData).toHaveLength(3);
    });
  });

  describe('ServiceStatus interface validation', () => {
    it('should accept service status with all fields', () => {
      const status = {
        name: 'OpenAI API',
        status: 'up' as const,
        responseTime: 150,
        lastCheck: '2024-01-01T12:00:00Z',
        details: {
          endpoint: 'https://api.openai.com',
          version: 'v1'
        }
      };

      expect(status.name).toBe('OpenAI API');
      expect(status.status).toBe('up');
      expect(status.responseTime).toBe(150);
      expect(status.details?.endpoint).toBe('https://api.openai.com');
    });

    it('should accept minimal service status', () => {
      const status: {
        name: string;
        status: 'up' | 'down' | 'degraded';
        responseTime?: number;
        lastCheck: string;
        details?: Record<string, any>;
      } = {
        name: 'Database',
        status: 'down' as const,
        lastCheck: '2024-01-01T12:00:00Z'
      };

      expect(status.name).toBe('Database');
      expect(status.status).toBe('down');
      expect(status.responseTime).toBeUndefined();
      expect(status.details).toBeUndefined();
    });
  });

  describe('ApiError interface validation', () => {
    it('should accept complete error', () => {
      const error = {
        code: 'INVALID_FILE_FORMAT',
        message: 'The uploaded file format is not supported',
        details: {
          supportedFormats: ['.xlsx', '.xls', '.csv'],
          receivedFormat: '.txt'
        },
        suggestions: [
          'Convert your file to Excel format (.xlsx)',
          'Save as CSV if working with simple data'
        ],
        timestamp: '2024-01-01T12:00:00Z'
      };

      expect(error.code).toBe('INVALID_FILE_FORMAT');
      expect(error.details?.supportedFormats).toHaveLength(3);
      expect(error.suggestions).toHaveLength(2);
    });

    it('should accept minimal error', () => {
      const error: {
        code: string;
        message: string;
        details?: Record<string, any>;
        suggestions?: string[];
        timestamp: string;
      } = {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        timestamp: '2024-01-01T12:00:00Z'
      };

      expect(error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(error.details).toBeUndefined();
      expect(error.suggestions).toBeUndefined();
    });
  });

  describe('PaginationParams interface validation', () => {
    it('should accept complete pagination params', () => {
      const params = {
        page: 2,
        limit: 50,
        sortBy: 'timestamp',
        sortOrder: 'desc' as const
      };

      expect(params.page).toBe(2);
      expect(params.limit).toBe(50);
      expect(params.sortBy).toBe('timestamp');
      expect(params.sortOrder).toBe('desc');
    });

    it('should accept minimal pagination params', () => {
      const params: {
        page: number;
        limit: number;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
      } = {
        page: 1,
        limit: 20
      };

      expect(params.page).toBe(1);
      expect(params.limit).toBe(20);
      expect(params.sortBy).toBeUndefined();
      expect(params.sortOrder).toBeUndefined();
    });
  });

  describe('WebSocketMessage interface validation', () => {
    it('should accept context update message', () => {
      const message = {
        type: 'context_update' as const,
        payload: {
          context: { immediate: {}, related: {} },
          confidence: 0.95
        },
        timestamp: '2024-01-01T12:00:00Z',
        requestId: '123e4567-e89b-12d3-a456-426614174000'
      };

      expect(message.type).toBe('context_update');
      expect(message.payload.confidence).toBe(0.95);
      expect(message.requestId).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should accept processing status message', () => {
      const message: {
        type: 'context_update' | 'processing_status' | 'error' | 'ping';
        payload: any;
        timestamp: string;
        requestId?: string;
      } = {
        type: 'processing_status' as const,
        payload: {
          stage: 'analyzing',
          progress: 50,
          message: 'Analyzing spreadsheet data...'
        },
        timestamp: '2024-01-01T12:00:00Z'
      };

      expect(message.type).toBe('processing_status');
      expect(message.payload.progress).toBe(50);
      expect(message.requestId).toBeUndefined();
    });
  });

  describe('ProcessingStatusUpdate interface validation', () => {
    it('should accept complete status update', () => {
      const update = {
        stage: 'extracting' as const,
        progress: 75,
        message: 'Extracting context from selection...',
        estimatedTimeRemaining: 30
      };

      expect(update.stage).toBe('extracting');
      expect(update.progress).toBe(75);
      expect(update.estimatedTimeRemaining).toBe(30);
    });

    it('should accept status update without time estimate', () => {
      const update: {
        stage: 'parsing' | 'analyzing' | 'extracting' | 'formatting' | 'complete';
        progress: number;
        message: string;
        estimatedTimeRemaining?: number;
      } = {
        stage: 'complete' as const,
        progress: 100,
        message: 'Context analysis complete'
      };

      expect(update.stage).toBe('complete');
      expect(update.progress).toBe(100);
      expect(update.estimatedTimeRemaining).toBeUndefined();
    });
  });
});