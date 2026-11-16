import type { FamilyDefinition, Rng } from '@/types/bank';
import { rows } from './kit';

interface D { n: string; out: string; d: string }
const params = (rng: Rng): D => ({ n: rng.pick(['n', 'nombre', 'valeur', 'x']), out: rng.pick(['res', 'r', 'resultat']), d: rng.pick(['d', 'k', 'div']) });

const family: FamilyDefinition<D> = {
  id: 'diviseurs', title: 'Diviseurs et boucle while', notions: { primary: 'N09-boucle-while', secondary: ['N10-accumulateurs-compteurs', 'N05-logique-comparaisons'] }, kind: 'snippet',
  variants: [
    {
      id: 'nb-diviseurs', label: 'nombre de diviseurs', difficulty: 3, estimatedMinutes: 9, params,
      statement: (p) => `La variable entière \`${p.n}\` (≥ 1) est déjà déclarée et initialisée.\n\nDéclarez une variable entière \`${p.out}\` contenant le **nombre de diviseurs** de \`${p.n}\` (1 et ${p.n} compris).\n\nExemples : 12 a 6 diviseurs (1, 2, 3, 4, 6, 12) ; 7 en a 2 ; 1 en a 1.\n\nUtilisez une boucle \`while\`.`,
      given: (p) => [{ name: p.n, type: 'int', description: '' }],
      expect: (p) => [{ name: p.out, type: 'int' }],
      reference: (p) => `int ${p.out} = 0;\nint ${p.d} = 1;\nwhile (${p.d} <= ${p.n}) {\n    if (${p.n} % ${p.d} == 0) {\n        ${p.out}++;\n    }\n    ${p.d}++;\n}`,
      mutants: (p) => [
        { id: 'sans-n', label: 'le nombre lui-même n’est pas compté', explanationFr: `${p.n} est toujours un diviseur de lui-même : la condition doit être \`<=\`.`, code: `int ${p.out} = 0;\nint ${p.d} = 1;\nwhile (${p.d} < ${p.n}) {\n    if (${p.n} % ${p.d} == 0) {\n        ${p.out}++;\n    }\n    ${p.d}++;\n}` },
        { id: 'diviseurs-pairs-seulement', label: 'ne compte que les diviseurs pairs', explanationFr: 'Tous les diviseurs comptent, pas seulement les pairs : retire la condition supplémentaire.', code: `int ${p.out} = 0;\nint ${p.d} = 1;\nwhile (${p.d} <= ${p.n}) {\n    if (${p.n} % ${p.d} == 0 && ${p.d} % 2 == 0) {\n        ${p.out}++;\n    }\n    ${p.d}++;\n}` },
        { id: 'quotient-au-lieu-du-reste', label: 'test de divisibilité faux', explanationFr: '« d divise n » se teste avec le reste : n % d == 0 (et non n / d).', code: `int ${p.out} = 0;\nint ${p.d} = 1;\nwhile (${p.d} <= ${p.n}) {\n    if (${p.n} / ${p.d} == 0) {\n        ${p.out}++;\n    }\n    ${p.d}++;\n}` },
      ],
      tests: (p) => rows([p.n], [[12], [7], [1], [36], [30], [2], [97]], 2, true),
      hints: (p) => ['Un entier d divise n quand le reste de la division de n par d est 0.', `Parcours tous les candidats d de 1 à ${p.n} avec un \`while\` ; compte ceux pour lesquels \`${p.n} % d == 0\`.`, `int ${p.d} = 1; while (${p.d} <= ${p.n}) { if (${p.n} % ${p.d} == 0) { ${p.out}++; } ${p.d}++; }`],
    },
    {
      id: 'premier', label: 'nombre premier ?', difficulty: 3, estimatedMinutes: 12, params: (rng) => ({ ...params(rng), out: rng.pick(['estPremier', 'premier', 'ok']) }),
      statement: (p) => `La variable entière \`${p.n}\` (≥ 0) est déjà déclarée et initialisée.\n\nDéclarez une variable booléenne \`${p.out}\` valant \`true\` si \`${p.n}\` est un **nombre premier** (≥ 2 et divisible seulement par 1 et par lui-même), \`false\` sinon.\n\nAttention : 0 et 1 ne sont pas premiers.`,
      given: (p) => [{ name: p.n, type: 'int', description: '' }],
      expect: (p) => [{ name: p.out, type: 'boolean' }],
      reference: (p) => `boolean ${p.out} = ${p.n} >= 2;\nint ${p.d} = 2;\nwhile (${p.d} * ${p.d} <= ${p.n} && ${p.out}) {\n    if (${p.n} % ${p.d} == 0) {\n        ${p.out} = false;\n    }\n    ${p.d}++;\n}`,
      mutants: (p) => [
        { id: 'borne-stricte', label: 'd*d < n au lieu de <=', explanationFr: 'Pour un carré parfait (9, 25…), le diviseur d vérifie d*d == n : la borne doit être incluse.', code: `boolean ${p.out} = ${p.n} >= 2;\nint ${p.d} = 2;\nwhile (${p.d} * ${p.d} < ${p.n} && ${p.out}) {\n    if (${p.n} % ${p.d} == 0) {\n        ${p.out} = false;\n    }\n    ${p.d}++;\n}` },
        { id: 'un-est-premier', label: '0 et 1 considérés premiers', explanationFr: '0 et 1 ne sont pas des nombres premiers : traite ces cas au départ.', code: `boolean ${p.out} = true;\nint ${p.d} = 2;\nwhile (${p.d} * ${p.d} <= ${p.n} && ${p.out}) {\n    if (${p.n} % ${p.d} == 0) {\n        ${p.out} = false;\n    }\n    ${p.d}++;\n}` },
        { id: 'teste-seulement-2', label: 'ne teste que la divisibilité par 2', explanationFr: 'Un nombre peut être divisible par 3, 5, 7… sans être pair : teste tous les diviseurs possibles.', code: `boolean ${p.out} = ${p.n} >= 2;\nif (${p.n} > 2 && ${p.n} % 2 == 0) {\n    ${p.out} = false;\n}` },
      ],
      tests: (p) => rows([p.n], [[7], [12], [2], [9], [25], [97], [91], [1], [0]], 2, true).map((t) => t),
      hints: (p) => ['Un nombre est premier s’il n’a aucun diviseur entre 2 et lui-même (exclu). Il suffit même de tester jusqu’à sa racine carrée.', `Pars de \`${p.out} = ${p.n} >= 2\`. Teste ensuite les candidats d = 2, 3, … tant que d*d <= ${p.n} ; dès qu’un d divise ${p.n}, ${p.out} devient false.`, `while (${p.d} * ${p.d} <= ${p.n} && ${p.out}) { if (${p.n} % ${p.d} == 0) { ${p.out} = false; } ${p.d}++; }`],
    },
    {
      id: 'pgcd-soustractions', label: 'pgcd par soustractions successives', difficulty: 4, estimatedMinutes: 14,
      params: (rng) => ({ n: rng.pick(['a', 'p']), out: rng.pick(['pgcd', 'g', 'res']), d: rng.pick(['b', 'q']) }),
      valid: (p) => p.n !== p.d,
      statement: (p) => `Les variables entières \`${p.n}\` et \`${p.d}\` (toutes deux ≥ 1) sont déjà déclarées et initialisées.\n\nDéclarez une variable entière \`${p.out}\` égale à leur **plus grand commun diviseur**, calculé par l’algorithme d’Euclide *par soustractions* : tant que les deux nombres sont différents, on retire le plus petit du plus grand.\n\nExemple : 48 et 18 → 30 et 18 → 12 et 18 → 12 et 6 → 6 et 6 → pgcd = 6.\n\nVous devez travailler sur des copies : ne modifiez pas \`${p.n}\` ni \`${p.d}\` (elles sont fournies par l’énoncé).`,
      given: (p) => [{ name: p.n, type: 'int', description: '' }, { name: p.d, type: 'int', description: '' }],
      expect: (p) => [{ name: p.out, type: 'int' }],
      reference: (p) => `int x = ${p.n};\nint y = ${p.d};\nwhile (x != y) {\n    if (x > y) {\n        x = x - y;\n    } else {\n        y = y - x;\n    }\n}\nint ${p.out} = x;`,
      mutants: (p) => [
        { id: 'un-seul-sens', label: 'ne soustrait que dans un sens', explanationFr: 'Quand le deuxième nombre est le plus grand, il faut lui retirer le premier : ton code ne traite qu’un cas.', code: `int x = ${p.n};\nint y = ${p.d};\nwhile (x > y) {\n    x = x - y;\n}\nint ${p.out} = x;` },
        { id: 'condition-inegalite-fausse', label: 'boucle trop tôt arrêtée', explanationFr: 'La boucle doit continuer tant que x != y (et pas seulement tant que x > y ou y > x avec un seul retrait).', code: `int x = ${p.n};\nint y = ${p.d};\nif (x > y) {\n    x = x - y;\n} else {\n    y = y - x;\n}\nint ${p.out} = x;` },
        { id: 'renvoie-le-minimum', label: 'renvoie le plus petit des deux', explanationFr: 'Le pgcd n’est pas le minimum : 48 et 18 → 6, pas 18.', code: `int ${p.out} = ${p.n};\nif (${p.d} < ${p.out}) {\n    ${p.out} = ${p.d};\n}` },
      ],
      tests: (p) => rows([p.n, p.d], [[48, 18], [35, 14], [7, 7], [17, 5], [100, 75], [9, 27], [1, 1]], 2, true),
      hints: () => ['Tant que les deux nombres sont différents, le plus petit « rentre » dans le plus grand : on remplace le plus grand par la différence.', 'Travaille sur deux copies x et y. À chaque tour : si x > y alors x = x − y, sinon y = y − x. Arrête-toi quand x == y.', 'while (x != y) { if (x > y) { x = x - y; } else { y = y - x; } } puis le pgcd vaut x.'],
    },
  ],
};
export default family;
