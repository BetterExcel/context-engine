import { z } from 'zod';

// Spreadsheet schema
export const SpreadsheetSchema = z.object({
  id: z.string().uuid().optional(),
  filename: z.string(),
  original_name: z.string(),
  mime_type: z.string(),
  file_size: z.number().int().positive(),
  file_path: z.string(),
  parsed_data: z.record(z.any()).optional(),
  metadata: z.record(z.any()).default({}),
  created_at: z.date().optional(),
  updated_at: z.date().optional()
});

export const CreateSpreadsheetSchema = SpreadsheetSchema.omit({ id: true, created_at: true, updated_at: true }).partial({ metadata: true });
export const UpdateSpreadsheetSchema = CreateSpreadsheetSchema.partial();

// TypeScript types
export type Spreadsheet = z.infer<typeof SpreadsheetSchema>;
export type CreateSpreadsheet = z.infer<typeof CreateSpreadsheetSchema>;
export type UpdateSpreadsheet = z.infer<typeof UpdateSpreadsheetSchema>;