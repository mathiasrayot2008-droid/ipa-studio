import type { FamilyDefinition, Rng } from '@/types/bank';
import { N_STR, rows } from './kit';

interface S { s: string; out: string; l: string }
const params = (rng: Rng): S => ({ s: rng.pick(N_STR), out: rng.pick(['res', 'r', 'resultat']), l: 'l' });

const family: FamilyDefinition<S> = {
  id: 'strAcces', title: 'Accéder aux caractères d’une chaîne', notions: { primary: 'N18-string-bases', secondary: [] }, kind: 'snippet',
  variants: [
    {
      id: 'dernier', label: 'dernier caractère', difficulty: 1, estimatedMinutes: 4, params: (rng) => ({ ...params(rng), out: rng.pick(['dernier', 'fin', 'der']) }),
      statement: (p) => `La chaîne \`${p.s}\` (au moins un caractère) est déjà déclarée et initialisée.\n\nDéclarez une variable de type \`char\` nommée \`${p.out}\` contenant le **dernier caractère** de \`${p.s}\`.`,
      given: (p) => [{ name: p.s, type: 'String', description: '' }],
      expect: (p) => [{ name: p.out, type: 'char' }],
      reference: (p) => `char ${p.out} = ${p.s}.charAt(${p.s}.length() - 1);`,
      mutants: (p) => [
        { id: 'premier-caractere', label: 'premier caractère', explanationFr: 'L’indice 0 est le premier caractère : le dernier est à l’indice length() - 1.', code: `char ${p.out} = ${p.s}.charAt(0);` },
        { id: 'indice-length', label: 'charAt(length())', explanationFr: 'Le dernier indice valide est length() - 1 : charAt(length()) provoque une erreur (StringIndexOutOfBoundsException).', code: `char ${p.out} = ${p.s}.charAt(${p.s}.length());` },
        { id: 'avant-dernier', label: 'avant-dernier caractère', explanationFr: 'Tu es une case trop tôt : length() - 2 est l’avant-dernier.', code: `char ${p.out} = ${p.s}.charAt(${p.s}.length() > 1 ? ${p.s}.length() - 2 : 0);` },
      ],
      tests: (p) => rows([p.s], [['bonjour'], ['Java'], ['x'], ['ab'], ['Zebre'], ['a b'], ['12345']], 2, true),
      hints: (p) => [`Les indices d’une chaîne commencent à 0. Combien de caractères y a-t-il (\`length()\`) ? Quel est l’indice du dernier ?`, `\`${p.s}.charAt(i)\` donne le caractère d’indice i. Le dernier a pour indice \`${p.s}.length() - 1\`.`, `char ${p.out} = ${p.s}.charAt(${p.s}.length() - 1);`],
    },
    {
      id: 'milieu', label: 'caractère du milieu', difficulty: 2, estimatedMinutes: 8, params: (rng) => ({ ...params(rng), out: rng.pick(['milieu', 'centre', 'mid']) }),
      valid: (p) => p.out !== p.l,
      statement: (p) => `La chaîne \`${p.s}\` de **longueur impaire** (au moins 1) est déjà déclarée et initialisée.\n\nDéclarez une variable de type \`char\` nommée \`${p.out}\` contenant le caractère situé **exactement au milieu** de \`${p.s}\`.\n\nExemple : "bonjour" a 7 lettres, son milieu est 'j'.`,
      given: (p) => [{ name: p.s, type: 'String', description: '' }],
      expect: (p) => [{ name: p.out, type: 'char' }],
      reference: (p) => `char ${p.out} = ${p.s}.charAt(${p.s}.length() / 2);`,
      mutants: (p) => [
        { id: 'moitie-moins-un', label: 'indice length()/2 - 1', explanationFr: 'Pour une longueur impaire, le milieu est à l’indice length() / 2 (division entière), pas un de moins.', code: `char ${p.out} = ${p.s}.charAt(${p.s}.length() / 2 > 0 ? ${p.s}.length() / 2 - 1 : 0);` },
        { id: 'moitie-plus-un', label: 'indice length()/2 + 1', explanationFr: 'Tu es une case trop loin : le milieu est à l’indice length() / 2.', code: `char ${p.out} = ${p.s}.charAt(${p.s}.length() / 2 + 1 < ${p.s}.length() ? ${p.s}.length() / 2 + 1 : ${p.s}.length() - 1);` },
        { id: 'premier', label: 'premier caractère', explanationFr: 'Tu renvoies le premier caractère au lieu de celui du milieu.', code: `char ${p.out} = ${p.s}.charAt(0);` },
      ],
      tests: (p) => rows([p.s], [['bonjour'], ['abcde'], ['xyz'], ['a'], ['racecar'], ['12345678901'], ['Java!']].slice(0, 7) as never, 2, true),
      hints: (p) => ['Pour une longueur impaire 2m + 1, il y a m caractères de chaque côté du milieu.', `Avec la division entière, \`${p.s}.length() / 2\` donne justement l’indice du milieu quand la longueur est impaire.`, `char ${p.out} = ${p.s}.charAt(${p.s}.length() / 2);`],
    },
  ],
};
export default family;
