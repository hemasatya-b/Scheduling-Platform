import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb, seedUser, seedEventType } from './helpers/db';

const app = createApp();

describe('Event Types API', () => {
  beforeEach(async () => {
    await resetDb();
    await seedUser();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /api/event-types', () => {
    it('returns an empty list when no event types exist', async () => {
      const res = await request(app).get('/api/event-types');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: [] });
    });

    it('returns only active event types, newest first', async () => {
      const first = await seedEventType({ title: 'Older', slug: 'older' });
      // Ensure a distinguishable createdAt ordering
      await new Promise((r) => setTimeout(r, 5));
      const second = await seedEventType({ title: 'Newer', slug: 'newer' });
      await seedEventType({ title: 'Inactive', slug: 'inactive', isActive: false });

      const res = await request(app).get('/api/event-types');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.map((e: { slug: string }) => e.slug)).toEqual([second.slug, first.slug]);
    });
  });

  describe('POST /api/event-types', () => {
    it('creates a new event type', async () => {
      const res = await request(app).post('/api/event-types').send({
        title: '15 Min Intro',
        description: 'Quick intro call',
        durationMinutes: 15,
        slug: '15-min-intro',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        title: '15 Min Intro',
        slug: '15-min-intro',
        durationMinutes: 15,
        isActive: true,
      });

      const inDb = await prisma.eventType.findUnique({ where: { slug: '15-min-intro' } });
      expect(inDb).not.toBeNull();
    });

    it('rejects an invalid slug with 400', async () => {
      const res = await request(app).post('/api/event-types').send({
        title: 'Bad Slug',
        durationMinutes: 30,
        slug: 'Not A Valid Slug!',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Validation failed');
    });

    it('rejects a non-positive duration with 400', async () => {
      const res = await request(app).post('/api/event-types').send({
        title: 'Bad Duration',
        durationMinutes: 0,
        slug: 'bad-duration',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 409 when the slug already exists', async () => {
      await seedEventType({ slug: 'taken-slug' });

      const res = await request(app).post('/api/event-types').send({
        title: 'Duplicate',
        durationMinutes: 30,
        slug: 'taken-slug',
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/event-types/:id', () => {
    it('updates an existing event type', async () => {
      const eventType = await seedEventType({ title: 'Original', slug: 'original' });

      const res = await request(app)
        .put(`/api/event-types/${eventType.id}`)
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Updated Title');
      expect(res.body.data.slug).toBe('original');
    });

    it('returns 404 for a non-existent event type', async () => {
      const res = await request(app)
        .put('/api/event-types/00000000-0000-0000-0000-000000000000')
        .send({ title: 'Whatever' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('returns 409 when updating to a slug already used by another event type', async () => {
      await seedEventType({ title: 'First', slug: 'first-slug' });
      const second = await seedEventType({ title: 'Second', slug: 'second-slug' });

      const res = await request(app)
        .put(`/api/event-types/${second.id}`)
        .send({ slug: 'first-slug' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/event-types/:id', () => {
    it('soft-deletes the event type and cancels its future confirmed bookings', async () => {
      const eventType = await seedEventType({ slug: 'to-delete' });

      const futureBooking = await prisma.booking.create({
        data: {
          eventTypeId: eventType.id,
          userId: eventType.userId,
          bookerName: 'Future Booker',
          bookerEmail: 'future@example.com',
          startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
          status: 'CONFIRMED',
        },
      });

      const pastBooking = await prisma.booking.create({
        data: {
          eventTypeId: eventType.id,
          userId: eventType.userId,
          bookerName: 'Past Booker',
          bookerEmail: 'past@example.com',
          startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() - 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
          status: 'COMPLETED',
        },
      });

      const res = await request(app).delete(`/api/event-types/${eventType.id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);

      const updatedFuture = await prisma.booking.findUnique({ where: { id: futureBooking.id } });
      expect(updatedFuture?.status).toBe('CANCELLED');
      expect(updatedFuture?.cancelledAt).not.toBeNull();

      const updatedPast = await prisma.booking.findUnique({ where: { id: pastBooking.id } });
      expect(updatedPast?.status).toBe('COMPLETED');
    });

    it('returns 404 for a non-existent event type', async () => {
      const res = await request(app).delete('/api/event-types/00000000-0000-0000-0000-000000000000');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
