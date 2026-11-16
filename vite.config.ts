/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

/** Écrit asset-manifest.json : la liste des fichiers du build que le service worker met en cache à l'installation
 *  (tout sauf le SDK Firestore, inutile hors mode cloud). Ainsi, après une première visite, toute l'application s'ouvre sans réseau. */
function assetManifest(): Plugin {
  return {
    name: 'ipa-asset-manifest',
    apply: 'build',
    generateBundle(_o, bundle) {
      const files = Object.entries(bundle)
        .filter(([name, out]) => name.startsWith('assets/') && !(out.type === 'chunk' && out.code.includes('firestore.googleapis.com')))
        .map(([name]) => name);
      this.emitFile({ type: 'asset', fileName: 'asset-manifest.json', source: JSON.stringify({ files }) });
    },
  };
}

// BASE_PATH vaut '/ipa-studio/' en CI (GitHub Pages), '/' en local.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss(), assetManifest()],
  resolve: {
    alias: { '@': path.resolve(root, 'src'), '@contracts': path.resolve(root, 'contracts') },
  },
  // Deux gros chunks chargés à la demande : le SDK Firestore (mode cloud seulement) et CodeMirror (ouverture d'un exercice).
  build: { target: 'es2022', sourcemap: false, chunkSizeWarningLimit: 650 },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
  },
});
