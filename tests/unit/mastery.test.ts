import { EMPTY_MASTERY, type MasteryDoc } from '@/data/types';
import { applyEvidence, autonomy, estimateAt, estimateFrom, evidenceOf, familyOfKey, globalMastery, isAcquired, levelOf, recomputeMastery, timeFactor, triesFactor, type AttemptFacts, type ExerciseMeta } from '@/engine/mastery';
import { makeRng } from '@/engine/rng';

const DAY = 86_400_000;
const T0 = Date.parse('2026-11-01T10:00:00Z');
const ex = (key: string, d = 3, secondary: ExerciseMeta['notions']['secondary'] = []): ExerciseMeta => ({ key, notions: { primary: 'N08-boucle-for', secondary }, difficulty: d, estimatedMinutes: 10 });
const att = (over: Partial<AttemptFacts> = {}, t = T0): AttemptFacts => ({ score: 1, hintsUsed: 0, solutionShown: false, durationSec: 300, attemptsBefore: 0, context: 'tp', createdAt: new Date(t).toISOString(), status: 'reussi', ...over });
const empty = (): MasteryDoc => ({ ...EMPTY_MASTERY, notions: {}, errorTagCounts: {}, totals: { attempts: 0, successes: 0 } });
const feed = (doc: MasteryDoc, a: AttemptFacts, e: ExerciseMeta, t: number, before = false) =>
  applyEvidence(doc, evidenceOf(a, e, { succeededBefore: before }), { now: t, familyId: familyOfKey(e.key), isNewSuccess: a.status === 'reussi' && !before, success: a.status === 'reussi' });

