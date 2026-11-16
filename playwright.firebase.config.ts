import { defineConfig } from '@playwright/test';

// E2E comptes : l'appli est construite pour les ÉMULATEURS Firebase (aucun appel vers Google).
const proxy = process.env.HTTPS_PROXY;
export default defineConfig({
  testDir: 'tests/e2e-firebase',
  timeout: 300_000,
  expect: { timeout: 60_000 },
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4174',
    launchOptions: {
      executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome',
      args: proxy ? [`--proxy-server=${proxy}`, '--proxy-bypass-list=127.0.0.1;localhost'] : [],
    },
  },
  webServer: {
    command: 'VITE_E2E=1 VITE_FIREBASE_EMULATOR=1 npx vite build --outDir dist-fb && npx vite preview --outDir dist-fb --port 4174 --strictPort --host 127.0.0.1',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
