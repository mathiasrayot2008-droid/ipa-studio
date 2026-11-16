import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { HarnessOutput } from '@/java/harnessTypes';
import { buildProject, ecjOptions, packFiles, type BuildOptions, type ExecSpec } from '@/java/template';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const J = (f: string) => path.join(root, 'public/java', f);

export const javaAvailable = (() => {
  const r = spawnSync('java', ['-version'], { encoding: 'utf8' });
  return r.status === 0;
})();

/** Exécute le MÊME harnais que le navigateur, mais sur la JVM locale (rapide ; sert aux tests unitaires). */
export function runLocal(spec: ExecSpec, code: string, opts: BuildOptions = {}) {
  const p = buildProject(spec, code, opts);
  const cp = [J('ipa-harness.jar'), J('ecj.jar'), J('asm.jar')].join(path.delimiter);
  const r = spawnSync(
    'java',
    ['-cp', cp, 'ipa.Harness', ecjOptions(J('stub-rt.jar'), J('ipa-harness.jar')), p.mainClass, String(opts.perTestMs ?? 2000), String(opts.totalMs ?? 8000)],
    { input: packFiles(p.files), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 60_000 },
  );
  const line = r.stdout.split('\n').find((l) => l.startsWith('{'));
  if (!line) throw new Error(`Sortie Java illisible : ${r.stdout.slice(0, 500)} | ${r.stderr.slice(0, 500)}`);
  return { project: p, output: JSON.parse(line) as HarnessOutput };
}
