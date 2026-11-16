import type { Attempt, NotionId, NotionMastery } from '@/types/bank';
import { EMPTY_MASTERY, type MasteryDoc } from '@/data/types';

/**
 * Modèle de maîtrise par notion (docs/04 §7) — une ESTIMATION pédagogique, jamais une certitude.
 * Moyenne a posteriori d'une loi Beta(1, 2) : m = (1 + Σ w·e) / (3 + Σ w). Une seule réussite ne suffit jamais.
 */
export const PRIOR_A = 1;
export const PRIOR_B = 2;
export const ACQUIRED_THRESHOLD = 0.9;
export const ACQUIRED_MIN_FAMILIES = 3;
export const HALF_LIFE_DAYS = 30;
export const SECONDARY_FACTOR = 0.4;
const DAY = 86_400_000;

export interface ExerciseMeta {
  key: string;
  notions: { primary: NotionId; secondary: NotionId[] };
  difficulty: number;
  estimatedMinutes: number;
}
export type AttemptFacts = Pick<Attempt, 'score' | 'hintsUsed' | 'solutionShown' | 'durationSec' | 'attemptsBefore' | 'context' | 'createdAt' | 'status'>;
export interface PriorState { succeededBefore: boolean }

/** Famille d'un exercice : « fam.strCompte.count-char.03 » → « fam.strCompte » ; un TP Schooding compte comme sa propre famille. */
export const familyOfKey = (key: string) => (key.startsWith('fam.') ? key.split('.').slice(0, 2).join('.') : key);

export const autonomy = (hints: 0 | 1 | 2 | 3, solutionShown: boolean) => (solutionShown ? 0 : [1, 0.85, 0.65, 0.4][hints]!);
/** k = numéro de la tentative (1 = première) : 1 jusqu'à 2 essais, puis dégressif jusqu'à 0,5. */
export const triesFactor = (k: number) => (k <= 2 ? 1 : Math.max(0.5, 1 - 0.1 * (k - 2)));
/** Plus lent que prévu ⇒ preuve un peu plus faible (jamais sous 0,7) ; plus rapide ⇒ pas de bonus. */
export const timeFactor = (estimatedMin: number, realSec: number) => (realSec <= 0 ? 1 : Math.min(1, Math.max(0.7, Math.pow((estimatedMin * 60) / realSec, 0.3))));
export const recency = (ageDays: number) => Math.pow(0.5, Math.max(0, ageDays) / HALF_LIFE_DAYS);

export interface Evidence { notion: NotionId; w: number; e: number; success: boolean; primary: boolean }

/**
 * Preuve apportée par UNE tentative complète (« Vérifier » ou remise de DST).
 * Au sein d'un DST, la durée mesurée est celle du DST entier : le facteur « temps » n'y est pas appliqué.
 * Précision d'implémentation : une tentative répétée sur un exercice pas encore réussi pèse la moitié d'une première (on ne s'effondre pas à force d'essayer).
 */
export function evidenceOf(a: AttemptFacts, ex: ExerciseMeta, prior: PriorState): Evidence[] {
  const e = a.score * autonomy(a.hintsUsed, a.solutionShown) * triesFactor(a.attemptsBefore + 1) * (a.context === 'dst' ? 1 : timeFactor(ex.estimatedMinutes, a.durationSec));
  const novelty = prior.succeededBefore ? 0.4 : a.attemptsBefore > 0 ? 0.5 : 1;
  const base = (1 + 0.25 * (ex.difficulty - 1)) * novelty; // récence = 1 : la tentative vient d'avoir lieu
  const success = a.status === 'reussi';
  return [
    { notion: ex.notions.primary, w: base, e, success, primary: true },
    ...ex.notions.secondary.filter((n) => n !== ex.notions.primary).map((n) => ({ notion: n, w: base * SECONDARY_FACTOR, e, success, primary: false })),
  ];
}

export const estimateFrom = (evidence: number, weightSum: number) => (PRIOR_A + evidence) / (PRIOR_A + PRIOR_B + weightSum);
const decayFactor = (fromMs: number, toMs: number) => (fromMs > 0 && toMs > fromMs ? recency((toMs - fromMs) / DAY) : 1);

/** Estimation d'une notion à la date `now` (les preuves anciennes pèsent moins : même facteur sur Σ w·e et Σ w). */
export function estimateAt(m: NotionMastery | undefined, docUpdatedAt: number, now: number): number {
  if (!m) return estimateFrom(0, 0);
  const f = decayFactor(docUpdatedAt, now);
  return estimateFrom(m.evidence * f, m.weightSum * f);
}

