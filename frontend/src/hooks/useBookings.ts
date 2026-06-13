import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch } from '@/lib/api';
import type { Booking } from '@/types';

export type BookingsFilter = 'upcoming' | 'past';

export function useBookings(filter: BookingsFilter) {
  return useQuery({
    queryKey: ['bookings', filter],
    queryFn: () => apiGet<Booking[]>('/admin/bookings', { params: { filter } }),
  });
}

export function useBookingsRange(from: Date, to: Date, enabled = true) {
  return useQuery({
    queryKey: ['bookings', 'range', from.toISOString(), to.toISOString()],
    queryFn: () =>
      apiGet<Booking[]>('/admin/bookings', {
        params: { filter: 'range', from: from.toISOString(), to: to.toISOString() },
      }),
    enabled,
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiPatch<Booking>(`/admin/bookings/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}
