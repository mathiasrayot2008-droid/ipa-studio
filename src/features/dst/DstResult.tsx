import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Exercise } from '@/types/bank';
import { Card, Page } from '@/app/Page';
import { useAuth } from '@/data/auth';
import type { DstRecord } from '@/data/types';
import { loadFullExercise } from '@/bank/ipaPool';
import { Markdown } from '@/components/Markdown';
import { ExplainDialog } from '@/features/explain/ExplainDialog';
import { fromDstItem, type ExplainInput } from '@/features/explain/prompt';
import { gradeDst, HINT_PENALTIES } from '@/engine/scoring';
import { formatClock, startRecord } from './dstLogic';

const fmt = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');
const STATUS: Record<string, { label: string; cls: string }> = {
  reussi: { label: 'Réussi', cls: 'text-ok' }, partiel: { label: 'Partiel', cls: 'text-warn' }, echoue: { label: 'Échoué', cls: 'text-bad' },
  compilation: { label: 'Ne compile pas', cls: 'text-bad' }, 'non-rendu': { label: 'Non rendu', cls: 'text-muted' }, crash: { label: 'Erreur d’exécution', cls: 'text-bad' }, interdit: { label: 'Construction interdite', cls: 'text-bad' },
};
const TEST_KIND: Record<string, string> = { p: 'public', h: 'caché', e: 'cas limite' };

