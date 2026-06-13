import { prisma } from '../lib/prisma';
import { addMinutes } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';
import { AppError } from '../types';

/**
 * Generates the list of available booking slots (as UTC ISO strings) for an
 * event type on a given calendar date.
 *
 * Algorithm:
 *  1. Resolve the event type by host username + slug (must be active) and its host's timezone.
 *  2. Map the requested date to an ISO day of week (0=Mon … 6=Sun).
 *  3. Look up the host's default availability window for that day; if none, return [].
 *  4. Generate candidate slot start times every `durationMinutes`, each fully
 *     contained within the availability window, expressed in the host timezone
 *     then converted to UTC.
 *  5. Subtract any CONFIRMED/PENDING bookings already occupying those start times.
 */
export async function getAvailableSlots(username: string, slug: string, dateStr: string): Promise<string[]> {
  // 1. Resolve event type + host timezone
  const eventType = await prisma.eventType.findFirst({
    where: { slug, isActive: true, user: { username } },
    include: { user: { select: { id: true, timezone: true } } },
  });

  if (!eventType) {
    throw new AppError('Resource not found', 404);
  }

  const hostTz = eventType.user.timezone; // e.g. 'Asia/Kolkata'
  const duration = eventType.durationMinutes;

  // 2. Map the requested date to its ISO day of week (0=Mon … 6=Sun)
  const [year, month, day] = dateStr.split('-').map(Number);
  const jsDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay(); // 0=Sun … 6=Sat
  const isoDay = jsDay === 0 ? 6 : jsDay - 1;

  // 3. Fetch the host's default availability window for that day
  const schedule = await prisma.availabilitySchedule.findFirst({
    where: { userId: eventType.user.id, isDefault: true },
    include: { windows: { where: { dayOfWeek: isoDay } } },
  });

  if (!schedule || schedule.windows.length === 0) {
    return []; // day off
  }

  const window = schedule.windows[0];

  // 4. Generate candidate slot start times in host tz, converted to UTC
  const slotStart = fromZonedTime(`${dateStr}T${window.startTime}:00`, hostTz);
  const slotEnd = fromZonedTime(`${dateStr}T${window.endTime}:00`, hostTz);

  const candidates: Date[] = [];
  let cursor = slotStart;
  while (true) {
    const candidateEnd = addMinutes(cursor, duration);
    if (candidateEnd > slotEnd) break; // doesn't fit entirely within the window
    candidates.push(new Date(cursor));
    cursor = candidateEnd;
  }

  // 5. Fetch already-booked slots for this event type within the window
  const bookedSlots = await prisma.booking.findMany({
    where: {
      eventTypeId: eventType.id,
      status: { in: ['CONFIRMED', 'PENDING'] },
      startTime: { gte: slotStart, lt: slotEnd },
    },
    select: { startTime: true },
  });

  const bookedTimes = new Set(bookedSlots.map((b) => b.startTime.toISOString()));

  // 6. Filter and return available slots as ISO UTC strings
  return candidates
    .filter((slot) => !bookedTimes.has(slot.toISOString()))
    .map((slot) => slot.toISOString());
}
