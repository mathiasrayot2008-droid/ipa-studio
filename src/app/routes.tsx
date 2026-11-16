import { HashRouter, Route, Routes } from 'react-router-dom';
import Layout from './Layout';
import { lazy, useEffect } from 'react';
import { Page } from './Page';
import { javaRunner } from '@/java/runner';
import { useAuth } from '@/data/auth';
import { useTheme } from './theme';
import { useBank } from '@/bank/store';

const Settings = lazy(() => import('@/features/settings/Settings'));
const TpList = lazy(() => import('@/features/tp/TpList'));
const TpDetail = lazy(() => import('@/features/tp/TpDetail'));
const ImportPage = lazy(() => import('@/features/bank/ImportPage'));
const DstPage = lazy(() => import('@/features/dst/DstPage'));
const DstRun = lazy(() => import('@/features/dst/DstRun'));
const Dashboard = lazy(() => import('@/features/progress/Dashboard'));
const ProgressPage = lazy(() => import('@/features/progress/ProgressPage'));
const HistoryPage = lazy(() => import('@/features/progress/HistoryPage'));
const TrainingPage = lazy(() => import('@/features/progress/TrainingPage'));
const FichesPage = lazy(() => import('@/features/fiches/FichesPage'));
const Atelier = lazy(() => import('@/features/atelier/Atelier'));
const E2EExercise = import.meta.env.VITE_E2E ? lazy(() => import('@/features/exercise/E2EExercise')) : null;


// HashRouter : GitHub Pages ne sait pas servir de routes profondes (pas de réécriture 404 → index).
/** Initialise le compte au démarrage et applique les réglages enregistrés (thème). */
function AuthInit() {
  const init = useAuth((s) => s.init);
  const repo = useAuth((s) => s.repo);
  const status = useAuth((s) => s.status);
  useEffect(() => { init(); }, [init]);
  useEffect(() => {
    if (status === 'loading') return;
    void repo.getSettings().then((s) => { if (s.theme !== useTheme.getState().theme) useTheme.getState().setTheme(s.theme); }).catch(() => undefined);
  }, [repo, status]);
  return null;
}

/** Charge la banque d'exercices au démarrage, puis la recharge si le compte (donc la source) change. */
function BankInit() {
  const status = useAuth((s) => s.status);
  const cohort = useAuth((s) => s.cohort);
  const load = useBank((b) => b.load);
  useEffect(() => { if (status !== 'loading') void load(); }, [status, cohort, load]);
  return null;
}

function JavaWarmUp() {
  // Préchauffage de Java en tâche de fond (1ʳᵉ compilation ≈ 20 s) : prêt quand l'étudiant ouvre un exercice.
  // Le runtime CheerpJ occupe le fil principal pendant son initialisation : on attend donc que l'écran d'accueil
  // soit chargé et utilisable (≈ 6 s après la fin du chargement) pour ne pas retarder le premier affichage.
  useEffect(() => {
    if (import.meta.env.VITE_NO_WARMUP) return;
    const idle = (window as unknown as { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => void }).requestIdleCallback;
    const start = () => void javaRunner().warmUp().catch(() => undefined);
    let timer: ReturnType<typeof setTimeout>;
    const later = () => { timer = setTimeout(() => (idle ? idle(start, { timeout: 4000 }) : start()), 6000); };
    if (document.readyState === 'complete') later(); else window.addEventListener('load', later, { once: true });
    return () => { clearTimeout(timer); window.removeEventListener('load', later); };
  }, []);
  return null;
}

export function AppRoutes() {
  return (
    <HashRouter>
      <AuthInit />
      <BankInit />
      <JavaWarmUp />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="tp" element={<TpList />} />
          <Route path="tp/:key" element={<TpDetail />} />
          <Route path="importer" element={<ImportPage />} />
          <Route path="entrainement" element={<TrainingPage />} />
          <Route path="dst" element={<DstPage />} />
          <Route path="dst/:id" element={<DstRun />} />
          <Route path="historique" element={<HistoryPage />} />
          <Route path="progression" element={<ProgressPage />} />
          <Route path="fiches" element={<FichesPage />} />
          <Route path="atelier" element={<Atelier />} />
          <Route path="parametres" element={<Settings />} />
          {E2EExercise && <Route path="e2e/exercise" element={<E2EExercise />} />}
          <Route path="*" element={<Page title="Page introuvable" />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
