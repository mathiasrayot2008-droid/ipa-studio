/**
 * Génère et VALIDE les pools d'exercices inédits (familles) avec le vrai Java :
 *   - la référence réussit 100 % de ses propres tests ;
 *   - chaque erreur-type (mutant) compile et ÉCHOUE à au moins un test ;
 *   - ≥ 2 tests publics, ≥ 3 cachés/limites (dont ≥ 1 limite), 3 indices, énoncé non vide.
 * Sortie : public/bank/<version>/{index.json, pools/<famille>.json (vue publique), secrets/<famille>.json (tests cachés, indices, solutions)}
 * Usage : npx tsx bank/build/pools.ts [--only famille1,famille2]   (INSTANCES=4 par défaut ; cache : .cache/java-runs.json)
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Exercise, FamilyDefinition, FamTest, JavaValue, TestCase, ToolConfig } from '@/types/bank';
import { DEFAULT_COMPARE, expectedFrom } from '@/java/compare';
import { fingerprintResult } from '@/java/fingerprint';
import { grade, precheck } from '@/java/grade';
import type { HarnessOutput } from '@/java/harnessTypes';
import { withExpected } from '@/java/reference';
import type { ExecSpec } from '@/java/template';
import { makeRng } from '@/engine/rng';
import { root, runJava, toJava } from '../../scripts/lib/javaRun';
import { defaultStarter } from '../families/kit';
import { FAMILIES } from '../families';

export const POOL_VERSION = process.env.POOL_VERSION ?? 'ipa-1.0.0';
export const GENERATOR_VERSION = '1.0.0';
const INSTANCES = Number(process.env.INSTANCES ?? 4);
const args = process.argv.slice(2);
const only = args.includes('--only') ? new Set(args[args.indexOf('--only') + 1]!.split(',')) : null;

// ───────── cache des exécutions Java (clé = empreinte du projet), pour ne recalculer que ce qui change
const CACHE_FILE = path.join(root, '.cache/java-runs.json');
const cache: Record<string, HarnessOutput> = existsSync(CACHE_FILE) ? JSON.parse(readFileSync(CACHE_FILE, 'utf8')) : {};
let dirty = 0;
async function run(spec: ExecSpec, code: string) {
  const key = createHash('sha1').update(JSON.stringify(spec)).update('\0').update(code).digest('hex');
  const hit = cache[key];
  if (hit) {
    const { buildProject } = await import('@/java/template');
    return { project: buildProject(spec, code, { perTestMs: 2000, totalMs: 20000 }), output: hit };
  }
  const r = await runJava(spec, code);
  cache[key] = r.output;
  if (++dirty % 25 === 0) saveCache();
  return r;
}
function saveCache() { mkdirSync(path.dirname(CACHE_FILE), { recursive: true }); writeFileSync(CACHE_FILE, JSON.stringify(cache)); }

const BUILT: { ex: Exercise; secret: Secret }[] = [];
interface Secret { tests: TestCase[]; hints: [string, string, string]; referenceSolution: string; mutants: { id: string; label: string; explanationFr: string }[]; mutantFingerprints: Record<string, Record<string, string>> }

const report: string[] = [];
let failures = 0;
const fail = (msg: string) => { failures++; report.push(`- ❌ ${msg}`); console.error('❌', msg); };

function sceneOf(kind: string, t: FamTest): TestCase['scene'] | undefined {
  if (t.scene) return t.scene;
  if (kind === 'grid') {
    const i = t.in;
    if (typeof i.largeur === 'number' && typeof i.hauteur === 'number') return { grid: { largeur: i.largeur, hauteur: i.hauteur } };
    if (typeof i.taille === 'number') return { grid: { largeur: i.taille, hauteur: i.taille } };
    throw new Error('dimensions de grille introuvables');
  }
  return undefined;
}

async function buildInstance(fam: FamilyDefinition<any>, vi: number, ii: number): Promise<boolean> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const v = fam.variants[vi]!;
  const key = `fam.${fam.id}.${v.id}.${String(ii + 1).padStart(2, '0')}`;
  const seen = new Set(BUILT.filter((b) => b.ex.key.startsWith(`fam.${fam.id}.${v.id}.`)).map((b) => b.ex.statementMd));
  let p: unknown = null; let rng = makeRng('x');
  for (let attempt = 0; attempt < 60; attempt++) {
    rng = makeRng(`${POOL_VERSION}/${fam.id}/${v.id}/${ii}/${attempt}`);
    const cand = v.params(rng.fork('params'));
    if (v.valid && !v.valid(cand)) continue;
    if (seen.has(v.statement(cand))) continue;
    p = cand; break;
  }
  if (p === null) { fail(`${key} : aucun jeu de paramètres valide et distinct`); return false; }

  const given = v.given(p).map((g) => ({ ...g }));
  const expected = v.expect(p);
  const tools: ToolConfig[] = (v.tools?.(p) ?? []).map((id) => ({ id }));
  const famTests = v.tests(p, rng.fork('tests'));
  const counts = { public: 0, hidden: 0, edge: 0 };
  const tests0 = famTests.map((t, k) => {
    counts[t.vis]++;
    const inputs: Record<string, JavaValue> = {};
    for (const g of given) {
      if (!(g.name in t.in)) throw new Error(`${key} test ${k} : entrée « ${g.name} » manquante`);
      inputs[g.name] = toJava(g.type, t.in[g.name], `${key}.${g.name}`);
    }
    const extra = Object.keys(t.in).filter((n) => !given.some((g) => g.name === n));
    if (extra.length) throw new Error(`${key} test ${k} : entrées inconnues ${extra.join(', ')}`);
    const prefix = t.vis === 'public' ? 'p' : t.vis === 'hidden' ? 'h' : 'e';
    return { id: `${prefix}${counts[t.vis]}`, visibility: t.vis, inputs, scene: sceneOf(fam.kind, t) } as Omit<TestCase, 'expected' | 'weight'>;
  });
  if (counts.public < 2 || counts.hidden + counts.edge < 3 || counts.edge < 1) { fail(`${key} : tests insuffisants (${JSON.stringify(counts)}) — attendu ≥2 publics, ≥3 cachés dont ≥1 limite`); return false; }

  const spec: ExecSpec = { kind: fam.kind, tools, givenVariables: given.map(({ name, type }) => ({ name, type })), expectedVariables: expected, tests: tests0 };
  const compare = { ...DEFAULT_COMPARE, ...v.compare };
  const refCode = v.reference(p);
  const hints = v.hints(p);
  const mutants = v.mutants(p);
  if (hints.some((h) => !h.trim())) { fail(`${key} : indice vide`); return false; }
  if (mutants.length < 2) { fail(`${key} : au moins 2 erreurs-types attendues`); return false; }

  // 1. La référence produit les valeurs attendues et réussit tout.
  let tests: TestCase[];
  try {
    const r = await run(spec, refCode);
    tests = withExpected(spec, tests0, r.output);
    const g = grade(r.output, r.project, refCode, tests, compare);
    if (g.status !== 'reussi') { fail(`${key} : la référence ne réussit pas (${g.status} ${g.passed}/${g.total}) ${g.diagnostics[0]?.original ?? ''}`); return false; }
  } catch (e) { fail(`${key} : référence — ${(e as Error).message}`); return false; }

  // 2. Chaque erreur-type compile et échoue à au moins un test ; empreintes de comportement par test.
  const fps: Record<string, Record<string, string>> = {};
  const seenFp = new Map<string, string>();
  for (const m of mutants) {
    const pre = precheck(m.code);
    if (pre) { fail(`${key} : mutant « ${m.id} » rejeté avant compilation`); return false; }
    try {
      const r = await run(spec, m.code);
      const g = grade(r.output, r.project, m.code, tests, compare);
      if (g.status === 'compilation' || g.status === 'crash' || g.status === 'interdit') { fail(`${key} : mutant « ${m.id} » ne compile pas / interdit — ${g.diagnostics[0]?.original ?? g.status}`); return false; }
      if (g.status === 'reussi') { fail(`${key} : mutant « ${m.id} » SURVIT (réussit tous les tests) — ajouter un test qui le tue`); return false; }
      if (r.output.phase !== 'run') { fail(`${key} : mutant « ${m.id} » non exécuté`); return false; }
      fps[m.id] = {};
      for (const t of tests) {
        const act = r.output.tests.find((x) => x.id === t.id)!;
        fps[m.id]![t.id] = act.exc ? `EXC:${act.exc.type}` : act.timeout ? 'TIMEOUT' : fingerprintResult(expectedFrom(act, fam.kind, expected));
      }
      const sig = JSON.stringify(fps[m.id]);
      if (seenFp.has(sig)) { fail(`${key} : mutants « ${seenFp.get(sig)} » et « ${m.id} » indiscernables (même comportement sur tous les tests)`); return false; }
      seenFp.set(sig, m.id);
    } catch (e) { fail(`${key} : mutant « ${m.id} » — ${(e as Error).message}`); return false; }
  }

  const statementMd = v.statement(p);
  const starter = v.starter?.(p) ?? defaultStarter(given);
  const ex: Exercise = {
    key, origin: 'ipa-studio', kind: fam.kind, title: `${fam.title} : ${v.label}`, statementMd,
    notions: { primary: fam.notions.primary, secondary: fam.notions.secondary }, difficulty: v.difficulty, estimatedMinutes: v.estimatedMinutes,
    tools, givenVariables: given, expectedVariables: expected, starterCode: starter, outputFormat: v.outputFormat?.(p), compare,
    tests: tests.filter((t) => t.visibility === 'public'), hints: ['', '', ''], referenceSolution: '',
    provenance: { source: `IPA Studio, famille ${fam.id}`, importedAt: new Date().toISOString(), bankVersion: POOL_VERSION, fidelity: 'exact' },
  };
  BUILT.push({ ex, secret: { tests: tests.filter((t) => t.visibility !== 'public'), hints, referenceSolution: refCode, mutants: mutants.map(({ id, label, explanationFr }) => ({ id, label, explanationFr })), mutantFingerprints: fps } });
  return true;
}

async function main() {
  const fams = FAMILIES.filter((f) => !only || only.has(f.id));
  const ids = fams.map((f) => f.id);
  if (new Set(ids).size !== ids.length) throw new Error('Familles en double');
  const t0 = Date.now();
  await Promise.all(fams.map(async (fam) => {
    const keys = new Set<string>();
    for (const [vi, v] of fam.variants.entries()) {
      if (keys.has(v.id)) fail(`${fam.id} : variante en double ${v.id}`);
      keys.add(v.id);
      const results = await Promise.all(Array.from({ length: INSTANCES }, (_, ii) => buildInstance(fam, vi, ii)));
      report.push(`- ${fam.id}/${v.id} (d${v.difficulty}) : ${results.filter(Boolean).length}/${INSTANCES} instances valides`);
    }
  }));
  saveCache();

  BUILT.sort((a, b) => a.ex.key.localeCompare(b.ex.key));
  const outDir = path.join(root, 'public/bank', POOL_VERSION);
  mkdirSync(path.join(outDir, 'pools'), { recursive: true }); mkdirSync(path.join(outDir, 'secrets'), { recursive: true });
  const byFam = new Map<string, typeof BUILT>();
  for (const b of BUILT) { const f = b.ex.key.split('.')[1]!; (byFam.get(f) ?? byFam.set(f, []).get(f)!).push(b); }
  for (const [f, list] of byFam) {
    writeFileSync(path.join(outDir, 'pools', `${f}.json`), JSON.stringify(list.map((b) => b.ex)));
    writeFileSync(path.join(outDir, 'secrets', `${f}.json`), JSON.stringify(Object.fromEntries(list.map((b) => [b.ex.key, b.secret]))));
  }
  const entries = BUILT.map(({ ex }) => { const [, familyId, variantId] = ex.key.split('.'); return { key: ex.key, familyId: familyId!, variantId: variantId!, notion: ex.notions.primary, secondary: ex.notions.secondary, difficulty: ex.difficulty, minutes: ex.estimatedMinutes }; });
  const familiesMeta = FAMILIES.map((f) => ({ id: f.id, title: f.title, notion: f.notions.primary, kind: f.kind, variants: f.variants.map((v) => ({ id: v.id, label: v.label, difficulty: v.difficulty, minutes: v.estimatedMinutes })) }));
  if (!only) writeFileSync(path.join(outDir, 'index.json'), JSON.stringify({ format: 1, version: POOL_VERSION, generatorVersion: GENERATOR_VERSION, builtAt: new Date().toISOString(), entries, families: familiesMeta }));

  const notions = new Set(entries.map((e) => e.notion));
  const head = `# Rapport de validation des pools IPA Studio (${POOL_VERSION})\n\n- ${FAMILIES.length} familles, ${FAMILIES.reduce((s, f) => s + f.variants.length, 0)} variantes, **${BUILT.length} exercices valides**, ${notions.size} notions couvertes\n- mutants : ${BUILT.reduce((s, b) => s + b.secret.mutants.length, 0)}, tous tués (sinon ❌ ci-dessous)\n- ${failures ? `**${failures} échec(s)**` : 'aucun échec'} — ${Math.round((Date.now() - t0) / 1000)} s\n\n`;
  writeFileSync(path.join(root, 'bank/REPORT.md'), head + report.sort().join('\n') + '\n');
  console.log(head + report.sort().join('\n'));
  if (failures) process.exitCode = 1;
}

void main();
