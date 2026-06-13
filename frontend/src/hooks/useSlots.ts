import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';

export function useSlots(username: string, slug: string, date: string | null) {
  return useQuery({
    queryKey: ['slots', username, slug, date],
    queryFn: () => apiGet<{ slots: string[] }>(`/${username}/${slug}/slots`, { params: { date } }),
    enabled: !!username && !!slug && date !== null,
  });
}
