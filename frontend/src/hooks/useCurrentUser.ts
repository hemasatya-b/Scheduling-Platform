import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import type { CurrentUser } from '@/types';

export function useCurrentUser() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => apiGet<CurrentUser>('/me'),
    staleTime: Infinity,
  });
}
