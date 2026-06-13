import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DayToggleRow } from '@/components/availability/DayToggleRow';
import { TimezoneCombobox } from '@/components/availability/TimezoneCombobox';
import { DAYS_OF_WEEK } from '@/constants';
import { useSaveAvailability } from '@/hooks/useAvailability';
import type { AvailabilitySchedule } from '@/types';

interface DayState {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

interface AvailabilityFormProps {
  schedule: AvailabilitySchedule;
}

function buildInitialDays(schedule: AvailabilitySchedule): DayState[] {
  return DAYS_OF_WEEK.map(({ value }) => {
    const window = schedule.windows.find((w) => w.dayOfWeek === value);
    return {
      enabled: !!window,
      startTime: window?.startTime ?? '09:00',
      endTime: window?.endTime ?? '17:00',
    };
  });
}

export function AvailabilityForm({ schedule }: AvailabilityFormProps) {
  const [timezone, setTimezone] = useState(schedule.timezone);
  const [days, setDays] = useState<DayState[]>(buildInitialDays(schedule));
  const saveMutation = useSaveAvailability();

  const handleToggle = (day: number, enabled: boolean) => {
    setDays((prev) => prev.map((d, i) => (i === day ? { ...d, enabled } : d)));
  };

  const handleTimeChange = (day: number, field: 'startTime' | 'endTime', value: string) => {
    setDays((prev) => prev.map((d, i) => (i === day ? { ...d, [field]: value } : d)));
  };

  const handleCopyToAll = (day: number) => {
    setDays((prev) => {
      const source = prev[day];
      return prev.map((d) => (d.enabled ? { ...d, startTime: source.startTime, endTime: source.endTime } : d));
    });
    toast.success('Copied to all enabled days');
  };

  const handleSave = () => {
    const invalidDay = days.find((d) => d.enabled && d.endTime <= d.startTime);
    if (invalidDay) {
      toast.error('End time must be after start time for all enabled days');
      return;
    }

    const windows = days
      .map((d, dayOfWeek) => ({ ...d, dayOfWeek }))
      .filter((d) => d.enabled)
      .map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime }));

    saveMutation.mutate(
      { timezone, windows },
      {
        onSuccess: () => toast.success('Availability saved'),
        onError: (error) => toast.error(error.message || 'Failed to save availability'),
      },
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">Working hours</h2>
              <Badge variant="secondary">Default</Badge>
            </div>
            <TimezoneCombobox value={timezone} onChange={setTimezone} />
          </div>

          {DAYS_OF_WEEK.map(({ label, value }) => (
            <DayToggleRow
              key={value}
              dayLabel={label}
              dayIndex={value}
              isEnabled={days[value].enabled}
              startTime={days[value].startTime}
              endTime={days[value].endTime}
              onToggle={handleToggle}
              onTimeChange={handleTimeChange}
              onCopyToAll={handleCopyToAll}
            />
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saveMutation.isPending}>
          Save
        </Button>
      </div>
    </div>
  );
}
