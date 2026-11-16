import type { TestCase } from '@/types/bank';
import type { ExecSpec } from '@/java/template';
import { grade, precheck, type CheckResult } from '@/java/grade';
import { withExpected } from '@/java/reference';
import { runLocal } from './localJava';

type T = Omit<TestCase, 'expected' | 'weight'> & { weight?: number };
const i = (value: number) => ({ type: 'int' as const, value });
const d = (value: number) => ({ type: 'double' as const, value });
const s = (value: string) => ({ type: 'String' as const, value });
const ia = (value: number[]) => ({ type: 'int[]' as const, value });

export interface Fixture { name: string; spec: Omit<ExecSpec, 'tests'>; tests: T[]; reference: string }

export const FIXTURES: Record<string, Fixture> = {
  moyenne: {
    name: 'Moyenne de 4 valeurs',
    spec: { kind: 'snippet', tools: [{ id: 'affiche' }, { id: 'debug' }], givenVariables: ['v1', 'v2', 'v3', 'v4'].map((name) => ({ name, type: 'double' as const })), expectedVariables: [{ name: 'mean', type: 'double' }] },
    tests: [
      { id: 'p1', visibility: 'public', inputs: { v1: d(1), v2: d(2), v3: d(3), v4: d(4) } },
      { id: 'p2', visibility: 'public', inputs: { v1: d(10), v2: d(10), v3: d(10), v4: d(10) } },
      { id: 'h1', visibility: 'hidden', inputs: { v1: d(-1.5), v2: d(2.25), v3: d(0), v4: d(7) } },
      { id: 'e1', visibility: 'edge', inputs: { v1: d(0), v2: d(0), v3: d(0), v4: d(0) } },
    ],
    reference: 'double mean = (v1 + v2 + v3 + v4) / 4;',
  },
  somme: {
    name: 'Somme et maximum d’un tableau',
    spec: { kind: 'snippet', tools: [{ id: 'debug' }], givenVariables: [{ name: 't', type: 'int[]' }], expectedVariables: [{ name: 'somme', type: 'int' }, { name: 'max', type: 'int' }] },
    tests: [
      { id: 'p1', visibility: 'public', inputs: { t: ia([3, 1, 4, 1, 5]) } },
      { id: 'p2', visibility: 'public', inputs: { t: ia([-2, -8, -1]) } },
      { id: 'h1', visibility: 'hidden', inputs: { t: ia([7]) } },
      { id: 'e1', visibility: 'edge', inputs: { t: ia([0, 0, 0]) } },
    ],
    reference: 'int somme = 0;\nint max = t[0];\nfor (int i = 0; i < t.length; i++) {\n  somme += t[i];\n  if (t[i] > max) max = t[i];\n}',
  },
  compteVoyelles: {
    name: 'Nombre de voyelles',
    spec: { kind: 'snippet', tools: [{ id: 'affiche' }], givenVariables: [{ name: 'chaine', type: 'String' }], expectedVariables: [{ name: 'nb', type: 'int' }] },
    tests: [
      { id: 'p1', visibility: 'public', inputs: { chaine: s('bonjour') } },
      { id: 'p2', visibility: 'public', inputs: { chaine: s('xyz') } },
      { id: 'h1', visibility: 'hidden', inputs: { chaine: s('AEIOUaeiou') } },
      { id: 'e1', visibility: 'edge', inputs: { chaine: s('') } },
    ],
    reference: 'int nb = 0;\nfor (int i = 0; i < chaine.length(); i++) {\n  char c = Character.toLowerCase(chaine.charAt(i));\n  if (c == \'a\' || c == \'e\' || c == \'i\' || c == \'o\' || c == \'u\' || c == \'y\') nb++;\n}\naffiche("" + nb);',
  },
  ligneCentrale: {
    name: 'Cases par cases, ligne',
    spec: { kind: 'grid', tools: [{ id: 'debug' }, { id: 'setFillColor' }, { id: 'fillCase' }], givenVariables: [{ name: 'largeur', type: 'int' }, { name: 'hauteur', type: 'int' }], expectedVariables: [] },
    tests: [
      [5, 5], [6, 4], [8, 1], [3, 8],
    ].map(([l, h], n) => ({ id: `t${n}`, visibility: n < 2 ? ('public' as const) : ('hidden' as const), inputs: { largeur: i(l!), hauteur: i(h!) }, scene: { grid: { largeur: l!, hauteur: h! } } })),
    reference: 'setFillColor("blue");\nint yDebut = (hauteur - 1) / 2;\nint yFin = hauteur / 2;\nfor (int y = yDebut; y <= yFin; y++) {\n  for (int x = 0; x < largeur; x++) {\n    fillCase(x, y);\n  }\n}',
  },
  maison: {
    name: 'Tracé de maison décalé',
    spec: { kind: 'drawing', tools: [{ id: 'debug' }, { id: 'setFillColor' }, { id: 'rectangle' }, { id: 'isoTriangle' }], givenVariables: [{ name: 'dx', type: 'int' }, { name: 'dy', type: 'int' }], expectedVariables: [] },
    tests: [[0, 0], [20, 10], [100, 150], [-30, 40]].map(([dx, dy], n) => ({ id: `t${n}`, visibility: n < 2 ? ('public' as const) : ('hidden' as const), inputs: { dx: i(dx!), dy: i(dy!) }, scene: { canvas: { width: 500, height: 500 } } })),
    reference: 'setFillColor("white");\nrectangle(0 + dx, 100 + dy, 300, 200);\nsetFillColor("blue");\nrectangle(50 + dx, 150 + dy, 50, 50);\nrectangle(100 + dx, 150 + dy, 50, 50);\nsetFillColor("brown");\nrectangle(200 + dx, 200 + dy, 50, 100);\nsetFillColor("red");\nisoTriangle(0 + dx, 100 + dy, 300, -100);',
  },
  runnerPremiersPas: {
    name: 'Runner : premiers pas',
    spec: { kind: 'runner', tools: [{ id: 'debug' }, { id: 'moveUp' }, { id: 'moveDown' }, { id: 'moveLeft' }, { id: 'moveRight' }], givenVariables: [], expectedVariables: [] },
    tests: [{
      id: 't1', visibility: 'public', inputs: {},
      scene: { runner: { width: 6, height: 5, start: [0, 0], goal: [3, 3], walls: [[1, 0], [2, 1], [4, 4]] } },
    }],
    reference: 'moveDown();\nmoveDown();\nmoveDown();\nmoveRight();\nmoveRight();\nmoveRight();',
  },
};

export function buildTests(f: Fixture): { spec: ExecSpec; tests: TestCase[] } {
  const spec: ExecSpec = { ...f.spec, tests: f.tests };
  const { output } = runLocal(spec, f.reference);
  return { spec, tests: withExpected(spec, f.tests, output) };
}

/** Évalue un code étudiant contre les tests d'une fixture (JVM locale). */
export function evaluate(f: Fixture, code: string, built = buildTests(f)): CheckResult {
  const pre = precheck(code);
  if (pre) return pre;
  const { project, output } = runLocal(built.spec, code);
  return grade(output, project, code, built.tests);
}
