import { NavLink, Outlet } from 'react-router-dom';

const navigation = [
  ['Dashboard', '/'],
  ['Clientes', '/customers'],
  ['Trotinetes', '/scooters'],
  ['Ordens de Servico', '/service-orders'],
  ['Intervencoes', '/interventions'],
  ['Inventario', '/inventory'],
  ['Fornecedores', '/suppliers'],
  ['Faturacao', '/billing'],
  ['Relatorios', '/reports'],
  ['Definicoes', '/settings'],
] as const;

export function AppShell() {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-3xl border border-black/10 bg-white/70 p-5 shadow-sm backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-steel">
            Oficinas Gengis Khan
          </p>
          <nav className="mt-6 flex flex-col gap-2">
            {navigation.map(([label, href]) => (
              <NavLink
                key={href}
                to={href}
                end={href === '/'}
                className={({ isActive }) =>
                  [
                    'rounded-2xl px-4 py-3 text-sm font-medium transition',
                    isActive
                      ? 'bg-accent text-white'
                      : 'text-steel hover:bg-black/5 hover:text-ink',
                  ].join(' ')
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="rounded-[2rem] border border-black/10 bg-white px-6 py-6 shadow-sm">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
