import { z } from 'zod';

// Zod schemas for validation
export const ContextSchema = z.object({
  id: z.string().uuid().optional(),
  request_id: z.string().uuid(),
  context_type: z.string().max(50),
  context_data: z.record(z.any()),
  confidence_score: z.number().min(0).max(1).optional(),
  created_at: z.date().optional()
});

export const CreateContextSchema = ContextSchema.omit({ id: true, created_at: true });
export const UpdateContextSchema = CreateContextSchema.partial();

// TypeScript types
export type Context = z.infer<typeof ContextSchema>;
export type CreateContext = z.infer<typeof CreateContextSchema>;
export type UpdateContext = z.infer<typeof UpdateContextSchema>;

// Context types enum
export enum ContextType {
  IMMEDIATE = 'immediate',
  RELATED = 'related',
  STRUCTURAL = 'structural',
  HISTORICAL = 'historical',
  PATTERNS = 'patterns'
}