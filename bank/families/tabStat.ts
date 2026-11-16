import type { FamilyDefinition, Rng } from '@/types/bank';
import { N_ARR, rows } from './kit';

interface T { t: string; out: string; i: string; s: string }
const params = (rng: Rng): T => ({ t: rng.pick(N_ARR), out: rng.pick(['res', 'r', 'resultat']), i: rng.pick(['i', 'k', 'j']), s: rng.pick(['seuil', 'limite', 'borne']) });

const family: FamilyDefinition<T> = {
  id: 'tabStat', title: 'Statistiques sur un tableau', notions: { primary: 'N14-parcours-tableau', secondary: ['N10-accumulateurs-compteurs'] }, kind: 'snippet',
  variants: [
    {
      id: 'minimum', label: 'plus petite valeur', difficulty: 1, estimatedMinutes: 6, params,
      statement: (p) => `Le tableau d’entiers \`${p.t}\` (au moins un élément) est déjà déclaré et initialisé.\n\nDéclarez une variable entière \`${p.out}\` contenant la **plus petite valeur** du tableau.`,
      given: (p) => [{ name: p.t, type: 'int[]', description: '' }],
      expect: (p) => [{ name: p.out, type: 'int' }],
      reference: (p) => `int ${p.out} = ${p.t}[0];\nfor (int ${p.i} = 1; ${p.i} < ${p.t}.length; ${p.i}++) {\n    if (${p.t}[${p.i}] < ${p.out}) {\n        ${p.out} = ${p.t}[${p.i}];\n    }\n}`,
      mutants: (p) => [
        { id: 'initialise-a-zero', label: 'minimum initialisé à 0', explanationFr: 'Si toutes les valeurs sont positives, 0 reste le « minimum » à tort : initialise avec le premier élément.', code: `int ${p.out} = 0;\nfor (int ${p.i} = 0; ${p.i} < ${p.t}.length; ${p.i}++) {\n    if (${p.t}[${p.i}] < ${p.out}) {\n        ${p.out} = ${p.t}[${p.i}];\n    }\n}` },
        { id: 'oublie-dernier', label: 'le dernier élément est ignoré', explanationFr: `La condition \`${p.i} < ${p.t}.length - 1\` s’arrête trop tôt : le dernier indice est ${p.t}.length - 1 inclus.`, code: `int ${p.out} = ${p.t}[0];\nfor (int ${p.i} = 1; ${p.i} < ${p.t}.length - 1; ${p.i}++) {\n    if (${p.t}[${p.i}] < ${p.out}) {\n        ${p.out} = ${p.t}[${p.i}];\n    }\n}` },
        { id: 'maximum', label: 'renvoie le maximum', explanationFr: 'Le sens de la comparaison est inversé.', code: `int ${p.out} = ${p.t}[0];\nfor (int ${p.i} = 1; ${p.i} < ${p.t}.length; ${p.i}++) {\n    if (${p.t}[${p.i}] > ${p.out}) {\n        ${p.out} = ${p.t}[${p.i}];\n    }\n}` },
      ],
      tests: (p) => rows([p.t], [[[9, 4, 7, 2, 8]], [[5, 3, 6]], [[3, 8, 1, 6, 1]], [[-4, 2, -9, 0]], [[7, 7, 7]], [[10, 20, 30, 40, 50, 60, 5]], [[42]]], 2, true),
      hints: (p) => ['Garde en mémoire la plus petite valeur rencontrée jusqu’ici.', `Initialise avec \`${p.t}[0]\` (pas avec 0), puis parcours les autres cases : si une case est plus petite, elle devient le nouveau minimum.`, `for (int ${p.i} = 1; ${p.i} < ${p.t}.length; ${p.i}++) { if (${p.t}[${p.i}] < ${p.out}) { ${p.out} = ${p.t}[${p.i}]; } }`],
    },
    {
      id: 'indice-max', label: 'indice de la plus grande valeur', difficulty: 2, estimatedMinutes: 9, params: (rng) => ({ ...params(rng), out: rng.pick(['imax', 'posMax', 'indice']) }),
      statement: (p) => `Le tableau d’entiers \`${p.t}\` (au moins un élément) est déjà déclaré et initialisé.\n\nDéclarez une variable entière \`${p.out}\` contenant l’**indice** de la plus grande valeur du tableau. Si cette valeur apparaît plusieurs fois, on veut l’indice de sa **première** apparition.\n\nExemple : {3, 9, 2, 9} → 1.`,
      given: (p) => [{ name: p.t, type: 'int[]', description: '' }],
      expect: (p) => [{ name: p.out, type: 'int' }],
      reference: (p) => `int ${p.out} = 0;\nfor (int ${p.i} = 1; ${p.i} < ${p.t}.length; ${p.i}++) {\n    if (${p.t}[${p.i}] > ${p.t}[${p.out}]) {\n        ${p.out} = ${p.i};\n    }\n}`,
      mutants: (p) => [
        { id: 'derniere-occurrence', label: 'dernière apparition au lieu de la première', explanationFr: 'Avec `>=`, une valeur égale au maximum déplace l’indice : utilise `>` pour garder la première apparition.', code: `int ${p.out} = 0;\nfor (int ${p.i} = 1; ${p.i} < ${p.t}.length; ${p.i}++) {\n    if (${p.t}[${p.i}] >= ${p.t}[${p.out}]) {\n        ${p.out} = ${p.i};\n    }\n}` },
        { id: 'valeur-au-lieu-de-indice', label: 'renvoie la valeur maximale', explanationFr: 'Tu stockes la valeur du maximum, pas sa position.', code: `int ${p.out} = ${p.t}[0];\nfor (int ${p.i} = 1; ${p.i} < ${p.t}.length; ${p.i}++) {\n    if (${p.t}[${p.i}] > ${p.out}) {\n        ${p.out} = ${p.t}[${p.i}];\n    }\n}` },
        { id: 'indice-du-minimum', label: 'indice du minimum', explanationFr: 'Le sens de la comparaison est inversé.', code: `int ${p.out} = 0;\nfor (int ${p.i} = 1; ${p.i} < ${p.t}.length; ${p.i}++) {\n    if (${p.t}[${p.i}] < ${p.t}[${p.out}]) {\n        ${p.out} = ${p.i};\n    }\n}` },
      ],
      tests: (p) => rows([p.t], [[[3, 9, 2, 9]], [[1, 5, 3]], [[4, 4, 4]], [[9, 1, 2]], [[-5, -2, -8, -2]], [[1, 2, 3, 4, 10]], [[7]]], 2, true),
      hints: (p) => ['Il faut retenir la POSITION du meilleur candidat, pas sa valeur.', `Initialise \`${p.out}\` à 0. Pour chaque case i, compare \`${p.t}[${p.i}]\` à \`${p.t}[${p.out}]\` : si elle est strictement plus grande, \`${p.out}\` devient i.`, `if (${p.t}[${p.i}] > ${p.t}[${p.out}]) { ${p.out} = ${p.i}; }`],
    },
    {
      id: 'compte-seuil', label: 'valeurs strictement supérieures à un seuil', difficulty: 2, estimatedMinutes: 7, params: (rng) => ({ ...params(rng), out: rng.pick(['nb', 'compteur', 'nbSup']) }),
      statement: (p) => `Le tableau d’entiers \`${p.t}\` et l’entier \`${p.s}\` sont déjà déclarés et initialisés.\n\nDéclarez une variable entière \`${p.out}\` contenant le **nombre de cases** de \`${p.t}\` dont la valeur est **strictement supérieure** à \`${p.s}\`.`,
      given: (p) => [{ name: p.t, type: 'int[]', description: '' }, { name: p.s, type: 'int', description: '' }],
      expect: (p) => [{ name: p.out, type: 'int' }],
      reference: (p) => `int ${p.out} = 0;\nfor (int ${p.i} = 0; ${p.i} < ${p.t}.length; ${p.i}++) {\n    if (${p.t}[${p.i}] > ${p.s}) {\n        ${p.out}++;\n    }\n}`,
      mutants: (p) => [
        { id: 'superieur-ou-egal', label: '>= au lieu de >', explanationFr: 'Les valeurs égales au seuil ne doivent pas être comptées : « strictement supérieur » = `>`.', code: `int ${p.out} = 0;\nfor (int ${p.i} = 0; ${p.i} < ${p.t}.length; ${p.i}++) {\n    if (${p.t}[${p.i}] >= ${p.s}) {\n        ${p.out}++;\n    }\n}` },
        { id: 'oublie-premier', label: 'la première case est ignorée', explanationFr: 'Les indices commencent à 0 : démarre la boucle à 0.', code: `int ${p.out} = 0;\nfor (int ${p.i} = 1; ${p.i} < ${p.t}.length; ${p.i}++) {\n    if (${p.t}[${p.i}] > ${p.s}) {\n        ${p.out}++;\n    }\n}` },
        { id: 'somme-au-lieu-de-compte', label: 'somme les valeurs au lieu de les compter', explanationFr: 'Tu ajoutes la valeur de la case ; la consigne demande de compter les cases.', code: `int ${p.out} = 0;\nfor (int ${p.i} = 0; ${p.i} < ${p.t}.length; ${p.i}++) {\n    if (${p.t}[${p.i}] > ${p.s}) {\n        ${p.out} += ${p.t}[${p.i}];\n    }\n}` },
      ],
      tests: (p) => rows([p.t, p.s], [[[5, 12, 8, 20], 10], [[1, 2, 3], 5], [[10, 10, 11, 9], 10], [[7, 7, 7], 7], [[15, 3, 18, 21, 9], 9], [[-3, 0, 4], -1], [[50], 10]], 2, true),
      hints: (p) => ['C’est un compteur : une variable à 0, augmentée seulement quand la case remplit la condition.', `Parcours toutes les cases (de 0 à ${p.t}.length - 1) ; si \`${p.t}[i] > ${p.s}\`, ajoute 1 à \`${p.out}\`.`, `for (...) { if (${p.t}[${p.i}] > ${p.s}) { ${p.out}++; } }`],
    },
  ],
};
export default family;
