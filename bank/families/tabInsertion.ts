import type { FamilyDefinition, Rng } from '@/types/bank';
import { N_ARR, rows } from './kit';

interface T { t: string; r: string; x: string; k: string; i: string }
const params = (rng: Rng): T => ({ t: rng.pick(N_ARR), r: rng.pick(['res', 'r', 'nouveau', 'resultat']), x: rng.pick(['x', 'v', 'val']), k: rng.pick(['k', 'pos', 'p']), i: rng.pick(['i', 'j']) });

const family: FamilyDefinition<T> = {
  id: 'tabInsertion', title: 'Construire un nouveau tableau', notions: { primary: 'N15-tableaux-construction', secondary: ['N14-parcours-tableau'] }, kind: 'snippet',
  variants: [
    {
      id: 'ajout-fin', label: 'ajouter une valeur à la fin', difficulty: 2, estimatedMinutes: 8, params,
      valid: (p) => new Set([p.t, p.r, p.x, p.i]).size === 4,
      statement: (p) => `Le tableau d’entiers \`${p.t}\` et l’entier \`${p.x}\` sont déjà déclarés et initialisés.\n\nDéclarez un **nouveau** tableau d’entiers \`${p.r}\` contenant les éléments de \`${p.t}\` suivis de \`${p.x}\`. Le tableau \`${p.t}\` ne doit pas être modifié.\n\nExemple : {4, 8, 1} et ${p.x} = 6 → {4, 8, 1, 6}.`,
      given: (p) => [{ name: p.t, type: 'int[]', description: '' }, { name: p.x, type: 'int', description: '' }],
      expect: (p) => [{ name: p.r, type: 'int[]' }],
      reference: (p) => `int[] ${p.r} = new int[${p.t}.length + 1];\nfor (int ${p.i} = 0; ${p.i} < ${p.t}.length; ${p.i}++) {\n    ${p.r}[${p.i}] = ${p.t}[${p.i}];\n}\n${p.r}[${p.t}.length] = ${p.x};`,
      mutants: (p) => [
        { id: 'valeur-au-debut', label: 'la valeur est mise au début', explanationFr: `\`${p.x}\` doit aller en dernière case (indice ${p.t}.length), pas en case 0.`, code: `int[] ${p.r} = new int[${p.t}.length + 1];\nfor (int ${p.i} = 0; ${p.i} < ${p.t}.length; ${p.i}++) {\n    ${p.r}[${p.i} + 1] = ${p.t}[${p.i}];\n}\n${p.r}[0] = ${p.x};` },
        { id: 'oublie-dernier-element', label: 'le dernier élément n’est pas recopié', explanationFr: 'La boucle de copie doit aller jusqu’à t.length - 1 inclus.', code: `int[] ${p.r} = new int[${p.t}.length + 1];\nfor (int ${p.i} = 0; ${p.i} < ${p.t}.length - 1; ${p.i}++) {\n    ${p.r}[${p.i}] = ${p.t}[${p.i}];\n}\n${p.r}[${p.t}.length] = ${p.x};` },
        { id: 'meme-taille', label: 'tableau de même taille : la valeur écrase le dernier élément', explanationFr: 'Le nouveau tableau doit avoir UNE case de plus que l’ancien.', code: `int[] ${p.r} = new int[${p.t}.length];\nfor (int ${p.i} = 0; ${p.i} < ${p.t}.length; ${p.i}++) {\n    ${p.r}[${p.i}] = ${p.t}[${p.i}];\n}\n${p.r}[${p.t}.length - 1] = ${p.x};` },
      ],
      tests: (p) => rows([p.t, p.x], [[[4, 8, 1], 6], [[2], 9], [[5, 5, 5, 5], 0], [[1, 2, 3, 4, 5, 6], -7], [[3, -3], 3], [[10, 20], 10], [[], 1]], 2, true),
      hints: (p) => ['Un tableau a une taille fixe : il faut en créer un nouveau, plus grand d’une case.', `\`new int[${p.t}.length + 1]\`, puis recopie les anciens éléments un par un avec une boucle.`, `Après la boucle de copie, la dernière case (indice ${p.t}.length) reçoit \`${p.x}\`.`],
    },
    {
      id: 'ajout-debut', label: 'ajouter une valeur au début', difficulty: 2, estimatedMinutes: 8, params,
      valid: (p) => new Set([p.t, p.r, p.x, p.i]).size === 4,
      statement: (p) => `Le tableau d’entiers \`${p.t}\` et l’entier \`${p.x}\` sont déjà déclarés et initialisés.\n\nDéclarez un **nouveau** tableau d’entiers \`${p.r}\` commençant par \`${p.x}\`, suivi de tous les éléments de \`${p.t}\` dans le même ordre.\n\nExemple : {4, 8, 1} et ${p.x} = 6 → {6, 4, 8, 1}.`,
      given: (p) => [{ name: p.t, type: 'int[]', description: '' }, { name: p.x, type: 'int', description: '' }],
      expect: (p) => [{ name: p.r, type: 'int[]' }],
      reference: (p) => `int[] ${p.r} = new int[${p.t}.length + 1];\n${p.r}[0] = ${p.x};\nfor (int ${p.i} = 0; ${p.i} < ${p.t}.length; ${p.i}++) {\n    ${p.r}[${p.i} + 1] = ${p.t}[${p.i}];\n}`,
      mutants: (p) => [
        { id: 'pas-de-decalage', label: 'les éléments ne sont pas décalés', explanationFr: `Chaque élément de \`${p.t}\` doit être copié une case plus loin : \`${p.r}[i + 1] = ${p.t}[i]\`.`, code: `int[] ${p.r} = new int[${p.t}.length + 1];\n${p.r}[0] = ${p.x};\nfor (int ${p.i} = 1; ${p.i} < ${p.t}.length; ${p.i}++) {\n    ${p.r}[${p.i}] = ${p.t}[${p.i}];\n}` },
        { id: 'valeur-a-la-fin', label: 'la valeur est mise à la fin', explanationFr: 'La valeur doit être en case 0.', code: `int[] ${p.r} = new int[${p.t}.length + 1];\nfor (int ${p.i} = 0; ${p.i} < ${p.t}.length; ${p.i}++) {\n    ${p.r}[${p.i}] = ${p.t}[${p.i}];\n}\n${p.r}[${p.t}.length] = ${p.x};` },
        { id: 'ordre-inverse', label: 'recopie à l’envers', explanationFr: 'L’ordre des éléments doit être conservé.', code: `int[] ${p.r} = new int[${p.t}.length + 1];\n${p.r}[0] = ${p.x};\nfor (int ${p.i} = 0; ${p.i} < ${p.t}.length; ${p.i}++) {\n    ${p.r}[${p.i} + 1] = ${p.t}[${p.t}.length - 1 - ${p.i}];\n}` },
      ],
      tests: (p) => rows([p.t, p.x], [[[4, 8, 1], 6], [[2], 9], [[5, 6, 7, 8], 5], [[1, 2, 3, 4, 5, 6], -7], [[3, -3], 3], [[9, 8, 7], 1], [[], 1]], 2, true),
      hints: (p) => ['Il faut décaler tous les éléments d’une case vers la droite pour libérer la case 0.', `Nouveau tableau d’une case de plus. \`${p.r}[0] = ${p.x};\` puis la case i de \`${p.t}\` va en case i + 1 de \`${p.r}\`.`, `for (int ${p.i} = 0; ${p.i} < ${p.t}.length; ${p.i}++) { ${p.r}[${p.i} + 1] = ${p.t}[${p.i}]; }`],
    },
    {
      id: 'insertion-k', label: 'insérer une valeur à l’indice k', difficulty: 3, estimatedMinutes: 12, params,
      valid: (p) => new Set([p.t, p.r, p.x, p.k, p.i]).size === 5,
      statement: (p) => `Le tableau d’entiers \`${p.t}\`, l’entier \`${p.x}\` et l’indice \`${p.k}\` (0 ≤ \`${p.k}\` ≤ \`${p.t}.length\`) sont déjà déclarés et initialisés.\n\nDéclarez un **nouveau** tableau d’entiers \`${p.r}\` obtenu en insérant \`${p.x}\` à l’indice \`${p.k}\` : les éléments avant \`${p.k}\` restent en place, \`${p.x}\` prend la case \`${p.k}\`, les suivants sont décalés d’une case.\n\nExemple : {4, 8, 1}, ${p.x} = 6, ${p.k} = 1 → {4, 6, 8, 1}.`,
      given: (p) => [{ name: p.t, type: 'int[]', description: '' }, { name: p.x, type: 'int', description: '' }, { name: p.k, type: 'int', description: '' }],
      expect: (p) => [{ name: p.r, type: 'int[]' }],
      reference: (p) => `int[] ${p.r} = new int[${p.t}.length + 1];\nfor (int ${p.i} = 0; ${p.i} < ${p.k}; ${p.i}++) {\n    ${p.r}[${p.i}] = ${p.t}[${p.i}];\n}\n${p.r}[${p.k}] = ${p.x};\nfor (int ${p.i} = ${p.k}; ${p.i} < ${p.t}.length; ${p.i}++) {\n    ${p.r}[${p.i} + 1] = ${p.t}[${p.i}];\n}`,
      mutants: (p) => [
        { id: 'ecrase-au-lieu-de-decaler', label: 'remplace la case k au lieu d’insérer', explanationFr: 'Une insertion ne perd aucun élément : le nouveau tableau a une case de plus.', code: `int[] ${p.r} = new int[${p.t}.length + 1];\nfor (int ${p.i} = 0; ${p.i} < ${p.t}.length; ${p.i}++) {\n    ${p.r}[${p.i}] = ${p.t}[${p.i}];\n}\n${p.r}[${p.k} < ${p.t}.length ? ${p.k} : ${p.t}.length] = ${p.x};` },
        { id: 'decalage-trop-tot', label: 'décalage commencé une case trop tôt', explanationFr: `Seuls les éléments d’indice ≥ ${p.k} sont décalés ; les précédents restent à leur place.`, code: `int[] ${p.r} = new int[${p.t}.length + 1];\nfor (int ${p.i} = 0; ${p.i} < ${p.t}.length; ${p.i}++) {\n    ${p.r}[${p.i} + 1] = ${p.t}[${p.i}];\n}\n${p.r}[${p.k}] = ${p.x};` },
        { id: 'insere-apres-k', label: 'insère à l’indice k + 1', explanationFr: `La valeur doit prendre la case d’indice ${p.k} elle-même.`, code: `int[] ${p.r} = new int[${p.t}.length + 1];\nfor (int ${p.i} = 0; ${p.i} <= ${p.k} && ${p.i} < ${p.t}.length; ${p.i}++) {\n    ${p.r}[${p.i}] = ${p.t}[${p.i}];\n}\n${p.r}[${p.k} < ${p.t}.length ? ${p.k} + 1 : ${p.t}.length] = ${p.x};\nfor (int ${p.i} = ${p.k} + 1; ${p.i} < ${p.t}.length; ${p.i}++) {\n    ${p.r}[${p.i} + 1] = ${p.t}[${p.i}];\n}` },
      ],
      tests: (p) => rows([p.t, p.x, p.k], [[[4, 8, 1], 6, 1], [[5, 7, 9, 11], 0, 0], [[3, 1, 4], 9, 3], [[2, 4, 6, 8, 10], 5, 2], [[1], 7, 0], [[6, 6, 6], 6, 1], [[], 3, 0]], 2, true),
      hints: (p) => ['Trois zones dans le nouveau tableau : avant k (copie directe), la case k (la valeur), après k (copie décalée).', `Première boucle : i de 0 à ${p.k} - 1 → \`${p.r}[i] = ${p.t}[i]\`. Puis \`${p.r}[${p.k}] = ${p.x}\`.`, `Seconde boucle : i de ${p.k} à ${p.t}.length - 1 → \`${p.r}[i + 1] = ${p.t}[i]\`.`],
    },
  ],
};
export default family;
