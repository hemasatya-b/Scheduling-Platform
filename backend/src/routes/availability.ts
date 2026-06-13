import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { attachUser } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { saveAvailabilitySchema } from '../schemas/availabilitySchema';
import { AppError, ApiResponse } from '../types';

const router = Router();

router.use(attachUser);

/**
 * GET /api/availability
 * Returns the current user's default availability schedule with its
 * windows ordered by day of week.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schedule = await prisma.availabilitySchedule.findFirst({
      where: { userId: req.userId, isDefault: true },
      include: { windows: { orderBy: { dayOfWeek: 'asc' } } },
    });

    if (!schedule) {
      throw new AppError('Resource not found', 404);
    }

    const response: ApiResponse<typeof schedule> = { success: true, data: schedule };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/availability
 * Upserts the current user's default availability schedule: replaces the
 * timezone and the full set of weekly windows in a single transaction.
 */
router.put('/', validate(saveAvailabilitySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { timezone, windows } = req.body;

    const schedule = await prisma.$transaction(async (tx) => {
      let schedule = await tx.availabilitySchedule.findFirst({
        where: { userId: req.userId, isDefault: true },
      });

      if (!schedule) {
        schedule = await tx.availabilitySchedule.create({
          data: { userId: req.userId!, name: 'Default', timezone, isDefault: true },
        });
      } else {
        schedule = await tx.availabilitySchedule.update({
          where: { id: schedule.id },
          data: { timezone },
        });
      }

      await tx.availabilityWindow.deleteMany({ where: { scheduleId: schedule.id } });

      if (windows.length > 0) {
        await tx.availabilityWindow.createMany({
          data: windows.map((window: { dayOfWeek: number; startTime: string; endTime: string }) => ({
            scheduleId: schedule!.id,
            dayOfWeek: window.dayOfWeek,
            startTime: window.startTime,
            endTime: window.endTime,
          })),
        });
      }

      return tx.availabilitySchedule.findUniqueOrThrow({
        where: { id: schedule.id },
        include: { windows: { orderBy: { dayOfWeek: 'asc' } } },
      });
    });

    const response: ApiResponse<typeof schedule> = { success: true, data: schedule };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

export default router;
