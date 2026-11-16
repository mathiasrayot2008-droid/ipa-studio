import type { DstConfig, DstSubject, Exercise, NotionId } from '@/types/bank';
import { composeDst, type ComposeContext } from '@/engine/compose';
import { gradeDst, type ExerciseOutcome } from '@/engine/scoring';
import { newSeed } from '@/engine/rng';
import { evaluate } from '@/java/evaluate';
import { recordAttempt } from '@/data/attempts';
import type { DstItemResult, DstRecord, Repo } from '@/data/types';
import { IPA_POOL_VERSION, loadFullExercise, loadIndex } from '@/bank/ipaPool';

export const DST_MIN = 15;
export const DST_MAX = 240;

/** Contexte de composition : banque réelle + ce que l'on sait de l'étudiant (maîtrise, fraîcheur, exercices déjà réussis, familles récentes). */
export async function buildComposeContext(repo: Repo, version = IPA_POOL_VERSION): Promise<ComposeContext> {
  const [idx, mastery, progress, dsts] = await Promise.all([loadIndex(version), repo.getMastery(), repo.getProgress(), repo.listDsts()]);
  const familyOf = new Map(idx.entries.map((e) => [e.key, e.familyId]));
  const now = Date.now();
  const m: Partial<Record<NotionId, number>> = {}; const days: Partial<Record<NotionId, number>> = {};
  for (const [n, v] of Object.entries(mastery.notions)) {
    if (!v) continue;
    m[n as NotionId] = v.estimate;
    if (v.lastSuccessAt) days[n as NotionId] = Math.max(0, Math.round((now - Date.parse(v.lastSuccessAt)) / 86_400_000));
  }
  const recentFamilies = dsts.slice(0, 3).map((d) => [...new Set(d.record.subject.items.map((it) => familyOf.get(it.exerciseKey)).filter((x): x is string => Boolean(x)))]);
  const succeededKeys = new Set(Object.entries(progress).filter(([, p]) => p.status === 'reussi').map(([k]) => k));
  return { pool: idx.entries, poolVersion: idx.version, generatorVersion: idx.generatorVersion, now: new Date(now).toISOString(), mastery: m, daysSincePractice: days, recentFamilies, succeededKeys };
}

export function composeFor(config: DstConfig, ctx: ComposeContext, seed = newSeed()): DstSubject {
  return composeDst({ ...config, durationMin: Math.min(DST_MAX, Math.max(DST_MIN, Math.round(config.durationMin))) }, seed, ctx);
}

/** Démarre un DST : l'échéance est ABSOLUE (epoch ms), le minuteur survit donc à la fermeture de l'onglet et à un rechargement. */
export function startRecord(subject: DstSubject, now = Date.now()): DstRecord {
  return { subject, status: 'running', startedAt: now, deadlineAt: now + subject.config.durationMin * 60_000, answers: {}, hintsUsed: {}, solutionShown: {}, updatedAt: now };
}

export const remainingMs = (r: Pick<DstRecord, 'deadlineAt'>, now = Date.now()) => Math.max(0, r.deadlineAt - now);
export const isExpired = (r: Pick<DstRecord, 'deadlineAt' | 'status'>, now = Date.now()) => r.status === 'running' && now >= r.deadlineAt;

export function formatClock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60;
  return `${h > 0 ? `${h}:` : ''}${String(m).padStart(h > 0 ? 2 : 1, '0')}:${String(sec).padStart(2, '0')}`;
}

/** Un exercice est « non rendu » s'il n'y a aucun code, ou seulement le code de départ. */
export const isBlank = (code: string | undefined, ex: Pick<Exercise, 'starterCode'>) => !code || !code.trim() || code.trim() === ex.starterCode.trim();

export interface GradingProgress { done: number; total: number; key: string }

/**
 * Remise : charge les tests cachés et les solutions (jamais avant), corrige chaque exercice par tests fonctionnels,
 * enregistre les tentatives (contexte « dst ») et calcule la note sur 20 avec les pénalités d'indices.
 * Idempotente : rejouable si l'onglet a été fermé pendant la correction.
 */
export async function submitDst(repo: Repo, id: string, rec: DstRecord, onProgress?: (p: GradingProgress) => void): Promise<DstRecord> {
  const version = rec.subject.bankVersion;
  const results: Record<string, DstItemResult> = {};
  const outcomes: Record<string, ExerciseOutcome> = {};
  const items = rec.subject.items;
  const endedAt = Math.min(Date.now(), rec.deadlineAt); // fin du travail : la remise tardive n'allonge pas le temps
  for (let i = 0; i < items.length; i++) {
    const key = items[i]!.exerciseKey;
    onProgress?.({ done: i, total: items.length, key });
    const ex = await loadFullExercise(key, version);
    const code = rec.answers[key];
    const hintsUsed = rec.hintsUsed[key] ?? 0; const solutionShown = rec.solutionShown[key] ?? false;
    if (isBlank(code, ex)) {
      results[key] = { score: 0, passed: 0, total: ex.tests.length, status: 'non-rendu' };
      outcomes[key] = { score: 0, hintsUsed, solutionShown };
      continue;
    }
    const r = await evaluate(ex, code!, 'check');
    results[key] = {
      score: r.score, passed: r.passed, total: r.total, status: r.status, errorTags: r.errorTags,
      failedTests: r.verdicts.filter((v) => !v.passed).map((v) => v.id),
      ...(r.diagnostics[0] ? { message: r.diagnostics[0].fr } : r.internalError ? { message: r.internalError } : {}),
    };
    outcomes[key] = { score: r.score, hintsUsed, solutionShown };
    await recordAttempt(repo, ex, r, code!, { context: 'dst', dstId: rec.subject.id, hintsUsed, solutionShown, startedAt: rec.startedAt, bankVersion: version }).catch(() => undefined);
  }
  onProgress?.({ done: items.length, total: items.length, key: '' });
  const g = gradeDst(rec.subject, outcomes);
  const out: DstRecord = { ...rec, status: 'submitted', submittedAt: endedAt, results, grade: { points: g.points, outOf: g.outOf, note20: g.note20 }, updatedAt: Date.now() };
  await repo.saveDst(id, out);
  return out;
}
