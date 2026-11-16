import { expect, test, type Page } from '@playwright/test';

const WRONG = 'double mean = (v1 + v2 + v3 + v4) / 3;';
const RIGHT = 'double mean = (v1 + v2 + v3 + v4) / 4;';

async function setCode(page: Page, code: string) {
  await page.locator('.cm-content').first().click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Delete');
  await page.keyboard.type(code);
}

test.describe('desktop 1280×800', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('éditeur, énoncé, exécution réelle, diagnostics FR, score', async ({ page }) => {
    await page.goto('/#/e2e/exercise');
    const view = page.getByTestId('exercise-view');
    await expect(view.getByRole('heading', { name: 'Moyenne de quatre valeurs' }).first()).toBeVisible();
    await expect(view.getByText('Variables fournies').first()).toBeVisible();
    await expect(view.getByText('void debug(TYPE value)').first()).toBeVisible();

    // code faux : le résultat montre l'écart sur les tests publics
    await setCode(page, WRONG);
    await view.getByRole('button', { name: /Vérifier/ }).click();
    const res = page.getByRole('region', { name: 'Résultats' }).first();
    await expect(res.getByText('Partiel', { exact: true })).toBeVisible({ timeout: 120_000 });
    await expect(res).toContainText('mean vaut');
    await expect(res).toContainText('Test caché');
    await expect(res.getByText(/Ce test est caché/).first()).toBeVisible();
    // aucune valeur attendue d'un test caché n'apparaît (h1 attend 1.9375)
    await expect(res).not.toContainText('1.9375');

    // bon code
    await setCode(page, RIGHT);
    await view.getByRole('button', { name: /Vérifier/ }).click();
    await expect(res.getByText('Réussi', { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(res).toContainText('4/4 tests');

    // erreur de syntaxe : message français + ligne
    await setCode(page, 'double mean = (v1 + v2 +);');
    await view.getByRole('button', { name: /Vérifier/ }).click();
    await expect(res.getByText('Erreur de compilation', { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(res).toContainText('Ligne 1');
    await expect(res).toContainText(/syntaxe/i);

    // « Exécuter » ne lance que les tests publics
    await setCode(page, RIGHT);
    await view.getByRole('button', { name: /Exécuter/ }).click();
    await expect(res).toContainText('2/2 tests publics', { timeout: 30_000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: 'test-results/desktop-exercise.png' });
  });
});

test.describe('mobile 390×844 (tactile)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });

  test('3 onglets, barre de symboles, bascule auto sur Résultats, cibles ≥ 44 px, pas de débordement', async ({ page }) => {
    await page.goto('/#/e2e/exercise');
    const view = page.getByTestId('exercise-view');
    const tabs = view.getByRole('tablist');
    await expect(tabs.getByRole('tab', { name: 'Énoncé' })).toHaveAttribute('aria-selected', 'true');
    await expect(view.getByText('Variables fournies')).toBeVisible();

    await tabs.getByRole('tab', { name: 'Code' }).tap();
    await expect(page.getByTestId('mobile-keys')).toBeVisible();
    await page.locator('.cm-content').first().tap();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Delete');
    // saisie via la barre de symboles (celle d'un téléphone) + clavier pour les lettres
    await page.keyboard.type('double mean = ');
    await page.getByRole('button', { name: 'Insérer (' }).tap();
    await expect(page.locator('.cm-content').first()).toContainText('double mean = (');
    await page.keyboard.type('v1 + v2 + v3 + v4');
    await page.getByRole('button', { name: 'Insérer )' }).tap();
    await page.keyboard.type(' / 4');
    await page.getByRole('button', { name: 'Insérer ;' }).tap();
    await expect(page.locator('.cm-content').first()).toContainText('double mean = (v1 + v2 + v3 + v4) / 4;');

    await view.getByRole('button', { name: /Vérifier/ }).tap();
    await expect(tabs.getByRole('tab', { name: 'Résultats' })).toHaveAttribute('aria-selected', 'true', { timeout: 120_000 });
    await expect(page.getByRole('region', { name: 'Résultats' })).toContainText('Réussi');

    // ergonomie : tailles tactiles et pas de défilement horizontal
    const small = await page.evaluate(() => {
      const bad: string[] = [];
      document.querySelectorAll('[data-testid="exercise-view"] button, [data-testid="exercise-view"] [role="tab"]').forEach((el) => {
        const r = (el as HTMLElement).getBoundingClientRect();
        if (r.width > 0 && (r.height < 43.5 || r.width < 30)) bad.push(`${(el.textContent || el.getAttribute('aria-label') || '').trim()} ${Math.round(r.width)}×${Math.round(r.height)}`);
      });
      return bad;
    });
    expect(small, 'boutons trop petits').toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: 'test-results/mobile-results.png' });
  });
});
