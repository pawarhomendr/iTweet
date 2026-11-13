import type { QueryClient } from '@tanstack/react-query';

/** Refresh every cached view whose follow state or denormalized counts can change. */
export function invalidateFollowQueries(queryClient: QueryClient): Promise<void[]> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['profile'] }),
    queryClient.invalidateQueries({ queryKey: ['user-network'] }),
    queryClient.invalidateQueries({ queryKey: ['search-users'] }),
  ]);
}
