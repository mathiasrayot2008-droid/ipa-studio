import type { Rng } from '@/types/bank';

/** Hachage de graine (cyrb128) → 4 mots de 32 bits. */
export function cyrb128(str: string): [number, number, number, number] {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4; h2 ^= h1; h3 ^= h1; h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

export interface ForkRng extends Rng {
  /** Sous-flux indépendant, déterminé UNIQUEMENT par (graine, chemin) : ajouter un tirage ailleurs ne le décale pas. */
  fork(name: string): ForkRng;
}

/** xoshiro128** : rapide, 128 bits d'état, sortie uniforme sur [0, 1). */
export class Xoshiro implements ForkRng {
  private a: number; private b: number; private c: number; private d: number;
  constructor(private readonly path: string) {
    [this.a, this.b, this.c, this.d] = cyrb128(path);
    for (let i = 0; i < 12; i++) this.next(); // chauffe : décorrèle les graines voisines
  }
  next(): number {
    let r = Math.imul(this.b, 5);
    r = Math.imul((r << 7) | (r >>> 25), 9);
    const t = this.b << 9;
    this.c ^= this.a; this.d ^= this.b;
    this.b ^= this.c; this.a ^= this.d; this.c ^= t;
    this.d = (this.d << 11) | (this.d >>> 21);
    return (r >>> 0) / 4294967296;
  }
  /** Entier uniforme dans [min, max] (bornes incluses). */
  int(min: number, max: number): number { return min + Math.floor(this.next() * (max - min + 1)); }
  pick<T>(a: readonly T[]): T {
    if (!a.length) throw new Error('pick : tableau vide');
    return a[Math.floor(this.next() * a.length)]!;
  }
  /** Mélange de Fisher–Yates ; renvoie une COPIE. */
  shuffle<T>(a: T[]): T[] {
    const o = a.slice();
    for (let i = o.length - 1; i > 0; i--) { const j = this.int(0, i); [o[i], o[j]] = [o[j]!, o[i]!]; }
    return o;
  }
  fork(name: string): ForkRng { return new Xoshiro(`${this.path}/${name}`); }
}

export const makeRng = (seed: string): ForkRng => new Xoshiro(seed);

/** Graine de 128 bits (32 caractères hexadécimaux). */
export function newSeed(): string {
  const b = new Uint32Array(4);
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(8, '0')).join('');
}

/** Tirage pondéré (poids ≥ 0). Renvoie l'indice, ou -1 si tous les poids sont nuls. */
export function weightedIndex(rng: Rng, weights: readonly number[]): number {
  const total = weights.reduce((s, w) => s + Math.max(0, w), 0);
  if (total <= 0) return -1;
  let x = rng.next() * total;
  for (let i = 0; i < weights.length; i++) { x -= Math.max(0, weights[i]!); if (x < 0) return i; }
  return weights.length - 1;
}
