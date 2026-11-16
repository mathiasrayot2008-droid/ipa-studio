import type { DstConfig, Level, NotionId } from '@/types/bank';
import { estimateAt } from '@/engine/mastery';
import { NOTIONS, NOTION_SESSION } from '@/engine/notions';
import type { DstRecord, MasteryDoc } from '@/data/types';

/** Notions éligibles (séance atteinte) ET présentes dans la banque, de la plus faible à la plus solide. */
export function weakestNotions(mastery: MasteryDoc, available: ReadonlySet<string>, asOfSession: number, now: number, count = 3): NotionId[] {
  return NOTIONS.filter((n) => available.has(n.id) && NOTION_SESSION[n.id] <= asOfSession)
    .map((n) => ({ id: n.id, m: estimateAt(mastery.notions[n.id], mastery.updatedAt, now), s: n.sessionNumber }))
    .sort((a, b) => a.m - b.m || a.s - b.s)
    .slice(0, count).map((x) => x.id);
}

/** Niveau habituel : celui des derniers DST de l'étudiant (le plus fréquent), « moyen » par défaut. */
export function usualLevel(dsts: { record: Pick<DstRecord, 'subject'> }[]): Level {
  const c: Record<Level, number> = { facile: 0, moyen: 0, difficile: 0 };
  for (const d of dsts.slice(0, 5)) c[d.record.subject.config.level]++;
  return (Object.entries(c).sort((a, b) => b[1] - a[1])[0]![1] === 0 ? 'moyen' : (Object.entries(c).sort((a, b) => b[1] - a[1])[0]![0] as Level));
}

/** « Entraînement sur mes faiblesses » (docs/04 §8) : 3 notions les plus faibles, 30 min, niveau habituel, mode assisté. */
export function weaknessConfig(notions: NotionId[], level: Level, asOfSession: number): DstConfig {
  return { scope: 'notion', notions, durationMin: 30, level, mode: 'assiste', adaptive: true, asOfSession };
}

/** Lien vers l'écran DST pré-rempli (la graine reste tirée au hasard ; l'étudiant voit l'aperçu avant de commencer). */
export function presetUrl(c: DstConfig): string {
  const q = new URLSearchParams({ scope: c.scope, dur: String(c.durationMin), level: c.level, mode: c.mode, asof: String(c.asOfSession), auto: '1' });
  if (c.notions?.length) q.set('notions', c.notions.map((n) => n.slice(0, 3)).join(','));
  return `/dst?${q.toString()}`;
}
