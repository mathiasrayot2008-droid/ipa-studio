import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Maîtrise, tableau de bord, historique, entraînement sur mes faiblesses et « Comprendre mon erreur avec Claude » :
// un vrai DST est passé dans Chrome réel (vrai Java), puis on vérifie que tout ce qui en découle est cohérent.
const VERSION = 'ipa-1.0.0';
const index = JSON.parse(readFileSync(`public/bank/${VERSION}/index.json`, 'utf8')) as { entries: { key: string; difficulty: number }[] };
const solution = (key: string) => (JSON.parse(readFileSync(`public/bank/${VERSION}/secrets/${key.split('.')[1]}.json`, 'utf8')) as Record<string, { referenceSolution: string }>)[key]!.referenceSolution;

async function paste(page: Page, code: string) {
  await page.locator('.cm-content').first().click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.evaluate((c) => {
    const el = document.querySelector('.cm-content')!;
    const dt = new DataTransfer(); dt.setData('text/plain', c);
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  }, code);
}
type Repo = { getDst(id: string): Promise<unknown>; getMastery(): Promise<{ notions: Record<string, { estimate: number; evidence: number; weightSum: number; distinctFamiliesSucceeded: number }>; totals: { attempts: number; successes: number }; errorTagCounts: Record<string, number> }>; listAttempts(): Promise<{ status: string; context: string; errorTags: string[]; code: string }[]> };
const repo = <T,>(page: Page, f: (r: Repo) => Promise<T>) => page.evaluate(`(async () => { const r = window.__ipa.repo(); return await (${f.toString()})(r); })()`) as Promise<T>;

test.use({ viewport: { width: 1280, height: 800 }, permissions: ['clipboard-read', 'clipboard-write'] });

