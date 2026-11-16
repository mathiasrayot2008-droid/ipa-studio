import type { BankDiff, BankFile, SolutionsFile } from './types';
import { diffBanks, validateBank } from './diff';

export interface ImportPreview {
  file: BankFile;
  solutions?: SolutionsFile;
  diff: BankDiff;
  fidelity: Record<string, number>;
  /** Exercices sans solution de référence dans le fichier de solutions. */
  missingSolutions: string[];
}

export function fidelityCounts(b: BankFile): Record<string, number> {
  const c: Record<string, number> = {};
  for (const e of b.exercises) { const f = e.provenance.fidelity ?? 'exact'; c[f] = (c[f] ?? 0) + 1; }
  return c;
}

/** Valide un fichier de banque (et ses solutions) et calcule ce que l'import changerait, SANS rien écrire. */
export function previewImport(bankJson: string, solutionsJson: string | undefined, current: BankFile | undefined): ImportPreview {
  let raw: unknown;
  try { raw = JSON.parse(bankJson); } catch { throw new Error('Le fichier de banque n’est pas un JSON valide.'); }
  validateBank(raw);
  const file = raw as BankFile;
  let solutions: SolutionsFile | undefined;
  if (solutionsJson) {
    let s: unknown;
    try { s = JSON.parse(solutionsJson); } catch { throw new Error('Le fichier de solutions n’est pas un JSON valide.'); }
    const sf = s as Partial<SolutionsFile>;
    if (!sf || sf.format !== 1 || typeof sf.solutions !== 'object' || !sf.solutions) throw new Error('Fichier de solutions invalide (format 1 attendu).');
    if (sf.version !== file.version) throw new Error(`Le fichier de solutions (version « ${sf.version} ») ne correspond pas à la banque (version « ${file.version} »).`);
    solutions = sf as SolutionsFile;
  }
  const missingSolutions = file.exercises.filter((e) => e.provenance.fidelity !== 'unavailable' && !solutions?.solutions[e.key]).map((e) => e.key);
  return { file, solutions, diff: diffBanks(current, file), fidelity: fidelityCounts(file), missingSolutions };
}
