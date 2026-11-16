import type { NotionId } from '@/types/bank';
import { NOTIONS } from '@/engine/notions';
import type { PoolEntry } from '@/engine/compose';

/** Banque fictive réaliste : 2–3 familles par notion, 2–3 variantes chacune (difficultés 1–5), 4 instances par variante. */
export function syntheticPool(): PoolEntry[] {
  const out: PoolEntry[] = [];
  const mins = [0, 4, 7, 11, 15, 20];
  NOTIONS.forEach((nt, ni) => {
    const base = Math.min(3, 1 + Math.floor(ni / 7));       // notions tardives = plus difficiles
    for (let f = 0; f < 2 + (ni % 2); f++) {
      for (let v = 0; v < 3; v++) {
        const d = Math.min(5, Math.max(1, base + v + (f % 2 === 0 ? 0 : -1) + (v === 2 ? 1 : 0))) as 1 | 2 | 3 | 4 | 5;
        for (let i = 0; i < 4; i++) {
          out.push({ key: `syn-${nt.id.slice(0, 3)}-f${f}-v${v}-${i}`, familyId: `${nt.id.slice(0, 3)}f${f}`, variantId: `v${v}`, notion: nt.id as NotionId, secondary: [], difficulty: d, minutes: mins[d]! + (v === 1 ? 1 : 0) });
        }
      }
    }
  });
  return out;
}
