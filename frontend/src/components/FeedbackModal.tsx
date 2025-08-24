import React, { useState } from 'react';
import { X, Star, MessageSquare, CheckCircle, AlertCircle } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedback: FeedbackData) => Promise<void>;
  requestId: string;
  contextId: string;
  contextPreview?: string;
}

interface FeedbackData {
  satisfaction: number;
  feedback?: string;
  corrections?: ContextCorrection[];
}

interface ContextCorrection {
  field: string;
  expectedValue: any;
  actualValue: any;
  importance: 'low' | 'medium' | 'high';
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  requestId,
  contextId,
  contextPreview
}) => {
  const [satisfaction, setSatisfaction] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');
  const [corrections, setCorrections] = useState<ContextCorrection[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (satisfaction === 0) {
      alert('Please provide a satisfaction rating');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      await onSubmit({
        satisfaction,
        feedback: feedback.trim() || undefined,
        corrections: corrections.length > 0 ? corrections : undefined
      });
      
      setSubmitStatus('success');
      setTimeout(() => {
        onClose();
        resetForm();
      }, 1500);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSatisfaction(0);
    setFeedback('');
    setCorrections([]);
    setSubmitStatus('idle');
  };

  const addCorrection = () => {
    setCorrections([...corrections, {
      field: '',
      expectedValue: '',
      actualValue: '',
      importance: 'medium'
    }]);
  };

  const updateCorrection = (index: number, field: keyof ContextCorrection, value: any) => {
    const updated = [...corrections];
    updated[index] = { ...updated[index], [field]: value };
    setCorrections(updated);
  };

  const removeCorrection = (index: number) => {
    setCorrections(corrections.filter((_, i) => i !== index));
  };

  const getSatisfactionLabel = (rating: number): string => {
    switch (rating) {
      case 1: return 'Very Poor';
      case 2: return 'Poor';
      case 3: return 'Fair';
      case 4: return 'Good';
      case 5: return 'Excellent';
      default: return 'Select Rating';
    }
  };

  const getSatisfactionColor = (rating: number): string => {
    if (rating <= 2) return 'text-red-500';
    if (rating === 3) return 'text-yellow-500';
    return 'text-green-500';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Provide Feedback
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Context Preview */}
          {contextPreview && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Context Preview
              </h3>
              <p className="text-sm text-gray-600 line-clamp-3">
                {contextPreview}
              </p>
            </div>
          )}

          {/* Satisfaction Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              How satisfied were you with the context provided?
            </label>
            <div className="flex items-center space-x-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => setSatisfaction(rating)}
                  className={`p-2 rounded-lg transition-colors ${
                    satisfaction >= rating
                      ? 'text-yellow-400 bg-yellow-50'
                      : 'text-gray-300 hover:text-yellow-300'
                  }`}
                  disabled={isSubmitting}
                >
                  <Star
                    size={24}
                    fill={satisfaction >= rating ? 'currentColor' : 'none'}
                  />
                </button>
              ))}
              <span className={`ml-4 text-sm font-medium ${getSatisfactionColor(satisfaction)}`}>
                {getSatisfactionLabel(satisfaction)}
              </span>
            </div>
          </div>

          {/* Additional Feedback */}
          <div>
            <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 mb-2">
              Additional Comments (Optional)
            </label>
            <textarea
              id="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Tell us what worked well or what could be improved..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={4}
              disabled={isSubmitting}
            />
          </div>

          {/* Corrections Section */}
          {satisfaction <= 3 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Context Corrections (Optional)
                </label>
                <button
                  type="button"
                  onClick={addCorrection}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  disabled={isSubmitting}
                >
                  + Add Correction
                </button>
              </div>
              
              {corrections.map((correction, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4 mb-3">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-700">
                      Correction {index + 1}
                    </h4>
                    <button
                      type="button"
                      onClick={() => removeCorrection(index)}
                      className="text-red-500 hover:text-red-700"
                      disabled={isSubmitting}
                    >
                      <X size={16} />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Field
                      </label>
                      <input
                        type="text"
                        value={correction.field}
                        onChange={(e) => updateCorrection(index, 'field', e.target.value)}
                        placeholder="e.g., selectedRange, dataTypes"
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                        disabled={isSubmitting}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Importance
                      </label>
                      <select
                        value={correction.importance}
                        onChange={(e) => updateCorrection(index, 'importance', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                        disabled={isSubmitting}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Expected Value
                      </label>
                      <input
                        type="text"
                        value={correction.expectedValue}
                        onChange={(e) => updateCorrection(index, 'expectedValue', e.target.value)}
                        placeholder="What should it have been?"
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                        disabled={isSubmitting}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Actual Value
                      </label>
                      <input
                        type="text"
                        value={correction.actualValue}
                        onChange={(e) => updateCorrection(index, 'actualValue', e.target.value)}
                        placeholder="What was provided?"
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Submit Status */}
          {submitStatus === 'success' && (
            <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg">
              <CheckCircle size={20} />
              <span className="text-sm font-medium">Feedback submitted successfully!</span>
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle size={20} />
              <span className="text-sm font-medium">Failed to submit feedback. Please try again.</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={satisfaction === 0 || isSubmitting || submitStatus === 'success'}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <MessageSquare size={16} />
                  <span>Submit Feedback</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};