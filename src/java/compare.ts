import type { CompareOptions, ExpectedResult, JavaValue } from '@/types/bank';
import type { HarnessTestResult } from './harnessTypes';

export const DEFAULT_COMPARE: CompareOptions = { trimLines: true, ignoreTrailingEmptyLines: true, caseSensitive: true, doubleTolerance: 1e-9 };

export type Mismatch =
  | { kind: 'var'; name: string; reason: 'missing' | 'type' | 'value'; expected: JavaValue; got?: { type: string; value: unknown } }
  | { kind: 'out'; expected: string; got: string }
  | { kind: 'grid'; expected: string[]; got: string[] | null }
  | { kind: 'canvas'; diffPixels: number; total: number; sizeDiffers: boolean }
  | { kind: 'runner'; reason: 'not-reached' | 'touched' | 'absent'; at?: [number, number] }
  | { kind: 'exception'; type: string; msg: string | null; line: number }
  | { kind: 'timeout' }
  /** Test non public : détail volontairement masqué. */
  | { kind: 'hidden' };

const isNum = (t: string) => t === 'double' || t === 'float';

function sameValue(type: string, a: unknown, b: unknown, tol: number): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    const inner = type.endsWith('[]') ? type.slice(0, -2) : type;
    return a.every((x, i) => sameValue(inner, x, b[i], tol));
  }
  if (isNum(type) && typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
  return a === b;
}

export function normalizeOut(s: string, o: CompareOptions): string[] {
  let lines = s.replace(/\r\n?/g, '\n').split('\n');
  if (lines.length && lines[lines.length - 1] === '') lines.pop(); // le dernier \n ne crée pas de ligne
  if (o.collapseWhitespace) lines = [lines.join(' ').split(/\s+/).filter(Boolean).join(' ')];
  if (o.trimLines) lines = lines.map((l) => l.trim());
  if (o.ignoreTrailingEmptyLines) while (lines.length && lines[lines.length - 1] === '') lines.pop();
  if (!o.caseSensitive) lines = lines.map((l) => l.toLowerCase());
  return lines;
}

/** Décompresse un raster (w, h, paires couleur/longueur) en tableau d'indices. */
export function decodeRle(w: number, h: number, rle: number[]): Uint8Array {
  const a = new Uint8Array(w * h);
  let p = 0;
  for (let i = 0; i + 1 < rle.length; i += 2) { a.fill(rle[i]!, p, p + rle[i + 1]!); p += rle[i + 1]!; }
  return a;
}

export function compareTest(exp: ExpectedResult, act: HarnessTestResult, opts: CompareOptions): Mismatch[] {
  if (act.timeout) return [{ kind: 'timeout' }];
  if (act.exc && !exp.exception) return [{ kind: 'exception', type: act.exc.type, msg: act.exc.msg, line: act.exc.line }];
  const out: Mismatch[] = [];

  for (const [name, ev] of Object.entries(exp.vars ?? {})) {
    const got = act.caps.find((c) => c.n === name);
    if (!got) { out.push({ kind: 'var', name, reason: 'missing', expected: ev }); continue; }
    if (got.t !== ev.type) { out.push({ kind: 'var', name, reason: 'type', expected: ev, got: { type: got.t, value: got.v } }); continue; }
    if (!sameValue(ev.type, got.v, ev.value, opts.doubleTolerance)) out.push({ kind: 'var', name, reason: 'value', expected: ev, got: { type: got.t, value: got.v } });
  }

  if (exp.out !== undefined) {
    const e = normalizeOut(exp.out, opts), g = normalizeOut(act.out, opts);
    if (e.length !== g.length || e.some((l, i) => l !== g[i])) out.push({ kind: 'out', expected: exp.out, got: act.out });
  }

  if (exp.grid) {
    const g = act.grid;
    if (!g || g.length !== exp.grid.length || g.some((r, i) => r !== exp.grid![i])) out.push({ kind: 'grid', expected: exp.grid, got: g });
  }

  if (exp.canvas) {
    const c = act.canvas;
    if (!c || c.w !== exp.canvas.w || c.h !== exp.canvas.h) out.push({ kind: 'canvas', diffPixels: -1, total: exp.canvas.w * exp.canvas.h, sizeDiffers: true });
    else {
      const A = decodeRle(c.w, c.h, c.rle), B = decodeRle(exp.canvas.w, exp.canvas.h, exp.canvas.rle);
      let d = 0;
      for (let i = 0; i < A.length; i++) if (A[i] !== B[i]) d++;
      const total = A.length;
      if (d > (opts.pixelTolerance ?? 0) * total) out.push({ kind: 'canvas', diffPixels: d, total, sizeDiffers: false });
    }
  }

  if (exp.runnerReached !== undefined) {
    const r = act.runner;
    if (!r) out.push({ kind: 'runner', reason: 'absent' });
    else if (r.touched) out.push({ kind: 'runner', reason: 'touched', at: [r.x, r.y] });
    else if (r.reached !== exp.runnerReached) out.push({ kind: 'runner', reason: 'not-reached', at: [r.x, r.y] });
  }
  return out;
}

/** Résultat « attendu » extrait d'une exécution de la solution de référence (fabrication des tests). */
export function expectedFrom(act: HarnessTestResult, kind: string, allVars: { name: string; type: string; declareOnly?: boolean }[]): ExpectedResult {
  const e: ExpectedResult = {};
  const vars = allVars.filter((v) => !v.declareOnly);
  if (vars.length) {
    e.vars = {};
    for (const v of vars) {
      const c = act.caps.find((x) => x.n === v.name);
      if (!c) throw new Error(`Référence : variable « ${v.name} » non capturée`);
      e.vars[v.name] = { type: c.t as JavaValue['type'], value: c.v };
    }
  }
  if (act.out) e.out = act.out;
  if (kind === 'grid' && act.grid) e.grid = act.grid;
  if (kind === 'drawing' && act.canvas) e.canvas = { w: act.canvas.w, h: act.canvas.h, rle: act.canvas.rle };
  if (kind === 'runner' && act.runner) e.runnerReached = act.runner.reached;
  return e;
}
