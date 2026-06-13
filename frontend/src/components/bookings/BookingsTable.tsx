import { format, parseISO } from 'date-fns';
import { Ban, CalendarX, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BookingStatusBadge } from '@/components/bookings/BookingStatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import type { Booking } from '@/types';

export interface BookingsTableProps {
  bookings: Booking[];
  isUpcoming: boolean;
  onCancel?: (id: string) => void;
}

export function BookingsTable({ bookings, isUpcoming, onCancel }: BookingsTableProps) {
  if (bookings.length === 0) {
    return <EmptyState icon={CalendarX} title="No bookings found" description="Bookings will show up here." />;
  }

  return (
    <div className="overflow-hidden rounded-md border border-border divide-y divide-border">
      {bookings.map((booking) => {
        const start = parseISO(booking.startTime);
        const end = parseISO(booking.endTime);
        const canCancel = isUpcoming && !!onCancel && booking.status !== 'CANCELLED';

        return (
          <div
            key={booking.id}
            className="flex flex-col gap-3 p-4 transition-colors hover:bg-accent/50 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
              <div className="w-36 shrink-0">
                <p className="text-sm font-medium text-foreground">{format(start, 'EEE, MMM d')}</p>
                <p className="text-sm text-muted-foreground">
                  {format(start, 'h:mm a')} – {format(end, 'h:mm a')}
                </p>
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{booking.eventType.title}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {booking.bookerName} · {booking.bookerEmail}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
              <BookingStatusBadge status={booking.status} />
              {canCancel && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" title="More options">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">More options</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onCancel?.(booking.id)}>
                      <Ban className="h-4 w-4" />
                      Cancel booking
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
