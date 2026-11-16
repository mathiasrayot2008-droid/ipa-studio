import { useCallback, useState, type ReactNode } from 'react';
import type { Exercise } from '@/types/bank';
import { evaluate, type EvalMode } from '@/java/evaluate';
import type { CheckResult } from '@/java/grade';
import { ExerciseView } from '@/components/ExerciseView';

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
  onExplain?: (r: CheckResult, code: string) => void;
}

const crash = (msg: string): CheckResult => ({ status: 'crash', score: 0, passed: 0, total: 0, diagnostics: [], verdicts: [], errorTags: ['internal'], debug: '', stdout: '', internalError: msg });

export function ExerciseRunner(p: ExerciseRunnerProps) {
  const [code, setCode] = useState(p.initialCode ?? p.exercise.starterCode);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastMode, setLastMode] = useState<EvalMode | null>(null);

  const go = useCallback(async (mode: EvalMode) => {
    setBusy(true);
    try {
      const r = await evaluate(p.exercise, code, mode);
      setResult(r); setLastMode(mode);
      p.onResult?.(r, mode, code);
    } catch (e) {
      setResult(crash(e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  }, [p.exercise, p.onResult, code]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ExerciseView
      exercise={p.exercise} code={code}
      onCode={(c) => { setCode(c); p.onCode?.(c); }}
      result={result} busy={busy} lastMode={lastMode}
      onRun={() => void go('run')} onCheck={() => void go('check')}
      onReset={() => { setCode(p.exercise.starterCode); p.onCode?.(p.exercise.starterCode); setResult(null); }}
      onBack={p.onBack} header={p.header} belowStatement={p.belowStatement}
      revealExpected={p.revealExpected} readOnly={p.readOnly}
      onExplain={p.onExplain ? () => p.onExplain!(result!, code) : undefined}
    />
  );
}
