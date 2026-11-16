import type { DstConfig, DstSubject, NotionId } from '@/types/bank';
import { NOTION_SESSION, SUBNOTION_OWNER } from './notions';
import { makeRng, weightedIndex, type ForkRng } from './rng';
import { allocatePoints, DEFAULT_HINT_POLICY } from './scoring';
import { baseMinutes, planRamp } from './solver';

/** Une variante concrète pré-validée de la banque (la banque est la source de vérité, pas le générateur). */
export interface PoolEntry {
  key: string; familyId: string; variantId: string;
  notion: NotionId; secondary: NotionId[];
  difficulty: 1 | 2 | 3 | 4 | 5; minutes: number;
}

export interface ComposeContext {
  pool: readonly PoolEntry[];
  poolVersion: string;
  generatorVersion: string;
  /** Horodatage ISO de création (injecté : la composition reste pure et reproductible). */
  now: string;
  /** Maîtrise estimée par notion, dans [0, 1] (absente = jamais travaillée). */
  mastery?: Partial<Record<NotionId, number>>;
  /** Jours écoulés depuis la dernière pratique de la notion (absent = jamais). */
  daysSincePractice?: Partial<Record<NotionId, number>>;
  /** Familles présentes dans les derniers DST, du plus récent au plus ancien. */
  recentFamilies?: readonly (readonly string[])[];
  /** Exercices déjà réussis par l'étudiant : écartés tant qu'il reste une alternative. */
  succeededKeys?: ReadonlySet<string>;
}

export class ComposeError extends Error {}

interface Variant { familyId: string; variantId: string; difficulty: number; minutes: number; instances: PoolEntry[] }
interface Slot { notion: NotionId; target: number; family: string }

const frac = (x: number) => x - Math.floor(x);
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

function groupVariants(entries: readonly PoolEntry[]): Variant[] {
  const m = new Map<string, Variant>();
  for (const e of entries) {
    const id = `${e.familyId}/${e.variantId}`;
    const v = m.get(id) ?? { familyId: e.familyId, variantId: e.variantId, difficulty: e.difficulty, minutes: e.minutes, instances: [] };
    v.instances.push(e); m.set(id, v);
  }
  return [...m.values()];
}

/**
 * Compose un sujet de DST à partir de (graine, configuration, banque, maîtrise) — fonction PURE : mêmes entrées ⇒ même sujet.
 * Algorithme : docs/04-MOTEUR-DST-ET-PROGRESSION.md §2.
 */
