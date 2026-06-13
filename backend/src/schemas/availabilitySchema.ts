import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const availabilityWindowSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(timeRegex, 'Must be HH:MM in 24h format'),
    endTime: z.string().regex(timeRegex, 'Must be HH:MM in 24h format'),
  })
  .refine((window) => window.endTime > window.startTime, {
    message: 'endTime must be after startTime',
    path: ['endTime'],
  });

export const saveAvailabilitySchema = z.object({
  timezone: z.string().min(1),
  windows: z
    .array(availabilityWindowSchema)
    .max(7)
    .refine((windows) => {
      const days = windows.map((w) => w.dayOfWeek);
      return new Set(days).size === days.length;
    }, { message: 'Duplicate dayOfWeek values are not allowed' }),
});

export type SaveAvailabilityInput = z.infer<typeof saveAvailabilitySchema>;
