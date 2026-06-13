import { z } from 'zod';

export const createBookingSchema = z.object({
  eventTypeId: z.string().uuid(),
  startTime: z.string().datetime({ message: 'Must be ISO 8601 UTC datetime' }),
  bookerName: z.string().min(1).max(120).trim(),
  bookerEmail: z.string().email().max(254).toLowerCase(),
  notes: z.string().max(250).optional(),
});

export const bookingIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const adminBookingsQuerySchema = z
  .object({
    filter: z.enum(['upcoming', 'past', 'range']).default('upcoming'),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  })
  .refine((data) => data.filter !== 'range' || (!!data.from && !!data.to), {
    message: 'from and to are required when filter=range',
    path: ['from'],
  });

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
