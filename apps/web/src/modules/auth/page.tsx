import { Button } from '@/components/ui/button';

export function AuthPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#f5dccf,_#f4efe8_45%,_#efe3d6)] px-4">
      <section className="w-full max-w-md rounded-[2rem] border border-black/10 bg-white p-8 shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Login</p>
        <h1 className="mt-3 text-3xl font-semibold text-ink">Backoffice da oficina</h1>
        <p className="mt-2 text-sm leading-6 text-steel">
          O formulario real de autenticacao sera ligado ao backend no proximo passo.
        </p>
        <div className="mt-8 space-y-4">
          <div className="rounded-2xl border border-black/10 px-4 py-3 text-sm text-steel">
            Email e password ainda nao foram ligados ao endpoint `POST /auth/login`.
          </div>
          <Button type="button">Continuar para o scaffold</Button>
        </div>
      </section>
    </main>
  );
}
