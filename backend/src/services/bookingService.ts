import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { AppError } from '../types';

export interface CreateBookingData {
  eventTypeId: string;
  startTimeISO: string; // UTC ISO string
  bookerName: string;
  bookerEmail: string;
  notes?: string;
}

/**
 * Creates a booking for an active event type inside a serializable transaction.
 *
 * Guards against double-booking the host at the same/overlapping time across
 * *any* of their event types: the transaction first checks for an existing
 * CONFIRMED/PENDING booking whose [startTime, endTime) range overlaps the
 * requested slot, and the `bookings(event_type_id, start_time)` unique
 * constraint backstops exact-duplicate races. Either case is rethrown as a
 * 409 AppError.
 */
export async function createBooking(data: CreateBookingData) {
  const eventType = await prisma.eventType.findFirst({
    where: { id: data.eventTypeId, isActive: true },
  });

  if (!eventType) {
    throw new AppError('Resource not found', 404);
  }

  const startTime = new Date(data.startTimeISO);
  const endTime = new Date(startTime.getTime() + eventType.durationMinutes * 60_000);

  try {
    return await prisma.$transaction(
      async (tx) => {
        const overlapping = await tx.booking.findFirst({
          where: {
            userId: eventType.userId,
            status: { in: ['CONFIRMED', 'PENDING'] },
            startTime: { lt: endTime },
            endTime: { gt: startTime },
          },
        });

        if (overlapping) {
          throw new AppError('Slot already taken', 409);
        }

        return tx.booking.create({
          data: {
            eventTypeId: eventType.id,
            userId: eventType.userId,
            bookerName: data.bookerName,
            bookerEmail: data.bookerEmail,
            startTime,
            endTime,
            notes: data.notes,
            status: 'CONFIRMED',
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2002' || err.code === 'P2034')) {
      throw new AppError('Slot already taken', 409);
    }
    throw err;
  }
}
