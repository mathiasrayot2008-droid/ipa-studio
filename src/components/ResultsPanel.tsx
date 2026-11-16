import type { ReactNode } from 'react';
import type { Exercise, RunnerMap } from '@/types/bank';
import type { CheckResult, TestVerdict } from '@/java/grade';
import type { Mismatch } from '@/java/compare';
import { translateException } from '@/java/ecjMessagesFr';
import { fmtJv, fmtValue } from './fmt';
import { CanvasView, GridView, RunnerView } from './views';

const STATUS: Record<CheckResult['status'], { label: string; cls: string }> = {
  reussi: { label: 'Réussi', cls: 'bg-ok/15 text-ok' },
  partiel: { label: 'Partiel', cls: 'bg-warn/15 text-warn' },
  echoue: { label: 'Échoué', cls: 'bg-bad/15 text-bad' },
  compilation: { label: 'Erreur de compilation', cls: 'bg-bad/15 text-bad' },
  interdit: { label: 'Instruction non autorisée', cls: 'bg-bad/15 text-bad' },
  crash: { label: 'Problème d’exécution', cls: 'bg-warn/15 text-warn' },
};

const VIS: Record<TestVerdict['visibility'], string> = { public: 'Test public', hidden: 'Test caché', edge: 'Test limite' };

interface Props {
  result: CheckResult | null;
  busy: boolean;
  kind: Exercise['kind'];
  /** false (examen) : on indique seulement réussi/échoué, sans la valeur attendue. */
  revealExpected?: boolean;
  /** Ce qui a été lancé : « Exécuter » (public seulement) ou « Vérifier » (tout). */
  lastMode?: 'run' | 'check' | null;
  onExplain?: () => void;
  extra?: ReactNode;
}

function Mm({ m, revealExpected }: { m: Mismatch; revealExpected: boolean }) {
  switch (m.kind) {
    case 'var':
      if (m.reason === 'missing') return <li>La variable <code>{m.name}</code> n’a pas été capturée (le code s’est arrêté avant ?).</li>;
      if (m.reason === 'type') return <li>La variable <code>{m.name}</code> doit être de type <code>{m.expected.type}</code> ; la tienne est de type <code>{m.got?.type}</code>.</li>;
      return (
        <li>
          <code>{m.name}</code> vaut <code className="text-bad">{fmtValue(m.got!.type, m.got!.value)}</code>
          {revealExpected && <> au lieu de <code className="text-ok">{fmtJv(m.expected)}</code></>}.
        </li>
      );
    case 'out':
      return (
        <li>
          Affichage différent.
          <div className="mt-1 grid gap-2 sm:grid-cols-2">
            <div><div className="text-xs text-muted">Obtenu</div><pre className="whitespace-pre-wrap rounded bg-surface-2 p-2 text-xs">{m.got || '(rien)'}</pre></div>
            {revealExpected && <div><div className="text-xs text-muted">Attendu</div><pre className="whitespace-pre-wrap rounded bg-surface-2 p-2 text-xs">{m.expected || '(rien)'}</pre></div>}
          </div>
        </li>
      );
    case 'grid': return <li>La grille finale n’est pas celle attendue.</li>;
    case 'canvas': return <li>{m.sizeDiffers ? 'La toile n’a pas les bonnes dimensions.' : `Le dessin diffère de ${m.diffPixels} pixels (sur ${m.total}).`}</li>;
    case 'runner':
      return <li>{m.reason === 'touched' ? 'Le personnage a touché une case rouge.' : m.reason === 'absent' ? 'Pas de personnage.' : `Le personnage s’est arrêté en (${m.at?.[0]}, ${m.at?.[1]}) sans atteindre la case verte.`}</li>;
    case 'exception': {
      const f = translateException(m.type, m.msg);
      return <li><strong>{f.fr}</strong>{m.line > 0 && <> (ligne {m.line})</>}{f.hint && <div className="text-muted">{f.hint}</div>}<div className="text-xs text-muted">{m.type}{m.msg ? `: ${m.msg}` : ''}</div></li>;
    }
    case 'timeout': return <li><strong>Temps limite dépassé</strong> : boucle infinie ou calcul trop long ? Vérifie que la variable de boucle change à chaque tour.</li>;
    case 'hidden': return <li>Ce test est caché : le détail n’est pas affiché.</li>;
  }
}

