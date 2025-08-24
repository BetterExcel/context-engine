import { BaseRepository } from './BaseRepository';
import { Spreadsheet, CreateSpreadsheet, UpdateSpreadsheet } from '../models/Spreadsheet';

export class SpreadsheetRepository extends BaseRepository<Spreadsheet, CreateSpreadsheet, UpdateSpreadsheet> {
  constructor() {
    super('spreadsheets');
  }

  async findByFilename(filename: string): Promise<Spreadsheet | null> {
    const result = await this.db(this.tableName)
      .where({ filename })
      .first();
    return result || null;
  }

  async findByOriginalName(originalName: string): Promise<Spreadsheet[]> {
    return this.db(this.tableName)
      .where({ original_name: originalName })
      .orderBy('created_at', 'desc');
  }

  async findByMimeType(mimeType: string): Promise<Spreadsheet[]> {
    return this.db(this.tableName)
      .where({ mime_type: mimeType })
      .orderBy('created_at', 'desc');
  }

  async findRecentSpreadsheets(limit: number = 10): Promise<Spreadsheet[]> {
    return this.db(this.tableName)
      .orderBy('created_at', 'desc')
      .limit(limit);
  }

  async findLargeSpreadsheets(minSizeBytes: number): Promise<Spreadsheet[]> {
    return this.db(this.tableName)
      .where('file_size', '>=', minSizeBytes)
      .orderBy('file_size', 'desc');
  }

  async updateParsedData(id: string, parsedData: Record<string, any>): Promise<Spreadsheet | null> {
    return this.update(id, { parsed_data: parsedData });
  }

  async getStorageStats(): Promise<{
    total: number;
    totalSize: number;
    avgSize: number;
    byMimeType: Record<string, { count: number; totalSize: number }>;
  }> {
    const totalResult = await this.db(this.tableName).count('* as count').first();
    const total = parseInt((totalResult?.['count'] as string) || '0', 10);

    const sizeResult = await this.db(this.tableName).sum('file_size as total_size').first();
    const totalSize = parseInt((sizeResult?.['total_size'] as string) || '0', 10) || 0;

    const avgSize = total > 0 ? totalSize / total : 0;

    const mimeTypeStats = await this.db(this.tableName)
      .select('mime_type')
      .count('* as count')
      .sum('file_size as total_size')
      .groupBy('mime_type');

    const byMimeType: Record<string, { count: number; totalSize: number }> = {};
    mimeTypeStats.forEach(stat => {
      const mimeType = stat['mime_type'] as string;
      const count = parseInt(stat['count'] as string, 10);
      const totalSize = parseInt(stat['total_size'] as string, 10) || 0;
      byMimeType[mimeType] = { count, totalSize };
    });

    return { total, totalSize, avgSize, byMimeType };
  }

  async cleanupOldSpreadsheets(olderThanDays: number = 90): Promise<number> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    
    return this.db(this.tableName)
      .where('created_at', '<', cutoffDate)
      .del();
  }
}