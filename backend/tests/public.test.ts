import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb, seedUser, seedDefaultAvailability, seedEventType, dateStringForIsoDay, TEST_USERNAME } from './helpers/db';

const app = createApp();

describe('Public Booking API', () => {
  beforeEach(async () => {
    await resetDb();
    await seedUser();
    await seedDefaultAvailability();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /api/:username/:slug', () => {
    it('returns event type details for an active slug', async () => {
      await seedEventType({ slug: '30-min-consult', title: '30 Min Consultation', durationMinutes: 30 });

      const res = await request(app).get(`/api/${TEST_USERNAME}/30-min-consult`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        title: '30 Min Consultation',
        slug: '30-min-consult',
        durationMinutes: 30,
        hostTimezone: 'Asia/Kolkata',
      });
    });

    it('returns 404 for an unknown slug', async () => {
      const res = await request(app).get(`/api/${TEST_USERNAME}/does-not-exist`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('returns 404 for an inactive event type', async () => {
      await seedEventType({ slug: 'inactive-event', isActive: false });

      const res = await request(app).get(`/api/${TEST_USERNAME}/inactive-event`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/:username/:slug/slots', () => {
    it('returns 16 half-hour slots (03:30–11:30 UTC) for a weekday with availability', async () => {
      await seedEventType({ slug: '30-min-consult', durationMinutes: 30 });
      const monday = dateStringForIsoDay(0); // Mon

      const res = await request(app).get(`/api/${TEST_USERNAME}/30-min-consult/slots?date=${monday}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.slots).toHaveLength(16);
      expect(res.body.data.slots[0]).toBe(`${monday}T03:30:00.000Z`);
      expect(res.body.data.slots[res.body.data.slots.length - 1]).toBe(`${monday}T11:00:00.000Z`);
    });

    it('returns an empty list for a day with no availability window', async () => {
      await seedEventType({ slug: '30-min-consult', durationMinutes: 30 });
      const saturday = dateStringForIsoDay(5); // Sat — not in the seeded Mon-Fri schedule

      const res = await request(app).get(`/api/${TEST_USERNAME}/30-min-consult/slots?date=${saturday}`);

      expect(res.status).toBe(200);
      expect(res.body.data.slots).toEqual([]);
    });

    it('excludes slots that already have a CONFIRMED booking', async () => {
      const eventType = await seedEventType({ slug: '30-min-consult', durationMinutes: 30 });
      const monday = dateStringForIsoDay(0);
      const bookedStart = `${monday}T03:30:00.000Z`;

      await prisma.booking.create({
        data: {
          eventTypeId: eventType.id,
          userId: eventType.userId,
          bookerName: 'Existing Booker',
          bookerEmail: 'existing@example.com',
          startTime: new Date(bookedStart),
          endTime: new Date(new Date(bookedStart).getTime() + 30 * 60 * 1000),
          status: 'CONFIRMED',
        },
      });

      const res = await request(app).get(`/api/${TEST_USERNAME}/30-min-consult/slots?date=${monday}`);

      expect(res.status).toBe(200);
      expect(res.body.data.slots).not.toContain(bookedStart);
      expect(res.body.data.slots).toHaveLength(15);
    });

    it('returns 400 for a malformed date', async () => {
      await seedEventType({ slug: '30-min-consult' });

      const res = await request(app).get(`/api/${TEST_USERNAME}/30-min-consult/slots?date=06-15-2026`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for a date in the past', async () => {
      await seedEventType({ slug: '30-min-consult' });

      const res = await request(app).get(`/api/${TEST_USERNAME}/30-min-consult/slots?date=2020-01-01`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 404 for an unknown slug', async () => {
      const monday = dateStringForIsoDay(0);
      const res = await request(app).get(`/api/${TEST_USERNAME}/does-not-exist/slots?date=${monday}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
