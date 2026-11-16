/**
 * Vérifie, avec un vrai JVM, que la reconnaissance d'erreurs-types fonctionne de bout en bout :
 * pour chaque variante (instance 01), le code de CHAQUE mutant doit être reconnu par son étiquette « mutant:<variante>:<id> »
 * et la référence ne doit en déclencher aucune. Usage : npx tsx scripts/check-mutant-tags.ts [--only famille]
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Exercise } from '@/types/bank';
import { DEFAULT_COMPARE } from '@/java/compare';
import { grade } from '@/java/grade';
import { matchMutants, variantKeyOf } from '@/java/mutantTags';
import { buildProject, specOf } from '@/java/template';
import { makeRng } from '@/engine/rng';
import { mergeSecret, type IpaSecret } from '@/bank/ipaPool';
import { root, runJava } from './lib/javaRun';
import { FAMILIES } from '../bank/families';

const VERSION = 'ipa-1.0.0';
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
let bad = 0; let checked = 0;

for (const fam of FAMILIES) {
  if (only && fam.id !== only) continue;
  const pool = JSON.parse(readFileSync(path.join(root, `public/bank/${VERSION}/pools/${fam.id}.json`), 'utf8')) as Exercise[];
  const sec = JSON.parse(readFileSync(path.join(root, `public/bank/${VERSION}/secrets/${fam.id}.json`), 'utf8')) as Record<string, IpaSecret>;
  for (let vi = 0; vi < fam.variants.length; vi++) {
    const v = fam.variants[vi]!;
    // Retrouve les paramètres de l'instance 01 (même tirage qu'au build).
    let p: unknown = null;
    for (let attempt = 0; attempt < 60; attempt++) {
      const rng = makeRng(`${VERSION}/${fam.id}/${v.id}/0/${attempt}`);
      const cand = v.params(rng.fork('params'));
      if (v.valid && !v.valid(cand)) continue;
      p = cand; break;
    }
    const key = `fam.${fam.id}.${v.id}.01`;
    const pub = pool.find((e) => e.key === key)!;
    const full = mergeSecret(pub, sec[key]!);
    const spec = specOf(full, full.tests);
    const variant = variantKeyOf(key);
    const attempts: { label: string; code: string; expect: string | null }[] = [{ label: 'référence', code: v.reference(p), expect: null }, ...v.mutants(p).map((m) => ({ label: `mutant ${m.id}`, code: m.code, expect: `mutant:${variant}:${m.id}` }))];
    for (const a of attempts) {
      const r = await runJava(spec, a.code);
      const g = grade(r.output, buildProject(spec, a.code, { perTestMs: 2000, totalMs: 20000 }), a.code, full.tests, full.compare ?? DEFAULT_COMPARE);
      const tags = matchMutants(full, g.verdicts);
      checked++;
      const ok = a.expect === null ? tags.length === 0 : tags.includes(a.expect) && tags.length === 1;
      if (!ok) { bad++; console.error(`❌ ${key} ${a.label} : étiquettes obtenues = [${tags.join(', ')}], attendu ${a.expect ?? 'aucune'}`); }
    }
    console.log(`✓ ${key}`);
  }
}
console.log(`\n${checked} codes vérifiés — ${bad ? `${bad} ÉCHEC(S)` : 'tous reconnus correctement'}`);
process.exit(bad ? 1 : 0);
