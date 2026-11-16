import { describe, expect, it } from 'vitest';
import { javaAvailable, runLocal } from '../helpers/localJava';
import type { ExecSpec } from '@/java/template';

const spec: ExecSpec = {
  kind: 'snippet',
  tools: [{ id: 'affiche' }, { id: 'debug' }],
  givenVariables: [{ name: 'str', type: 'String' }],
  expectedVariables: [{ name: 'taille', type: 'int' }],
  tests: [
    { id: 't1', inputs: { str: { type: 'String', value: 'Bonjour' } } },
    { id: 't2', inputs: { str: { type: 'String', value: 'ab' } } },
  ],
};

describe.skipIf(!javaAvailable)('harnais Java (JVM locale)', () => {
  it('compile et exécute un fragment, capture variables et sortie', () => {
    const { output } = runLocal(spec, 'int taille = str.length();\naffiche("n=" + taille);\ndebug(taille);');
    expect(output.phase).toBe('run');
    if (output.phase !== 'run') return;
    expect(output.tests).toHaveLength(2);
    expect(output.tests[0]!.caps).toEqual([{ n: 'taille', t: 'int', v: 7 }]);
    expect(output.tests[0]!.out).toBe('n=7\n');
    expect(output.tests[0]!.dbg).toBe('7\n');
    expect(output.tests[1]!.caps[0]!.v).toBe(2);
  });

  it('renvoie les diagnostics de compilation avec la ligne du gabarit', () => {
    const { output, project } = runLocal(spec, 'int taille = ;');
    expect(output.phase).toBe('compile');
    if (output.phase !== 'compile') return;
    const d = output.diagnostics.find((x) => x.kind === 'error')!;
    expect(d.file).toBe('Exercice.java');
    expect(d.line - project.lineOffset).toBe(1);
  });

  it('interrompt une boucle infinie par test (sans bloquer les autres)', () => {
    const { output } = runLocal(spec, 'int taille = 0;\nwhile (str.length() > 0) { taille++; }', { perTestMs: 300, totalMs: 4000 });
    expect(output.phase).toBe('run');
    if (output.phase !== 'run') return;
    expect(output.tests.map((t) => t.timeout)).toEqual([true, true]);
  });

  it('un outil absent de l’exercice est indéfini (comme sur Schooding)', () => {
    const { output } = runLocal(spec, 'fillCase(1, 2);\nint taille = 1;');
    expect(output.phase).toBe('compile');
    if (output.phase !== 'compile') return;
    expect(output.raw).toMatch(/fillCase\(int, int\) is undefined/);
  });

  it('refuse les API interdites (Thread)', () => {
    const { output } = runLocal(spec, 'int taille = 1;\nThread.sleep(1);');
    expect(['forbidden', 'compile']).toContain(output.phase);
  });
});