function Visuals({ v, kind }: { v: TestVerdict; kind: Exercise['kind'] }) {
  if (!v.actual) return null;
  if (kind === 'grid' && v.actual.grid) return (
    <div className="mt-2 flex flex-wrap gap-4">
      <GridView rows={v.actual.grid} caption="Ton résultat" />
      {v.expected?.grid && <GridView rows={v.expected.grid} caption="Attendu" />}
    </div>
  );
  if (kind === 'drawing' && v.actual.canvas) return (
    <div className="mt-2 flex flex-wrap gap-4">
      <CanvasView w={v.actual.canvas.w} h={v.actual.canvas.h} rle={v.actual.canvas.rle} caption="Ton dessin" />
      {v.expected?.canvas && <CanvasView {...v.expected.canvas} caption="Attendu" />}
    </div>
  );
  if (kind === 'runner' && v.actual.runner && v.scene?.runner) return (
    <div className="mt-2"><RunnerView map={v.scene.runner as RunnerMap} path={v.actual.runner.path} at={[v.actual.runner.x, v.actual.runner.y]} caption="Parcours" /></div>
  );
  return null;
}

export function ResultsPanel({ result, busy, kind, revealExpected = true, lastMode, onExplain, extra }: Props) {
  if (busy) return <div className="p-4 text-sm text-muted" role="status" aria-live="polite">Exécution en cours…</div>;
  if (!result) return <div className="p-4 text-sm text-muted">Écris ton code puis appuie sur <strong>Exécuter</strong> (tests publics) ou <strong>Vérifier</strong> (tous les tests).</div>;
  const st = STATUS[result.status];
  const pct = Math.round(result.score * 100);
  return (
    <div className="space-y-3 p-3 text-sm" role="region" aria-label="Résultats" aria-live="polite">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${st.cls}`}>{st.label}</span>
        {result.total > 0 && (
          <span className="text-muted">
            {result.passed}/{result.total} tests{lastMode === 'run' ? ' publics' : ''}{lastMode === 'check' && <> · score {pct} %</>}
          </span>
        )}
        {result.compileMs !== undefined && <span className="text-xs text-muted">compilation {Math.round(result.compileMs)} ms</span>}
      </div>

      {result.status === 'interdit' && <p>Ton code utilise une API non autorisée dans cet exercice : <code>{result.forbidden}</code>.</p>}
      {result.status === 'crash' && <p>{result.internalError ?? 'Le moteur Java a rencontré un problème. Réessaie.'}</p>}

      {result.diagnostics.map((d, i) => (
        <div key={i} className="rounded-lg border border-bad/40 bg-bad/10 p-3">
          <div className="font-semibold">Ligne {d.line} : {d.fr}</div>
          {d.snippet && <pre className="mt-1 overflow-x-auto rounded bg-surface-2 p-2 font-mono text-xs">{d.snippet}</pre>}
          {d.hint && <div className="mt-1 text-muted">{d.hint}</div>}
          <details className="mt-1 text-xs text-muted"><summary className="cursor-pointer">Message original du compilateur</summary><code>{d.original}</code></details>
        </div>
      ))}

      <ul className="space-y-2">
        {result.verdicts.map((v) => (
          <li key={v.id} className="rounded-lg border border-border p-2">
            <div className="flex items-center gap-2">
              <span className={v.passed ? 'text-ok' : 'text-bad'} aria-hidden>{v.passed ? '✓' : '✗'}</span>
              <span className="font-medium">{VIS[v.visibility]}{v.visibility === 'public' ? ` ${v.id}` : ''}</span>
              <span className="sr-only">{v.passed ? 'réussi' : 'échoué'}</span>
              {v.inputs && Object.keys(v.inputs).length > 0 && (
                <span className="truncate text-xs text-muted">({Object.entries(v.inputs).map(([k, x]) => `${k} = ${fmtJv(x)}`).join(', ')})</span>
              )}
            </div>
            {!v.passed && (
              <>
                <ul className="mt-1 list-disc space-y-1 pl-6">{v.mismatches.map((m, i) => <Mm key={i} m={m} revealExpected={revealExpected && v.visibility === 'public'} />)}</ul>
                {revealExpected && <Visuals v={v} kind={kind} />}
              </>
            )}
          </li>
        ))}
      </ul>

      {result.debug && <details open><summary className="cursor-pointer text-xs text-muted">Sortie debug (non notée)</summary><pre className="mt-1 whitespace-pre-wrap rounded bg-surface-2 p-2 text-xs">{result.debug}</pre></details>}
      {result.stdout && <details><summary className="cursor-pointer text-xs text-muted">System.out (non noté — utilise <code>affiche()</code> pour ce qui est évalué)</summary><pre className="mt-1 whitespace-pre-wrap rounded bg-surface-2 p-2 text-xs">{result.stdout}</pre></details>}

      {onExplain && result.status !== 'reussi' && (
        <button type="button" onClick={onExplain} className="touch rounded-lg border border-accent px-3 py-2 text-accent hover:bg-accent hover:text-accent-fg">
          Comprendre mon erreur avec Claude
        </button>
      )}
      {extra}
    </div>
  );
}
