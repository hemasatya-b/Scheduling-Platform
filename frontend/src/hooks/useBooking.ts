import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import type { Booking } from '@/types';

export function useBooking(id: string) {
  return useQuery({
    queryKey: ['booking', id],
    queryFn: () => apiGet<Booking>(`/bookings/${id}`),
    retry: false,
  });
}
