import type { Exercise } from '@/types/bank';
import type { BankDiff, BankFile } from './types';

/** Empreinte de ce qui influe sur la correction ou l'énoncé (pas sur les indices ni la provenance). */
export function fingerprint(e: Exercise): string {
  const core = JSON.stringify([e.kind, e.statementMd, e.tools, e.givenVariables, e.expectedVariables, e.starterCode, e.compare, e.tests]);
  let h = 2166136261;
  for (let i = 0; i < core.length; i++) { h ^= core.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function diffBanks(oldB: BankFile | undefined, newB: BankFile): BankDiff {
  const o = new Map((oldB?.exercises ?? []).map((e) => [e.key, fingerprint(e)]));
  const n = new Map(newB.exercises.map((e) => [e.key, e] as const));
  const d: BankDiff = { added: [], removed: [], changed: [], unchanged: 0, changedTitles: {} };
  for (const [k, e] of n) {
    if (!o.has(k)) d.added.push(k);
    else if (o.get(k) !== fingerprint(e)) { d.changed.push(k); d.changedTitles[k] = e.title; }
    else d.unchanged++;
  }
  for (const k of o.keys()) if (!n.has(k)) d.removed.push(k);
  return d;
}

export function validateBank(x: unknown): asserts x is BankFile {
  const b = x as Partial<BankFile>;
  if (!b || b.format !== 1 || typeof b.version !== 'string' || !Array.isArray(b.exercises) || !Array.isArray(b.sessions)) throw new Error('Fichier de banque invalide (format 1 attendu).');
  const keys = new Set<string>();
  for (const e of b.exercises) {
    if (!e.key || keys.has(e.key)) throw new Error(`Clé d'exercice absente ou en double : ${e.key}`);
    keys.add(e.key);
    if (!Array.isArray(e.tests) || typeof e.statementMd !== 'string') throw new Error(`Exercice ${e.key} incomplet.`);
  }
  for (const s of b.sessions) for (const k of s.exerciseKeys) if (!keys.has(k)) throw new Error(`La séance ${s.number} référence un exercice inconnu : ${k}`);
}
