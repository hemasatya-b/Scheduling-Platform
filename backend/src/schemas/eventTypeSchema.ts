import { z } from 'zod';

export const createEventTypeSchema = z.object({
  title: z.string().min(1).max(120).trim(),
  description: z.string().max(500).optional(),
  durationMinutes: z.number().int().positive().max(480),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Lowercase alphanumeric and hyphens only').max(80),
});

export const updateEventTypeSchema = createEventTypeSchema.partial();

export type CreateEventTypeInput = z.infer<typeof createEventTypeSchema>;
export type UpdateEventTypeInput = z.infer<typeof updateEventTypeSchema>;
