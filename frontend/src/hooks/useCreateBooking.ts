import { useMutation } from '@tanstack/react-query';
import { apiPost } from '@/lib/api';

export interface CreateBookingInput {
  eventTypeId: string;
  startTime: string;
  bookerName: string;
  bookerEmail: string;
  notes?: string;
}

export function useCreateBooking() {
  return useMutation({
    mutationFn: (data: CreateBookingInput) => apiPost<{ id: string }>('/bookings', data),
  });
}
