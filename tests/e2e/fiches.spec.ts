import { expect, test } from '@playwright/test';
import { FICHES } from '../../src/content/fiches';

// Fiches de cours : 22 notions, ancres #N08, recherche, rendu du code, affichage mobile.
test.use({ viewport: { width: 1280, height: 800 } });

test('fiches : 22 notions, ancre, recherche, rendu', async ({ page }) => {
  expect(FICHES).toHaveLength(22);
  expect(new Set(FICHES.map((f) => f.id)).size).toBe(20);

  await page.goto('/#/fiches');
  await expect(page.getByTestId('fiches').locator('> li')).toHaveCount(20);

  // Ancre : la fiche demandée est ouverte et visible.
  await page.goto('/#/fiches#N08');
  const n08 = page.locator('#fiche-N08 details');
  await expect(n08).toHaveAttribute('open', '');
  await expect(n08.locator('pre').first()).toContainText('for (int i = 0; i < n; i++)');
  await expect(page.locator('#fiche-N08')).toBeInViewport();
  await page.screenshot({ path: 'test-results/fiches-n08.png' });

  // Le lien d'entraînement ouvre un DST de 30 min restreint à la notion.
  const href = await page.getByTestId('fiche-train-N08').getAttribute('href');
  expect(href).toContain('/dst?');
  expect(href).toContain('notions=N08');
  expect(href).toContain('dur=30');

  // Recherche plein texte.
  await page.getByTestId('fiches-search').fill('equals');
  const hits = await page.getByTestId('fiches').locator('> li').count();
  expect(hits).toBeGreaterThanOrEqual(1);
  expect(hits).toBeLessThan(20);
  await expect(page.locator('#fiche-N20')).toBeVisible();
  await page.getByTestId('fiches-search').fill('zzzzzz');
  await expect(page.getByText('Aucune fiche ne correspond.')).toBeVisible();
});

test('fiches : mobile, sans débordement horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto('/#/fiches#N16');
  await expect(page.locator('#fiche-N16 details')).toHaveAttribute('open', '');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.screenshot({ path: 'test-results/fiches-mobile.png' });
});
