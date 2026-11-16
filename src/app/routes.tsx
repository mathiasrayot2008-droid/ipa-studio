import { HashRouter, Route, Routes } from 'react-router-dom';
import Layout from './Layout';
import { Page } from './Page';

const Soon = ({ title }: { title: string }) => <Page title={title}>Écran en cours de construction.</Page>;

// HashRouter : GitHub Pages ne sait pas servir de routes profondes (pas de réécriture 404 → index).
export function AppRoutes() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Soon title="Tableau de bord" />} />
          <Route path="tp/*" element={<Soon title="TP Schooding" />} />
          <Route path="entrainement/*" element={<Soon title="Entraînement ciblé" />} />
          <Route path="dst/*" element={<Soon title="DST" />} />
          <Route path="historique/*" element={<Soon title="Historique" />} />
          <Route path="progression" element={<Soon title="Progression" />} />
          <Route path="fiches/*" element={<Soon title="Fiches de cours" />} />
          <Route path="parametres" element={<Soon title="Paramètres" />} />
          <Route path="*" element={<Page title="Page introuvable" />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
