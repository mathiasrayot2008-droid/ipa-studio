/**
 * Format des spécifications d'exercices Schooding (rédigées à la main dans private/specs/, jamais publiées).
 * Le texte des énoncés vient TOUJOURS de l'export ; une spécification ne contient que :
 * classification, variables, solution de référence, entrées de tests, indices, validations croisées.
 * Les sorties attendues sont CALCULÉES en exécutant la référence (jamais écrites à la main).
 */
import type { ExerciseKind, JavaType, NotionId } from '@/types/bank';
import type { CompareOptions } from '@/types/bank';

export type V = number | string | boolean | V[];
export type Fidelity = 'exact' | 'assets-recreated' | 'reconstructed' | 'unavailable';
export interface RunnerSpec { width: number; height: number; start: [number, number]; goal: [number, number]; walls: [number, number][] }
export interface SpecTest {
  vis: 'public' | 'hidden' | 'edge';
  in?: Record<string, V>;
  /** Carte du runner (kind 'runner'). */
  runner?: RunnerSpec;
  /** Dimensions de grille si elles ne se déduisent pas des entrées (largeur/hauteur/taille). */
  grid?: { largeur: number; hauteur: number };
  canvas?: { width: number; height: number };
}
export interface Spec {
  id: number;
  kind?: ExerciseKind;
  notion: NotionId;
  sec?: NotionId[];
  diff: 1 | 2 | 3 | 4 | 5;
  min: number;
  given?: [string, JavaType][];
  expect?: ([string, JavaType] | [string, JavaType, 'declareOnly'])[];
  starter?: string;
  ref: string;
  tests: SpecTest[];
  hints: [string, string, string];
  compare?: Partial<CompareOptions>;
  /** Drapeau « sans retour à la ligne » par outil si l'énoncé le précise (sinon : valeur lue dans la description Schooding). */
  newline?: Partial<Record<'affiche' | 'afficheEntier' | 'afficheReel' | 'afficheBooleen', boolean>>;
  decimals?: number;
  /** Outils à fournir quand l'export n'en liste aucun (529, 558, 571, 593) : lus dans l'énoncé. */
  tools?: import('@/types/bank').ToolId[];
  /** Autres solutions correctes : doivent obtenir 100 %. */
  alts?: string[];
  /** Erreurs classiques : ne doivent PAS obtenir 100 %. */
  wrong?: { label: string; code: string }[];
  fidelity: Fidelity;
  notes?: string[];
  canvas?: { width: number; height: number };
}

export const P = (i?: Record<string, V>, extra: Partial<SpecTest> = {}): SpecTest => ({ vis: 'public', in: i, ...extra });
export const H = (i?: Record<string, V>, extra: Partial<SpecTest> = {}): SpecTest => ({ vis: 'hidden', in: i, ...extra });
export const E = (i?: Record<string, V>, extra: Partial<SpecTest> = {}): SpecTest => ({ vis: 'edge', in: i, ...extra });

/** Aide : liste de tuples → tests (n premiers publics, 1 limite à la fin si `edge`). */
export function many(names: string[], rows: V[][], nPublic = 2, edgeLast = true): SpecTest[] {
  return rows.map((r, k) => {
    const i: Record<string, V> = {};
    names.forEach((n, j) => { i[n] = r[j]!; });
    const vis: SpecTest['vis'] = k < nPublic ? 'public' : edgeLast && k === rows.length - 1 ? 'edge' : 'hidden';
    return { vis, in: i };
  });
}

/** Cartes de runner : tests à partir de [startX, startY, goalX, goalY]. Vérifie que les deux trajets « en L » sont libres si `lPaths`. */
export function runnerTests(map: { width: number; height: number; walls: [number, number][] }, pairs: [number, number, number, number][], opts: { nPublic?: number; lPaths?: boolean; inputs?: boolean } = {}): SpecTest[] {
  const wall = new Set(map.walls.map(([x, y]) => `${x},${y}`));
  const clear = (cells: [number, number][]) => cells.every(([x, y]) => !wall.has(`${x},${y}`));
  const L = (sx: number, sy: number, gx: number, gy: number, xFirst: boolean): [number, number][] => {
    const out: [number, number][] = []; let x = sx; let y = sy;
    const mx = () => { while (x !== gx) { x += Math.sign(gx - x); out.push([x, y]); } };
    const my = () => { while (y !== gy) { y += Math.sign(gy - y); out.push([x, y]); } };
    if (xFirst) { mx(); my(); } else { my(); mx(); }
    return out;
  };
  return pairs.map(([sx, sy, gx, gy], k) => {
    if (opts.lPaths && !(clear(L(sx, sy, gx, gy, true)) && clear(L(sx, sy, gx, gy, false)))) throw new Error(`runnerTests : trajet en L bloqué pour ${[sx, sy, gx, gy]}`);
    if (wall.has(`${sx},${sy}`) || wall.has(`${gx},${gy}`)) throw new Error('runnerTests : départ ou but sur un mur');
    const vis: SpecTest['vis'] = k < (opts.nPublic ?? 2) ? 'public' : 'hidden';
    const input: Record<string, number> = opts.inputs === false ? {} : { startX: sx, startY: sy, goalX: gx, goalY: gy };
    return { vis, in: input, runner: { width: map.width, height: map.height, start: [sx, sy], goal: [gx, gy], walls: map.walls } };
  });
}
