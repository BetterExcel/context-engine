import { useState, useRef, useEffect } from 'react';
import { RequestInputProps } from '../types';

const RequestInput: React.FC<RequestInputProps> = ({
  onSubmit,
  isProcessing,
  placeholder = "Ask me anything about your spreadsheet...",
  maxLength = 1000,
  disabled = false
}) => {
  const [request, setRequest] = useState('');
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [request]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear any previous errors
    setError(null);
    
    // Validate request
    const trimmedRequest = request.trim();
    
    if (!trimmedRequest) {
      setError('Please enter a request');
      return;
    }
    
    if (trimmedRequest.length < 3) {
      setError('Request must be at least 3 characters long');
      return;
    }
    
    if (trimmedRequest.length > maxLength) {
      setError(`Request must be less than ${maxLength} characters`);
      return;
    }
    
    // Submit the request
    onSubmit(trimmedRequest);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
    
    // Enforce character limit
    if (value.length <= maxLength) {
      setRequest(value);
    }
  };

  const remainingChars = maxLength - request.length;
  const isNearLimit = remainingChars <= 50;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Ask About Your Spreadsheet
        </h3>
        <p className="text-sm text-gray-600">
          Describe what you need help with, and I'll analyze your spreadsheet context to provide relevant assistance.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" role="form">
        <div>
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={request}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled || isProcessing}
              className={`
                w-full px-3 py-3 border rounded-md resize-none overflow-hidden
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
                ${error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'}
                min-h-[80px] max-h-[200px]
              `}
              rows={3}
            />
            
            {/* Loading overlay */}
            {isProcessing && (
              <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-md">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-gray-600">Analyzing...</span>
                </div>
              </div>
            )}
          </div>

          {/* Character count and error */}
          <div className="flex justify-between items-center mt-2">
            <div>
              {error && (
                <p className="text-sm text-red-600 flex items-center">
                  <svg
                    className="w-4 h-4 mr-1 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {error}
                </p>
              )}
            </div>
            <div className={`text-xs ${isNearLimit ? 'text-orange-600' : 'text-gray-500'}`}>
              {remainingChars} characters remaining
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Press <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">Enter</kbd> to submit
          </div>
          
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => {
                setRequest('');
                setError(null);
              }}
              disabled={disabled || isProcessing || !request.trim()}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear
            </button>
            
            <button
              type="submit"
              disabled={disabled || isProcessing}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <span>Analyze Context</span>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Help text */}
      <div className="mt-4 p-3 bg-blue-50 rounded-md">
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">Example requests:</p>
          <ul className="list-disc list-inside space-y-1 text-blue-700">
            <li>"Help me create a formula to calculate the total sales"</li>
            <li>"What patterns do you see in this data?"</li>
            <li>"How can I format these cells to show currency?"</li>
            <li>"Find errors in my formulas"</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RequestInput;