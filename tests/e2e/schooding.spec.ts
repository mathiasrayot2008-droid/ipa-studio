import { expect, test, type Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';

// Test B : la banque Schooding privée est importée VIA L'INTERFACE, puis des exercices représentatifs
// (fragments, dessin, grille, robot/runner, variables « déclarées seulement ») sont corrigés dans Chrome réel
// avec le vrai Java (CheerpJ). Les fichiers privés ne sont jamais commités : le test est ignoré s'ils sont absents.
const BANK = 'private/schooding-bank-2026-11-16.json';
const SOLS = 'private/schooding-solutions-2026-11-16.json';
const have = existsSync(BANK) && existsSync(SOLS);
const KEYS = ['sch-2939', 'sch-493', 'sch-558', 'sch-2931', 'sch-483', 'sch-514', 'sch-529', 'sch-526', 'sch-545', 'sch-546', 'sch-555', 'sch-4464'];

async function paste(page: Page, code: string) {
  await page.locator('.cm-content').first().click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.evaluate((c) => {
    const el = document.querySelector('.cm-content')!;
    const dt = new DataTransfer(); dt.setData('text/plain', c);
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  }, code);
}

test.describe('test B — TP Schooding (banque privée)', () => {
  test.skip(!have, 'banque privée absente (private/ n’est jamais commité)');
  test.use({ viewport: { width: 1280, height: 800 } });

  test('import via l’interface, puis correction fonctionnelle de ≥ 10 exercices représentatifs', async ({ page }) => {
    test.setTimeout(1_200_000);
    const bank = JSON.parse(readFileSync(BANK, 'utf8')) as { exercises: { key: string; kind: string; starterCode: string; tests: unknown[] }[] };
    const sols = (JSON.parse(readFileSync(SOLS, 'utf8')) as { solutions: Record<string, string> }).solutions;
    const keys = KEYS.filter((k) => bank.exercises.some((e) => e.key === k));
    expect(keys.length).toBeGreaterThanOrEqual(10);
    expect(new Set(keys.map((k) => bank.exercises.find((e) => e.key === k)!.kind)).size).toBeGreaterThanOrEqual(4);

    // 1. Aucune banque : message clair, pas d'écran vide.
    await page.goto('/#/tp');
    await expect(page.getByTestId('bank-empty')).toBeVisible();

    // 2. Import par l'interface (aperçu puis import).
    await page.goto('/#/importer');
    await page.getByTestId('file-bank').setInputFiles(BANK);
    await page.getByTestId('file-solutions').setInputFiles(SOLS);
    await expect(page.getByTestId('preview')).toContainText('79 exercices');
    await page.getByTestId('import-local').click();
    await expect(page.getByTestId('import-msg')).toContainText('importée');

    // 3. La liste des TP apparaît, groupée par séances.
    await page.goto('/#/tp');
    await expect(page.getByTestId('tp-summary')).toContainText('0 / 79');
    await expect(page.getByTestId('session-1')).toBeVisible();

    // 4. Chaque exercice : code de départ ≠ Réussi ; solution de référence = Réussi (tests publics ET cachés).
    for (const k of keys) {
      await page.goto(`/#/tp/${k}`);
      const view = page.getByTestId('exercise-view');
      await expect(view).toBeVisible();
      const res = page.getByRole('region', { name: 'Résultats' }).first();

      await paste(page, bank.exercises.find((e) => e.key === k)!.starterCode || '// vide\n');
      await view.getByRole('button', { name: /Vérifier/ }).click();
      await expect(res.getByText(/^(Partiel|Échoué|Erreur de compilation)/).first()).toBeVisible({ timeout: 180_000 });
      await expect(res.getByText('Réussi', { exact: true })).toHaveCount(0);

      await paste(page, sols[k]!);
      await view.getByRole('button', { name: /Vérifier/ }).click();
      await expect(res.getByText('Réussi', { exact: true }), `${k} : la solution de référence doit réussir`).toBeVisible({ timeout: 180_000 });
    }

    // 5. La progression est enregistrée et survit au rechargement.
    await page.goto('/#/tp');
    await page.reload();
    await expect(page.getByTestId('tp-summary')).toContainText(`${keys.length} / 79`);

    // 6. Un exercice sans correction automatique annonce clairement sa limite.
    await page.goto('/#/tp/sch-4484');
    await expect(page.getByRole('note')).toContainText('correction automatique n’est pas disponible');
  });
});
