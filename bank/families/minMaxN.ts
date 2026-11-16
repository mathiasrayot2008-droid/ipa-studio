import type { FamilyDefinition } from '@/types/bank';
import { names, rows } from './kit';

interface P3 { a: string; b: string; c: string; d: string; out: string }
const base = (rng: import('@/types/bank').Rng): P3 => {
  const [a, b, c, d] = names(rng, ['a', 'b', 'c', 'd', 'x', 'y', 'z', 'u', 'v', 'w'], 4);
  return { a: a!, b: b!, c: c!, d: d!, out: rng.pick(['res', 'resultat', 'r', 'val']) };
};
const triples = [[3, 9, 5], [8, 2, 6], [4, 4, 1], [-5, -2, -9], [7, 7, 7], [1, 8, 8], [-3, 0, 3], [10, 10, 2], [0, 0, 0]];

const family: FamilyDefinition<P3> = {
  id: 'minMaxN', title: 'Maximum, médiane et rang', notions: { primary: 'N04-if-else', secondary: ['N05-logique-comparaisons'] }, kind: 'snippet',
  variants: [
    {
      id: 'max3', label: 'maximum de trois entiers', difficulty: 1, estimatedMinutes: 5, params: base,
      statement: (p) => `Les variables entières \`${p.a}\`, \`${p.b}\` et \`${p.c}\` sont déjà déclarées et initialisées.\n\nDéclarez une variable entière \`${p.out}\` contenant la **plus grande** des trois valeurs.\n\nVous ne pouvez utiliser que des \`if\` (pas de tableau, pas de \`Math.max\`).`,
      given: (p) => [p.a, p.b, p.c].map((name) => ({ name, type: 'int' as const, description: '' })),
      expect: (p) => [{ name: p.out, type: 'int' }],
      reference: (p) => `int ${p.out} = ${p.a};\nif (${p.b} > ${p.out}) {\n    ${p.out} = ${p.b};\n}\nif (${p.c} > ${p.out}) {\n    ${p.out} = ${p.c};\n}`,
      mutants: (p) => [
        { id: 'oublie-troisieme', label: 'la troisième valeur n’est jamais comparée', explanationFr: `Tu compares seulement ${p.a} et ${p.b} : ${p.c} peut aussi être la plus grande.`, code: `int ${p.out} = ${p.a};\nif (${p.b} > ${p.out}) {\n    ${p.out} = ${p.b};\n}` },
        { id: 'minimum', label: 'renvoie le minimum', explanationFr: 'Le sens des comparaisons est inversé : tu calcules le plus petit au lieu du plus grand.', code: `int ${p.out} = ${p.a};\nif (${p.b} < ${p.out}) {\n    ${p.out} = ${p.b};\n}\nif (${p.c} < ${p.out}) {\n    ${p.out} = ${p.c};\n}` },
      ],
      tests: (p) => rows([p.a, p.b, p.c], triples, 2, true),
      hints: (p) => ['Garde en mémoire la plus grande valeur vue jusqu’ici et compare-la aux autres une par une.', `Initialise \`${p.out}\` avec \`${p.a}\`, puis un \`if\` par valeur restante : si elle dépasse \`${p.out}\`, elle le remplace.`, `if (${p.b} > ${p.out}) { ${p.out} = ${p.b}; } puis la même chose avec \`${p.c}\`.`],
    },
    {
      id: 'mediane3', label: 'médiane de trois entiers', difficulty: 2, estimatedMinutes: 9, params: base,
      statement: (p) => `Les variables entières \`${p.a}\`, \`${p.b}\` et \`${p.c}\` sont déjà déclarées et initialisées (des valeurs égales sont possibles).\n\nDéclarez une variable entière \`${p.out}\` contenant la **valeur médiane** : celle qui se trouve au milieu quand on trie les trois valeurs.\n\nExemples : 3, 9, 5 → 5 ; 4, 4, 1 → 4 ; 7, 7, 7 → 7.`,
      given: (p) => [p.a, p.b, p.c].map((name) => ({ name, type: 'int' as const, description: '' })),
      expect: (p) => [{ name: p.out, type: 'int' }],
      reference: (p) => `int ${p.out};\nif ((${p.a} >= ${p.b} && ${p.a} <= ${p.c}) || (${p.a} <= ${p.b} && ${p.a} >= ${p.c})) {\n    ${p.out} = ${p.a};\n} else if ((${p.b} >= ${p.a} && ${p.b} <= ${p.c}) || (${p.b} <= ${p.a} && ${p.b} >= ${p.c})) {\n    ${p.out} = ${p.b};\n} else {\n    ${p.out} = ${p.c};\n}`,
      mutants: (p) => [
        { id: 'inegalites-strictes', label: 'comparaisons strictes : les égalités sont mal gérées', explanationFr: 'Quand deux valeurs sont égales (ou toutes les trois), des comparaisons strictes (> et <) écartent à tort la bonne réponse : utilise >= et <=.', code: `int ${p.out};\nif ((${p.a} > ${p.b} && ${p.a} < ${p.c}) || (${p.a} < ${p.b} && ${p.a} > ${p.c})) {\n    ${p.out} = ${p.a};\n} else if ((${p.b} > ${p.a} && ${p.b} < ${p.c}) || (${p.b} < ${p.a} && ${p.b} > ${p.c})) {\n    ${p.out} = ${p.b};\n} else {\n    ${p.out} = ${p.c};\n}` },
        { id: 'renvoie-le-max', label: 'renvoie le maximum', explanationFr: 'Tu cherches la plus grande valeur, pas celle du milieu.', code: `int ${p.out} = ${p.a};\nif (${p.b} > ${p.out}) {\n    ${p.out} = ${p.b};\n}\nif (${p.c} > ${p.out}) {\n    ${p.out} = ${p.c};\n}` },
        { id: 'oublie-c', label: 'ne teste jamais la valeur du milieu pour c', explanationFr: `La médiane peut être \`${p.c}\` : ton code ne renvoie jamais ${p.c} que « par défaut », sans cas d’égalité.`, code: `int ${p.out};\nif (${p.a} >= ${p.b} && ${p.a} <= ${p.c}) {\n    ${p.out} = ${p.a};\n} else if (${p.b} >= ${p.a} && ${p.b} <= ${p.c}) {\n    ${p.out} = ${p.b};\n} else {\n    ${p.out} = ${p.c};\n}` },
      ],
      tests: (p) => rows([p.a, p.b, p.c], [[3, 9, 5], [8, 2, 6], [4, 4, 1], [-5, -2, -9], [7, 7, 7], [9, 5, 3], [2, 6, 8], [1, 8, 8], [5, 3, 9]], 2, false).map((t, k, arr) => (k === arr.length - 1 ? { ...t, vis: 'edge' as const } : t)),
      hints: () => ['La médiane est la valeur qui n’est ni la plus petite ni la plus grande. Pour chaque variable, demande-toi : est-elle entre les deux autres ?', 'Une valeur x est « entre » y et z si (y <= x et x <= z) ou (z <= x et x <= y). Pense aux valeurs égales : utilise >= et <=.', 'Teste a ; sinon teste b ; sinon c est forcément la médiane (else final).'],
    },
    {
      id: 'deuxieme4', label: 'deuxième plus grand de quatre entiers', difficulty: 3, estimatedMinutes: 12, params: base,
      statement: (p) => `Les variables entières \`${p.a}\`, \`${p.b}\`, \`${p.c}\` et \`${p.d}\` sont déjà déclarées et initialisées.\n\nDéclarez une variable entière \`${p.out}\` contenant le **deuxième plus grand** élément quand on trie les quatre valeurs par ordre décroissant. Les doublons comptent : pour 7, 7, 2, 1 le résultat est 7.\n\nPas de tableau ni de tri : uniquement des \`if\`.`,
      given: (p) => [p.a, p.b, p.c, p.d].map((name) => ({ name, type: 'int' as const, description: '' })),
      expect: (p) => [{ name: p.out, type: 'int' }],
      reference: (p) => `int m1 = ${p.a};\nint ${p.out} = ${p.b};\nif (${p.b} > ${p.a}) {\n    m1 = ${p.b};\n    ${p.out} = ${p.a};\n}\nif (${p.c} > m1) {\n    ${p.out} = m1;\n    m1 = ${p.c};\n} else if (${p.c} > ${p.out}) {\n    ${p.out} = ${p.c};\n}\nif (${p.d} > m1) {\n    ${p.out} = m1;\n    m1 = ${p.d};\n} else if (${p.d} > ${p.out}) {\n    ${p.out} = ${p.d};\n}`,
      mutants: (p) => [
        { id: 'oublie-decalage', label: 'le maximum est mis à jour sans décaler l’ancien', explanationFr: 'Quand une nouvelle valeur devient le maximum, l’ancien maximum devient le deuxième : ne l’oublie pas.', code: `int m1 = ${p.a};\nint ${p.out} = ${p.b};\nif (${p.b} > ${p.a}) {\n    m1 = ${p.b};\n    ${p.out} = ${p.a};\n}\nif (${p.c} > m1) {\n    m1 = ${p.c};\n} else if (${p.c} > ${p.out}) {\n    ${p.out} = ${p.c};\n}\nif (${p.d} > m1) {\n    m1 = ${p.d};\n} else if (${p.d} > ${p.out}) {\n    ${p.out} = ${p.d};\n}` },
        { id: 'initialisation-sans-tri', label: 'départ sans tenir compte de l’ordre de a et b', explanationFr: `Au départ, le maximum n’est pas forcément \`${p.a}\` : compare \`${p.a}\` et \`${p.b}\` avant de continuer.`, code: `int m1 = ${p.a};\nint ${p.out} = ${p.b};\nif (${p.c} > m1) {\n    ${p.out} = m1;\n    m1 = ${p.c};\n} else if (${p.c} > ${p.out}) {\n    ${p.out} = ${p.c};\n}\nif (${p.d} > m1) {\n    ${p.out} = m1;\n    m1 = ${p.d};\n} else if (${p.d} > ${p.out}) {\n    ${p.out} = ${p.d};\n}` },
        { id: 'renvoie-le-max', label: 'renvoie le maximum', explanationFr: 'Tu renvoies le plus grand élément, pas le deuxième.', code: `int ${p.out} = ${p.a};\nif (${p.b} > ${p.out}) { ${p.out} = ${p.b}; }\nif (${p.c} > ${p.out}) { ${p.out} = ${p.c}; }\nif (${p.d} > ${p.out}) { ${p.out} = ${p.d}; }` },
      ],
      tests: (p) => rows([p.a, p.b, p.c, p.d], [[7, 7, 2, 1], [4, 9, 6, 1], [1, 2, 3, 4], [4, 3, 2, 1], [5, 5, 5, 5], [2, 8, 8, 3], [-1, -5, -3, -9], [3, 1, 9, 9], [0, 4, 0, 4]], 2, true),
      hints: () => ['Garde en mémoire DEUX valeurs : le maximum et le deuxième. Parcours les quatre valeurs une par une.', 'Pour chaque nouvelle valeur v : si v > maximum, l’ancien maximum devient le deuxième, puis v devient le maximum ; sinon si v > deuxième, v remplace le deuxième.', 'Commence par comparer a et b pour initialiser maximum et deuxième, puis traite c, puis d avec la règle ci-dessus.'],
    },
  ],
};
export default family;
