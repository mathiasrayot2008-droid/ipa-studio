import type { FamilyDefinition, Rng, ToolId } from '@/types/bank';
import { rows } from './kit';

interface F { a: string; b: string; c: string; d: string; n: string; m: string; g: string; out: string; x: string; y: string }
const params = (rng: Rng): F => {
  const [a, b, c, d] = rng.shuffle(['a', 'b', 'c', 'd', 'p', 'q', 'u', 'v']).slice(0, 4) as [string, string, string, string];
  return { a, b, c, d, n: rng.pick(['num', 'haut', 'n']), m: rng.pick(['den', 'bas', 'm']), g: rng.pick(['g', 'div', 'commun']), out: rng.pick(['res', 'longueur', 'dist']), x: rng.pick(['x', 'abscisse']), y: rng.pick(['y', 'ordonnee']) };
};
const PGCD = (): ToolId[] => ['pgcd'];
const DIST = (): ToolId[] => ['distance'];
const ints = (...n: string[]) => n.map((name) => ({ name, type: 'int' as const, description: '' }));

const family: FamilyDefinition<F> = {
  id: 'appelsMath', title: 'Appels de fonctions fournies (pgcd, distance)', notions: { primary: 'N03-appels-fonctions', secondary: ['N02-expressions-arith'] }, kind: 'snippet',
  variants: [
    {
      id: 'fraction-simplifiee', label: 'simplifier une fraction avec pgcd', difficulty: 1, estimatedMinutes: 6, tools: PGCD,
      params: (rng) => { const f = params(rng); return { ...f, n: rng.pick(['num', 'haut']), m: rng.pick(['den', 'bas']), a: rng.pick(['num2', 'nSimple', 'a2']), b: rng.pick(['den2', 'dSimple', 'b2']) }; },
      valid: (p) => new Set([p.n, p.m, p.a, p.b]).size === 4,
      statement: (p) => `Les entiers strictement positifs \`${p.n}\` (numérateur) et \`${p.m}\` (dénominateur) sont déjà déclarés et initialisés.\n\nLa fonction \`pgcd(a, b)\` renvoie le plus grand diviseur commun de deux entiers.\n\nDéclarez deux entiers \`${p.a}\` et \`${p.b}\` : le numérateur et le dénominateur de la fraction **simplifiée** (irréductible). Exemple : 6 / 8 → 3 / 4.`,
      given: (p) => ints(p.n, p.m), expect: (p) => [{ name: p.a, type: 'int' }, { name: p.b, type: 'int' }],
      reference: (p) => `int ${p.a} = ${p.n} / pgcd(${p.n}, ${p.m});\nint ${p.b} = ${p.m} / pgcd(${p.n}, ${p.m});`,
      mutants: (p) => [
        { id: 'numerateur-seulement', label: 'dénominateur non simplifié', explanationFr: 'Il faut diviser le numérateur ET le dénominateur par le pgcd.', code: `int ${p.a} = ${p.n} / pgcd(${p.n}, ${p.m});\nint ${p.b} = ${p.m};` },
        { id: 'pgcd-au-lieu-du-quotient', label: 'le pgcd lui-même est renvoyé', explanationFr: 'Le pgcd est le diviseur : le résultat est le **quotient** de chaque terme par le pgcd.', code: `int ${p.a} = pgcd(${p.n}, ${p.m});\nint ${p.b} = ${p.m} / pgcd(${p.n}, ${p.m});` },
        { id: 'termes-echanges', label: 'numérateur et dénominateur échangés', explanationFr: `Le nouveau numérateur vient de \`${p.n}\`, le nouveau dénominateur de \`${p.m}\`.`, code: `int ${p.a} = ${p.m} / pgcd(${p.n}, ${p.m});\nint ${p.b} = ${p.n} / pgcd(${p.n}, ${p.m});` },
      ],
      tests: (p) => rows([p.n, p.m], [[6, 8], [18, 12], [7, 3], [10, 25], [12, 12], [100, 75], [1, 1]], 2, true),
      hints: (p) => ['Une fonction fournie s’appelle avec son nom et ses arguments entre parenthèses : `pgcd(x, y)` donne un entier que tu peux réutiliser.', `Divise \`${p.n}\` et \`${p.m}\` par le même diviseur : le pgcd des deux.`, `int ${p.a} = ${p.n} / pgcd(${p.n}, ${p.m}); int ${p.b} = ${p.m} / pgcd(${p.n}, ${p.m});`],
    },
    {
      id: 'ppcm', label: 'plus petit commun multiple avec pgcd', difficulty: 2, estimatedMinutes: 7, tools: PGCD, params,
      valid: (p) => new Set([p.a, p.b, p.out]).size === 3,
      statement: (p) => `Les entiers strictement positifs \`${p.a}\` et \`${p.b}\` sont déjà déclarés et initialisés (leurs valeurs sont assez petites pour que leur produit tienne dans un \`int\`).\n\nLa fonction \`pgcd(a, b)\` renvoie le plus grand diviseur commun de deux entiers.\n\nDéclarez un entier \`${p.out}\` égal au **plus petit commun multiple** de \`${p.a}\` et \`${p.b}\`. Rappel : ppcm × pgcd = produit des deux nombres.\n\nExemple : 4 et 6 → 12.`,
      given: (p) => ints(p.a, p.b), expect: (p) => [{ name: p.out, type: 'int' }],
      reference: (p) => `int ${p.out} = ${p.a} / pgcd(${p.a}, ${p.b}) * ${p.b};`,
      mutants: (p) => [
        { id: 'produit', label: 'produit des deux nombres', explanationFr: 'Le produit n’est le ppcm que si les nombres n’ont aucun diviseur commun : divise-le par le pgcd.', code: `int ${p.out} = ${p.a} * ${p.b};` },
        { id: 'pgcd-renvoye', label: 'le pgcd au lieu du ppcm', explanationFr: 'On demande le plus petit multiple commun, pas le plus grand diviseur commun.', code: `int ${p.out} = pgcd(${p.a}, ${p.b});` },
        { id: 'somme-sur-pgcd', label: '(a + b) / pgcd', explanationFr: 'Utilise la relation ppcm × pgcd = a × b (un produit, pas une somme).', code: `int ${p.out} = (${p.a} + ${p.b}) / pgcd(${p.a}, ${p.b});` },
      ],
      tests: (p) => rows([p.a, p.b], [[4, 6], [3, 5], [12, 18], [10, 4], [1, 9], [7, 7]], 2, true),
      hints: (p) => ['Le produit de deux nombres vaut leur ppcm multiplié par leur pgcd.', `ppcm = (\`${p.a}\` × \`${p.b}\`) / pgcd(\`${p.a}\`, \`${p.b}\`).`, `int ${p.out} = ${p.a} / pgcd(${p.a}, ${p.b}) * ${p.b}; (diviser d’abord limite le risque de dépasser la capacité d’un int)`],
    },
    {
      id: 'distance-origine', label: 'distance à l’origine', difficulty: 2, estimatedMinutes: 6, tools: DIST, params,
      valid: (p) => new Set([p.x, p.y, p.out]).size === 3,
      statement: (p) => `Les entiers \`${p.x}\` et \`${p.y}\` sont déjà déclarés et initialisés : ce sont les coordonnées d’un point.\n\nLa fonction \`distance(x1, y1, x2, y2)\` renvoie (sous forme de réel) la distance entre les points (x1, y1) et (x2, y2).\n\nDéclarez un réel \`${p.out}\` égal à la distance entre ce point et l’**origine** (0, 0). Exemple : (3, 4) → 5.0.`,
      given: (p) => ints(p.x, p.y), expect: (p) => [{ name: p.out, type: 'double' }],
      reference: (p) => `double ${p.out} = distance(0, 0, ${p.x}, ${p.y});`,
      mutants: (p) => [
        { id: 'carre-de-la-distance', label: 'distance au carré', explanationFr: 'Tu as calculé x² + y² ; la distance est la racine de cette somme : la fonction `distance` la calcule directement.', code: `double ${p.out} = ${p.x} * ${p.x} + ${p.y} * ${p.y};` },
        { id: 'somme-des-coordonnees', label: 'x + y', explanationFr: 'La distance en ligne droite n’est pas la somme des coordonnées.', code: `double ${p.out} = ${p.x} + ${p.y};` },
        { id: 'un-seul-axe', label: 'distance sur l’axe x seulement', explanationFr: 'Le point peut être loin de l’origine à la fois en x et en y : passe les deux coordonnées.', code: `double ${p.out} = distance(0, 0, ${p.x}, 0);` },
      ],
      tests: (p) => rows([p.x, p.y], [[3, 4], [0, 5], [5, 12], [1, 1], [-3, -4], [0, 0]], 2, true),
      hints: (p) => ['La fonction attend quatre arguments : le premier point puis le second.', `L’origine a pour coordonnées (0, 0) ; le point est (\`${p.x}\`, \`${p.y}\`).`, `double ${p.out} = distance(0, 0, ${p.x}, ${p.y});`],
    },
    {
      id: 'perimetre-triangle', label: 'périmètre d’un triangle', difficulty: 3, estimatedMinutes: 10, tools: DIST,
      params: (rng) => ({ ...params(rng), out: rng.pick(['perimetre', 'contour', 'p']) }),
      statement: (p) => `Un triangle a pour sommets (\`x1\`, \`y1\`), (\`x2\`, \`y2\`) et (\`x3\`, \`y3\`) ; ces six entiers sont déjà déclarés et initialisés.\n\nLa fonction \`distance(x1, y1, x2, y2)\` renvoie la distance entre deux points.\n\nDéclarez un réel \`${p.out}\` égal au **périmètre** du triangle (somme de ses trois côtés).\n\nExemple : (0, 0), (3, 0), (0, 4) → 3 + 4 + 5 = 12.0.`,
      given: () => ints('x1', 'y1', 'x2', 'y2', 'x3', 'y3'), expect: (p) => [{ name: p.out, type: 'double' }],
      reference: (p) => `double ${p.out} = distance(x1, y1, x2, y2) + distance(x2, y2, x3, y3) + distance(x3, y3, x1, y1);`,
      mutants: (p) => [
        { id: 'cote-oublie', label: 'un côté oublié', explanationFr: 'Un triangle a trois côtés : [S1S2], [S2S3] et [S3S1].', code: `double ${p.out} = distance(x1, y1, x2, y2) + distance(x2, y2, x3, y3);` },
        { id: 'ordonnee-melangee', label: 'mauvaise ordonnée dans le dernier côté', explanationFr: 'Le dernier côté relie (x3, y3) à (x1, y1) : vérifie chaque argument.', code: `double ${p.out} = distance(x1, y1, x2, y2) + distance(x2, y2, x3, y3) + distance(x3, y3, x1, y2);` },
        { id: 'sommets-depuis-origine', label: 'distances mesurées depuis l’origine', explanationFr: 'Chaque côté relie deux **sommets** du triangle, pas un sommet et l’origine.', code: `double ${p.out} = distance(0, 0, x1, y1) + distance(0, 0, x2, y2) + distance(0, 0, x3, y3);` },
      ],
      tests: (p) => { void p; return [[0, 0, 3, 0, 0, 4], [0, 0, 4, 0, 4, 3], [0, 0, 2, 2, 4, 0], [1, 5, 4, 1, 7, 5], [2, 2, 2, 2, 2, 2], [5, 1, 1, 4, 5, 4]].map((r, k) => ({ vis: k < 2 ? 'public' as const : k === 4 ? 'edge' as const : 'hidden' as const, in: Object.fromEntries(['x1', 'y1', 'x2', 'y2', 'x3', 'y3'].map((n, j) => [n, r[j]!])) })); },
      hints: (p) => ['Le périmètre est la somme des trois côtés ; chaque côté est la distance entre deux sommets.', 'Appelle trois fois `distance` : S1→S2, S2→S3, S3→S1, et additionne les résultats.', `double ${p.out} = distance(x1, y1, x2, y2) + distance(x2, y2, x3, y3) + distance(x3, y3, x1, y1);`],
    },
    {
      id: 'fraction-somme', label: 'somme de deux fractions simplifiée', difficulty: 3, estimatedMinutes: 12, tools: PGCD,
      params: (rng) => { const f = params(rng); return { ...f, out: rng.pick(['num', 'resNum']), g: rng.pick(['g', 'commun']), n: rng.pick(['den', 'resDen']) }; },
      valid: (p) => new Set([p.out, p.n, p.g]).size === 3,
      statement: (p) => `Les entiers \`a\`, \`b\`, \`c\` et \`d\` (tous > 0) sont déjà déclarés et initialisés : ils représentent les fractions a/b et c/d.\n\nLa fonction \`pgcd(x, y)\` renvoie le plus grand diviseur commun de deux entiers.\n\nDéclarez deux entiers \`${p.out}\` et \`${p.n}\` : le numérateur et le dénominateur de la somme a/b + c/d, sous forme **irréductible**.\n\nExemple : 1/2 + 1/3 = 5/6 ; 1/6 + 1/3 = 1/2.`,
      given: () => ints('a', 'b', 'c', 'd'), expect: (p) => [{ name: p.out, type: 'int' }, { name: p.n, type: 'int' }],
      reference: (p) => `int top = a * d + c * b;\nint bottom = b * d;\nint ${p.g} = pgcd(top, bottom);\nint ${p.out} = top / ${p.g};\nint ${p.n} = bottom / ${p.g};`,
      mutants: (p) => [
        { id: 'non-simplifiee', label: 'fraction non simplifiée', explanationFr: 'Le résultat doit être irréductible : divise numérateur et dénominateur par leur pgcd.', code: `int ${p.out} = a * d + c * b;\nint ${p.n} = b * d;` },
        { id: 'addition-terme-a-terme', label: 'numérateurs et dénominateurs additionnés', explanationFr: 'On n’additionne pas des fractions terme à terme : mets-les au même dénominateur (b × d).', code: `int top = a + c;\nint bottom = b + d;\nint ${p.g} = pgcd(top, bottom);\nint ${p.out} = top / ${p.g};\nint ${p.n} = bottom / ${p.g};` },
        { id: 'denominateur-somme', label: 'dénominateur b + d', explanationFr: 'Le dénominateur commun est le **produit** b × d, pas la somme.', code: `int top = a * d + c * b;\nint bottom = b + d;\nint ${p.g} = pgcd(top, bottom);\nint ${p.out} = top / ${p.g};\nint ${p.n} = bottom / ${p.g};` },
      ],
      tests: (p) => { void p; return [[1, 2, 1, 3], [1, 4, 1, 4], [2, 3, 1, 3], [1, 6, 1, 3], [3, 4, 1, 2], [5, 8, 3, 8], [1, 1, 1, 1]].map((r, k) => ({ vis: k < 2 ? 'public' as const : k === 6 ? 'edge' as const : 'hidden' as const, in: Object.fromEntries(['a', 'b', 'c', 'd'].map((n, j) => [n, r[j]!])) })); },
      hints: () => ['Additionner des fractions : mets-les au même dénominateur (b × d), additionne les numérateurs, puis simplifie.', 'Numérateur : a × d + c × b ; dénominateur : b × d. Appelle ensuite `pgcd` sur ces deux entiers.', 'int top = a * d + c * b; int bottom = b * d; int g = pgcd(top, bottom); puis divise chacun par g.'],
    },
  ],
};
export default family;
