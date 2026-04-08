import type { ReactNode } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, type RouterProviderProps } from 'react-router-dom';

import { queryClient } from '../lib/query/query-client';

type AppProvidersProps = {
  router: RouterProviderProps['router'];
  children?: ReactNode;
};

export function AppProviders({ router }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
