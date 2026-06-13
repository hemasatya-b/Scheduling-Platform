import { Router, Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { attachUser } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createBooking } from '../services/bookingService';
import { createBookingSchema, bookingIdParamSchema, adminBookingsQuerySchema } from '../schemas/bookingSchema';
import { AppError, ApiResponse } from '../types';

const eventTypeSelect = { id: true, title: true, slug: true, durationMinutes: true } as const;

/**
 * Public booking endpoints — no auth required.
 * Mounted at /api/bookings.
 */
export const publicRouter = Router();

/**
 * POST /api/bookings
 * Creates a booking for the given event type and slot.
 */
publicRouter.post('/', validate(createBookingSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const booking = await createBooking({
      eventTypeId: req.body.eventTypeId,
      startTimeISO: req.body.startTime,
      bookerName: req.body.bookerName,
      bookerEmail: req.body.bookerEmail,
      notes: req.body.notes,
    });

    const response: ApiResponse<{ id: string }> = { success: true, data: { id: booking.id } };
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/bookings/:id
 * Returns full booking details (for the confirmation page).
 */
publicRouter.get(
  '/:id',
  validate(bookingIdParamSchema, 'params'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id: req.params.id },
        include: { eventType: { select: eventTypeSelect } },
      });

      if (!booking) {
        throw new AppError('Resource not found', 404);
      }

      const response: ApiResponse<typeof booking> = { success: true, data: booking };
      res.json(response);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Admin booking endpoints — auth-guarded (default user).
 * Mounted at /api/admin/bookings.
 */
export const adminRouter = Router();

adminRouter.use(attachUser);

/**
 * GET /api/admin/bookings?filter=upcoming|past|range
 * upcoming: CONFIRMED bookings starting in the future, ascending by start time.
 * past: bookings that have started, or are CANCELLED/COMPLETED, descending by start time.
 * range: all bookings (any status) with startTime in [from, to), ascending by start time.
 */
adminRouter.get(
  '/',
  validate(adminBookingsQuerySchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { filter, from, to } = req.query as unknown as {
        filter: 'upcoming' | 'past' | 'range';
        from?: string;
        to?: string;
      };
      const now = new Date();

      const where: Prisma.BookingWhereInput =
        filter === 'upcoming'
          ? { userId: req.userId, status: 'CONFIRMED', startTime: { gt: now } }
          : filter === 'range'
            ? { userId: req.userId, startTime: { gte: new Date(from!), lt: new Date(to!) } }
            : {
                userId: req.userId,
                OR: [{ startTime: { lte: now } }, { status: { in: ['CANCELLED', 'COMPLETED'] } }],
              };

      const bookings = await prisma.booking.findMany({
        where,
        include: { eventType: { select: eventTypeSelect } },
        orderBy: { startTime: filter === 'past' ? 'desc' : 'asc' },
      });

      const response: ApiResponse<typeof bookings> = { success: true, data: bookings };
      res.json(response);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * PATCH /api/admin/bookings/:id/cancel
 * Cancels a CONFIRMED, still-upcoming booking.
 */
adminRouter.patch(
  '/:id/cancel',
  validate(bookingIdParamSchema, 'params'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const booking = await prisma.booking.findFirst({
        where: { id: req.params.id, userId: req.userId },
      });

      if (!booking) {
        throw new AppError('Resource not found', 404);
      }

      if (booking.status !== 'CONFIRMED' || booking.startTime <= new Date()) {
        throw new AppError('Only upcoming confirmed bookings can be cancelled', 400);
      }

      const updated = await prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });

      const response: ApiResponse<typeof updated> = { success: true, data: updated };
      res.json(response);
    } catch (err) {
      next(err);
    }
  },
);
