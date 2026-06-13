// prisma/seed.ts
import { PrismaClient, BookingStatus } from '@prisma/client';
import { addDays, subDays, setHours, setMinutes, startOfDay } from 'date-fns';

const prisma = new PrismaClient();
const DEFAULT_USER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

async function main() {
  // ── 1. User ──────────────────────────────────────────────────
  const user = await prisma.user.upsert({
    where: { email: 'host@example.com' },
    update: { username: 'admin' },
    create: {
      id: DEFAULT_USER_ID,
      name: 'Alex Kumar',
      email: 'host@example.com',
      username: 'admin',
      timezone: 'Asia/Kolkata',
    },
  });

  // ── 2. Availability Schedule ─────────────────────────────────
  const schedule = await prisma.availabilitySchedule.upsert({
    where: { id: 'sched-0001-0000-0000-000000000001' },
    update: {},
    create: {
      id: 'sched-0001-0000-0000-000000000001',
      userId: user.id, name: 'Default', timezone: 'Asia/Kolkata', isDefault: true,
      windows: {
        createMany: {
          data: [
            { dayOfWeek: 0, startTime: '09:00', endTime: '17:00' }, // Mon
            { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }, // Tue
            { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' }, // Wed
            { dayOfWeek: 3, startTime: '09:00', endTime: '17:00' }, // Thu
            { dayOfWeek: 4, startTime: '09:00', endTime: '17:00' }, // Fri
          ],
          skipDuplicates: true,
        },
      },
    },
  });

  // ── 3. Event Types ────────────────────────────────────────────
  const [et1, et2, et3] = await Promise.all([
    prisma.eventType.upsert({ where: { slug: '15-min-intro' }, update: {},
      create: { userId: user.id, title: '15 Min Intro Call', durationMinutes: 15, slug: '15-min-intro',
        description: 'Quick introduction and discovery call.' } }),
    prisma.eventType.upsert({ where: { slug: '30-min-consult' }, update: {},
      create: { userId: user.id, title: '30 Min Consultation', durationMinutes: 30, slug: '30-min-consult',
        description: 'In-depth consultation session.' } }),
    prisma.eventType.upsert({ where: { slug: '60-min-deep-dive' }, update: {},
      create: { userId: user.id, title: '60 Min Deep Dive', durationMinutes: 60, slug: '60-min-deep-dive',
        description: 'Full hour of focused work or strategy.' } }),
  ]);

  // ── 4. Bookings ───────────────────────────────────────────────
  const now = new Date();
  const makeTime = (daysOffset: number, h: number, m = 0) => {
    const d = addDays(startOfDay(now), daysOffset);
    return setMinutes(setHours(d, h), m);
  };

  await prisma.booking.createMany({
    skipDuplicates: true,
    data: [
      // Upcoming
      { eventTypeId: et1.id, userId: user.id, bookerName: 'Priya Sharma', bookerEmail: 'priya@acme.com',
        startTime: makeTime(2, 10), endTime: makeTime(2, 10, 15), status: BookingStatus.CONFIRMED },
      { eventTypeId: et2.id, userId: user.id, bookerName: 'Rahul Verma', bookerEmail: 'rahul@corp.com',
        startTime: makeTime(4, 14), endTime: makeTime(4, 14, 30), status: BookingStatus.CONFIRMED },
      // Past
      { eventTypeId: et1.id, userId: user.id, bookerName: 'Anita Rao', bookerEmail: 'anita@startup.io',
        startTime: makeTime(-5, 9), endTime: makeTime(-5, 9, 15), status: BookingStatus.COMPLETED },
      { eventTypeId: et3.id, userId: user.id, bookerName: 'Dev Patel', bookerEmail: 'dev@freelance.in',
        startTime: makeTime(-10, 11), endTime: makeTime(-10, 12), status: BookingStatus.COMPLETED },
      { eventTypeId: et2.id, userId: user.id, bookerName: 'Meena Das', bookerEmail: 'meena@consulting.com',
        startTime: makeTime(-3, 15), endTime: makeTime(-3, 15, 30), status: BookingStatus.CANCELLED,
        cancelledAt: subDays(now, 2) },
    ],
  });

  console.log('Seed complete.', { userId: user.id, scheduleId: schedule.id });
}

main().catch(console.error).finally(() => prisma.$disconnect());
