import type { Exercise, TestCase } from '@/types/bank';
import { DEFAULT_COMPARE } from './compare';
import { grade, precheck, redactHidden, type CheckResult } from './grade';
import { javaRunner, type JavaBackend } from './runner';
import { matchMutants } from './mutantTags';
import { buildProject, specOf } from './template';

export type EvalMode = 'run' | 'check';

export const LIMITS = { perTestMs: 2000, totalMs: 8000 };

type Gradable = Pick<Exercise, 'kind' | 'tools' | 'givenVariables' | 'expectedVariables' | 'tests' | 'compare'> & Partial<Pick<Exercise, 'key' | 'mutantFingerprints'>>;

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
  // Erreur-type reconnue d'après le comportement (série complète de tests uniquement, avant le masquage des tests cachés).
  if (mode === 'check' && ex.key && ex.mutantFingerprints) r.errorTags = [...new Set([...r.errorTags, ...matchMutants({ key: ex.key, kind: ex.kind, expectedVariables: ex.expectedVariables, mutantFingerprints: ex.mutantFingerprints }, r.verdicts)])];
  return redactHidden(r);
}
