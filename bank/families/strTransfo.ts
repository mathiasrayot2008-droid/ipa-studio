import type { FamilyDefinition, Rng } from '@/types/bank';
import { rows } from './kit';

interface S { s: string; out: string; i: string; res: string }
const params = (rng: Rng): S => ({ s: rng.pick(['mot', 'texte', 'chaine', 'm']), out: rng.pick(['resultat', 'nouveau', 'sortie']), i: rng.pick(['i', 'k']), res: rng.pick(['r', 'tmp', 'acc']) });
const valid = (p: S) => new Set([p.s, p.out, p.i, p.res]).size === 4;
const given = (p: S) => [{ name: p.s, type: 'String' as const, description: '' }];
const expect = (p: S) => [{ name: p.out, type: 'String' as const }];

const family: FamilyDefinition<S> = {
  id: 'strTransfo', title: 'Transformer une chaîne de caractères', notions: { primary: 'N21-string-transformation', secondary: ['N18-string-bases'] }, kind: 'snippet',
  variants: [
    {
      id: 'capitalise', label: 'première lettre en majuscule', difficulty: 2, estimatedMinutes: 7, params, valid,
      statement: (p) => `La chaîne \`${p.s}\` (au moins un caractère, lettres uniquement) est déjà déclarée et initialisée.\n\nDéclarez une chaîne \`${p.out}\` égale à \`${p.s}\` **capitalisée** : première lettre en majuscule, toutes les autres en minuscules.\n\nExemples : "bonjour" → "Bonjour" ; "SUPER" → "Super" ; "a" → "A".`,
      given, expect,
      reference: (p) => `String ${p.out} = ${p.s}.substring(0, 1).toUpperCase() + ${p.s}.substring(1).toLowerCase();`,
      mutants: (p) => [
        { id: 'reste-inchange', label: 'le reste n’est pas passé en minuscules', explanationFr: 'Le reste du mot doit être mis en minuscules : \`toLowerCase()\` sur \`substring(1)\`.', code: `String ${p.out} = ${p.s}.substring(0, 1).toUpperCase() + ${p.s}.substring(1);` },
        { id: 'tout-en-majuscules', label: 'tout en majuscules', explanationFr: 'Seule la première lettre passe en majuscule.', code: `String ${p.out} = ${p.s}.toUpperCase();` },
        { id: 'premiere-lettre-seule', label: 'seule la première lettre est gardée', explanationFr: 'Il faut aussi recopier le reste du mot : \`substring(1)\` va de l’indice 1 jusqu’à la fin.', code: `String ${p.out} = ${p.s}.substring(0, 1).toUpperCase();` },
      ],
      tests: (p) => rows([p.s], [['bonjour'], ['SUPER'], ['jAVA'], ['hELLO'], ['x'], ['A'], ['ecole']], 2, true),
      hints: (p) => ['Traite la première lettre à part du reste du mot, puis recolle les deux morceaux.', `\`${p.s}.substring(0, 1)\` est la première lettre, \`${p.s}.substring(1)\` tout le reste. \`toUpperCase()\` et \`toLowerCase()\` retournent un nouveau texte.`, `String ${p.out} = ${p.s}.substring(0, 1).toUpperCase() + ${p.s}.substring(1).toLowerCase();`],
    },
    {
      id: 'inverse', label: 'texte à l’envers', difficulty: 3, estimatedMinutes: 9, params, valid,
      statement: (p) => `La chaîne \`${p.s}\` (éventuellement vide) est déjà déclarée et initialisée.\n\nDéclarez une chaîne \`${p.out}\` contenant les caractères de \`${p.s}\` **dans l’ordre inverse**.\n\nExemples : "Tomate" → "etamoT" ; "abc" → "cba" ; "" → "".`,
      given, expect,
      reference: (p) => `String ${p.out} = "";\nfor (int ${p.i} = ${p.s}.length() - 1; ${p.i} >= 0; ${p.i}--) {\n    ${p.out} = ${p.out} + ${p.s}.charAt(${p.i});\n}`,
      mutants: (p) => [
        { id: 'meme-ordre', label: 'le texte est recopié dans le même ordre', explanationFr: 'Il faut parcourir le texte de la fin vers le début.', code: `String ${p.out} = "";\nfor (int ${p.i} = 0; ${p.i} < ${p.s}.length(); ${p.i}++) {\n    ${p.out} = ${p.out} + ${p.s}.charAt(${p.i});\n}` },
        { id: 'premier-oublie', label: 'le premier caractère est oublié', explanationFr: 'L’indice 0 est le premier caractère : la boucle doit aller jusqu’à 0 inclus (\`>= 0\`).', code: `String ${p.out} = "";\nfor (int ${p.i} = ${p.s}.length() - 1; ${p.i} > 0; ${p.i}--) {\n    ${p.out} = ${p.out} + ${p.s}.charAt(${p.i});\n}` },
        { id: 'dernier-oublie', label: 'le dernier caractère est oublié', explanationFr: 'Le dernier indice est \`length() - 1\` : commence la boucle à cet indice.', code: `String ${p.out} = "";\nfor (int ${p.i} = ${p.s}.length() - 2; ${p.i} >= 0; ${p.i}--) {\n    ${p.out} = ${p.out} + ${p.s}.charAt(${p.i});\n}` },
      ],
      tests: (p) => rows([p.s], [['Tomate'], ['mot'], ['abc'], ['kayak'], ['Java Power'], ['x'], ['']], 2, true),
      hints: (p) => ['Pour inverser, parcours le texte du dernier caractère au premier, en ajoutant chaque caractère à un résultat qui part de "".', `Le dernier indice est \`${p.s}.length() - 1\`, le premier est 0. La boucle décroît : \`${p.i}--\`.`, `String ${p.out} = ""; for (int ${p.i} = ${p.s}.length() - 1; ${p.i} >= 0; ${p.i}--) { ${p.out} = ${p.out} + ${p.s}.charAt(${p.i}); }`],
    },
    {
      id: 'remplacements', label: 'remplacer des lettres (L33T)', difficulty: 3, estimatedMinutes: 9, params, valid,
      statement: (p) => `La chaîne \`${p.s}\` (lettres et espaces) est déjà déclarée et initialisée.\n\nDéclarez une chaîne \`${p.out}\` obtenue en :\n\n- mettant tout \`${p.s}\` en **majuscules** ;\n- puis en remplaçant chaque \`'A'\` par \`'4'\`, chaque \`'E'\` par \`'3'\` et chaque \`'O'\` par \`'0'\` (zéro).\n\nExemple : "Java Power" → "J4V4 P0W3R".`,
      given, expect,
      reference: (p) => `String ${p.out} = ${p.s}.toUpperCase();\n${p.out} = ${p.out}.replace('A', '4');\n${p.out} = ${p.out}.replace('E', '3');\n${p.out} = ${p.out}.replace('O', '0');`,
      mutants: (p) => [
        { id: 'pas-de-majuscules', label: 'les minuscules ne sont pas remplacées', explanationFr: 'Passe d’abord le texte en majuscules, sinon \`replace(\'A\', …)\` ne trouve pas les \'a\'.', code: `String ${p.out} = ${p.s};\n${p.out} = ${p.out}.replace('A', '4');\n${p.out} = ${p.out}.replace('E', '3');\n${p.out} = ${p.out}.replace('O', '0');` },
        { id: 'remplacement-perdu', label: 'le résultat de replace est perdu', explanationFr: '\`replace\` ne modifie pas la chaîne, il retourne une nouvelle chaîne : réaffecte-la.', code: `String ${p.out} = ${p.s}.toUpperCase();\n${p.out}.replace('A', '4');\n${p.out}.replace('E', '3');\n${p.out}.replace('O', '0');` },
        { id: 'lettre-oubliee', label: 'le O n’est pas remplacé', explanationFr: 'Il y a trois remplacements à faire : A, E et O.', code: `String ${p.out} = ${p.s}.toUpperCase();\n${p.out} = ${p.out}.replace('A', '4');\n${p.out} = ${p.out}.replace('E', '3');` },
      ],
      tests: (p) => rows([p.s], [['Java Power'], ['Hacker Man'], ['aeo'], ['bonjour tout le monde'], ['xyz'], ['EEEE'], ['Programmation']], 2, true),
      hints: (p) => ['Commence par mettre tout le texte en majuscules, puis enchaîne trois remplacements.', '`replace(char a, char b)` retourne une nouvelle chaîne où toutes les occurrences de a sont remplacées par b : réaffecte le résultat à chaque fois.', `String ${p.out} = ${p.s}.toUpperCase(); ${p.out} = ${p.out}.replace('A', '4'); …`],
    },
    {
      id: 'terminaison', label: 'reconnaître une terminaison', difficulty: 2, estimatedMinutes: 8, params, valid,
      statement: (p) => `La chaîne \`${p.s}\` (un verbe en minuscules) est déjà déclarée et initialisée.\n\nDéclarez une chaîne \`${p.out}\` valant :\n\n- "vous" si \`${p.s}\` se termine par "ez" ;\n- "nous" si \`${p.s}\` se termine par "ons" ;\n- "autre" dans tous les autres cas.\n\nExemples : "mangez" → "vous" ; "chantons" → "nous" ; "chante" → "autre".`,
      given, expect,
      reference: (p) => `String ${p.out};\nif (${p.s}.endsWith("ez")) {\n    ${p.out} = "vous";\n} else if (${p.s}.endsWith("ons")) {\n    ${p.out} = "nous";\n} else {\n    ${p.out} = "autre";\n}`,
      mutants: (p) => [
        { id: 'commence-par', label: 'startsWith au lieu de endsWith', explanationFr: 'On teste la **fin** du mot : \`endsWith\`, pas \`startsWith\`.', code: `String ${p.out};\nif (${p.s}.startsWith("ez")) {\n    ${p.out} = "vous";\n} else if (${p.s}.startsWith("ons")) {\n    ${p.out} = "nous";\n} else {\n    ${p.out} = "autre";\n}` },
        { id: 'terminaison-oubliee', label: 'la terminaison « ons » n’est pas traitée', explanationFr: 'Il y a deux terminaisons à reconnaître : "ez" et "ons".', code: `String ${p.out};\nif (${p.s}.endsWith("ez")) {\n    ${p.out} = "vous";\n} else {\n    ${p.out} = "autre";\n}` },
        { id: 'contient', label: 'contains au lieu de endsWith', explanationFr: '\`contains\` teste « n’importe où dans le mot » : "bonsoir" contient "ons" mais ne se termine pas par "ons".', code: `String ${p.out};\nif (${p.s}.contains("ez")) {\n    ${p.out} = "vous";\n} else if (${p.s}.contains("ons")) {\n    ${p.out} = "nous";\n} else {\n    ${p.out} = "autre";\n}` },
      ],
      tests: (p) => rows([p.s], [['mangez'], ['chantons'], ['chante'], ['bonsoir'], ['ez'], ['onsez'], ['allons'], ['ons'], ['chez']], 2, true),
      hints: (p) => ['Trois cas : une terminaison, une autre terminaison, ou aucune des deux.', `\`${p.s}.endsWith("ez")\` renvoie \`true\` si le texte se termine par "ez".`, `if (${p.s}.endsWith("ez")) { … } else if (${p.s}.endsWith("ons")) { … } else { … }`],
    },
  ],
};

export default family;
