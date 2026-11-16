/**
 * Fabrique la banque Schooding à partir de l'export privé + des spécifications privées.
 *   npx tsx scripts/schooding/build.ts [--only 2940,4464] [--no-saved]
 * Sortie (private/, jamais commitée) :
 *   schooding-bank-<version>.json       exercices (énoncé + tests + sorties attendues), SANS solution de référence
 *   schooding-solutions-<version>.json  solutions de référence (document séparé)
 *   schooding-report-<version>.md       rapport de validation (réf. 100 %, alternatives, erreurs, code enregistré)
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Exercise, JavaValue, TestCase, ToolConfig, ToolId } from '@/types/bank';
import { DEFAULT_COMPARE } from '@/java/compare';
import { grade, precheck, type CheckResult } from '@/java/grade';
import { withExpected } from '@/java/reference';
import type { ExecSpec } from '@/java/template';
import { root, runJava, toJava } from '../lib/javaRun';
import type { Spec, SpecTest } from './spec';

const BANK_VERSION = process.env.BANK_VERSION ?? '2026-11-16';
const args = process.argv.slice(2);
const only = args.includes('--only') ? new Set(args[args.indexOf('--only') + 1]!.split(',').map(Number)) : null;
const skipSaved = args.includes('--no-saved');

// ───────── conversions
const TOOL_BY_NAME: Record<string, ToolId> = {
  affiche: 'affiche', afficheEntier: 'afficheEntier', afficheReel: 'afficheReel', afficheReels: 'afficheReels', afficheBooleen: 'afficheBooleen',
  debug: 'debug', PI: 'PI', pgcd: 'pgcd', sqrt: 'sqrt', sin: 'sin', cos: 'cos', distance: 'distance',
  setFillColor: 'setFillColor', rectangle: 'rectangle', isoTriangle: 'isoTriangle', circle: 'circle', line: 'line',
  startPolygon: 'startPolygon', addPoint: 'addPoint', stopPolygon: 'stopPolygon', fillCase: 'fillCase',
  moveUp: 'moveUp', moveDown: 'moveDown', moveLeft: 'moveLeft', moveRight: 'moveRight', warmer: 'warmer',
};

interface RawTool { signature: string; description: string }
function toolsOf(raw: RawTool[], spec: Spec): ToolConfig[] {
  const out: ToolConfig[] = [];
  for (const t of raw) {
    const name = /([A-Za-z]+)\s*(?:\(|$)/.exec(t.signature.replace(/^(?:void|int|double|boolean)\s+/, ''))?.[1] ?? '';
    const id = TOOL_BY_NAME[name];
    if (!id) throw new Error(`Outil inconnu « ${t.signature} » (exercice ${spec.id})`);
    const c: ToolConfig = { id };
    if (id === 'affiche' || id === 'afficheEntier' || id === 'afficheReel' || id === 'afficheBooleen') {
      const d = t.description;
      const fromDesc = /sans passer à la ligne/i.test(d) ? false : /(retourne|retour|saute une ligne) ?à la ligne|retourne à la ligne/i.test(d) ? true : undefined;
      const nl = spec.newline?.[id] ?? fromDesc;
      if (nl === false) c.newline = false;
      else if (nl === undefined && id !== 'affiche') c.newline = true; // description muette : tranché dans la spec (par défaut : une valeur par ligne)
    }
    const dec = /avec (\d+) décimales/i.exec(t.description);
    if ((id === 'afficheReel' || id === 'afficheReels') && dec) c.decimals = Number(dec[1]);
    if (spec.decimals && (id === 'afficheReel' || id === 'afficheReels')) c.decimals = spec.decimals;
    out.push(c);
  }
  return out;
}

/** Énoncé brut Schooding → Markdown (listes « - » sur deux lignes, titre répété retiré). */
export function toMarkdown(raw: string, title: string): string {
  let lines = raw.replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/\s+$/, ''));
  const first = lines.findIndex((l) => l.trim() !== '');
  if (first >= 0 && (lines[first]!.trim() === title.trim() || title.trim().startsWith(lines[first]!.trim().slice(0, 12)) )) lines = lines.slice(first + 1);
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]!;
    if (l.trim() === '-') {
      let j = i + 1;
      while (j < lines.length && lines[j]!.trim() === '') j++;
      if (j < lines.length) { out.push('- ' + lines[j]!.trim()); i = j; continue; }
    }
    out.push(l.trim() === '' ? '' : l.trim().startsWith('- ') ? l.trim() : l.trim() + '  ');
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').replace(/^\n+|\n+$/g, '');
}

function starterOf(spec: Spec): string {
  if (spec.starter !== undefined) return spec.starter;
  const g = (spec.given ?? []).map(([n]) => n);
  if (!g.length) return '';
  return `// ${g.join(', ')} ${g.length > 1 ? 'sont déjà déclarées' : 'est déjà déclarée'} et initialisée${g.length > 1 ? 's' : ''}\n`;
}

