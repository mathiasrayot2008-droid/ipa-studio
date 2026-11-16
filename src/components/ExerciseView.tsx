import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Exercise } from '@/types/bank';
import type { CheckResult } from '@/java/grade';
import { toolDoc, toolName } from '@/java/toolDocs';
import { useTheme } from '@/app/theme';
import { CodeEditor, type CodeEditorHandle, type CompletionItem, type EditorDiag } from './CodeEditor';
import { Markdown } from './Markdown';
import { MobileKeys } from './MobileKeys';
import { ResultsPanel } from './ResultsPanel';
import { useJavaStatus } from '@/java/runner';
import { useIsDesktop } from '@/app/useMedia';

export interface ExerciseViewProps {
  exercise: Exercise;
  code: string;
  onCode: (c: string) => void;
  result: CheckResult | null;
  busy: boolean;
  lastMode?: 'run' | 'check' | null;
  onRun: () => void;
  onCheck: () => void;
  onReset?: () => void;
  onBack?: () => void;
  /** Bandeau haut (minuteur, titre du DST…). */
  header?: ReactNode;
  /** Sous l'énoncé (indices en mode assisté). */
  belowStatement?: ReactNode;
  revealExpected?: boolean;
  onExplain?: () => void;
  readOnly?: boolean;
  fontSize?: number;
}

type Tab = 'enonce' | 'code' | 'resultats';

const KIND_LABEL: Record<Exercise['kind'], string> = { snippet: 'Fragment de code', drawing: 'Dessin', grid: 'Grille', runner: 'Runner', members: 'Méthodes', program: 'Programme' };

function JavaBadge() {
  const { state, detail } = useJavaStatus();
  const txt = state === 'ready' ? 'Java prêt ✓' : state === 'busy' ? 'Java : exécution…' : state === 'error' ? 'Java indisponible' : detail ?? 'Java : préparation…';
  const cls = state === 'ready' ? 'text-ok' : state === 'error' ? 'text-bad' : 'text-muted';
  return <span className={`text-xs ${cls}`} role="status" data-testid="java-status">{txt}</span>;
}

