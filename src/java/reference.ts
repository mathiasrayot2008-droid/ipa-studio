import type { TestCase } from '@/types/bank';
import { DEFAULT_WEIGHT } from './grade';
import { expectedFrom } from './compare';
import type { HarnessOutput } from './harnessTypes';
import type { ExecSpec } from './template';

/**
 * Fabrique les tests complets en exécutant la solution de référence : les valeurs attendues
 * sont CE QUE PRODUIT la référence (jamais écrites à la main ⇒ pas d'incohérence énoncé/test).
 */
export function withExpected(spec: ExecSpec, tests: (Omit<TestCase, 'expected' | 'weight'> & { weight?: number })[], out: HarnessOutput): TestCase[] {
  if (out.phase === 'compile') throw new Error('La référence ne compile pas : ' + out.diagnostics.map((d) => `l.${d.line} ${d.msg}`).join(' | '));
  if (out.phase !== 'run') throw new Error(`La référence n'a pas pu s'exécuter (${out.phase})`);
  return tests.map((t) => {
    const act = out.tests.find((x) => x.id === t.id);
    if (!act) throw new Error(`Référence : test ${t.id} absent`);
    if (act.timeout) throw new Error(`Référence : test ${t.id} dépasse le temps`);
    if (act.exc) throw new Error(`Référence : test ${t.id} lève ${act.exc.type} (${act.exc.msg})`);
    return {
      ...t,
      weight: t.weight ?? DEFAULT_WEIGHT[t.visibility],
      expected: expectedFrom(act, spec.kind, spec.expectedVariables),
    };
  });
}
