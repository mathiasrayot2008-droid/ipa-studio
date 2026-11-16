import { expect, test } from '@playwright/test';
import { buildTests, evaluate as evalLocal, FIXTURES } from '../helpers/fixtures';

/**
 * Preuve que le MÊME harnais tourne dans le navigateur (CheerpJ, OpenJDK 17 en WebAssembly) :
 * les tests sont fabriqués sur la JVM locale, la notation est faite dans Chrome, et les verdicts doivent coïncider.
 */
type Ipa = { evaluate: (ex: unknown, code: string, mode: string) => Promise<{ status: string; score: number; passed: number; total: number; errorTags: string[]; verdicts: { id: string; passed: boolean }[]; diagnostics: { fr: string; line: number }[] }> ; javaRunner: () => { warmUp(): Promise<void>; runProgram(src: string, stdin: string, ms?: number): Promise<unknown> } };

const CASES: { fixture: string; label: string; code: (ref: string) => string }[] = [
  { fixture: 'moyenne', label: 'snippet (référence)', code: (r) => r },
  { fixture: 'moyenne', label: 'snippet (mauvaise formule)', code: () => 'double mean = (v1 + v2 + v3 + v4) / 3;' },
  { fixture: 'somme', label: 'tableau (référence)', code: (r) => r },
  { fixture: 'somme', label: 'tableau (indice hors limites)', code: () => 'int somme = 0;\nint max = 0;\nfor (int i = 0; i <= t.length; i++) { somme += t[i]; }' },
  { fixture: 'compteVoyelles', label: 'String (référence)', code: (r) => r },
  { fixture: 'ligneCentrale', label: 'grille (référence)', code: (r) => r },
  { fixture: 'maison', label: 'dessin (référence)', code: (r) => r },
  { fixture: 'maison', label: 'dessin (sans décalage)', code: (r) => r.replace(/ \+ dx/g, '').replace(/ \+ dy/g, '') },
  { fixture: 'runnerPremiersPas', label: 'runner (référence)', code: (r) => r },
  { fixture: 'runnerPremiersPas', label: 'runner (touche une case rouge)', code: () => 'moveRight();' },
  { fixture: 'moyenne', label: 'erreur de compilation', code: () => 'double mean = (v1 + v2 +);' },
];

test('Java réel dans le navigateur = JVM locale (tests A–N : C)', async ({ page }) => {
  const logs: string[] = [];
  page.on('console', (m) => logs.push(m.text()));
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as unknown as { __ipa?: unknown }).__ipa));

  const t0 = Date.now();
  await page.evaluate(async () => (window as unknown as { __ipa: Ipa }).__ipa.javaRunner().warmUp());
  console.log(`Préchauffage Java : ${Date.now() - t0} ms`);

  for (const c of CASES) {
    const f = FIXTURES[c.fixture]!;
    const built = buildTests(f);
    const exercise = { kind: f.spec.kind, tools: f.spec.tools, givenVariables: f.spec.givenVariables, expectedVariables: f.spec.expectedVariables, tests: built.tests, compare: { trimLines: true, ignoreTrailingEmptyLines: true, caseSensitive: true, doubleTolerance: 1e-9 } };
    const code = c.code(f.reference);
    const local = evalLocal(f, code, built);
    const t1 = Date.now();
    const browser = await page.evaluate(
      async ([ex, src]) => (window as unknown as { __ipa: Ipa }).__ipa.evaluate(ex, src as string, 'check'),
      [exercise, code] as const,
    );
    console.log(`${c.label.padEnd(36)} → ${browser.status} (${browser.passed}/${browser.total}) en ${Date.now() - t1} ms`);
    expect(browser.status, c.label).toBe(local.status);
    expect(browser.passed, c.label).toBe(local.passed);
    expect(browser.verdicts.map((v) => v.passed), c.label).toEqual(local.verdicts.map((v) => v.passed));
    expect([...browser.errorTags].sort(), c.label).toEqual([...local.errorTags].sort());
  }
});

test('boucle infinie : stoppée sans bloquer la page, puis Java reste utilisable', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as unknown as { __ipa?: unknown }).__ipa));
  const f = FIXTURES.moyenne!;
  const built = buildTests(f);
  const exercise = { kind: f.spec.kind, tools: f.spec.tools, givenVariables: f.spec.givenVariables, expectedVariables: f.spec.expectedVariables, tests: built.tests, compare: { trimLines: true, ignoreTrailingEmptyLines: true, caseSensitive: true, doubleTolerance: 1e-9 } };
  const loop = 'double mean = 0;\nwhile (v1 > -1000000) { mean = mean + 1; }';
  await page.evaluate(async () => (window as unknown as { __ipa: Ipa }).__ipa.javaRunner().warmUp());
  const t = Date.now();
  const r = await page.evaluate(async ([ex, src]) => (window as unknown as { __ipa: Ipa }).__ipa.evaluate(ex, src as string, 'check'), [exercise, loop] as const);
  const ms = Date.now() - t;
  console.log(`boucle infinie : ${r.status}, tags=${r.errorTags.join(',')}, ${ms} ms`);
  expect(r.errorTags).toContain('runtime:timeout');
  expect(ms).toBeLessThan(15_000); // 4 tests × 2 s max, total plafonné à 8 s
  // la page répond toujours
  expect(await page.evaluate(() => 1 + 1)).toBe(2);
  const ok = await page.evaluate(async ([ex, src]) => (window as unknown as { __ipa: Ipa }).__ipa.evaluate(ex, src as string, 'check'), [exercise, f.reference] as const);
  expect(ok.status).toBe('reussi');
});

test('bac à sable : programme complet avec méthode, tableau, conditions, boucles', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as unknown as { __ipa?: unknown }).__ipa));
  const src = `public class Main {
  static int somme(int[] t) { int s = 0; for (int x : t) s += x; return s; }
  public static void main(String[] a) {
    int[] t = {3, 1, 4, 1, 5, 9, 2, 6};
    for (int i = 0; i < 3; i++) { if (i % 2 == 0) System.out.println("pair " + i); else System.out.println("impair " + i); }
    System.out.println("somme=" + somme(t) + " maj=" + "Bonjour".toUpperCase());
  }
}`;
  const r = (await page.evaluate(async (s) => (window as unknown as { __ipa: Ipa }).__ipa.javaRunner().runProgram(s, ''), src)) as { phase: string; stdout: string };
  expect(r.phase).toBe('main');
  expect(r.stdout).toBe('pair 0\nimpair 1\npair 2\nsomme=31 maj=BONJOUR\n');
});
