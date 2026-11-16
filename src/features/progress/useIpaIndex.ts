import { useEffect, useState } from 'react';
import { IPA_POOL_VERSION, loadIndex, type IpaIndex } from '@/bank/ipaPool';

export function useIpaIndex() {
  const [index, setIndex] = useState<IpaIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { void loadIndex(IPA_POOL_VERSION).then(setIndex).catch((e: Error) => setError(e.message)); }, []);
  return { index, error };
}
