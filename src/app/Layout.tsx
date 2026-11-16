import { Suspense } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { NAV, MOBILE_PRIMARY } from './nav';

function Icon({ d }: { d: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const linkBase = 'touch flex items-center gap-3 rounded-lg px-3 text-sm transition-colors';

export default function Layout() {
  const { pathname } = useLocation();
  const primary = NAV.filter((n) => MOBILE_PRIMARY.includes(n.to));
  const secondary = NAV.filter((n) => !MOBILE_PRIMARY.includes(n.to));
  const moreActive = secondary.some((n) => pathname.startsWith(n.to));

  return (
    <div className="flex h-full flex-col md:flex-row">
      {/* Barre latérale (≥ md) */}
      <aside className="hidden w-60 shrink-0 flex-col gap-1 border-r border-border bg-surface p-3 md:flex">
        <div className="px-3 pb-3 pt-2 text-lg font-semibold tracking-tight">
          IPA <span className="text-accent">Studio</span>
        </div>
        <nav className="flex flex-col gap-1" aria-label="Navigation principale">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                `${linkBase} ${isActive ? 'bg-surface-2 text-accent' : 'text-muted hover:bg-surface-2 hover:text-fg'}`
              }
            >
              <Icon d={n.icon} />
              {n.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main id="main" className="min-h-0 flex-1 overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
        <div className="fade-in mx-auto h-full w-full max-w-6xl">
          <Suspense fallback={<div className="p-6 text-muted" role="status">Chargement…</div>}><Outlet /></Suspense>
        </div>
      </main>

      {/* Barre d'onglets (< md) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="Navigation principale"
      >
        {primary.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) =>
              `touch flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] ${isActive ? 'text-accent' : 'text-muted'}`
            }
          >
            <Icon d={n.icon} />
            {n.short}
          </NavLink>
        ))}
        <details className="group relative flex flex-1">
          <summary
            className={`touch flex w-full cursor-pointer list-none flex-col items-center justify-center gap-0.5 py-2 text-[11px] ${moreActive ? 'text-accent' : 'text-muted'}`}
          >
            <Icon d="M5 12h.01M12 12h.01M19 12h.01" />
            Plus
          </summary>
          <div className="absolute bottom-full right-2 mb-2 w-56 rounded-xl border border-border bg-surface-2 p-1 shadow-xl">
            {secondary.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => `${linkBase} ${isActive ? 'text-accent' : 'text-fg'}`}>
                <Icon d={n.icon} />
                {n.label}
              </NavLink>
            ))}
          </div>
        </details>
      </nav>
    </div>
  );
}
