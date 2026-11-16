import type { FamilyDefinition, Rng, ToolId } from '@/types/bank';
import { N_ARR, rows } from './kit';

interface D { a: string; b: string; n: string; t: string; cible: string; out: string; i: string; j: string; ligne: string }
const params = (rng: Rng): D => ({
  a: rng.pick(['a', 'hauteur', 'nbLignes']), b: rng.pick(['b', 'largeur', 'nbColonnes']), n: rng.pick(['n', 'taille', 'nb']), t: rng.pick(N_ARR), cible: rng.pick(['cible', 'objectif', 'somme']),
  out: rng.pick(['total', 'resultat', 'nbPaires']), i: rng.pick(['i', 'l']), j: rng.pick(['j', 'c']), ligne: rng.pick(['ligne', 'texte', 's']),
});
const AFFICHE = (): ToolId[] => ['affiche'];

const family: FamilyDefinition<D> = {
  id: 'doubleBoucle', title: 'Boucles imbriquées', notions: { primary: 'N11-boucles-imbriquees', secondary: ['N08-boucle-for', 'N10-accumulateurs-compteurs'] }, kind: 'snippet',
  variants: [
    {
      id: 'somme-produits', label: 'somme de tous les produits i × j', difficulty: 2, estimatedMinutes: 8, params,
      valid: (p) => new Set([p.a, p.b, p.out, p.i, p.j]).size === 5,
      statement: (p) => `Les entiers \`${p.a}\` et \`${p.b}\` (≥ 0) sont déjà déclarés et initialisés.\n\nDéclarez un entier \`${p.out}\` égal à la somme de tous les produits **i × j** pour i allant de 1 à \`${p.a}\` et j allant de 1 à \`${p.b}\` (toutes les combinaisons).\n\nExemple : \`${p.a}\` = 2 et \`${p.b}\` = 3 → (1×1 + 1×2 + 1×3) + (2×1 + 2×2 + 2×3) = 6 + 12 = 18.`,
      given: (p) => [{ name: p.a, type: 'int', description: '' }, { name: p.b, type: 'int', description: '' }], expect: (p) => [{ name: p.out, type: 'int' }],
      reference: (p) => `int ${p.out} = 0;\nfor (int ${p.i} = 1; ${p.i} <= ${p.a}; ${p.i}++) {\n    for (int ${p.j} = 1; ${p.j} <= ${p.b}; ${p.j}++) {\n        ${p.out} += ${p.i} * ${p.j};\n    }\n}`,
      mutants: (p) => [
        { id: 'bornes-exclues', label: 'bornes exclues', explanationFr: `i va jusqu’à \`${p.a}\` inclus et j jusqu’à \`${p.b}\` inclus : utilise \`<=\`.`, code: `int ${p.out} = 0;\nfor (int ${p.i} = 1; ${p.i} < ${p.a}; ${p.i}++) {\n    for (int ${p.j} = 1; ${p.j} < ${p.b}; ${p.j}++) {\n        ${p.out} += ${p.i} * ${p.j};\n    }\n}` },
        { id: 'somme-au-lieu-de-produit', label: 'i + j au lieu de i × j', explanationFr: 'Il faut additionner les **produits** i × j, pas les sommes i + j.', code: `int ${p.out} = 0;\nfor (int ${p.i} = 1; ${p.i} <= ${p.a}; ${p.i}++) {\n    for (int ${p.j} = 1; ${p.j} <= ${p.b}; ${p.j}++) {\n        ${p.out} += ${p.i} + ${p.j};\n    }\n}` },
        { id: 'boucle-j-liee-a-i', label: 'j ne dépasse pas i', explanationFr: `Toutes les combinaisons sont demandées : j doit aller de 1 à \`${p.b}\` quelle que soit la valeur de i.`, code: `int ${p.out} = 0;\nfor (int ${p.i} = 1; ${p.i} <= ${p.a}; ${p.i}++) {\n    for (int ${p.j} = 1; ${p.j} <= ${p.i}; ${p.j}++) {\n        ${p.out} += ${p.i} * ${p.j};\n    }\n}` },
      ],
      tests: (p) => rows([p.a, p.b], [[2, 3], [3, 3], [1, 5], [4, 2], [0, 3], [5, 4], [1, 1]], 2, true),
      hints: (p) => ['Deux boucles imbriquées : pour chaque valeur de i, la boucle sur j fait tous ses tours.', `Boucle extérieure : i de 1 à ${p.a}. Boucle intérieure : j de 1 à ${p.b}. Dans le corps : ajoute i × j à l’accumulateur.`, `int ${p.out} = 0; for (int ${p.i} = 1; ${p.i} <= ${p.a}; ${p.i}++) { for (int ${p.j} = 1; ${p.j} <= ${p.b}; ${p.j}++) { ${p.out} += ${p.i} * ${p.j}; } }`],
    },
    {
      id: 'triangle-nombres', label: 'triangle de chiffres', difficulty: 3, estimatedMinutes: 11, params, tools: AFFICHE,
      valid: (p) => new Set([p.n, p.i, p.j, p.ligne]).size === 4,
      statement: (p) => `L’entier \`${p.n}\` (entre 1 et 9) est déjà déclaré et initialisé.\n\nAvec \`affiche\`, affichez \`${p.n}\` lignes : la ligne numéro k (k = 1, 2, …) contient les chiffres de 1 à k **collés les uns aux autres**.\n\nExemple pour \`${p.n}\` = 4 :\n\n\`\`\`\n1\n12\n123\n1234\n\`\`\``,
      given: (p) => [{ name: p.n, type: 'int', description: '' }], expect: () => [],
      reference: (p) => `for (int ${p.i} = 1; ${p.i} <= ${p.n}; ${p.i}++) {\n    String ${p.ligne} = "";\n    for (int ${p.j} = 1; ${p.j} <= ${p.i}; ${p.j}++) {\n        ${p.ligne} = ${p.ligne} + ${p.j};\n    }\n    affiche(${p.ligne});\n}`,
      mutants: (p) => [
        { id: 'rectangle', label: 'toutes les lignes sont complètes', explanationFr: `La ligne k s’arrête à k : la boucle intérieure dépend de la variable de la boucle extérieure (\`${p.j} <= ${p.i}\`).`, code: `for (int ${p.i} = 1; ${p.i} <= ${p.n}; ${p.i}++) {\n    String ${p.ligne} = "";\n    for (int ${p.j} = 1; ${p.j} <= ${p.n}; ${p.j}++) {\n        ${p.ligne} = ${p.ligne} + ${p.j};\n    }\n    affiche(${p.ligne});\n}` },
        { id: 'depart-zero', label: 'chaque ligne commence par 0', explanationFr: 'Chaque ligne commence au chiffre 1.', code: `for (int ${p.i} = 1; ${p.i} <= ${p.n}; ${p.i}++) {\n    String ${p.ligne} = "";\n    for (int ${p.j} = 0; ${p.j} <= ${p.i}; ${p.j}++) {\n        ${p.ligne} = ${p.ligne} + ${p.j};\n    }\n    affiche(${p.ligne});\n}` },
        { id: 'numero-de-ligne', label: 'le numéro de ligne est répété', explanationFr: `Ce sont les chiffres de 1 à k qui s’affichent, pas k répété : ajoute le compteur de la boucle intérieure (\`${p.j}\`).`, code: `for (int ${p.i} = 1; ${p.i} <= ${p.n}; ${p.i}++) {\n    String ${p.ligne} = "";\n    for (int ${p.j} = 1; ${p.j} <= ${p.i}; ${p.j}++) {\n        ${p.ligne} = ${p.ligne} + ${p.i};\n    }\n    affiche(${p.ligne});\n}` },
        { id: 'sans-reinitialisation', label: 'la ligne n’est pas remise à vide', explanationFr: 'La chaîne de chaque ligne doit être créée (vide) **dans** la boucle extérieure, sinon elle accumule les lignes précédentes.', code: `String ${p.ligne} = "";\nfor (int ${p.i} = 1; ${p.i} <= ${p.n}; ${p.i}++) {\n    for (int ${p.j} = 1; ${p.j} <= ${p.i}; ${p.j}++) {\n        ${p.ligne} = ${p.ligne} + ${p.j};\n    }\n    affiche(${p.ligne});\n}` },
      ],
      tests: (p) => rows([p.n], [[4], [3], [1], [6], [9], [2]], 2, true),
      hints: (p) => ['Chaque ligne est une chaîne qu’on construit avec une boucle intérieure, puis qu’on affiche.', `Boucle extérieure sur la ligne ${p.i} (de 1 à ${p.n}). Boucle intérieure : de 1 jusqu’à ${p.i} pour compléter la chaîne. Affiche-la à la fin de chaque tour extérieur.`, `String ${p.ligne} = ""; est déclarée DANS la boucle extérieure ; ${p.ligne} = ${p.ligne} + ${p.j}; dans la boucle intérieure ; affiche(${p.ligne}); après.`],
    },
    {
      id: 'paires-cible', label: 'paires de cases de somme donnée', difficulty: 4, estimatedMinutes: 14, params,
      valid: (p) => new Set([p.t, p.cible, p.out, p.i, p.j]).size === 5,
      statement: (p) => `Le tableau d’entiers \`${p.t}\` (éventuellement vide) et l’entier \`${p.cible}\` sont déjà déclarés et initialisés.\n\nDéclarez un entier \`${p.out}\` égal au nombre de **paires de cases distinctes** (i, j) avec i < j telles que \`${p.t}[i] + ${p.t}[j] == ${p.cible}\`. Chaque paire n’est comptée qu’une fois.\n\nExemple : {1, 2, 3, 4, 5} et \`${p.cible}\` = 6 → les paires (1, 5) et (2, 4) conviennent : \`${p.out}\` = 2. {3, 3, 3} et 6 → 3 paires.`,
      given: (p) => [{ name: p.t, type: 'int[]', description: '' }, { name: p.cible, type: 'int', description: '' }], expect: (p) => [{ name: p.out, type: 'int' }],
      reference: (p) => `int ${p.out} = 0;\nfor (int ${p.i} = 0; ${p.i} < ${p.t}.length; ${p.i}++) {\n    for (int ${p.j} = ${p.i} + 1; ${p.j} < ${p.t}.length; ${p.j}++) {\n        if (${p.t}[${p.i}] + ${p.t}[${p.j}] == ${p.cible}) {\n            ${p.out}++;\n        }\n    }\n}`,
      mutants: (p) => [
        { id: 'meme-case-autorisee', label: 'i = j autorisé', explanationFr: 'Une case ne forme pas une paire avec elle-même : la boucle intérieure commence à i + 1.', code: `int ${p.out} = 0;\nfor (int ${p.i} = 0; ${p.i} < ${p.t}.length; ${p.i}++) {\n    for (int ${p.j} = ${p.i}; ${p.j} < ${p.t}.length; ${p.j}++) {\n        if (${p.t}[${p.i}] + ${p.t}[${p.j}] == ${p.cible}) {\n            ${p.out}++;\n        }\n    }\n}` },
        { id: 'paires-comptees-deux-fois', label: 'chaque paire comptée deux fois', explanationFr: `Avec j qui repart de 0, la paire (i, j) et la paire (j, i) sont toutes deux comptées : fais commencer j à i + 1.`, code: `int ${p.out} = 0;\nfor (int ${p.i} = 0; ${p.i} < ${p.t}.length; ${p.i}++) {\n    for (int ${p.j} = 0; ${p.j} < ${p.t}.length; ${p.j}++) {\n        if (${p.i} != ${p.j} && ${p.t}[${p.i}] + ${p.t}[${p.j}] == ${p.cible}) {\n            ${p.out}++;\n        }\n    }\n}` },
        { id: 'voisins-seulement', label: 'seules les cases voisines sont comparées', explanationFr: 'Toutes les paires comptent, pas seulement les cases voisines : il faut une boucle imbriquée.', code: `int ${p.out} = 0;\nfor (int ${p.i} = 0; ${p.i} < ${p.t}.length - 1; ${p.i}++) {\n    if (${p.t}[${p.i}] + ${p.t}[${p.i} + 1] == ${p.cible}) {\n        ${p.out}++;\n    }\n}` },
      ],
      tests: (p) => rows([p.t, p.cible], [[[1, 2, 3, 4, 5], 6], [[3, 3, 3], 6], [[1, 2], 10], [[2, 4, 6], 8], [[5], 10], [[0, 0, 0, 0], 0], [[], 0]], 2, true),
      hints: (p) => ['Il faut examiner toutes les paires de cases : une boucle imbriquée dont l’indice intérieur dépend de l’indice extérieur.', `Pour éviter de compter une paire deux fois (ou une case avec elle-même), fais partir j de i + 1.`, `for (int ${p.i} = 0; ...) { for (int ${p.j} = ${p.i} + 1; ...) { if (${p.t}[${p.i}] + ${p.t}[${p.j}] == ${p.cible}) { ${p.out}++; } } }`],
    },
    {
      id: 'pyramide', label: 'pyramide de caractères', difficulty: 4, estimatedMinutes: 15, params, tools: AFFICHE,
      valid: (p) => new Set([p.n, p.i, p.j, p.ligne]).size === 4,
      statement: (p) => `L’entier \`${p.n}\` (≥ 1) est déjà déclaré et initialisé.\n\nAvec \`affiche\`, affichez une **pyramide** de \`${p.n}\` lignes. La ligne numéro k (k = 1 à \`${p.n}\`) contient \`${p.n}\` − k points \`.\`, puis 2k − 1 étoiles \`*\`, puis \`${p.n}\` − k points \`.\`.\n\nExemple pour \`${p.n}\` = 3 :\n\n\`\`\`\n..*..\n.***.\n*****\n\`\`\``,
      given: (p) => [{ name: p.n, type: 'int', description: '' }], expect: () => [],
      reference: (p) => `for (int ${p.i} = 1; ${p.i} <= ${p.n}; ${p.i}++) {\n    String ${p.ligne} = "";\n    for (int ${p.j} = 0; ${p.j} < ${p.n} - ${p.i}; ${p.j}++) {\n        ${p.ligne} = ${p.ligne} + ".";\n    }\n    for (int ${p.j} = 0; ${p.j} < 2 * ${p.i} - 1; ${p.j}++) {\n        ${p.ligne} = ${p.ligne} + "*";\n    }\n    for (int ${p.j} = 0; ${p.j} < ${p.n} - ${p.i}; ${p.j}++) {\n        ${p.ligne} = ${p.ligne} + ".";\n    }\n    affiche(${p.ligne});\n}`,
      mutants: (p) => [
        { id: 'sans-points-droite', label: 'points de droite oubliés', explanationFr: 'Chaque ligne se termine aussi par des points : toutes les lignes ont la même largeur.', code: `for (int ${p.i} = 1; ${p.i} <= ${p.n}; ${p.i}++) {\n    String ${p.ligne} = "";\n    for (int ${p.j} = 0; ${p.j} < ${p.n} - ${p.i}; ${p.j}++) {\n        ${p.ligne} = ${p.ligne} + ".";\n    }\n    for (int ${p.j} = 0; ${p.j} < 2 * ${p.i} - 1; ${p.j}++) {\n        ${p.ligne} = ${p.ligne} + "*";\n    }\n    affiche(${p.ligne});\n}` },
        { id: 'etoiles-i', label: 'i étoiles au lieu de 2i − 1', explanationFr: 'Le nombre d’étoiles augmente de 2 à chaque ligne : 1, 3, 5, … soit 2 × k − 1.', code: `for (int ${p.i} = 1; ${p.i} <= ${p.n}; ${p.i}++) {\n    String ${p.ligne} = "";\n    for (int ${p.j} = 0; ${p.j} < ${p.n} - ${p.i}; ${p.j}++) {\n        ${p.ligne} = ${p.ligne} + ".";\n    }\n    for (int ${p.j} = 0; ${p.j} < ${p.i}; ${p.j}++) {\n        ${p.ligne} = ${p.ligne} + "*";\n    }\n    for (int ${p.j} = 0; ${p.j} < ${p.n} - ${p.i}; ${p.j}++) {\n        ${p.ligne} = ${p.ligne} + ".";\n    }\n    affiche(${p.ligne});\n}` },
        { id: 'points-constants', label: 'même nombre de points sur chaque ligne', explanationFr: `Le nombre de points de chaque côté diminue d’une ligne à l’autre : ${p.n} − k.`, code: `for (int ${p.i} = 1; ${p.i} <= ${p.n}; ${p.i}++) {\n    String ${p.ligne} = "";\n    for (int ${p.j} = 0; ${p.j} < ${p.n} - 1; ${p.j}++) {\n        ${p.ligne} = ${p.ligne} + ".";\n    }\n    for (int ${p.j} = 0; ${p.j} < 2 * ${p.i} - 1; ${p.j}++) {\n        ${p.ligne} = ${p.ligne} + "*";\n    }\n    for (int ${p.j} = 0; ${p.j} < ${p.n} - 1; ${p.j}++) {\n        ${p.ligne} = ${p.ligne} + ".";\n    }\n    affiche(${p.ligne});\n}` },
      ],
      tests: (p) => rows([p.n], [[3], [4], [1], [5], [2], [6]], 2, true),
      hints: (p) => [`Chaque ligne est construite en trois morceaux : points à gauche, étoiles, points à droite. Il faut donc trois boucles intérieures (ou deux, en répétant la première).`, `Sur la ligne k : ${p.n} − k points, 2k − 1 étoiles, ${p.n} − k points. Construis la chaîne puis \`affiche\`-la.`, `Compte les caractères : chaque ligne doit faire 2 × ${p.n} − 1 caractères.`],
    },
    {
      id: 'losange', label: 'losange de caractères', difficulty: 5, estimatedMinutes: 20, params, tools: AFFICHE,
      valid: (p) => new Set([p.n, p.i, p.j, p.ligne]).size === 4,
      statement: (p) => `L’entier \`${p.n}\` (≥ 1) est déjà déclaré et initialisé.\n\nAvec \`affiche\`, affichez un **losange** de 2 × \`${p.n}\` − 1 lignes : les \`${p.n}\` premières lignes forment une pyramide (la ligne k contient \`${p.n}\` − k points, 2k − 1 étoiles, puis \`${p.n}\` − k points), puis les \`${p.n}\` − 1 lignes suivantes redescendent (même motif en sens inverse, sans répéter la ligne du milieu).\n\nExemple pour \`${p.n}\` = 3 :\n\n\`\`\`\n..*..\n.***.\n*****\n.***.\n..*..\n\`\`\``,
      given: (p) => [{ name: p.n, type: 'int', description: '' }], expect: () => [],
      reference: (p) => `for (int ${p.i} = 1; ${p.i} <= 2 * ${p.n} - 1; ${p.i}++) {\n    int k = ${p.i};\n    if (${p.i} > ${p.n}) {\n        k = 2 * ${p.n} - ${p.i};\n    }\n    String ${p.ligne} = "";\n    for (int ${p.j} = 0; ${p.j} < ${p.n} - k; ${p.j}++) {\n        ${p.ligne} = ${p.ligne} + ".";\n    }\n    for (int ${p.j} = 0; ${p.j} < 2 * k - 1; ${p.j}++) {\n        ${p.ligne} = ${p.ligne} + "*";\n    }\n    for (int ${p.j} = 0; ${p.j} < ${p.n} - k; ${p.j}++) {\n        ${p.ligne} = ${p.ligne} + ".";\n    }\n    affiche(${p.ligne});\n}`,
      mutants: (p) => [
        { id: 'moitie-haute-seule', label: 'seule la pyramide du haut', explanationFr: `Il y a 2 × ${p.n} − 1 lignes : la partie basse redescend jusqu’à une seule étoile.`, code: `for (int ${p.i} = 1; ${p.i} <= ${p.n}; ${p.i}++) {\n    String ${p.ligne} = "";\n    for (int ${p.j} = 0; ${p.j} < ${p.n} - ${p.i}; ${p.j}++) {\n        ${p.ligne} = ${p.ligne} + ".";\n    }\n    for (int ${p.j} = 0; ${p.j} < 2 * ${p.i} - 1; ${p.j}++) {\n        ${p.ligne} = ${p.ligne} + "*";\n    }\n    for (int ${p.j} = 0; ${p.j} < ${p.n} - ${p.i}; ${p.j}++) {\n        ${p.ligne} = ${p.ligne} + ".";\n    }\n    affiche(${p.ligne});\n}` },
        { id: 'milieu-repete', label: 'la ligne du milieu est affichée deux fois', explanationFr: `La ligne la plus large n’apparaît qu’une fois : la partie basse commence à ${p.n} − 1.`, code: `for (int ${p.i} = 1; ${p.i} <= 2 * ${p.n}; ${p.i}++) {\n    int k = ${p.i};\n    if (${p.i} > ${p.n}) {\n        k = 2 * ${p.n} + 1 - ${p.i};\n    }\n    String ${p.ligne} = "";\n    for (int ${p.j} = 0; ${p.j} < ${p.n} - k; ${p.j}++) {\n        ${p.ligne} = ${p.ligne} + ".";\n    }\n    for (int ${p.j} = 0; ${p.j} < 2 * k - 1; ${p.j}++) {\n        ${p.ligne} = ${p.ligne} + "*";\n    }\n    for (int ${p.j} = 0; ${p.j} < ${p.n} - k; ${p.j}++) {\n        ${p.ligne} = ${p.ligne} + ".";\n    }\n    affiche(${p.ligne});\n}` },
        { id: 'bas-recopie', label: 'la partie basse recopie le haut', explanationFr: 'La partie basse redescend (largeur décroissante) : calcule k = 2 × n − i pour les lignes suivant le milieu.', code: `for (int ${p.i} = 1; ${p.i} <= 2 * ${p.n} - 1; ${p.i}++) {\n    int k = ${p.i};\n    if (${p.i} > ${p.n}) {\n        k = ${p.i} - ${p.n};\n    }\n    String ${p.ligne} = "";\n    for (int ${p.j} = 0; ${p.j} < ${p.n} - k; ${p.j}++) {\n        ${p.ligne} = ${p.ligne} + ".";\n    }\n    for (int ${p.j} = 0; ${p.j} < 2 * k - 1; ${p.j}++) {\n        ${p.ligne} = ${p.ligne} + "*";\n    }\n    for (int ${p.j} = 0; ${p.j} < ${p.n} - k; ${p.j}++) {\n        ${p.ligne} = ${p.ligne} + ".";\n    }\n    affiche(${p.ligne});\n}` },
      ],
      tests: (p) => rows([p.n], [[3], [4], [1], [5], [2], [6]], 2, true),
      hints: (p) => ['Une boucle sur les 2 × n − 1 lignes, avec pour chaque ligne un « k » qui monte jusqu’à n puis redescend.', `Pour la ligne i : k = i tant que i ≤ ${p.n}, sinon k = 2 × ${p.n} − i. Ensuite, construis la ligne comme pour la pyramide.`, `Vérifie avec ${p.n} = 2 : lignes « .*. », « *** », « .*. ».`],
    },
  ],
};
export default family;
