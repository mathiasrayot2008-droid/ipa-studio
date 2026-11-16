import type { ExpectedResult } from '@/types/bank';

/** Hash 32 bits (FNV-1a) en hexadécimal. */
export function fnv1a(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

const round = (v: unknown): unknown => (typeof v === 'number' && !Number.isInteger(v) ? Number(v.toPrecision(9)) : Array.isArray(v) ? v.map(round) : v);

/**
 * Empreinte du COMPORTEMENT observé sur un test (variables capturées, sortie, grille…), indépendante de la mise en forme
 * insignifiante : sert à reconnaître une erreur-type connue (mutant) dans le code d'un étudiant, sans comparer son code.
 */
export function fingerprintResult(r: ExpectedResult & { exception?: string }): string {
  const vars = r.vars ? Object.keys(r.vars).sort().map((k) => [k, round(r.vars![k]!.value)]) : undefined;
  const out = r.out === undefined ? undefined : r.out.replace(/\r\n?/g, '\n').split('\n').map((l) => l.trim()).join('\n').replace(/\n+$/, '');
  return fnv1a(JSON.stringify({ vars, out, grid: r.grid, canvas: r.canvas ? fnv1a(JSON.stringify(r.canvas.rle)) : undefined, runner: r.runnerReached, exc: r.exception }));
}
