import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { getAvailableSlots } from '../services/slotService';
import { AppError, ApiResponse } from '../types';

const router = Router();

const slotsQuerySchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format'),
  })
  .refine((data) => data.date >= new Date().toISOString().slice(0, 10), {
    message: 'date cannot be in the past',
    path: ['date'],
  });

/**
 * GET /api/:username/:slug
 * Public lookup of an event type's booking page details.
 */
router.get('/:username/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventType = await prisma.eventType.findFirst({
      where: { slug: req.params.slug, isActive: true, user: { username: req.params.username } },
      include: { user: { select: { id: true, timezone: true } } },
    });

    if (!eventType) {
      throw new AppError('Resource not found', 404);
    }

    const schedule = await prisma.availabilitySchedule.findFirst({
      where: { userId: eventType.user.id, isDefault: true },
      include: { windows: { select: { dayOfWeek: true } } },
    });

    const availableDays = schedule ? schedule.windows.map((w) => w.dayOfWeek) : [];

    const response: ApiResponse<unknown> = {
      success: true,
      data: {
        id: eventType.id,
        title: eventType.title,
        description: eventType.description,
        durationMinutes: eventType.durationMinutes,
        slug: eventType.slug,
        hostTimezone: eventType.user.timezone,
        availableDays,
      },
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/:username/:slug/slots?date=YYYY-MM-DD
 * Returns the list of available booking slots (UTC ISO strings) for the date.
 */
router.get(
  '/:username/:slug/slots',
  validate(slotsQuerySchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { date } = req.query as unknown as { date: string };
      const slots = await getAvailableSlots(req.params.username, req.params.slug, date);

      const response: ApiResponse<{ slots: string[] }> = { success: true, data: { slots } };
      res.json(response);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
