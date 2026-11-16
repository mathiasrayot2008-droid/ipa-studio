import { useEffect, useRef } from 'react';
import type { RunnerMap } from '@/types/bank';
import { decodeRle } from '@/java/compare';

/** Ordre = ipa.Env.COLORS / LETTERS. */
export const PALETTE = ['#ffffff', '#111827', '#ef4444', '#22c55e', '#3b82f6', '#facc15', '#fb923c', '#92400e', '#9ca3af', '#f472b6', '#a855f7', '#22d3ee'];
const LETTER_TO_IDX: Record<string, number> = { w: 0, k: 1, r: 2, g: 3, b: 4, y: 5, o: 6, n: 7, a: 8, p: 9, u: 10, c: 11 };

function Caption({ children }: { children: string }) {
  return <figcaption className="mt-1 text-center text-xs text-muted">{children}</figcaption>;
}

export function GridView({ rows, caption }: { rows: string[]; caption?: string }) {
  const h = rows.length, w = rows[0]?.length ?? 0;
  const cell = Math.max(6, Math.min(28, Math.floor(260 / Math.max(w, h, 1))));
  return (
    <figure>
      <div role="img" aria-label={`Grille ${w} par ${h}`} className="inline-grid border border-border" style={{ gridTemplateColumns: `repeat(${w}, ${cell}px)` }}>
        {rows.flatMap((r, y) => [...r].map((c, x) => <div key={`${x}-${y}`} style={{ width: cell, height: cell, background: PALETTE[LETTER_TO_IDX[c] ?? 0], outline: '1px solid rgba(128,128,128,.25)', outlineOffset: -1 }} />))}
      </div>
      {caption && <Caption>{caption}</Caption>}
    </figure>
  );
}

export function CanvasView({ w, h, rle, caption }: { w: number; h: number; rle: number[]; caption?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const img = ctx.createImageData(w, h);
    const px = decodeRle(w, h, rle);
    for (let i = 0; i < px.length; i++) {
      const hex = PALETTE[px[i]!] ?? '#ffffff';
      img.data[i * 4] = parseInt(hex.slice(1, 3), 16);
      img.data[i * 4 + 1] = parseInt(hex.slice(3, 5), 16);
      img.data[i * 4 + 2] = parseInt(hex.slice(5, 7), 16);
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }, [w, h, rle]);
  return (
    <figure>
      <canvas ref={ref} width={w} height={h} role="img" aria-label={`Dessin ${w} par ${h} pixels`} className="max-w-full border border-border bg-white" style={{ imageRendering: 'pixelated', height: 'auto', maxWidth: 'min(100%, 320px)' }} />
      {caption && <Caption>{caption}</Caption>}
    </figure>
  );
}

export function RunnerView({ map, path, at, caption }: { map: RunnerMap; path?: number[]; at?: [number, number]; caption?: string }) {
  const cell = Math.max(10, Math.min(36, Math.floor(280 / Math.max(map.width, map.height))));
  const wall = new Set(map.walls.map(([x, y]) => `${x},${y}`));
  const trail = new Set<string>();
  for (let i = 0; i + 1 < (path?.length ?? 0); i += 2) trail.add(`${path![i]},${path![i + 1]}`);
  return (
    <figure>
      <div role="img" aria-label={`Carte ${map.width} par ${map.height}`} className="inline-grid border border-border" style={{ gridTemplateColumns: `repeat(${map.width}, ${cell}px)` }}>
        {Array.from({ length: map.width * map.height }, (_, i) => {
          const x = i % map.width, y = Math.floor(i / map.width), k = `${x},${y}`;
          const isGoal = x === map.goal[0] && y === map.goal[1];
          const isStart = x === map.start[0] && y === map.start[1];
          const isAt = at && at[0] === x && at[1] === y;
          const bg = wall.has(k) ? '#ef4444' : isGoal ? '#22c55e' : trail.has(k) ? '#bfdbfe' : isStart ? '#d1d5db' : '#ffffff';
          return (
            <div key={k} style={{ width: cell, height: cell, background: bg, outline: '1px solid rgba(128,128,128,.3)', outlineOffset: -1, display: 'grid', placeItems: 'center', fontSize: cell * 0.6 }}>
              {isAt ? '🏃' : isStart && !at ? '🏃' : ''}
            </div>
          );
        })}
      </div>
      {caption && <Caption>{caption}</Caption>}
    </figure>
  );
}
