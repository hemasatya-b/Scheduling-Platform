import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb, seedUser, seedEventType, dateStringForIsoDay, TEST_USER_ID } from './helpers/db';

const app = createApp();

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

describe('Bookings API', () => {
  beforeEach(async () => {
    await resetDb();
    await seedUser();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/bookings', () => {
    it('creates a CONFIRMED booking and returns its id', async () => {
      const eventType = await seedEventType({ slug: '30-min-consult', durationMinutes: 30 });
      const startTime = `${dateStringForIsoDay(0, 1)}T03:30:00.000Z`;

      const res = await request(app).post('/api/bookings').send({
        eventTypeId: eventType.id,
        startTime,
        bookerName: 'Jane Doe',
        bookerEmail: 'jane@example.com',
        notes: 'Looking forward to it',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();

      const booking = await prisma.booking.findUnique({ where: { id: res.body.data.id } });
      expect(booking).toMatchObject({
        eventTypeId: eventType.id,
        userId: TEST_USER_ID,
        bookerName: 'Jane Doe',
        bookerEmail: 'jane@example.com',
        status: 'CONFIRMED',
      });
      expect(booking?.endTime.getTime()).toBe(new Date(startTime).getTime() + 30 * 60 * 1000);
    });

    it('returns 409 when the same event type + start time is booked twice', async () => {
      const eventType = await seedEventType({ slug: '30-min-consult', durationMinutes: 30 });
      const startTime = `${dateStringForIsoDay(0, 1)}T03:30:00.000Z`;
      const payload = {
        eventTypeId: eventType.id,
        startTime,
        bookerName: 'Jane Doe',
        bookerEmail: 'jane@example.com',
      };

      const first = await request(app).post('/api/bookings').send(payload);
      expect(first.status).toBe(201);

      const second = await request(app)
        .post('/api/bookings')
        .send({ ...payload, bookerName: 'John Smith', bookerEmail: 'john@example.com' });

      expect(second.status).toBe(409);
      expect(second.body.success).toBe(false);
      expect(second.body.error).toBe('Slot already taken');
    });

    it('returns 409 when a different event type would overlap an existing booking for the host', async () => {
      const consult = await seedEventType({ slug: '30-min-consult', durationMinutes: 30 });
      const strategy = await seedEventType({
        slug: '60-min-strategy',
        title: '60 Min Strategy',
        durationMinutes: 60,
      });
      const day = dateStringForIsoDay(0, 1);

      const first = await request(app).post('/api/bookings').send({
        eventTypeId: consult.id,
        startTime: `${day}T03:30:00.000Z`, // 03:30-04:00
        bookerName: 'Jane Doe',
        bookerEmail: 'jane@example.com',
      });
      expect(first.status).toBe(201);

      // 03:45-04:45 overlaps the existing 03:30-04:00 booking, even though it's
      // a different event type and a different start time.
      const second = await request(app).post('/api/bookings').send({
        eventTypeId: strategy.id,
        startTime: `${day}T03:45:00.000Z`,
        bookerName: 'John Smith',
        bookerEmail: 'john@example.com',
      });

      expect(second.status).toBe(409);
      expect(second.body.success).toBe(false);
      expect(second.body.error).toBe('Slot already taken');
    });

    it('returns 404 for an unknown eventTypeId', async () => {
      const res = await request(app).post('/api/bookings').send({
        eventTypeId: '00000000-0000-0000-0000-000000000000',
        startTime: `${dateStringForIsoDay(0, 1)}T03:30:00.000Z`,
        bookerName: 'Jane Doe',
        bookerEmail: 'jane@example.com',
      });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for invalid input (bad email, bad uuid, bad datetime, empty name)', async () => {
      const eventType = await seedEventType({ slug: '30-min-consult' });

      const res = await request(app).post('/api/bookings').send({
        eventTypeId: 'not-a-uuid',
        startTime: 'not-a-date',
        bookerName: '',
        bookerEmail: 'not-an-email',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Validation failed');

      // eventType is unused beyond proving an active type existed for context
      expect(eventType.isActive).toBe(true);
    });
  });

  describe('GET /api/bookings/:id', () => {
    it('returns full booking details including event type info', async () => {
      const eventType = await seedEventType({ slug: '30-min-consult', title: '30 Min Consultation' });
      const booking = await prisma.booking.create({
        data: {
          eventTypeId: eventType.id,
          userId: TEST_USER_ID,
          bookerName: 'Jane Doe',
          bookerEmail: 'jane@example.com',
          startTime: new Date(Date.now() + DAY),
          endTime: new Date(Date.now() + DAY + 30 * 60 * 1000),
          status: 'CONFIRMED',
        },
      });

      const res = await request(app).get(`/api/bookings/${booking.id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(booking.id);
      expect(res.body.data.eventType).toMatchObject({
        title: '30 Min Consultation',
        slug: '30-min-consult',
        durationMinutes: eventType.durationMinutes,
      });
    });

    it('returns 404 for an unknown booking id', async () => {
      const res = await request(app).get('/api/bookings/00000000-0000-0000-0000-000000000000');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for a malformed booking id', async () => {
      const res = await request(app).get('/api/bookings/not-a-uuid');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/admin/bookings', () => {
    it('filter=upcoming returns CONFIRMED future bookings sorted ascending', async () => {
      const eventType = await seedEventType({ slug: '30-min-consult' });
      const base = Date.now();

      const later = await prisma.booking.create({
        data: {
          eventTypeId: eventType.id,
          userId: TEST_USER_ID,
          bookerName: 'Later',
          bookerEmail: 'later@example.com',
          startTime: new Date(base + 2 * DAY),
          endTime: new Date(base + 2 * DAY + 30 * 60 * 1000),
          status: 'CONFIRMED',
        },
      });
      const sooner = await prisma.booking.create({
        data: {
          eventTypeId: eventType.id,
          userId: TEST_USER_ID,
          bookerName: 'Sooner',
          bookerEmail: 'sooner@example.com',
          startTime: new Date(base + DAY),
          endTime: new Date(base + DAY + 30 * 60 * 1000),
          status: 'CONFIRMED',
        },
      });
      // Past confirmed booking — must not appear in "upcoming"
      await prisma.booking.create({
        data: {
          eventTypeId: eventType.id,
          userId: TEST_USER_ID,
          bookerName: 'Past',
          bookerEmail: 'past@example.com',
          startTime: new Date(base - DAY),
          endTime: new Date(base - DAY + 30 * 60 * 1000),
          status: 'CONFIRMED',
        },
      });

      const res = await request(app).get('/api/admin/bookings?filter=upcoming');

      expect(res.status).toBe(200);
      expect(res.body.data.map((b: { id: string }) => b.id)).toEqual([sooner.id, later.id]);
      expect(res.body.data[0].eventType).toMatchObject({ title: eventType.title });
    });

    it('filter=past returns started/cancelled/completed bookings sorted descending', async () => {
      const eventType = await seedEventType({ slug: '30-min-consult' });
      const base = Date.now();

      const oldest = await prisma.booking.create({
        data: {
          eventTypeId: eventType.id,
          userId: TEST_USER_ID,
          bookerName: 'Oldest',
          bookerEmail: 'oldest@example.com',
          startTime: new Date(base - 3 * DAY),
          endTime: new Date(base - 3 * DAY + 30 * 60 * 1000),
          status: 'COMPLETED',
        },
      });
      const recentCancelled = await prisma.booking.create({
        data: {
          eventTypeId: eventType.id,
          userId: TEST_USER_ID,
          bookerName: 'Recent Cancelled',
          bookerEmail: 'cancelled@example.com',
          startTime: new Date(base + DAY), // future, but cancelled => should still show in past
          endTime: new Date(base + DAY + 30 * 60 * 1000),
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      });
      // Upcoming confirmed booking — must not appear in "past"
      await prisma.booking.create({
        data: {
          eventTypeId: eventType.id,
          userId: TEST_USER_ID,
          bookerName: 'Upcoming',
          bookerEmail: 'upcoming@example.com',
          startTime: new Date(base + 2 * DAY),
          endTime: new Date(base + 2 * DAY + 30 * 60 * 1000),
          status: 'CONFIRMED',
        },
      });

      const res = await request(app).get('/api/admin/bookings?filter=past');

      expect(res.status).toBe(200);
      expect(res.body.data.map((b: { id: string }) => b.id)).toEqual([recentCancelled.id, oldest.id]);
    });

    it('defaults to filter=upcoming when no query param is given', async () => {
      const res = await request(app).get('/api/admin/bookings');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('filter=range returns 400 when from/to are missing', async () => {
      const res = await request(app).get('/api/admin/bookings?filter=range');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('filter=range returns bookings of any status within [from, to) sorted ascending', async () => {
      const eventType = await seedEventType({ slug: '30-min-consult' });
      const base = Date.now();

      const inRangeCancelled = await prisma.booking.create({
        data: {
          eventTypeId: eventType.id,
          userId: TEST_USER_ID,
          bookerName: 'In Range Cancelled',
          bookerEmail: 'cancelled@example.com',
          startTime: new Date(base + DAY),
          endTime: new Date(base + DAY + 30 * 60 * 1000),
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      });
      const inRangeConfirmed = await prisma.booking.create({
        data: {
          eventTypeId: eventType.id,
          userId: TEST_USER_ID,
          bookerName: 'In Range Confirmed',
          bookerEmail: 'confirmed@example.com',
          startTime: new Date(base + 2 * DAY),
          endTime: new Date(base + 2 * DAY + 30 * 60 * 1000),
          status: 'CONFIRMED',
        },
      });
      // Before the range — must not appear
      await prisma.booking.create({
        data: {
          eventTypeId: eventType.id,
          userId: TEST_USER_ID,
          bookerName: 'Before Range',
          bookerEmail: 'before@example.com',
          startTime: new Date(base - DAY),
          endTime: new Date(base - DAY + 30 * 60 * 1000),
          status: 'COMPLETED',
        },
      });
      // After the range — must not appear
      await prisma.booking.create({
        data: {
          eventTypeId: eventType.id,
          userId: TEST_USER_ID,
          bookerName: 'After Range',
          bookerEmail: 'after@example.com',
          startTime: new Date(base + 5 * DAY),
          endTime: new Date(base + 5 * DAY + 30 * 60 * 1000),
          status: 'CONFIRMED',
        },
      });

      const from = new Date(base).toISOString();
      const to = new Date(base + 3 * DAY).toISOString();

      const res = await request(app).get(`/api/admin/bookings?filter=range&from=${from}&to=${to}`);

      expect(res.status).toBe(200);
      expect(res.body.data.map((b: { id: string }) => b.id)).toEqual([inRangeCancelled.id, inRangeConfirmed.id]);
      expect(res.body.data[0].eventType).toMatchObject({ id: eventType.id, title: eventType.title });
    });
  });

  describe('PATCH /api/admin/bookings/:id/cancel', () => {
    it('cancels an upcoming CONFIRMED booking', async () => {
      const eventType = await seedEventType({ slug: '30-min-consult' });
      const booking = await prisma.booking.create({
        data: {
          eventTypeId: eventType.id,
          userId: TEST_USER_ID,
          bookerName: 'Jane Doe',
          bookerEmail: 'jane@example.com',
          startTime: new Date(Date.now() + DAY),
          endTime: new Date(Date.now() + DAY + 30 * 60 * 1000),
          status: 'CONFIRMED',
        },
      });

      const res = await request(app).patch(`/api/admin/bookings/${booking.id}/cancel`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CANCELLED');
      expect(res.body.data.cancelledAt).not.toBeNull();
    });

    it('returns 400 when the booking is already cancelled', async () => {
      const eventType = await seedEventType({ slug: '30-min-consult' });
      const booking = await prisma.booking.create({
        data: {
          eventTypeId: eventType.id,
          userId: TEST_USER_ID,
          bookerName: 'Jane Doe',
          bookerEmail: 'jane@example.com',
          startTime: new Date(Date.now() + DAY),
          endTime: new Date(Date.now() + DAY + 30 * 60 * 1000),
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      });

      const res = await request(app).patch(`/api/admin/bookings/${booking.id}/cancel`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 when the booking start time is in the past', async () => {
      const eventType = await seedEventType({ slug: '30-min-consult' });
      const booking = await prisma.booking.create({
        data: {
          eventTypeId: eventType.id,
          userId: TEST_USER_ID,
          bookerName: 'Jane Doe',
          bookerEmail: 'jane@example.com',
          startTime: new Date(Date.now() - DAY),
          endTime: new Date(Date.now() - DAY + 30 * 60 * 1000),
          status: 'CONFIRMED',
        },
      });

      const res = await request(app).patch(`/api/admin/bookings/${booking.id}/cancel`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 404 for an unknown booking id', async () => {
      const res = await request(app).patch('/api/admin/bookings/00000000-0000-0000-0000-000000000000/cancel');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
