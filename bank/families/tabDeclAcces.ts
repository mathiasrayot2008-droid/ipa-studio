import type { FamilyDefinition, Rng } from '@/types/bank';
import { N_ARR, rows } from './kit';

interface T { t: string; n: string; out: string; i: string; k: string }
const params = (rng: Rng): T => ({ t: rng.pick(N_ARR), n: rng.pick(['n', 'taille', 'nb']), out: rng.pick(['carres', 'res', 'resultat']), i: 'i', k: rng.pick(['k', 'pos', 'idx']) });

const family: FamilyDefinition<T> = {
  id: 'tabDeclAcces', title: 'Créer et accéder à un tableau', notions: { primary: 'N13-tableaux-bases', secondary: ['N08-boucle-for'] }, kind: 'snippet',
  variants: [
    {
      id: 'extremes', label: 'premier et dernier éléments', difficulty: 1, estimatedMinutes: 5, params,
      statement: (p) => `Le tableau d’entiers \`${p.t}\` (au moins un élément) est déjà déclaré et initialisé.\n\nDéclarez trois entiers : \`premier\` (la première valeur du tableau), \`dernier\` (la dernière) et \`ecart\` (\`dernier\` moins \`premier\`).`,
      given: (p) => [{ name: p.t, type: 'int[]', description: '' }],
      expect: () => [{ name: 'premier', type: 'int' }, { name: 'dernier', type: 'int' }, { name: 'ecart', type: 'int' }],
      reference: (p) => `int premier = ${p.t}[0];\nint dernier = ${p.t}[${p.t}.length - 1];\nint ecart = dernier - premier;`,
      mutants: (p) => [
        { id: 'indice-length', label: 't[t.length]', explanationFr: `Le dernier indice valide est ${p.t}.length - 1 : ${p.t}[${p.t}.length] provoque une erreur (ArrayIndexOutOfBoundsException).`, code: `int premier = ${p.t}[0];\nint dernier = ${p.t}[${p.t}.length];\nint ecart = dernier - premier;` },
        { id: 'ecart-inverse', label: 'premier − dernier', explanationFr: 'L’écart demandé est dernier − premier.', code: `int premier = ${p.t}[0];\nint dernier = ${p.t}[${p.t}.length - 1];\nint ecart = premier - dernier;` },
        { id: 'indice-un', label: 'premier = t[1]', explanationFr: 'Les indices commencent à 0 : le premier élément est t[0].', code: `int premier = ${p.t}[${p.t}.length > 1 ? 1 : 0];\nint dernier = ${p.t}[${p.t}.length - 1];\nint ecart = dernier - premier;` },
      ],
      tests: (p) => rows([p.t], [[[4, 9, 2, 7]], [[10, 3]], [[5, 5, 5]], [[-2, 8, 1, 0, 6]], [[1, 100]], [[3, 1, 4, 1, 5]], [[8]]], 2, true),
      hints: (p) => ['En Java, les indices d’un tableau commencent à 0.', `Le premier élément est \`${p.t}[0]\` ; \`${p.t}.length\` est le nombre d’éléments, donc le dernier est à l’indice \`${p.t}.length - 1\`.`, `int dernier = ${p.t}[${p.t}.length - 1];`],
    },
    {
      id: 'creer-carres', label: 'créer un tableau de carrés', difficulty: 2, estimatedMinutes: 8, params,
      valid: (p) => new Set([p.n, p.out, p.t]).size === 3,
      statement: (p) => `L’entier \`${p.n}\` (≥ 1) est déjà déclaré et initialisé.\n\nDéclarez un tableau d’entiers \`${p.out}\` de \`${p.n}\` cases tel que \`${p.out}[i]\` contienne le **carré de i**.\n\nExemple : ${p.n} = 5 → {0, 1, 4, 9, 16}.`,
      given: (p) => [{ name: p.n, type: 'int', description: '' }],
      expect: (p) => [{ name: p.out, type: 'int[]' }],
      reference: (p) => `int[] ${p.out} = new int[${p.n}];\nfor (int ${p.i} = 0; ${p.i} < ${p.n}; ${p.i}++) {\n    ${p.out}[${p.i}] = ${p.i} * ${p.i};\n}`,
      mutants: (p) => [
        { id: 'depart-un', label: 'carrés de 1 à n', explanationFr: 'La case 0 contient 0² = 0 : l’indice commence à 0.', code: `int[] ${p.out} = new int[${p.n}];\nfor (int ${p.i} = 0; ${p.i} < ${p.n}; ${p.i}++) {\n    ${p.out}[${p.i}] = (${p.i} + 1) * (${p.i} + 1);\n}` },
        { id: 'double', label: '2 × i', explanationFr: 'Tu calcules le double de i ; le carré est i × i.', code: `int[] ${p.out} = new int[${p.n}];\nfor (int ${p.i} = 0; ${p.i} < ${p.n}; ${p.i}++) {\n    ${p.out}[${p.i}] = 2 * ${p.i};\n}` },
        { id: 'taille-plus-un', label: 'un élément de trop', explanationFr: `Le tableau doit avoir exactement ${p.n} cases.`, code: `int[] ${p.out} = new int[${p.n} + 1];\nfor (int ${p.i} = 0; ${p.i} <= ${p.n}; ${p.i}++) {\n    ${p.out}[${p.i}] = ${p.i} * ${p.i};\n}` },
      ],
      tests: (p) => rows([p.n], [[5], [3], [1], [8], [10], [2], [4]], 2, true),
      hints: (p) => [`Il faut d’abord créer le tableau avec la bonne taille (\`new int[${p.n}]\`), puis remplir chaque case.`, 'Une boucle for sur l’indice i : la case i reçoit i * i.', `int[] ${p.out} = new int[${p.n}]; for (...) { ${p.out}[i] = i * i; }`],
    },
    {
      id: 'indice-valide', label: 'un indice est-il valide ?', difficulty: 2, estimatedMinutes: 7, params: (rng) => ({ ...params(rng), out: rng.pick(['valide', 'ok', 'existe']) }),
      statement: (p) => `Le tableau d’entiers \`${p.t}\` et l’entier \`${p.k}\` sont déjà déclarés et initialisés.\n\nDéclarez un booléen \`${p.out}\` valant \`true\` si \`${p.k}\` est un **indice valide** de \`${p.t}\` (c’est-à-dire qu’on peut écrire \`${p.t}[${p.k}]\` sans erreur), \`false\` sinon.`,
      given: (p) => [{ name: p.t, type: 'int[]', description: '' }, { name: p.k, type: 'int', description: '' }],
      expect: (p) => [{ name: p.out, type: 'boolean' }],
      reference: (p) => `boolean ${p.out} = ${p.k} >= 0 && ${p.k} < ${p.t}.length;`,
      mutants: (p) => [
        { id: 'borne-incluse', label: 'k <= t.length', explanationFr: `Le dernier indice valide est ${p.t}.length - 1 : ${p.k} <= ${p.t}.length accepte un indice trop grand.`, code: `boolean ${p.out} = ${p.k} >= 0 && ${p.k} <= ${p.t}.length;` },
        { id: 'zero-exclu', label: 'k > 0', explanationFr: 'L’indice 0 est valide : utilise `>= 0`.', code: `boolean ${p.out} = ${p.k} > 0 && ${p.k} < ${p.t}.length;` },
        { id: 'negatifs-oublies', label: 'indices négatifs acceptés', explanationFr: 'Un indice négatif n’est jamais valide : teste aussi `k >= 0`.', code: `boolean ${p.out} = ${p.k} < ${p.t}.length;` },
      ],
      tests: (p) => rows([p.t, p.k], [[[4, 9, 2], 1], [[4, 9, 2], 3], [[4, 9, 2], 0], [[4, 9, 2], 2], [[7], -1], [[1, 2, 3, 4], 4], [[5, 6], -3]], 2, true),
      hints: (p) => ['Les indices valides vont de 0 jusqu’à la longueur moins 1.', `Deux conditions à la fois : \`${p.k} >= 0\` ET \`${p.k} < ${p.t}.length\`.`, `boolean ${p.out} = ${p.k} >= 0 && ${p.k} < ${p.t}.length;`],
    },
  ],
};
export default family;
