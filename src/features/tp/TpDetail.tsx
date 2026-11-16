import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Exercise } from '@/types/bank';
import { Page } from '@/app/Page';
import { Markdown } from '@/components/Markdown';
import { useBank } from '@/bank/store';
import { ExerciseRunner } from '@/features/exercise/ExerciseRunner';
import { ExplainDialog } from '@/features/explain/ExplainDialog';
import { fromCheck, type ExplainInput } from '@/features/explain/prompt';
import { FidelityBadge } from './badges';

function Notes({ ex }: { ex: Exercise }) {
  const notes = ex.provenance.notes ?? [];
  if (!notes.length && (ex.provenance.fidelity ?? 'exact') === 'exact') return null;
  return (
    <details className="rounded-lg border border-border bg-surface-2 p-3 text-sm" data-testid="notes">
      <summary className="cursor-pointer font-semibold">À propos de cet exercice <FidelityBadge fidelity={ex.provenance.fidelity} /></summary>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">{notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
    </details>
  );
}

function Assist({ ex, hints, setHints, solution, setSolution }: { ex: Exercise; hints: 0 | 1 | 2 | 3; setHints: (n: 0 | 1 | 2 | 3) => void; solution: string | null; setSolution: (s: string) => void }) {
  const loadSolution = useBank((b) => b.solution);
  const [err, setErr] = useState<string | null>(null);
  const shown = ex.hints.slice(0, hints);
  return (
    <div className="space-y-3" data-testid="assist">
      {shown.length > 0 && (
        <ol className="space-y-2 text-sm">{shown.map((h, i) => <li key={i} className="rounded-lg border border-border bg-surface-2 p-3"><div className="mb-1 text-xs font-semibold text-accent">Indice {i + 1}</div><Markdown text={h} /></li>)}</ol>
      )}
      <div className="flex flex-wrap gap-2">
        {hints < Math.min(3, ex.hints.length) && (
          <button type="button" onClick={() => setHints((hints + 1) as 1 | 2 | 3)} className="touch rounded-lg bg-surface-2 px-3 text-sm hover:bg-border" data-testid="hint-btn">Indice {hints + 1}/{Math.min(3, ex.hints.length)}</button>
        )}
        {solution === null && (
          <button type="button" className="touch rounded-lg px-3 text-sm text-muted hover:text-fg" data-testid="solution-btn" onClick={async () => {
            if (!confirm('Afficher la solution ? Elle sera notée dans ton historique (essaie d’abord avec les indices).')) return;
            try { const s = await loadSolution(ex.key); if (s) setSolution(s); else setErr('Pas de solution disponible pour cet exercice.'); } catch { setErr('Solution indisponible (hors ligne ou accès refusé).'); }
          }}>Voir la solution</button>
        )}
      </div>
      {err && <p role="alert" className="text-sm text-bad">{err}</p>}
      {solution !== null && <div><div className="mb-1 text-xs font-semibold text-warn">Solution de référence</div><pre className="overflow-x-auto rounded-lg border border-border bg-surface-2 p-3 font-mono text-sm">{solution}</pre></div>}
    </div>
  );
}

function TpExercise({ ex, prev, next, version }: { ex: Exercise; prev?: string; next?: string; version: string }) {
  const nav = useNavigate();
  const [hints, setHints] = useState<0 | 1 | 2 | 3>(0);
  const [solution, setSolution] = useState<string | null>(null);
  const [explain, setExplain] = useState<ExplainInput | null>(null);
  const persist = useMemo(() => ({ context: 'tp' as const, hintsUsed: hints, solutionShown: solution !== null, bankVersion: version }), [hints, solution, version]);
  return (<>
    <ExerciseRunner
      exercise={ex} persist={persist} onBack={() => nav('/tp')} onExplain={(r, code) => setExplain(fromCheck(ex, code, r))}
      header={<span className="flex gap-1">
        {prev ? <Link to={`/tp/${prev}`} className="touch inline-flex items-center rounded-lg px-2 text-muted hover:text-fg" aria-label="Exercice précédent">‹</Link> : null}
        {next ? <Link to={`/tp/${next}`} className="touch inline-flex items-center rounded-lg px-2 text-muted hover:text-fg" aria-label="Exercice suivant" data-testid="next-ex">›</Link> : null}
      </span>}
      belowStatement={<div className="space-y-3"><Notes ex={ex} /><Assist ex={ex} hints={hints} setHints={setHints} solution={solution} setSolution={setSolution} /></div>}
    />
    {explain && <ExplainDialog input={explain} onClose={() => setExplain(null)} />}
  </>);
}

export default function TpDetail() {
  const { key = '' } = useParams();
  const { status, byKey, bank, version } = useBank();
  const order = useMemo(() => (bank ? [...bank.sessions].sort((a, b) => a.number - b.number).flatMap((s) => s.exerciseKeys) : []), [bank]);
  if (status === 'idle' || status === 'loading') return <Page title="Exercice"><p className="text-muted">Chargement…</p></Page>;
  if (status === 'empty' || !bank || !version) return <Page title="Exercice"><p>Aucune banque installée. <Link to="/importer" className="text-accent underline">Importer une banque</Link></p></Page>;
  const ex = byKey.get(key);
  if (!ex) return <Page title="Exercice introuvable"><p>Cet exercice n’existe pas dans la banque « {version} ». <Link to="/tp" className="text-accent underline">Retour à la liste</Link></p></Page>;
  const i = order.indexOf(key);

  if (ex.provenance.fidelity === 'unavailable' || ex.tests.length === 0) {
    return (
      <Page title={ex.title}>
        <div className="mb-3 flex flex-wrap items-center gap-2"><FidelityBadge fidelity="unavailable" /><Link to="/tp" className="ml-auto text-sm text-accent underline">← Liste des TP</Link></div>
        <div className="rounded-lg border border-border bg-surface-2 p-3 text-sm" role="note">La correction automatique n’est pas disponible pour cet exercice : l’énoncé ne suffit pas à définir un résultat vérifiable. Tu peux t’entraîner dans l’<Link to="/atelier" className="text-accent underline">atelier Java</Link>.</div>
        <div className="mt-4"><Markdown text={ex.statementMd} /></div>
        <Notes ex={ex} />
      </Page>
    );
  }
  return <TpExercise key={ex.key} ex={ex} prev={order[i - 1]} next={order[i + 1]} version={version} />;
}
