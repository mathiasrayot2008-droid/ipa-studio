import type { DstSubject } from '@/types/bank';

export const HINT_PENALTIES: [number, number, number] = [0.1, 0.25, 0.5];
export const DEFAULT_HINT_POLICY: DstSubject['hintPolicy'] = { penalties: HINT_PENALTIES, solutionRevealedScore: 0 };

/** Barème sur 20 : p_i ∝ minutes^0,8 × (1 + 0,15·(d−1)), arrondi à 0,5 ; le reliquat va au dernier exercice. Σ = 20 exactement. */
export function allocatePoints(items: { minutes: number; difficulty: number }[], total = 20): number[] {
  if (!items.length) return [];
  const raw = items.map((x) => Math.pow(Math.max(1, x.minutes), 0.8) * (1 + 0.15 * (x.difficulty - 1)));
  const sum = raw.reduce((a, b) => a + b, 0);
  const pts = raw.map((r) => Math.max(0.5, Math.round(((r / sum) * total) / 0.5) * 0.5));
  // Reliquat d'arrondi : on le met sur le dernier exercice, ou on rogne les plus gros si ça déborde.
  let rest = total - pts.reduce((a, b) => a + b, 0);
  pts[pts.length - 1]! += rest;
  rest = 0;
  for (let guard = 0; pts[pts.length - 1]! < 0.5 && guard < 100; guard++) {
    const j = pts.indexOf(Math.max(...pts));
    pts[j]! -= 0.5; pts[pts.length - 1]! += 0.5;
  }
  return pts;
}

export interface ExerciseOutcome { score: number; hintsUsed: 0 | 1 | 2 | 3; solutionShown: boolean }
export interface DstGrade {
  perItem: { exerciseKey: string; points: number; earned: number; score: number; penalty: number }[];
  points: number; outOf: number; note20: number;
}

/** Facteur appliqué aux points d'un exercice : 0 si la solution a été vue, sinon 1 − pénalité du plus haut indice utilisé. */
export function hintFactor(o: Pick<ExerciseOutcome, 'hintsUsed' | 'solutionShown'>, policy = DEFAULT_HINT_POLICY): number {
  if (o.solutionShown) return policy.solutionRevealedScore;
  return o.hintsUsed === 0 ? 1 : 1 - policy.penalties[o.hintsUsed - 1]!;
}

/** Note d'un DST : Σ points × score_tests × (1 − pénalité). Un exercice non rendu vaut 0. */
export function gradeDst(subject: Pick<DstSubject, 'items' | 'hintPolicy'>, outcomes: Record<string, ExerciseOutcome | undefined>): DstGrade {
  const perItem = subject.items.map((it) => {
    const o = outcomes[it.exerciseKey];
    const score = o ? Math.min(1, Math.max(0, o.score)) : 0;
    const factor = o ? hintFactor(o, subject.hintPolicy) : 0;
    return { exerciseKey: it.exerciseKey, points: it.points, score, penalty: o ? 1 - factor : 1, earned: it.points * score * factor };
  });
  const points = perItem.reduce((s, x) => s + x.earned, 0);
  const outOf = subject.items.reduce((s, x) => s + x.points, 0);
  return { perItem, points, outOf, note20: Math.round((points / (outOf || 1)) * 20 * 10) / 10 };
}