export function composeDst(config: DstConfig, seed: string, ctx: ComposeContext): DstSubject {
  const root = makeRng(seed);
  const warnings: string[] = [];
  const D = clamp(config.durationMin, 5, 480);

  // 1. Notions éligibles (présentes dans la banque).
  const chosen = config.scope === 'notion' ? new Set(config.notions ?? []) : null;
  if (chosen && chosen.size === 0) throw new ComposeError('Choisis au moins une notion pour un entraînement ciblé.');
  const byNotion = new Map<NotionId, PoolEntry[]>();
  for (const e of ctx.pool) {
    if (chosen ? !chosen.has(e.notion) : (NOTION_SESSION[e.notion] ?? 99) > config.asOfSession) continue;
    (byNotion.get(e.notion) ?? byNotion.set(e.notion, []).get(e.notion)!).push(e);
  }
  const eligible = [...byNotion.keys()].sort();
  if (!eligible.length) throw new ComposeError(chosen ? 'La banque ne contient encore aucun exercice pour cette notion.' : `Aucune notion éligible jusqu’à la séance ${config.asOfSession}.`);
  if (chosen) for (const n of chosen) if (!byNotion.has(n)) warnings.push(`Aucun exercice disponible pour « ${n} » : notion ignorée.`);

  // 2. Priorités.
  const prioritized = new Set((config.subNotions ?? []).map((s) => SUBNOTION_OWNER[s]).filter(Boolean));
  const weight = (n: NotionId): number => {
    if (!config.adaptive) return 1;
    const m = ctx.mastery?.[n] ?? 0;
    const days = ctx.daysSincePractice?.[n];
    let w = 1 + 1.5 * (1 - clamp(m, 0, 1));
    if (days === undefined || days > 14) w *= 1.2;
    if (prioritized.has(n)) w *= 2;
    if (!chosen && (NOTION_SESSION[n] ?? 0) >= config.asOfSession - 1) w *= 1.3;
    return w;
  };

  // 3. Taille et rampe.
  const plan = planRamp(D, config.level);
  const n = plan.n;
  if (plan.lowered) warnings.push('Format court : le sommet de difficulté a été abaissé pour tenir dans la durée.');

  // 4. Répartition des notions sur les créneaux.
  const compat = (notion: NotionId, d: number, tol: number) => byNotion.get(notion)!.some((e) => Math.abs(e.difficulty - d) <= tol);
  const cap = chosen ? Math.ceil(n / eligible.length) : Math.ceil(n / 3);
  const minDistinct = chosen ? Math.min(n, eligible.length) : Math.min(n, eligible.length, 5);
  let slotsNotions: NotionId[] = [];
  let bestDistinct = -1;
  for (let attempt = 0; attempt < 40; attempt++) {
    const r = root.fork(`notions/${attempt}`);
    const counts = new Map<NotionId, number>();
    const res: NotionId[] = [];
    for (let i = 0; i < n; i++) {
      const d = plan.targets[i]!;
      let cands: NotionId[] = [];
      for (const tol of [0.7, 1.5, 5]) {
        cands = eligible.filter((x) => (counts.get(x) ?? 0) < cap && compat(x, d, tol));
        if (cands.length) break;
      }
      if (!cands.length) cands = eligible.filter((x) => compat(x, d, 5));
      const idx = weightedIndex(r, cands.map(weight));
      const pick = cands[idx < 0 ? 0 : idx]!;
      res.push(pick); counts.set(pick, (counts.get(pick) ?? 0) + 1);
    }
    const distinct = new Set(res).size;
    if (distinct > bestDistinct) { bestDistinct = distinct; slotsNotions = res; }
    if (distinct >= minDistinct) break;
  }
  if (bestDistinct < minDistinct) warnings.push(`Seulement ${bestDistinct} notion(s) distincte(s) : la banque est encore étroite sur ce périmètre.`);

  // 5. Familles : pondération anti-répétition.
  const recent = new Set((ctx.recentFamilies ?? []).slice(0, 3).flat());
  const usedFamilies = new Set<string>();
  const slots: Slot[] = [];
  const famRng = root.fork('families');
  for (let i = 0; i < n; i++) {
    const notion = slotsNotions[i]!;
    const d = plan.targets[i]!;
    const variants = groupVariants(byNotion.get(notion)!);
    let fams: string[] = [];
    for (const tol of [0.7, 1.5, 5]) {
      fams = [...new Set(variants.filter((v) => Math.abs(v.difficulty - d) <= tol).map((v) => v.familyId))];
      if (fams.length) break;
    }
    fams.sort();
    let w: number[] = fams.map((f) => (usedFamilies.has(f) ? 0 : recent.has(f) ? 0.3 : 1));
    let idx = weightedIndex(famRng, w);
    if (idx < 0) { w = fams.map(() => 0.05); idx = weightedIndex(famRng, w); } // dernier recours : réutiliser une famille (autre variante)
    const family = fams[idx]!;
    usedFamilies.add(family);
    slots.push({ notion, target: d, family });
  }

  // 6. Variantes et instances concrètes (rejouable avec un autre facteur k).
  const succeeded = ctx.succeededKeys ?? new Set<string>();
  const chooseAll = (k: number, tag: string): PoolEntry[] => {
    const r = root.fork(`variants/${tag}`);
    const used = new Set<string>();
    return slots.map((s) => {
      const fam = byNotion.get(s.notion)!.filter((e) => e.familyId === s.family);
      const variants = groupVariants(fam);
      const dInt = clamp(Math.floor(s.target) + (r.next() < frac(s.target) ? 1 : 0), 1, 5);
      const dMin = Math.min(...variants.map((v) => Math.abs(v.difficulty - dInt)));
      const near = variants.filter((v) => Math.abs(v.difficulty - dInt) === dMin);
      const want = baseMinutes(s.target) * k;
      const bestGap = Math.min(...near.map((v) => Math.abs(v.minutes - want)));
      const v = r.pick(near.filter((x) => Math.abs(x.minutes - want) === bestGap));
      const free = v.instances.filter((e) => !used.has(e.key));
      const fresh = free.filter((e) => !succeeded.has(e.key));
      const e = r.pick(fresh.length ? fresh : free.length ? free : v.instances);
      used.add(e.key);
      return e;
    });
  };

  let chosenEntries = chooseAll(plan.k, 'k0');
  const total = (es: PoolEntry[]) => es.reduce((s, e) => s + e.minutes, 0);
  // 11. Contrôle de durée : Σ ∈ [0,85·D ; 1,0·D] ; deux ajustements de k au plus, sinon on l'affiche honnêtement.
  let k = plan.k;
  for (let t = 1; t <= 2 && (total(chosenEntries) > D || total(chosenEntries) < 0.85 * D); t++) {
    k = clamp(k * ((0.92 * D) / Math.max(1, total(chosenEntries))), 0.5, 1.6);
    const alt = chooseAll(k, `k${t}`);
    if (Math.abs(total(alt) - 0.92 * D) < Math.abs(total(chosenEntries) - 0.92 * D)) chosenEntries = alt;
  }

  // 11 (suite). Réparation locale : remplace un exercice par un voisin (même notion, ±1 de difficulté, famille non déjà utilisée)
  // tant que la durée reste hors de [0,88·D ; 0,97·D]. Garde la rampe : l'ordre est recalculé après coup.
  {
    const r = root.fork('repair');
    for (let iter = 0; iter < 4 * n; iter++) {
      const tot = total(chosenEntries);
      if (tot >= 0.88 * D && tot <= 0.97 * D) break;
      const goal = 0.92 * D;
      const keys = new Set(chosenEntries.map((e) => e.key));
      let best: { i: number; e: PoolEntry } | null = null;
      let bestGap = Math.abs(tot - goal);
      for (const i of r.shuffle(chosenEntries.map((_, idx) => idx))) {
        const cur = chosenEntries[i]!;
        const famsElsewhere = new Set(chosenEntries.filter((_, j) => j !== i).map((e) => e.familyId));
        for (const cand of r.shuffle(byNotion.get(cur.notion)!)) {
          if (keys.has(cand.key) || Math.abs(cand.difficulty - cur.difficulty) > 1 || famsElsewhere.has(cand.familyId) || succeeded.has(cand.key)) continue;
          const gap = Math.abs(tot - cur.minutes + cand.minutes - goal);
          if (gap < bestGap - 1e-9) { bestGap = gap; best = { i, e: cand }; }
        }
      }
      if (!best) break;
      chosenEntries = chosenEntries.map((e, j) => (j === best!.i ? best!.e : e));
    }
  }

  // 9. Ordre croissant (tri stable) + 8. anti-répétition locale de notion.
  const order = chosenEntries.map((e, i) => ({ e, i })).sort((a, b) => a.e.difficulty - b.e.difficulty || a.e.minutes - b.e.minutes || a.i - b.i).map((x) => x.e);
  for (let j = 1; j < order.length; j++) {
    if (order[j]!.notion !== order[j - 1]!.notion) continue;
    const l = order.findIndex((e, idx) => idx > j && e.difficulty === order[j]!.difficulty && e.notion !== order[j - 1]!.notion);
    if (l > j) [order[j], order[l]] = [order[l]!, order[j]!];
  }
  // Écart de difficulté ≥ 1 entre premier et dernier dès 3 exercices.
  if (order.length >= 3 && order[order.length - 1]!.difficulty - order[0]!.difficulty < 1) {
    const keys = new Set(order.map((e) => e.key));
    const easier = byNotion.get(order[0]!.notion)!.filter((e) => e.difficulty < order[0]!.difficulty && !keys.has(e.key)).sort((a, b) => a.difficulty - b.difficulty || (a.familyId === order[0]!.familyId ? -1 : 1));
    if (easier[0]) order[0] = root.fork('ramp').pick(easier.filter((e) => e.difficulty === easier[0]!.difficulty));
    else {
      const last = order[order.length - 1]!;
      const harder = byNotion.get(last.notion)!.filter((e) => e.difficulty > last.difficulty && !keys.has(e.key)).sort((a, b) => b.difficulty - a.difficulty);
      if (harder[0]) order[order.length - 1] = root.fork('ramp').pick(harder.filter((e) => e.difficulty === harder[0]!.difficulty));
    }
    order.sort((a, b) => a.difficulty - b.difficulty || a.minutes - b.minutes);
    if (order[order.length - 1]!.difficulty - order[0]!.difficulty < 1) warnings.push('Les exercices disponibles sur ce périmètre ont tous la même difficulté.');
  }

  // 10. Barème.
  const points = allocatePoints(order.map((e) => ({ minutes: e.minutes, difficulty: e.difficulty })));
  const targets = [...plan.targets].sort((a, b) => a - b);
  const totalMin = total(order);
  if (totalMin > D || totalMin < 0.85 * D) warnings.push(`Durée estimée : ${totalMin} min pour ${D} min demandées (la banque ne permet pas mieux sur ce périmètre).`);

  return {
    id: `dst-${seed.slice(0, 12)}`, seed, generatorVersion: ctx.generatorVersion, bankVersion: ctx.poolVersion, config,
    items: order.map((e, i) => ({ exerciseKey: e.key, points: points[i]!, targetDifficulty: Math.round(targets[Math.min(i, targets.length - 1)]! * 10) / 10, estimatedMinutes: e.minutes })),
    estimatedTotalMin: totalMin, hintPolicy: DEFAULT_HINT_POLICY, createdAt: ctx.now,
    ...(warnings.length ? { warnings } : {}),
  };
}

export type { ForkRng };
