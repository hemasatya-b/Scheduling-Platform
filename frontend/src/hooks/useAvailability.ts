import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPut } from '@/lib/api';
import type { AvailabilitySchedule, AvailabilityWindow } from '@/types';

export function useAvailability() {
  return useQuery({
    queryKey: ['availability'],
    queryFn: () => apiGet<AvailabilitySchedule>('/availability'),
  });
}

export interface SaveAvailabilityInput {
  timezone: string;
  windows: AvailabilityWindow[];
}

export function useSaveAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SaveAvailabilityInput) => apiPut<AvailabilitySchedule>('/availability', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
  });
}
