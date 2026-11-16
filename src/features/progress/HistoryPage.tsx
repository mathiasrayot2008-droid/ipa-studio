import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Page } from '@/app/Page';
import { useBank } from '@/bank/store';
import type { StoredAttempt } from '@/data/types';
import { tagLabel } from './labels';
import { useIpaIndex } from './useIpaIndex';
import { useProgressData } from './useProgress';

const CONTEXT: Record<StoredAttempt['context'], string> = { tp: 'TP', entrainement: 'Entraînement', dst: 'DST' };
const STATUS: Record<StoredAttempt['status'], { label: string; cls: string }> = { reussi: { label: 'Réussi', cls: 'text-ok' }, partiel: { label: 'Partiel', cls: 'text-warn' }, echoue: { label: 'Échoué', cls: 'text-bad' }, compilation: { label: 'Ne compile pas', cls: 'text-bad' } };
const when = (iso: string) => new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function HistoryPage() {
  const byKey = useBank((b) => b.byKey);
  const { attempts, dsts, loading, error } = useProgressData(300);
  const { index } = useIpaIndex();
  const [ctx, setCtx] = useState<'tous' | StoredAttempt['context']>('tous');
  const [open, setOpen] = useState<string | null>(null);

  const titleOf = (key: string) => byKey.get(key)?.title ?? (key.startsWith('fam.') ? `Exercice généré (${index?.families.find((f) => f.id === key.split('.')[1])?.title ?? key.split('.')[1]})` : key);
  const rows = useMemo(() => attempts.filter((a) => ctx === 'tous' || a.context === ctx), [attempts, ctx]);
  const done = dsts.filter((d) => d.record.status === 'submitted');

  return (
    <Page title="Historique" wide>
      <div className="max-w-4xl space-y-4">
        <Card>
          <h2 className="mb-2 text-lg font-semibold">DST rendus</h2>
          {done.length === 0 ? <p className="text-sm text-muted">Aucun DST rendu pour l’instant. <Link to="/dst" className="text-accent underline">Passer un DST</Link></p> : (
            <ul className="divide-y divide-border" data-testid="hist-dst">
              {done.map((d) => (
                <li key={d.id}><Link to={`/dst/${d.id}`} className="touch flex items-center gap-3 py-2 hover:bg-surface-2">
                  <span className="w-28 shrink-0 text-sm text-muted">{new Date(d.record.startedAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">{d.record.subject.config.scope === 'notion' ? 'Ciblé' : 'Global'} · {d.record.subject.config.durationMin} min · {d.record.subject.config.level}</span>
                  <span className="font-semibold tabular-nums">{d.record.grade ? `${String(d.record.grade.note20).replace('.', ',')} / 20` : '—'}</span>
                </Link></li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="mr-2 text-lg font-semibold">Tentatives</h2>
            {(['tous', 'tp', 'entrainement', 'dst'] as const).map((c) => (
              <button key={c} type="button" aria-pressed={ctx === c} onClick={() => setCtx(c)} className={`touch rounded-lg border px-3 text-sm ${ctx === c ? 'border-accent bg-surface-2 font-semibold' : 'border-border hover:bg-surface-2'}`}>{c === 'tous' ? 'Toutes' : CONTEXT[c]}</button>
            ))}
          </div>
          {error && <p role="alert" className="text-bad">{error}</p>}
          {loading ? <p className="text-sm text-muted">Chargement…</p> : rows.length === 0 ? <p className="text-sm text-muted">Aucune tentative enregistrée. Une tentative est enregistrée à chaque « Vérifier » et à chaque remise de DST.</p> : (
            <ul className="divide-y divide-border" data-testid="hist-attempts">
              {rows.map((a) => {
                const st = STATUS[a.status];
                const id = `${a.createdAt}-${a.exerciseKey}`;
                return (
                  <li key={id}>
                    <button type="button" onClick={() => setOpen(open === id ? null : id)} aria-expanded={open === id} className="touch flex w-full flex-wrap items-center gap-x-3 gap-y-1 py-2 text-left hover:bg-surface-2">
                      <span className="w-28 shrink-0 text-sm text-muted">{when(a.createdAt)}</span>
                      <span className="rounded bg-surface-2 px-2 py-0.5 text-xs">{CONTEXT[a.context]}</span>
                      <span className="min-w-0 flex-1 truncate text-sm">{titleOf(a.exerciseKey)}</span>
                      <span className={`text-sm ${st.cls}`}>{st.label} · {a.testsPassed}/{a.testsTotal}</span>
                    </button>
                    {open === id && (
                      <div className="space-y-2 pb-3 pl-2 text-sm">
                        <p className="text-muted">{a.hintsUsed > 0 ? `Indice ${a.hintsUsed} utilisé. ` : ''}{a.solutionShown ? 'Solution consultée. ' : ''}Durée : {Math.round(a.durationSec / 60)} min · tentative n°{a.attemptsBefore + 1}</p>
                        {a.errorTags.length > 0 && <ul className="list-disc pl-5">{a.errorTags.map((t) => <li key={t}>{tagLabel(t)}</li>)}</ul>}
                        <pre className="overflow-x-auto rounded-lg border border-border bg-surface-2 p-3 font-mono text-xs">{a.code}</pre>
                        {byKey.has(a.exerciseKey) && <Link to={`/tp/${a.exerciseKey}`} className="text-accent underline">Rouvrir l’exercice</Link>}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </Page>
  );
}
