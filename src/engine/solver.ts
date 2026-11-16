import type { Level } from '@/types/bank';

/** Bandes de difficulté visées par niveau (échelle 1–5), docs/04 §2. */
export const LEVEL_BAND: Record<Level, [number, number]> = { facile: [1.0, 2.8], moyen: [1.6, 3.8], difficile: [2.4, 5.0] };

const MINUTES_BY_DIFFICULTY: [number, number][] = [[1, 4], [2, 7], [3, 11], [4, 15], [5, 20]];

/** Temps de base (minutes) d'un exercice de difficulté d (interpolation linéaire). */
export function baseMinutes(d: number): number {
  const x = Math.min(5, Math.max(1, d));
  for (let i = 0; i < MINUTES_BY_DIFFICULTY.length - 1; i++) {
    const [d0, t0] = MINUTES_BY_DIFFICULTY[i]!; const [d1, t1] = MINUTES_BY_DIFFICULTY[i + 1]!;
    if (x <= d1) return t0 + ((x - d0) / (d1 - d0)) * (t1 - t0);
  }
  return 20;
}

const SIZE_TABLE: [number, [number, number]][] = [[15, [2, 4]], [30, [4, 6]], [45, [5, 8]], [60, [6, 9]], [90, [7, 12]], [120, [8, 15]]];

/** Plage indicative du nombre d'exercices pour une durée D (minutes). */
export function sizeRange(D: number): [number, number] {
  if (D <= SIZE_TABLE[0]![0]) return SIZE_TABLE[0]![1];
  for (let i = 0; i < SIZE_TABLE.length - 1; i++) {
    const [d0, [a0, b0]] = SIZE_TABLE[i]!; const [d1, [a1, b1]] = SIZE_TABLE[i + 1]!;
    if (D <= d1) { const f = (D - d0) / (d1 - d0); return [a0 + f * (a1 - a0), b0 + f * (b1 - b0)]; }
  }
  const [, [a, b]] = SIZE_TABLE[SIZE_TABLE.length - 1]!;
  return [(a * D) / 120, (b * D) / 120];
}

export interface RampPlan {
  n: number;
  /** Difficulté visée pour chaque créneau, strictement croissante. */
  targets: number[];
  /** Facteur de longueur des variantes (ajuste le temps par exercice pour tenir la durée). */
  k: number;
  delta: number;
  gamma: number;
  /** Durée estimée du plan (min). */
  estimatedMin: number;
  /** Vrai si le sommet de la rampe a dû être abaissé (format court). */
  lowered: boolean;
}

/** Cherche (n, δ, γ) minimisant l'écart de durée et la déformation de la rampe (docs/04 §2 étape 3). */
export function planRamp(D: number, level: Level): RampPlan {
  const [lo, hi] = LEVEL_BAND[level];
  const [nmin, nmax] = sizeRange(D);
  let best: (RampPlan & { cost: number }) | null = null;
  for (let n = Math.max(2, Math.floor(nmin) - 1); n <= Math.ceil(nmax) + 2; n++) {
    for (const delta of [0, 0.3, 0.6, 0.9, 1.2]) {
      const top = hi - delta;
      if (top < lo + 0.2) continue;
      for (const gamma of [0.7, 1, 1.4]) {
        const targets = Array.from({ length: n }, (_, i) => lo + (top - lo) * Math.pow(n === 1 ? 1 : i / (n - 1), gamma));
        const sumT = targets.reduce((s, d) => s + baseMinutes(d), 0);
        const k = Math.min(1.25, Math.max(0.8, (0.92 * D) / sumT));
        const out = Math.max(0, nmin - n, n - nmax);
        const cost = 10 * Math.abs((sumT * k) / (0.92 * D) - 1) + 2 * out + 1.5 * delta + 0.3 * Math.abs(gamma - 1);
        if (!best || cost < best.cost - 1e-9) best = { n, targets, k, delta, gamma, estimatedMin: sumT * k, lowered: delta > 0, cost };
      }
    }
  }
  if (!best) throw new Error('planRamp : aucun plan');
  const { cost: _c, ...plan } = best;
  return plan;
}
