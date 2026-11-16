import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Page } from '@/app/Page';
import { sessionsOf, useBank } from '@/bank/store';
import { useAuth } from '@/data/auth';
import type { TpProgress } from '@/data/types';
import { FidelityBadge, StatusBadge } from './badges';

type Filter = 'tous' | 'nouveau' | 'en-cours' | 'reussi';
const FILTERS: [Filter, string][] = [['tous', 'Tous'], ['nouveau', 'Nouveaux'], ['en-cours', 'En cours'], ['reussi', 'Réussis']];

export default function TpList() {
  const { status, bank, byKey, version, source, error } = useBank();
  const repo = useAuth((a) => a.repo);
  const authStatus = useAuth((a) => a.status);
  const [progress, setProgress] = useState<TpProgress>({});
  const [filter, setFilter] = useState<Filter>('tous');
  const [q, setQ] = useState('');

  useEffect(() => {
    if (authStatus === 'loading') return;
    let off = false;
    void repo.getProgress().then((p) => { if (!off) setProgress(p); }).catch(() => undefined);
    return () => { off = true; };
  }, [repo, authStatus]);

  const sessions = useMemo(() => sessionsOf(bank), [bank]);
  const needle = q.trim().toLowerCase();
  const visible = (key: string) => {
    const e = byKey.get(key);
    if (!e) return false;
    const st = progress[key]?.status ?? 'nouveau';
    if (filter !== 'tous' && st !== filter) return false;
    return !needle || e.title.toLowerCase().includes(needle) || String(e.provenance.schoodingId ?? '').includes(needle);
  };

  if (status === 'idle' || status === 'loading') return <Page title="TP Schooding"><p className="text-muted">Chargement de la banque…</p></Page>;
  if (status === 'error') return <Page title="TP Schooding"><p role="alert" className="text-bad">Impossible de charger la banque : {error}</p><Link to="/importer" className="mt-3 inline-block text-accent underline">Gérer la banque</Link></Page>;
  if (status === 'empty' || !bank) {
    return (
      <Page title="TP Schooding">
        <div className="rounded-xl border border-border bg-surface p-4" data-testid="bank-empty">
          <p className="font-medium">Aucune banque d’exercices n’est installée sur cet appareil.</p>
          <p className="mt-2 text-sm text-muted">Les énoncés Schooding ne sont pas publics : ils sont importés depuis un fichier privé (ou récupérés automatiquement si ton compte fait partie de la cohorte et que l’administrateur les a publiés).</p>
          <Link to="/importer" className="touch mt-3 inline-flex items-center rounded-lg bg-accent px-4 font-semibold text-accent-fg">Importer une banque</Link>
        </div>
      </Page>
    );
  }

  const done = bank.exercises.filter((e) => progress[e.key]?.status === 'reussi').length;
  return (
    <Page title="TP Schooding" wide>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-muted">
        <span data-testid="tp-summary">{done} / {bank.exercises.length} exercices réussis</span>
        <span>· banque {version} ({source === 'firestore' ? 'cohorte' : 'cet appareil'})</span>
        <Link to="/importer" className="ml-auto text-accent underline">Gérer la banque</Link>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (titre ou n°)" aria-label="Rechercher un exercice" className="touch min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 md:max-w-xs" />
        <div role="group" aria-label="Filtrer par statut" className="flex gap-1">
          {FILTERS.map(([id, label]) => (
            <button key={id} type="button" onClick={() => setFilter(id)} aria-pressed={filter === id} className={`touch rounded-lg px-3 text-sm ${filter === id ? 'bg-accent font-semibold text-accent-fg' : 'bg-surface-2 text-muted hover:text-fg'}`}>{label}</button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {sessions.map((s, i) => {
          const keys = s.exerciseKeys.filter(visible);
          const ok = s.exerciseKeys.filter((k) => progress[k]?.status === 'reussi').length;
          if (!keys.length && (filter !== 'tous' || needle)) return null;
          return (
            <details key={s.number} open={i === 0 || Boolean(needle) || filter !== 'tous'} className="rounded-xl border border-border bg-surface" data-testid={`session-${s.number}`}>
              <summary className="touch flex cursor-pointer items-center gap-3 px-4 py-2 font-semibold">
                <span>Séance {s.number}</span><span className="min-w-0 flex-1 truncate font-normal text-muted">{s.title}</span>
                <span className="text-sm font-normal text-muted">{ok}/{s.exerciseKeys.length}</span>
              </summary>
              <ul className="divide-y divide-border border-t border-border">
                {keys.map((k) => {
                  const e = byKey.get(k)!;
                  return (
                    <li key={k}>
                      <Link to={`/tp/${k}`} className="touch flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 hover:bg-surface-2" data-testid={`tp-${k}`}>
                        <span className="min-w-0 flex-1 basis-48 truncate">{e.title}</span>
                        <span className="text-xs text-muted">{'★'.repeat(e.difficulty)}{'☆'.repeat(Math.max(0, 5 - e.difficulty))}</span>
                        <FidelityBadge fidelity={e.provenance.fidelity} />
                        <StatusBadge entry={progress[k]} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </details>
          );
        })}
      </div>
    </Page>
  );
}
