// Crochet de test E2E : chargé UNIQUEMENT quand le build est fait avec VITE_E2E=1 (jamais en production).
import { evaluate } from '@/java/evaluate';
import { javaRunner, useJavaStatus } from '@/java/runner';
import { useAuth } from '@/data/auth';

/** Simule l'écoulement du temps sur un DST enregistré (recule départ et échéance) : le même chemin qu'un retour tardif sur l'onglet. */
async function shiftDeadline(id: string, ms: number) {
  const repo = useAuth.getState().repo;
  const d = await repo.getDst(id);
  if (!d) throw new Error(`DST « ${id} » introuvable`);
  await repo.saveDst(id, { ...d, deadlineAt: d.deadlineAt - ms, startedAt: d.startedAt - ms });
}

(window as unknown as { __ipa: unknown }).__ipa = { evaluate, javaRunner, useJavaStatus, repo: () => useAuth.getState().repo, shiftDeadline };
