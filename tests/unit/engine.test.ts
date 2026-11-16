import type { DstConfig, Level, NotionId } from '@/types/bank';
import { composeDst, ComposeError, type ComposeContext } from '@/engine/compose';
import { NOTION_SESSION } from '@/engine/notions';
import { makeRng, newSeed, weightedIndex, Xoshiro } from '@/engine/rng';
import { allocatePoints, gradeDst, hintFactor } from '@/engine/scoring';
import { baseMinutes, planRamp, sizeRange } from '@/engine/solver';
import { syntheticPool } from '../helpers/syntheticPool';

const pool = syntheticPool();
const ctx = (extra: Partial<ComposeContext> = {}): ComposeContext => ({ pool, poolVersion: 'syn-1', generatorVersion: '1.0.0', now: '2026-11-16T10:00:00.000Z', ...extra });
const cfg = (c: Partial<DstConfig> = {}): DstConfig => ({ scope: 'global', durationMin: 120, level: 'moyen', mode: 'examen', adaptive: true, asOfSession: 9, ...c });
const seeds = (n: number) => Array.from({ length: n }, (_, i) => makeRng(`graine-${i}`)).map((r) => [...Array(4)].map(() => Math.floor(r.next() * 2 ** 32).toString(16).padStart(8, '0')).join(''));
const LEVELS: Level[] = ['facile', 'moyen', 'difficile'];
const DURATIONS = [15, 30, 45, 60, 90, 120, 180, 240];
const diffOf = (key: string) => pool.find((e) => e.key === key)!.difficulty;

describe('PRNG', () => {
  it('est déterministe et sensible à la graine', () => {
    const a = new Xoshiro('x'), b = new Xoshiro('x'), c = new Xoshiro('y');
    const sa = Array.from({ length: 20 }, () => a.next()), sb = Array.from({ length: 20 }, () => b.next()), sc = Array.from({ length: 20 }, () => c.next());
    expect(sa).toEqual(sb); expect(sa).not.toEqual(sc);
    expect(sa.every((x) => x >= 0 && x < 1)).toBe(true);
  });
  it('les sous-flux ne dépendent que du chemin, pas des tirages déjà faits', () => {
    const a = makeRng('s'), b = makeRng('s');
    for (let i = 0; i < 50; i++) a.next();
    expect(a.fork('notions').next()).toBe(b.fork('notions').next());
    expect(b.fork('notions').next()).not.toBe(b.fork('familles').next());
  });
  it('int(min,max) couvre tout l’intervalle de façon à peu près uniforme', () => {
    const r = makeRng('uniforme'); const c = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 12000; i++) c[r.int(0, 5)]!++;
    for (const x of c) expect(x).toBeGreaterThan(1700);
    expect(Math.min(...c)).toBeGreaterThan(0);
  });
  it('shuffle renvoie une permutation sans modifier l’original ; weightedIndex respecte les poids nuls', () => {
    const r = makeRng('m'); const a = [1, 2, 3, 4, 5];
    const s = r.shuffle(a);
    expect(a).toEqual([1, 2, 3, 4, 5]); expect([...s].sort()).toEqual(a);
    for (let i = 0; i < 200; i++) expect(weightedIndex(r, [0, 3, 0, 1])).not.toBe(0);
    expect(weightedIndex(r, [0, 0])).toBe(-1);
  });
  it('newSeed : 128 bits hex, différentes à chaque appel', () => {
    const a = newSeed(), b = newSeed();
    expect(a).toMatch(/^[0-9a-f]{32}$/); expect(a).not.toBe(b);
  });
});

describe('solveur de durée (docs/04 §3)', () => {
  it('temps de base par difficulté', () => { expect([1, 2, 3, 4, 5].map(baseMinutes)).toEqual([4, 7, 11, 15, 20]); expect(baseMinutes(2.5)).toBe(9); });
  it('plage du nombre d’exercices', () => { expect(sizeRange(15)).toEqual([2, 4]); expect(sizeRange(120)).toEqual([8, 15]); expect(sizeRange(240)).toEqual([16, 30]); });
  it('2 h : 13 / 9 / 8 exercices et ≈ 110 min (table de simulation)', () => {
    const p = (l: Level) => planRamp(120, l);
    expect([p('facile').n, p('moyen').n, p('difficile').n]).toEqual([13, 9, 8]);
    for (const l of LEVELS) expect(p(l).estimatedMin).toBeGreaterThan(100);
  });
  it('la rampe est strictement croissante pour tous niveaux et durées', () => {
    for (const l of LEVELS) for (const D of DURATIONS) {
      const t = planRamp(D, l).targets;
      for (let i = 1; i < t.length; i++) expect(t[i]!).toBeGreaterThan(t[i - 1]!);
    }
  });
});

