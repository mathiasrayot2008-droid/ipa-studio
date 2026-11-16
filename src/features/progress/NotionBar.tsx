import { estimateAt, levelOf, type NotionLevel } from '@/engine/mastery';
import type { NotionMastery } from '@/types/bank';

export const LEVEL_META: Record<NotionLevel, { label: string; cls: string; bar: string }> = {
  'non-travaillee': { label: 'À découvrir', cls: 'text-muted', bar: 'bg-border' },
  fragile: { label: 'Fragile', cls: 'text-bad', bar: 'bg-bad' },
  'en-progres': { label: 'En progrès', cls: 'text-warn', bar: 'bg-warn' },
  solide: { label: 'Solide', cls: 'text-accent', bar: 'bg-accent' },
  acquise: { label: 'Acquise', cls: 'text-ok', bar: 'bg-ok' },
};

/** Barre de maîtrise : le niveau est dit en toutes lettres (jamais la couleur seule). */
export function NotionBar({ label, m, updatedAt, now }: { label: string; m: NotionMastery | undefined; updatedAt: number; now: number }) {
  const lvl = levelOf(m, updatedAt, now);
  const est = estimateAt(m, updatedAt, now);
  const pct = lvl === 'non-travaillee' ? 0 : Math.round(est * 100);
  const meta = LEVEL_META[lvl];
  return (
    <div className="flex items-center gap-3">
      <span className="w-44 shrink-0 truncate text-sm sm:w-56">{label}</span>
      <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`${label} : ${pct} %`}>
        <div className={`h-full ${meta.bar}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`w-24 shrink-0 text-right text-xs ${meta.cls}`}>{lvl === 'non-travaillee' ? meta.label : `${pct} % · ${meta.label}`}</span>
    </div>
  );
}
