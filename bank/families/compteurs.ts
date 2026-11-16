import type { FamilyDefinition, Rng } from '@/types/bank';
import { N_ARR, rows } from './kit';

interface C { n: string; k: string; t: string; out: string; i: string; som: string; nb: string }
const params = (rng: Rng): C => ({ n: rng.pick(['n', 'limite', 'max']), k: rng.pick(['k', 'pas', 'diviseur']), t: rng.pick(N_ARR), out: rng.pick(['nb', 'compteur', 'total']), i: rng.pick(['i', 'j']), som: rng.pick(['somme', 's', 'cumul']), nb: rng.pick(['nbPositifs', 'cpt', 'quantite']) });

const family: FamilyDefinition<C> = {
  id: 'compteurs', title: 'Compteurs, accumulateurs et drapeaux', notions: { primary: 'N10-accumulateurs-compteurs', secondary: ['N08-boucle-for', 'N05-logique-comparaisons'] }, kind: 'snippet',
  variants: [
    {
      id: 'compter-multiples', label: 'compter les multiples de k', difficulty: 2, estimatedMinutes: 7, params,
      valid: (p) => new Set([p.n, p.k, p.out, p.i]).size === 4,
      statement: (p) => `Les entiers \`${p.n}\` (≥ 0) et \`${p.k}\` (≥ 1) sont déjà déclarés et initialisés.\n\nDéclarez un entier \`${p.out}\` égal au **nombre** d’entiers compris entre 1 et \`${p.n}\` (inclus) qui sont des multiples de \`${p.k}\`.\n\nExemple : \`${p.n}\` = 10 et \`${p.k}\` = 3 → les multiples sont 3, 6, 9, donc \`${p.out}\` = 3.`,
      given: (p) => [{ name: p.n, type: 'int', description: '' }, { name: p.k, type: 'int', description: '' }], expect: (p) => [{ name: p.out, type: 'int' }],
      reference: (p) => `int ${p.out} = 0;\nfor (int ${p.i} = 1; ${p.i} <= ${p.n}; ${p.i}++) {\n    if (${p.i} % ${p.k} == 0) {\n        ${p.out}++;\n    }\n}`,
      mutants: (p) => [
        { id: 'depart-zero', label: '0 compté comme multiple', explanationFr: `0 n’est pas dans l’intervalle demandé (de 1 à ${p.n}) : le compteur de boucle démarre à 1.`, code: `int ${p.out} = 0;\nfor (int ${p.i} = 0; ${p.i} <= ${p.n}; ${p.i}++) {\n    if (${p.i} % ${p.k} == 0) {\n        ${p.out}++;\n    }\n}` },
        { id: 'borne-exclue', label: 'la borne n est exclue', explanationFr: `\`${p.n}\` fait partie de l’intervalle : utilise \`<=\`.`, code: `int ${p.out} = 0;\nfor (int ${p.i} = 1; ${p.i} < ${p.n}; ${p.i}++) {\n    if (${p.i} % ${p.k} == 0) {\n        ${p.out}++;\n    }\n}` },
        { id: 'somme-au-lieu-de-compte', label: 'somme des multiples au lieu de leur nombre', explanationFr: 'On demande combien il y a de multiples, pas leur somme : ajoute 1 à chaque fois.', code: `int ${p.out} = 0;\nfor (int ${p.i} = 1; ${p.i} <= ${p.n}; ${p.i}++) {\n    if (${p.i} % ${p.k} == 0) {\n        ${p.out} += ${p.i};\n    }\n}` },
      ],
      tests: (p) => rows([p.n, p.k], [[10, 3], [20, 5], [7, 10], [15, 1], [30, 7], [0, 4], [1, 1]], 2, true),
      hints: (p) => ['Un compteur est une variable qui part de 0 et augmente de 1 chaque fois qu’une condition est vraie.', `Parcours les entiers de 1 à ${p.n} ; si l’entier est divisible par \`${p.k}\` (reste de la division = 0), augmente le compteur.`, `int ${p.out} = 0; for (int ${p.i} = 1; ${p.i} <= ${p.n}; ${p.i}++) { if (${p.i} % ${p.k} == 0) { ${p.out}++; } }`],
    },
    {
      id: 'moyenne-positifs', label: 'moyenne des valeurs positives', difficulty: 3, estimatedMinutes: 11, params,
      valid: (p) => new Set([p.t, p.i, 'moy', p.som, p.nb]).size === 5,
      statement: (p) => `Le tableau d’entiers \`${p.t}\` (éventuellement vide) est déjà déclaré et initialisé.\n\nDéclarez un réel \`moy\` égal à la **moyenne des valeurs strictement positives** de \`${p.t}\`. Si le tableau ne contient aucune valeur strictement positive, \`moy\` vaut \`0.0\`.\n\nExemple : {4, -2, 8, 0} → les valeurs positives sont 4 et 8, donc \`moy\` = 6.0.`,
      given: (p) => [{ name: p.t, type: 'int[]', description: '' }], expect: () => [{ name: 'moy', type: 'double' }],
      reference: (p) => `int ${p.som} = 0;\nint ${p.nb} = 0;\nfor (int ${p.i} = 0; ${p.i} < ${p.t}.length; ${p.i}++) {\n    if (${p.t}[${p.i}] > 0) {\n        ${p.som} += ${p.t}[${p.i}];\n        ${p.nb}++;\n    }\n}\ndouble moy = 0.0;\nif (${p.nb} > 0) {\n    moy = (double) ${p.som} / ${p.nb};\n}`,
      mutants: (p) => [
        { id: 'division-entiere', label: 'division entière', explanationFr: 'Entre deux entiers, `/` donne un quotient entier : convertis un des deux en `double` avant de diviser.', code: `int ${p.som} = 0;\nint ${p.nb} = 0;\nfor (int ${p.i} = 0; ${p.i} < ${p.t}.length; ${p.i}++) {\n    if (${p.t}[${p.i}] > 0) {\n        ${p.som} += ${p.t}[${p.i}];\n        ${p.nb}++;\n    }\n}\ndouble moy = 0.0;\nif (${p.nb} > 0) {\n    moy = ${p.som} / ${p.nb};\n}` },
        { id: 'compte-tout', label: 'toutes les valeurs comptées', explanationFr: 'Le compteur ne doit augmenter que pour les valeurs strictement positives.', code: `int ${p.som} = 0;\nint ${p.nb} = 0;\nfor (int ${p.i} = 0; ${p.i} < ${p.t}.length; ${p.i}++) {\n    ${p.nb}++;\n    if (${p.t}[${p.i}] > 0) {\n        ${p.som} += ${p.t}[${p.i}];\n    }\n}\ndouble moy = 0.0;\nif (${p.nb} > 0) {\n    moy = (double) ${p.som} / ${p.nb};\n}` },
        { id: 'sans-garde', label: 'division par zéro non évitée', explanationFr: 'S’il n’y a aucune valeur positive, le compteur vaut 0 : teste-le avant de diviser (résultat attendu 0.0).', code: `int ${p.som} = 0;\nint ${p.nb} = 0;\nfor (int ${p.i} = 0; ${p.i} < ${p.t}.length; ${p.i}++) {\n    if (${p.t}[${p.i}] > 0) {\n        ${p.som} += ${p.t}[${p.i}];\n        ${p.nb}++;\n    }\n}\ndouble moy = (double) ${p.som} / ${p.nb};` },
        { id: 'zero-compte', label: 'zéro considéré comme positif', explanationFr: '0 n’est pas strictement positif : utilise `> 0`.', code: `int ${p.som} = 0;\nint ${p.nb} = 0;\nfor (int ${p.i} = 0; ${p.i} < ${p.t}.length; ${p.i}++) {\n    if (${p.t}[${p.i}] >= 0) {\n        ${p.som} += ${p.t}[${p.i}];\n        ${p.nb}++;\n    }\n}\ndouble moy = 0.0;\nif (${p.nb} > 0) {\n    moy = (double) ${p.som} / ${p.nb};\n}` },
      ],
      tests: (p) => rows([p.t], [[[4, -2, 8, 0]], [[1, 2, 2]], [[-1, -5]], [[7]], [[0, 0, 3]], [[5, -5, 6, -6, 7]], [[]]], 2, true),
      hints: (p) => ['Il faut deux accumulateurs : la somme des valeurs retenues et leur nombre.', `Dans la boucle, n’agis que si \`${p.t}[i] > 0\`. Après la boucle, divise la somme par le nombre (en réel !) seulement si ce nombre n’est pas 0.`, 'moy = (double) somme / nb; — attention à la division entière et au cas nb == 0.'],
    },
    {
      id: 'doublon-consecutif', label: 'deux valeurs consécutives égales', difficulty: 3, estimatedMinutes: 10, params,
      valid: (p) => new Set([p.t, p.i, 'doublon']).size === 3,
      statement: (p) => `Le tableau d’entiers \`${p.t}\` (éventuellement vide) est déjà déclaré et initialisé.\n\nDéclarez un booléen \`doublon\` qui vaut \`true\` si et seulement si le tableau contient **deux cases voisines égales** (\`${p.t}[i] == ${p.t}[i + 1]\` pour un certain i).\n\nExemples : {1, 2, 2, 3} → \`true\` ; {7, 8, 7} → \`false\` (les deux 7 ne sont pas voisins).`,
      given: (p) => [{ name: p.t, type: 'int[]', description: '' }], expect: () => [{ name: 'doublon', type: 'boolean' }],
      reference: (p) => `boolean doublon = false;\nfor (int ${p.i} = 0; ${p.i} < ${p.t}.length - 1; ${p.i}++) {\n    if (${p.t}[${p.i}] == ${p.t}[${p.i} + 1]) {\n        doublon = true;\n    }\n}`,
      mutants: (p) => [
        { id: 'drapeau-ecrase', label: 'le drapeau est réécrit à chaque tour', explanationFr: 'Un drapeau passé à `true` ne doit plus jamais repasser à `false` : n’affecte que dans le `if`.', code: `boolean doublon = false;\nfor (int ${p.i} = 0; ${p.i} < ${p.t}.length - 1; ${p.i}++) {\n    doublon = ${p.t}[${p.i}] == ${p.t}[${p.i} + 1];\n}` },
        { id: 'derniere-paire-oubliee', label: 'dernière paire non examinée', explanationFr: `La dernière paire est (${p.t}[length - 2], ${p.t}[length - 1]) : la boucle doit aller jusqu’à \`length - 2\` inclus.`, code: `boolean doublon = false;\nfor (int ${p.i} = 0; ${p.i} < ${p.t}.length - 2; ${p.i}++) {\n    if (${p.t}[${p.i}] == ${p.t}[${p.i} + 1]) {\n        doublon = true;\n    }\n}` },
        { id: 'voisin-de-deux', label: 'cases distantes de 2 comparées', explanationFr: 'Les cases voisines sont i et i + 1 (pas i + 2).', code: `boolean doublon = false;\nfor (int ${p.i} = 0; ${p.i} < ${p.t}.length - 2; ${p.i}++) {\n    if (${p.t}[${p.i}] == ${p.t}[${p.i} + 2]) {\n        doublon = true;\n    }\n}` },
      ],
      tests: (p) => rows([p.t], [[[1, 2, 2, 3]], [[4, 5, 6]], [[1, 1, 2, 3]], [[3, 4, 5, 5]], [[7, 8, 7]], [[9]], [[2, 2]], [[]]], 2, true),
      hints: (p) => ['Un drapeau est un booléen initialisé à `false` qu’on passe à `true` dès qu’on rencontre ce qu’on cherche.', `Compare \`${p.t}[i]\` et \`${p.t}[i + 1]\` : la boucle doit s’arrêter avant le dernier indice pour que \`i + 1\` reste valide.`, `for (int i = 0; i < ${p.t}.length - 1; i++) { if (${p.t}[i] == ${p.t}[i + 1]) { doublon = true; } }`],
    },
    {
      id: 'plus-longue-serie', label: 'plus longue série de valeurs égales', difficulty: 4, estimatedMinutes: 14, params,
      valid: (p) => new Set([p.t, p.i, 'maxSerie', 'courant']).size === 4,
      statement: (p) => `Le tableau d’entiers \`${p.t}\` (éventuellement vide) est déjà déclaré et initialisé.\n\nDéclarez un entier \`maxSerie\` égal à la longueur de la **plus longue série de valeurs identiques consécutives** dans le tableau (0 si le tableau est vide).\n\nExemple : {1, 1, 2, 2, 2, 3} → \`maxSerie\` = 3 (la série de 2). {5} → 1.`,
      given: (p) => [{ name: p.t, type: 'int[]', description: '' }], expect: () => [{ name: 'maxSerie', type: 'int' }],
      reference: (p) => `int maxSerie = 0;\nint courant = 0;\nfor (int ${p.i} = 0; ${p.i} < ${p.t}.length; ${p.i}++) {\n    if (${p.i} > 0 && ${p.t}[${p.i}] == ${p.t}[${p.i} - 1]) {\n        courant++;\n    } else {\n        courant = 1;\n    }\n    if (courant > maxSerie) {\n        maxSerie = courant;\n    }\n}`,
      mutants: (p) => [
        { id: 'jamais-remis-a-un', label: 'la série courante n’est jamais remise à 1', explanationFr: 'Quand la valeur change, une nouvelle série commence : le compteur de série courante repart à 1.', code: `int maxSerie = 0;\nint courant = 0;\nfor (int ${p.i} = 0; ${p.i} < ${p.t}.length; ${p.i}++) {\n    if (${p.i} == 0) {\n        courant = 1;\n    } else if (${p.t}[${p.i}] == ${p.t}[${p.i} - 1]) {\n        courant++;\n    }\n    if (courant > maxSerie) {\n        maxSerie = courant;\n    }\n}` },
        { id: 'derniere-serie', label: 'longueur de la dernière série', explanationFr: 'Il faut garder la plus grande des longueurs rencontrées, pas seulement la dernière.', code: `int maxSerie = 0;\nint courant = 0;\nfor (int ${p.i} = 0; ${p.i} < ${p.t}.length; ${p.i}++) {\n    if (${p.i} > 0 && ${p.t}[${p.i}] == ${p.t}[${p.i} - 1]) {\n        courant++;\n    } else {\n        courant = 1;\n    }\n    maxSerie = courant;\n}` },
        { id: 'remise-a-zero', label: 'série remise à 0 au lieu de 1', explanationFr: 'Une valeur isolée forme déjà une série de longueur 1 : repars de 1, pas de 0.', code: `int maxSerie = 0;\nint courant = 0;\nfor (int ${p.i} = 0; ${p.i} < ${p.t}.length; ${p.i}++) {\n    if (${p.i} > 0 && ${p.t}[${p.i}] == ${p.t}[${p.i} - 1]) {\n        courant++;\n    } else {\n        courant = 0;\n    }\n    if (courant > maxSerie) {\n        maxSerie = courant;\n    }\n}` },
      ],
      tests: (p) => rows([p.t], [[[1, 1, 2, 2, 2, 3]], [[5, 5, 5, 5]], [[1, 2, 3]], [[4, 4, 1, 2, 2, 2, 2, 1]], [[7]], [[3, 3, 1]], [[]]], 2, true),
      hints: (p) => ['Deux accumulateurs : la longueur de la série en cours, et la meilleure longueur vue jusqu’ici.', `À chaque case : si elle est égale à la précédente, la série en cours augmente de 1 ; sinon elle repart à 1. Ensuite, mets à jour le maximum.`, `Pense au cas i == 0 (pas de case précédente) : \`if (i > 0 && ${p.t}[i] == ${p.t}[i - 1])\`.`],
    },
  ],
};
export default family;
