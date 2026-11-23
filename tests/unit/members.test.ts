import { describe, expect, it } from 'vitest';
import { grade, precheck } from '@/java/grade';
import { withExpected } from '@/java/reference';
import type { ExecSpec } from '@/java/template';
import { DEFAULT_COMPARE } from '@/java/compare';
import { javaAvailable, runLocal } from '../helpers/localJava';

const run = describe.skipIf(!javaAvailable);

// Exercice inventé (aucun contenu Schooding) : « écrire la fonction estPair(int n) ».
const mk = (vals: number[]) => vals.map((n, k) => ({ id: `t${k}`, visibility: 'public' as const, inputs: { n: { type: 'int' as const, value: n } } }));
const spec: ExecSpec = {
  kind: 'members', tools: [{ id: 'debug' }], givenVariables: [{ name: 'n', type: 'int' }],
  expectedVariables: [{ name: 'resultat', type: 'boolean' }], tests: mk([0, 1, 2, 7, 10, -3, -4]),
  member: { call: 'estPair(n)', result: 'boolean' },
};
const ref = 'boolean estPair(int n) { return n % 2 == 0; }';
const tests = withExpected(spec, mk([0, 1, 2, 7, 10, -3, -4]), runLocal(spec, ref).output);
const check = (code: string, rules?: { re: string; fr: string }[]) => {
  const pre = precheck(code, rules);
  if (pre) return pre;
  const r = runLocal(spec, code);
  return grade(r.output, r.project, code, tests, DEFAULT_COMPARE);
};

run('exercices « écrire une fonction » (kind members)', () => {
  it('la référence réussit 100 %, avec ou sans static', () => {
    expect(check(ref).status).toBe('reussi');
    expect(check('static boolean estPair(int n) { if (n % 2 == 0) { return true; } return false; }').status).toBe('reussi');
  });
  it('une fonction fausse échoue sur les tests concernés', () => {
    const r = check('boolean estPair(int n) { return n % 2 == 1; }');
    expect(r.status).not.toBe('reussi');
  });
  it('les nombres négatifs sont couverts (en Java, -3 % 2 vaut -1 : « != 1 » se trompe)', () => {
    const r = check('boolean estPair(int n) { return n % 2 != 1; }');
    expect(r.status).toBe('partiel');
    const r2 = check('boolean estPair(int n) { return n > 0 && n % 2 == 0; }');
    expect(r2.status).toBe('partiel');
  });
  it('fonction absente ou mal nommée : erreur de compilation', () => {
    expect(check('boolean pair(int n) { return n % 2 == 0; }').status).toBe('compilation');
  });
  it('règles de l’énoncé : interdit détecté hors commentaires et chaînes', () => {
    const rules = [{ re: String.raw`\bif\b`, fr: 'if interdit' }, { re: String.raw`\bestPair\s+\(`, fr: 'pas d’espace' }];
    expect(check('boolean estPair(int n) { if (n % 2 == 0) { return true; } return false; }', rules).status).toBe('interdit');
    expect(check('boolean estPair (int n) { return n % 2 == 0; }', rules).status).toBe('interdit');
    expect(check('// pas de if ici\nboolean estPair(int n) { String s = "if"; return n % 2 == 0; }', rules).status).toBe('reussi');
  });
});
