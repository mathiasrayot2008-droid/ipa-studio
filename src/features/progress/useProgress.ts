import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/data/auth';
import { EMPTY_MASTERY, type DstRecord, type MasteryDoc, type StoredAttempt, type TpProgress } from '@/data/types';

export interface ProgressData { mastery: MasteryDoc; progress: TpProgress; attempts: StoredAttempt[]; dsts: { id: string; record: DstRecord }[] }
const EMPTY: ProgressData = { mastery: EMPTY_MASTERY, progress: {}, attempts: [], dsts: [] };

/** Charge d'un coup tout ce qu'il faut aux écrans de suivi (maîtrise, progression des TP, tentatives récentes, DST). */
export function useProgressData(attemptLimit = 200) {
  const repo = useAuth((a) => a.repo);
  const status = useAuth((a) => a.status);
  const [data, setData] = useState<ProgressData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [mastery, progress, attempts, dsts] = await Promise.all([repo.getMastery(), repo.getProgress(), repo.listAttempts({ limit: attemptLimit }), repo.listDsts()]);
      setData({ mastery, progress, attempts, dsts });
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setLoading(false); }
  }, [repo, attemptLimit]);

  useEffect(() => { if (status !== 'loading') void reload(); }, [status, reload]);
  return { ...data, loading, error, reload, repo };
}
