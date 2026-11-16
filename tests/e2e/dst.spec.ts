import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Tests H (aucun indice, solution ni test caché avant la remise), I (minuteur absolu, remise automatique, reprise après rechargement)
// et J (historique) — dans Chrome réel, avec le vrai Java (CheerpJ). Les corrections sont vérifiées sur les points réellement attribués.
const VERSION = 'ipa-1.0.0';
const secretsOf = (key: string) => {
  const fam = key.split('.')[1]!;
  return (JSON.parse(readFileSync(`public/bank/${VERSION}/secrets/${fam}.json`, 'utf8')) as Record<string, { hints: string[]; referenceSolution: string; tests: { id: string }[] }>)[key]!;
};

async function paste(page: Page, code: string) {
  await page.locator('.cm-content').first().click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.evaluate((c) => {
    const el = document.querySelector('.cm-content')!;
    const dt = new DataTransfer(); dt.setData('text/plain', c);
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  }, code);
}

type Rec = { subject: { items: { exerciseKey: string; points: number }[] }; deadlineAt: number; startedAt: number; status: string; hintsUsed: Record<string, number>; answers: Record<string, string>; grade?: { note20: number } };
const getRec = (page: Page, id: string) => page.evaluate(async (i) => (await (window as unknown as { __ipa: { repo: () => { getDst(id: string): Promise<unknown> } } }).__ipa.repo().getDst(i)) as Rec, id);
const dstId = (page: Page) => page.url().split('/dst/')[1]!.split(/[?#]/)[0]!;
const clockSec = async (page: Page) => { const t = (await page.getByTestId('dst-clock').innerText()).trim().split(':').map(Number); return t.reduce((a, b) => a * 60 + b, 0); };

async function prepare(page: Page, opts: { mode: 'examen' | 'assiste' }) {
  await page.goto('/#/dst');
  await expect(page.getByTestId('scope-notion')).toBeVisible();
  await page.getByTestId('scope-notion').check();
  await expect(page.getByTestId('notion-N02')).toBeEnabled();
  await page.getByTestId('notion-N02').check();
  await page.getByTestId('dur-15').click();
  await page.getByTestId('level-facile').click();
  await page.getByTestId(`mode-${opts.mode}`).click();
  await page.getByTestId('prepare').click();
  await expect(page.getByTestId('dst-preview')).toBeVisible();
}

test.describe('DST dans Chrome réel', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('H + J — examen strict : rien de secret avant la remise ; correction fonctionnelle ; historique', async ({ page }) => {
    test.setTimeout(900_000);
    const secretReqs: string[] = [];
    const poolBodies: Record<string, unknown>[][] = [];
    page.on('request', (r) => { if (r.url().includes('/secrets/')) secretReqs.push(r.url()); });
    page.on('response', async (r) => { if (r.url().includes('/pools/')) poolBodies.push((await r.json().catch(() => [])) as Record<string, unknown>[]); });

    await prepare(page, { mode: 'examen' });
    // Aperçu : barème sur 20, règles annoncées, aucun titre d'exercice.
    const n = Number(await page.getByTestId('prev-count').innerText());
    expect(n).toBeGreaterThanOrEqual(2);
    const pts = await Promise.all(Array.from({ length: n }, async (_, i) => Number((await page.getByTestId(`pts-${i}`).innerText()).replace(',', '.'))));
    expect(pts.reduce((a, b) => a + b, 0)).toBeCloseTo(20, 9);
    await expect(page.getByTestId('rules')).toContainText('Aucun indice et aucune solution');
    await expect(page.getByTestId('rules')).toContainText('« Vérifier » n’existe pas');

    await page.getByTestId('dst-start').click();
    await expect(page.getByTestId('exercise-view')).toBeVisible({ timeout: 60_000 });
    const id = dstId(page);
    const rec = await getRec(page, id);
    expect(rec.status).toBe('running');
    const keys = rec.subject.items.map((i) => i.exerciseKey);

    // — Test H : DOM + réseau, AVANT la remise —
    await expect(page.getByTestId('dst-assist')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Vérifier/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Indice|solution/i })).toHaveCount(0);
    const first = secretsOf(keys[0]!);
    // Exercice 1 : solution de référence, puis « Exécuter » (tests publics seulement).
    await paste(page, first.referenceSolution);
    await page.getByRole('button', { name: /Exécuter/ }).click();
    await expect(page.getByRole('region', { name: 'Résultats' }).first().getByText(/tests publics/)).toBeVisible({ timeout: 240_000 });
    const html = await page.content();
    for (const h of first.hints) expect(html).not.toContain(h.slice(0, 40));
    expect(html).not.toContain('data-testid="dst-solution"');
    expect(secretReqs, 'aucune requête vers /secrets/ avant la remise').toEqual([]);
    expect(poolBodies.length, 'les pools publics ont bien été observés').toBeGreaterThan(0);
    for (const list of poolBodies) for (const ex of list) {
      expect((ex.tests as { visibility: string }[]).every((t) => t.visibility === 'public')).toBe(true);
      expect(ex.referenceSolution).toBe('');
      expect((ex.hints as string[]).every((h) => h === '')).toBe(true);
      expect(ex.mutants).toBeUndefined();
    }

    // Exercice 2 : code faux. Exercices suivants : laissés vides (non rendus).
    await page.getByTestId('dst-nav-open').click();
    await page.getByTestId('dst-item-1').click();
    await paste(page, 'int incoherent = 12;');
    await expect.poll(async () => (await getRec(page, id)).answers[keys[1]!], { timeout: 15_000 }).toContain('incoherent');

    // Remise.
    await page.getByTestId('dst-submit').click();
    await expect(page.getByTestId('dst-confirm')).toContainText('exercice(s) sur');
    await page.getByTestId('dst-confirm-yes').click();
    await expect(page.getByTestId('dst-grading')).toBeVisible();
    await expect(page.getByTestId('dst-note')).toBeVisible({ timeout: 600_000 });
    expect(secretReqs.length, 'les secrets ne sont chargés qu’à la remise').toBeGreaterThan(0);

    // Correction : exercice 1 réussi (tous les points), exercice 2 faux = 0, le reste non rendu = 0.
    await expect(page.getByTestId('earned-0')).toContainText(`${String(pts[0]).replace('.', ',')} / ${String(pts[0]).replace('.', ',')}`);
    await expect(page.getByTestId('earned-1')).toContainText(`0 / ${String(pts[1]).replace('.', ',')}`);
    const done = await getRec(page, id);
    expect(done.status).toBe('submitted');
    expect(done.grade!.note20).toBeCloseTo(Math.round(pts[0]! * 10) / 10, 5);
    await expect(page.getByTestId('dst-note')).toContainText(String(Math.round(pts[0]! * 10) / 10).replace('.', ','));
    for (let i = 2; i < n; i++) await expect(page.getByTestId(`res-${i}`)).toContainText('Non rendu');

    // Test J : historique, persistant après rechargement.
    await page.goto('/#/dst');
    await expect(page.getByTestId('dst-history')).toContainText('/ 20');
    await page.reload();
    await expect(page.getByTestId('dst-history')).toContainText('Entraînement ciblé');
    await page.getByTestId('dst-history').getByRole('link').first().click();
    await expect(page.getByTestId('dst-note')).toBeVisible();
  });

  test('I — minuteur absolu : reprise après rechargement, puis remise automatique à l’échéance', async ({ page }) => {
    test.setTimeout(900_000);
    await prepare(page, { mode: 'examen' });
    await page.getByTestId('dst-start').click();
    await expect(page.getByTestId('exercise-view')).toBeVisible({ timeout: 60_000 });
    const id = dstId(page);
    const keys = (await getRec(page, id)).subject.items.map((i) => i.exerciseKey);

    const s1 = await clockSec(page);
    expect(s1).toBeGreaterThan(14 * 60 - 20); expect(s1).toBeLessThanOrEqual(15 * 60);
    await paste(page, secretsOf(keys[0]!).referenceSolution);
    await expect.poll(async () => (await getRec(page, id)).answers[keys[0]!] ?? '', { timeout: 15_000 }).not.toBe('');

    // Fermer / rouvrir : le temps a continué de s'écouler et le code est conservé.
    await page.waitForTimeout(3_000);
    await page.reload();
    await expect(page.getByTestId('dst-clock')).toBeVisible({ timeout: 60_000 });
    const s2 = await clockSec(page);
    expect(s2).toBeLessThan(s1); expect(s1 - s2).toBeLessThan(60);
    await expect(page.locator('.cm-content').first()).toContainText(secretsOf(keys[0]!).referenceSolution.split('\n')[0]!.trim().slice(0, 12));

    // Le temps passe pendant que l'onglet est fermé (écoulement simulé en reculant l'échéance enregistrée).
    await page.goto('/#/dst');
    await expect(page.getByTestId('dst-running')).toBeVisible();
    await page.evaluate(async (i) => (window as unknown as { __ipa: { shiftDeadline(id: string, ms: number): Promise<void> } }).__ipa.shiftDeadline(i, 20 * 60_000), id);
    await page.reload();
    await expect(page.getByTestId('dst-running')).toContainText('temps écoulé');
    await page.getByTestId('dst-running').getByRole('link').click();
    await expect(page.getByTestId('dst-note')).toBeVisible({ timeout: 600_000 });
    const done = await getRec(page, id);
    expect(done.status).toBe('submitted');
    expect(done.answers[keys[0]!]).toContain(secretsOf(keys[0]!).referenceSolution.split('\n')[0]!.trim().slice(0, 12));
    await expect(page.getByTestId('earned-0')).not.toContainText('0 /'); // le travail écrit avant l'échéance est bien corrigé
    await expect(page.locator('body')).toContainText('remise automatique');
  });

  test('assisté — pénalité d’indice annoncée puis appliquée ; solution vue = 0 point', async ({ page }) => {
    test.setTimeout(900_000);
    const secretReqs: string[] = [];
    page.on('request', (r) => { if (r.url().includes('/secrets/')) secretReqs.push(r.url()); });
    await prepare(page, { mode: 'assiste' });
    await expect(page.getByTestId('rules')).toContainText('−10 %');
    await expect(page.getByTestId('rules')).toContainText('Voir la solution = 0 point');
    await page.getByTestId('dst-start').click();
    await expect(page.getByTestId('exercise-view')).toBeVisible({ timeout: 60_000 });
    const id = dstId(page);
    const rec = await getRec(page, id);
    const keys = rec.subject.items.map((i) => i.exerciseKey);
    const pts = rec.subject.items.map((i) => i.points);

    // Avant toute demande : aucun secret chargé, boutons d'aide présents avec leur pénalité.
    await expect(page.getByTestId('dst-hint-btn')).toContainText('−10 %');
    expect(secretReqs).toEqual([]);

    // Exercice 1 : solution correcte avec 2 indices → 75 % des points.
    await page.getByTestId('dst-hint-btn').click();
    await expect(page.getByTestId('dst-assist')).toContainText(secretsOf(keys[0]!).hints[0]!.slice(0, 30));
    await expect(page.getByTestId('dst-hint-btn')).toContainText('−25 %');
    await page.getByTestId('dst-hint-btn').click();
    await expect(page.getByTestId('dst-assist')).toContainText('Pénalité actuelle sur cet exercice : −25 %');
    await paste(page, secretsOf(keys[0]!).referenceSolution);
    await expect.poll(async () => (await getRec(page, id)).hintsUsed[keys[0]!]).toBe(2);

    // Exercice 2 : solution consultée → 0 point même avec le bon code.
    await page.getByTestId('dst-nav-open').click();
    await page.getByTestId('dst-item-1').click();
    await page.getByTestId('dst-solution-btn').click();
    await expect(page.getByTestId('dst-solution-btn')).toContainText('Confirmer');
    await page.getByTestId('dst-solution-btn').click();
    await expect(page.getByTestId('dst-solution')).toBeVisible();
    await paste(page, secretsOf(keys[1]!).referenceSolution);
    await expect.poll(async () => (await getRec(page, id)).answers[keys[1]!] ?? '', { timeout: 15_000 }).not.toBe('');

    await page.getByTestId('dst-submit').click();
    await page.getByTestId('dst-confirm-yes').click();
    await expect(page.getByTestId('dst-note')).toBeVisible({ timeout: 600_000 });
    const fmt = (x: number) => String(Math.round(x * 100) / 100).replace('.', ',');
    await expect(page.getByTestId('earned-0')).toContainText(`${fmt(pts[0]! * 0.75)} / ${fmt(pts[0]!)}`);
    await expect(page.getByTestId('earned-1')).toContainText(`0 / ${fmt(pts[1]!)}`);
  });
});

