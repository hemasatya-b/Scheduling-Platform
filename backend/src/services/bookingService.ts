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
 * Creates a booking for an active event type inside a transaction.
 * Relies on the `bookings(event_type_id, start_time)` unique constraint to
 * guard against double-booking races; a violation is rethrown as a 409 AppError.
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
    return await prisma.$transaction(async (tx) => {
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
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new AppError('Slot already taken', 409);
    }
    throw err;
  }
}
