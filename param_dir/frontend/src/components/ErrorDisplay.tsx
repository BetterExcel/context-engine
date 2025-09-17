import React from 'react';

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  suggestions?: string[];
  timestamp: string;
}

interface ErrorDisplayProps {
  error: ApiError | string;
  title?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
  showDetails?: boolean;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  title = 'Error',
  onRetry,
  onDismiss,
  className = '',
  showDetails = false
}) => {
  const apiError = typeof error === 'string' ? null : error;
  const errorMessage = typeof error === 'string' ? error : error.message;

  const getErrorIcon = (errorCode?: string) => {
    switch (errorCode) {
      case 'INVALID_FILE_FORMAT':
      case 'FILE_TOO_LARGE':
        return (
          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'CSV_DELIMITER_DETECTION_FAILED':
      case 'CSV_ENCODING_DETECTION_FAILED':
      case 'CSV_MALFORMED':
      case 'CSV_INCONSISTENT_COLUMNS':
      case 'CSV_EMPTY_FILE':
      case 'CSV_PARSE_ERROR':
      case 'CSV_INVALID_DELIMITER':
      case 'CSV_ENCODING_CONVERSION_FAILED':
      case 'CSV_ROW_PARSING_FAILED':
      case 'CSV_COLUMN_COUNT_MISMATCH':
        return (
          <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'SPREADSHEET_NOT_FOUND':
        return (
          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        );
      case 'RATE_LIMIT_EXCEEDED':
        return (
          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'CONTEXT_EXTRACTION_FAILED':
      case 'AI_SERVICE_UNAVAILABLE':
        return (
          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getSeverityColor = (errorCode?: string) => {
    switch (errorCode) {
      case 'RATE_LIMIT_EXCEEDED':
        return 'bg-yellow-50 border-yellow-200';
      case 'AI_SERVICE_UNAVAILABLE':
        return 'bg-blue-50 border-blue-200';
      case 'INVALID_FILE_FORMAT':
      case 'FILE_TOO_LARGE':
        return 'bg-orange-50 border-orange-200';
      case 'CSV_DELIMITER_DETECTION_FAILED':
      case 'CSV_ENCODING_DETECTION_FAILED':
      case 'CSV_MALFORMED':
      case 'CSV_INCONSISTENT_COLUMNS':
      case 'CSV_EMPTY_FILE':
      case 'CSV_PARSE_ERROR':
      case 'CSV_INVALID_DELIMITER':
      case 'CSV_ENCODING_CONVERSION_FAILED':
      case 'CSV_ROW_PARSING_FAILED':
      case 'CSV_COLUMN_COUNT_MISMATCH':
        return 'bg-orange-50 border-orange-200';
      default:
        return 'bg-red-50 border-red-200';
    }
  };

  const getTextColor = (errorCode?: string) => {
    switch (errorCode) {
      case 'RATE_LIMIT_EXCEEDED':
        return 'text-yellow-800';
      case 'AI_SERVICE_UNAVAILABLE':
        return 'text-blue-800';
      case 'INVALID_FILE_FORMAT':
      case 'FILE_TOO_LARGE':
      case 'CSV_DELIMITER_DETECTION_FAILED':
      case 'CSV_ENCODING_DETECTION_FAILED':
      case 'CSV_MALFORMED':
      case 'CSV_INCONSISTENT_COLUMNS':
      case 'CSV_EMPTY_FILE':
      case 'CSV_PARSE_ERROR':
      case 'CSV_INVALID_DELIMITER':
      case 'CSV_ENCODING_CONVERSION_FAILED':
      case 'CSV_ROW_PARSING_FAILED':
      case 'CSV_COLUMN_COUNT_MISMATCH':
        return 'text-orange-800';
      default:
        return 'text-red-800';
    }
  };

  const getSubTextColor = (errorCode?: string) => {
    switch (errorCode) {
      case 'RATE_LIMIT_EXCEEDED':
        return 'text-yellow-700';
      case 'AI_SERVICE_UNAVAILABLE':
        return 'text-blue-700';
      case 'INVALID_FILE_FORMAT':
      case 'FILE_TOO_LARGE':
      case 'CSV_DELIMITER_DETECTION_FAILED':
      case 'CSV_ENCODING_DETECTION_FAILED':
      case 'CSV_MALFORMED':
      case 'CSV_INCONSISTENT_COLUMNS':
      case 'CSV_EMPTY_FILE':
      case 'CSV_PARSE_ERROR':
      case 'CSV_INVALID_DELIMITER':
      case 'CSV_ENCODING_CONVERSION_FAILED':
      case 'CSV_ROW_PARSING_FAILED':
      case 'CSV_COLUMN_COUNT_MISMATCH':
        return 'text-orange-700';
      default:
        return 'text-red-700';
    }
  };

  return (
    <div className={`rounded-md p-4 ${getSeverityColor(apiError?.code)} border ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          {getErrorIcon(apiError?.code)}
        </div>
        <div className="ml-3 flex-1">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className={`text-sm font-medium ${getTextColor(apiError?.code)}`}>
                {title}
              </h3>
              <div className={`mt-2 text-sm ${getSubTextColor(apiError?.code)}`}>
                <p>{errorMessage}</p>
              </div>

              {/* Error Code */}
              {apiError?.code && (
                <div className="mt-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    apiError.code === 'RATE_LIMIT_EXCEEDED' ? 'bg-yellow-100 text-yellow-800' :
                    apiError.code === 'AI_SERVICE_UNAVAILABLE' ? 'bg-blue-100 text-blue-800' :
                    apiError.code.includes('FILE') || apiError.code.startsWith('CSV_') ? 'bg-orange-100 text-orange-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {apiError.code}
                  </span>
                </div>
              )}

              {/* CSV-specific error information */}
              {apiError?.code?.startsWith('CSV_') && apiError.details && (
                <div className="mt-3">
                  <div className={`text-sm ${getSubTextColor(apiError.code)} space-y-1`}>
                    {apiError.details.detectedDelimiter && (
                      <p><strong>Detected delimiter:</strong> "{apiError.details.detectedDelimiter}"</p>
                    )}
                    {apiError.details.detectedEncoding && (
                      <p><strong>Detected encoding:</strong> {apiError.details.detectedEncoding}</p>
                    )}
                    {apiError.details.rowNumber && (
                      <p><strong>Problem at row:</strong> {apiError.details.rowNumber}</p>
                    )}
                    {apiError.details.expectedColumns && apiError.details.actualColumns && (
                      <p><strong>Column mismatch:</strong> Expected {apiError.details.expectedColumns}, found {apiError.details.actualColumns}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {apiError?.suggestions && apiError.suggestions.length > 0 && (
                <div className="mt-3">
                  <h4 className={`text-sm font-medium ${getTextColor(apiError.code)}`}>
                    {apiError.code?.startsWith('CSV_') ? 'How to fix this CSV issue:' : 'Suggestions:'}
                  </h4>
                  <ul className={`mt-1 text-sm ${getSubTextColor(apiError.code)} list-disc list-inside space-y-1`}>
                    {apiError.suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Error Details (Development/Debug) */}
              {showDetails && apiError?.details && Object.keys(apiError.details).length > 0 && (
                <details className="mt-3">
                  <summary className={`cursor-pointer text-sm font-medium ${getTextColor(apiError.code)} hover:underline`}>
                    Technical Details
                  </summary>
                  <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(apiError.details, null, 2)}
                    </pre>
                  </div>
                </details>
              )}

              {/* Timestamp */}
              {apiError?.timestamp && (
                <div className={`mt-2 text-xs ${getSubTextColor(apiError.code)} opacity-75`}>
                  {new Date(apiError.timestamp).toLocaleString()}
                </div>
              )}
            </div>

            {/* Dismiss Button */}
            {onDismiss && (
              <div className="ml-auto pl-3">
                <div className="-mx-1.5 -my-1.5">
                  <button
                    type="button"
                    onClick={onDismiss}
                    className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      apiError?.code === 'RATE_LIMIT_EXCEEDED' ? 'text-yellow-500 hover:bg-yellow-100 focus:ring-yellow-600' :
                      apiError?.code === 'AI_SERVICE_UNAVAILABLE' ? 'text-blue-500 hover:bg-blue-100 focus:ring-blue-600' :
                      apiError?.code?.includes('FILE') ? 'text-orange-500 hover:bg-orange-100 focus:ring-orange-600' :
                      'text-red-500 hover:bg-red-100 focus:ring-red-600'
                    }`}
                  >
                    <span className="sr-only">Dismiss</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {onRetry && (
            <div className="mt-4">
              <button
                type="button"
                onClick={onRetry}
                className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  apiError?.code === 'RATE_LIMIT_EXCEEDED' ? 'text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:ring-yellow-600' :
                  apiError?.code === 'AI_SERVICE_UNAVAILABLE' ? 'text-blue-700 bg-blue-100 hover:bg-blue-200 focus:ring-blue-600' :
                  apiError?.code?.includes('FILE') ? 'text-orange-700 bg-orange-100 hover:bg-orange-200 focus:ring-orange-600' :
                  'text-red-700 bg-red-100 hover:bg-red-200 focus:ring-red-600'
                }`}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay;