import { FeedbackRepository } from '../database/repositories/FeedbackRepository';
import { Feedback } from '../database/models/Feedback';
import { IntentType } from '../types/context';
import { OpenAIService } from './OpenAIService';

export interface RecommendationRequest {
  request: string;
  intent?: string;
  contextType?: string;
  currentSelection?: string;
  dataTypes?: string[];
}

export interface Recommendation {
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

export interface SimilarRequest {
  requestText: string;
  intent: IntentType;
  satisfaction: number;
  contextUsed: any;
  feedback?: string;
  similarity: number;
}

export class RecommendationServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'RecommendationServiceError';
  }
}

export class RecommendationService {
  private feedbackRepository: FeedbackRepository;
  private openAIService?: OpenAIService;
  private similarityCache: Map<string, SimilarRequest[]> = new Map();
  private recommendationCache: Map<string, Recommendation[]> = new Map();

  constructor(openAIService?: OpenAIService) {
    this.feedbackRepository = new FeedbackRepository();
    if (openAIService) {
      this.openAIService = openAIService;
    }
  }

  /**
   * Get recommendations for a given request
   */
  async getRecommendations(request: RecommendationRequest): Promise<Recommendation[]> {
    try {
      const cacheKey = this.generateCacheKey(request);
      
      // Check cache first
      if (this.recommendationCache.has(cacheKey)) {
        const cached = this.recommendationCache.get(cacheKey)!;
        // Return cached results if less than 1 hour old
        if (cached.length > 0 && this.isCacheValid(cached[0]?.metadata.basedOnFeedback?.[0])) {
          return cached;
        }
      }

      const recommendations: Recommendation[] = [];

      // Get recommendations from different sources
      const [
        patternRecommendations,
        similarityRecommendations,
        aiRecommendations,
        ruleBasedRecommendations
      ] = await Promise.all([
        this.getPatternBasedRecommendations(request),
        this.getSimilarityBasedRecommendations(request),
        this.getAIGeneratedRecommendations(request),
        this.getRuleBasedRecommendations(request)
      ]);

      recommendations.push(
        ...patternRecommendations,
        ...similarityRecommendations,
        ...aiRecommendations,
        ...ruleBasedRecommendations
      );

      // Sort by relevance and confidence
      const sortedRecommendations = recommendations
        .sort((a, b) => (b.relevanceScore * b.confidence) - (a.relevanceScore * a.confidence))
        .slice(0, 10); // Limit to top 10

      // Cache results
      this.recommendationCache.set(cacheKey, sortedRecommendations);

      return sortedRecommendations;

    } catch (error) {
      console.error('Error getting recommendations:', error);
      throw new RecommendationServiceError(
        'Failed to get recommendations',
        'RECOMMENDATION_ERROR',
        { request, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Update recommendation system based on new feedback
   */
  async updateFromFeedback(feedback: Feedback): Promise<void> {
    try {
      // Clear relevant caches
      this.clearRelevantCaches(feedback);

      // Update similarity patterns
      await this.updateSimilarityPatterns(feedback);

      // Update success patterns
      await this.updateSuccessPatterns(feedback);

    } catch (error) {
      console.error('Error updating from feedback:', error);
      // Don't throw - this is a background update
    }
  }

  /**
   * Find similar requests based on text similarity and context
   */
  async findSimilarRequests(
    request: string,
    intent?: string,
    limit: number = 5
  ): Promise<SimilarRequest[]> {
    try {
      const cacheKey = `similar_${request}_${intent}_${limit}`;
      
      if (this.similarityCache.has(cacheKey)) {
        return this.similarityCache.get(cacheKey)!;
      }

      // Get high-satisfaction feedback for similarity matching
      const highSatisfactionFeedback = await this.feedbackRepository.findHighSatisfactionFeedback(4);

      const similarRequests: SimilarRequest[] = [];

      for (const feedback of highSatisfactionFeedback) {
        // Extract request text from metadata (simplified)
        const requestText = feedback.metadata?.['request'] || '';
        if (!requestText) continue;

        // Calculate similarity
        const similarity = this.calculateTextSimilarity(request, requestText);
        
        if (similarity > 0.3) { // Minimum similarity threshold
          similarRequests.push({
            requestText,
            intent: this.extractIntentFromContext(feedback.predicted_context),
            satisfaction: feedback.user_satisfaction || 0,
            contextUsed: feedback.predicted_context,
            feedback: feedback.comments || undefined,
            similarity
          });
        }
      }

      // Sort by similarity and satisfaction
      const sortedSimilar = similarRequests
        .sort((a, b) => (b.similarity * b.satisfaction) - (a.similarity * a.satisfaction))
        .slice(0, limit);

      this.similarityCache.set(cacheKey, sortedSimilar);
      return sortedSimilar;

    } catch (error) {
      console.error('Error finding similar requests:', error);
      return [];
    }
  }

  /**
   * Get pattern-based recommendations from learned patterns
   */
  private async getPatternBasedRecommendations(request: RecommendationRequest): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    try {
      // Get successful feedback patterns
      const successfulFeedback = await this.feedbackRepository.findHighSatisfactionFeedback(4);
      
      // Group by pattern and find high-success patterns
      const patternMap = new Map<string, { feedback: Feedback[]; successRate: number }>();

      for (const feedback of successfulFeedback) {
        const pattern = this.extractPattern(feedback.predicted_context);
        if (!patternMap.has(pattern)) {
          patternMap.set(pattern, { feedback: [], successRate: 0 });
        }
        patternMap.get(pattern)!.feedback.push(feedback);
      }

      // Calculate success rates and create recommendations
      for (const [pattern, data] of patternMap.entries()) {
        if (data.feedback.length >= 3) { // Minimum sample size
          const avgSatisfaction = data.feedback.reduce((sum, f) => sum + (f.user_satisfaction || 0), 0) / data.feedback.length;
          const successRate = avgSatisfaction / 5;

          if (successRate > 0.7 && this.isPatternRelevant(pattern, request)) {
            recommendations.push({
              id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              type: 'context_suggestion',
              title: 'Successful Pattern Identified',
              description: `Similar requests have achieved ${(successRate * 100).toFixed(0)}% satisfaction using this approach.`,
              confidence: Math.min(data.feedback.length / 10, 1.0),
              relevanceScore: this.calculatePatternRelevance(pattern, request),
              source: 'learned_pattern',
              metadata: {
                basedOnFeedback: data.feedback.map(f => f.id!),
                successRate,
                sampleSize: data.feedback.length
              },
              actionable: true,
              suggestions: this.generatePatternSuggestions(pattern, data.feedback)
            });
          }
        }
      }

    } catch (error) {
      console.error('Error getting pattern-based recommendations:', error);
    }

    return recommendations;
  }

  /**
   * Get similarity-based recommendations from similar requests
   */
  private async getSimilarityBasedRecommendations(request: RecommendationRequest): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    try {
      const similarRequests = await this.findSimilarRequests(request.request, request.intent, 3);

      for (const similar of similarRequests) {
        if (similar.similarity > 0.5 && similar.satisfaction >= 4) {
          recommendations.push({
            id: `similar_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'similar_request',
            title: 'Similar Successful Request',
            description: `A similar request "${similar.requestText.substring(0, 100)}..." achieved ${similar.satisfaction}/5 satisfaction.`,
            confidence: similar.similarity,
            relevanceScore: similar.similarity * (similar.satisfaction / 5),
            source: 'similar_feedback',
            metadata: {
              similarRequests: 1,
              successRate: similar.satisfaction / 5
            },
            actionable: true,
            suggestions: [
              'Consider using a similar approach to the successful request',
              'Review the context that worked well for similar requests',
              similar.feedback ? `User feedback: "${similar.feedback}"` : 'Apply similar context extraction strategy'
            ]
          });
        }
      }

    } catch (error) {
      console.error('Error getting similarity-based recommendations:', error);
    }

    return recommendations;
  }

  /**
   * Get AI-generated recommendations
   */
  private async getAIGeneratedRecommendations(request: RecommendationRequest): Promise<Recommendation[]> {
    if (!this.openAIService) {
      return [];
    }

    try {
      const prompt = `Based on the following user request for spreadsheet assistance, provide recommendations for context extraction and analysis:

Request: "${request.request}"
Intent: ${request.intent || 'unknown'}
Context Type: ${request.contextType || 'unknown'}
Current Selection: ${request.currentSelection || 'none'}
Data Types: ${request.dataTypes?.join(', ') || 'unknown'}

Provide 2-3 specific, actionable recommendations in JSON format:
{
  "recommendations": [
    {
      "type": "context_suggestion|approach_suggestion|best_practice",
      "title": "Brief recommendation title",
      "description": "Detailed description of the recommendation",
      "suggestions": ["specific actionable suggestion 1", "specific actionable suggestion 2"]
    }
  ]
}`;

      const response = await this.openAIService.generateCompletion([
        { role: 'system', content: 'You are an expert in spreadsheet context analysis. Provide specific, actionable recommendations.' },
        { role: 'user', content: prompt }
      ], {
        temperature: 0.3,
        maxTokens: 600
      });

      const parsed = JSON.parse(response);
      
      return parsed.recommendations.map((rec: any, index: number) => ({
        id: `ai_${Date.now()}_${index}`,
        type: rec.type,
        title: rec.title,
        description: rec.description,
        confidence: 0.7, // AI recommendations have moderate confidence
        relevanceScore: 0.8, // Assume high relevance since AI understands context
        source: 'ai_generated',
        metadata: {},
        actionable: true,
        suggestions: rec.suggestions
      }));

    } catch (error) {
      console.error('Error getting AI recommendations:', error);
      return [];
    }
  }

  /**
   * Get rule-based recommendations
   */
  private async getRuleBasedRecommendations(request: RecommendationRequest): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Intent-based recommendations
    if (request.intent) {
      const intentRecommendations = this.getIntentBasedRecommendations(request.intent, request);
      recommendations.push(...intentRecommendations);
    }

    // Data type-based recommendations
    if (request.dataTypes && request.dataTypes.length > 0) {
      const dataTypeRecommendations = this.getDataTypeBasedRecommendations(request.dataTypes, request);
      recommendations.push(...dataTypeRecommendations);
    }

    // General best practices
    const bestPractices = this.getBestPracticeRecommendations(request);
    recommendations.push(...bestPractices);

    return recommendations;
  }

  /**
   * Get intent-based recommendations
   */
  private getIntentBasedRecommendations(intent: string, _request: RecommendationRequest): Recommendation[] {
    const recommendations: Recommendation[] = [];

    switch (intent) {
      case IntentType.FORMULA_ASSISTANCE:
        recommendations.push({
          id: `intent_formula_${Date.now()}`,
          type: 'approach_suggestion',
          title: 'Formula Context Best Practices',
          description: 'For formula assistance, include cell references, data types, and existing formulas in the context.',
          confidence: 0.9,
          relevanceScore: 0.9,
          source: 'rule_based',
          metadata: {},
          actionable: true,
          suggestions: [
            'Include all referenced cells in the context',
            'Show existing formulas and their dependencies',
            'Provide data type information for each column',
            'Include sample data values for validation'
          ]
        });
        break;

      case IntentType.DATA_ANALYSIS:
        recommendations.push({
          id: `intent_analysis_${Date.now()}`,
          type: 'approach_suggestion',
          title: 'Data Analysis Context Best Practices',
          description: 'For data analysis, include statistical summaries, data patterns, and full dataset context.',
          confidence: 0.9,
          relevanceScore: 0.9,
          source: 'rule_based',
          metadata: {},
          actionable: true,
          suggestions: [
            'Include statistical summaries (mean, median, range)',
            'Identify data patterns and trends',
            'Provide complete dataset context, not just selection',
            'Include data quality information (missing values, outliers)'
          ]
        });
        break;

      case IntentType.FORMATTING:
        recommendations.push({
          id: `intent_formatting_${Date.now()}`,
          type: 'approach_suggestion',
          title: 'Formatting Context Best Practices',
          description: 'For formatting requests, include current styling, data types, and visual requirements.',
          confidence: 0.9,
          relevanceScore: 0.9,
          source: 'rule_based',
          metadata: {},
          actionable: true,
          suggestions: [
            'Include current cell formatting information',
            'Specify data types for appropriate formatting',
            'Consider conditional formatting opportunities',
            'Include visual hierarchy requirements'
          ]
        });
        break;
    }

    return recommendations;
  }

  /**
   * Get data type-based recommendations
   */
  private getDataTypeBasedRecommendations(dataTypes: string[], _request: RecommendationRequest): Recommendation[] {
    const recommendations: Recommendation[] = [];

    if (dataTypes.includes('number')) {
      recommendations.push({
        id: `datatype_number_${Date.now()}`,
        type: 'context_suggestion',
        title: 'Numeric Data Context Enhancement',
        description: 'Include statistical information and numeric patterns for better analysis.',
        confidence: 0.8,
        relevanceScore: 0.7,
        source: 'rule_based',
        metadata: {},
        actionable: true,
        suggestions: [
          'Include min, max, average, and sum statistics',
          'Identify numeric patterns and trends',
          'Check for outliers and data quality issues',
          'Consider appropriate number formatting'
        ]
      });
    }

    if (dataTypes.includes('date')) {
      recommendations.push({
        id: `datatype_date_${Date.now()}`,
        type: 'context_suggestion',
        title: 'Date Data Context Enhancement',
        description: 'Include temporal patterns and date range information for time-based analysis.',
        confidence: 0.8,
        relevanceScore: 0.7,
        source: 'rule_based',
        metadata: {},
        actionable: true,
        suggestions: [
          'Include date range and temporal patterns',
          'Identify seasonal or cyclical trends',
          'Consider time-based grouping opportunities',
          'Ensure consistent date formatting'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Get general best practice recommendations
   */
  private getBestPracticeRecommendations(_request: RecommendationRequest): Recommendation[] {
    return [{
      id: `bestpractice_${Date.now()}`,
      type: 'best_practice',
      title: 'Context Extraction Best Practices',
      description: 'General recommendations for improving context accuracy and relevance.',
      confidence: 0.6,
      relevanceScore: 0.5,
      source: 'rule_based',
      metadata: {},
      actionable: true,
      suggestions: [
        'Include sufficient context around the selection',
        'Provide clear data structure information',
        'Consider user intent when selecting relevant data',
        'Include error handling for edge cases'
      ]
    }];
  }

  /**
   * Utility methods
   */
  private generateCacheKey(request: RecommendationRequest): string {
    return Buffer.from(JSON.stringify(request)).toString('base64').substring(0, 32);
  }

  private isCacheValid(timestamp?: string): boolean {
    if (!timestamp) return false;
    const cacheTime = new Date(timestamp).getTime();
    const now = Date.now();
    return (now - cacheTime) < (60 * 60 * 1000); // 1 hour
  }

  private clearRelevantCaches(_feedback: Feedback): void {
    // Clear caches that might be affected by this feedback
    this.similarityCache.clear();
    this.recommendationCache.clear();
  }

  private async updateSimilarityPatterns(feedback: Feedback): Promise<void> {
    // Update similarity patterns based on new feedback
    // This would be more sophisticated in a full implementation
    console.log('Updated similarity patterns from feedback:', feedback.id);
  }

  private async updateSuccessPatterns(feedback: Feedback): Promise<void> {
    // Update success patterns based on new feedback
    // This would be more sophisticated in a full implementation
    console.log('Updated success patterns from feedback:', feedback.id);
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    // Simplified text similarity calculation
    // In practice, you'd use more sophisticated algorithms like cosine similarity
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = new Set([...words1, ...words2]).size;
    
    return commonWords.length / totalWords;
  }

  private extractIntentFromContext(context: any): IntentType {
    // Simplified intent extraction from context
    if (context.formulas || context.formula) return IntentType.FORMULA_ASSISTANCE;
    if (context.analysis || context.patterns) return IntentType.DATA_ANALYSIS;
    if (context.formatting || context.style) return IntentType.FORMATTING;
    return IntentType.GENERAL_ASSISTANCE;
  }

  private extractPattern(context: any): string {
    // Simplified pattern extraction
    const keys = Object.keys(context).sort();
    return keys.join('|');
  }

  private isPatternRelevant(pattern: string, request: RecommendationRequest): boolean {
    // Simplified relevance check
    const patternParts = pattern.split('|');
    const requestLower = request.request.toLowerCase();
    
    return patternParts.some(part => 
      requestLower.includes(part.toLowerCase()) ||
      (request.intent && part.toLowerCase().includes(request.intent.toLowerCase()))
    );
  }

  private calculatePatternRelevance(pattern: string, request: RecommendationRequest): number {
    // Simplified relevance calculation
    const patternParts = pattern.split('|');
    const requestWords = request.request.toLowerCase().split(/\s+/);
    
    const matches = patternParts.filter(part => 
      requestWords.some(word => part.toLowerCase().includes(word))
    );
    
    return matches.length / patternParts.length;
  }

  private generatePatternSuggestions(_pattern: string, feedback: Feedback[]): string[] {
    const suggestions: string[] = [];
    
    // Analyze successful feedback for common suggestions
    const comments = feedback
      .map(f => f.comments)
      .filter(c => c && c.length > 0);
    
    if (comments.length > 0) {
      suggestions.push('Apply the successful approach used in similar contexts');
      suggestions.push('Consider the feedback from successful similar requests');
    }
    
    suggestions.push(`Use the pattern that achieved ${((feedback.reduce((sum, f) => sum + (f.user_satisfaction || 0), 0) / feedback.length) / 5 * 100).toFixed(0)}% satisfaction`);
    
    return suggestions;
  }
}