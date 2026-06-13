import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import eventTypesRouter from './routes/eventTypes';
import availabilityRouter from './routes/availability';
import meRouter from './routes/me';
import publicRouter from './routes/public';
import { publicRouter as publicBookingsRouter, adminRouter as adminBookingsRouter } from './routes/bookings';

/**
 * Builds and configures the Express application: security headers, CORS,
 * JSON body parsing, health check, route mounts and the global error handler.
 * Does not start a listener — safe to import directly in tests.
 */
export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.FRONTEND_URL }));
  app.use(express.json());

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ success: true, data: { status: 'ok' } });
  });

  // Admin (auth-guarded) routes
  app.use('/api/event-types', eventTypesRouter);
  app.use('/api/availability', availabilityRouter);
  app.use('/api/admin/bookings', adminBookingsRouter);
  app.use('/api/me', meRouter);

  // Public routes
  app.use('/api/bookings', publicBookingsRouter);

  // Public booking pages — registered last: /:username/:slug is a catch-all
  // under /api and must not shadow the more specific routes above.
  app.use('/api', publicRouter);

  app.use(errorHandler);

  return app;
}
