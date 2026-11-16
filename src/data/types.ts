import type { Attempt, DstSubject, NotionId, NotionMastery } from '@/types/bank';

export interface Settings { theme: 'dark' | 'light'; editorFont: number; asOfSession: number | null }
export const DEFAULT_SETTINGS: Settings = { theme: 'dark', editorFont: 15, asOfSession: null };

export type StoredAttempt = Attempt & { id: string };

export interface TpProgressEntry { status: 'nouveau' | 'en-cours' | 'reussi'; bestScore: number; timeSec: number; attempts: number; updatedAt: number }
export type TpProgress = Record<string, TpProgressEntry>;

export interface MasteryDoc {
  notions: Partial<Record<NotionId, NotionMastery>>;
  errorTagCounts: Record<string, number>;
  totals: { attempts: number; successes: number };
  updatedAt: number;
}
export const EMPTY_MASTERY: MasteryDoc = { notions: {}, errorTagCounts: {}, totals: { attempts: 0, successes: 0 }, updatedAt: 0 };

export interface Draft { code: string; updatedAt: number }

export type DstStatus = 'running' | 'submitted';
export interface DstRecord {
  subject: DstSubject;
  status: DstStatus;
  startedAt: number;
  /** Échéance absolue (epoch ms) : le minuteur survit à la fermeture de l'onglet. */
  deadlineAt: number;
  submittedAt?: number;
  answers: Record<string, string>;
  hintsUsed: Record<string, 0 | 1 | 2 | 3>;
  solutionShown: Record<string, boolean>;
  results?: Record<string, { score: number; passed: number; total: number; status: string }>;
  grade?: { points: number; outOf: number; note20: number };
  updatedAt: number;
}

/** Contrat commun du stockage de l'étudiant (local ou Firestore). Toutes les écritures sont idempotentes. */
export interface Repo {
  readonly kind: 'local' | 'firestore';
  getSettings(): Promise<Settings>;
  setSettings(s: Partial<Settings>): Promise<void>;
  getDraft(exerciseKey: string): Promise<Draft | undefined>;
  setDraft(exerciseKey: string, code: string): Promise<void>;
  addAttempt(a: Attempt): Promise<string>;
  listAttempts(opts?: { limit?: number; exerciseKey?: string }): Promise<StoredAttempt[]>;
  getProgress(): Promise<TpProgress>;
  setProgressEntry(exerciseKey: string, e: TpProgressEntry): Promise<void>;
  getMastery(): Promise<MasteryDoc>;
  setMastery(m: MasteryDoc): Promise<void>;
  saveDst(id: string, d: DstRecord): Promise<void>;
  getDst(id: string): Promise<DstRecord | undefined>;
  listDsts(): Promise<{ id: string; record: DstRecord }[]>;
  /** Pour la migration invité → compte et l'export. */
  exportAll(): Promise<RepoExport>;
  importAll(x: RepoExport): Promise<void>;
}

export interface RepoExport {
  version: 1;
  settings: Settings;
  drafts: Record<string, Draft>;
  attempts: StoredAttempt[];
  progress: TpProgress;
  mastery: MasteryDoc;
  dsts: Record<string, DstRecord>;
}

/** Les clés de variantes contiennent « / » : interdit dans un identifiant de document Firestore. */
export const encodeKey = (k: string) => k.replace(/\//g, '~');
export const decodeKey = (k: string) => k.replace(/~/g, '/');
