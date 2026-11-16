import type { CompareOptions, ExpectedResult, JavaValue, TestCase } from '@/types/bank';
import { compareTest, DEFAULT_COMPARE, type Mismatch } from './compare';
import { translateEcj, translateException, type FrMessage } from './ecjMessagesFr';
import type { HarnessOutput, HarnessTestResult } from './harnessTypes';
import type { BuiltProject } from './template';
import { checkBalance } from './balance';

export interface FrDiagnostic { line: number; fr: string; hint?: string; original: string; snippet?: string; tag: string }

export interface TestVerdict {
  id: string;
  visibility: TestCase['visibility'];
  weight: number;
  passed: boolean;
  ms: number;
  mismatches: Mismatch[];
  /** Exécution complète : transmise à l'UI seulement pour les tests publics (les autres restent opaques). */
  actual?: HarnessTestResult;
  /** Entrées, scène et résultat attendu : tests publics uniquement (retirés par redactHidden). */
  inputs?: Record<string, JavaValue>;
  scene?: TestCase['scene'];
  expected?: ExpectedResult;
  skipped: boolean;
}

export type CheckStatus = 'reussi' | 'partiel' | 'echoue' | 'compilation' | 'interdit' | 'crash';

export interface CheckResult {
  status: CheckStatus;
  score: number;         // 0..1
  passed: number;
  total: number;
  diagnostics: FrDiagnostic[];
  verdicts: TestVerdict[];
  errorTags: string[];
  forbidden?: string;
  debug: string;         // sortie debug() du premier test public
  stdout: string;        // System.out éventuel (non noté)
  compileMs?: number;
  runMs?: number;
  internalError?: string;
}

export const DEFAULT_WEIGHT: Record<TestCase['visibility'], number> = { public: 1, hidden: 2, edge: 2 };

function diag(raw: { line: number; msg: string }, code: string, proj: BuiltProject): FrDiagnostic {
  const base = translateEcj(raw.msg);
  const sline = raw.line - proj.lineOffset;
  const lines = code.replace(/\r\n?/g, '\n').split('\n');
  if (sline >= 1 && sline <= proj.studentLines) return { line: sline, ...base, original: raw.msg, snippet: lines[sline - 1] };
  // Ligne de capture (après le code étudiant)
  const v = proj.expectedVariables.find((n) => raw.msg.startsWith(n + ' cannot be resolved'));
  if (v) return { line: proj.studentLines, tag: 'compile:missing-expected-var', fr: `La variable « ${v} » demandée par l'énoncé n'est pas déclarée (ou pas visible à la fin de ton code).`, hint: 'Déclare-la au niveau principal, pas à l’intérieur d’un if ou d’une boucle.', original: raw.msg };
  if (/^Unreachable code$/.test(raw.msg)) return { line: proj.studentLines, tag: 'compile:unreachable-end', fr: 'Ton code se termine par un return (ou une boucle infinie) : la suite de l’exercice ne peut jamais être atteinte.', original: raw.msg };
  return { line: Math.max(1, Math.min(proj.studentLines, sline)), tag: 'compile:template', fr: base.fr, hint: base.hint, original: raw.msg };
}

/** Échec avant même de lancer Java : accolades/parenthèses déséquilibrées. */
export function precheck(code: string): CheckResult | null {
  const b = checkBalance(code);
  if (!b) return null;
  const line = code.replace(/\r\n?/g, '\n').split('\n')[b.line - 1];
  return {
    status: 'compilation', score: 0, passed: 0, total: 0, verdicts: [], debug: '', stdout: '',
    diagnostics: [{ line: b.line, tag: 'compile:balance', fr: b.message, original: b.message, snippet: line }],
    errorTags: ['compile:balance'],
  };
}

export function grade(
  out: HarnessOutput,
  proj: BuiltProject,
  code: string,
  tests: Pick<TestCase, 'id' | 'visibility' | 'weight' | 'expected' | 'inputs' | 'scene'>[],
  compare: CompareOptions = DEFAULT_COMPARE,
): CheckResult {
  const empty = { score: 0, passed: 0, total: tests.length, verdicts: [] as TestVerdict[], debug: '', stdout: '' };
  if (out.phase === 'compile') {
    const ds = out.diagnostics.filter((d) => d.kind === 'error').slice(0, 5).map((d) => diag(d, code, proj));
    return { ...empty, status: 'compilation', diagnostics: ds, errorTags: [...new Set(ds.map((d) => d.tag))], compileMs: out.compileMs };
  }
  if (out.phase === 'forbidden') {
    return { ...empty, status: 'interdit', diagnostics: [], errorTags: ['forbidden'], forbidden: out.what, compileMs: out.compileMs };
  }
  if (out.phase !== 'run') return { ...empty, status: 'crash', diagnostics: [], errorTags: ['internal'], internalError: 'error' in out ? out.error : 'Réponse inattendue du moteur Java.' };

  const verdicts: TestVerdict[] = tests.map((t) => {
    const act = out.tests.find((x) => x.id === t.id);
    if (!act || act.skipped) return { id: t.id, visibility: t.visibility, weight: t.weight, passed: false, ms: 0, mismatches: [{ kind: 'timeout' }], skipped: true };
    const mm = compareTest(t.expected, act, compare);
    return { id: t.id, visibility: t.visibility, weight: t.weight, passed: mm.length === 0, ms: act.ms, mismatches: mm, actual: act, skipped: false, inputs: t.inputs, scene: t.scene, expected: t.expected };
  });

  const tags = new Set<string>();
  for (const v of verdicts) for (const m of v.mismatches) {
    if (m.kind === 'exception') tags.add(translateException(m.type, m.msg).tag);
    else if (m.kind === 'timeout') tags.add('runtime:timeout');
    else if (m.kind === 'hidden') continue;
    else if (m.kind === 'var') tags.add(`wrong:var-${m.reason}`);
    else tags.add(`wrong:${m.kind}`);
  }
  const wsum = verdicts.reduce((s, v) => s + v.weight, 0) || 1;
  const wok = verdicts.reduce((s, v) => s + (v.passed ? v.weight : 0), 0);
  const passed = verdicts.filter((v) => v.passed).length;
  const first = verdicts.find((v) => v.actual);
  const status: CheckStatus = out.hung ? 'crash' : passed === verdicts.length ? 'reussi' : passed === 0 ? 'echoue' : 'partiel';
  return {
    status, score: wok / wsum, passed, total: verdicts.length, diagnostics: [], verdicts, errorTags: [...tags],
    debug: first?.actual?.dbg ?? '', stdout: verdicts.map((v) => v.actual?.stdout ?? '').join(''),
    compileMs: out.compileMs, runMs: out.runMs,
    internalError: out.hung ? 'Le programme ne répond plus (arrêt forcé).' : undefined,
  };
}

export const exceptionMessage = (m: Extract<Mismatch, { kind: 'exception' }>): FrMessage => translateException(m.type, m.msg);

/** Retire des verdicts non publics tout ce qui permettrait de reconstituer les tests cachés. */
export function redactHidden(r: CheckResult): CheckResult {
  return {
    ...r,
    verdicts: r.verdicts.map((v) => (v.visibility === 'public' ? v : { ...v, actual: undefined, inputs: undefined, scene: undefined, expected: undefined, mismatches: v.mismatches.length ? [{ kind: 'hidden' } as Mismatch] : [] })),
  };
}
