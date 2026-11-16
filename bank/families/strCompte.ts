import type { FamilyDefinition, Rng } from '@/types/bank';
import { N_STR, rows } from './kit';

interface S { s: string; c: string; out: string; i: string }
const params = (rng: Rng): S => ({ s: rng.pick(N_STR), c: rng.pick(['c', 'lettre', 'cible']), out: rng.pick(['nb', 'compteur', 'occ']), i: rng.pick(['i', 'k']) });

const family: FamilyDefinition<S> = {
  id: 'strCompte', title: 'Compter dans une chaîne', notions: { primary: 'N19-string-parcours', secondary: ['N10-accumulateurs-compteurs', 'N05-logique-comparaisons'] }, kind: 'snippet',
  variants: [
    {
      id: 'count-char', label: 'occurrences d’un caractère', difficulty: 2, estimatedMinutes: 8, params,
      valid: (p) => new Set([p.s, p.c, p.out, p.i]).size === 4,
      statement: (p) => `La chaîne \`${p.s}\` et le caractère \`${p.c}\` sont déjà déclarés et initialisés.\n\nDéclarez une variable entière \`${p.out}\` contenant le **nombre d’occurrences** de \`${p.c}\` dans \`${p.s}\`. La casse compte : 'a' et 'A' sont deux caractères différents.`,
      given: (p) => [{ name: p.s, type: 'String', description: '' }, { name: p.c, type: 'char', description: '' }],
      expect: (p) => [{ name: p.out, type: 'int' }],
      reference: (p) => `int ${p.out} = 0;\nfor (int ${p.i} = 0; ${p.i} < ${p.s}.length(); ${p.i}++) {\n    if (${p.s}.charAt(${p.i}) == ${p.c}) {\n        ${p.out}++;\n    }\n}`,
      mutants: (p) => [
        { id: 'ignore-premier', label: 'le premier caractère est ignoré', explanationFr: 'Les indices d’une chaîne commencent à 0 : la boucle doit démarrer à 0.', code: `int ${p.out} = 0;\nfor (int ${p.i} = 1; ${p.i} < ${p.s}.length(); ${p.i}++) {\n    if (${p.s}.charAt(${p.i}) == ${p.c}) {\n        ${p.out}++;\n    }\n}` },
        { id: 'ignore-dernier', label: 'le dernier caractère est ignoré', explanationFr: `La condition \`${p.i} < ${p.s}.length() - 1\` s’arrête une case trop tôt.`, code: `int ${p.out} = 0;\nfor (int ${p.i} = 0; ${p.i} < ${p.s}.length() - 1; ${p.i}++) {\n    if (${p.s}.charAt(${p.i}) == ${p.c}) {\n        ${p.out}++;\n    }\n}` },
        { id: 'casse-ignoree', label: 'majuscules et minuscules confondues', explanationFr: 'Ici la casse compte : \'a\' et \'A\' sont différents, ne les confonds pas.', code: `int ${p.out} = 0;\nfor (int ${p.i} = 0; ${p.i} < ${p.s}.length(); ${p.i}++) {\n    if (Character.toLowerCase(${p.s}.charAt(${p.i})) == Character.toLowerCase(${p.c})) {\n        ${p.out}++;\n    }\n}` },
        { id: 'premiere-occurrence-seulement', label: 'compte 0 ou 1 seulement', explanationFr: 'Tu t’arrêtes à la première occurrence : il faut compter TOUTES les occurrences.', code: `int ${p.out} = 0;\nfor (int ${p.i} = 0; ${p.i} < ${p.s}.length() && ${p.out} == 0; ${p.i}++) {\n    if (${p.s}.charAt(${p.i}) == ${p.c}) {\n        ${p.out}++;\n    }\n}` },
      ],
      tests: (p) => rows([p.s, p.c], [['banane', 'a'], ['programmation', 'm'], ['Anna', 'a'], ['abcabc', 'c'], ['zzz', 'z'], ['bonjour', 'x'], ['Reussir', 'r'], ['', 'a']], 2, true),
      hints: (p) => ['Il faut examiner les caractères un par un, et compter ceux qui sont égaux au caractère cherché.', `Boucle \`for\` de 0 à \`${p.s}.length() - 1\` ; \`${p.s}.charAt(i)\` donne le caractère d’indice i. Compare-le à \`${p.c}\` avec \`==\`.`, `int ${p.out} = 0; for (...) { if (${p.s}.charAt(${p.i}) == ${p.c}) { ${p.out}++; } }`],
    },
    {
      id: 'count-vowels', label: 'nombre de voyelles', difficulty: 3, estimatedMinutes: 11, params: (rng) => ({ ...params(rng), out: rng.pick(['nbVoyelles', 'voy', 'v']) }),
      valid: (p) => new Set([p.s, p.out, p.i, 'ch']).size === 4,
      statement: (p) => `La chaîne \`${p.s}\` est déjà déclarée et initialisée ; elle ne contient que des **lettres minuscules sans accent** et des espaces.\n\nDéclarez une variable entière \`${p.out}\` contenant le nombre de **voyelles** de \`${p.s}\` (a, e, i, o, u, y).`,
      given: (p) => [{ name: p.s, type: 'String', description: '' }],
      expect: (p) => [{ name: p.out, type: 'int' }],
      reference: (p) => `int ${p.out} = 0;\nfor (int ${p.i} = 0; ${p.i} < ${p.s}.length(); ${p.i}++) {\n    char ch = ${p.s}.charAt(${p.i});\n    if (ch == 'a' || ch == 'e' || ch == 'i' || ch == 'o' || ch == 'u' || ch == 'y') {\n        ${p.out}++;\n    }\n}`,
      mutants: (p) => [
        { id: 'oublie-y', label: 'le y n’est pas compté', explanationFr: 'Dans cet exercice, y est une voyelle.', code: `int ${p.out} = 0;\nfor (int ${p.i} = 0; ${p.i} < ${p.s}.length(); ${p.i}++) {\n    char ch = ${p.s}.charAt(${p.i});\n    if (ch == 'a' || ch == 'e' || ch == 'i' || ch == 'o' || ch == 'u') {\n        ${p.out}++;\n    }\n}` },
        { id: 'oublie-u', label: 'le u n’est pas compté', explanationFr: 'Il y a six voyelles : a, e, i, o, u, y.', code: `int ${p.out} = 0;\nfor (int ${p.i} = 0; ${p.i} < ${p.s}.length(); ${p.i}++) {\n    char ch = ${p.s}.charAt(${p.i});\n    if (ch == 'a' || ch == 'e' || ch == 'i' || ch == 'o' || ch == 'y') {\n        ${p.out}++;\n    }\n}` },
        { id: 'et-au-lieu-de-ou', label: '&& à la place de ||', explanationFr: 'Un caractère ne peut pas être « a ET e » : relie les tests par || (ou).', code: `int ${p.out} = 0;\nfor (int ${p.i} = 0; ${p.i} < ${p.s}.length(); ${p.i}++) {\n    char ch = ${p.s}.charAt(${p.i});\n    if (ch == 'a' && ch == 'e' && ch == 'i' && ch == 'o' && ch == 'u' && ch == 'y') {\n        ${p.out}++;\n    }\n}` },
        { id: 'compte-les-consonnes', label: 'compte les consonnes', explanationFr: 'Tu comptes les caractères qui ne sont PAS des voyelles (espaces compris).', code: `int ${p.out} = 0;\nfor (int ${p.i} = 0; ${p.i} < ${p.s}.length(); ${p.i}++) {\n    char ch = ${p.s}.charAt(${p.i});\n    if (!(ch == 'a' || ch == 'e' || ch == 'i' || ch == 'o' || ch == 'u' || ch == 'y')) {\n        ${p.out}++;\n    }\n}` },
      ],
      tests: (p) => rows([p.s], [['bonjour le monde'], ['rythme'], ['aeiouy'], ['programmation java'], ['xkcd'], ['ou est le yaourt'], ['']], 2, true),
      hints: (p) => ['Pour chaque caractère, il faut tester s’il appartient à un petit ensemble de lettres.', 'Récupère le caractère avec charAt, puis combine les comparaisons avec || : ch == \'a\' || ch == \'e\' || …', `if (ch == 'a' || ch == 'e' || ch == 'i' || ch == 'o' || ch == 'u' || ch == 'y') { ${p.out}++; }`],
    },
    {
      id: 'count-upper', label: 'nombre de majuscules', difficulty: 2, estimatedMinutes: 8, params: (rng) => ({ ...params(rng), out: rng.pick(['nbMaj', 'maj', 'compteur']) }),
      valid: (p) => new Set([p.s, p.out, p.i, 'ch']).size === 4,
      statement: (p) => `La chaîne \`${p.s}\` est déjà déclarée et initialisée (lettres sans accent, chiffres, espaces et ponctuation).\n\nDéclarez une variable entière \`${p.out}\` contenant le nombre de **lettres majuscules** (de 'A' à 'Z') de \`${p.s}\`.`,
      given: (p) => [{ name: p.s, type: 'String', description: '' }],
      expect: (p) => [{ name: p.out, type: 'int' }],
      reference: (p) => `int ${p.out} = 0;\nfor (int ${p.i} = 0; ${p.i} < ${p.s}.length(); ${p.i}++) {\n    char ch = ${p.s}.charAt(${p.i});\n    if (ch >= 'A' && ch <= 'Z') {\n        ${p.out}++;\n    }\n}`,
      mutants: (p) => [
        { id: 'borne-a-exclue', label: 'A n’est pas compté', explanationFr: 'La comparaison doit inclure \'A\' : `>=`.', code: `int ${p.out} = 0;\nfor (int ${p.i} = 0; ${p.i} < ${p.s}.length(); ${p.i}++) {\n    char ch = ${p.s}.charAt(${p.i});\n    if (ch > 'A' && ch <= 'Z') {\n        ${p.out}++;\n    }\n}` },
        { id: 'borne-z-exclue', label: 'Z n’est pas compté', explanationFr: 'La comparaison doit inclure \'Z\' : `<=`.', code: `int ${p.out} = 0;\nfor (int ${p.i} = 0; ${p.i} < ${p.s}.length(); ${p.i}++) {\n    char ch = ${p.s}.charAt(${p.i});\n    if (ch >= 'A' && ch < 'Z') {\n        ${p.out}++;\n    }\n}` },
        { id: 'minuscules', label: 'compte les minuscules', explanationFr: 'Tu comptes les minuscules : les majuscules sont entre \'A\' et \'Z\'.', code: `int ${p.out} = 0;\nfor (int ${p.i} = 0; ${p.i} < ${p.s}.length(); ${p.i}++) {\n    char ch = ${p.s}.charAt(${p.i});\n    if (ch >= 'a' && ch <= 'z') {\n        ${p.out}++;\n    }\n}` },
      ],
      tests: (p) => rows([p.s], [['Bonjour Le Monde'], ['abc'], ['AAAB Zoo'], ['ABCZ az AZ'], ['Zorro A1B2'], ['TOUT'], ['x@Y!'], ['']], 2, true),
      hints: () => ['Les caractères sont des nombres (codes) : les majuscules forment un intervalle continu entre \'A\' et \'Z\'.', 'Un caractère ch est une majuscule si ch >= \'A\' et ch <= \'Z\'. Attention aux bornes incluses.', `if (ch >= 'A' && ch <= 'Z') { compteur++; }`],
    },
  ],
};
export default family;
