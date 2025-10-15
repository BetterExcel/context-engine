import { z } from 'zod';

// Feedback schema
export const FeedbackSchema = z.object({
  id: z.string().uuid().optional(),
  request_id: z.string().uuid(),
  predicted_context: z.record(z.any()),
  actual_context: z.record(z.any()).optional(),
  user_satisfaction: z.number().int().min(1).max(5).optional(),
  comments: z.string().optional(),
  metadata: z.record(z.any()).default({}),
  created_at: z.date().optional()
});

export const CreateFeedbackSchema = FeedbackSchema.omit({ id: true, created_at: true }).partial({ metadata: true });
export const UpdateFeedbackSchema = CreateFeedbackSchema.partial();

// TypeScript types
export type Feedback = z.infer<typeof FeedbackSchema>;
export type CreateFeedback = z.infer<typeof CreateFeedbackSchema>;
export type UpdateFeedback = z.infer<typeof UpdateFeedbackSchema>;