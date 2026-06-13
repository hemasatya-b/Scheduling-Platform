import { Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { TimePicker } from '@/components/availability/TimePicker';

export interface DayToggleRowProps {
  dayLabel: string; // 'Monday', 'Tuesday' ...
  dayIndex: number; // 0–6
  isEnabled: boolean;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  onToggle: (day: number, enabled: boolean) => void;
  onTimeChange: (day: number, field: 'startTime' | 'endTime', value: string) => void;
  onCopyToAll: (day: number) => void;
}

export function DayToggleRow({
  dayLabel,
  dayIndex,
  isEnabled,
  startTime,
  endTime,
  onToggle,
  onTimeChange,
  onCopyToAll,
}: DayToggleRowProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-border py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <Switch checked={isEnabled} onCheckedChange={(checked) => onToggle(dayIndex, checked)} />
        <span className={cn('w-24 text-sm font-medium', !isEnabled && 'text-muted-foreground')}>{dayLabel}</span>
      </div>
      {isEnabled ? (
        <div className="flex items-center gap-2">
          <TimePicker value={startTime} onChange={(value) => onTimeChange(dayIndex, 'startTime', value)} />
          <span className="text-sm text-muted-foreground">–</span>
          <TimePicker value={endTime} onChange={(value) => onTimeChange(dayIndex, 'endTime', value)} />
          <Button
            variant="ghost"
            size="icon"
            title="Copy times to all days"
            onClick={() => onCopyToAll(dayIndex)}
          >
            <Copy className="h-4 w-4" />
            <span className="sr-only">Copy times to all days</span>
          </Button>
        </div>
      ) : (
        <span className="text-sm text-muted-foreground">Unavailable</span>
      )}
    </div>
  );
}