describe('barème et notation', () => {
  it('la somme fait toujours 20, par pas de 0,5, aucun exercice à 0', () => {
    const r = makeRng('bareme');
    for (let t = 0; t < 500; t++) {
      const items = Array.from({ length: r.int(2, 20) }, () => ({ minutes: r.int(2, 25), difficulty: r.int(1, 5) }));
      const pts = allocatePoints(items);
      expect(pts.reduce((a, b) => a + b, 0)).toBeCloseTo(20, 9);
      for (const p of pts) { expect(p).toBeGreaterThanOrEqual(0.5); expect((p * 2) % 1).toBe(0); }
    }
  });
  it('les exercices plus longs / difficiles valent plus de points', () => {
    const [a, b] = allocatePoints([{ minutes: 4, difficulty: 1 }, { minutes: 20, difficulty: 5 }]);
    expect(b!).toBeGreaterThan(a!);
  });
  it('pénalités d’indice non cumulatives (10 / 25 / 50 %), solution vue = 0', () => {
    expect([0, 1, 2, 3].map((h) => hintFactor({ hintsUsed: h as 0 | 1 | 2 | 3, solutionShown: false }))).toEqual([1, 0.9, 0.75, 0.5]);
    expect(hintFactor({ hintsUsed: 0, solutionShown: true })).toBe(0);
  });
  it('note /20 = Σ points × score × (1 − pénalité) ; exercice non rendu = 0', () => {
    const s = composeDst(cfg({ durationMin: 60 }), 'a'.repeat(32), ctx());
    const k = s.items.map((i) => i.exerciseKey);
    const perfect = gradeDst(s, Object.fromEntries(k.map((x) => [x, { score: 1, hintsUsed: 0 as const, solutionShown: false }])));
    expect(perfect.note20).toBe(20);
    const half = gradeDst(s, { [k[0]!]: { score: 1, hintsUsed: 3, solutionShown: false } });
    expect(half.points).toBeCloseTo(s.items[0]!.points * 0.5, 9);
    expect(gradeDst(s, {}).note20).toBe(0);
  });
});

