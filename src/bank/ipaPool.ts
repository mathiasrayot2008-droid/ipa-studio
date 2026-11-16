import type { Exercise, TestCase } from '@/types/bank';
import type { PoolEntry } from '@/engine/compose';

/**
 * Banque d'exercices générés « IPA Studio » (pools produits au build, validés avec un vrai JVM).
 * Les fichiers publics (`pools/`) ne contiennent NI indices, NI solution, NI tests cachés : ceux-ci sont dans `secrets/`
 * et ne sont téléchargés qu'à la demande (indice en mode assisté) ou à la remise du DST — jamais en mode examen avant la remise.
 * Limite assumée : un fichier statique reste lisible par quelqu'un qui en devine l'URL ; l'application, elle, ne le charge pas.
 */
export const IPA_POOL_VERSION = 'ipa-1.0.0';

export interface IpaFamilyMeta { id: string; title: string; notion: string; kind: string; variants: { id: string; label: string; difficulty: number; minutes: number }[] }
export interface IpaIndex { format: number; version: string; generatorVersion: string; builtAt: string; entries: PoolEntry[]; families: IpaFamilyMeta[] }
export interface IpaSecret {
  tests: TestCase[];
  hints: [string, string, string];
  referenceSolution: string;
  mutants: { id: string; label: string; explanationFr: string; code?: string }[];
  mutantFingerprints?: Record<string, Record<string, string>>;
}

type Fetcher = (url: string) => Promise<unknown>;
let fetcher: Fetcher = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Ressource introuvable (${r.status}) : ${url}`);
  return r.json();
};
/** Substituable dans les tests. */
export function setPoolFetcher(f: Fetcher | null) { fetcher = f ?? (async (url) => { const r = await fetch(url); if (!r.ok) throw new Error(`Ressource introuvable (${r.status}) : ${url}`); return r.json(); }); resetPoolCache(); }

const base = (v: string) => `${import.meta.env.BASE_URL}bank/${v}/`;
const indexes = new Map<string, Promise<IpaIndex>>();
const pools = new Map<string, Promise<Exercise[]>>();
const secrets = new Map<string, Promise<Record<string, IpaSecret>>>();
export function resetPoolCache() { indexes.clear(); pools.clear(); secrets.clear(); }

const once = <T>(m: Map<string, Promise<T>>, k: string, mk: () => Promise<T>): Promise<T> => {
  const hit = m.get(k);
  if (hit) return hit;
  const p = mk().catch((e) => { m.delete(k); throw e; }); // un échec réseau n'est pas mémorisé
  m.set(k, p);
  return p;
};

export const loadIndex = (version = IPA_POOL_VERSION) => once(indexes, version, () => fetcher(`${base(version)}index.json`) as Promise<IpaIndex>);

export async function familyOfKey(version: string, key: string): Promise<string> {
  const idx = await loadIndex(version);
  const e = idx.entries.find((x) => x.key === key);
  if (!e) throw new Error(`Exercice « ${key} » absent de la banque ${version}.`);
  return e.familyId;
}

const loadPool = (version: string, family: string) => once(pools, `${version}/${family}`, () => fetcher(`${base(version)}pools/${family}.json`) as Promise<Exercise[]>);
const loadSecrets = (version: string, family: string) => once(secrets, `${version}/${family}`, () => fetcher(`${base(version)}secrets/${family}.json`) as Promise<Record<string, IpaSecret>>);

/** Exercice « public » : énoncé + tests publics seulement (indices et solution vides). */
export async function loadPublicExercise(key: string, version = IPA_POOL_VERSION): Promise<Exercise> {
  const fam = await familyOfKey(version, key);
  const ex = (await loadPool(version, fam)).find((e) => e.key === key);
  if (!ex) throw new Error(`Exercice « ${key} » introuvable dans le pool « ${fam} ».`);
  return ex;
}

/** Secrets d'un exercice : indices, solution, tests cachés, explications des erreurs-types. À n'appeler qu'après remise ou sur demande d'indice. */
export async function loadSecret(key: string, version = IPA_POOL_VERSION): Promise<IpaSecret> {
  const fam = await familyOfKey(version, key);
  const s = (await loadSecrets(version, fam))[key];
  if (!s) throw new Error(`Secrets de « ${key} » introuvables.`);
  return s;
}

/** Fusionne l'exercice public et ses secrets : c'est la version complète, utilisée pour corriger. */
export function mergeSecret(pub: Exercise, s: IpaSecret): Exercise {
  const publicTests = pub.tests.filter((t) => t.visibility === 'public');
  return { ...pub, tests: [...publicTests, ...s.tests.filter((t) => t.visibility !== 'public')], hints: s.hints, referenceSolution: s.referenceSolution, mutants: s.mutants.map(({ id, label, explanationFr }) => ({ id, label, explanationFr })), mutantFingerprints: s.mutantFingerprints };
}

export async function loadFullExercise(key: string, version = IPA_POOL_VERSION): Promise<Exercise> {
  const [pub, sec] = await Promise.all([loadPublicExercise(key, version), loadSecret(key, version)]);
  return mergeSecret(pub, sec);
}
