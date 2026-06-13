import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface SlotGridProps {
  slots: string[]; // ISO UTC strings from API
  selectedSlot: string | null;
  hostTimezone: string; // for display conversion
  onSelect: (slot: string) => void;
  isLoading?: boolean;
}

export function SlotGrid({ slots, selectedSlot, hostTimezone, onSelect, isLoading }: SlotGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (slots.length === 0) {
    return <p className="text-sm text-muted-foreground">No available times for this date.</p>;
  }

  return (
    <div className="grid max-h-80 grid-cols-2 gap-2 overflow-y-auto pr-1">
      {slots.map((slot) => {
        const isSelected = slot === selectedSlot;
        return (
          <Button
            key={slot}
            variant={isSelected ? 'default' : 'outline'}
            className={cn(isSelected && 'border-primary')}
            onClick={() => onSelect(slot)}
          >
            {format(toZonedTime(slot, hostTimezone), 'h:mm a')}
          </Button>
        );
      })}
    </div>
  );
}
