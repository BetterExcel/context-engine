import { BaseRepository } from './BaseRepository';
import { Context, CreateContext, UpdateContext, ContextType } from '../models/Context';

export class ContextRepository extends BaseRepository<Context, CreateContext, UpdateContext> {
  constructor() {
    super('contexts');
  }

  async findByRequestId(requestId: string): Promise<Context[]> {
    return this.db(this.tableName)
      .where({ request_id: requestId })
      .orderBy('created_at', 'desc');
  }

  async findByContextType(contextType: ContextType, limit?: number): Promise<Context[]> {
    let query = this.db(this.tableName)
      .where({ context_type: contextType })
      .orderBy('created_at', 'desc');
    
    if (limit) {
      query = query.limit(limit);
    }
    
    return query;
  }

  async findByRequestIdAndType(requestId: string, contextType: ContextType): Promise<Context | null> {
    const result = await this.db(this.tableName)
      .where({ 
        request_id: requestId,
        context_type: contextType 
      })
      .first();
    return result || null;
  }

  async findRecentContexts(limit: number = 10): Promise<Context[]> {
    return this.db(this.tableName)
      .orderBy('created_at', 'desc')
      .limit(limit);
  }

  async findHighConfidenceContexts(minConfidence: number = 0.8): Promise<Context[]> {
    return this.db(this.tableName)
      .where('confidence_score', '>=', minConfidence)
      .orderBy('confidence_score', 'desc');
  }

  async deleteByRequestId(requestId: string): Promise<number> {
    return this.db(this.tableName)
      .where({ request_id: requestId })
      .del();
  }

  async getContextStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    avgConfidence: number;
  }> {
    const totalResult = await this.db(this.tableName).count('* as count').first();
    const total = parseInt((totalResult?.['count'] as string) || '0', 10);

    const typeStats = await this.db(this.tableName)
      .select('context_type')
      .count('* as count')
      .groupBy('context_type');

    const byType: Record<string, number> = {};
    typeStats.forEach(stat => {
      const contextType = stat['context_type'] as string;
      const count = parseInt(stat['count'] as string, 10);
      byType[contextType] = count;
    });

    const avgResult = await this.db(this.tableName)
      .avg('confidence_score as avg_confidence')
      .first();
    const avgConfidence = parseFloat((avgResult?.['avg_confidence'] as string) || '0') || 0;

    return { total, byType, avgConfidence };
  }
}