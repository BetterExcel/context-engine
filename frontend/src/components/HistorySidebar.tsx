import { useState, useEffect } from 'react';
import { SessionService, ContextHistoryEntry, UserFeedback } from '../services/sessionService';

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectHistoryEntry: (entry: ContextHistoryEntry) => void;
  currentSessionId?: string;
}

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number, wasHelpful: boolean, corrections?: string) => void;
  contextId: string;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, onSubmit, contextId }) => {
  const [rating, setRating] = useState(5);
  const [wasHelpful, setWasHelpful] = useState(true);
  const [corrections, setCorrections] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await onSubmit(rating, wasHelpful, corrections || undefined);
      onClose();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Provide Feedback
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              How would you rate this context analysis?
            </label>
            <div className="flex space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`w-8 h-8 ${
                    star <= rating ? 'text-yellow-400' : 'text-gray-300'
                  } hover:text-yellow-400 transition-colors`}
                >
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
              ))}
            </div>
          </div>

          {/* Helpful toggle */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={wasHelpful}
                onChange={(e) => setWasHelpful(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">
                This analysis was helpful
              </span>
            </label>
          </div>

          {/* Corrections */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Any corrections or suggestions? (Optional)
            </label>
            <textarea
              value={corrections}
              onChange={(e) => setCorrections(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="What could be improved?"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const HistorySidebar: React.FC<HistorySidebarProps> = ({
  isOpen,
  onClose,
  onSelectHistoryEntry,
  currentSessionId
}) => {
  const [history, setHistory] = useState<ContextHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    contextId: string;
  }>({ isOpen: false, contextId: '' });

  // Load history when sidebar opens
  useEffect(() => {
    if (isOpen && currentSessionId) {
      loadHistory();
    }
  }, [isOpen, currentSessionId]);

  const loadHistory = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const historyData = await SessionService.getContextHistory(currentSessionId, 20);
      setHistory(historyData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedbackSubmit = async (rating: number, wasHelpful: boolean, corrections?: string) => {
    await SessionService.submitFeedback(
      feedbackModal.contextId,
      rating,
      wasHelpful,
      corrections,
      currentSessionId
    );
    
    // Reload history to show updated feedback
    await loadHistory();
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const truncateRequest = (request: string, maxLength: number = 80) => {
    if (request.length <= maxLength) return request;
    return request.substring(0, maxLength) + '...';
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl z-40 transform transition-transform duration-300 ease-in-out">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Request History
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="p-4 text-center">
                <div className="text-red-600 mb-2">
                  <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-600 mb-3">{error}</p>
                <button
                  onClick={loadHistory}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Try Again
                </button>
              </div>
            ) : history.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm">No request history yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Your context analysis requests will appear here
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => onSelectHistoryEntry(entry)}
                  >
                    {/* Request text */}
                    <div className="text-sm text-gray-900 mb-2">
                      {truncateRequest(entry.request)}
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                      <span>{formatTimestamp(entry.timestamp)}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(entry.confidence)}`}>
                        {Math.round(entry.confidence * 100)}% confidence
                      </span>
                    </div>

                    {/* Feedback status */}
                    <div className="flex items-center justify-between">
                      {entry.feedback ? (
                        <div className="flex items-center text-xs text-gray-600">
                          <div className="flex text-yellow-400 mr-1">
                            {[...Array(5)].map((_, i) => (
                              <svg
                                key={i}
                                className={`w-3 h-3 ${i < entry.feedback!.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                          <span>Rated</span>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setFeedbackModal({ isOpen: true, contextId: entry.id });
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Rate this analysis
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="text-xs text-gray-500 text-center">
              {history.length} request{history.length !== 1 ? 's' : ''} in this session
            </div>
          </div>
        </div>
      </div>

      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-25 z-30"
        onClick={onClose}
      />

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={feedbackModal.isOpen}
        onClose={() => setFeedbackModal({ isOpen: false, contextId: '' })}
        onSubmit={handleFeedbackSubmit}
        contextId={feedbackModal.contextId}
      />
    </>
  );
};

export default HistorySidebar;