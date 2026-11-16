import type { FamilyDefinition, Rng, ToolId } from '@/types/bank';
import { rows } from './kit';

interface D { dx: string; dy: string; x: string; y: string; r: string; t: string; c1: string; c2: string }
const COLORS: [string, string][] = [['red', 'rouge'], ['blue', 'bleu'], ['green', 'vert'], ['orange', 'orange'], ['purple', 'violet']];
const params = (rng: Rng): D => {
  const [c1, c2] = rng.shuffle([...COLORS]).slice(0, 2).map(([k]) => k) as [string, string];
  return { dx: rng.pick(['dx', 'decalX', 'versDroite']), dy: rng.pick(['dy', 'decalY', 'versBas']), x: rng.pick(['x', 'cx', 'gauche']), y: rng.pick(['y', 'cy', 'haut']), r: rng.pick(['r', 'rayon']), t: rng.pick(['t', 'taille', 'unite']), c1, c2 };
};
const fr = (c: string) => COLORS.find(([k]) => k === c)![1];
const TOOLS = (): ToolId[] => ['setFillColor', 'rectangle', 'isoTriangle', 'circle', 'line'];
const ints = (...n: string[]) => n.map((name) => ({ name, type: 'int' as const, description: '' }));

const family: FamilyDefinition<D> = {
  id: 'dessinScene', title: 'Dessiner avec des appels de fonctions', notions: { primary: 'N03-appels-fonctions', secondary: ['N02-expressions-arith'] }, kind: 'drawing',
  variants: [
    {
      id: 'maison-decalee', label: 'une maison décalée', difficulty: 2, estimatedMinutes: 10, tools: TOOLS, params,
      valid: (p) => p.dx !== p.dy && p.c1 !== p.c2,
      statement: (p) => `Une toile de 300 × 300 pixels est à votre disposition (origine en haut à gauche, y croît vers le **bas**). Les entiers \`${p.dx}\` et \`${p.dy}\` (entre 0 et 80) sont déjà déclarés et initialisés.\n\nDessinez une maison **décalée de \`${p.dx}\` pixels vers la droite et de \`${p.dy}\` pixels vers le bas** par rapport à sa position de référence :\n\n- le mur : un rectangle ${fr(p.c1)} de 120 de large et 90 de haut, dont le coin supérieur gauche est en (50, 120) à la position de référence ;\n- le toit : un triangle ${fr(p.c2)}, de base horizontale à la hauteur y = 120 allant de x = 40 à x = 180, et dont la pointe est 60 pixels **au-dessus** de la base (à la position de référence).\n\nDessinez d’abord le mur, puis le toit.`,
      given: (p) => ints(p.dx, p.dy), expect: () => [],
      reference: (p) => `setFillColor("${p.c1}");\nrectangle(50 + ${p.dx}, 120 + ${p.dy}, 120, 90);\nsetFillColor("${p.c2}");\nisoTriangle(40 + ${p.dx}, 120 + ${p.dy}, 140, -60);`,
      mutants: (p) => [
        { id: 'toit-non-decale', label: 'le toit reste à sa place', explanationFr: 'Tous les éléments de la maison doivent être décalés de la même façon, toit compris.', code: `setFillColor("${p.c1}");\nrectangle(50 + ${p.dx}, 120 + ${p.dy}, 120, 90);\nsetFillColor("${p.c2}");\nisoTriangle(40, 120, 140, -60);` },
        { id: 'decalage-vertical-oublie', label: 'décalage vertical oublié', explanationFr: `Le décalage vertical \`${p.dy}\` s’ajoute à toutes les ordonnées (y).`, code: `setFillColor("${p.c1}");\nrectangle(50 + ${p.dx}, 120, 120, 90);\nsetFillColor("${p.c2}");\nisoTriangle(40 + ${p.dx}, 120, 140, -60);` },
        { id: 'axes-inverses', label: 'dx et dy échangés', explanationFr: `\`${p.dx}\` décale horizontalement (x) et \`${p.dy}\` verticalement (y) : l’ordre des arguments est (x, y, largeur, hauteur).`, code: `setFillColor("${p.c1}");\nrectangle(50 + ${p.dy}, 120 + ${p.dx}, 120, 90);\nsetFillColor("${p.c2}");\nisoTriangle(40 + ${p.dy}, 120 + ${p.dx}, 140, -60);` },
        { id: 'toit-vers-le-bas', label: 'toit pointe vers le bas', explanationFr: 'Une hauteur négative oriente la pointe vers le haut : -60 et non 60.', code: `setFillColor("${p.c1}");\nrectangle(50 + ${p.dx}, 120 + ${p.dy}, 120, 90);\nsetFillColor("${p.c2}");\nisoTriangle(40 + ${p.dx}, 120 + ${p.dy}, 140, 60);` },
      ],
      tests: (p) => rows([p.dx, p.dy], [[0, 0], [20, 30], [60, 10], [10, 60], [80, 80], [40, 0]], 2, true),
      hints: (p) => ['Un décalage s’ajoute aux coordonnées de chaque forme : x + dx pour l’horizontal, y + dy pour le vertical. Les dimensions ne changent pas.', `Mur : \`rectangle(50 + ${p.dx}, 120 + ${p.dy}, 120, 90)\`. Le toit utilise aussi des coordonnées décalées.`, `Pour que la pointe soit au-dessus de la base, la hauteur passée à \`isoTriangle\` est négative : isoTriangle(40 + ${p.dx}, 120 + ${p.dy}, 140, -60).`],
    },
    {
      id: 'drapeau', label: 'un drapeau à trois bandes', difficulty: 2, estimatedMinutes: 9, tools: TOOLS,
      params: (rng) => { const q = params(rng); const [c3] = rng.shuffle(COLORS.filter(([k]) => k !== q.c1 && k !== q.c2)).map(([k]) => k); return { ...q, c1: q.c1, c2: q.c2, r: c3 ?? 'green' }; },
      valid: (p) => new Set([p.x, p.y, p.t]).size === 3 && new Set([p.c1, p.c2, p.r]).size === 3,
      statement: (p) => `Les entiers \`${p.x}\`, \`${p.y}\` et \`${p.t}\` (> 0) sont déjà déclarés et initialisés. La toile fait 300 × 300 pixels (y croît vers le bas).\n\nDessinez un **drapeau** à trois bandes verticales identiques, dont le coin supérieur gauche est en (\`${p.x}\`, \`${p.y}\`) : chaque bande mesure \`${p.t}\` de large et 2 × \`${p.t}\` de haut. De gauche à droite, les bandes sont ${fr(p.c1)}, ${fr(p.c2)} puis ${fr(p.r)}.`,
      given: (p) => ints(p.x, p.y, p.t), expect: () => [],
      reference: (p) => `setFillColor("${p.c1}");\nrectangle(${p.x}, ${p.y}, ${p.t}, 2 * ${p.t});\nsetFillColor("${p.c2}");\nrectangle(${p.x} + ${p.t}, ${p.y}, ${p.t}, 2 * ${p.t});\nsetFillColor("${p.r}");\nrectangle(${p.x} + 2 * ${p.t}, ${p.y}, ${p.t}, 2 * ${p.t});`,
      mutants: (p) => [
        { id: 'bandes-superposees', label: 'toutes les bandes au même endroit', explanationFr: `Chaque bande est décalée de \`${p.t}\` vers la droite par rapport à la précédente.`, code: `setFillColor("${p.c1}");\nrectangle(${p.x}, ${p.y}, ${p.t}, 2 * ${p.t});\nsetFillColor("${p.c2}");\nrectangle(${p.x}, ${p.y}, ${p.t}, 2 * ${p.t});\nsetFillColor("${p.r}");\nrectangle(${p.x}, ${p.y}, ${p.t}, 2 * ${p.t});` },
        { id: 'hauteur-egale-largeur', label: 'bandes carrées', explanationFr: `La hauteur d’une bande est 2 × \`${p.t}\`, pas \`${p.t}\`.`, code: `setFillColor("${p.c1}");\nrectangle(${p.x}, ${p.y}, ${p.t}, ${p.t});\nsetFillColor("${p.c2}");\nrectangle(${p.x} + ${p.t}, ${p.y}, ${p.t}, ${p.t});\nsetFillColor("${p.r}");\nrectangle(${p.x} + 2 * ${p.t}, ${p.y}, ${p.t}, ${p.t});` },
        { id: 'couleurs-inversees', label: 'ordre des couleurs inversé', explanationFr: `Relis l’ordre demandé : ${fr(p.c1)}, ${fr(p.c2)} puis ${fr(p.r)} de gauche à droite.`, code: `setFillColor("${p.r}");\nrectangle(${p.x}, ${p.y}, ${p.t}, 2 * ${p.t});\nsetFillColor("${p.c2}");\nrectangle(${p.x} + ${p.t}, ${p.y}, ${p.t}, 2 * ${p.t});\nsetFillColor("${p.c1}");\nrectangle(${p.x} + 2 * ${p.t}, ${p.y}, ${p.t}, 2 * ${p.t});` },
        { id: 'troisieme-bande-oubliee', label: 'troisième bande oubliée', explanationFr: 'Le drapeau a trois bandes.', code: `setFillColor("${p.c1}");\nrectangle(${p.x}, ${p.y}, ${p.t}, 2 * ${p.t});\nsetFillColor("${p.c2}");\nrectangle(${p.x} + ${p.t}, ${p.y}, ${p.t}, 2 * ${p.t});` },
      ],
      tests: (p) => rows([p.x, p.y, p.t], [[20, 30, 40], [100, 50, 30], [10, 10, 25], [150, 60, 20], [60, 100, 50], [200, 150, 30]], 2, true),
      hints: (p) => ['Un drapeau, ce sont trois rectangles côte à côte : seule la coordonnée x change d’une bande à l’autre.', `La deuxième bande commence à \`${p.x} + ${p.t}\`, la troisième à \`${p.x} + 2 * ${p.t}\`. N’oublie pas de changer la couleur avant chaque rectangle.`, `rectangle(${p.x}, ${p.y}, ${p.t}, 2 * ${p.t}); puis les deux autres avec un x décalé.`],
    },
    {
      id: 'bonhomme', label: 'un bonhomme', difficulty: 3, estimatedMinutes: 13, tools: TOOLS, params,
      valid: (p) => new Set([p.x, p.y, p.r]).size === 3 && p.c1 !== p.c2,
      statement: (p) => `Les entiers \`${p.x}\`, \`${p.y}\` et \`${p.r}\` (pair, > 0) sont déjà déclarés et initialisés. La toile fait 300 × 300 pixels (y croît vers le bas).\n\nDessinez un bonhomme :\n\n- la **tête** : un cercle ${fr(p.c1)} de centre (\`${p.x}\`, \`${p.y}\`) et de rayon \`${p.r}\` ;\n- le **corps** : un rectangle ${fr(p.c2)} dont le coin supérieur gauche est en (\`${p.x}\` − \`${p.r}\`, \`${p.y}\` + \`${p.r}\`), de largeur 2 × \`${p.r}\` et de hauteur 3 × \`${p.r}\` ;\n- les **bras** : un segment ${fr(p.c1)} horizontal de (\`${p.x}\` − 2 × \`${p.r}\`, \`${p.y}\` + 2 × \`${p.r}\`) à (\`${p.x}\` + 2 × \`${p.r}\`, \`${p.y}\` + 2 × \`${p.r}\`).\n\nDessinez dans l’ordre : tête, corps, bras (les bras passent donc au-dessus du corps).`,
      given: (p) => ints(p.x, p.y, p.r), expect: () => [],
      reference: (p) => `setFillColor("${p.c1}");\ncircle(${p.x}, ${p.y}, ${p.r});\nsetFillColor("${p.c2}");\nrectangle(${p.x} - ${p.r}, ${p.y} + ${p.r}, 2 * ${p.r}, 3 * ${p.r});\nsetFillColor("${p.c1}");\nline(${p.x} - 2 * ${p.r}, ${p.y} + 2 * ${p.r}, ${p.x} + 2 * ${p.r}, ${p.y} + 2 * ${p.r});`,
      mutants: (p) => [
        { id: 'tete-trop-petite', label: 'rayon de la tête divisé par 2', explanationFr: `Le rayon de la tête est \`${p.r}\`.`, code: `setFillColor("${p.c1}");\ncircle(${p.x}, ${p.y}, ${p.r} / 2);\nsetFillColor("${p.c2}");\nrectangle(${p.x} - ${p.r}, ${p.y} + ${p.r}, 2 * ${p.r}, 3 * ${p.r});\nsetFillColor("${p.c1}");\nline(${p.x} - 2 * ${p.r}, ${p.y} + 2 * ${p.r}, ${p.x} + 2 * ${p.r}, ${p.y} + 2 * ${p.r});` },
        { id: 'corps-decale', label: 'corps non centré sous la tête', explanationFr: `Le coin supérieur gauche du corps est à x = \`${p.x}\` − \`${p.r}\` : le corps est centré sous la tête.`, code: `setFillColor("${p.c1}");\ncircle(${p.x}, ${p.y}, ${p.r});\nsetFillColor("${p.c2}");\nrectangle(${p.x}, ${p.y} + ${p.r}, 2 * ${p.r}, 3 * ${p.r});\nsetFillColor("${p.c1}");\nline(${p.x} - 2 * ${p.r}, ${p.y} + 2 * ${p.r}, ${p.x} + 2 * ${p.r}, ${p.y} + 2 * ${p.r});` },
        { id: 'bras-oublies', label: 'bras oubliés', explanationFr: 'Il manque les bras : un segment horizontal de part et d’autre du corps.', code: `setFillColor("${p.c1}");\ncircle(${p.x}, ${p.y}, ${p.r});\nsetFillColor("${p.c2}");\nrectangle(${p.x} - ${p.r}, ${p.y} + ${p.r}, 2 * ${p.r}, 3 * ${p.r});` },
        { id: 'bras-sous-le-corps', label: 'bras dessinés avant le corps', explanationFr: 'L’ordre des dessins compte : ce qui est dessiné en dernier recouvre ce qui est dessiné avant. Dessine les bras après le corps.', code: `setFillColor("${p.c1}");\ncircle(${p.x}, ${p.y}, ${p.r});\nline(${p.x} - 2 * ${p.r}, ${p.y} + 2 * ${p.r}, ${p.x} + 2 * ${p.r}, ${p.y} + 2 * ${p.r});\nsetFillColor("${p.c2}");\nrectangle(${p.x} - ${p.r}, ${p.y} + ${p.r}, 2 * ${p.r}, 3 * ${p.r});` },
      ],
      tests: (p) => rows([p.x, p.y, p.r], [[150, 60, 20], [100, 80, 30], [200, 50, 10], [150, 100, 40], [120, 40, 20], [50, 40, 10]], 2, true),
      hints: () => ['Trois formes dans l’ordre : un cercle (centre, rayon), un rectangle (coin supérieur gauche, largeur, hauteur), un segment (deux extrémités).', `Le corps commence juste sous la tête : x − r pour être centré, y + r pour démarrer sous le cercle.`, `Ce qui est dessiné en dernier est au-dessus : les bras (\`line\`) viennent après le corps.`],
    },
  ],
};
export default family;
