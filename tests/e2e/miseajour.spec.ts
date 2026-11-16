import { expect, test, type Page } from '@playwright/test';

// Test M — mise à jour d'un TP : import d'une version fictive via l'interface, progression intacte, retour arrière.
// Les exercices sont FICTIFS (aucun contenu Schooding) : le test tourne donc aussi en CI, sans fichiers privés.
const ex = (n: number, title: string, statement: string) => ({
  key: `sch-${n}`, origin: 'schooding', kind: 'snippet', title, statementMd: statement,
  notions: { primary: 'N02-expressions-arith', secondary: [] }, difficulty: 1, estimatedMinutes: 3,
  tools: [], givenVariables: [{ name: 'n', type: 'int' }], expectedVariables: [{ name: 'd', type: 'int' }],
  starterCode: '', compare: { trimLines: true, ignoreTrailingEmptyLines: true, caseSensitive: true, doubleTolerance: 1e-9 },
  tests: [3, 0, -4, 1000].map((v, i) => ({
    id: `t${i}`, visibility: i < 2 ? 'public' : i === 2 ? 'hidden' : 'edge', weight: i < 2 ? 1 : 2,
    inputs: { n: { type: 'int', value: v } }, expected: { vars: { d: { type: 'int', value: 2 * v } } },
  })),
  hints: ['Indice 1', 'Indice 2', 'Indice 3'], referenceSolution: '', provenance: { source: 'test-fictif', bankVersion: 'x', session: 1, fidelity: 'exact' },
});
const bank = (version: string, exs: ReturnType<typeof ex>[]) => ({
  format: 1, version, builtAt: '2026-11-16T00:00:00Z', sessions: [{ number: 1, title: 'Séance fictive', exerciseKeys: exs.map((e) => e.key) }], exercises: exs,
});
const E1 = ex(9001, 'Double d’un entier (fictif)', 'Calcule `d`, le double de `n`.');
const V1 = bank('e2e-v1', [E1, ex(9002, 'Exercice fictif B', 'Énoncé B')]);
const V2 = bank('e2e-v2', [E1, ex(9002, 'Exercice fictif B', 'Énoncé B — modifié'), ex(9003, 'Nouvel exercice fictif C', 'Énoncé C')]);

const upload = (page: Page, v: object) => page.getByTestId('file-bank').setInputFiles({ name: 'bank.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(v)) });
type Repo = { getProgress(): Promise<unknown>; listAttempts(): Promise<unknown> };
const snapshot = (page: Page) => page.evaluate(`(async () => { const r = window.__ipa.repo(); return JSON.stringify([await r.getProgress(), await r.listAttempts()]); })()`) as Promise<string>;
void (null as unknown as Repo);

test.use({ viewport: { width: 1280, height: 800 } });

test('test M — mise à jour puis retour arrière : exercices et progression intacts', async ({ page }) => {
  test.setTimeout(600_000);

  // 1. Import de la version 1 par l'interface et activation immédiate.
  await page.goto('/#/importer');
  await upload(page, V1);
  await expect(page.getByTestId('preview')).toContainText('2 exercices');
  await page.getByTestId('import-local').click();
  await expect(page.getByTestId('import-msg')).toContainText(/e2e-v1/);
  await expect(page.getByTestId('versions')).toContainText('e2e-v1');

  // 2. Un exercice est réussi dans Chrome réel (vrai Java).
  await page.goto('/#/tp/sch-9001');
  await expect(page.getByTestId('exercise-view')).toBeVisible({ timeout: 60_000 });
  await page.locator('.cm-content').first().click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('int d = 2 * n;');
  await page.getByRole('button', { name: /Vérifier/ }).click();
  await expect(page.getByRole('region', { name: 'Résultats' }).first().getByText('Réussi', { exact: true })).toBeVisible({ timeout: 180_000 });
  const before = await snapshot(page);
  expect(before).toContain('sch-9001');
  expect(before).toContain('reussi');

  // 3. Mise à jour : 1 ajouté, 1 modifié ; l'ancienne version reste installée.
  await page.goto('/#/importer');
  await upload(page, V2);
  await expect(page.getByTestId('diff-summary')).toContainText(/1\s*ajouté/);
  await expect(page.getByTestId('diff-summary')).toContainText(/1\s*modifié/);
  await page.getByTestId('import-local').click();
  await expect(page.getByTestId('versions')).toContainText('e2e-v2');
  await expect(page.getByTestId('versions')).toContainText('e2e-v1');
  await page.goto('/#/tp');
  await expect(page.getByTestId('tp-sch-9003')).toBeVisible();
  await expect(page.getByTestId('tp-sch-9001')).toBeVisible();
  expect(await snapshot(page)).toBe(before);                                  // progression et tentatives : octet pour octet identiques

  // 4. Retour arrière : le nouvel exercice disparaît de la liste, rien n'est perdu.
  await page.goto('/#/importer');
  await page.getByTestId('activate-e2e-v1').click();
  await page.goto('/#/tp');
  await expect(page.getByTestId('tp-sch-9001')).toBeVisible();
  await expect(page.getByTestId('tp-sch-9003')).toHaveCount(0);
  expect(await snapshot(page)).toBe(before);

  // 5. L'exercice réussi est toujours marqué réussi après tous ces changements de version.
  await page.goto('/#/tp/sch-9001');
  await expect(page.getByTestId('exercise-view')).toBeVisible({ timeout: 60_000 });
  expect(await snapshot(page)).toBe(before);
});
