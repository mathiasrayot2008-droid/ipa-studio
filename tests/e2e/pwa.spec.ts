import { expect, test } from '@playwright/test';

// Build de production (port 4174) : poids au démarrage, Firestore jamais chargé en mode local, PWA installable, ouverture hors ligne.
const PROD = 'http://127.0.0.1:4174';
test.use({ baseURL: PROD, viewport: { width: 1280, height: 800 } });

test('démarrage léger : aucun code Firebase chargé en mode local', async ({ page }) => {
  const js: { url: string; bytes: number; cloud: boolean }[] = [];
  page.on('response', async (r) => {
    if (!/\.js(\?|$)/.test(r.url())) return;
    const body = await r.body().catch(() => Buffer.alloc(0));
    js.push({ url: r.url(), bytes: body.length, cloud: body.toString('utf8').includes('firestore.googleapis.com') });
  });
  const hosts = new Set<string>();
  page.on('request', (r) => { try { const u = new URL(r.url()); if (/^https?:$/.test(u.protocol)) hosts.add(u.host); } catch { /* data:, blob: */ } });
  await page.goto('/#/');
  await expect(page.getByTestId('home-global')).toBeVisible();
  await page.waitForTimeout(12_000);                                          // laisse démarrer le préchauffage de Java (≈ 6 s après le chargement)
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);   // le runtime CheerpJ se charge en continu depuis son CDN : on borne l'attente
  // Test L (côté exécution) : en mode local, le navigateur ne contacte que l'application elle-même et le CDN gratuit de CheerpJ.
  expect([...hosts].filter((h) => h !== '127.0.0.1:4174').sort()).toEqual(['cjrtnc.leaningtech.com']);
  expect(js.length).toBeGreaterThan(3);
  expect(js.filter((x) => x.cloud), 'le SDK Firestore ne doit pas être téléchargé hors mode cloud').toHaveLength(0);
  const total = js.reduce((s, x) => s + x.bytes, 0);
  console.log(`JS au démarrage : ${(total / 1024).toFixed(0)} ko décompressés en ${js.length} fichiers`);
  const own = js.filter((x) => x.url.startsWith(PROD)).reduce((s, x) => s + x.bytes, 0);
  console.log(`dont code de l'application : ${(own / 1024).toFixed(0)} ko (le reste : runtime CheerpJ chargé en tâche de fond)`);
  expect(own).toBeLessThan(450 * 1024);
});

test('PWA : manifeste valide, icônes présentes, application ouverte hors ligne', async ({ page, context }) => {
  await page.goto('/#/');
  await expect(page.getByTestId('home-global')).toBeVisible();

  const manifestUrl = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifest = await (await page.request.get(new URL(manifestUrl!, page.url()).toString())).json() as { name: string; display: string; icons: { src: string; sizes: string }[]; start_url: string };
  expect(manifest.name).toBe('IPA Studio');
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons.some((i) => i.sizes === '192x192') && manifest.icons.some((i) => i.sizes === '512x512')).toBe(true);
  for (const i of manifest.icons) expect((await page.request.get(new URL(i.src, PROD + '/').toString())).status(), i.src).toBe(200);

  // Le service worker s'installe et met tout le build en cache.
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await expect.poll(async () => page.evaluate(async () => (await caches.keys()).length), { timeout: 30_000 }).toBeGreaterThanOrEqual(2);
  await expect.poll(async () => page.evaluate(async () => { const ks = await caches.keys(); let n = 0; for (const k of ks) n += (await (await caches.open(k)).keys()).length; return n; }), { timeout: 30_000 }).toBeGreaterThan(10);
  await page.reload();                                                       // la page est maintenant contrôlée par le service worker
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

  // Hors ligne : l'application et une page chargée à la demande (fiches) s'ouvrent.
  const failed: string[] = [];
  page.on('requestfailed', (r) => { if (r.url().startsWith(PROD)) failed.push(`${r.url()} ${r.failure()?.errorText}`); });   // le CDN de CheerpJ, lui, est hors ligne : normal
  const delivered = new Set<string>();
  page.on('requestfinished', (r) => { delivered.add(r.url()); });
  await context.setOffline(true);
  await page.goto('/#/fiches');
  await page.reload();
  await expect(page.getByTestId('fiches')).toBeVisible();
  await expect(page.getByTestId('fiches').locator('> li')).toHaveCount(22);
  // Une requête abandonnée par le navigateur (préchargement en double) est tolérée ; une ressource qui n'est JAMAIS livrée ne l'est pas.
  const lost = failed.filter((f) => !delivered.has(f.split(' ')[0]!) && !f.includes('/favicon.svg'));   // l'icône d'onglet est demandée par le navigateur lui-même, hors service worker
  expect(lost, 'aucune ressource de l’application ne doit manquer hors ligne').toEqual([]);
  await page.goto('/#/');
  await page.reload();
  await expect(page.getByTestId('home-global')).toBeVisible();
  await context.setOffline(false);
});

test('Java s’exécute AVEC le service worker actif (runner.html n’est pas remplacé par le shell)', async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto('/#/');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await page.goto('/#/atelier');
  await page.locator('.cm-content').first().click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Delete');
  await page.evaluate((c) => {
    const el = document.querySelector('.cm-content')!;
    const dt = new DataTransfer(); dt.setData('text/plain', c);
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  }, 'public class Main { public static void main(String[] a) { int s = 0; for (int i = 1; i <= 4; i++) s += i; System.out.println("somme=" + s); } }');
  await page.getByRole('button', { name: /Exécuter/ }).click();
  await expect(page.getByTestId('atelier-stdout')).toHaveText('somme=10\n', { timeout: 200_000 });
});
