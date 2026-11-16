import { useEffect, useState } from 'react';

export function useMediaQuery(q: string): boolean {
  const get = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(q).matches : false);
  const [m, setM] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const f = () => setM(mq.matches);
    f();
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, [q]);
  return m;
}
/** ≥ 768 px : disposition bureau (barre latérale, énoncé et éditeur côte à côte). */
export const useIsDesktop = () => useMediaQuery('(min-width: 768px)');