function sceneOf(spec: Spec, t: SpecTest): TestCase['scene'] | undefined {
  const kind = spec.kind ?? 'snippet';
  if (kind === 'grid') {
    if (t.grid) return { grid: t.grid };
    const i = t.in ?? {};
    if (typeof i.largeur === 'number' && typeof i.hauteur === 'number') return { grid: { largeur: i.largeur, hauteur: i.hauteur } };
    if (typeof i.taille === 'number') return { grid: { largeur: i.taille, hauteur: i.taille } };
    throw new Error(`Exercice ${spec.id} : dimensions de grille introuvables`);
  }
  if (kind === 'drawing') return { canvas: t.canvas ?? spec.canvas ?? { width: 500, height: 500 } };
  if (kind === 'runner') { if (!t.runner) throw new Error(`Exercice ${spec.id} : carte runner manquante`); return { runner: t.runner }; }
  return undefined;
}

type RawEx = { schoodingId: number; session: number; order: number; section: string; title: string; statement: string; tools: RawTool[]; studentSavedCode: string };
type RawSession = { schoodingId: number; number: number; title: string; items: { kind: string; id: number; section: string }[] };

const short = (r: CheckResult) => `${r.status} ${r.passed}/${r.total} (${Math.round(r.score * 100)} %)`;
const detail = (r: CheckResult) => r.verdicts.filter((v) => !v.passed).slice(0, 2).map((v) => `\n  - ${v.id}: ${JSON.stringify(v.mismatches).slice(0, 300)}${v.actual ? ' | sortie=' + JSON.stringify(v.actual.out).slice(0, 120) : ''}`).join('');