export function ExerciseView(p: ExerciseViewProps) {
  const { exercise: ex } = p;
  const theme = useTheme((s) => s.theme);
  const editor = useRef<CodeEditorHandle>(null);
  const [tab, setTab] = useState<Tab>('enonce');
  const [resultsOpen, setResultsOpen] = useState(true);
  const desktop = useIsDesktop();

  // Sur mobile, bascule sur « Résultats » dès qu'un résultat arrive.
  useEffect(() => { if (p.result) setTab('resultats'); }, [p.result]);

  const completions = useMemo<CompletionItem[]>(() => [
    ...ex.tools.map((t) => { const d = toolDoc(t); const n = toolName(d); return { label: n, detail: d.signature, info: d.description, type: (d.signature.includes('(') ? 'function' : 'constant') as CompletionItem['type'] }; }),
    ...ex.givenVariables.map((v) => ({ label: v.name, detail: v.type, info: v.description, type: 'variable' as const })),
  ], [ex.tools, ex.givenVariables]);

  const diags = useMemo<EditorDiag[]>(() => (p.result?.diagnostics ?? []).map((d) => ({ line: d.line, message: d.fr })), [p.result]);

  const statement = (
    <div className="space-y-4 p-4">
      <div>
        <h2 className="text-xl font-semibold">{ex.title}</h2>
        <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted">
          <span className="rounded bg-surface-2 px-2 py-0.5">{KIND_LABEL[ex.kind]}</span>
          <span className="rounded bg-surface-2 px-2 py-0.5">Difficulté {ex.difficulty}/5</span>
          <span className="rounded bg-surface-2 px-2 py-0.5">≈ {ex.estimatedMinutes} min</span>
          {ex.origin === 'ipa-studio' && <span className="rounded bg-surface-2 px-2 py-0.5">Exercice IPA Studio</span>}
        </div>
      </div>
      <Markdown text={ex.statementMd} />
      {ex.givenVariables.length > 0 && (
        <section>
          <h3 className="mb-1 font-semibold">Variables fournies</h3>
          <p className="mb-1 text-sm text-muted">Déjà déclarées et initialisées : ne les redéclare pas.</p>
          <ul className="space-y-1 text-sm">{ex.givenVariables.map((v) => <li key={v.name}><code className="font-mono">{v.type} {v.name}</code>{v.description && <span className="text-muted"> — {v.description}</span>}</li>)}</ul>
        </section>
      )}
      {ex.expectedVariables.length > 0 && (
        <section>
          <h3 className="mb-1 font-semibold">Variables à déclarer</h3>
          <ul className="space-y-1 text-sm">{ex.expectedVariables.map((v) => <li key={v.name}><code className="font-mono">{v.type} {v.name}</code></li>)}</ul>
        </section>
      )}
      {ex.outputFormat && <section><h3 className="mb-1 font-semibold">Format de sortie</h3><Markdown text={ex.outputFormat} className="text-sm" /></section>}
      {ex.tools.length > 0 && (
        <section>
          <h3 className="mb-1 font-semibold">Outils</h3>
          <ul className="space-y-2 text-sm">
            {ex.tools.filter((t) => t.id !== 'canvasSize').map((t) => { const d = toolDoc(t); return <li key={t.id}><code className="font-mono text-accent">{d.signature}</code><div className="text-muted">{d.description}</div></li>; })}
          </ul>
        </section>
      )}
      {p.belowStatement}
    </div>
  );

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface px-2 py-2">
      <button type="button" onClick={p.onRun} disabled={p.busy} className="touch rounded-lg bg-surface-2 px-4 font-medium hover:bg-border disabled:opacity-50">▶ Exécuter</button>
      <button type="button" onClick={p.onCheck} disabled={p.busy} className="touch rounded-lg bg-accent px-4 font-semibold text-accent-fg hover:opacity-90 disabled:opacity-50">✔ Vérifier</button>
      {p.onReset && <button type="button" onClick={() => { if (confirm('Remettre le code de départ ? Ton code actuel sera perdu.')) p.onReset!(); }} className="touch rounded-lg px-3 text-sm text-muted hover:text-fg">Réinitialiser</button>}
      <span className="ml-auto"><JavaBadge /></span>
    </div>
  );

  const editorEl = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 p-2">
        <CodeEditor ref={editor} value={p.code} onChange={p.onCode} theme={theme} fontSize={p.fontSize ?? 15} diagnostics={diags} completions={completions} readOnly={p.readOnly} onRun={p.onRun} onCheck={p.onCheck} />
      </div>
      <MobileKeys editor={editor} />
    </div>
  );

  const resultsEl = <ResultsPanel result={p.result} busy={p.busy} kind={ex.kind} revealExpected={p.revealExpected} lastMode={p.lastMode} onExplain={p.onExplain} />;

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-bg md:static md:z-auto md:h-full" data-testid="exercise-view">
      <div className="flex items-center gap-2 border-b border-border bg-surface px-3 py-2">
        {p.onBack && <button type="button" onClick={p.onBack} className="touch rounded-lg px-2 text-muted hover:text-fg" aria-label="Retour">←</button>}
        <div className="min-w-0 flex-1 truncate font-semibold">{ex.title}</div>
        {p.header}
      </div>

      {desktop ? (
        /* Bureau : énoncé à gauche, éditeur + résultats à droite */
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(320px,2fr)_3fr]">
          <div className="min-h-0 overflow-y-auto border-r border-border">{statement}</div>
          <div className="flex min-h-0 flex-col">
            {toolbar}
            {editorEl}
            <div className="border-t border-border">
              <button type="button" onClick={() => setResultsOpen((o) => !o)} aria-expanded={resultsOpen} className="touch flex w-full items-center justify-between px-3 text-sm text-muted hover:text-fg">
                <span>Résultats</span><span aria-hidden>{resultsOpen ? '▾' : '▸'}</span>
              </button>
              {resultsOpen && <div className="max-h-[40vh] overflow-y-auto">{resultsEl}</div>}
            </div>
          </div>
        </div>
      ) : (
        /* Mobile : 3 onglets */
        <div className="flex min-h-0 flex-1 flex-col">
          <div role="tablist" className="flex border-b border-border bg-surface">
            {([['enonce', 'Énoncé'], ['code', 'Code'], ['resultats', 'Résultats']] as [Tab, string][]).map(([id, label]) => (
              <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`touch flex-1 py-2 text-sm ${tab === id ? 'border-b-2 border-accent text-accent' : 'text-muted'}`}>{label}</button>
            ))}
          </div>
          {tab === 'enonce' && <div className="min-h-0 flex-1 overflow-y-auto">{statement}</div>}
          {tab === 'code' && <div className="flex min-h-0 flex-1 flex-col">{toolbar}{editorEl}</div>}
          {tab === 'resultats' && <div className="flex min-h-0 flex-1 flex-col">{toolbar}<div className="min-h-0 flex-1 overflow-y-auto">{resultsEl}</div></div>}
        </div>
      )}
    </div>
  );
}
