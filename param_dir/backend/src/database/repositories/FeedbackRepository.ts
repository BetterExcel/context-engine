import { BaseRepository } from './BaseRepository';
import { Feedback, CreateFeedback, UpdateFeedback } from '../models/Feedback';

export class FeedbackRepository extends BaseRepository<Feedback, CreateFeedback, UpdateFeedback> {
  constructor() {
    super('feedback');
  }

  async findByRequestId(requestId: string): Promise<Feedback[]> {
    return this.db(this.tableName)
      .where({ request_id: requestId })
      .orderBy('created_at', 'desc');
  }

  async findBySatisfactionRating(rating: number): Promise<Feedback[]> {
    return this.db(this.tableName)
      .where({ user_satisfaction: rating })
      .orderBy('created_at', 'desc');
  }

  async findHighSatisfactionFeedback(minRating: number = 4): Promise<Feedback[]> {
    return this.db(this.tableName)
      .where('user_satisfaction', '>=', minRating)
      .orderBy('user_satisfaction', 'desc')
      .orderBy('created_at', 'desc');
  }

  async findLowSatisfactionFeedback(maxRating: number = 2): Promise<Feedback[]> {
    return this.db(this.tableName)
      .where('user_satisfaction', '<=', maxRating)
      .orderBy('user_satisfaction', 'asc')
      .orderBy('created_at', 'desc');
  }

  async findFeedbackWithComments(): Promise<Feedback[]> {
    return this.db(this.tableName)
      .whereNotNull('comments')
      .where('comments', '!=', '')
      .orderBy('created_at', 'desc');
  }

  async getFeedbackStats(): Promise<{
    total: number;
    avgSatisfaction: number;
    satisfactionDistribution: Record<number, number>;
    withComments: number;
  }> {
    const totalResult = await this.db(this.tableName).count('* as count').first();
    const total = parseInt((totalResult?.['count'] as string) || '0', 10);

    const avgResult = await this.db(this.tableName)
      .avg('user_satisfaction as avg_satisfaction')
      .first();
    const avgSatisfaction = parseFloat((avgResult?.['avg_satisfaction'] as string) || '0') || 0;

    const satisfactionStats = await this.db(this.tableName)
      .select('user_satisfaction')
      .count('* as count')
      .whereNotNull('user_satisfaction')
      .groupBy('user_satisfaction');

    const satisfactionDistribution: Record<number, number> = {};
    satisfactionStats.forEach(stat => {
      const satisfaction = stat['user_satisfaction'] as number;
      const count = parseInt(stat['count'] as string, 10);
      satisfactionDistribution[satisfaction] = count;
    });

    const commentsResult = await this.db(this.tableName)
      .whereNotNull('comments')
      .where('comments', '!=', '')
      .count('* as count')
      .first();
    const withComments = parseInt((commentsResult?.['count'] as string) || '0', 10);

    return { total, avgSatisfaction, satisfactionDistribution, withComments };
  }

  async getRecentFeedback(limit: number = 10): Promise<Feedback[]> {
    return this.db(this.tableName)
      .orderBy('created_at', 'desc')
      .limit(limit);
  }

  async findFeedbackForLearning(): Promise<Feedback[]> {
    return this.db(this.tableName)
      .whereNotNull('actual_context')
      .where('user_satisfaction', '>=', 3)
      .orderBy('created_at', 'desc');
  }
}