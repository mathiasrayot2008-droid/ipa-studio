import type { Attempt, Exercise } from '@/types/bank';
import type { CheckResult } from '@/java/grade';
import type { Repo, TpProgressEntry } from './types';

export interface AttemptContext {
  context: Attempt['context'];
  dstId?: string;
  hintsUsed?: 0 | 1 | 2 | 3;
  solutionShown?: boolean;
  startedAt: number;       // epoch ms : début de travail sur l'exercice
  bankVersion?: string;
}

const STATUS: Record<CheckResult['status'], Attempt['status']> = { reussi: 'reussi', partiel: 'partiel', echoue: 'echoue', compilation: 'compilation', interdit: 'echoue', crash: 'echoue' };

export function buildAttempt(ex: Pick<Exercise, 'key' | 'provenance'>, r: CheckResult, code: string, c: AttemptContext, before: { attempts: number }): Attempt {
  return {
    exerciseKey: ex.key, context: c.context, dstId: c.dstId, code, status: STATUS[r.status], score: r.score, testsPassed: r.passed, testsTotal: r.total,
    hintsUsed: c.hintsUsed ?? 0, solutionShown: c.solutionShown ?? false, durationSec: Math.max(0, Math.round((Date.now() - c.startedAt) / 1000)),
    attemptsBefore: before.attempts, firstTimeSeen: before.attempts === 0, errorTags: r.errorTags, createdAt: new Date().toISOString(),
    bankVersion: c.bankVersion ?? ex.provenance.bankVersion,
  };
}

/** Enregistre une tentative (tests complets) et met à jour la progression de l'exercice. Renvoie l'entrée de progression. */
export async function recordAttempt(repo: Repo, ex: Pick<Exercise, 'key' | 'provenance'>, r: CheckResult, code: string, c: AttemptContext): Promise<TpProgressEntry> {
  const progress = await repo.getProgress();
  const prev = progress[ex.key];
  const a = buildAttempt(ex, r, code, c, { attempts: prev?.attempts ?? 0 });
  await repo.addAttempt(a);
  const entry: TpProgressEntry = {
    status: r.status === 'reussi' ? 'reussi' : prev?.status === 'reussi' ? 'reussi' : 'en-cours',
    bestScore: Math.max(prev?.bestScore ?? 0, r.score),
    timeSec: prev?.status === 'reussi' ? prev.timeSec : a.durationSec,
    attempts: (prev?.attempts ?? 0) + 1,
    updatedAt: Date.now(),
  };
  await repo.setProgressEntry(ex.key, entry);
  return entry;
}
