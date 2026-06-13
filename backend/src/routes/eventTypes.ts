import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { attachUser } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createEventTypeSchema, updateEventTypeSchema } from '../schemas/eventTypeSchema';
import { AppError, ApiResponse } from '../types';

const router = Router();

router.use(attachUser);

/**
 * GET /api/event-types
 * Lists active event types owned by the current user, newest first.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventTypes = await prisma.eventType.findMany({
      where: { userId: req.userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    const response: ApiResponse<typeof eventTypes> = { success: true, data: eventTypes };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/event-types
 * Creates a new event type for the current user. 409 if the slug is taken.
 */
router.post('/', validate(createEventTypeSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.eventType.findUnique({ where: { slug: req.body.slug } });
    if (existing) {
      throw new AppError('An event type with this slug already exists', 409);
    }

    const eventType = await prisma.eventType.create({
      data: { ...req.body, userId: req.userId! },
    });

    const response: ApiResponse<typeof eventType> = { success: true, data: eventType };
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/event-types/:id
 * Updates an event type owned by the current user. 404 if not found/owned.
 * 409 if changing the slug to one already in use by another event type.
 */
router.put('/:id', validate(updateEventTypeSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventType = await prisma.eventType.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!eventType) {
      throw new AppError('Resource not found', 404);
    }

    if (req.body.slug && req.body.slug !== eventType.slug) {
      const slugTaken = await prisma.eventType.findUnique({ where: { slug: req.body.slug } });
      if (slugTaken) {
        throw new AppError('An event type with this slug already exists', 409);
      }
    }

    const updated = await prisma.eventType.update({
      where: { id: eventType.id },
      data: req.body,
    });

    const response: ApiResponse<typeof updated> = { success: true, data: updated };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/event-types/:id
 * Soft-deletes the event type (isActive=false) and cancels all future
 * CONFIRMED bookings for it, atomically.
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventType = await prisma.eventType.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!eventType) {
      throw new AppError('Resource not found', 404);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.eventType.update({
        where: { id: eventType.id },
        data: { isActive: false },
      });

      await tx.booking.updateMany({
        where: {
          eventTypeId: eventType.id,
          status: 'CONFIRMED',
          startTime: { gt: new Date() },
        },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });

      return result;
    });

    const response: ApiResponse<typeof updated> = { success: true, data: updated };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

export default router;
