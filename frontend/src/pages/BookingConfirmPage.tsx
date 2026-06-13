import { Link, useParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useBooking } from '@/hooks/useBooking';
import { usePublicEvent } from '@/hooks/usePublicEvent';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export function BookingConfirmPage() {
  const { id } = useParams<{ id: string }>();
  const { data: booking, isLoading, error } = useBooking(id ?? '');
  const { data: currentUser } = useCurrentUser();
  const { data: eventType } = usePublicEvent(currentUser?.username ?? '', booking?.eventType.slug ?? '');

  if (isLoading) {
    return (
      <div className="mx-auto mt-16 max-w-lg p-4">
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        <div>
          <p className="text-lg font-medium">Booking not found</p>
          <Link to="/" className="mt-4 inline-block text-sm text-primary hover:underline">
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  const timezone = eventType?.hostTimezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const start = toZonedTime(booking.startTime, timezone);
  const end = toZonedTime(booking.endTime, timezone);

  return (
    <div className="mx-auto mt-16 max-w-lg p-4">
      <Card>
        <CardHeader className="items-center text-center">
          <CheckCircle2 className="mb-2 h-12 w-12 text-green-500" />
          <h1 className="text-2xl font-bold">This meeting is scheduled</h1>
          <p className="text-lg text-muted-foreground">{booking.eventType.title}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Separator />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Date</p>
              <p className="font-medium">{format(start, 'EEEE, MMMM d, yyyy')}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Time</p>
              <p className="font-medium">
                {format(start, 'h:mm a')} – {format(end, 'h:mm a')}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Duration</p>
              <p className="font-medium">{booking.eventType.durationMinutes} minutes</p>
            </div>
            <div>
              <p className="text-muted-foreground">Name</p>
              <p className="font-medium">{booking.bookerName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="font-medium">{booking.bookerEmail}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Time Zone</p>
              <p className="font-medium">{timezone}</p>
            </div>
          </div>
          <Separator />
          <div className="flex gap-2">
            <Button asChild variant="outline" className="flex-1">
              <Link to={`/${currentUser?.username ?? ''}/${booking.eventType.slug}`}>Book Another</Link>
            </Button>
            <Button asChild className="flex-1">
              <Link to="/">Go to Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
