import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Exercise } from '@/types/bank';
import { evaluate, type EvalMode } from '@/java/evaluate';
import type { CheckResult } from '@/java/grade';
import { ExerciseView } from '@/components/ExerciseView';
import { useAuth } from '@/data/auth';
import { DraftSaver } from '@/data/DraftSaver';
import { recordAttempt } from '@/data/attempts';

export interface ExerciseRunnerProps {
  exercise: Exercise;
  initialCode?: string;
  onCode?: (code: string) => void;
  /** Appelé après chaque exécution/vérification (sauvegarde de tentative, maîtrise…). */
  onResult?: (r: CheckResult, mode: EvalMode, code: string) => void;
  onBack?: () => void;
  header?: ReactNode;
  belowStatement?: ReactNode;
  revealExpected?: boolean;
  readOnly?: boolean;
  hideCheck?: boolean;
  onExplain?: (r: CheckResult, code: string) => void;
  /** Enregistre brouillon (30 s) et tentatives dans le dépôt de l'étudiant (local ou compte). */
  persist?: { context: 'tp' | 'entrainement' | 'dst'; dstId?: string; hintsUsed?: 0 | 1 | 2 | 3; solutionShown?: boolean; bankVersion?: string };
}

const crash = (msg: string): CheckResult => ({ status: 'crash', score: 0, passed: 0, total: 0, diagnostics: [], verdicts: [], errorTags: ['internal'], debug: '', stdout: '', internalError: msg });

export function ExerciseRunner(p: ExerciseRunnerProps) {
  const [code, setCode] = useState(p.initialCode ?? p.exercise.starterCode);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastMode, setLastMode] = useState<EvalMode | null>(null);
  const repo = useAuth((a) => a.repo);
  const status = useAuth((a) => a.status);
  const startedAt = useRef(Date.now());
  const [loaded, setLoaded] = useState(!p.persist);
  const persistOn = Boolean(p.persist);
  const saver = useMemo(() => (persistOn ? new DraftSaver(repo, p.exercise.key) : null), [repo, p.exercise.key, persistOn]);

  // Restaure le brouillon enregistré (si aucun code initial imposé).
  useEffect(() => {
    if (!p.persist || status === 'loading') return;
    let off = false;
    void repo.getDraft(p.exercise.key).then((d) => { if (!off && d && p.initialCode === undefined) setCode(d.code); }).finally(() => { if (!off) setLoaded(true); });
    return () => { off = true; };
  }, [repo, status, p.exercise.key]); // eslint-disable-line react-hooks/exhaustive-deps

  // Écriture immédiate à la fermeture / au changement d'exercice.
  useEffect(() => {
    if (!saver) return;
    const f = () => void saver.flush();
    window.addEventListener('pagehide', f);
    return () => { window.removeEventListener('pagehide', f); void saver.flush(); };
  }, [saver]);

  const go = useCallback(async (mode: EvalMode) => {
    setBusy(true);
    try {
      const r = await evaluate(p.exercise, code, mode);
      setResult(r); setLastMode(mode);
      if (mode === 'check') void saver?.flush();
      if (mode === 'check' && p.persist) await recordAttempt(repo, p.exercise, r, code, { ...p.persist, startedAt: startedAt.current }).catch(() => undefined);
      p.onResult?.(r, mode, code);
    } catch (e) {
      setResult(crash(e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  }, [p.exercise, p.onResult, p.persist, repo, saver, code]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!loaded) return <div className="p-6 text-muted">Chargement de ton exercice…</div>;
  return (
    <ExerciseView
      exercise={p.exercise} code={code}
      onCode={(c) => { setCode(c); p.onCode?.(c); saver?.save(c); }}
      result={result} busy={busy} lastMode={lastMode}
      onRun={() => void go('run')} onCheck={() => void go('check')}
      onReset={() => { setCode(p.exercise.starterCode); p.onCode?.(p.exercise.starterCode); setResult(null); }}
      onBack={p.onBack} header={p.header} belowStatement={p.belowStatement}
      revealExpected={p.revealExpected} readOnly={p.readOnly} hideCheck={p.hideCheck}
      onExplain={p.onExplain ? () => p.onExplain!(result!, code) : undefined}
    />
  );
}
