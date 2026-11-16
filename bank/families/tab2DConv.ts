import type { FamilyDefinition, Rng } from '@/types/bank';
import { rows } from './kit';

interface M { m: string; out: string; tr: string; k: string; c: string; lig: string; col: string; i: string; j: string; nbC: string }
const params = (rng: Rng): M => ({
  m: rng.pick(['m', 'mat', 'grille']), out: rng.pick(['plat', 'tab1D', 'lineaire']), tr: rng.pick(['t', 'tr', 'transposee']), k: rng.pick(['k', 'indice', 'pos']), c: rng.pick(['c', 'nbCol', 'colonnes']),
  lig: rng.pick(['ligne', 'lig', 'r']), col: rng.pick(['colonne', 'col', 'q']), i: rng.pick(['i', 'l']), j: rng.pick(['j', 'h']), nbC: rng.pick(['nbC', 'largeur', 'w']),
});

const family: FamilyDefinition<M> = {
  id: 'tab2DConv', title: 'Aplatir et transposer un tableau 2D', notions: { primary: 'N17-aplatissement-transposition', secondary: ['N16-tableaux-2d', 'N11-boucles-imbriquees'] }, kind: 'snippet',
  variants: [
    {
      id: 'indice-2d', label: 'ligne et colonne d’un indice aplati', difficulty: 2, estimatedMinutes: 7, params,
      valid: (p) => new Set([p.k, p.c, p.lig, p.col]).size === 4,
      statement: (p) => `Un tableau à 2 dimensions de \`${p.c}\` colonnes est rangé **ligne après ligne** dans un tableau à une dimension. Les entiers \`${p.k}\` (≥ 0) et \`${p.c}\` (≥ 1) sont déjà déclarés et initialisés : \`${p.k}\` est l’indice d’une case dans le tableau à une dimension.\n\nDéclarez deux entiers :\n\n- \`${p.lig}\` : le numéro de la ligne de cette case dans le tableau à 2 dimensions ;\n- \`${p.col}\` : le numéro de sa colonne.\n\nLes numéros commencent à 0. Exemple : \`${p.c}\` = 3 et \`${p.k}\` = 7 → ligne 2, colonne 1 (car 7 = 2 × 3 + 1).`,
      given: (p) => [{ name: p.k, type: 'int', description: '' }, { name: p.c, type: 'int', description: '' }], expect: (p) => [{ name: p.lig, type: 'int' }, { name: p.col, type: 'int' }],
      reference: (p) => `int ${p.lig} = ${p.k} / ${p.c};\nint ${p.col} = ${p.k} % ${p.c};`,
      mutants: (p) => [
        { id: 'inverse', label: 'ligne et colonne échangées', explanationFr: `Le quotient de la division par le nombre de colonnes est le numéro de LIGNE ; le reste est la colonne.`, code: `int ${p.lig} = ${p.k} % ${p.c};\nint ${p.col} = ${p.k} / ${p.c};` },
        { id: 'colonne-par-soustraction', label: 'colonne = k − ligne', explanationFr: `Pour retrouver la colonne, retire les cases des lignes complètes précédentes : \`${p.k} - ligne * ${p.c}\` (ou plus simplement \`${p.k} % ${p.c}\`).`, code: `int ${p.lig} = ${p.k} / ${p.c};\nint ${p.col} = ${p.k} - ${p.lig};` },
        { id: 'diviseur-faux', label: 'division par c − 1', explanationFr: 'On divise par le nombre de colonnes (c), pas par c − 1.', code: `int ${p.lig} = ${p.k} / (${p.c} - 1);\nint ${p.col} = ${p.k} % (${p.c} - 1);` },
      ],
      tests: (p) => rows([p.k, p.c], [[7, 3], [0, 4], [5, 5], [11, 4], [2, 6], [13, 5], [3, 1]], 2, true),
      hints: (p) => [`Chaque ligne contient \`${p.c}\` cases : combien de lignes entières précèdent la case \`${p.k}\` ?`, 'La division entière donne le numéro de ligne, le reste de cette division donne la colonne.', `int ${p.lig} = ${p.k} / ${p.c}; int ${p.col} = ${p.k} % ${p.c};`],
    },
    {
      id: 'aplatir', label: 'aplatir une matrice', difficulty: 3, estimatedMinutes: 12, params,
      valid: (p) => new Set([p.m, p.out, p.i, p.j, p.nbC]).size === 5,
      statement: (p) => `Le tableau d’entiers à 2 dimensions \`${p.m}\` (au moins une ligne et une colonne, toutes les lignes de même longueur) est déjà déclaré et initialisé.\n\nDéclarez un tableau d’entiers \`${p.out}\` à **une dimension** contenant toutes les valeurs de \`${p.m}\`, **ligne après ligne**.\n\nExemple : {{1, 2, 3}, {4, 5, 6}} → {1, 2, 3, 4, 5, 6}.`,
      given: (p) => [{ name: p.m, type: 'int[][]', description: '' }], expect: (p) => [{ name: p.out, type: 'int[]' }],
      reference: (p) => `int ${p.nbC} = ${p.m}[0].length;\nint[] ${p.out} = new int[${p.m}.length * ${p.nbC}];\nfor (int ${p.i} = 0; ${p.i} < ${p.m}.length; ${p.i}++) {\n    for (int ${p.j} = 0; ${p.j} < ${p.nbC}; ${p.j}++) {\n        ${p.out}[${p.i} * ${p.nbC} + ${p.j}] = ${p.m}[${p.i}][${p.j}];\n    }\n}`,
      mutants: (p) => [
        { id: 'multiplicateur-lignes', label: 'i × nombre de lignes + j', explanationFr: 'Pour passer à la ligne suivante on avance du **nombre de colonnes** (longueur d’une ligne), pas du nombre de lignes.', code: `int ${p.nbC} = ${p.m}[0].length;\nint[] ${p.out} = new int[${p.m}.length * ${p.nbC}];\nfor (int ${p.i} = 0; ${p.i} < ${p.m}.length; ${p.i}++) {\n    for (int ${p.j} = 0; ${p.j} < ${p.nbC}; ${p.j}++) {\n        ${p.out}[${p.i} * ${p.m}.length + ${p.j}] = ${p.m}[${p.i}][${p.j}];\n    }\n}` },
        { id: 'colonne-par-colonne', label: 'rangement colonne après colonne', explanationFr: 'Le rangement demandé est ligne après ligne : la case [i][j] va à l’indice i × (nombre de colonnes) + j.', code: `int ${p.nbC} = ${p.m}[0].length;\nint[] ${p.out} = new int[${p.m}.length * ${p.nbC}];\nfor (int ${p.i} = 0; ${p.i} < ${p.m}.length; ${p.i}++) {\n    for (int ${p.j} = 0; ${p.j} < ${p.nbC}; ${p.j}++) {\n        ${p.out}[${p.j} * ${p.m}.length + ${p.i}] = ${p.m}[${p.i}][${p.j}];\n    }\n}` },
        { id: 'taille-fausse', label: 'tableau trop petit', explanationFr: 'Le tableau aplati contient lignes × colonnes valeurs, pas lignes + colonnes.', code: `int ${p.nbC} = ${p.m}[0].length;\nint[] ${p.out} = new int[${p.m}.length + ${p.nbC}];\nfor (int ${p.i} = 0; ${p.i} < ${p.m}.length; ${p.i}++) {\n    for (int ${p.j} = 0; ${p.j} < ${p.nbC}; ${p.j}++) {\n        ${p.out}[(${p.i} * ${p.nbC} + ${p.j}) % (${p.m}.length + ${p.nbC})] = ${p.m}[${p.i}][${p.j}];\n    }\n}` },
      ],
      tests: (p) => rows([p.m], [[[[1, 2, 3], [4, 5, 6]]], [[[1, 2], [3, 4], [5, 6]]], [[[9, 8], [7, 6]]], [[[1, 2, 3, 4]]], [[[1], [2], [3]]], [[[7]]]], 2, true),
      hints: (p) => [`Le tableau à une dimension a \`${p.m}.length\` × (nombre de colonnes) cases.`, `La case [i][j] se range à l’indice \`i * nbColonnes + j\` : i lignes complètes d’abord, puis j cases dans la ligne.`, `${p.out}[i * ${p.nbC} + j] = ${p.m}[i][j]; dans deux boucles imbriquées.`],
    },
    {
      id: 'transposee', label: 'transposée d’une matrice', difficulty: 3, estimatedMinutes: 12, params,
      valid: (p) => new Set([p.m, p.tr, p.i, p.j]).size === 4,
      statement: (p) => `Le tableau d’entiers à 2 dimensions \`${p.m}\` (au moins une ligne et une colonne, toutes les lignes de même longueur) est déjà déclaré et initialisé.\n\nDéclarez un tableau d’entiers à 2 dimensions \`${p.tr}\`, la **transposée** de \`${p.m}\` : ses lignes sont les colonnes de \`${p.m}\`, c’est-à-dire \`${p.tr}[j][i] == ${p.m}[i][j]\`. Si \`${p.m}\` a 2 lignes et 3 colonnes, \`${p.tr}\` a 3 lignes et 2 colonnes.\n\nExemple : {{1, 2, 3}, {4, 5, 6}} → {{1, 4}, {2, 5}, {3, 6}}.`,
      given: (p) => [{ name: p.m, type: 'int[][]', description: '' }], expect: (p) => [{ name: p.tr, type: 'int[][]' }],
      reference: (p) => `int[][] ${p.tr} = new int[${p.m}[0].length][${p.m}.length];\nfor (int ${p.i} = 0; ${p.i} < ${p.m}.length; ${p.i}++) {\n    for (int ${p.j} = 0; ${p.j} < ${p.m}[0].length; ${p.j}++) {\n        ${p.tr}[${p.j}][${p.i}] = ${p.m}[${p.i}][${p.j}];\n    }\n}`,
      mutants: (p) => [
        { id: 'dimensions-non-inversees', label: 'même dimensions que l’original', explanationFr: `La transposée d’une matrice de L lignes et C colonnes a C lignes et L colonnes : \`new int[${p.m}[0].length][${p.m}.length]\`.`, code: `int[][] ${p.tr} = new int[${p.m}.length][${p.m}[0].length];\nfor (int ${p.i} = 0; ${p.i} < ${p.m}.length; ${p.i}++) {\n    for (int ${p.j} = 0; ${p.j} < ${p.m}[0].length; ${p.j}++) {\n        ${p.tr}[${p.j}][${p.i}] = ${p.m}[${p.i}][${p.j}];\n    }\n}` },
        { id: 'copie-sans-transposer', label: 'copie sans échanger les indices', explanationFr: `La case [i][j] de \`${p.m}\` doit aller en [j][i] de \`${p.tr}\`.`, code: `int[][] ${p.tr} = new int[${p.m}[0].length][${p.m}.length];\nfor (int ${p.i} = 0; ${p.i} < ${p.m}.length; ${p.i}++) {\n    for (int ${p.j} = 0; ${p.j} < ${p.m}[0].length; ${p.j}++) {\n        ${p.tr}[${p.j}][${p.i}] = ${p.m}[${p.j} % ${p.m}.length][${p.i} % ${p.m}[0].length];\n    }\n}` },
        { id: 'anti-transposee', label: 'symétrie par l’autre diagonale', explanationFr: 'Pour la transposée, la case [i][j] va simplement en [j][i] (symétrie par la diagonale principale).', code: `int[][] ${p.tr} = new int[${p.m}[0].length][${p.m}.length];\nfor (int ${p.i} = 0; ${p.i} < ${p.m}.length; ${p.i}++) {\n    for (int ${p.j} = 0; ${p.j} < ${p.m}[0].length; ${p.j}++) {\n        ${p.tr}[${p.m}[0].length - 1 - ${p.j}][${p.m}.length - 1 - ${p.i}] = ${p.m}[${p.i}][${p.j}];\n    }\n}` },
      ],
      tests: (p) => rows([p.m], [[[[1, 2, 3], [4, 5, 6]]], [[[1, 2], [3, 4], [5, 6]]], [[[1, 2], [3, 4]]], [[[1, 2, 3, 4]]], [[[1], [2], [3]]], [[[7]]]], 2, true),
      hints: (p) => [`Les dimensions s’inversent : si \`${p.m}\` a L lignes et C colonnes, \`${p.tr}\` a C lignes et L colonnes.`, `Crée \`${p.tr}\` avec \`new int[${p.m}[0].length][${p.m}.length]\`, puis recopie chaque case [i][j] dans [j][i].`, `${p.tr}[j][i] = ${p.m}[i][j]; dans deux boucles imbriquées sur i (lignes) et j (colonnes) de \`${p.m}\`.`],
    },
    {
      id: 'deplier', label: 'replier un tableau en matrice', difficulty: 4, estimatedMinutes: 13, params,
      valid: (p) => new Set([p.m, p.out, p.c, p.k]).size === 4,
      statement: (p) => `Le tableau d’entiers \`${p.out}\` (non vide) et l’entier \`${p.c}\` (≥ 1) sont déjà déclarés et initialisés ; \`${p.c}\` divise la longueur de \`${p.out}\`.\n\nDéclarez un tableau d’entiers à 2 dimensions \`${p.m}\` de \`${p.c}\` colonnes, obtenu en **rangeant les valeurs de \`${p.out}\` ligne après ligne**. Le nombre de lignes se déduit de la longueur de \`${p.out}\`.\n\nExemple : {1, 2, 3, 4, 5, 6} et \`${p.c}\` = 3 → {{1, 2, 3}, {4, 5, 6}}.`,
      given: (p) => [{ name: p.out, type: 'int[]', description: '' }, { name: p.c, type: 'int', description: '' }], expect: (p) => [{ name: p.m, type: 'int[][]' }],
      reference: (p) => `int[][] ${p.m} = new int[${p.out}.length / ${p.c}][${p.c}];\nfor (int ${p.k} = 0; ${p.k} < ${p.out}.length; ${p.k}++) {\n    ${p.m}[${p.k} / ${p.c}][${p.k} % ${p.c}] = ${p.out}[${p.k}];\n}`,
      mutants: (p) => [
        { id: 'colonne-par-colonne', label: 'rangement par colonnes', explanationFr: `Les valeurs se rangent ligne après ligne : la case de \`${p.out}\` d’indice k va en ligne k / ${p.c}, colonne k % ${p.c}.`, code: `int[][] ${p.m} = new int[${p.out}.length / ${p.c}][${p.c}];\nfor (int ${p.k} = 0; ${p.k} < ${p.out}.length; ${p.k}++) {\n    int lignes = ${p.out}.length / ${p.c};\n    ${p.m}[${p.k} % lignes][${p.k} / lignes] = ${p.out}[${p.k}];\n}` },
        { id: 'indices-inverses', label: 'ligne et colonne inversées', explanationFr: `Le quotient par \`${p.c}\` donne la ligne, le reste donne la colonne (et pas l’inverse).`, code: `int[][] ${p.m} = new int[${p.out}.length / ${p.c}][${p.c}];\nfor (int ${p.k} = 0; ${p.k} < ${p.out}.length; ${p.k}++) {\n    ${p.m}[${p.k} % ${p.c}][${p.k} / ${p.c}] = ${p.out}[${p.k}];\n}` },
        { id: 'dimensions-inversees', label: 'c lignes au lieu de c colonnes', explanationFr: `\`${p.c}\` est le nombre de **colonnes** : le tableau a \`${p.out}.length / ${p.c}\` lignes.`, code: `int[][] ${p.m} = new int[${p.c}][${p.out}.length / ${p.c}];\nfor (int ${p.k} = 0; ${p.k} < ${p.out}.length; ${p.k}++) {\n    ${p.m}[${p.k} / (${p.out}.length / ${p.c})][${p.k} % (${p.out}.length / ${p.c})] = ${p.out}[${p.k}];\n}` },
      ],
      tests: (p) => rows([p.out, p.c], [[[1, 2, 3, 4, 5, 6], 3], [[1, 2, 3, 4, 5, 6], 2], [[1, 2, 3, 4], 4], [[1, 2, 3, 4], 1], [[9, 8, 7, 6, 5, 4, 3, 2, 1], 3], [[5], 1]], 2, true),
      hints: (p) => [`Nombre de lignes = longueur de \`${p.out}\` divisée par le nombre de colonnes \`${p.c}\`.`, `Une seule boucle sur l’indice k de \`${p.out}\` suffit : la ligne est k / ${p.c} et la colonne k % ${p.c}.`, `${p.m}[k / ${p.c}][k % ${p.c}] = ${p.out}[k];`],
    },
    {
      id: 'transposee-en-place', label: 'transposer une matrice carrée sur place', difficulty: 5, estimatedMinutes: 18, params,
      valid: (p) => new Set([p.m, p.i, p.j, 'tmp']).size === 4,
      statement: (p) => `Le tableau d’entiers à 2 dimensions \`${p.m}\`, **carré** (autant de lignes que de colonnes, au moins 1), est déjà déclaré et initialisé.\n\n**Transposez-le sur place** : sans créer de second tableau, modifiez \`${p.m}\` pour qu’à la fin sa case [i][j] contienne l’ancienne valeur de la case [j][i].\n\nExemple : {{1, 2}, {3, 4}} devient {{1, 3}, {2, 4}}.`,
      given: (p) => [{ name: p.m, type: 'int[][]', description: '' }], expect: (p) => [{ name: p.m, type: 'int[][]' }],
      reference: (p) => `for (int ${p.i} = 0; ${p.i} < ${p.m}.length; ${p.i}++) {\n    for (int ${p.j} = ${p.i} + 1; ${p.j} < ${p.m}.length; ${p.j}++) {\n        int tmp = ${p.m}[${p.i}][${p.j}];\n        ${p.m}[${p.i}][${p.j}] = ${p.m}[${p.j}][${p.i}];\n        ${p.m}[${p.j}][${p.i}] = tmp;\n    }\n}`,
      mutants: (p) => [
        { id: 'double-echange', label: 'chaque paire échangée deux fois', explanationFr: `Si j parcourt toute la ligne, chaque paire (i, j) est échangée une première fois puis annulée : ne parcours que la partie au-dessus de la diagonale (j > i).`, code: `for (int ${p.i} = 0; ${p.i} < ${p.m}.length; ${p.i}++) {\n    for (int ${p.j} = 0; ${p.j} < ${p.m}.length; ${p.j}++) {\n        int tmp = ${p.m}[${p.i}][${p.j}];\n        ${p.m}[${p.i}][${p.j}] = ${p.m}[${p.j}][${p.i}];\n        ${p.m}[${p.j}][${p.i}] = tmp;\n    }\n}` },
        { id: 'ecrase-sans-echange', label: 'une valeur écrase l’autre', explanationFr: `Recopier \`${p.m}[i][j] = ${p.m}[j][i]\` perd l’ancienne valeur de [i][j] : il faut un **échange** avec une variable temporaire.`, code: `for (int ${p.i} = 0; ${p.i} < ${p.m}.length; ${p.i}++) {\n    for (int ${p.j} = ${p.i} + 1; ${p.j} < ${p.m}.length; ${p.j}++) {\n        ${p.m}[${p.i}][${p.j}] = ${p.m}[${p.j}][${p.i}];\n    }\n}` },
        { id: 'autre-diagonale', label: 'symétrie par l’autre diagonale', explanationFr: 'La transposée échange [i][j] et [j][i] (symétrie par la diagonale principale).', code: `int n = ${p.m}.length;\nfor (int ${p.i} = 0; ${p.i} < n; ${p.i}++) {\n    for (int ${p.j} = 0; ${p.j} < n - 1 - ${p.i}; ${p.j}++) {\n        int tmp = ${p.m}[${p.i}][${p.j}];\n        ${p.m}[${p.i}][${p.j}] = ${p.m}[n - 1 - ${p.j}][n - 1 - ${p.i}];\n        ${p.m}[n - 1 - ${p.j}][n - 1 - ${p.i}] = tmp;\n    }\n}` },
      ],
      tests: (p) => rows([p.m], [[[[1, 2], [3, 4]]], [[[1, 2, 3], [4, 5, 6], [7, 8, 9]]], [[[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]], [[[0, 1], [0, 1]]], [[[5, 0, 0], [1, 5, 0], [2, 3, 5]]], [[[7]]]], 2, true),
      hints: (p) => [`La diagonale ne bouge pas ; chaque autre case doit être échangée avec sa symétrique par rapport à la diagonale.`, `Ne traite chaque paire {[i][j], [j][i]} qu’une seule fois : seulement pour j > i. Échange les deux cases avec une variable temporaire.`, `for (int ${p.i} = 0; ...) { for (int ${p.j} = ${p.i} + 1; ...) { int tmp = ${p.m}[${p.i}][${p.j}]; ${p.m}[${p.i}][${p.j}] = ${p.m}[${p.j}][${p.i}]; ${p.m}[${p.j}][${p.i}] = tmp; } }`],
    },
  ],
};
export default family;
