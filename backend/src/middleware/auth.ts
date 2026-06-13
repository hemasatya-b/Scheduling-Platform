import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';

/**
 * Single-tenant v1 stand-in for real authentication: attaches the seeded
 * default user's id to every admin request. All admin routers must use this.
 */
export function attachUser(req: Request, _res: Response, next: NextFunction) {
  req.userId = env.DEFAULT_USER_ID;
  next();
}
