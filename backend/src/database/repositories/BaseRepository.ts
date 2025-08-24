import { Knex } from 'knex';
import db from '../connection';

export abstract class BaseRepository<T, CreateT, UpdateT> {
  protected db: Knex;
  protected tableName: string;

  constructor(tableName: string) {
    this.db = db;
    this.tableName = tableName;
  }

  async findById(id: string): Promise<T | null> {
    const result = await this.db(this.tableName).where({ id }).first();
    return result || null;
  }

  async findAll(limit?: number, offset?: number): Promise<T[]> {
    let query = this.db(this.tableName);
    
    if (limit) {
      query = query.limit(limit);
    }
    
    if (offset) {
      query = query.offset(offset);
    }
    
    return query.select('*');
  }

  async create(data: CreateT): Promise<T> {
    const [result] = await this.db(this.tableName)
      .insert(data)
      .returning('*');
    return result;
  }

  async update(id: string, data: UpdateT): Promise<T | null> {
    const [result] = await this.db(this.tableName)
      .where({ id })
      .update({
        ...data,
        updated_at: new Date()
      })
      .returning('*');
    return result || null;
  }

  async delete(id: string): Promise<boolean> {
    const deletedCount = await this.db(this.tableName)
      .where({ id })
      .del();
    return deletedCount > 0;
  }

  async count(): Promise<number> {
    const result = await this.db(this.tableName).count('* as count').first();
    return parseInt((result?.['count'] as string) || '0', 10);
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.db(this.tableName)
      .where({ id })
      .select('id')
      .first();
    return !!result;
  }
}