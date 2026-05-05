import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Always treat data as stale so components remount with fresh fetches.
      // Combined with explicit invalidateQueries on mutations, this avoids
      // "I have to reload the page to see my change" UX bugs.
      staleTime: 0,
      refetchOnMount: 'always',
      refetchOnWindowFocus: false,
    },
  },
});