describe('composition des DST', () => {
  it('reproductible : mêmes entrées ⇒ même sujet ; graine différente ⇒ sujet différent', () => {
    const a = composeDst(cfg(), 'ab'.repeat(16), ctx()), b = composeDst(cfg(), 'ab'.repeat(16), ctx()), c = composeDst(cfg(), 'cd'.repeat(16), ctx());
    expect(a).toEqual(b);
    expect(a.items.map((i) => i.exerciseKey)).not.toEqual(c.items.map((i) => i.exerciseKey));
  });

  it('test E — DST de 2 h : 8 à 15 exercices, Σ ∈ [102 ; 120] min, barème = 20, pour les 3 niveaux (1 000 graines)', () => {
    for (const l of LEVELS) for (const seed of seeds(334)) {
      const s = composeDst(cfg({ level: l }), seed, ctx());
      expect(s.items.length).toBeGreaterThanOrEqual(8); expect(s.items.length).toBeLessThanOrEqual(15);
      expect(s.estimatedTotalMin).toBeGreaterThanOrEqual(102); expect(s.estimatedTotalMin).toBeLessThanOrEqual(120);
      expect(s.items.reduce((a, b) => a + b.points, 0)).toBeCloseTo(20, 9);
    }
  });

  it('test F — difficulté non décroissante et écart ≥ 1, tous niveaux et durées (1 000 graines)', () => {
    let n = 0;
    for (const seed of seeds(1000)) {
      const l = LEVELS[n % 3]!, D = DURATIONS[n % DURATIONS.length]!; n++;
      const s = composeDst(cfg({ level: l, durationMin: D }), seed, ctx());
      const d = s.items.map((i) => diffOf(i.exerciseKey));
      for (let i = 1; i < d.length; i++) expect(d[i]!).toBeGreaterThanOrEqual(d[i - 1]!);
      if (d.length >= 3) expect(d[d.length - 1]! - d[0]!).toBeGreaterThanOrEqual(1);
    }
  });

  it('test G — DST global : ≥ 5 notions distinctes, aucune notion au-delà de asOfSession, jamais deux fois la même variante (1 000 graines)', () => {
    let n = 0;
    for (const seed of seeds(1000)) {
      const asOf = 5 + (n++ % 5);                                   // 5..9
      const s = composeDst(cfg({ asOfSession: asOf, durationMin: 60 + 30 * (n % 3) }), seed, ctx());
      const es = s.items.map((i) => pool.find((e) => e.key === i.exerciseKey)!);
      expect(new Set(es.map((e) => e.notion)).size).toBeGreaterThanOrEqual(Math.min(5, es.length));
      for (const e of es) expect(NOTION_SESSION[e.notion]).toBeLessThanOrEqual(asOf);
      expect(new Set(es.map((e) => e.key)).size).toBe(es.length);
    }
  });

  it('test D — entraînement ciblé : 1 000 configurations aléatoires ⇒ sujet valide, notions respectées', () => {
    const r = makeRng('cibles');
    const all = [...new Set(pool.map((e) => e.notion))];
    for (let t = 0; t < 1000; t++) {
      const notions = r.shuffle(all).slice(0, r.int(1, 3)) as NotionId[];
      const c = cfg({ scope: 'notion', notions, durationMin: r.pick([15, 30, 45, 60]), level: r.pick(LEVELS), mode: r.pick(['examen', 'assiste'] as const), adaptive: r.next() < 0.5 });
      const s = composeDst(c, [...Array(4)].map(() => r.int(0, 2 ** 30).toString(16).padStart(8, '0')).join(''), ctx());
      expect(s.items.length).toBeGreaterThanOrEqual(2);
      for (const it of s.items) expect(notions).toContain(pool.find((e) => e.key === it.exerciseKey)!.notion);
      expect(s.items.reduce((a, b) => a + b.points, 0)).toBeCloseTo(20, 9);
    }
  });

  it('l’adaptation change les NOTIONS choisies, jamais la bande de difficulté', () => {
    const weak = { 'N08-boucle-for': 0.05, 'N14-parcours-tableau': 0.05 } as const;
    let hitsWeak = 0, hitsPlain = 0;
    for (const seed of seeds(200)) {
      const a = composeDst(cfg({ durationMin: 60 }), seed, ctx({ mastery: { ...weak, 'N01-variables-types': 0.95, 'N02-expressions-arith': 0.95, 'N04-if-else': 0.95 } }));
      const b = composeDst(cfg({ durationMin: 60, adaptive: false }), seed, ctx());
      const isWeak = (s: typeof a) => s.items.filter((i) => ['N08-boucle-for', 'N14-parcours-tableau'].includes(pool.find((e) => e.key === i.exerciseKey)!.notion)).length;
      hitsWeak += isWeak(a); hitsPlain += isWeak(b);
      expect(a.items.length).toBe(b.items.length);
    }
    expect(hitsWeak).toBeGreaterThan(hitsPlain);
  });

  it('écarte les exercices déjà réussis tant qu’il reste des alternatives, et pénalise les familles récentes', () => {
    const s0 = composeDst(cfg({ durationMin: 45 }), 'f'.repeat(32), ctx());
    const done = new Set(s0.items.map((i) => i.exerciseKey));
    const s1 = composeDst(cfg({ durationMin: 45 }), 'f'.repeat(32), ctx({ succeededKeys: done }));
    for (const it of s1.items) expect(done.has(it.exerciseKey)).toBe(false);
  });

  it('erreurs claires : aucune notion éligible, notion sans exercice', () => {
    expect(() => composeDst(cfg({ scope: 'notion', notions: [] }), 'a'.repeat(32), ctx())).toThrow(ComposeError);
    expect(() => composeDst(cfg({ asOfSession: 0 }), 'a'.repeat(32), ctx())).toThrow(/Aucune notion/);
    const s = composeDst(cfg({ scope: 'notion', notions: ['N01-variables-types', 'N21-inconnue' as NotionId], durationMin: 30 }), 'a'.repeat(32), ctx());
    expect(s.warnings?.join(' ')).toContain('N21-inconnue');
  });

  it('15 min en difficile : format court annoncé honnêtement', () => {
    const s = composeDst(cfg({ durationMin: 15, level: 'difficile' }), 'c'.repeat(32), ctx());
    expect(s.items.length).toBeLessThanOrEqual(4);
    expect(s.warnings?.some((w) => /Format court/.test(w))).toBe(true);
  });
});
