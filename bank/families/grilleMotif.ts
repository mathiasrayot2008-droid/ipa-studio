import type { FamilyDefinition, Rng, ToolId } from '@/types/bank';
import { rows } from './kit';

interface G { w: string; h: string; t: string; color: string; x: string; y: string }
const COLORS: [string, string][] = [['red', 'rouge'], ['blue', 'bleu'], ['green', 'vert'], ['purple', 'violet'], ['orange', 'orange']];
const params = (rng: Rng): G => { const [color] = rng.pick(COLORS); return { w: rng.pick(['largeur']), h: rng.pick(['hauteur']), t: 'taille', color, x: rng.pick(['x', 'i']), y: rng.pick(['y', 'j']) }; };
const fr = (c: string) => COLORS.find(([k]) => k === c)![1];
const intro = (p: G, what: string) => `Une grille de \`${p.w}\` colonnes et \`${p.h}\` lignes est affichée ; les variables entières \`${p.w}\` et \`${p.h}\` sont déjà déclarées. La case de coordonnées (0, 0) est en haut à gauche, x augmente vers la droite et y vers le bas.\n\nColorie en **${fr(p.color)}** ${what}. La fonction \`setFillColor\` choisit la couleur, la fonction \`fillCase(x, y)\` colorie une case.`;
const TOOLS = (): ToolId[] => ['setFillColor', 'fillCase'];
const dim = (p: G) => [{ name: p.w, type: 'int' as const, description: 'nombre de colonnes' }, { name: p.h, type: 'int' as const, description: 'nombre de lignes' }];

