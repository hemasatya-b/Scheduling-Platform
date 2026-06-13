import { prisma } from '../../src/lib/prisma';
import { env } from '../../src/config/env';

/** The single seeded host user's id — matches DEFAULT_USER_ID in .env.test. */
export const TEST_USER_ID = env.DEFAULT_USER_ID;
export const TEST_USER_EMAIL = 'test-host@example.com';
export const TEST_USERNAME = 'admin';
export const TEST_TIMEZONE = 'Asia/Kolkata';

/** Wipes all application tables. Call in beforeEach for a clean slate. */
export async function resetDb() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "bookings", "availability_windows", "availability_schedules", "event_types", "users" RESTART IDENTITY CASCADE',
  );
}

/** Creates the seeded host user used by all auth-guarded (admin) routes. */
export async function seedUser() {
  return prisma.user.create({
    data: {
      id: TEST_USER_ID,
      name: 'Test Host',
      email: TEST_USER_EMAIL,
      username: TEST_USERNAME,
      timezone: TEST_TIMEZONE,
    },
  });
}

/**
 * Creates the default availability schedule (Mon–Fri 09:00–17:00,
 * Asia/Kolkata = 03:30–11:30 UTC) for the seeded host user.
 */
export async function seedDefaultAvailability() {
  return prisma.availabilitySchedule.create({
    data: {
      userId: TEST_USER_ID,
      name: 'Default',
      timezone: TEST_TIMEZONE,
      isDefault: true,
      windows: {
        createMany: {
          data: [
            { dayOfWeek: 0, startTime: '09:00', endTime: '17:00' }, // Mon
            { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }, // Tue
            { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' }, // Wed
            { dayOfWeek: 3, startTime: '09:00', endTime: '17:00' }, // Thu
            { dayOfWeek: 4, startTime: '09:00', endTime: '17:00' }, // Fri
          ],
        },
      },
    },
    include: { windows: true },
  });
}

/** Creates an active event type owned by the seeded host user. */
export async function seedEventType(overrides: {
  title?: string;
  slug?: string;
  durationMinutes?: number;
  description?: string;
  isActive?: boolean;
} = {}) {
  return prisma.eventType.create({
    data: {
      userId: TEST_USER_ID,
      title: overrides.title ?? '30 Min Consultation',
      slug: overrides.slug ?? '30-min-consult',
      durationMinutes: overrides.durationMinutes ?? 30,
      description: overrides.description ?? 'In-depth consultation session.',
      isActive: overrides.isActive ?? true,
    },
  });
}

/**
 * Returns the next date (UTC, YYYY-MM-DD) matching the given ISO day of week
 * (0=Mon … 6=Sun) that is on or after today + minDaysFromToday.
 * Mirrors the date->day-of-week mapping used by slotService.
 */
export function dateStringForIsoDay(isoDay: number, minDaysFromToday = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + minDaysFromToday);
  for (let i = 0; i < 14; i++) {
    const jsDay = d.getUTCDay(); // 0=Sun … 6=Sat
    const currentIso = jsDay === 0 ? 6 : jsDay - 1; // 0=Mon … 6=Sun
    if (currentIso === isoDay) {
      return d.toISOString().slice(0, 10);
    }
    d.setUTCDate(d.getUTCDate() + 1);
  }
  throw new Error(`Could not find a date for isoDay=${isoDay}`);
}
