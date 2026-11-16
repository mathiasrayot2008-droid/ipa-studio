import type { CheckResult } from '@/java/grade';
import { buildExplainPrompt, claudeUrl, fromCheck, fromDstItem, MAX_URL_PROMPT } from '@/features/explain/prompt';

const ex = { title: 'Somme', statementMd: 'Calcule la **somme** de `a` et `b`.', givenVariables: [{ name: 'a', type: 'int' as const, description: '' }], expectedVariables: [{ name: 's', type: 'int' as const }], tools: [], outputFormat: undefined };
const result = (): CheckResult => ({
  status: 'partiel', score: 0.5, passed: 1, total: 3, diagnostics: [], errorTags: ['wrong:var-value', 'internal'], debug: '', stdout: '',
  verdicts: [
    { id: 'p1', visibility: 'public', weight: 1, passed: false, ms: 1, skipped: false, inputs: { a: { type: 'int', value: 4 } }, mismatches: [{ kind: 'var', name: 's', reason: 'value', expected: { type: 'int', value: 9 }, got: { type: 'int', value: 8 } }] },
    { id: 'h1', visibility: 'hidden', weight: 2, passed: false, ms: 1, skipped: false, mismatches: [{ kind: 'hidden' }] },
    { id: 'e1', visibility: 'edge', weight: 2, passed: true, ms: 1, skipped: false, mismatches: [] },
  ],
});

describe('« Comprendre mon erreur avec Claude » (sans API)', () => {
  it('le message contient énoncé, code et résultat ; il demande de ne pas donner la solution', () => {
    const p = buildExplainPrompt(fromCheck(ex, 'int s = a + 4;', result()));
    expect(p).toContain('Calcule la **somme**');
    expect(p).toContain('int s = a + 4;');
    expect(p).toContain('1/3 tests réussis');
    expect(p).toContain('s vaut 8 au lieu de 9');
    expect(p).toContain('avec a = 4');
    expect(p).toContain('Ne me donne PAS la solution complète'.replace('Ne me donne', 'Ne me donne'));
    expect(p).toContain('Mauvaise valeur calculée');
    expect(p).not.toContain('internal');
  });
  it('les tests cachés sont seulement comptés, jamais détaillés', () => {
    const p = buildExplainPrompt(fromCheck(ex, 'x', result()));
    expect(p).toContain('1 test(s) caché(s) ou limite(s) échoué(s) (détail non communiqué)');
    expect(p).not.toContain('h1');
  });
  it('après la remise d’un DST : statut, message et étiquettes, sans entrées cachées inventées', () => {
    const p = buildExplainPrompt(fromDstItem(ex, 'int s;', { status: 'compilation', passed: 0, total: 5, message: 'Variable inconnue', errorTags: ['compile:undefined-variable'], failedTests: ['p1', 'h1'] }));
    expect(p).toContain('ne compile pas');
    expect(p).toContain('Variable inconnue');
    expect(p).toContain('Variable utilisée sans être déclarée');
    expect(p).toContain('2 test(s) caché(s) ou limite(s) échoué(s)');
  });
  it('le lien claude.ai est pré-rempli seulement si le message tient dans une adresse raisonnable', () => {
    const short = claudeUrl('bonjour');
    expect(short.prefilled).toBe(true); expect(short.url).toBe('https://claude.ai/new?q=bonjour');
    const long = claudeUrl('é'.repeat(MAX_URL_PROMPT));
    expect(long.prefilled).toBe(false); expect(long.url).toBe('https://claude.ai/new');
  });
  it('un énoncé ou un code très longs sont tronqués : le message reste de taille raisonnable', () => {
    const input = fromCheck({ ...ex, statementMd: 'x'.repeat(50_000) }, 'y'.repeat(50_000), result());
    expect(buildExplainPrompt(input).length).toBeLessThan(6500);
  });
});
