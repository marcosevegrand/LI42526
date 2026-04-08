import type { PropsWithChildren } from 'react';

type FeaturePageProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  description: string;
}>;

export function FeaturePage({ eyebrow, title, description, children }: FeaturePageProps) {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
          {eyebrow}
        </p>
        <h1 className="text-3xl font-semibold text-ink">{title}</h1>
        <p className="max-w-2xl text-sm leading-6 text-steel">{description}</p>
      </header>
      <div className="rounded-3xl border border-dashed border-black/15 bg-canvas/60 p-6">
        {children}
      </div>
    </section>
  );
}
