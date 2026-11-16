import { HashRouter, Route, Routes } from 'react-router-dom';
import Layout from './Layout';
import { lazy, Suspense, useEffect } from 'react';
import { Page } from './Page';
import { javaRunner } from '@/java/runner';

const Atelier = lazy(() => import('@/features/atelier/Atelier'));
const E2EExercise = import.meta.env.VITE_E2E ? lazy(() => import('@/features/exercise/E2EExercise')) : null;

const Soon = ({ title }: { title: string }) => <Page title={title}>Écran en cours de construction.</Page>;

// HashRouter : GitHub Pages ne sait pas servir de routes profondes (pas de réécriture 404 → index).
function JavaWarmUp() {
  // Préchauffage de Java en tâche de fond (1ʳᵉ compilation ≈ 20 s) : prêt quand l'étudiant ouvre un exercice.
  useEffect(() => {
    if (import.meta.env.VITE_NO_WARMUP) return;
    const idle = (window as unknown as { requestIdleCallback?: (f: () => void) => void }).requestIdleCallback;
    const start = () => void javaRunner().warmUp().catch(() => undefined);
    if (idle) idle(start); else setTimeout(start, 1500);
  }, []);
  return null;
}

export function AppRoutes() {
  return (
    <HashRouter>
      <JavaWarmUp />
      <Suspense fallback={<div className="p-6 text-muted">Chargement…</div>}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Soon title="Tableau de bord" />} />
          <Route path="tp/*" element={<Soon title="TP Schooding" />} />
          <Route path="entrainement/*" element={<Soon title="Entraînement ciblé" />} />
          <Route path="dst/*" element={<Soon title="DST" />} />
          <Route path="historique/*" element={<Soon title="Historique" />} />
          <Route path="progression" element={<Soon title="Progression" />} />
          <Route path="fiches/*" element={<Soon title="Fiches de cours" />} />
          <Route path="atelier" element={<Atelier />} />
          <Route path="parametres" element={<Soon title="Paramètres" />} />
          {E2EExercise && <Route path="e2e/exercise" element={<E2EExercise />} />}
          <Route path="*" element={<Page title="Page introuvable" />} />
        </Route>
      </Routes>
      </Suspense>
    </HashRouter>
  );
}
