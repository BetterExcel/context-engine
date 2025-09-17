import { FeedbackRepository } from '../database/repositories/FeedbackRepository';
import { Feedback } from '../database/models/Feedback';
import { OpenAIService } from './OpenAIService';
import { IntentType } from '../types/context';

export interface LearningPattern {
  id: string;
  pattern: string;
  intent: IntentType;
  contextType: string;
  successRate: number;
  sampleSize: number;
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LearningInsight {
  type: 'improvement' | 'pattern' | 'warning' | 'success';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
  recommendations: string[];
  metrics?: Record<string, number>;
}

export interface LearningResults {
  patternsLearned: number;
  insightsGenerated: number;
  accuracyImprovement: number;
  processingTime: number;
  patterns: LearningPattern[];
  insights: LearningInsight[];
}

export interface LearningOptions {
  minFeedbackCount: number;
  minSatisfactionRating: number;
  maxPatterns?: number;
  enableAIAnalysis?: boolean;
}

export class LearningEngineError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'LearningEngineError';
  }
}

export class LearningEngine {
  private feedbackRepository: FeedbackRepository;
  private openAIService?: OpenAIService;
  private patterns: Map<string, LearningPattern> = new Map();

  constructor(openAIService?: OpenAIService) {
    this.feedbackRepository = new FeedbackRepository();
    if (openAIService) {
      this.openAIService = openAIService;
    }
  }

