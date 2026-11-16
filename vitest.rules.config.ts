import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Tests des règles Firestore : exécutés par `npm run test:rules` (émulateur lancé par firebase emulators:exec).
export default defineConfig({
  resolve: { alias: { '@contracts': path.resolve(import.meta.dirname, 'contracts'), '@': path.resolve(import.meta.dirname, 'src') } },
  test: { environment: 'node', globals: true, include: ['tests/rules/**/*.test.ts'], testTimeout: 30_000, hookTimeout: 60_000, fileParallelism: false },
});
