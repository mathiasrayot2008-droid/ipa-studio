import type { FamilyDefinition, Rng } from '@/types/bank';
import { rows } from './kit';

interface G { n: string; m: string; r: string; i: string; j: string; mat: string; out: string }
const params = (rng: Rng): G => ({ n: rng.pick(['n', 'lignes', 'nbLig']), m: rng.pick(['m', 'colonnes', 'nbCol']), r: rng.pick(['tab', 'grille', 'res']), i: 'i', j: 'j', mat: rng.pick(['mat', 'notes', 'tableau']), out: rng.pick(['sommes', 'totaux', 'sl']) });

const family: FamilyDefinition<G> = {
  id: 'tab2DInit', title: 'Tableaux à deux dimensions', notions: { primary: 'N16-tableaux-2d', secondary: ['N11-boucles-imbriquees'] }, kind: 'snippet',
  variants: [
    {
      id: 'table-mult', label: 'table de multiplication', difficulty: 2, estimatedMinutes: 9, params,
      valid: (p) => new Set([p.n, p.m, p.r]).size === 3,
      statement: (p) => `Les entiers \`${p.n}\` et \`${p.m}\` (≥ 1) sont déjà déclarés et initialisés.\n\nDéclarez un tableau d’entiers à deux dimensions \`${p.r}\` de \`${p.n}\` lignes et \`${p.m}\` colonnes tel que la case de ligne i et de colonne j contienne **(i + 1) × (j + 1)**.\n\nExemple : ${p.n} = 2 et ${p.m} = 3 → {{1, 2, 3}, {2, 4, 6}}.`,
      given: (p) => [{ name: p.n, type: 'int', description: '' }, { name: p.m, type: 'int', description: '' }],
      expect: (p) => [{ name: p.r, type: 'int[][]' }],
      reference: (p) => `int[][] ${p.r} = new int[${p.n}][${p.m}];\nfor (int ${p.i} = 0; ${p.i} < ${p.n}; ${p.i}++) {\n    for (int ${p.j} = 0; ${p.j} < ${p.m}; ${p.j}++) {\n        ${p.r}[${p.i}][${p.j}] = (${p.i} + 1) * (${p.j} + 1);\n    }\n}`,
      mutants: (p) => [
        { id: 'indices-sans-decalage', label: 'i × j au lieu de (i+1) × (j+1)', explanationFr: 'Les indices commencent à 0 mais la table commence à 1 × 1 : ajoute 1 à chaque indice.', code: `int[][] ${p.r} = new int[${p.n}][${p.m}];\nfor (int ${p.i} = 0; ${p.i} < ${p.n}; ${p.i}++) {\n    for (int ${p.j} = 0; ${p.j} < ${p.m}; ${p.j}++) {\n        ${p.r}[${p.i}][${p.j}] = ${p.i} * ${p.j};\n    }\n}` },
        { id: 'dimensions-inversees', label: 'lignes et colonnes inversées', explanationFr: `Le tableau doit avoir ${p.n} lignes (première dimension) et ${p.m} colonnes (seconde).`, code: `int[][] ${p.r} = new int[${p.m}][${p.n}];\nfor (int ${p.i} = 0; ${p.i} < ${p.m}; ${p.i}++) {\n    for (int ${p.j} = 0; ${p.j} < ${p.n}; ${p.j}++) {\n        ${p.r}[${p.i}][${p.j}] = (${p.i} + 1) * (${p.j} + 1);\n    }\n}` },
        { id: 'somme-au-lieu-de-produit', label: '(i+1) + (j+1)', explanationFr: 'La table de multiplication utilise le produit, pas la somme.', code: `int[][] ${p.r} = new int[${p.n}][${p.m}];\nfor (int ${p.i} = 0; ${p.i} < ${p.n}; ${p.i}++) {\n    for (int ${p.j} = 0; ${p.j} < ${p.m}; ${p.j}++) {\n        ${p.r}[${p.i}][${p.j}] = (${p.i} + 1) + (${p.j} + 1);\n    }\n}` },
      ],
      tests: (p) => rows([p.n, p.m], [[2, 3], [3, 3], [4, 2], [1, 5], [5, 1], [4, 4], [1, 1]], 2, true),
      hints: (p) => ['Il faut deux boucles imbriquées : une pour les lignes, une pour les colonnes.', `Crée d’abord le tableau : \`new int[${p.n}][${p.m}]\`. La case [i][j] reçoit (i + 1) * (j + 1).`, `for (int ${p.i} = 0; ${p.i} < ${p.n}; ${p.i}++) { for (int ${p.j} = 0; ${p.j} < ${p.m}; ${p.j}++) { ${p.r}[${p.i}][${p.j}] = (${p.i} + 1) * (${p.j} + 1); } }`],
    },
    {
      id: 'damier', label: 'damier de 0 et de 1', difficulty: 2, estimatedMinutes: 9, params,
      valid: (p) => new Set([p.n, p.m, p.r]).size === 3,
      statement: (p) => `Les entiers \`${p.n}\` et \`${p.m}\` (≥ 1) sont déjà déclarés et initialisés.\n\nDéclarez un tableau d’entiers à deux dimensions \`${p.r}\` de \`${p.n}\` lignes et \`${p.m}\` colonnes formant un **damier** : la case [0][0] vaut 0, et deux cases voisines (même ligne ou même colonne) ont des valeurs différentes (0 ou 1).\n\nExemple : ${p.n} = 2 et ${p.m} = 3 → {{0, 1, 0}, {1, 0, 1}}.`,
      given: (p) => [{ name: p.n, type: 'int', description: '' }, { name: p.m, type: 'int', description: '' }],
      expect: (p) => [{ name: p.r, type: 'int[][]' }],
      reference: (p) => `int[][] ${p.r} = new int[${p.n}][${p.m}];\nfor (int ${p.i} = 0; ${p.i} < ${p.n}; ${p.i}++) {\n    for (int ${p.j} = 0; ${p.j} < ${p.m}; ${p.j}++) {\n        ${p.r}[${p.i}][${p.j}] = (${p.i} + ${p.j}) % 2;\n    }\n}`,
      mutants: (p) => [
        { id: 'rayures-colonnes', label: 'colonnes alternées seulement', explanationFr: 'Dans un damier, la parité dépend de la ligne ET de la colonne : (i + j) % 2.', code: `int[][] ${p.r} = new int[${p.n}][${p.m}];\nfor (int ${p.i} = 0; ${p.i} < ${p.n}; ${p.i}++) {\n    for (int ${p.j} = 0; ${p.j} < ${p.m}; ${p.j}++) {\n        ${p.r}[${p.i}][${p.j}] = ${p.j} % 2;\n    }\n}` },
        { id: 'produit-au-lieu-de-somme', label: '(i × j) % 2', explanationFr: 'Le produit i × j est pair dès que i ou j est pair : ce n’est pas un damier. Utilise la somme.', code: `int[][] ${p.r} = new int[${p.n}][${p.m}];\nfor (int ${p.i} = 0; ${p.i} < ${p.n}; ${p.i}++) {\n    for (int ${p.j} = 0; ${p.j} < ${p.m}; ${p.j}++) {\n        ${p.r}[${p.i}][${p.j}] = (${p.i} * ${p.j}) % 2;\n    }\n}` },
        { id: 'depart-inverse', label: 'la case [0][0] vaut 1', explanationFr: 'Le damier commence par 0 en haut à gauche.', code: `int[][] ${p.r} = new int[${p.n}][${p.m}];\nfor (int ${p.i} = 0; ${p.i} < ${p.n}; ${p.i}++) {\n    for (int ${p.j} = 0; ${p.j} < ${p.m}; ${p.j}++) {\n        ${p.r}[${p.i}][${p.j}] = (${p.i} + ${p.j} + 1) % 2;\n    }\n}` },
      ],
      tests: (p) => rows([p.n, p.m], [[2, 3], [3, 3], [4, 2], [1, 4], [5, 1], [4, 5], [1, 1]], 2, true),
      hints: () => ['Une case est « noire » ou « blanche » selon la parité de la somme de ses indices.', 'La valeur de la case [i][j] dépend de (i + j) % 2.', 'Deux boucles imbriquées ; dans la boucle intérieure : tab[i][j] = (i + j) % 2;'],
    },
    {
      id: 'somme-lignes', label: 'somme de chaque ligne', difficulty: 3, estimatedMinutes: 12, params,
      valid: (p) => new Set([p.mat, p.out, p.i, p.j]).size === 4,
      statement: (p) => `Le tableau d’entiers à deux dimensions \`${p.mat}\` (au moins une ligne, toutes de même longueur) est déjà déclaré et initialisé.\n\nDéclarez un tableau d’entiers \`${p.out}\` à **une dimension**, de taille égale au nombre de lignes de \`${p.mat}\`, tel que \`${p.out}[i]\` soit la **somme des éléments de la ligne i**.\n\nExemple : {{1, 2, 3}, {4, 5, 6}} → {6, 15}.`,
      given: (p) => [{ name: p.mat, type: 'int[][]', description: '' }],
      expect: (p) => [{ name: p.out, type: 'int[]' }],
      reference: (p) => `int[] ${p.out} = new int[${p.mat}.length];\nfor (int ${p.i} = 0; ${p.i} < ${p.mat}.length; ${p.i}++) {\n    for (int ${p.j} = 0; ${p.j} < ${p.mat}[${p.i}].length; ${p.j}++) {\n        ${p.out}[${p.i}] += ${p.mat}[${p.i}][${p.j}];\n    }\n}`,
      mutants: (p) => [
        { id: 'somme-colonnes', label: 'somme des colonnes', explanationFr: 'Tu additionnes les colonnes ; la consigne demande une somme par LIGNE.', code: `int[] ${p.out} = new int[${p.mat}[0].length];\nfor (int ${p.i} = 0; ${p.i} < ${p.mat}.length; ${p.i}++) {\n    for (int ${p.j} = 0; ${p.j} < ${p.mat}[${p.i}].length; ${p.j}++) {\n        ${p.out}[${p.j}] += ${p.mat}[${p.i}][${p.j}];\n    }\n}` },
        { id: 'somme-totale', label: 'même total partout', explanationFr: 'Chaque case de ton résultat contient la somme de toute la matrice : il faut une somme par ligne.', code: `int[] ${p.out} = new int[${p.mat}.length];\nint tot = 0;\nfor (int ${p.i} = 0; ${p.i} < ${p.mat}.length; ${p.i}++) {\n    for (int ${p.j} = 0; ${p.j} < ${p.mat}[${p.i}].length; ${p.j}++) {\n        tot += ${p.mat}[${p.i}][${p.j}];\n    }\n    ${p.out}[${p.i}] = tot;\n}` },
        { id: 'derniere-colonne-ignoree', label: 'dernière colonne ignorée', explanationFr: `La boucle intérieure doit aller jusqu’à ${p.mat}[i].length - 1 inclus.`, code: `int[] ${p.out} = new int[${p.mat}.length];\nfor (int ${p.i} = 0; ${p.i} < ${p.mat}.length; ${p.i}++) {\n    for (int ${p.j} = 0; ${p.j} < ${p.mat}[${p.i}].length - 1; ${p.j}++) {\n        ${p.out}[${p.i}] += ${p.mat}[${p.i}][${p.j}];\n    }\n}` },
      ],
      tests: (p) => rows([p.mat], [[[[1, 2, 3], [4, 5, 6]]], [[[5, 5], [1, 1], [9, 0]]], [[[7]]], [[[2, 4, 6, 8]]], [[[1], [2], [3]]], [[[-1, 1], [-2, 2]]], [[[0, 0], [0, 0]]]], 2, true),
      hints: (p) => [`\`${p.mat}.length\` est le nombre de lignes, \`${p.mat}[i].length\` le nombre de colonnes de la ligne i.`, `Crée \`${p.out}\` avec une case par ligne. Pour chaque ligne i, parcours ses colonnes j et ajoute \`${p.mat}[i][j]\` à \`${p.out}[i]\`.`, `${p.out}[${p.i}] += ${p.mat}[${p.i}][${p.j}]; dans la boucle intérieure (la case de ${p.out} part de 0 pour chaque ligne).`],
    },
  ],
};
export default family;
