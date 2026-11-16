import type { Exercise, TestCase } from '@/types/bank';
import { DEFAULT_COMPARE } from './compare';
import { grade, precheck, redactHidden, type CheckResult } from './grade';
import { javaRunner, type JavaBackend } from './runner';
import { buildProject, specOf } from './template';

export type EvalMode = 'run' | 'check';

export const LIMITS = { perTestMs: 2000, totalMs: 8000 };

type Gradable = Pick<Exercise, 'kind' | 'tools' | 'givenVariables' | 'expectedVariables' | 'tests' | 'compare'>;

/**
 * « Exécuter » (mode run) : tests PUBLICS seulement, détails visibles.
 * « Vérifier » (mode check) : tous les tests ; le détail des tests cachés/limites est masqué.
 * Notation 100 % fonctionnelle : on ne compare jamais le code de l'étudiant à une solution.
 */
export async function evaluate(ex: Gradable, code: string, mode: EvalMode, backend: JavaBackend = javaRunner()): Promise<CheckResult> {
  const pre = precheck(code);
  if (pre) return pre;
  const tests: TestCase[] = mode === 'run' ? ex.tests.filter((t) => t.visibility === 'public') : ex.tests;
  const project = buildProject(specOf(ex, tests), code, LIMITS);
  const out = await backend.check(project, LIMITS);
  const r = grade(out, project, code, tests, ex.compare ?? DEFAULT_COMPARE);
  return redactHidden(r);
}
