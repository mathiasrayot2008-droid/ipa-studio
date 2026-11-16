/** Enregistre le service worker (production uniquement, jamais pendant les tests E2E ni en développement). */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || import.meta.env.VITE_E2E || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined);
  });
}
