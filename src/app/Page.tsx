import type { ReactNode } from 'react';

export function Page({ title, children, wide }: { title: string; children?: ReactNode; wide?: boolean }) {
  return (
    <div className={`p-4 md:p-8 ${wide ? '' : 'max-w-3xl'}`}>
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">{title}</h1>
      {children}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-border bg-surface p-4 ${className}`}>{children}</section>;
}
