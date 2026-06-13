import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BookingCalendar } from '@/components/booking/BookingCalendar';
import { SlotGrid } from '@/components/booking/SlotGrid';
import { BookingForm } from '@/components/booking/BookingForm';
import { usePublicEvent } from '@/hooks/usePublicEvent';
import { useSlots } from '@/hooks/useSlots';

// Maps a JS Date's getDay() (0=Sun…6=Sat) to the API's ISO day-of-week (0=Mon…6=Sun)
function toIsoDayOfWeek(date: Date) {
  const jsDay = date.getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

// Returns today if it has availability, otherwise the next day within the
// next 7 days that does. Returns undefined if no day of the week is available.
function getNextAvailableDate(availableDays: number[]): Date | undefined {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let offset = 0; offset < 7; offset++) {
    const candidate = new Date(today);
    candidate.setDate(today.getDate() + offset);
    if (availableDays.includes(toIsoDayOfWeek(candidate))) {
      return candidate;
    }
  }
  return undefined;
}

export function BookPage() {
  const { username, slug } = useParams<{ username: string; slug: string }>();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const { data: eventType, isLoading: eventLoading, error } = usePublicEvent(username ?? '', slug ?? '');

  useEffect(() => {
    if (eventType && !selectedDate) {
      setSelectedDate(getNextAvailableDate(eventType.availableDays));
    }
  }, [eventType, selectedDate]);

  const dateParam = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;
  const { data: slotsData, isLoading: slotsLoading } = useSlots(username ?? '', slug ?? '', dateParam);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  const handleSlotTaken = () => {
    setSelectedSlot(null);
    queryClient.invalidateQueries({ queryKey: ['slots', username, slug, dateParam] });
  };

  if (eventLoading) {
    return (
      <div className="mx-auto min-h-screen max-w-5xl p-4 pt-12 sm:p-8 sm:pt-16">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !eventType) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-muted-foreground">Event not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-5xl p-4 pt-12 sm:p-8 sm:pt-16">
      <Card className="w-full">
        <CardContent className="grid grid-cols-1 gap-6 p-6 md:grid-cols-3">
          {/* Left panel: event info */}
          <div className="space-y-3 md:border-r md:border-border md:pr-6">
            <h1 className="text-xl font-semibold">{eventType.title}</h1>
            {eventType.description && <p className="text-sm text-muted-foreground">{eventType.description}</p>}
            <Badge variant="outline">{eventType.durationMinutes} min</Badge>
            <p className="text-xs text-muted-foreground">Timezone: {eventType.hostTimezone}</p>
          </div>

          {/* Middle panel: calendar */}
          <div className="md:border-r md:border-border md:pr-6">
            <BookingCalendar
              selectedDate={selectedDate}
              onSelect={handleDateSelect}
              hostTimezone={eventType.hostTimezone}
              disabledDays={(date) => !eventType.availableDays.includes(toIsoDayOfWeek(date))}
            />
          </div>

          {/* Right panel: slots / form */}
          <div className="space-y-4">
            {!selectedDate ? (
              <p className="text-sm text-muted-foreground">Select a date to see available times.</p>
            ) : !selectedSlot ? (
              <>
                <h2 className="text-sm font-medium">
                  {format(selectedDate, 'EEEE, MMMM d')}
                </h2>
                <SlotGrid
                  slots={slotsData?.slots ?? []}
                  selectedSlot={selectedSlot}
                  hostTimezone={eventType.hostTimezone}
                  onSelect={setSelectedSlot}
                  isLoading={slotsLoading}
                />
              </>
            ) : (
              <>
                <div>
                  <h2 className="text-sm font-medium">{format(selectedDate, 'EEEE, MMMM d')}</h2>
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => setSelectedSlot(null)}
                  >
                    Change time
                  </button>
                </div>
                <BookingForm eventTypeId={eventType.id} startTime={selectedSlot} onSlotTaken={handleSlotTaken} />
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
