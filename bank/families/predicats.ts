import type { FamilyDefinition, Rng } from '@/types/bank';
import { rows } from './kit';

interface Q { x: string; a: string; b: string; c: string; out: string; ch: string; out2: string }
const params = (rng: Rng): Q => {
  const [a, b, c] = rng.shuffle(['a', 'b', 'c', 'u', 'v', 'w']) as [string, string, string];
  return { x: rng.pick(['x', 'n', 'valeur']), a, b, c, out: rng.pick(['ok', 'resultat', 'reponse']), ch: rng.pick(['c', 'car', 'lettre']), out2: rng.pick(['isocele', 'deuxEgaux', 'iso']) };
};
const bool = (name: string) => [{ name, type: 'boolean' as const }];

const family: FamilyDefinition<Q> = {
  id: 'predicats', title: 'Conditions logiques (&&, ||, !)', notions: { primary: 'N05-logique-comparaisons', secondary: ['N04-if-else'] }, kind: 'snippet',
  variants: [
    {
      id: 'dans-intervalle', label: 'appartenance à un intervalle', difficulty: 2, estimatedMinutes: 7, params,
      valid: (p) => new Set([p.x, p.a, p.b, p.out]).size === 4,
      statement: (p) => `Les entiers \`${p.x}\`, \`${p.a}\` et \`${p.b}\` (avec \`${p.a}\` ≤ \`${p.b}\`) sont déjà déclarés et initialisés.\n\nDéclarez un booléen \`${p.out}\` qui vaut \`true\` si et seulement si \`${p.x}\` appartient à l’intervalle **fermé** [\`${p.a}\`, \`${p.b}\`] (bornes comprises).`,
      given: (p) => ['x', 'a', 'b'].map((k) => ({ name: p[k as 'x' | 'a' | 'b'], type: 'int' as const, description: '' })), expect: (p) => bool(p.out),
      reference: (p) => `boolean ${p.out} = ${p.a} <= ${p.x} && ${p.x} <= ${p.b};`,
      mutants: (p) => [
        { id: 'bornes-exclues', label: 'bornes strictes', explanationFr: 'L’intervalle est fermé : les bornes elles-mêmes appartiennent à l’intervalle, utilise `<=`.', code: `boolean ${p.out} = ${p.a} < ${p.x} && ${p.x} < ${p.b};` },
        { id: 'ou-au-lieu-de-et', label: '|| à la place de &&', explanationFr: 'Il faut que les DEUX conditions soient vraies en même temps : utilise `&&`.', code: `boolean ${p.out} = ${p.a} <= ${p.x} || ${p.x} <= ${p.b};` },
        { id: 'borne-haute-seule', label: 'seule la borne haute est testée', explanationFr: 'Teste aussi la borne basse.', code: `boolean ${p.out} = ${p.x} <= ${p.b};` },
      ],
      tests: (p) => rows([p.x, p.a, p.b], [[5, 1, 10], [0, 1, 10], [1, 1, 10], [10, 1, 10], [11, 1, 10], [-3, -5, -1], [4, 4, 4]], 2, true),
      hints: (p) => ['Appartenir à [a, b], c’est être à la fois au-dessus de a et en dessous de b.', `Deux comparaisons reliées par \`&&\` : \`${p.a} <= ${p.x}\` et \`${p.x} <= ${p.b}\`.`, `boolean ${p.out} = ${p.a} <= ${p.x} && ${p.x} <= ${p.b};`],
    },
    {
      id: 'lettre', label: 'caractère alphabétique', difficulty: 2, estimatedMinutes: 8, params,
      valid: (p) => p.ch !== p.out,
      statement: (p) => `Le caractère \`${p.ch}\` est déjà déclaré et initialisé (c’est un caractère ASCII quelconque).\n\nDéclarez un booléen \`${p.out}\` qui vaut \`true\` si et seulement si \`${p.ch}\` est une **lettre** de l’alphabet non accentuée, majuscule **ou** minuscule ('a' à 'z' ou 'A' à 'Z').`,
      given: (p) => [{ name: p.ch, type: 'char', description: '' }], expect: (p) => bool(p.out),
      reference: (p) => `boolean ${p.out} = (${p.ch} >= 'a' && ${p.ch} <= 'z') || (${p.ch} >= 'A' && ${p.ch} <= 'Z');`,
      mutants: (p) => [
        { id: 'minuscules-seules', label: 'majuscules oubliées', explanationFr: 'Les majuscules sont des lettres aussi : ajoute l’intervalle \'A\'–\'Z\'.', code: `boolean ${p.out} = ${p.ch} >= 'a' && ${p.ch} <= 'z';` },
        { id: 'bornes-strictes', label: 'a, z, A et Z exclus', explanationFr: 'Les bornes \'a\', \'z\', \'A\', \'Z\' sont des lettres : utilise `>=` et `<=`.', code: `boolean ${p.out} = (${p.ch} > 'a' && ${p.ch} < 'z') || (${p.ch} > 'A' && ${p.ch} < 'Z');` },
        { id: 'ou-dans-intervalle', label: '|| dans un intervalle', explanationFr: 'Pour être dans [\'a\', \'z\'] il faut `>= \'a\'` ET `<= \'z\'`, pas OU.', code: `boolean ${p.out} = (${p.ch} >= 'a' || ${p.ch} <= 'z') || (${p.ch} >= 'A' && ${p.ch} <= 'Z');` },
      ],
      tests: (p) => rows([p.ch], [['k'], ['K'], ['7'], ['a'], ['Z'], ['z'], ['A'], ['!'], ['{']], 2, true),
      hints: (p) => ['Les caractères sont rangés dans l’ordre de l’alphabet : on peut les comparer avec `<=` et `>=`.', 'Une lettre est dans l’intervalle de a à z OU dans l’intervalle de A à Z : deux intervalles combinés par `||`.', `(${p.ch} >= 'a' && ${p.ch} <= 'z') || (${p.ch} >= 'A' && ${p.ch} <= 'Z')`],
    },
    {
      id: 'bissextile', label: 'année bissextile', difficulty: 3, estimatedMinutes: 10, params: (rng) => ({ ...params(rng), x: rng.pick(['annee', 'an', 'a']), out: rng.pick(['bissextile', 'bis', 'estBissextile']) }),
      statement: (p) => `L’entier \`${p.x}\` (≥ 1) est déjà déclaré et initialisé : c’est une année.\n\nDéclarez un booléen \`${p.out}\` qui vaut \`true\` si et seulement si l’année est **bissextile** :\n\n- divisible par 4, **sauf** les années divisibles par 100 ;\n- **mais** les années divisibles par 400 sont bissextiles.\n\nExemples : 2024 et 2000 sont bissextiles ; 2023 et 1900 ne le sont pas.`,
      given: (p) => [{ name: p.x, type: 'int', description: '' }], expect: (p) => bool(p.out),
      reference: (p) => `boolean ${p.out} = (${p.x} % 4 == 0 && ${p.x} % 100 != 0) || ${p.x} % 400 == 0;`,
      mutants: (p) => [
        { id: 'sans-exception-siecle', label: 'seulement divisible par 4', explanationFr: 'Les années séculaires (1900, 2100…) ne sont pas bissextiles, sauf si elles sont divisibles par 400.', code: `boolean ${p.out} = ${p.x} % 4 == 0;` },
        { id: 'sans-exception-400', label: 'multiples de 400 oubliés', explanationFr: '2000 est bissextile : les multiples de 400 font exception à l’exception.', code: `boolean ${p.out} = ${p.x} % 4 == 0 && ${p.x} % 100 != 0;` },
        { id: 'et-400', label: '&& 400 au lieu de || 400', explanationFr: 'Un multiple de 400 est bissextile **même s’il** est divisible par 100 : combine avec `||`.', code: `boolean ${p.out} = ${p.x} % 4 == 0 && ${p.x} % 100 != 0 && ${p.x} % 400 == 0;` },
      ],
      tests: (p) => rows([p.x], [[2024], [2023], [1900], [2000], [2100], [1996], [2400], [1]], 2, true),
      hints: () => ['Il y a une règle générale (divisible par 4), une exception (divisible par 100) et une exception à l’exception (divisible par 400).', 'Bissextile = (divisible par 4 ET pas par 100) OU divisible par 400.', '(an % 4 == 0 && an % 100 != 0) || an % 400 == 0'],
    },
    {
      id: 'triangle', label: 'côtés d’un triangle', difficulty: 3, estimatedMinutes: 11, params,
      valid: (p) => new Set([p.a, p.b, p.c, p.out, p.out2]).size === 5,
      statement: (p) => `Les entiers strictement positifs \`${p.a}\`, \`${p.b}\` et \`${p.c}\` sont déjà déclarés et initialisés : ce sont trois longueurs.\n\nDéclarez deux booléens :\n\n- \`${p.out}\` : \`true\` si on peut construire un triangle **non aplati** avec ces trois longueurs, c’est-à-dire si chaque côté est **strictement** plus petit que la somme des deux autres ;\n- \`${p.out2}\` : \`true\` si au moins deux des trois longueurs sont égales (que le triangle soit constructible ou non).`,
      given: (p) => [p.a, p.b, p.c].map((name) => ({ name, type: 'int' as const, description: '' })), expect: (p) => [...bool(p.out), ...bool(p.out2)],
      reference: (p) => `boolean ${p.out} = ${p.a} < ${p.b} + ${p.c} && ${p.b} < ${p.a} + ${p.c} && ${p.c} < ${p.a} + ${p.b};\nboolean ${p.out2} = ${p.a} == ${p.b} || ${p.b} == ${p.c} || ${p.a} == ${p.c};`,
      mutants: (p) => [
        { id: 'inegalite-large', label: 'triangle aplati accepté', explanationFr: 'Avec 1, 2 et 3 le triangle est aplati : l’inégalité doit être **stricte**.', code: `boolean ${p.out} = ${p.a} <= ${p.b} + ${p.c} && ${p.b} <= ${p.a} + ${p.c} && ${p.c} <= ${p.a} + ${p.b};\nboolean ${p.out2} = ${p.a} == ${p.b} || ${p.b} == ${p.c} || ${p.a} == ${p.c};` },
        { id: 'un-cote-oublie', label: 'un des trois côtés non testé', explanationFr: 'Il faut vérifier les trois côtés : n’importe lequel peut être trop long.', code: `boolean ${p.out} = ${p.a} < ${p.b} + ${p.c} && ${p.b} < ${p.a} + ${p.c};\nboolean ${p.out2} = ${p.a} == ${p.b} || ${p.b} == ${p.c} || ${p.a} == ${p.c};` },
        { id: 'isocele-incomplet', label: 'une paire d’égalité oubliée', explanationFr: `Il y a trois paires possibles : (${p.a}, ${p.b}), (${p.b}, ${p.c}) et (${p.a}, ${p.c}).`, code: `boolean ${p.out} = ${p.a} < ${p.b} + ${p.c} && ${p.b} < ${p.a} + ${p.c} && ${p.c} < ${p.a} + ${p.b};\nboolean ${p.out2} = ${p.a} == ${p.b} || ${p.b} == ${p.c};` },
        { id: 'isocele-trois', label: 'trois côtés égaux exigés', explanationFr: 'Au moins **deux** côtés égaux, pas forcément les trois.', code: `boolean ${p.out} = ${p.a} < ${p.b} + ${p.c} && ${p.b} < ${p.a} + ${p.c} && ${p.c} < ${p.a} + ${p.b};\nboolean ${p.out2} = ${p.a} == ${p.b} && ${p.b} == ${p.c};` },
      ],
      tests: (p) => rows([p.a, p.b, p.c], [[3, 4, 5], [1, 2, 3], [2, 2, 3], [5, 1, 1], [3, 5, 3], [1, 1, 5], [10, 3, 4], [2, 2, 4], [6, 6, 6]], 2, true),
      hints: (p) => ['Un triangle existe quand le plus long côté est plus court que la somme des deux autres ; on peut tester les trois côtés plutôt que de chercher le plus long.', `Écris trois comparaisons strictes reliées par \`&&\` : \`${p.a} < ${p.b} + ${p.c}\`, et les deux autres du même genre.`, `${p.out2} : trois égalités possibles reliées par \`||\`.`],
    },
    {
      id: 'chevauchement', label: 'deux rectangles se chevauchent-ils ?', difficulty: 4, estimatedMinutes: 14,
      params: (rng) => ({ ...params(rng), out: rng.pick(['chevauche', 'recouvre', 'seCoupent']) }),
      statement: (p) => `Deux rectangles alignés sur les axes sont décrits par les entiers (tous déjà déclarés et initialisés, largeurs et hauteurs > 0) :\n\n- le premier : coin supérieur gauche (\`x1\`, \`y1\`), largeur \`l1\`, hauteur \`h1\` ;\n- le second : coin supérieur gauche (\`x2\`, \`y2\`), largeur \`l2\`, hauteur \`h2\`.\n\nL’axe y est dirigé vers le bas. Déclarez un booléen \`${p.out}\` qui vaut \`true\` si les deux rectangles ont une **partie commune d’aire non nulle**. Deux rectangles qui se touchent seulement par un bord ou un coin ne se chevauchent pas.`,
      given: () => ['x1', 'y1', 'l1', 'h1', 'x2', 'y2', 'l2', 'h2'].map((name) => ({ name, type: 'int' as const, description: '' })), expect: (p) => bool(p.out),
      reference: (p) => `boolean ${p.out} = x1 < x2 + l2 && x2 < x1 + l1 && y1 < y2 + h2 && y2 < y1 + h1;`,
      mutants: (p) => [
        { id: 'bords-compris', label: 'rectangles qui se touchent acceptés', explanationFr: 'Deux rectangles qui se touchent par un bord n’ont aucune aire commune : les inégalités sont strictes.', code: `boolean ${p.out} = x1 <= x2 + l2 && x2 <= x1 + l1 && y1 <= y2 + h2 && y2 <= y1 + h1;` },
        { id: 'axe-x-seulement', label: 'seul l’axe x est examiné', explanationFr: 'Il faut aussi que les rectangles se recouvrent verticalement.', code: `boolean ${p.out} = x1 < x2 + l2 && x2 < x1 + l1;` },
        { id: 'un-test-oublie', label: 'un des quatre tests oublié', explanationFr: 'Les deux rectangles ne se chevauchent pas si l’un est entièrement au-dessus, en dessous, à gauche OU à droite de l’autre : quatre cas à exclure.', code: `boolean ${p.out} = x1 < x2 + l2 && x2 < x1 + l1 && y1 < y2 + h2;` },
      ],
      tests: (p) => { void p; return [[0, 0, 4, 4, 2, 2, 4, 4], [0, 0, 2, 2, 5, 5, 2, 2], [0, 0, 4, 4, 4, 0, 3, 3], [0, 0, 4, 4, 1, 4, 2, 2], [0, 0, 10, 10, 3, 3, 2, 2], [0, 0, 3, 3, 1, 5, 3, 3], [0, 6, 3, 3, 1, 0, 3, 3], [5, 5, 2, 2, 0, 0, 8, 8], [3, 3, 1, 1, 3, 3, 1, 1]].map((r, k) => ({ vis: k < 2 ? 'public' as const : k === 8 ? 'edge' as const : 'hidden' as const, in: Object.fromEntries(['x1', 'y1', 'l1', 'h1', 'x2', 'y2', 'l2', 'h2'].map((n, j) => [n, r[j]!])) })); },
      hints: () => ['Plus facile : à quelles conditions les rectangles ne se chevauchent PAS ? (l’un est à gauche, à droite, au-dessus ou en dessous de l’autre).', 'Ils se chevauchent quand les intervalles [x1, x1 + l1[ et [x2, x2 + l2[ se recouvrent ET que les intervalles verticaux se recouvrent aussi.', 'x1 < x2 + l2 && x2 < x1 + l1 && y1 < y2 + h2 && y2 < y1 + h1'],
    },
  ],
};
export default family;
