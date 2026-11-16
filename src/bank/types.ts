import type { Exercise } from '@/types/bank';

/** Fichier de banque produit par `scripts/schooding/build.ts` (privé : contient les énoncés Schooding). */
export interface BankSession { number: number; title: string; schoodingId?: number; exerciseKeys: string[] }
export interface BankFile {
  format: 1;
  version: string;
  builtAt: string;
  sessions: BankSession[];
  exercises: Exercise[];
}
/** Solutions de référence : document séparé, lu seulement quand l'étudiant demande la solution (mode assisté). */
export interface SolutionsFile { format: 1; version: string; solutions: Record<string, string> }

export interface BankVersionInfo { version: string; builtAt: string; importedAt: string; exerciseCount: number; sessionCount: number }
export interface BankHistoryEntry { at: string; action: 'import' | 'activate' | 'rollback'; version: string; from?: string | null }
export interface BankManifest { current: string | null; versions: BankVersionInfo[]; history: BankHistoryEntry[] }
export const EMPTY_MANIFEST: BankManifest = { current: null, versions: [], history: [] };

export interface BankDiff {
  added: string[];
  removed: string[];
  changed: string[];
  unchanged: number;
  /** Exercices dont la correction (tests, outils, énoncé…) change : les tentatives passées restent valables mais ont été notées avec l'ancienne version. */
  changedTitles: Record<string, string>;
}

export interface ImportReport { version: string; diff: BankDiff; activated: boolean; exerciseCount: number }

/** Source de banque : locale (IndexedDB, fichier importé) ou Firestore (cohorte). Les versions sont IMMUABLES. */
export interface BankSource {
  readonly kind: 'local' | 'firestore';
  getManifest(): Promise<BankManifest>;
  getVersion(version: string): Promise<BankFile | undefined>;
  getSolution(version: string, key: string, session: number): Promise<string | undefined>;
  /** Enregistre une nouvelle version (sans l'activer). Refuse d'écraser une version existante différente. */
  putVersion(file: BankFile, solutions?: SolutionsFile): Promise<void>;
  /** Active une version existante (import, mise à jour ou retour arrière). */
  activate(version: string, action: BankHistoryEntry['action']): Promise<void>;
}