  /**
   * Process individual feedback and apply immediate learning
   */
  async processFeedback(feedback: Feedback): Promise<boolean> {
    try {
      // Extract learning signals from feedback
      const learningSignals = this.extractLearningSignals(feedback);

      if (learningSignals.length === 0) {
        return false;
      }

      // Apply immediate learning updates
      let learningApplied = false;

      for (const signal of learningSignals) {
        const applied = await this.applyLearningSignal(signal);
        if (applied) {
          learningApplied = true;
        }
      }

      // Update pattern confidence scores
      await this.updatePatternConfidence(feedback);

      return learningApplied;

    } catch (error) {
      console.error('Error processing feedback for learning:', error);
      throw new LearningEngineError(
        'Failed to process feedback for learning',
        'FEEDBACK_PROCESSING_ERROR',
        { feedbackId: feedback.id, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Process accumulated feedback to learn patterns and improve accuracy
   */
  async processAccumulatedFeedback(options: LearningOptions): Promise<LearningResults> {
    const startTime = Date.now();

    try {
      // Get feedback data for learning
      const feedbackData = await this.getFeedbackForLearning(options);

      if (feedbackData.length < options.minFeedbackCount) {
        throw new LearningEngineError(
          `Insufficient feedback data for learning. Need at least ${options.minFeedbackCount}, got ${feedbackData.length}`,
          'INSUFFICIENT_DATA',
          { required: options.minFeedbackCount, available: feedbackData.length }
        );
      }

      // Analyze patterns in successful predictions
      const patterns = await this.analyzeSuccessPatterns(feedbackData, options);

      // Generate learning insights
      const insights = await this.generateLearningInsights(feedbackData, patterns);

      // Calculate accuracy improvement
      const accuracyImprovement = await this.calculateAccuracyImprovement(feedbackData);

      // Store learned patterns
      await this.storeLearnedPatterns(patterns);

      const processingTime = Date.now() - startTime;

      return {
        patternsLearned: patterns.length,
        insightsGenerated: insights.length,
        accuracyImprovement,
        processingTime,
        patterns,
        insights
      };

    } catch (error) {
      console.error('Error processing accumulated feedback:', error);
      throw new LearningEngineError(
        'Failed to process accumulated feedback',
        'ACCUMULATED_LEARNING_ERROR',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Generate insights from current learning state
   */
  async generateInsights(): Promise<LearningInsight[]> {
    try {
      const insights: LearningInsight[] = [];

      // Get recent feedback statistics
      const stats = await this.feedbackRepository.getFeedbackStats();

      // Analyze satisfaction trends
      if (stats.avgSatisfaction < 3.5) {
        insights.push({
          type: 'warning',
          title: 'Low User Satisfaction',
          description: `Average satisfaction rating is ${stats.avgSatisfaction.toFixed(1)}/5.0, indicating room for improvement in context accuracy.`,
          impact: 'high',
          actionable: true,
          recommendations: [
            'Review low-rated feedback for common issues',
            'Improve intent classification accuracy',
            'Enhance context extraction algorithms',
            'Consider additional training data'
          ],
          metrics: {
            averageSatisfaction: stats.avgSatisfaction,
            totalFeedback: stats.total
          }
        });
      }

      // Analyze feedback distribution
      const lowRatingCount = (stats.satisfactionDistribution[1] || 0) + (stats.satisfactionDistribution[2] || 0);
      const lowRatingPercentage = stats.total > 0 ? (lowRatingCount / stats.total) * 100 : 0;

      if (lowRatingPercentage > 20) {
        insights.push({
          type: 'improvement',
          title: 'High Low-Rating Percentage',
          description: `${lowRatingPercentage.toFixed(1)}% of feedback has ratings of 1-2, suggesting systematic issues.`,
          impact: 'medium',
          actionable: true,
          recommendations: [
            'Analyze common patterns in low-rated predictions',
            'Improve error handling and edge case detection',
            'Enhance user guidance for ambiguous requests'
          ],
          metrics: {
            lowRatingPercentage,
            lowRatingCount
          }
        });
      }

      // Analyze comment feedback
      if (stats.withComments > 0) {
        const commentPercentage = (stats.withComments / stats.total) * 100;
        insights.push({
          type: 'pattern',
          title: 'User Engagement with Comments',
          description: `${commentPercentage.toFixed(1)}% of users provide detailed feedback comments, indicating high engagement.`,
          impact: 'low',
          actionable: true,
          recommendations: [
            'Analyze comment content for improvement suggestions',
            'Use comments to identify missing features',
            'Consider implementing suggested improvements'
          ],
          metrics: {
            commentPercentage,
            commentsCount: stats.withComments
          }
        });
      }

      // Add AI-generated insights if available
      if (this.openAIService) {
        const aiInsights = await this.generateAIInsights(stats);
        insights.push(...aiInsights);
      }

      return insights;

    } catch (error) {
      console.error('Error generating insights:', error);
      throw new LearningEngineError(
        'Failed to generate learning insights',
        'INSIGHT_GENERATION_ERROR',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Extract learning signals from feedback
   */
  private extractLearningSignals(feedback: Feedback): Array<{
    type: 'correction' | 'satisfaction' | 'pattern';
    data: any;
    confidence: number;
  }> {
    const signals: Array<{ type: 'correction' | 'satisfaction' | 'pattern'; data: any; confidence: number }> = [];

    // Extract correction signals
    if (feedback.actual_context && Object.keys(feedback.actual_context).length > 0) {
      signals.push({
        type: 'correction',
        data: {
          predicted: feedback.predicted_context,
          actual: feedback.actual_context,
          corrections: feedback.metadata?.['corrections'] || []
        },
        confidence: feedback.user_satisfaction ? feedback.user_satisfaction / 5 : 0.5
      });
    }

    // Extract satisfaction signals
    if (feedback.user_satisfaction !== undefined) {
      signals.push({
        type: 'satisfaction',
        data: {
          rating: feedback.user_satisfaction,
          context: feedback.predicted_context,
          comments: feedback.comments
        },
        confidence: Math.abs(feedback.user_satisfaction - 3) / 2 // Higher confidence for extreme ratings
      });
    }

    // Extract pattern signals from comments
    if (feedback.comments && feedback.comments.length > 10) {
      signals.push({
        type: 'pattern',
        data: {
          comment: feedback.comments,
          context: feedback.predicted_context,
          satisfaction: feedback.user_satisfaction
        },
        confidence: 0.3 // Lower confidence for text analysis
      });
    }

    return signals;
  }

  /**
   * Apply individual learning signal
   */
  private async applyLearningSignal(signal: { type: string; data: any; confidence: number }): Promise<boolean> {
    try {
      switch (signal.type) {
        case 'correction':
          return await this.applyCorrectionLearning(signal.data, signal.confidence);
        case 'satisfaction':
          return await this.applySatisfactionLearning(signal.data, signal.confidence);
        case 'pattern':
          return await this.applyPatternLearning(signal.data, signal.confidence);
        default:
          return false;
      }
    } catch (error) {
      console.error(`Error applying learning signal of type ${signal.type}:`, error);
      return false;
    }
  }

  /**
   * Apply correction-based learning
   */
  private async applyCorrectionLearning(data: any, confidence: number): Promise<boolean> {
    // For now, just log the correction for future pattern analysis
    console.log('Correction learning applied:', {
      corrections: data.corrections,
      confidence
    });

    // In a full implementation, this would update ML models or rule weights
    return confidence > 0.5;
  }

  /**
   * Apply satisfaction-based learning
   */
  private async applySatisfactionLearning(data: any, confidence: number): Promise<boolean> {
    // Update pattern confidence based on satisfaction
    const contextHash = this.hashContext(data.context);
    const existingPattern = this.patterns.get(contextHash);

    if (existingPattern) {
      // Update success rate based on satisfaction
      const isSuccess = data.rating >= 4;
      const newSuccessRate = this.updateSuccessRate(
        existingPattern.successRate,
        existingPattern.sampleSize,
        isSuccess
      );

      existingPattern.successRate = newSuccessRate;
      existingPattern.sampleSize += 1;
      existingPattern.confidence = Math.min(existingPattern.confidence + (confidence * 0.1), 1.0);
      existingPattern.updatedAt = new Date();

      this.patterns.set(contextHash, existingPattern);
      return true;
    }

    return false;
  }

  /**
   * Apply pattern-based learning from comments
   */
  private async applyPatternLearning(data: any, confidence: number): Promise<boolean> {
    // Analyze comment for patterns (simplified implementation)
    const comment = data.comment.toLowerCase();
    
    // Look for common improvement patterns
    const improvementKeywords = ['wrong', 'incorrect', 'missing', 'should', 'need', 'better'];
    const hasImprovement = improvementKeywords.some(keyword => comment.includes(keyword));

    if (hasImprovement && confidence > 0.2) {
      console.log('Pattern learning applied from comment:', {
        comment: data.comment,
        satisfaction: data.satisfaction,
        confidence
      });
      return true;
    }

    return false;
  }

  /**
   * Update pattern confidence based on feedback
   */
  private async updatePatternConfidence(feedback: Feedback): Promise<void> {
    const contextHash = this.hashContext(feedback.predicted_context);
    const existingPattern = this.patterns.get(contextHash);

    if (existingPattern && feedback.user_satisfaction !== undefined) {
      const isSuccess = feedback.user_satisfaction >= 4;
      existingPattern.successRate = this.updateSuccessRate(
        existingPattern.successRate,
        existingPattern.sampleSize,
        isSuccess
      );
      existingPattern.sampleSize += 1;
      existingPattern.updatedAt = new Date();

      this.patterns.set(contextHash, existingPattern);
    }
  }

  /**
   * Get feedback data suitable for learning
   */
  private async getFeedbackForLearning(_options: LearningOptions): Promise<Feedback[]> {
    return await this.feedbackRepository.findFeedbackForLearning();
  }

  /**
   * Analyze patterns in successful predictions
   */
  private async analyzeSuccessPatterns(
    feedbackData: Feedback[],
    options: LearningOptions
  ): Promise<LearningPattern[]> {
    const patterns: LearningPattern[] = [];
    const patternMap = new Map<string, { successes: number; total: number; examples: Feedback[] }>();

    // Group feedback by context patterns
    for (const feedback of feedbackData) {
      if (feedback.user_satisfaction && feedback.user_satisfaction >= options.minSatisfactionRating) {
        const patternKey = this.extractPatternKey(feedback);
        
        if (!patternMap.has(patternKey)) {
          patternMap.set(patternKey, { successes: 0, total: 0, examples: [] });
        }

        const pattern = patternMap.get(patternKey)!;
        pattern.total += 1;
        pattern.examples.push(feedback);

        if (feedback.user_satisfaction >= 4) {
          pattern.successes += 1;
        }
      }
    }

    // Convert to learning patterns
    for (const [patternKey, data] of patternMap.entries()) {
      if (data.total >= 3) { // Minimum sample size
        const successRate = data.successes / data.total;
        const confidence = Math.min(data.total / 10, 1.0); // Confidence based on sample size

        patterns.push({
          id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          pattern: patternKey,
          intent: this.extractIntentFromPattern(patternKey),
          contextType: this.extractContextTypeFromPattern(patternKey),
          successRate,
          sampleSize: data.total,
          confidence,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }

    return patterns.slice(0, options.maxPatterns || 50);
  }

  /**
   * Generate learning insights from feedback and patterns
   */
  private async generateLearningInsights(
    _feedbackData: Feedback[],
    patterns: LearningPattern[]
  ): Promise<LearningInsight[]> {
    const insights: LearningInsight[] = [];

    // Analyze high-success patterns
    const highSuccessPatterns = patterns.filter(p => p.successRate > 0.8 && p.sampleSize >= 5);
    if (highSuccessPatterns.length > 0) {
      insights.push({
        type: 'success',
        title: 'High-Success Patterns Identified',
        description: `Found ${highSuccessPatterns.length} patterns with >80% success rate that can be leveraged for similar requests.`,
        impact: 'medium',
        actionable: true,
        recommendations: [
          'Apply successful patterns to similar contexts',
          'Prioritize these patterns in context matching',
          'Use as templates for new context generation'
        ],
        metrics: {
          highSuccessPatterns: highSuccessPatterns.length,
          averageSuccessRate: highSuccessPatterns.reduce((sum, p) => sum + p.successRate, 0) / highSuccessPatterns.length
        }
      });
    }

    // Analyze low-success patterns
    const lowSuccessPatterns = patterns.filter(p => p.successRate < 0.5 && p.sampleSize >= 3);
    if (lowSuccessPatterns.length > 0) {
      insights.push({
        type: 'improvement',
        title: 'Low-Success Patterns Need Attention',
        description: `Identified ${lowSuccessPatterns.length} patterns with <50% success rate that require improvement.`,
        impact: 'high',
        actionable: true,
        recommendations: [
          'Review and improve low-success patterns',
          'Consider alternative approaches for these contexts',
          'Gather more training data for problematic patterns'
        ],
        metrics: {
          lowSuccessPatterns: lowSuccessPatterns.length,
          averageSuccessRate: lowSuccessPatterns.reduce((sum, p) => sum + p.successRate, 0) / lowSuccessPatterns.length
        }
      });
    }

    return insights;
  }

  /**
   * Calculate accuracy improvement from learning
   */
  private async calculateAccuracyImprovement(feedbackData: Feedback[]): Promise<number> {
    if (feedbackData.length < 10) {
      return 0;
    }

    // Sort by creation date
    const sortedFeedback = feedbackData.sort((a, b) => 
      new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
    );

    // Calculate accuracy for first half vs second half
    const midpoint = Math.floor(sortedFeedback.length / 2);
    const firstHalf = sortedFeedback.slice(0, midpoint);
    const secondHalf = sortedFeedback.slice(midpoint);

    const firstHalfAccuracy = this.calculateAccuracy(firstHalf);
    const secondHalfAccuracy = this.calculateAccuracy(secondHalf);

    return secondHalfAccuracy - firstHalfAccuracy;
  }

  /**
   * Calculate accuracy from feedback data
   */
  private calculateAccuracy(feedbackData: Feedback[]): number {
    if (feedbackData.length === 0) return 0;

    const totalSatisfaction = feedbackData.reduce((sum, feedback) => 
      sum + (feedback.user_satisfaction || 0), 0
    );

    return (totalSatisfaction / feedbackData.length) / 5; // Normalize to 0-1
  }

  /**
   * Store learned patterns for future use
   */
  private async storeLearnedPatterns(patterns: LearningPattern[]): Promise<void> {
    for (const pattern of patterns) {
      this.patterns.set(pattern.id, pattern);
    }

    // In a full implementation, this would persist to database
    console.log(`Stored ${patterns.length} learned patterns`);
  }

  /**
   * Generate AI-powered insights
   */
  private async generateAIInsights(stats: any): Promise<LearningInsight[]> {
    if (!this.openAIService) {
      return [];
    }

    try {
      const prompt = `Analyze the following feedback statistics and provide learning insights:

Statistics:
- Total feedback: ${stats.total}
- Average satisfaction: ${stats.avgSatisfaction}/5.0
- Satisfaction distribution: ${JSON.stringify(stats.satisfactionDistribution)}
- Feedback with comments: ${stats.withComments}

Provide 2-3 actionable insights in JSON format with the following structure:
{
  "insights": [
    {
      "type": "improvement|pattern|warning|success",
      "title": "Brief title",
      "description": "Detailed description",
      "impact": "high|medium|low",
      "recommendations": ["actionable recommendation 1", "actionable recommendation 2"]
    }
  ]
}`;

      const response = await this.openAIService.generateCompletion([
        { role: 'system', content: 'You are an AI learning analyst. Provide actionable insights based on feedback data.' },
        { role: 'user', content: prompt }
      ], {
        temperature: 0.3,
        maxTokens: 800
      });

      const parsed = JSON.parse(response);
      return parsed.insights.map((insight: any) => ({
        ...insight,
        actionable: true,
        metrics: stats
      }));

    } catch (error) {
      console.error('Error generating AI insights:', error);
      return [];
    }
  }

  /**
   * Utility methods
   */
  private hashContext(context: any): string {
    return Buffer.from(JSON.stringify(context)).toString('base64').substring(0, 16);
  }

  private extractPatternKey(feedback: Feedback): string {
    // Simplified pattern extraction - in practice, this would be more sophisticated
    const context = feedback.predicted_context;
    const keys = Object.keys(context).sort();
    return keys.join('|');
  }

  private extractIntentFromPattern(pattern: string): IntentType {
    // Simplified intent extraction
    if (pattern.includes('formula')) return IntentType.FORMULA_ASSISTANCE;
    if (pattern.includes('analysis')) return IntentType.DATA_ANALYSIS;
    if (pattern.includes('format')) return IntentType.FORMATTING;
    return IntentType.GENERAL_ASSISTANCE;
  }

  private extractContextTypeFromPattern(pattern: string): string {
    // Simplified context type extraction
    if (pattern.includes('immediate')) return 'immediate';
    if (pattern.includes('related')) return 'related';
    if (pattern.includes('structural')) return 'structural';
    return 'general';
  }

  private updateSuccessRate(currentRate: number, sampleSize: number, isSuccess: boolean): number {
    const currentSuccesses = currentRate * sampleSize;
    const newSuccesses = currentSuccesses + (isSuccess ? 1 : 0);
    return newSuccesses / (sampleSize + 1);
  }
}