test('maîtrise, tableau de bord, historique, entraînement sur mes faiblesses, explication par Claude', async ({ page }) => {
  test.setTimeout(900_000);

  // 0. Compte neuf : aucune maîtrise affichée (pas de faux pourcentage).
  await page.goto('/#/');
  await expect(page.getByTestId('home-global')).toHaveText('—');

  // 1. Un DST ciblé (notion N02) : exercice 1 juste, exercice 2 faux (variable non déclarée), le reste non rendu.
  await page.goto('/#/dst');
  await page.getByTestId('scope-notion').check();
  await page.getByTestId('notion-N02').check();
  await page.getByTestId('dur-15').click();
  await page.getByTestId('level-facile').click();
  await page.getByTestId('prepare').click();
  await page.getByTestId('dst-start').click();
  await expect(page.getByTestId('exercise-view')).toBeVisible({ timeout: 60_000 });
  const id = page.url().split('/dst/')[1]!;
  const keys = await page.evaluate(async (i) => ((await (window as unknown as { __ipa: { repo(): { getDst(i: string): Promise<{ subject: { items: { exerciseKey: string }[] } }> } } }).__ipa.repo().getDst(i)).subject.items.map((x) => x.exerciseKey)), id);
  await paste(page, solution(keys[0]!));
  await page.getByTestId('dst-nav-open').click();
  await page.getByTestId('dst-item-1').click();
  await paste(page, 'int incoherent = 12;');
  await page.waitForTimeout(2500);
  await page.getByTestId('dst-submit').click();
  await page.getByTestId('dst-confirm-yes').click();
  await expect(page.getByTestId('dst-note')).toBeVisible({ timeout: 600_000 });

  // 2. La maîtrise stockée suit la formule : Beta(1,2), poids (1 + 0,25·(d−1)), preuve = score × autonomie × essais.
  const m = await repo(page, (r) => r.getMastery());
  expect(m.totals.attempts).toBe(2);
  expect(m.totals.successes).toBe(1);
  const d1 = index.entries.find((e) => e.key === keys[0])!.difficulty; const d2 = index.entries.find((e) => e.key === keys[1])!.difficulty;
  const w1 = 1 + 0.25 * (d1 - 1); const w2 = 1 + 0.25 * (d2 - 1);
  const n = m.notions['N02-expressions-arith']!;
  expect(n.weightSum).toBeCloseTo(w1 + w2, 6);
  expect(n.evidence).toBeCloseTo(w1, 6);
  expect(n.estimate).toBeCloseTo((1 + w1) / (3 + w1 + w2), 6);
  expect(n.distinctFamiliesSucceeded).toBe(1);
  expect(m.errorTagCounts['compile:missing-expected-var']).toBeGreaterThanOrEqual(1);

  // 3. Tableau de bord : pourcentage affiché, N02 non « à retravailler » (les notions jamais travaillées sont plus faibles), erreur récurrente nommée.
  await page.goto('/#/');
  await expect(page.getByTestId('home-global')).toContainText('%');
  await expect(page.getByTestId('weak-list')).not.toContainText('Expressions arithmétiques');
  await expect(page.getByTestId('recurring')).toContainText('Variable demandée non déclarée');
  await page.screenshot({ path: 'test-results/dashboard.png', fullPage: true });

  // 4. « Entraînement sur mes faiblesses » : aperçu prérempli (30 min, assisté, 3 notions) avant de commencer.
  await page.getByTestId('train-weak').click();
  await expect(page.getByTestId('dst-preview')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('rules')).toContainText('assisté');
  await expect(page.getByTestId('dst-start')).toContainText('30 min');
  await expect(page.getByTestId('dur-30')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('scope-notion')).toBeChecked();

  // 5. Progression : détail par notion et recalcul identique à l'agrégat incrémental.
  await page.goto('/#/progression');
  await expect(page.getByTestId('notion-row-N02')).toContainText('familles réussies');
  await page.screenshot({ path: 'test-results/progression.png', fullPage: true });
  const before = (await repo(page, (r) => r.getMastery())).notions['N02-expressions-arith']!.estimate;
  await page.getByTestId('recompute').click();
  await expect(page.getByTestId('recompute-msg')).toContainText('2 tentative');
  const after = (await repo(page, (r) => r.getMastery())).notions['N02-expressions-arith']!.estimate;
  expect(Math.abs(after - before)).toBeLessThan(1e-6);

  // 6. Historique : 2 tentatives de contexte DST, code consultable ; le DST est listé.
  await page.goto('/#/historique');
  await expect(page.getByTestId('hist-dst')).toContainText('/ 20');
  await expect(page.getByTestId('hist-attempts').getByRole('listitem')).toHaveCount(2);
  await page.getByTestId('hist-attempts').getByRole('button').first().click();
  await expect(page.getByTestId('hist-attempts')).toContainText('tentative n°1');

  // 7. « Comprendre mon erreur avec Claude » : message complet, copiable, sans solution ni test caché ; aucun appel réseau vers un service d'IA.
  const aiCalls: string[] = [];
  page.on('request', (r) => { if (/anthropic|claude\.ai|openai/.test(r.url())) aiCalls.push(r.url()); });
  await page.goto(`/#/dst/${id}`);
  await expect(page.getByTestId('dst-note')).toBeVisible();
  await page.getByTestId('res-1').locator('summary').click();
  await page.getByTestId('explain-1').click();
  const prompt = await page.getByTestId('explain-prompt').inputValue();
  expect(prompt).toContain('int incoherent = 12;');
  expect(prompt).toContain('Ne me donne PAS la solution complète');
  expect(prompt).not.toContain(solution(keys[1]!).split('\n')[0]!.trim() || '§§');
  await page.getByTestId('explain-copy').click();
  await expect(page.getByTestId('explain-state')).toContainText('copié');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(prompt);
  const href = await page.getByTestId('explain-open').getAttribute('href');
  expect(href).toMatch(/^https:\/\/claude\.ai\/new\?q=/);
  expect(aiCalls, 'aucune requête vers un service d’IA').toEqual([]);
});
