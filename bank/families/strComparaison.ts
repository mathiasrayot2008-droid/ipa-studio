import type { FamilyDefinition, Rng } from '@/types/bank';
import { rows } from './kit';

interface S { a: string; b: string; mot: string; t: string; out: string; out2: string; i: string; cpt: string }
const params = (rng: Rng): S => {
  const [a, b] = rng.shuffle(['a', 'b', 'mot1', 'mot2', 'x', 'y']).slice(0, 2) as [string, string];
  return { a, b, mot: rng.pick(['mot', 'texte', 'ch']), t: rng.pick(['liste', 'mots', 'noms']), out: rng.pick(['identiques', 'egaux', 'memes']), out2: rng.pick(['memeSansCasse', 'egauxIgnoreCasse', 'proches']), i: rng.pick(['i', 'k']), cpt: rng.pick(['compte', 'freq', 'lettres']) };
};

const family: FamilyDefinition<S> = {
  id: 'strComparaison', title: 'Comparer des chaînes de caractères', notions: { primary: 'N20-string-comparaison', secondary: ['N18-string-bases', 'N07-conditions-cascades'] }, kind: 'snippet',
  variants: [
    {
      id: 'egalite-casse', label: 'égalité avec ou sans la casse', difficulty: 2, estimatedMinutes: 7, params,
      valid: (p) => new Set([p.a, p.b, p.out, p.out2]).size === 4,
      statement: (p) => `Les chaînes \`${p.a}\` et \`${p.b}\` sont déjà déclarées et initialisées.\n\nDéclarez deux booléens :\n\n- \`${p.out}\` : \`true\` si les deux chaînes ont **exactement** le même contenu (la casse compte : "Java" et "java" sont différentes) ;\n- \`${p.out2}\` : \`true\` si elles ont le même contenu **sans tenir compte** des majuscules et minuscules.`,
      given: (p) => [{ name: p.a, type: 'String', description: '' }, { name: p.b, type: 'String', description: '' }], expect: (p) => [{ name: p.out, type: 'boolean' }, { name: p.out2, type: 'boolean' }],
      reference: (p) => `boolean ${p.out} = ${p.a}.equals(${p.b});\nboolean ${p.out2} = ${p.a}.equalsIgnoreCase(${p.b});`,
      mutants: (p) => [
        { id: 'casse-ignoree-partout', label: 'equalsIgnoreCase pour les deux', explanationFr: `Le premier booléen doit tenir compte de la casse : utilise \`equals\` pour \`${p.out}\`.`, code: `boolean ${p.out} = ${p.a}.equalsIgnoreCase(${p.b});\nboolean ${p.out2} = ${p.a}.equalsIgnoreCase(${p.b});` },
        { id: 'casse-comptee-partout', label: 'equals pour les deux', explanationFr: `Le second booléen ignore la casse : utilise \`equalsIgnoreCase\` pour \`${p.out2}\`.`, code: `boolean ${p.out} = ${p.a}.equals(${p.b});\nboolean ${p.out2} = ${p.a}.equals(${p.b});` },
        { id: 'longueur-seulement', label: 'seules les longueurs sont comparées', explanationFr: 'Deux chaînes de même longueur ne sont pas forcément égales : `equals` compare le contenu caractère par caractère.', code: `boolean ${p.out} = ${p.a}.length() == ${p.b}.length();\nboolean ${p.out2} = ${p.a}.length() == ${p.b}.length();` },
      ],
      tests: (p) => rows([p.a, p.b], [['java', 'java'], ['Java', 'java'], ['abc', 'abd'], ['Oui', 'non'], ['chat', 'chats'], ['', 'a'], ['', '']], 2, true),
      hints: (p) => ['Pour comparer le contenu de deux chaînes, on n’utilise pas `==` mais une méthode de la classe String.', `\`${p.a}.equals(${p.b})\` compare en tenant compte de la casse ; une autre méthode existe pour l’ignorer.`, `boolean ${p.out} = ${p.a}.equals(${p.b}); boolean ${p.out2} = ${p.a}.equalsIgnoreCase(${p.b});`],
    },
    {
      id: 'pierre-ciseau-papier', label: 'pierre, ciseau, papier', difficulty: 3, estimatedMinutes: 11,
      params: (rng) => ({ ...params(rng), a: rng.pick(['j1', 'joueur1', 'choix1']), b: rng.pick(['j2', 'joueur2', 'choix2']), out: rng.pick(['resultat', 'gagnant', 'issue']) }),
      valid: (p) => new Set([p.a, p.b, p.out]).size === 3,
      statement: (p) => `Deux joueurs ont chacun choisi "pierre", "ciseau" ou "papier" : les chaînes \`${p.a}\` et \`${p.b}\` sont déjà déclarées et initialisées avec l’une de ces trois valeurs (en minuscules).\n\nDéclarez une chaîne \`${p.out}\` valant :\n\n- "egalite" si les deux choix sont identiques ;\n- "${p.a}" si le premier joueur gagne ;\n- "${p.b}" si le second joueur gagne.\n\nRègles : la pierre bat le ciseau, le ciseau bat le papier, le papier bat la pierre.`,
      given: (p) => [{ name: p.a, type: 'String', description: '' }, { name: p.b, type: 'String', description: '' }], expect: (p) => [{ name: p.out, type: 'String' }],
      reference: (p) => `String ${p.out};\nif (${p.a}.equals(${p.b})) {\n    ${p.out} = "egalite";\n} else if ((${p.a}.equals("pierre") && ${p.b}.equals("ciseau")) || (${p.a}.equals("ciseau") && ${p.b}.equals("papier")) || (${p.a}.equals("papier") && ${p.b}.equals("pierre"))) {\n    ${p.out} = "${p.a}";\n} else {\n    ${p.out} = "${p.b}";\n}`,
      mutants: (p) => [
        { id: 'egalite-oubliee', label: 'le cas d’égalité n’est pas traité', explanationFr: 'Quand les deux choix sont identiques, personne ne gagne : traite ce cas en premier.', code: `String ${p.out};\nif ((${p.a}.equals("pierre") && ${p.b}.equals("ciseau")) || (${p.a}.equals("ciseau") && ${p.b}.equals("papier")) || (${p.a}.equals("papier") && ${p.b}.equals("pierre"))) {\n    ${p.out} = "${p.a}";\n} else {\n    ${p.out} = "${p.b}";\n}` },
        { id: 'regle-oubliee', label: 'le papier ne bat pas la pierre', explanationFr: 'Il y a trois façons de gagner pour le premier joueur : pierre/ciseau, ciseau/papier ET papier/pierre.', code: `String ${p.out};\nif (${p.a}.equals(${p.b})) {\n    ${p.out} = "egalite";\n} else if ((${p.a}.equals("pierre") && ${p.b}.equals("ciseau")) || (${p.a}.equals("ciseau") && ${p.b}.equals("papier"))) {\n    ${p.out} = "${p.a}";\n} else {\n    ${p.out} = "${p.b}";\n}` },
        { id: 'regle-inversee', label: 'le papier bat le ciseau', explanationFr: 'Le ciseau bat le papier (il le coupe) : relis les règles.', code: `String ${p.out};\nif (${p.a}.equals(${p.b})) {\n    ${p.out} = "egalite";\n} else if ((${p.a}.equals("pierre") && ${p.b}.equals("ciseau")) || (${p.a}.equals("papier") && ${p.b}.equals("ciseau")) || (${p.a}.equals("papier") && ${p.b}.equals("pierre"))) {\n    ${p.out} = "${p.a}";\n} else {\n    ${p.out} = "${p.b}";\n}` },
      ],
      tests: (p) => rows([p.a, p.b], [['pierre', 'ciseau'], ['papier', 'papier'], ['ciseau', 'pierre'], ['papier', 'pierre'], ['ciseau', 'papier'], ['pierre', 'papier'], ['pierre', 'pierre'], ['ciseau', 'ciseau'], ['papier', 'ciseau']], 2, true),
      hints: (p) => ['Compare des chaînes avec `equals`. Traite d’abord l’égalité, puis les cas où le premier joueur gagne ; tous les autres cas sont des victoires du second.', `Les trois victoires du premier joueur : (pierre, ciseau), (ciseau, papier), (papier, pierre) — à relier par \`||\`.`, `if (${p.a}.equals(${p.b})) { ... } else if ((${p.a}.equals("pierre") && ${p.b}.equals("ciseau")) || ...) { ... } else { ... }`],
    },
    {
      id: 'palindrome', label: 'palindrome', difficulty: 3, estimatedMinutes: 11, params: (rng) => ({ ...params(rng), mot: rng.pick(['mot', 'texte', 's']), out: rng.pick(['estPalindrome', 'palindrome', 'symetrique']) }),
      valid: (p) => new Set([p.mot, p.out, p.i]).size === 3,
      statement: (p) => `La chaîne \`${p.mot}\` (éventuellement vide, en minuscules sans espace ni accent) est déjà déclarée et initialisée.\n\nDéclarez un booléen \`${p.out}\` qui vaut \`true\` si et seulement si \`${p.mot}\` est un **palindrome** : elle se lit pareil de gauche à droite et de droite à gauche.\n\nExemples : "radar" → \`true\` ; "bonjour" → \`false\` ; "" et "a" → \`true\`.`,
      given: (p) => [{ name: p.mot, type: 'String', description: '' }], expect: (p) => [{ name: p.out, type: 'boolean' }],
      reference: (p) => `boolean ${p.out} = true;\nfor (int ${p.i} = 0; ${p.i} < ${p.mot}.length() / 2; ${p.i}++) {\n    if (${p.mot}.charAt(${p.i}) != ${p.mot}.charAt(${p.mot}.length() - 1 - ${p.i})) {\n        ${p.out} = false;\n    }\n}`,
      mutants: (p) => [
        { id: 'drapeau-ecrase', label: 'le drapeau est réécrit à chaque tour', explanationFr: 'Une fois un écart trouvé, le résultat reste `false` : n’affecte le drapeau que dans le `if`.', code: `boolean ${p.out} = true;\nfor (int ${p.i} = 0; ${p.i} < ${p.mot}.length() / 2; ${p.i}++) {\n    ${p.out} = ${p.mot}.charAt(${p.i}) == ${p.mot}.charAt(${p.mot}.length() - 1 - ${p.i});\n}` },
        { id: 'compare-voisins', label: 'lettres voisines comparées', explanationFr: 'Il faut comparer la lettre i avec la lettre symétrique (longueur − 1 − i), pas avec sa voisine.', code: `boolean ${p.out} = true;\nfor (int ${p.i} = 0; ${p.i} < ${p.mot}.length() - 1; ${p.i}++) {\n    if (${p.mot}.charAt(${p.i}) != ${p.mot}.charAt(${p.i} + 1)) {\n        ${p.out} = false;\n    }\n}` },
        { id: 'premiere-et-derniere', label: 'seules les extrémités sont comparées', explanationFr: 'Toutes les paires de lettres symétriques doivent être égales, pas seulement la première et la dernière.', code: `boolean ${p.out} = true;\nif (${p.mot}.length() > 0 && ${p.mot}.charAt(0) != ${p.mot}.charAt(${p.mot}.length() - 1)) {\n    ${p.out} = false;\n}` },
      ],
      tests: (p) => rows([p.mot], [['radar'], ['bonjour'], ['abba'], ['abca'], ['kayak'], ['abcdba'], ['xbba'], ['a'], ['']], 2, true),
      hints: (p) => ['Compare chaque lettre avec sa symétrique : la première avec la dernière, la deuxième avec l’avant-dernière, etc.', `Il suffit de parcourir la première moitié : \`${p.i} < ${p.mot}.length() / 2\`. La lettre symétrique de l’indice i est à l’indice \`longueur - 1 - i\`.`, `${p.mot}.charAt(i) != ${p.mot}.charAt(${p.mot}.length() - 1 - i) → ce n’est pas un palindrome.`],
    },
    {
      id: 'indice-mot', label: 'rechercher un mot dans une liste', difficulty: 3, estimatedMinutes: 10, params: (rng) => ({ ...params(rng), out: rng.pick(['position', 'rang', 'indiceMot']) }),
      valid: (p) => new Set([p.t, p.mot, p.out, p.i]).size === 4,
      statement: (p) => `Le tableau de chaînes \`${p.t}\` (éventuellement vide) et la chaîne \`${p.mot}\` sont déjà déclarés et initialisés.\n\nDéclarez un entier \`${p.out}\` égal à l’**indice de la première case** de \`${p.t}\` dont le contenu est égal à \`${p.mot}\` (la casse compte), ou **-1** si le mot n’est pas dans le tableau.\n\nExemple : {"chat", "chien", "chat"} et "chat" → 0 ; avec "souris" → -1.`,
      given: (p) => [{ name: p.t, type: 'String[]', description: '' }, { name: p.mot, type: 'String', description: '' }], expect: (p) => [{ name: p.out, type: 'int' }],
      reference: (p) => `int ${p.out} = -1;\nfor (int ${p.i} = 0; ${p.i} < ${p.t}.length && ${p.out} == -1; ${p.i}++) {\n    if (${p.t}[${p.i}].equals(${p.mot})) {\n        ${p.out} = ${p.i};\n    }\n}`,
      mutants: (p) => [
        { id: 'derniere-occurrence', label: 'dernière occurrence au lieu de la première', explanationFr: 'On demande la **première** case : arrête-toi (ou n’affecte plus) dès qu’elle est trouvée.', code: `int ${p.out} = -1;\nfor (int ${p.i} = 0; ${p.i} < ${p.t}.length; ${p.i}++) {\n    if (${p.t}[${p.i}].equals(${p.mot})) {\n        ${p.out} = ${p.i};\n    }\n}` },
        { id: 'casse-ignoree', label: 'majuscules et minuscules confondues', explanationFr: 'La casse compte ici : "Chat" et "chat" sont différents (`equals`, pas `equalsIgnoreCase`).', code: `int ${p.out} = -1;\nfor (int ${p.i} = 0; ${p.i} < ${p.t}.length && ${p.out} == -1; ${p.i}++) {\n    if (${p.t}[${p.i}].equalsIgnoreCase(${p.mot})) {\n        ${p.out} = ${p.i};\n    }\n}` },
        { id: 'absent-vaut-zero', label: '0 au lieu de -1 quand le mot est absent', explanationFr: '0 est un indice valide : pour « absent » on renvoie -1.', code: `int ${p.out} = 0;\nfor (int ${p.i} = 0; ${p.i} < ${p.t}.length && ${p.out} == 0; ${p.i}++) {\n    if (${p.t}[${p.i}].equals(${p.mot})) {\n        ${p.out} = ${p.i};\n    }\n}` },
      ],
      tests: (p) => rows([p.t, p.mot], [[['chat', 'chien', 'chat'], 'chat'], [['chat', 'chien'], 'souris'], [['Chat', 'chat'], 'chat'], [['un', 'deux', 'trois'], 'trois'], [['un', 'deux', 'un'], 'un'], [['a'], 'b'], [[], 'a']], 2, true),
      hints: (p) => ['Parcours le tableau et compare chaque case avec le mot cherché en utilisant `equals` (jamais `==` pour comparer des chaînes).', `Commence avec \`${p.out} = -1\` (« pas trouvé »). Quand une case est égale au mot, mémorise son indice.`, `Pour garder la première occurrence, ajoute \`&& ${p.out} == -1\` à la condition de la boucle (ou ne change plus ${p.out} une fois qu’elle est différente de -1).`],
    },
    {
      id: 'anagrammes', label: 'deux mots sont-ils des anagrammes ?', difficulty: 5, estimatedMinutes: 20, params,
      valid: (p) => new Set([p.a, p.b, p.out, p.i, p.cpt]).size === 5,
      statement: (p) => `Les chaînes \`${p.a}\` et \`${p.b}\` (lettres minuscules sans accent uniquement, éventuellement vides) sont déjà déclarées et initialisées.\n\nDéclarez un booléen \`${p.out}\` qui vaut \`true\` si et seulement si les deux mots sont des **anagrammes** : ils contiennent exactement les mêmes lettres, chacune le même nombre de fois, dans un ordre quelconque.\n\nExemples : "chien" et "niche" → \`true\` ; "chat" et "chats" → \`false\` ; "aab" et "abb" → \`false\`.`,
      given: (p) => [{ name: p.a, type: 'String', description: '' }, { name: p.b, type: 'String', description: '' }], expect: (p) => [{ name: p.out, type: 'boolean' }],
      reference: (p) => `int[] ${p.cpt} = new int[26];\nfor (int ${p.i} = 0; ${p.i} < ${p.a}.length(); ${p.i}++) {\n    ${p.cpt}[${p.a}.charAt(${p.i}) - 'a']++;\n}\nfor (int ${p.i} = 0; ${p.i} < ${p.b}.length(); ${p.i}++) {\n    ${p.cpt}[${p.b}.charAt(${p.i}) - 'a']--;\n}\nboolean ${p.out} = true;\nfor (int ${p.i} = 0; ${p.i} < 26; ${p.i}++) {\n    if (${p.cpt}[${p.i}] != 0) {\n        ${p.out} = false;\n    }\n}`,
      mutants: (p) => [
        { id: 'meme-longueur-seulement', label: 'seules les longueurs sont comparées', explanationFr: 'Deux mots de même longueur ne sont pas forcément des anagrammes : compare le nombre de chaque lettre.', code: `boolean ${p.out} = ${p.a}.length() == ${p.b}.length();` },
        { id: 'lettres-presentes-seulement', label: 'chaque lettre de a apparaît dans b', explanationFr: 'Il faut le **même nombre** de chaque lettre : "aab" contient a deux fois, "abb" une seule.', code: `boolean ${p.out} = ${p.a}.length() == ${p.b}.length();\nfor (int ${p.i} = 0; ${p.i} < ${p.a}.length(); ${p.i}++) {\n    boolean ${p.cpt} = false;\n    for (int j = 0; j < ${p.b}.length(); j++) {\n        if (${p.a}.charAt(${p.i}) == ${p.b}.charAt(j)) {\n            ${p.cpt} = true;\n        }\n    }\n    if (!${p.cpt}) {\n        ${p.out} = false;\n    }\n}` },
        { id: 'oublie-longueur-differente', label: 'un mot plus court est accepté', explanationFr: 'Si un mot contient des lettres en plus, ce n’est pas un anagramme : compare les deux comptages en entier.', code: `int[] ${p.cpt} = new int[26];\nfor (int ${p.i} = 0; ${p.i} < ${p.a}.length(); ${p.i}++) {\n    ${p.cpt}[${p.a}.charAt(${p.i}) - 'a']++;\n}\nfor (int ${p.i} = 0; ${p.i} < ${p.b}.length(); ${p.i}++) {\n    ${p.cpt}[${p.b}.charAt(${p.i}) - 'a']--;\n}\nboolean ${p.out} = true;\nfor (int ${p.i} = 0; ${p.i} < 26; ${p.i}++) {\n    if (${p.cpt}[${p.i}] > 0) {\n        ${p.out} = false;\n    }\n}` },
      ],
      tests: (p) => rows([p.a, p.b], [['chien', 'niche'], ['chat', 'chats'], ['aab', 'abb'], ['abc', 'abd'], ['aabb', 'abab'], ['rail', 'liar'], ['chats', 'chat'], ['', '']], 2, true),
      hints: (p) => ['Deux mots sont anagrammes s’ils ont le même nombre de chaque lettre : on peut compter les lettres de chaque mot.', `Un tableau de 26 entiers sert de compteurs : la lettre \`c\` correspond à la case \`c - 'a'\`. Incrémente pour les lettres de \`${p.a}\`, décrémente pour celles de \`${p.b}\`.`, 'À la fin, les deux mots sont anagrammes si et seulement si toutes les cases valent 0.'],
    },
  ],
};
export default family;
