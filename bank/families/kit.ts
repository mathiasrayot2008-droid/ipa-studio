import type { FamTest, FamValue, JavaType, Rng } from '@/types/bank';

export const R = String.raw;
export const P = (i: Record<string, FamValue>): FamTest => ({ vis: 'public', in: i });
export const H = (i: Record<string, FamValue>): FamTest => ({ vis: 'hidden', in: i });
export const E = (i: Record<string, FamValue>): FamTest => ({ vis: 'edge', in: i });

/** Tests à partir de lignes de valeurs : les `nPublic` premières sont publiques, la dernière est une limite si `edge`. */
export function rows(names: string[], data: FamValue[][], nPublic = 2, edge = true): FamTest[] {
  return data.map((r, k) => {
    const i: Record<string, FamValue> = {};
    names.forEach((n, j) => { i[n] = r[j]!; });
    return { vis: k < nPublic ? 'public' : edge && k === data.length - 1 ? 'edge' : 'hidden', in: i } as FamTest;
  });
}

/** `n` noms distincts tirés dans `list`, en évitant `taken`. */
export function names(rng: Rng, list: readonly string[], n: number, taken: readonly string[] = []): string[] {
  const free = list.filter((x) => !taken.includes(x));
  if (free.length < n) throw new Error('names : pas assez de noms');
  return rng.shuffle([...free]).slice(0, n);
}

export const N_INT = ['n', 'nb', 'valeur', 'x', 'nombre', 'entier'];
export const N_TOTAL = ['total', 'somme', 'res', 'resultat'];
export const N_ARR = ['t', 'tab', 'notes', 'valeurs', 'mesures', 'releves'];
export const N_STR = ['s', 'texte', 'mot', 'phrase', 'chaine', 'message'];
export const N_CH = ['c', 'lettre', 'car', 'cible'];

export const intArr = (rng: Rng, len: number, lo: number, hi: number): number[] => Array.from({ length: len }, () => rng.int(lo, hi));
export const javaStr = (s: string) => JSON.stringify(s);
export const arrLit = (a: readonly number[]) => `{${a.join(', ')}}`;

export const describeGiven = (g: { name: string; type: JavaType }[]): string => g.map((x) => `\`${x.name}\``).join(', ');
export const defaultStarter = (g: { name: string }[]): string => (g.length ? `// ${g.map((x) => x.name).join(', ')} ${g.length > 1 ? 'sont déjà déclarées' : 'est déjà déclarée'} et initialisée${g.length > 1 ? 's' : ''}\n` : '');

export const ALPHA = 'abcdefghijklmnopqrstuvwxyz';
export function randWord(rng: Rng, min: number, max: number, alphabet = ALPHA): string {
  const len = rng.int(min, max);
  let s = '';
  for (let i = 0; i < len; i++) s += alphabet[rng.int(0, alphabet.length - 1)];
  return s;
}
