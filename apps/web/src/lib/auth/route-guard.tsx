import { useEffect, type PropsWithChildren } from 'react';

import { useQuery } from '@tanstack/react-query';

import { Navigate, useLocation } from 'react-router-dom';

import { ApiError } from '@/lib/api/http-client';
import { fetchSession } from '@/lib/auth/session-api';
import { useSessionStore } from '@/store/session-store';

export function RouteGuard({ children }: PropsWithChildren) {
  const location = useLocation();
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const setSession = useSessionStore((state) => state.setSession);
  const clearSession = useSessionStore((state) => state.clearSession);

  const sessionQuery = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: fetchSession,
    staleTime: 5 * 60_000,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 401) {
        return false;
      }

      return failureCount < 1;
    },
  });

  useEffect(() => {
    if (sessionQuery.status === 'success') {
      setSession(sessionQuery.data);
    }
  }, [sessionQuery.status, sessionQuery.data, setSession]);

  useEffect(() => {
    if (sessionQuery.status !== 'error' || sessionQuery.isFetching) {
      return;
    }

    if (sessionQuery.error instanceof ApiError && sessionQuery.error.status === 401) {
      clearSession();
    }
  }, [sessionQuery.status, sessionQuery.isFetching, sessionQuery.error, clearSession]);

  if (sessionQuery.isPending && !isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface">
        <p className="text-sm text-on-surface-variant">A validar sessao...</p>
      </main>
    );
  }

  if (!isAuthenticated && sessionQuery.error && !(sessionQuery.error instanceof ApiError)) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface px-4 text-center">
        <p className="text-sm text-on-surface-variant">
          Nao foi possivel validar a sessao. Verifique se a API esta ativa.
        </p>
        <button
          onClick={() => {
            void sessionQuery.refetch();
          }}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary transition hover:opacity-90"
        >
          Tentar novamente
        </button>
      </main>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
