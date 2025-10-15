import React, { useState, useEffect } from 'react';
import { Lightbulb, TrendingUp, Users, Brain, ChevronDown, ChevronUp, Star, AlertCircle } from 'lucide-react';

interface Recommendation {
  id: string;
  type: 'context_suggestion' | 'approach_suggestion' | 'similar_request' | 'best_practice';
  title: string;
  description: string;
  confidence: number;
  relevanceScore: number;
  source: 'learned_pattern' | 'similar_feedback' | 'ai_generated' | 'rule_based';
  metadata: {
    basedOnFeedback?: string[];
    similarRequests?: number;
    successRate?: number;
    sampleSize?: number;
  };
  actionable: boolean;
  suggestions: string[];
}

interface RecommendationsPanelProps {
  request: string;
  intent?: string;
  contextType?: string;
  isVisible: boolean;
  onToggle: () => void;
}

export const RecommendationsPanel: React.FC<RecommendationsPanelProps> = ({
  request,
  intent,
  contextType,
  isVisible,
  onToggle
}) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRecommendations, setExpandedRecommendations] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isVisible && request.trim()) {
      fetchRecommendations();
    }
  }, [request, intent, contextType, isVisible]);

  const fetchRecommendations = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        request,
        ...(intent && { intent }),
        ...(contextType && { contextType })
      });

      const response = await fetch(`/api/v1/feedback/recommendations?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      const data = await response.json();
      
      if (data.success) {
        setRecommendations(data.data.recommendations || []);
      } else {
        throw new Error(data.error?.message || 'Failed to fetch recommendations');
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch recommendations');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRecommendation = (id: string) => {
    const newExpanded = new Set(expandedRecommendations);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRecommendations(newExpanded);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'context_suggestion':
        return <Brain size={16} className="text-blue-500" />;
      case 'approach_suggestion':
        return <Lightbulb size={16} className="text-yellow-500" />;
      case 'similar_request':
        return <Users size={16} className="text-green-500" />;
      case 'best_practice':
        return <TrendingUp size={16} className="text-purple-500" />;
      default:
        return <Lightbulb size={16} className="text-gray-500" />;
    }
  };

  const getSourceBadge = (source: string) => {
    const badges = {
      'learned_pattern': { label: 'Learned', color: 'bg-blue-100 text-blue-800' },
      'similar_feedback': { label: 'Similar', color: 'bg-green-100 text-green-800' },
      'ai_generated': { label: 'AI', color: 'bg-purple-100 text-purple-800' },
      'rule_based': { label: 'Rule', color: 'bg-gray-100 text-gray-800' }
    };

    const badge = badges[source as keyof typeof badges] || badges.rule_based;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatConfidence = (confidence: number) => {
    return `${Math.round(confidence * 100)}%`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <Lightbulb size={20} className="text-blue-500" />
          <span className="font-medium text-gray-900">
            Recommendations
          </span>
          {recommendations.length > 0 && (
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
              {recommendations.length}
            </span>
          )}
        </div>
        {isVisible ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {isVisible && (
        <div className="border-t border-gray-200">
          {isLoading && (
            <div className="p-4 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
              <span className="ml-2 text-sm text-gray-600">Loading recommendations...</span>
            </div>
          )}

          {error && (
            <div className="p-4 flex items-center space-x-2 text-red-600 bg-red-50">
              <AlertCircle size={16} />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {!isLoading && !error && recommendations.length === 0 && (
            <div className="p-4 text-center text-gray-500">
              <Lightbulb size={24} className="mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No recommendations available for this request.</p>
            </div>
          )}

          {!isLoading && !error && recommendations.length > 0 && (
            <div className="divide-y divide-gray-100">
              {recommendations.map((recommendation) => (
                <div key={recommendation.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getTypeIcon(recommendation.type)}
                      <h3 className="font-medium text-gray-900 text-sm">
                        {recommendation.title}
                      </h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getSourceBadge(recommendation.source)}
                      <div className="flex items-center space-x-1">
                        <Star size={12} className={getConfidenceColor(recommendation.confidence)} />
                        <span className={`text-xs font-medium ${getConfidenceColor(recommendation.confidence)}`}>
                          {formatConfidence(recommendation.confidence)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-3">
                    {recommendation.description}
                  </p>

                  {/* Metadata */}
                  {(recommendation.metadata.successRate || recommendation.metadata.similarRequests) && (
                    <div className="flex items-center space-x-4 mb-3 text-xs text-gray-500">
                      {recommendation.metadata.successRate && (
                        <span>
                          Success Rate: {Math.round(recommendation.metadata.successRate * 100)}%
                        </span>
                      )}
                      {recommendation.metadata.similarRequests && (
                        <span>
                          Similar Requests: {recommendation.metadata.similarRequests}
                        </span>
                      )}
                      {recommendation.metadata.sampleSize && (
                        <span>
                          Sample Size: {recommendation.metadata.sampleSize}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Suggestions */}
                  {recommendation.suggestions.length > 0 && (
                    <div>
                      <button
                        onClick={() => toggleRecommendation(recommendation.id)}
                        className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700 font-medium mb-2"
                      >
                        <span>
                          {expandedRecommendations.has(recommendation.id) ? 'Hide' : 'Show'} Suggestions
                        </span>
                        {expandedRecommendations.has(recommendation.id) ? 
                          <ChevronUp size={14} /> : <ChevronDown size={14} />
                        }
                      </button>

                      {expandedRecommendations.has(recommendation.id) && (
                        <ul className="space-y-1 ml-4">
                          {recommendation.suggestions.map((suggestion, index) => (
                            <li key={index} className="text-sm text-gray-600 flex items-start">
                              <span className="text-blue-400 mr-2">•</span>
                              <span>{suggestion}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};