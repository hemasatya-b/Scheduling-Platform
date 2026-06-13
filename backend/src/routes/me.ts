import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { attachUser } from '../middleware/auth';
import { AppError, ApiResponse } from '../types';

const router = Router();

router.use(attachUser);

/**
 * GET /api/me
 * Returns the current (default) user's profile, including the `username`
 * used to build public booking URLs (/:username/:slug).
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, email: true, username: true, timezone: true },
    });

    if (!user) {
      throw new AppError('Resource not found', 404);
    }

    const response: ApiResponse<typeof user> = { success: true, data: user };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

export default router;
