import { readFileSync } from 'node:fs';
import type { DstConfig, Level } from '@/types/bank';
import { composeDst, type PoolEntry } from '@/engine/compose';
import { NOTION_SESSION } from '@/engine/notions';
import { makeRng } from '@/engine/rng';

// Mêmes tests D–G que engine.test.ts, mais sur la VRAIE banque générée (public/bank/ipa-*/index.json).
const index = JSON.parse(readFileSync('public/bank/ipa-1.0.0/index.json', 'utf8')) as { version: string; entries: PoolEntry[]; families: { id: string }[] };
const pool = index.entries;
const ctx = { pool, poolVersion: index.version, generatorVersion: '1.0.0', now: '2026-11-16T10:00:00.000Z' };
const cfg = (c: Partial<DstConfig> = {}): DstConfig => ({ scope: 'global', durationMin: 120, level: 'moyen', mode: 'examen', adaptive: true, asOfSession: 9, ...c });
const seed = (i: number) => { const r = makeRng(`reel-${i}`); return [...Array(4)].map(() => Math.floor(r.next() * 2 ** 32).toString(16).padStart(8, '0')).join(''); };
const diff = (k: string) => pool.find((e) => e.key === k)!.difficulty;
const LEVELS: Level[] = ['facile', 'moyen', 'difficile'];

describe('banque réelle', () => {
  it('structure : clés uniques, 20 notions couvertes, ≥ 2 variantes par notion, difficultés 1 à 5', () => {
    expect(new Set(pool.map((e) => e.key)).size).toBe(pool.length);
    expect(index.families.length).toBeGreaterThanOrEqual(20);
    const notions = new Set(pool.map((e) => e.notion));
    expect(notions.size).toBe(20);
    for (const n of notions) {
      const variants = new Set(pool.filter((e) => e.notion === n).map((e) => `${e.familyId}/${e.variantId}`));
      expect(variants.size, n).toBeGreaterThanOrEqual(2);
    }
    expect(new Set(pool.map((e) => e.difficulty))).toEqual(new Set([1, 2, 3, 4, 5]));
  });

  it('test E — 2 h : 8 à 15 exercices et Σ ∈ [102 ; 120] min, 3 niveaux', () => {
    for (const l of LEVELS) for (let i = 0; i < 200; i++) {
      const s = composeDst(cfg({ level: l }), seed(i), ctx);
      expect(s.items.length, `${l} #${i}`).toBeGreaterThanOrEqual(8); expect(s.items.length).toBeLessThanOrEqual(15);
      expect(s.estimatedTotalMin, `${l} #${i}`).toBeGreaterThanOrEqual(102); expect(s.estimatedTotalMin).toBeLessThanOrEqual(120);
    }
  });

  it('test F — non décroissant et écart ≥ 1 ; test G — notions distinctes et séances respectées', () => {
    const D = [15, 30, 45, 60, 90, 120, 180];
    for (let i = 0; i < 600; i++) {
      const asOf = 5 + (i % 5);
      const s = composeDst(cfg({ level: LEVELS[i % 3]!, durationMin: D[i % D.length]!, asOfSession: asOf }), seed(i), ctx);
      const es = s.items.map((it) => pool.find((e) => e.key === it.exerciseKey)!);
      const d = es.map((e) => e.difficulty);
      for (let j = 1; j < d.length; j++) expect(d[j]!).toBeGreaterThanOrEqual(d[j - 1]!);
      if (d.length >= 3) expect(d[d.length - 1]! - d[0]!, `#${i}`).toBeGreaterThanOrEqual(1);
      expect(new Set(es.map((e) => e.notion)).size, `#${i}`).toBeGreaterThanOrEqual(Math.min(5, es.length));
      for (const e of es) expect(NOTION_SESSION[e.notion]).toBeLessThanOrEqual(asOf);
      expect(new Set(es.map((e) => e.key)).size).toBe(es.length);
    }
    void diff;
  });

  it('test D — entraînement ciblé sur chaque notion couverte, 3 niveaux, 15 à 60 min', () => {
    const notions = [...new Set(pool.map((e) => e.notion))];
    let n = 0;
    for (const notion of notions) for (const level of LEVELS) for (const D of [15, 30, 60]) {
      const s = composeDst(cfg({ scope: 'notion', notions: [notion], level, durationMin: D }), seed(n++), ctx);
      expect(s.items.length).toBeGreaterThanOrEqual(2);
      for (const it of s.items) expect(pool.find((e) => e.key === it.exerciseKey)!.notion).toBe(notion);
      expect(s.items.reduce((a, b) => a + b.points, 0)).toBeCloseTo(20, 9);
    }
  });
});
