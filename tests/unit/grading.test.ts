import { describe, expect, it } from 'vitest';
import { javaAvailable } from '../helpers/localJava';
import { buildTests, evaluate, FIXTURES } from '../helpers/fixtures';

const run = describe.skipIf(!javaAvailable);

run('notation fonctionnelle (jamais par comparaison de code)', () => {
  const m = FIXTURES.moyenne!;
  const mb = buildTests(m);

  it('référence = 100 %', () => {
    const r = evaluate(m, m.reference, mb);
    expect(r.status).toBe('reussi');
    expect(r.score).toBe(1);
  });
  it('un code DIFFÉRENT mais équivalent est accepté', () => {
    const r = evaluate(m, 'double somme = v1;\nsomme = somme + v2;\nsomme += v3 + v4;\ndouble mean = somme / 4.0;', mb);
    expect(r.status).toBe('reussi');
  });
  it('mauvaise formule (division entière / mauvais diviseur) : échec, avec diff sur tests publics', () => {
    const r = evaluate(m, 'double mean = (v1 + v2 + v3 + v4) / 3;', mb);
    // le test limite « tout à zéro » passe par hasard : c'est pour ça qu'il y a plusieurs tests
    expect(r.status).toBe('partiel');
    expect(r.verdicts.find((v) => v.id === 'e1')!.passed).toBe(true);
    const p1 = r.verdicts.find((v) => v.id === 'p1')!;
    expect(p1.mismatches[0]).toMatchObject({ kind: 'var', name: 'mean', reason: 'value' });
    expect(r.score).toBeLessThan(0.5);
  });
  it('mauvais type de variable détecté (int au lieu de double)', () => {
    const r = evaluate(m, 'int mean = (int) ((v1 + v2 + v3 + v4) / 4);', mb);
    expect(r.verdicts[0]!.mismatches[0]).toMatchObject({ kind: 'var', reason: 'type' });
  });
  it('variable attendue non déclarée : erreur de compilation traduite, sur la ligne de fin du code', () => {
    const r = evaluate(m, 'double moyenne = (v1 + v2 + v3 + v4) / 4;', mb);
    expect(r.status).toBe('compilation');
    expect(r.diagnostics[0]!.tag).toBe('compile:missing-expected-var');
    expect(r.diagnostics[0]!.fr).toContain('mean');
  });
  it('erreur de syntaxe : message FR et ligne dans le repère de l’étudiant', () => {
    const r = evaluate(m, 'double a = 1;\ndouble mean = (v1 + v2 +);', mb);
    expect(r.status).toBe('compilation');
    expect(r.diagnostics[0]!.line).toBe(2);
    expect(r.diagnostics[0]!.fr).toMatch(/syntaxe/i);
  });
  it('accolade en trop : détectée avant compilation', () => {
    const r = evaluate(m, 'double mean = 1; }', mb);
    expect(r.diagnostics[0]!.tag).toBe('compile:balance');
  });
  it('les tests cachés comptent dans le score (poids 2) mais leur détail est masqué', async () => {
    const { redactHidden } = await import('@/java/grade');
    const r = evaluate(m, 'double mean = (v1 + v2) / 2;', mb); // passe seulement quand v1+v2 == v3+v4 symétrique…
    const red = redactHidden(r);
    for (const v of red.verdicts.filter((x) => x.visibility !== 'public')) expect(v.actual).toBeUndefined();
    expect(r.score).toBeLessThan(1);
  });

  it('tableaux : somme et max', () => {
    const f = FIXTURES.somme!;
    const b = buildTests(f);
    expect(evaluate(f, f.reference, b).status).toBe('reussi');
    const bad = evaluate(f, 'int somme = 0;\nint max = 0;\nfor (int i = 0; i < t.length; i++) { somme += t[i]; if (t[i] > max) max = t[i]; }', b);
    expect(bad.status).toBe('partiel'); // max = 0 faux pour les tableaux négatifs
    expect(bad.verdicts.find((v) => v.id === 'p2')!.passed).toBe(false);
  });
  it('tableaux : sortie de tableau = exception traduite', () => {
    const f = FIXTURES.somme!;
    const r = evaluate(f, 'int somme = 0;\nint max = 0;\nfor (int i = 0; i <= t.length; i++) { somme += t[i]; }', buildTests(f));
    expect(r.errorTags).toContain('runtime:aioobe');
  });
  it('String : voyelles (cas limite chaîne vide)', () => {
    const f = FIXTURES.compteVoyelles!;
    const b = buildTests(f);
    expect(evaluate(f, f.reference, b).status).toBe('reussi');
    const r = evaluate(f, 'int nb = 0;\nfor (int i = 1; i < chaine.length(); i++) { char c = chaine.charAt(i); if ("aeiouy".indexOf(c) >= 0) nb++; }\naffiche("" + nb);', b);
    expect(r.status).not.toBe('reussi');
  });

  it('grille : ligne centrale, deux solutions équivalentes', () => {
    const f = FIXTURES.ligneCentrale!;
    const b = buildTests(f);
    expect(evaluate(f, f.reference, b).status).toBe('reussi');
    const alt = 'setFillColor("blue");\nfor (int x = 0; x < largeur; x++) {\n  fillCase(x, (hauteur - 1) / 2);\n  fillCase(x, hauteur / 2);\n}';
    expect(evaluate(f, alt, b).status).toBe('reussi');
    expect(evaluate(f, 'setFillColor("red");\nfor (int x = 0; x < largeur; x++) fillCase(x, hauteur / 2);', b).status).not.toBe('reussi');
  });
  it('grille : case hors grille = erreur explicite', () => {
    const f = FIXTURES.ligneCentrale!;
    const r = evaluate(f, 'setFillColor("blue");\nfillCase(largeur, 0);', buildTests(f));
    expect(r.errorTags).toContain('runtime:env');
  });

  it('dessin : maison décalée, pixels exacts', () => {
    const f = FIXTURES.maison!;
    const b = buildTests(f);
    expect(evaluate(f, f.reference, b).status).toBe('reussi');
    // sans décalage : échoue sur les tests dx,dy ≠ 0
    const noShift = f.reference.replace(/ \+ dx/g, '').replace(/ \+ dy/g, '');
    const r = evaluate(f, noShift, b);
    expect(r.status).toBe('partiel');
    expect(r.verdicts.find((v) => v.id === 't0')!.passed).toBe(true);
    // couleur de toit fausse
    expect(evaluate(f, f.reference.replace('"red"', '"blue"'), b).status).toBe('echoue');
  });

  it('runner : arrive à la case verte', () => {
    const f = FIXTURES.runnerPremiersPas!;
    const b = buildTests(f);
    expect(evaluate(f, f.reference, b).status).toBe('reussi');
    const r = evaluate(f, 'moveRight();', b); // touche (1,0) = case rouge
    expect(r.status).toBe('echoue');
    const r2 = evaluate(f, 'moveDown();', b); // ne bouge pas jusqu'à l'arrivée
    expect(r2.verdicts[0]!.mismatches[0]).toMatchObject({ kind: 'runner' });
  });
});