test.describe('DST sur téléphone (390×844, tactile)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('configuration, passage et liste des exercices : pas de débordement, cibles ≥ 44 px, minuteur et « Rendre » accessibles', async ({ page }) => {
    test.setTimeout(300_000);
    const noOverflow = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await prepare(page, { mode: 'assiste' });
    await noOverflow();
    await page.screenshot({ path: 'test-results/dst-mobile-preview.png', fullPage: true });
    await page.getByTestId('dst-start').tap();
    await expect(page.getByTestId('exercise-view')).toBeVisible({ timeout: 60_000 });
    await noOverflow();
    const geo = await page.evaluate(() => {
      const out: Record<string, { x: number; w: number; h: number } | null> = {};
      for (const id of ['dst-clock', 'dst-nav-open', 'dst-submit']) {
        const el = document.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
        const r = el?.getBoundingClientRect();
        out[id] = r ? { x: r.x, w: r.width, h: r.height } : null;
      }
      return { out, vw: window.innerWidth };
    });
    for (const id of ['dst-nav-open', 'dst-submit']) { expect(geo.out[id], id).not.toBeNull(); expect(geo.out[id]!.h, `${id} hauteur`).toBeGreaterThanOrEqual(43.5); }
    for (const id of ['dst-clock', 'dst-nav-open', 'dst-submit']) expect(geo.out[id]!.x + geo.out[id]!.w, `${id} dans l'écran`).toBeLessThanOrEqual(geo.vw + 0.5);
    await page.screenshot({ path: 'test-results/dst-mobile-run.png' });
    await page.getByTestId('dst-nav-open').tap();
    await expect(page.getByTestId('dst-nav')).toBeVisible();
    await noOverflow();
    await page.screenshot({ path: 'test-results/dst-mobile-nav.png' });
    await page.getByTestId('dst-item-0').tap();
    // Mode assisté : les boutons d'aide sont dans l'onglet Énoncé et restent utilisables au doigt.
    await expect(page.getByTestId('dst-hint-btn')).toBeVisible();
    const hb = await page.getByTestId('dst-hint-btn').boundingBox();
    expect(hb!.height).toBeGreaterThanOrEqual(43.5);
  });
});