const family: FamilyDefinition<G> = {
  id: 'grilleMotif', title: 'Motifs sur une grille', notions: { primary: 'N12-grille-coordonnees', secondary: ['N11-boucles-imbriquees', 'N05-logique-comparaisons'] }, kind: 'grid',
  variants: [
    {
      id: 'bordure', label: 'le cadre extérieur', difficulty: 3, estimatedMinutes: 11, params,
      statement: (p) => intro(p, 'toutes les cases du **bord** de la grille (première et dernière lignes, première et dernière colonnes) ; l’intérieur reste vide'),
      given: dim, expect: () => [], tools: TOOLS,
      reference: (p) => `setFillColor("${p.color}");\nfor (int ${p.y} = 0; ${p.y} < ${p.h}; ${p.y}++) {\n    for (int ${p.x} = 0; ${p.x} < ${p.w}; ${p.x}++) {\n        if (${p.x} == 0 || ${p.y} == 0 || ${p.x} == ${p.w} - 1 || ${p.y} == ${p.h} - 1) {\n            fillCase(${p.x}, ${p.y});\n        }\n    }\n}`,
      mutants: (p) => [
        { id: 'sans-bord-droit', label: 'bord droit oublié', explanationFr: `La dernière colonne a pour indice ${p.w} - 1 : pense à la colorier aussi.`, code: `setFillColor("${p.color}");\nfor (int ${p.y} = 0; ${p.y} < ${p.h}; ${p.y}++) {\n    for (int ${p.x} = 0; ${p.x} < ${p.w}; ${p.x}++) {\n        if (${p.x} == 0 || ${p.y} == 0 || ${p.y} == ${p.h} - 1) {\n            fillCase(${p.x}, ${p.y});\n        }\n    }\n}` },
        { id: 'sans-bord-bas', label: 'bord du bas oublié', explanationFr: `La dernière ligne a pour indice ${p.h} - 1 : pense à la colorier aussi.`, code: `setFillColor("${p.color}");\nfor (int ${p.y} = 0; ${p.y} < ${p.h}; ${p.y}++) {\n    for (int ${p.x} = 0; ${p.x} < ${p.w}; ${p.x}++) {\n        if (${p.x} == 0 || ${p.y} == 0 || ${p.x} == ${p.w} - 1) {\n            fillCase(${p.x}, ${p.y});\n        }\n    }\n}` },
        { id: 'et-au-lieu-de-ou', label: '&& à la place de ||', explanationFr: 'Une case du bord est sur la première OU la dernière ligne OU colonne : combine avec || (ou).', code: `setFillColor("${p.color}");\nfor (int ${p.y} = 0; ${p.y} < ${p.h}; ${p.y}++) {\n    for (int ${p.x} = 0; ${p.x} < ${p.w}; ${p.x}++) {\n        if (${p.x} == 0 && ${p.y} == 0) {\n            fillCase(${p.x}, ${p.y});\n        }\n    }\n}` },
        { id: 'tout-colorie', label: 'toute la grille coloriée', explanationFr: 'Seules les cases du bord doivent être coloriées : ajoute la condition.', code: `setFillColor("${p.color}");\nfor (int ${p.y} = 0; ${p.y} < ${p.h}; ${p.y}++) {\n    for (int ${p.x} = 0; ${p.x} < ${p.w}; ${p.x}++) {\n        fillCase(${p.x}, ${p.y});\n    }\n}` },
      ],
      tests: (p) => rows([p.w, p.h], [[6, 5], [4, 4], [8, 3], [3, 7], [5, 5], [1, 1]], 2, true),
      hints: (p) => ['Une case est sur le bord si elle est dans la première ou la dernière ligne, ou dans la première ou la dernière colonne.', `Deux boucles imbriquées (y sur les lignes, x sur les colonnes). Teste : x == 0, y == 0, x == ${p.w} - 1, y == ${p.h} - 1.`, `setFillColor("${p.color}"); puis dans la double boucle : if (x == 0 || y == 0 || x == ${p.w} - 1 || y == ${p.h} - 1) { fillCase(x, y); }`],
    },
    {
      id: 'damier', label: 'un damier', difficulty: 3, estimatedMinutes: 10, params,
      statement: (p) => intro(p, 'une case sur deux, en damier : la case (0, 0) est coloriée et deux cases voisines (à gauche, droite, haut ou bas) ne sont jamais toutes deux coloriées'),
      given: dim, expect: () => [], tools: TOOLS,
      reference: (p) => `setFillColor("${p.color}");\nfor (int ${p.y} = 0; ${p.y} < ${p.h}; ${p.y}++) {\n    for (int ${p.x} = 0; ${p.x} < ${p.w}; ${p.x}++) {\n        if ((${p.x} + ${p.y}) % 2 == 0) {\n            fillCase(${p.x}, ${p.y});\n        }\n    }\n}`,
      mutants: (p) => [
        { id: 'colonnes-alternees', label: 'une colonne sur deux', explanationFr: 'Dans un damier la parité dépend de x ET de y : (x + y) % 2.', code: `setFillColor("${p.color}");\nfor (int ${p.y} = 0; ${p.y} < ${p.h}; ${p.y}++) {\n    for (int ${p.x} = 0; ${p.x} < ${p.w}; ${p.x}++) {\n        if (${p.x} % 2 == 0) {\n            fillCase(${p.x}, ${p.y});\n        }\n    }\n}` },
        { id: 'damier-inverse', label: 'damier décalé', explanationFr: 'La case (0, 0) doit être coloriée : teste (x + y) % 2 == 0.', code: `setFillColor("${p.color}");\nfor (int ${p.y} = 0; ${p.y} < ${p.h}; ${p.y}++) {\n    for (int ${p.x} = 0; ${p.x} < ${p.w}; ${p.x}++) {\n        if ((${p.x} + ${p.y}) % 2 == 1) {\n            fillCase(${p.x}, ${p.y});\n        }\n    }\n}` },
        { id: 'produit', label: '(x × y) pair', explanationFr: 'Un produit est pair dès qu’un des facteurs l’est : utilise la somme x + y.', code: `setFillColor("${p.color}");\nfor (int ${p.y} = 0; ${p.y} < ${p.h}; ${p.y}++) {\n    for (int ${p.x} = 0; ${p.x} < ${p.w}; ${p.x}++) {\n        if ((${p.x} * ${p.y}) % 2 == 0) {\n            fillCase(${p.x}, ${p.y});\n        }\n    }\n}` },
      ],
      tests: (p) => rows([p.w, p.h], [[6, 5], [4, 4], [7, 3], [3, 8], [5, 5], [1, 1]], 2, true),
      hints: () => ['Observe les coordonnées des cases coloriées : la somme x + y est toujours paire.', 'Parcours toutes les cases avec deux boucles et ne colorie que celles pour lesquelles (x + y) % 2 == 0.', 'if ((x + y) % 2 == 0) { fillCase(x, y); } dans la double boucle, après setFillColor.'],
    },
    {
      id: 'diagonales', label: 'les deux diagonales', difficulty: 4, estimatedMinutes: 14,
      params: (rng) => ({ ...params(rng), w: 'taille', h: 'taille' }),
      statement: (p) => `Une grille **carrée** de \`${p.t}\` colonnes et \`${p.t}\` lignes est affichée ; la variable entière \`${p.t}\` est déjà déclarée. La case de coordonnées (0, 0) est en haut à gauche, x augmente vers la droite et y vers le bas.\n\nColorie en **${fr(p.color)}** les cases des **deux diagonales** (de (0, 0) à (${p.t} - 1, ${p.t} - 1) et de (${p.t} - 1, 0) à (0, ${p.t} - 1)). La fonction \`setFillColor\` choisit la couleur, la fonction \`fillCase(x, y)\` colorie une case.`,
      given: (p) => [{ name: p.t, type: 'int', description: 'côté de la grille' }], expect: () => [], tools: TOOLS,
      reference: (p) => `setFillColor("${p.color}");\nfor (int ${p.y} = 0; ${p.y} < ${p.t}; ${p.y}++) {\n    for (int ${p.x} = 0; ${p.x} < ${p.t}; ${p.x}++) {\n        if (${p.x} == ${p.y} || ${p.x} + ${p.y} == ${p.t} - 1) {\n            fillCase(${p.x}, ${p.y});\n        }\n    }\n}`,
      mutants: (p) => [
        { id: 'une-diagonale', label: 'seulement la diagonale principale', explanationFr: `L’autre diagonale vérifie x + y == ${p.t} - 1.`, code: `setFillColor("${p.color}");\nfor (int ${p.y} = 0; ${p.y} < ${p.t}; ${p.y}++) {\n    for (int ${p.x} = 0; ${p.x} < ${p.t}; ${p.x}++) {\n        if (${p.x} == ${p.y}) {\n            fillCase(${p.x}, ${p.y});\n        }\n    }\n}` },
        { id: 'anti-diagonale-decalee', label: 'x + y == taille', explanationFr: `La somme x + y vaut ${p.t} - 1 sur l’anti-diagonale (les indices vont de 0 à ${p.t} - 1).`, code: `setFillColor("${p.color}");\nfor (int ${p.y} = 0; ${p.y} < ${p.t}; ${p.y}++) {\n    for (int ${p.x} = 0; ${p.x} < ${p.t}; ${p.x}++) {\n        if (${p.x} == ${p.y} || ${p.x} + ${p.y} == ${p.t}) {\n            fillCase(${p.x}, ${p.y});\n        }\n    }\n}` },
        { id: 'et-au-lieu-de-ou', label: '&& à la place de ||', explanationFr: 'Une case est sur une diagonale OU sur l’autre : relie avec || (ou).', code: `setFillColor("${p.color}");\nfor (int ${p.y} = 0; ${p.y} < ${p.t}; ${p.y}++) {\n    for (int ${p.x} = 0; ${p.x} < ${p.t}; ${p.x}++) {\n        if (${p.x} == ${p.y} && ${p.x} + ${p.y} == ${p.t} - 1) {\n            fillCase(${p.x}, ${p.y});\n        }\n    }\n}` },
      ],
      tests: (p) => rows([p.t], [[5], [4], [6], [7], [3], [1]], 2, true),
      hints: (p) => ['Sur la diagonale principale, x et y sont égaux. Sur l’autre, x + y a une valeur constante : laquelle ?', `Dans un carré de côté ${p.t}, les indices vont de 0 à ${p.t} - 1 ; l’autre diagonale vérifie x + y == ${p.t} - 1.`, `if (x == y || x + y == ${p.t} - 1) { fillCase(x, y); } dans la double boucle.`],
    },
  ],
};
export default family;
