import type { Matcher } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';

export interface BookingCalendarProps {
  selectedDate: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  disabledDays?: Date[] | ((date: Date) => boolean);
  hostTimezone: string;
}

export function BookingCalendar({ selectedDate, onSelect, disabledDays }: BookingCalendarProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const disabled: Matcher[] = [{ before: today }];
  if (disabledDays) {
    disabled.push(disabledDays as Matcher);
  }

  return (
    <Calendar
      mode="single"
      selected={selectedDate}
      onSelect={onSelect}
      disabled={disabled}
      className="rounded-md border-0"
    />
  );
}
