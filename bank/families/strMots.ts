import type { FamilyDefinition, Rng } from '@/types/bank';
import { rows } from './kit';

interface S { s: string; out: string; i: string; mots: string; w: string; j: string }
const params = (rng: Rng): S => ({ s: rng.pick(['phrase', 'texte', 'message']), out: rng.pick(['resultat', 'sortie', 'nouvelle']), i: 'i', mots: rng.pick(['mots', 'liste', 'tab']), w: rng.pick(['mot', 'm']), j: 'j' });
const valid = (p: S) => new Set([p.s, p.out, p.i, p.mots, p.w, p.j]).size === 6;
const SPACES = 'Les mots de la phrase sont séparés par **un seul espace** ; elle ne commence ni ne finit par un espace.';

const family: FamilyDefinition<S> = {
  id: 'strMots', title: 'Découper une phrase en mots (split)', notions: { primary: 'N22-string-mots', secondary: ['N19-string-parcours', 'N21-string-transformation'] }, kind: 'snippet',
  variants: [
    {
      id: 'nb-mots', label: 'compter les mots', difficulty: 2, estimatedMinutes: 6, params, valid,
      statement: (p) => `La chaîne \`${p.s}\` (au moins un mot) est déjà déclarée et initialisée. ${SPACES}\n\nDéclarez un entier \`${p.out}\` égal au **nombre de mots** de \`${p.s}\`, en utilisant \`split\`.\n\nExemples : "bonjour tout le monde" → 4 ; "salut" → 1.`,
      given: (p) => [{ name: p.s, type: 'String', description: '' }], expect: (p) => [{ name: p.out, type: 'int' }],
      reference: (p) => `String[] ${p.mots} = ${p.s}.split(" ");\nint ${p.out} = ${p.mots}.length;`,
      mutants: (p) => [
        { id: 'compte-espaces', label: 'nombre d’espaces au lieu du nombre de mots', explanationFr: 'Il y a un mot de plus que d’espaces : utilise la taille du tableau retourné par `split`.', code: `String[] ${p.mots} = ${p.s}.split(" ");\nint ${p.out} = ${p.mots}.length - 1;` },
        { id: 'longueur-phrase', label: 'taille de la phrase', explanationFr: '`length()` de la phrase compte les caractères, pas les mots.', code: `int ${p.out} = ${p.s}.length();` },
        { id: 'toujours-un', label: 'toujours 1', explanationFr: 'Il faut découper la phrase : `split(" ")` retourne un tableau avec un mot par case.', code: `int ${p.out} = 1;` },
      ],
      tests: (p) => rows([p.s], [['bonjour tout le monde'], ['salut'], ['un deux'], ['a b c d e f'], ['Salut les gens'], ['x']], 2, true),
      hints: (p) => ['`split` découpe un texte en morceaux et retourne un tableau de chaînes.', `\`${p.s}.split(" ")\` donne un tableau avec un mot par case : combien de cases ? (\`length\` sans parenthèses pour un tableau.)`, `String[] ${p.mots} = ${p.s}.split(" "); int ${p.out} = ${p.mots}.length;`],
    },
    {
      id: 'capitalise-phrase', label: 'capitaliser chaque mot', difficulty: 4, estimatedMinutes: 14, params, valid,
      statement: (p) => `La chaîne \`${p.s}\` (lettres et espaces) est déjà déclarée et initialisée. ${SPACES}\n\nDéclarez une chaîne \`${p.out}\` égale à \`${p.s}\` dont **chaque mot est capitalisé** : première lettre en majuscule, le reste en minuscules, mots séparés par un espace.\n\nExemples : "bonjour mesdames et messieurs" → "Bonjour Mesdames Et Messieurs" ; "SUPER BIEN" → "Super Bien".`,
      given: (p) => [{ name: p.s, type: 'String', description: '' }], expect: (p) => [{ name: p.out, type: 'String' }],
      reference: (p) => `String[] ${p.mots} = ${p.s}.split(" ");\nString ${p.out} = "";\nfor (int ${p.i} = 0; ${p.i} < ${p.mots}.length; ${p.i}++) {\n    String ${p.w} = ${p.mots}[${p.i}];\n    ${p.w} = ${p.w}.substring(0, 1).toUpperCase() + ${p.w}.substring(1).toLowerCase();\n    if (${p.i} > 0) {\n        ${p.out} = ${p.out} + " ";\n    }\n    ${p.out} = ${p.out} + ${p.w};\n}`,
      mutants: (p) => [
        { id: 'premier-mot-seul', label: 'seul le premier mot est capitalisé', explanationFr: 'Il faut capitaliser **chaque** mot : découpe avec `split` et traite chaque case.', code: `String ${p.out} = ${p.s}.substring(0, 1).toUpperCase() + ${p.s}.substring(1).toLowerCase();` },
        { id: 'espace-final', label: 'un espace en trop à la fin', explanationFr: 'N’ajoute l’espace que **entre** les mots (avant chaque mot sauf le premier).', code: `String[] ${p.mots} = ${p.s}.split(" ");\nString ${p.out} = "";\nfor (int ${p.i} = 0; ${p.i} < ${p.mots}.length; ${p.i}++) {\n    String ${p.w} = ${p.mots}[${p.i}];\n    ${p.out} = ${p.out} + ${p.w}.substring(0, 1).toUpperCase() + ${p.w}.substring(1).toLowerCase() + " ";\n}` },
        { id: 'reste-inchange', label: 'le reste des mots n’est pas passé en minuscules', explanationFr: 'Dans "SUPER" il faut obtenir "Super" : passe le reste du mot en minuscules.', code: `String[] ${p.mots} = ${p.s}.split(" ");\nString ${p.out} = "";\nfor (int ${p.i} = 0; ${p.i} < ${p.mots}.length; ${p.i}++) {\n    String ${p.w} = ${p.mots}[${p.i}];\n    ${p.w} = ${p.w}.substring(0, 1).toUpperCase() + ${p.w}.substring(1);\n    if (${p.i} > 0) {\n        ${p.out} = ${p.out} + " ";\n    }\n    ${p.out} = ${p.out} + ${p.w};\n}` },
      ],
      tests: (p) => rows([p.s], [['bonjour mesdames et messieurs'], ['SUPER BIEN'], ['jAVA est TOP'], ['x y z'], ['Un deux'], ['a']], 2, true),
      hints: (p) => ['Découpe la phrase en mots, capitalise chaque mot, puis reconstruis la phrase.', `Boucle sur le tableau retourné par \`${p.s}.split(" ")\`. Pour chaque mot : \`substring(0, 1).toUpperCase() + substring(1).toLowerCase()\`.`, `Ajoute un espace avant chaque mot sauf le premier : \`if (${p.i} > 0) { ${p.out} = ${p.out} + " "; }\`.`],
    },
    {
      id: 'mot-le-plus-long', label: 'le mot le plus long', difficulty: 4, estimatedMinutes: 14, params, valid,
      statement: (p) => `La chaîne \`${p.s}\` (au moins un mot) est déjà déclarée et initialisée. ${SPACES}\n\nDéclarez une chaîne \`${p.out}\` égale au **mot le plus long** de \`${p.s}\`. Si plusieurs mots ont la taille maximale, gardez le **premier**.\n\nExemples : "le chat dort" → "chat" ; "un deux trois" → "trois" ; "ab cd" → "ab".`,
      given: (p) => [{ name: p.s, type: 'String', description: '' }], expect: (p) => [{ name: p.out, type: 'String' }],
      reference: (p) => `String[] ${p.mots} = ${p.s}.split(" ");\nString ${p.out} = ${p.mots}[0];\nfor (int ${p.i} = 1; ${p.i} < ${p.mots}.length; ${p.i}++) {\n    if (${p.mots}[${p.i}].length() > ${p.out}.length()) {\n        ${p.out} = ${p.mots}[${p.i}];\n    }\n}`,
      mutants: (p) => [
        { id: 'dernier-en-cas-egalite', label: 'en cas d’égalité, le dernier est gardé', explanationFr: 'Avec `>=`, un mot de même taille remplace le précédent : utilise `>` pour garder le premier.', code: `String[] ${p.mots} = ${p.s}.split(" ");\nString ${p.out} = ${p.mots}[0];\nfor (int ${p.i} = 1; ${p.i} < ${p.mots}.length; ${p.i}++) {\n    if (${p.mots}[${p.i}].length() >= ${p.out}.length()) {\n        ${p.out} = ${p.mots}[${p.i}];\n    }\n}` },
        { id: 'premier-mot', label: 'toujours le premier mot', explanationFr: 'Compare la taille de chaque mot avec celle du meilleur mot trouvé jusque-là.', code: `String[] ${p.mots} = ${p.s}.split(" ");\nString ${p.out} = ${p.mots}[0];` },
        { id: 'plus-court', label: 'le mot le plus court', explanationFr: 'On cherche le plus **long** : le test est `>`, pas `<`.', code: `String[] ${p.mots} = ${p.s}.split(" ");\nString ${p.out} = ${p.mots}[0];\nfor (int ${p.i} = 1; ${p.i} < ${p.mots}.length; ${p.i}++) {\n    if (${p.mots}[${p.i}].length() < ${p.out}.length()) {\n        ${p.out} = ${p.mots}[${p.i}];\n    }\n}` },
      ],
      tests: (p) => rows([p.s], [['le chat dort'], ['un deux trois'], ['ab cd'], ['bonjour'], ['a bb ccc dd'], ['abc de fgh'], ['x y z']], 2, true),
      hints: (p) => ['Garde en mémoire le meilleur mot vu jusqu’ici, et remplace-le quand tu en trouves un strictement plus long.', `Découpe avec \`${p.s}.split(" ")\`, commence avec le premier mot, puis parcours les suivants en comparant \`length()\`.`, `if (${p.mots}[${p.i}].length() > ${p.out}.length()) { ${p.out} = ${p.mots}[${p.i}]; }`],
    },
    {
      id: 'censure', label: 'censurer un mot', difficulty: 5, estimatedMinutes: 18, params: (rng) => ({ ...params(rng), w: rng.pick(['mot', 'm', 'courant']) }), valid: (p) => valid(p) && p.s !== 'interdit',
      statement: (p) => `Les chaînes \`${p.s}\` et \`interdit\` (un mot, lettres minuscules) sont déjà déclarées et initialisées. ${SPACES}\n\nDéclarez une chaîne \`${p.out}\` égale à \`${p.s}\` où **chaque mot entier** égal à \`interdit\` (la casse compte) est remplacé par autant d'étoiles \`*\` qu'il a de lettres. Les autres mots sont inchangés.\n\nExemples : "ceci est un truc" et "truc" → "ceci est un ****" ; "truculent truc" et "truc" → "truculent ****".`,
      given: (p) => [{ name: p.s, type: 'String', description: '' }, { name: 'interdit', type: 'String', description: '' }], expect: (p) => [{ name: p.out, type: 'String' }],
      reference: (p) => `String[] ${p.mots} = ${p.s}.split(" ");\nString ${p.out} = "";\nfor (int ${p.i} = 0; ${p.i} < ${p.mots}.length; ${p.i}++) {\n    String ${p.w} = ${p.mots}[${p.i}];\n    if (${p.w}.equals(interdit)) {\n        String etoiles = "";\n        for (int ${p.j} = 0; ${p.j} < ${p.w}.length(); ${p.j}++) {\n            etoiles = etoiles + "*";\n        }\n        ${p.w} = etoiles;\n    }\n    if (${p.i} > 0) {\n        ${p.out} = ${p.out} + " ";\n    }\n    ${p.out} = ${p.out} + ${p.w};\n}`,
      mutants: (p) => [
        { id: 'morceaux-de-mots', label: 'les morceaux de mots sont aussi remplacés', explanationFr: 'On ne remplace que les **mots entiers** : "truculent" ne doit pas devenir "****ulent". Compare chaque mot avec `equals`.', code: `String ${p.out} = ${p.s};\nString etoiles = "";\nfor (int ${p.j} = 0; ${p.j} < interdit.length(); ${p.j}++) {\n    etoiles = etoiles + "*";\n}\n${p.out} = ${p.out}.replace(interdit, etoiles);` },
        { id: 'comparaison-egalite-egalite', label: 'comparaison avec == au lieu de equals', explanationFr: 'Pour comparer le contenu de deux chaînes on utilise `equals`, jamais `==`.', code: `String[] ${p.mots} = ${p.s}.split(" ");\nString ${p.out} = "";\nfor (int ${p.i} = 0; ${p.i} < ${p.mots}.length; ${p.i}++) {\n    String ${p.w} = ${p.mots}[${p.i}];\n    if (${p.w} == interdit) {\n        String etoiles = "";\n        for (int ${p.j} = 0; ${p.j} < ${p.w}.length(); ${p.j}++) {\n            etoiles = etoiles + "*";\n        }\n        ${p.w} = etoiles;\n    }\n    if (${p.i} > 0) {\n        ${p.out} = ${p.out} + " ";\n    }\n    ${p.out} = ${p.out} + ${p.w};\n}` },
        { id: 'une-etoile', label: 'une seule étoile par mot', explanationFr: 'Le nombre d’étoiles doit être égal à la taille du mot remplacé.', code: `String[] ${p.mots} = ${p.s}.split(" ");\nString ${p.out} = "";\nfor (int ${p.i} = 0; ${p.i} < ${p.mots}.length; ${p.i}++) {\n    String ${p.w} = ${p.mots}[${p.i}];\n    if (${p.w}.equals(interdit)) {\n        ${p.w} = "*";\n    }\n    if (${p.i} > 0) {\n        ${p.out} = ${p.out} + " ";\n    }\n    ${p.out} = ${p.out} + ${p.w};\n}` },
      ],
      tests: (p) => rows([p.s, 'interdit'], [['ceci est un truc', 'truc'], ['truculent truc', 'truc'], ['truc truc truc', 'truc'], ['rien a censurer', 'zut'], ['Truc truc', 'truc'], ['bonjour', 'bonjour'], ['a b a', 'a']], 2, true),
      hints: (p) => ['Découpe en mots, remplace chaque mot égal à `interdit` par des étoiles, puis reconstruis la phrase.', `Compare avec \`${p.w}.equals(interdit)\` (jamais \`==\`). Pour fabriquer les étoiles, une boucle de 0 à \`${p.w}.length()\` qui ajoute "*".`, `Ajoute un espace avant chaque mot sauf le premier lors de la reconstruction : \`if (${p.i} > 0) { ${p.out} = ${p.out} + " "; }\`.`],
    },
  ],
};

export default family;