/** Intègre la preuve d'une tentative dans les agrégats (incrémental : pas de relecture de l'historique). */
export function applyEvidence(doc: MasteryDoc, ev: Evidence[], ctx: { now: number; familyId: string; isNewSuccess: boolean; errorTags?: string[]; success: boolean }): MasteryDoc {
  const f = decayFactor(doc.updatedAt, ctx.now);
  const notions: MasteryDoc['notions'] = {};
  for (const [n, m] of Object.entries(doc.notions) as [NotionId, NotionMastery][]) notions[n] = { ...m, evidence: m.evidence * f, weightSum: m.weightSum * f };
  const iso = new Date(ctx.now).toISOString();
  for (const x of ev) {
    const cur = notions[x.notion] ?? { evidence: 0, weightSum: 0, distinctFamiliesSucceeded: 0, families: [], estimate: estimateFrom(0, 0) };
    const families = cur.families ?? [];
    const succeeded = x.success && x.e > 0;
    const nextFamilies = succeeded && x.primary && !families.includes(ctx.familyId) ? [...families, ctx.familyId] : families;
    const next: NotionMastery = {
      ...cur, evidence: cur.evidence + x.w * x.e, weightSum: cur.weightSum + x.w, families: nextFamilies, distinctFamiliesSucceeded: nextFamilies.length,
      ...(succeeded && x.primary ? { lastSuccessAt: iso } : {}), ...(succeeded && x.primary && ctx.isNewSuccess ? { lastNewSuccessAt: iso } : {}),
    };
    next.estimate = estimateFrom(next.evidence, next.weightSum);
    notions[x.notion] = next;
  }
  const errorTagCounts = { ...doc.errorTagCounts };
  for (const t of ctx.errorTags ?? []) errorTagCounts[t] = (errorTagCounts[t] ?? 0) + 1;
  return { notions, errorTagCounts, totals: { attempts: doc.totals.attempts + 1, successes: doc.totals.successes + (ctx.success ? 1 : 0) }, updatedAt: ctx.now };
}

/** « Acquise » : m ≥ 90 % ET ≥ 3 familles différentes réussies ET une réussite sur exercice nouveau dans les 30 derniers jours. */
export function isAcquired(m: NotionMastery | undefined, docUpdatedAt: number, now: number): boolean {
  if (!m) return false;
  const recentNew = m.lastNewSuccessAt ? (now - Date.parse(m.lastNewSuccessAt)) / DAY <= 30 : false;
  return estimateAt(m, docUpdatedAt, now) >= ACQUIRED_THRESHOLD && m.distinctFamiliesSucceeded >= ACQUIRED_MIN_FAMILIES && recentNew;
}

export type NotionLevel = 'non-travaillee' | 'fragile' | 'en-progres' | 'solide' | 'acquise';
export function levelOf(m: NotionMastery | undefined, docUpdatedAt: number, now: number): NotionLevel {
  if (!m || m.weightSum === 0) return 'non-travaillee';
  if (isAcquired(m, docUpdatedAt, now)) return 'acquise';
  const e = estimateAt(m, docUpdatedAt, now);
  return e >= 0.75 ? 'solide' : e >= 0.5 ? 'en-progres' : 'fragile';
}

/** Maîtrise globale : moyenne des notions éligibles pondérée par le nombre de séances qui les mobilisent (poids 1 par défaut). */
export function globalMastery(doc: MasteryDoc, eligible: NotionId[], weights: Partial<Record<NotionId, number>>, now: number): number {
  if (!eligible.length) return 0;
  let s = 0; let w = 0;
  for (const n of eligible) { const k = weights[n] ?? 1; s += k * estimateAt(doc.notions[n], doc.updatedAt, now); w += k; }
  return w ? s / w : 0;
}

/**
 * Recalcul complet depuis l'historique (bouton « Recalculer ») : rejoue les tentatives dans l'ordre chronologique.
 * Corrige toute dérive ; la récence est exacte puisque chaque préservation décale les sommes du même facteur.
 */
export function recomputeMastery(attempts: (AttemptFacts & { exerciseKey: string; errorTags: string[] })[], meta: (key: string) => ExerciseMeta | undefined, now: number): MasteryDoc {
  let doc: MasteryDoc = { ...EMPTY_MASTERY, notions: {}, errorTagCounts: {}, totals: { attempts: 0, successes: 0 } };
  const succeeded = new Set<string>();
  const sorted = [...attempts].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  for (const a of sorted) {
    const ex = meta(a.exerciseKey);
    if (!ex) continue;
    const before = succeeded.has(a.exerciseKey);
    const t = Date.parse(a.createdAt);
    doc = applyEvidence(doc, evidenceOf(a, ex, { succeededBefore: before }), { now: t, familyId: familyOfKey(a.exerciseKey), isNewSuccess: a.status === 'reussi' && !before, errorTags: a.errorTags, success: a.status === 'reussi' });
    if (a.status === 'reussi') succeeded.add(a.exerciseKey);
  }
  // Décale jusqu'à « maintenant » : estimate stocké à jour.
  const f = decayFactor(doc.updatedAt, now);
  for (const m of Object.values(doc.notions)) { if (!m) continue; m.evidence *= f; m.weightSum *= f; m.estimate = estimateFrom(m.evidence, m.weightSum); }
  return { ...doc, updatedAt: doc.updatedAt ? Math.max(doc.updatedAt, now) : 0 };
}
