import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api/http-client';
import { loginWithPassword } from '@/lib/auth/session-api';
import { useSessionStore } from '@/store/session-store';

export function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setSession = useSessionStore((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const fromPath = (location.state as { from?: string } | null)?.from;

  const loginMutation = useMutation({
    mutationFn: loginWithPassword,
    onSuccess: (sessionUser) => {
      queryClient.setQueryData(['auth', 'session'], sessionUser);
      setSession(sessionUser);
      navigate(fromPath && fromPath !== '/login' ? fromPath : '/', { replace: true });
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  };

  const loginErrorMessage = loginMutation.error instanceof ApiError
    ? loginMutation.error.message
    : 'Nao foi possivel iniciar sessao.';

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface px-4">
      {/* Background gradient */}
      <div className="absolute inset-0 industrial-gradient opacity-40" />

      {/* Ambient glow */}
      <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-container/20 blur-[120px]" />

      {/* Login card */}
      <section className="glass-card relative z-10 w-full max-w-md rounded-xl p-8 shadow-ambient-lg">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary-container">
            <Icon name="precision_manufacturing" size={28} className="text-primary" />
          </div>
          <h1 className="font-headline text-2xl font-semibold text-on-surface">
            Atelier Gengis Khan
          </h1>
          <p className="mt-1.5 text-xs uppercase tracking-[0.2em] text-on-surface-variant">
            Engenharia Premium de Trotinetes
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Email"
            type="email"
            placeholder="gestor@gengiskhan.pt"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Palavra-passe"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button type="submit" className="w-full py-3" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? 'A entrar...' : 'Entrar no Sistema'}
          </Button>

          {loginMutation.isError && (
            <p className="rounded-lg bg-error-container/30 px-3 py-2 text-sm text-on-surface">
              {loginErrorMessage}
            </p>
          )}
        </form>

        <p className="mt-6 text-center text-xs text-on-surface-variant/60">
          Sistema de gestao interno - acesso restrito
        </p>
        <p className="mt-2 text-center text-[11px] text-on-surface-variant/50">
          Seed local: manager@gengiskhan.pt / changeme123
        </p>
      </section>
    </main>
  );
}
