import { expect, test, type Page } from '@playwright/test';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { readFileSync } from 'node:fs';

const CODE = 'invite-esiee-2026';
const RIGHT = 'double mean = (v1 + v2 + v3 + v4) / 4;';

async function admin() {
  const env = await initializeTestEnvironment({ projectId: 'demo-ipa-studio', firestore: { rules: readFileSync('contracts/firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 } });
  return env;
}

async function signUp(page: Page, name: string, email: string, code = '') {
  await page.goto('/#/parametres');
  await page.getByRole('tab', { name: 'Créer un compte' }).click();
  await page.getByLabel('Prénom ou pseudo').fill(name);
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Mot de passe').fill('motdepasse1');
  if (code) await page.getByLabel('Code d’invitation').fill(code);
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await expect(page.getByTestId('account-name')).toContainText(name);
}

async function typeCode(page: Page, code: string) {
  await page.locator('.cm-content').first().click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Delete');
  await page.keyboard.type(code);
}

test('deux comptes séparés : brouillon, tentatives, cohorte, reconnexion (test A)', async ({ browser }) => {
  const env = await admin();
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => { await setDoc(doc(ctx.firestore(), 'config/cohort'), { code: CODE }); });

  // ── Alice : inscription avec un MAUVAIS code puis le bon
  const A = await (await browser.newContext()).newPage();
  await signUp(A, 'Alice', 'alice@example.com', 'mauvais-code');
  await expect(A.getByTestId('cohort-status')).toContainText('non membre');
  await expect(A.getByRole('alert')).toContainText('code d\'invitation est incorrect');
  await A.getByLabel('Code d’invitation').fill('mauvais');
  await A.getByRole('button', { name: 'Rejoindre' }).click();
  await expect(A.getByRole('alert')).toContainText('Code d\'invitation incorrect');
  await A.getByLabel('Code d’invitation').fill(CODE);
  await A.getByRole('button', { name: 'Rejoindre' }).click();
  await expect(A.getByTestId('cohort-status')).toContainText('membre ✓');

  // Alice écrit une solution et la fait vérifier (Java réel) : brouillon + tentative + progression enregistrés
  await A.goto('/#/e2e/exercise');
  await typeCode(A, RIGHT);
  await A.getByRole('button', { name: /Vérifier/ }).click();
  await expect(A.getByRole('region', { name: 'Résultats' }).getByText('Réussi', { exact: true })).toBeVisible({ timeout: 150_000 });

  // rechargement complet : le brouillon revient depuis Firestore
  await A.reload();
  await expect(A.locator('.cm-content').first()).toContainText(RIGHT, { timeout: 30_000 });

  // ── Bob : autre navigateur, autre compte
  const B = await (await browser.newContext()).newPage();
  await signUp(B, 'Bob', 'bob@example.com');
  await B.goto('/#/e2e/exercise');
  await expect(B.locator('.cm-content').first()).toContainText('déjà déclarées', { timeout: 30_000 }); // code de départ, pas celui d'Alice
  await expect(B.locator('.cm-content').first()).not.toContainText('/ 4');

  // Vérification côté base : Alice a 1 tentative, Bob 0 ; Bob n'a pas de brouillon
  const uids: Record<string, string> = {};
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const u of (await getDocs(collection(db, 'users'))).docs) uids[(u.data() as { displayName: string }).displayName] = u.id;
    const att = async (uid: string) => (await getDocs(collection(db, 'users', uid, 'attempts'))).size;
    expect(await att(uids.Alice!)).toBe(1);
    expect(await att(uids.Bob!)).toBe(0);
    expect((await getDocs(collection(db, 'users', uids.Bob!, 'drafts'))).size).toBe(0);
    expect((await getDocs(collection(db, 'users', uids.Alice!, 'drafts'))).size).toBe(1);
  });

  // ── Reconnexion d'Alice : déconnexion → connexion → mêmes données
  await A.goto('/#/parametres');
  await A.getByRole('button', { name: 'Se déconnecter' }).click();
  await A.getByLabel('E-mail').fill('alice@example.com');
  await A.getByLabel('Mot de passe').fill('motdepasse1');
  await A.getByRole('button', { name: 'Se connecter' }).click();
  await expect(A.getByTestId('account-name')).toContainText('Alice');
  await A.goto('/#/e2e/exercise');
  await expect(A.locator('.cm-content').first()).toContainText(RIGHT, { timeout: 30_000 });

  // mauvais mot de passe : message français
  await A.goto('/#/parametres');
  await A.getByRole('button', { name: 'Se déconnecter' }).click();
  await A.getByLabel('E-mail').fill('alice@example.com');
  await A.getByLabel('Mot de passe').fill('pas-le-bon');
  await A.getByRole('button', { name: 'Se connecter' }).click();
  await expect(A.getByRole('alert')).toContainText('incorrect');
  await env.cleanup();
});