describe('modèle de maîtrise (docs/04 §7)', () => {
  it('une seule réussite parfaite en difficulté 3 donne 56 % : une réussite ne suffit jamais', () => {
    const d = feed(empty(), att(), ex('fam.a.v.01'), T0);
    expect(estimateAt(d.notions['N08-boucle-for'], d.updatedAt, T0)).toBeCloseTo(2.5 / 4.5, 9);
  });

  it('12 réussites autonomes, variées et récentes (d3) atteignent ≥ 90 % et le statut « acquise » ; 11 familles différentes ne suffisent pas sans nouveauté récente', () => {
    let d = empty();
    for (let i = 0; i < 12; i++) d = feed(d, att({}, T0 + i * 1000), ex(`fam.f${i % 4}.v.${i}`), T0 + i * 1000);
    const now = T0 + 12_000;
    const m = d.notions['N08-boucle-for'];
    expect(estimateAt(m, d.updatedAt, now)).toBeGreaterThanOrEqual(0.9);
    expect(m!.distinctFamiliesSucceeded).toBe(4);
    expect(isAcquired(m, d.updatedAt, now)).toBe(true);
    expect(levelOf(m, d.updatedAt, now)).toBe('acquise');
    // Le même niveau d'estimation, mais une seule famille : pas « acquise ».
    let one = empty();
    for (let i = 0; i < 12; i++) one = feed(one, att({}, T0 + i * 1000), ex(`fam.same.v.${i}`), T0 + i * 1000);
    expect(isAcquired(one.notions['N08-boucle-for'], one.updatedAt, now)).toBe(false);
    // Sans réussite sur exercice nouveau depuis plus de 30 jours : plus « acquise » (et l'estimation a décru).
    expect(isAcquired(m, d.updatedAt, now + 45 * DAY)).toBe(false);
  });

  it('indices, solution vue, essais et lenteur réduisent la preuve', () => {
    expect([0, 1, 2, 3].map((h) => autonomy(h as 0 | 1 | 2 | 3, false))).toEqual([1, 0.85, 0.65, 0.4]);
    expect(autonomy(0, true)).toBe(0);
    expect([1, 2, 3, 4, 9].map(triesFactor)).toEqual([1, 1, 0.9, 0.8, 0.5]);
    expect(timeFactor(10, 600)).toBe(1);
    expect(timeFactor(10, 6000)).toBe(0.7);
    expect(timeFactor(10, 1200)).toBeCloseTo(Math.pow(0.5, 0.3), 9);
    const full = evidenceOf(att(), ex('fam.a.v.1'), { succeededBefore: false })[0]!;
    const hinted = evidenceOf(att({ hintsUsed: 2 }), ex('fam.a.v.1'), { succeededBefore: false })[0]!;
    expect(hinted.e).toBeCloseTo(full.e * 0.65, 9);
    expect(evidenceOf(att({ solutionShown: true }), ex('fam.a.v.1'), { succeededBefore: false })[0]!.e).toBe(0);
  });

  it('poids : difficulté, nouveauté (0,4 si déjà réussi, 0,5 si essai répété), notion secondaire ×0,4', () => {
    const e1 = evidenceOf(att(), ex('k', 1), { succeededBefore: false })[0]!;
    const e5 = evidenceOf(att(), ex('k', 5), { succeededBefore: false })[0]!;
    expect(e1.w).toBe(1); expect(e5.w).toBe(2);
    expect(evidenceOf(att(), ex('k', 3), { succeededBefore: true })[0]!.w).toBeCloseTo(1.5 * 0.4, 9);
    expect(evidenceOf(att({ attemptsBefore: 1, status: 'echoue', score: 0 }), ex('k', 3), { succeededBefore: false })[0]!.w).toBeCloseTo(1.5 * 0.5, 9);
    const both = evidenceOf(att(), ex('k', 3, ['N10-accumulateurs-compteurs']), { succeededBefore: false });
    expect(both[1]!.w).toBeCloseTo(both[0]!.w * 0.4, 9);
  });

  it('un DST ne subit pas le facteur « temps » (la durée mesurée est celle du DST entier)', () => {
    const slow = evidenceOf(att({ context: 'dst', durationSec: 99_999 }), ex('k', 3), { succeededBefore: false })[0]!;
    expect(slow.e).toBe(1);
  });

  it('la récence décale Σ w·e et Σ w du même facteur : demi-vie de 30 jours', () => {
    const d = feed(empty(), att(), ex('fam.a.v.01'), T0);
    const m = d.notions['N08-boucle-for']!;
    expect(estimateAt(m, d.updatedAt, T0 + 30 * DAY)).toBeCloseTo((1 + 0.5 * m.evidence) / (3 + 0.5 * m.weightSum), 9);
    expect(estimateAt(m, d.updatedAt, T0 + 3000 * DAY)).toBeCloseTo(estimateFrom(0, 0), 3); // tout s'efface : retour à l'a priori
  });

  it('l’agrégat incrémental est identique au recalcul complet depuis l’historique (200 séquences aléatoires)', () => {
    const rng = makeRng('mastery-prop');
    const notions = ['N08-boucle-for', 'N09-boucle-while', 'N10-accumulateurs-compteurs'] as const;
    for (let run = 0; run < 200; run++) {
      const metas = new Map<string, ExerciseMeta>();
      const attempts: (AttemptFacts & { exerciseKey: string; errorTags: string[] })[] = [];
      let doc = empty(); const succ = new Set<string>(); const tries = new Map<string, number>();
      let t = T0;
      const n = rng.int(1, 25);
      for (let i = 0; i < n; i++) {
        t += rng.int(1, 5 * DAY);
        const key = `fam.f${rng.int(0, 4)}.v${rng.int(0, 2)}.${rng.int(1, 4)}`;
        const m: ExerciseMeta = metas.get(key) ?? { key, notions: { primary: rng.pick(notions), secondary: rng.next() < 0.4 ? [rng.pick(notions)] : [] }, difficulty: rng.int(1, 5), estimatedMinutes: rng.int(4, 15) };
        metas.set(key, m);
        const k = tries.get(key) ?? 0;
        const score = rng.next() < 0.5 ? 1 : rng.next();
        const a: AttemptFacts & { exerciseKey: string; errorTags: string[] } = { exerciseKey: key, errorTags: rng.next() < 0.3 ? ['wrong:var-value'] : [], ...att({ score, status: score === 1 ? 'reussi' : 'partiel', hintsUsed: rng.pick([0, 0, 1, 2, 3]) as 0 | 1 | 2 | 3, attemptsBefore: k, durationSec: rng.int(60, 1500), context: rng.pick(['tp', 'dst'] as const) }, t) };
        doc = feed(doc, a, m, t, succ.has(key));
        doc = { ...doc, errorTagCounts: { ...doc.errorTagCounts } };
        attempts.push(a); tries.set(key, k + 1);
        if (a.status === 'reussi') succ.add(key);
      }
      const now = t + rng.int(0, 90 * DAY);
      const full = recomputeMastery(attempts, (k) => metas.get(k), now);
      for (const nn of notions) {
        const x = estimateAt(doc.notions[nn], doc.updatedAt, now); const y = estimateAt(full.notions[nn], full.updatedAt, now);
        expect(Math.abs(x - y), `run ${run} ${nn}`).toBeLessThan(1e-9);
        expect(doc.notions[nn]?.distinctFamiliesSucceeded ?? 0).toBe(full.notions[nn]?.distinctFamiliesSucceeded ?? 0);
      }
      expect(full.totals.attempts).toBe(doc.totals.attempts);
    }
  });

  it('maîtrise globale : moyenne pondérée ; une notion jamais travaillée vaut l’a priori (33 %)', () => {
    const d = feed(empty(), att(), ex('fam.a.v.01'), T0);
    const g = globalMastery(d, ['N08-boucle-for', 'N09-boucle-while'], { 'N08-boucle-for': 3, 'N09-boucle-while': 1 }, T0);
    expect(g).toBeCloseTo((3 * (2.5 / 4.5) + 1 * (1 / 3)) / 4, 9);
    expect(levelOf(undefined, 0, T0)).toBe('non-travaillee');
  });
});

import { sameModuloFormat } from '@/java/grade';
describe('étiquette output:format', () => {
  it('reconnaît une sortie juste mais mal présentée, jamais une sortie fausse', () => {
    expect(sameModuloFormat('Bonjour le monde', 'bonjour  le monde')).toBe(true);
    expect(sameModuloFormat('3 5 8', '3,5,8')).toBe(true);
    expect(sameModuloFormat('Éléphant', 'elephant')).toBe(true);
    expect(sameModuloFormat('3 5 8', '3 5 9')).toBe(false);
    expect(sameModuloFormat('abc', 'abc')).toBe(false); // identique : ce n'est pas une différence de format
    expect(sameModuloFormat('', '  ')).toBe(false);
  });
});
