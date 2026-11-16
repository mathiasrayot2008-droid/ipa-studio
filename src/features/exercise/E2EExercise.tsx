// Route de test E2E (build VITE_E2E uniquement) : un exercice minimal aux valeurs attendues écrites à la main.
import type { Exercise } from '@/types/bank';
import { ExerciseRunner } from './ExerciseRunner';

const d = (value: number) => ({ type: 'double' as const, value });
const EX: Exercise = {
  key: 'e2e-moyenne', origin: 'ipa-studio', kind: 'snippet', title: 'Moyenne de quatre valeurs',
  statementMd: 'On vous fournit **quatre réels** `v1`, `v2`, `v3` et `v4`.\n\nDéclarez un réel `mean` égal à leur moyenne.\n\n- Utilisez `debug()` pour afficher `v1`.',
  notions: { primary: 'N02-expressions-arith', secondary: [] }, difficulty: 1, estimatedMinutes: 3,
  tools: [{ id: 'debug' }],
  givenVariables: ['v1', 'v2', 'v3', 'v4'].map((name) => ({ name, type: 'double' as const, description: '' })),
  expectedVariables: [{ name: 'mean', type: 'double' }],
  starterCode: '// v1, v2, v3 et v4 sont déjà déclarées et initialisées\n',
  compare: { trimLines: true, ignoreTrailingEmptyLines: true, caseSensitive: true, doubleTolerance: 1e-9 },
  tests: [
    { id: 'p1', visibility: 'public', weight: 1, inputs: { v1: d(1), v2: d(2), v3: d(3), v4: d(4) }, expected: { vars: { mean: d(2.5) } } },
    { id: 'p2', visibility: 'public', weight: 1, inputs: { v1: d(10), v2: d(10), v3: d(10), v4: d(10) }, expected: { vars: { mean: d(10) } } },
    { id: 'h1', visibility: 'hidden', weight: 2, inputs: { v1: d(-1.5), v2: d(2.25), v3: d(0), v4: d(7) }, expected: { vars: { mean: d(1.9375) } } },
    { id: 'e1', visibility: 'edge', weight: 2, inputs: { v1: d(0), v2: d(0), v3: d(0), v4: d(0) }, expected: { vars: { mean: d(0) } } },
  ],
  hints: ['', '', ''], referenceSolution: 'double mean = (v1 + v2 + v3 + v4) / 4;',
  provenance: { source: 'e2e', bankVersion: 'e2e' },
};

export default function E2EExercise() {
  return <ExerciseRunner exercise={EX} persist={{ context: 'tp' }} />;
}
