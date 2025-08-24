import { z } from 'zod';

// User action schema
export const UserActionSchema = z.object({
  type: z.string(),
  timestamp: z.date(),
  data: z.record(z.any()).optional(),
  cell_reference: z.string().optional(),
  range: z.string().optional()
});

// Session schema
export const SessionSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().optional(),
  spreadsheet_id: z.string().uuid().optional(),
  actions: z.array(UserActionSchema).default([]),
  metadata: z.record(z.any()).default({}),
  created_at: z.date().optional(),
  updated_at: z.date().optional()
});

export const CreateSessionSchema = SessionSchema.omit({ id: true, created_at: true, updated_at: true }).partial({ metadata: true });
export const UpdateSessionSchema = CreateSessionSchema.partial();

// TypeScript types
export type UserAction = z.infer<typeof UserActionSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type CreateSession = z.infer<typeof CreateSessionSchema>;
export type UpdateSession = z.infer<typeof UpdateSessionSchema>;

// Action types enum
export enum ActionType {
  CELL_SELECT = 'cell_select',
  RANGE_SELECT = 'range_select',
  FORMULA_EDIT = 'formula_edit',
  DATA_ENTRY = 'data_entry',
  REQUEST_SUBMIT = 'request_submit',
  CONTEXT_GENERATE = 'context_generate'
}