import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiPost, apiPut, apiGet } from '@/lib/api';
import type { EventType } from '@/types';

export function useEventTypes() {
  return useQuery({
    queryKey: ['eventTypes'],
    queryFn: () => apiGet<EventType[]>('/event-types'),
  });
}

export interface EventTypeInput {
  title: string;
  description?: string;
  durationMinutes: number;
  slug: string;
}

export function useCreateEventType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: EventTypeInput) => apiPost<EventType>('/event-types', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventTypes'] });
    },
  });
}

export function useUpdateEventType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EventTypeInput> }) =>
      apiPut<EventType>(`/event-types/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventTypes'] });
    },
  });
}

export function useDeleteEventType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiDelete<EventType>(`/event-types/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventTypes'] });
    },
  });
}