async function main() {
  const dump = JSON.parse(readFileSync(path.join(root, 'private/schooding-export-2026-11-16.json'), 'utf8')) as { exercises: RawEx[]; sessions: RawSession[] };
  const { default: specs } = (await import(path.join(root, 'private/specs/index.ts'))) as { default: Spec[] };
  const byId = new Map(specs.map((s) => [s.id, s]));
  if (byId.size !== specs.length) throw new Error('Spécifications en double');
  const sessNum = new Map(dump.sessions.map((s) => [s.schoodingId, s.number]));
  const missing = dump.exercises.filter((e) => !byId.has(e.schoodingId)).map((e) => e.schoodingId);
  const unknown = specs.filter((s) => !dump.exercises.some((e) => e.schoodingId === s.id)).map((s) => s.id);
  if (unknown.length) throw new Error('Spécifications sans exercice : ' + unknown.join(', '));
  if (missing.length && !only) console.warn(`⚠ ${missing.length} exercice(s) sans spécification : ${missing.join(', ')}`);

  const report: string[] = [];
  const exercises: Exercise[] = [];
  const solutions: Record<string, string> = {};
  let failures = 0;

  const todo = dump.exercises.filter((e) => byId.has(e.schoodingId) && (!only || only.has(e.schoodingId)));
  const results = await Promise.all(todo.map(async (raw) => {
    const spec = byId.get(raw.schoodingId)!;
    const kind = spec.kind ?? 'snippet';
    const key = `sch-${raw.schoodingId}`;
    const lines: string[] = [];
    const log = (s: string) => lines.push(s);
    const tools = spec.tools ? spec.tools.map((id) => ({ id } as ToolConfig)) : toolsOf(raw.tools, spec);
    const given = (spec.given ?? []).map(([name, type]) => ({ name, type }));
    const expected = (spec.expect ?? []).map(([name, type, d]) => (d ? { name, type, declareOnly: true } : { name, type }));
    const tests0 = spec.tests.map((t, k) => {
      const prefix = t.vis === 'public' ? 'p' : t.vis === 'hidden' ? 'h' : 'e';
      const n = spec.tests.slice(0, k + 1).filter((x) => x.vis === t.vis).length;
      const inputs: Record<string, JavaValue> = {};
      for (const g of given) {
        if (!t.in || !(g.name in t.in)) throw new Error(`${key} test ${k} : entrée « ${g.name} » manquante`);
        inputs[g.name] = toJava(g.type, t.in[g.name], `${key}.${g.name}`);
      }
      const extra = Object.keys(t.in ?? {}).filter((n) => !given.some((g) => g.name === n));
      if (extra.length) throw new Error(`${key} test ${k} : entrées inconnues ${extra.join(', ')}`);
      return { id: `${prefix}${n}`, visibility: t.vis, inputs, scene: sceneOf(spec, t) } as Omit<TestCase, 'expected' | 'weight'>;
    });
    const execSpec: ExecSpec = { kind, tools, givenVariables: given, expectedVariables: expected, tests: tests0 };
    const compare = { ...DEFAULT_COMPARE, ...spec.compare };

    let tests: TestCase[] = [];
    let ok = true;
    if (spec.fidelity === 'unavailable') {
      log('- **non corrigeable automatiquement** (voir notes)');
    } else {
      // 1. référence → sorties attendues
      try {
        const r = await runJava(execSpec, spec.ref);
        tests = withExpected(execSpec, tests0, r.output);
        const g = grade(r.output, r.project, spec.ref, tests, compare);
        log(`- référence : ${short(g)}`);
        if (g.status !== 'reussi') { ok = false; log('  - ❌ la référence ne réussit pas ses propres tests'); }
      } catch (e) { ok = false; log(`- ❌ référence : ${(e as Error).message}`); }

      const check = async (code: string) => {
        const pre = precheck(code);
        if (pre) return pre;
        const r = await runJava(execSpec, code);
        return grade(r.output, r.project, code, tests, compare);
      };
      if (ok) {
        for (const [i, a] of (spec.alts ?? []).entries()) {
          const g = await check(a);
          log(`- alternative ${i + 1} : ${short(g)}${g.status === 'reussi' ? '' : ' ❌' + detail(g)}`);
          if (g.status !== 'reussi') ok = false;
        }
        for (const w of spec.wrong ?? []) {
          const g = await check(w.code);
          log(`- erreur « ${w.label} » : ${short(g)}${g.status === 'reussi' ? ' ❌ (devrait échouer)' : ''}`);
          if (g.status === 'reussi') ok = false;
        }
        if (!skipSaved && raw.studentSavedCode.trim()) {
          const g = await check(raw.studentSavedCode);
          log(`- ton code enregistré : ${short(g)}${g.diagnostics[0] ? ' — ' + g.diagnostics[0].fr : ''}`);
        }
      }
    }

    const statementMd = toMarkdown(raw.statement, raw.title);
    const ex: Exercise = {
      key, origin: 'schooding', kind, title: raw.title.replace(/\(\*\)/g, '').replace(/\s+/g, ' ').trim(),
      statementMd, notions: { primary: spec.notion, secondary: spec.sec ?? [] }, difficulty: spec.diff, estimatedMinutes: spec.min,
      tools, givenVariables: (spec.given ?? []).map(([name, type]) => ({ name, type, description: '' })),
      expectedVariables: expected, starterCode: starterOf(spec), compare, tests, hints: spec.hints,
      referenceSolution: spec.fidelity === 'unavailable' ? '' : spec.ref,
      provenance: { source: 'Schooding (cours 725, export privé)', importedAt: new Date().toISOString(), schoodingId: raw.schoodingId, session: sessNum.get(raw.session), order: raw.order, bankVersion: BANK_VERSION, fidelity: spec.fidelity, notes: spec.notes },
    };
    return { ex, ok, text: `### ${key} · S${ex.provenance.session}.${raw.order} · ${ex.title} — *${spec.fidelity}*\n${lines.join('\n')}\n` };
  }));

  for (const r of results.sort((a, b) => (a.ex.provenance.session! - b.ex.provenance.session!) || (a.ex.provenance.order! - b.ex.provenance.order!))) {
    exercises.push(r.ex); report.push(r.text);
    if (!r.ok) { failures++; console.error('❌', r.ex.key, r.ex.title); }
    solutions[r.ex.key] = r.ex.referenceSolution;
  }
  for (const e of exercises) e.referenceSolution = '';

  const stats = {
    total: exercises.length, exact: 0, 'assets-recreated': 0, reconstructed: 0, unavailable: 0,
  } as Record<string, number>;
  for (const e of exercises) stats[e.provenance.fidelity!]!++;
  report.unshift(`# Rapport de validation de la banque Schooding (${BANK_VERSION})\n\n${JSON.stringify(stats)}\n\n${failures ? `**${failures} exercice(s) en échec**` : 'Toutes les validations croisées passent.'}\n`);

  const sessions = dump.sessions.map((s) => ({ number: s.number, title: s.title, schoodingId: s.schoodingId, exerciseKeys: exercises.filter((e) => e.provenance.session === s.number).map((e) => e.key) }));
  mkdirSync(path.join(root, 'private'), { recursive: true });
  if (!only) {
    writeFileSync(path.join(root, `private/schooding-bank-${BANK_VERSION}.json`), JSON.stringify({ format: 1, version: BANK_VERSION, builtAt: new Date().toISOString(), sessions, exercises }));
    writeFileSync(path.join(root, `private/schooding-solutions-${BANK_VERSION}.json`), JSON.stringify({ format: 1, version: BANK_VERSION, solutions }));
  }
  writeFileSync(path.join(root, `private/schooding-report-${BANK_VERSION}${only ? '-partial' : ''}.md`), report.join('\n'));
  console.log(report.join('\n'));
  if (failures) process.exitCode = 1;
}

void main();
