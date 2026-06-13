import { PageHeader } from '@/components/shared/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { AvailabilityForm } from '@/components/availability/AvailabilityForm';
import { useAvailability } from '@/hooks/useAvailability';
import type { AvailabilitySchedule } from '@/types';

const DEFAULT_SCHEDULE: AvailabilitySchedule = {
  id: '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  windows: [],
};

export function AvailabilityPage() {
  const { data: schedule, isLoading } = useAvailability();

  return (
    <div>
      <PageHeader title="Availability" description="Set your weekly working hours and timezone." />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : (
        <AvailabilityForm schedule={schedule ?? DEFAULT_SCHEDULE} />
      )}
    </div>
  );
}
