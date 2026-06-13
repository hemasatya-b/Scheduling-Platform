import { useState } from 'react';
import { addDays, differenceInMinutes, format, isSameDay, parseISO, setHours } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { BookingStatusBadge } from '@/components/bookings/BookingStatusBadge';
import { STATUS_BLOCK_STYLES } from '@/constants';
import { cn } from '@/lib/utils';
import type { Booking } from '@/types';

const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 18;
const ROW_HEIGHT = 112; // px per hour (2x default row height)
const MIN_BLOCK_HEIGHT_PX = 28;

export interface WeekCalendarProps {
  weekStart: Date; // Monday 00:00 local
  bookings: Booking[];
  onCancel?: (id: string) => void;
}

interface LayoutItem {
  booking: Booking;
  top: number; // percent
  height: number; // percent
  column: number;
  totalColumns: number;
}

function rangesOverlap(a: { start: Date; end: Date }, b: { start: Date; end: Date }) {
  return a.start < b.end && b.start < a.end;
}

function layoutDayBookings(bookings: Booking[], startHour: number, totalMinutes: number): LayoutItem[] {
  const items = [...bookings]
    .sort((a, b) => +parseISO(a.startTime) - +parseISO(b.startTime))
    .map((booking) => {
      const start = parseISO(booking.startTime);
      const end = parseISO(booking.endTime);
      const startMinutes = (start.getHours() - startHour) * 60 + start.getMinutes();
      const durationMinutes = Math.max(differenceInMinutes(end, start), 15);
      return {
        booking,
        start,
        end,
        top: (startMinutes / totalMinutes) * 100,
        height: (durationMinutes / totalMinutes) * 100,
        column: 0,
        totalColumns: 1,
      };
    });

  items.forEach((item, i) => {
    const usedColumns = new Set(
      items.slice(0, i).filter((other) => rangesOverlap(item, other)).map((other) => other.column),
    );
    let column = 0;
    while (usedColumns.has(column)) column++;
    item.column = column;
  });

  items.forEach((item) => {
    const overlapping = items.filter((other) => rangesOverlap(item, other));
    item.totalColumns = Math.max(...overlapping.map((o) => o.column)) + 1;
  });

  return items.map(({ booking, top, height, column, totalColumns }) => ({ booking, top, height, column, totalColumns }));
}

export function WeekCalendar({ weekStart, bookings, onCancel }: WeekCalendarProps) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const now = new Date();

  let startHour = DEFAULT_START_HOUR;
  let endHour = DEFAULT_END_HOUR;
  bookings.forEach((booking) => {
    const start = parseISO(booking.startTime);
    const end = parseISO(booking.endTime);
    startHour = Math.min(startHour, start.getHours());
    endHour = Math.max(endHour, end.getMinutes() > 0 ? end.getHours() + 1 : end.getHours());
  });
  startHour = Math.max(0, startHour);
  endHour = Math.min(24, endHour);

  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const totalMinutes = (endHour - startHour) * 60;

  const dayBookings = days.map((day) =>
    layoutDayBookings(bookings.filter((b) => isSameDay(parseISO(b.startTime), day)), startHour, totalMinutes),
  );

  const nowOffset = (((now.getHours() - startHour) * 60 + now.getMinutes()) / totalMinutes) * 100;
  const showNowLine = now.getHours() >= startHour && now.getHours() < endHour;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-md border border-border">
      <div className="grid min-h-0 flex-1 grid-cols-[56px_repeat(7,1fr)] overflow-y-auto">
        <div className="sticky top-0 z-20 border-b border-border bg-background" />
        {days.map((day) => {
          const today = isSameDay(day, now);
          return (
            <div
              key={`header-${day.toISOString()}`}
              className={cn(
                'sticky top-0 z-20 flex flex-col items-center gap-0.5 border-b border-l border-border py-2',
                today ? 'bg-accent/40' : 'bg-background',
              )}
            >
              <span className="text-xs text-muted-foreground">{format(day, 'EEE')}</span>
              <span className={cn('text-sm font-medium', today && 'text-primary font-semibold')}>{format(day, 'd')}</span>
            </div>
          );
        })}

        <div className="relative flex flex-col" style={{ height: hours.length * ROW_HEIGHT }}>
          {hours.map((hour) => (
            <div key={hour} className="relative border-t border-border first:border-t-0" style={{ height: ROW_HEIGHT }}>
              <span className="absolute -top-2.5 right-2 text-xs text-muted-foreground">
                {format(setHours(new Date(), hour), 'h a')}
              </span>
            </div>
          ))}
        </div>

        {days.map((day, dayIndex) => {
          const today = isSameDay(day, now);
          return (
            <div
              key={day.toISOString()}
              className={cn('relative flex flex-col border-l border-border', today && 'bg-accent/10')}
              style={{ height: hours.length * ROW_HEIGHT }}
            >
              {hours.map((hour) => (
                <div key={hour} className="border-t border-border first:border-t-0" style={{ height: ROW_HEIGHT }} />
              ))}

              {dayBookings[dayIndex].map(({ booking, top, height, column, totalColumns }) => (
                <BookingBlock
                  key={booking.id}
                  booking={booking}
                  top={top}
                  height={height}
                  column={column}
                  totalColumns={totalColumns}
                  onCancel={onCancel}
                />
              ))}

              {today && showNowLine && (
                <div
                  className="pointer-events-none absolute left-0 right-0 z-10 border-t border-destructive"
                  style={{ top: `${nowOffset}%` }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface BookingBlockProps {
  booking: Booking;
  top: number;
  height: number;
  column: number;
  totalColumns: number;
  onCancel?: (id: string) => void;
}

function BookingBlock({ booking, top, height, column, totalColumns, onCancel }: BookingBlockProps) {
  const [open, setOpen] = useState(false);
  const start = parseISO(booking.startTime);
  const end = parseISO(booking.endTime);
  const width = 100 / totalColumns;
  const canCancel = !!onCancel && booking.status === 'CONFIRMED' && start > new Date();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'absolute overflow-hidden rounded border-l-2 px-1.5 py-0.5 text-left text-xs shadow-sm transition-opacity hover:opacity-90',
            STATUS_BLOCK_STYLES[booking.status],
          )}
          style={{
            top: `${top}%`,
            height: `${height}%`,
            minHeight: MIN_BLOCK_HEIGHT_PX,
            left: `${column * width}%`,
            width: `calc(${width}% - 2px)`,
          }}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <p className="truncate font-medium">{booking.eventType.title}</p>
          <p className="truncate text-muted-foreground">{format(start, 'h:mm a')}</p>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72"
        align="start"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium">{booking.eventType.title}</p>
            <BookingStatusBadge status={booking.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {format(start, 'EEE, MMM d')} · {format(start, 'h:mm a')} – {format(end, 'h:mm a')}
          </p>
          <p className="text-sm">{booking.bookerName}</p>
          <p className="text-sm text-muted-foreground">{booking.bookerEmail}</p>
          {booking.notes && <p className="text-sm text-muted-foreground">{booking.notes}</p>}
          {canCancel && (
            <Button variant="outline" size="sm" className="w-full" onClick={() => onCancel?.(booking.id)}>
              Cancel booking
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