export default function DstResult({ record }: { id?: string; record: DstRecord }) {
  const nav = useNavigate();
  const repo = useAuth((a) => a.repo);
  const [exs, setExs] = useState<Record<string, Exercise> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [explain, setExplain] = useState<ExplainInput | null>(null);
  const { subject } = record;

  useEffect(() => {
    let off = false;
    void Promise.all(subject.items.map((it) => loadFullExercise(it.exerciseKey, subject.bankVersion)))
      .then((l) => { if (!off) setExs(Object.fromEntries(l.map((e) => [e.key, e]))); })
      .catch((e: Error) => { if (!off) setErr(e.message); });
    return () => { off = true; };
  }, [subject]);

  const grade = useMemo(() => gradeDst(subject, Object.fromEntries(subject.items.map((it) => {
    const r = record.results?.[it.exerciseKey];
    return [it.exerciseKey, r ? { score: r.score, hintsUsed: record.hintsUsed[it.exerciseKey] ?? 0, solutionShown: record.solutionShown[it.exerciseKey] ?? false } : undefined];
  }))), [subject, record]);

  const replay = async () => {
    const copy = { ...subject, id: `${subject.id.replace(/-[a-z0-9]{6,}$/, '')}-${Date.now().toString(36)}` };
    await repo.saveDst(copy.id, startRecord(copy));
    nav(`/dst/${copy.id}`);
  };

  const used = record.submittedAt ? Math.max(0, record.submittedAt - record.startedAt) : 0;
  const note = record.grade?.note20 ?? grade.note20;

  return (
    <Page title="Résultat du DST" wide>
      <div className="max-w-3xl space-y-4">
        <Card>
          <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
            <div><div className="text-sm text-muted">Note</div><div className="text-5xl font-semibold tabular-nums" data-testid="dst-note">{fmt(note)} <span className="text-2xl text-muted">/ 20</span></div></div>
            <ul className="space-y-1 text-sm text-muted">
              <li>{subject.items.length} exercices · {subject.config.durationMin} min · {subject.config.level} · {subject.config.mode === 'examen' ? 'examen strict' : 'assisté'}</li>
              <li>Temps utilisé : <span className="font-mono">{formatClock(used)}</span>{record.submittedAt && record.submittedAt >= record.deadlineAt ? ' (remise automatique à l’échéance)' : ''}</li>
              <li>Graine : <code className="font-mono text-xs">{subject.seed}</code></li>
            </ul>
          </div>
          <p className="mt-3 text-xs text-muted">Chaque exercice est corrigé par des tests fonctionnels (tests publics, cachés et cas limites) : on ne compare jamais ton code à une solution.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to="/dst" className="touch inline-flex items-center rounded-lg bg-accent px-4 font-semibold text-accent-fg">Nouveau DST</Link>
            <button type="button" onClick={() => void replay()} className="touch rounded-lg bg-surface-2 px-4 hover:bg-border" data-testid="dst-replay">Rejouer ce sujet</button>
          </div>
        </Card>

        {err && <p role="alert" className="text-bad">Les énoncés n’ont pas pu être chargés : {err}</p>}
        <ol className="space-y-2" data-testid="dst-items">
          {subject.items.map((it, i) => {
            const r = record.results?.[it.exerciseKey];
            const g = grade.perItem[i]!;
            const ex = exs?.[it.exerciseKey];
            const st = STATUS[r?.status ?? 'non-rendu'] ?? STATUS.echoue!;
            const hints = record.hintsUsed[it.exerciseKey] ?? 0;
            const sol = record.solutionShown[it.exerciseKey] ?? false;
            const known = (r?.errorTags ?? []).filter((t) => t.startsWith('mutant:')).map((t) => ex?.mutants?.find((m) => t.endsWith(`:${m.id}`))).filter((m): m is NonNullable<typeof m> => Boolean(m));
            return (
              <li key={it.exerciseKey}>
                <details className="rounded-xl border border-border bg-surface" data-testid={`res-${i}`}>
                  <summary className="touch flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                    <span className="w-6 font-semibold tabular-nums">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate font-medium">{ex?.title ?? it.exerciseKey}</span>
                    <span className={`text-sm ${st.cls}`}>{st.label}{r && r.status !== 'non-rendu' ? ` · ${r.passed}/${r.total}` : ''}</span>
                    <span className="w-24 text-right font-semibold tabular-nums" data-testid={`earned-${i}`}>{fmt(g.earned)} / {fmt(g.points)}</span>
                  </summary>
                  <div className="space-y-3 border-t border-border p-4 text-sm">
                    {(hints > 0 || sol) && <p className="text-warn">{sol ? 'Solution consultée : cet exercice vaut 0 point.' : `Indice de niveau ${hints} utilisé : −${HINT_PENALTIES[hints - 1]! * 100} % des points de l’exercice.`}</p>}
                    {r?.message && <p className="rounded-lg border border-border bg-surface-2 p-3"><strong>Problème signalé :</strong> {r.message}</p>}
                    {r?.failedTests?.length ? <p className="text-muted">Tests échoués : {r.failedTests.map((t) => `${t} (${TEST_KIND[t[0]!] ?? 'test'})`).join(', ')}.</p> : null}
                    {known.map((m) => <p key={m.id} className="rounded-lg border border-warn p-3" data-testid="known-error"><strong>Erreur courante reconnue :</strong> {m.label}. {m.explanationFr}</p>)}
                    {ex && r && r.status !== 'reussi' && <button type="button" onClick={() => setExplain(fromDstItem(ex, record.answers[it.exerciseKey] ?? '', r))} className="touch rounded-lg border border-accent px-3 py-2 text-accent hover:bg-accent hover:text-accent-fg" data-testid={`explain-${i}`}>Comprendre mon erreur avec Claude</button>}
                    {ex && <div><div className="mb-1 font-semibold">Énoncé</div><Markdown text={ex.statementMd} /></div>}
                    <div><div className="mb-1 font-semibold">Ton code</div><pre className="overflow-x-auto rounded-lg border border-border bg-surface-2 p-3 font-mono text-xs">{record.answers[it.exerciseKey]?.trim() || '(rien d’écrit)'}</pre></div>
                    {ex && <div><div className="mb-1 font-semibold">Solution de référence</div><pre className="overflow-x-auto rounded-lg border border-border bg-surface-2 p-3 font-mono text-xs">{ex.referenceSolution}</pre><p className="mt-1 text-xs text-muted">Une autre solution est correcte si elle réussit tous les tests.</p></div>}
                  </div>
                </details>
              </li>
            );
          })}
        </ol>
      </div>
      {explain && <ExplainDialog input={explain} onClose={() => setExplain(null)} />}
    </Page>
  );
}
