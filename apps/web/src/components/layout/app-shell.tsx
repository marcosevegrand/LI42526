import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { Icon } from '@/components/ui/icon';
import { logoutSession } from '@/lib/auth/session-api';
import { cn } from '@/lib/utils/cn';
import { useSessionStore } from '@/store/session-store';

const navigation = [
  { label: 'Dashboard', href: '/', icon: 'dashboard' },
  { label: 'Ordens de Servico', href: '/service-orders', icon: 'assignment' },
  { label: 'Intervencoes', href: '/interventions', icon: 'timer' },
  { label: 'Clientes', href: '/customers', icon: 'group' },
  { label: 'Trotinetes', href: '/scooters', icon: 'electric_scooter' },
  { label: 'Stock e Pecas', href: '/inventory', icon: 'inventory_2' },
  { label: 'Fornecedores', href: '/suppliers', icon: 'local_shipping' },
  { label: 'Faturacao', href: '/billing', icon: 'receipt_long' },
  { label: 'Relatorios', href: '/reports', icon: 'bar_chart' },
  { label: 'Definicoes', href: '/settings', icon: 'settings' },
] as const;

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const queryClient = useQueryClient();
  const clearSession = useSessionStore((s) => s.clearSession);
  const user = useSessionStore((s) => s.user);
  const navigate = useNavigate();

  const logoutMutation = useMutation({
    mutationFn: logoutSession,
    onSettled: () => {
      queryClient.removeQueries({ queryKey: ['auth', 'session'] });
      clearSession();
      navigate('/login', { replace: true });
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const initials = (user?.fullName ?? 'GK')
    .split(' ')
    .map((chunk) => chunk[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const roleLabel = user?.role === 'mechanic' ? 'Mecanico' : 'Gestor';

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      {/* Mobile header */}
      <header className="flex items-center justify-between px-4 py-3 lg:hidden">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="rounded-lg p-2 hover:bg-surface-high"
        >
          <Icon name={sidebarOpen ? 'close' : 'menu'} size={24} />
        </button>
        <p className="font-headline text-sm font-semibold tracking-wide text-primary">
          Gengis Khan
        </p>
        <div className="w-10" />
      </header>

      <div className="mx-auto grid min-h-screen max-w-[1600px] gap-0 lg:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 w-[260px] bg-surface-dim p-5 transition-transform duration-300 lg:static lg:translate-x-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          {/* Brand */}
          <div className="mb-8 px-2">
            <p className="font-headline text-lg font-semibold text-on-surface">
              Gengis Khan
            </p>
            <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-on-surface-variant">
              Atelier de Engenharia
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-1">
            {navigation.map(({ label, href, icon }) => (
              <NavLink
                key={href}
                to={href}
                end={href === '/'}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary-container/40 text-primary'
                      : 'text-on-surface-variant hover:bg-surface-low hover:text-on-surface',
                  )
                }
              >
                <Icon name={icon} size={20} />
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Bottom section */}
          <div className="mt-auto pt-6">
            <div className="border-t border-outline-variant/15 pt-4">
              <button
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-on-surface-variant transition hover:bg-surface-low hover:text-error"
              >
                <Icon name="logout" size={20} />
                {logoutMutation.isPending ? 'A terminar...' : 'Terminar Sessao'}
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-surface-dim/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="min-h-screen px-6 py-6 lg:px-8 lg:py-8">
          {/* Top bar */}
          <div className="mb-8 hidden items-center justify-end gap-4 lg:flex">
            <button className="relative rounded-lg p-2 text-on-surface-variant transition hover:bg-surface-high hover:text-on-surface">
              <Icon name="notifications" size={22} />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
            </button>
            <div className="h-8 w-px bg-outline-variant/15" />
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-container text-sm font-semibold text-primary">
                {initials}
              </div>
              <div className="text-sm">
                <p className="font-medium text-on-surface">{user?.fullName ?? 'Utilizador'}</p>
                <p className="text-xs text-on-surface-variant">{roleLabel}</p>
              </div>
            </div>
          </div>

          <Outlet />
        </main>
      </div>
    </div>
  );
}
