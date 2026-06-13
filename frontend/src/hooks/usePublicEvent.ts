import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import type { PublicEventType } from '@/types';

export function usePublicEvent(username: string, slug: string) {
  return useQuery({
    queryKey: ['publicEvent', username, slug],
    queryFn: () => apiGet<PublicEventType>(`/${username}/${slug}`),
    enabled: !!username && !!slug,
  });
}
