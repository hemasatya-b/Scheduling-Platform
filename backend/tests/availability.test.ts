import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb, seedUser, seedDefaultAvailability } from './helpers/db';

const app = createApp();

describe('Availability API', () => {
  beforeEach(async () => {
    await resetDb();
    await seedUser();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /api/availability', () => {
    it('returns 404 when no default schedule exists', async () => {
      const res = await request(app).get('/api/availability');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('returns the default schedule with windows ordered by day of week', async () => {
      await seedDefaultAvailability();

      const res = await request(app).get('/api/availability');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.timezone).toBe('Asia/Kolkata');
      expect(res.body.data.windows.map((w: { dayOfWeek: number }) => w.dayOfWeek)).toEqual([0, 1, 2, 3, 4]);
      expect(res.body.data.windows[0]).toMatchObject({ startTime: '09:00', endTime: '17:00' });
    });
  });

  describe('PUT /api/availability', () => {
    it('creates a default schedule when none exists', async () => {
      const res = await request(app).put('/api/availability').send({
        timezone: 'America/New_York',
        windows: [{ dayOfWeek: 0, startTime: '08:00', endTime: '12:00' }],
      });

      expect(res.status).toBe(200);
      expect(res.body.data.timezone).toBe('America/New_York');
      expect(res.body.data.isDefault).toBe(true);
      expect(res.body.data.windows).toHaveLength(1);
      expect(res.body.data.windows[0]).toMatchObject({ dayOfWeek: 0, startTime: '08:00', endTime: '12:00' });
    });

    it('replaces the timezone and full set of windows for an existing schedule', async () => {
      await seedDefaultAvailability();

      const res = await request(app).put('/api/availability').send({
        timezone: 'UTC',
        windows: [
          { dayOfWeek: 5, startTime: '10:00', endTime: '14:00' },
          { dayOfWeek: 6, startTime: '10:00', endTime: '14:00' },
        ],
      });

      expect(res.status).toBe(200);
      expect(res.body.data.timezone).toBe('UTC');
      expect(res.body.data.windows.map((w: { dayOfWeek: number }) => w.dayOfWeek)).toEqual([5, 6]);

      const windowCount = await prisma.availabilityWindow.count();
      expect(windowCount).toBe(2);
    });

    it('rejects a window where endTime is not after startTime', async () => {
      const res = await request(app).put('/api/availability').send({
        timezone: 'UTC',
        windows: [{ dayOfWeek: 0, startTime: '17:00', endTime: '09:00' }],
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects duplicate dayOfWeek values', async () => {
      const res = await request(app).put('/api/availability').send({
        timezone: 'UTC',
        windows: [
          { dayOfWeek: 0, startTime: '09:00', endTime: '17:00' },
          { dayOfWeek: 0, startTime: '10:00', endTime: '12:00' },
        ],
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects more than 7 windows', async () => {
      const windows = Array.from({ length: 8 }, (_, i) => ({
        dayOfWeek: i % 7,
        startTime: '09:00',
        endTime: '17:00',
      }));

      const res = await request(app).put('/api/availability').send({ timezone: 'UTC', windows });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects malformed time strings', async () => {
      const res = await request(app).put('/api/availability').send({
        timezone: 'UTC',
        windows: [{ dayOfWeek: 0, startTime: '9:00', endTime: '17:00' }],
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
