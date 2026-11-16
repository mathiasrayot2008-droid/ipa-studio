import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { AppRoutes } from './app/routes';
import { registerServiceWorker } from './app/pwa';

if (import.meta.env.VITE_E2E) void import('./e2e');
registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRoutes />
  </StrictMode>,
);
