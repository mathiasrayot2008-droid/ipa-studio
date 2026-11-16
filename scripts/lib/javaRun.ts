/** Exécution Java locale (JVM + même harnais que le navigateur) partagée par les scripts de build de banque. */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { JavaType, JavaValue } from '@/types/bank';
import type { HarnessOutput } from '@/java/harnessTypes';
import { buildProject, ecjOptions, packFiles, type ExecSpec } from '@/java/template';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const J = (f: string) => path.join(root, 'public/java', f);

let running = 0;
const waiting: (() => void)[] = [];
const MAX = Number(process.env.JAVA_PARALLEL ?? 3);
const acquire = () => new Promise<void>((res) => { if (running < MAX) { running++; res(); } else waiting.push(() => { running++; res(); }); });
const release = () => { running--; waiting.shift()?.(); };

export async function runJava(spec: ExecSpec, code: string) {
  const project = buildProject(spec, code, { perTestMs: 2000, totalMs: 20000 });
  await acquire();
  try {
    const cp = [J('ipa-harness.jar'), J('ecj.jar'), J('asm.jar')].join(path.delimiter);
    const out = await new Promise<string>((resolve, reject) => {
      const p = spawn('java', ['-cp', cp, 'ipa.Harness', ecjOptions(J('stub-rt.jar'), J('ipa-harness.jar')), project.mainClass, '2000', '20000'], { stdio: ['pipe', 'pipe', 'pipe'] });
      let so = ''; let se = '';
      p.stdout.setEncoding('utf8').on('data', (d) => { so += d; });
      p.stderr.setEncoding('utf8').on('data', (d) => { se += d; });
      p.on('error', reject);
      p.on('close', () => resolve(so || se));
      p.stdin.end(packFiles(project.files));
      setTimeout(() => { p.kill('SIGKILL'); reject(new Error('timeout JVM')); }, 90_000).unref();
    });
    const line = out.split('\n').find((l) => l.startsWith('{'));
    if (!line) throw new Error('Sortie Java illisible : ' + out.slice(0, 300));
    return { project, output: JSON.parse(line) as HarnessOutput };
  } finally { release(); }
}

/** Valide et type une valeur JSON pour un paramètre Java. */
export function toJava(type: JavaType, v: unknown, ctx: string): JavaValue {
  const bad = () => { throw new Error(`Valeur invalide pour ${type} (${ctx}) : ${JSON.stringify(v)}`); };
  const base = type.replace(/\[\]/g, '');
  const dims = (type.match(/\[\]/g) ?? []).length;
  const chk = (x: unknown, d: number): void => {
    if (d > 0) { if (!Array.isArray(x)) bad(); (x as unknown[]).forEach((y) => chk(y, d - 1)); return; }
    if ((base === 'int' || base === 'long') && !(typeof x === 'number' && Number.isInteger(x))) bad();
    if (base === 'double' && typeof x !== 'number') bad();
    if (base === 'boolean' && typeof x !== 'boolean') bad();
    if (base === 'char' && !(typeof x === 'string' && [...x].length === 1)) bad();
    if (base === 'String' && typeof x !== 'string') bad();
  };
  chk(v, dims);
  return { type, value: v };
}
