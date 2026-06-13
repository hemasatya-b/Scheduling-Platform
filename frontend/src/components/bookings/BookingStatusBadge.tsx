import { Badge } from '@/components/ui/badge';
import { STATUS_VARIANTS } from '@/constants';
import type { BookingStatus } from '@/types';

interface BookingStatusBadgeProps {
  status: BookingStatus;
}

export function BookingStatusBadge({ status }: BookingStatusBadgeProps) {
  return <Badge variant={STATUS_VARIANTS[status] ?? 'outline'}>{status}</Badge>;
}
