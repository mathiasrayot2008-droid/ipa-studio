import type { FamilyDefinition, Rng } from '@/types/bank';
import { rows } from './kit';

interface S { v: string; out: string }
const params = (rng: Rng): S => ({ v: rng.pick(['jour', 'numero', 'j']), out: rng.pick(['nom', 'res', 'resultat']) });
const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

const family: FamilyDefinition<S> = {
  id: 'switchMenu', title: 'Choisir avec switch', notions: { primary: 'N06-switch', secondary: ['N04-if-else'] }, kind: 'snippet',
  variants: [
    {
      id: 'jour-semaine', label: 'numéro de jour → nom', difficulty: 2, estimatedMinutes: 8, params,
      statement: (p) => `L’entier \`${p.v}\` est déjà déclaré et initialisé.\n\nDéclarez une chaîne \`${p.out}\` contenant le nom du jour de la semaine correspondant : 1 → "lundi", 2 → "mardi", … 7 → "dimanche". Pour toute autre valeur, \`${p.out}\` vaut "inconnu".\n\nVous devez utiliser un \`switch\`.`,
      given: (p) => [{ name: p.v, type: 'int', description: '' }],
      expect: (p) => [{ name: p.out, type: 'String' }],
      reference: (p) => `String ${p.out};\nswitch (${p.v}) {\n${DAYS.map((d, i) => `    case ${i + 1}:\n        ${p.out} = "${d}";\n        break;`).join('\n')}\n    default:\n        ${p.out} = "inconnu";\n}`,
      mutants: (p) => [
        { id: 'oublie-break', label: 'break oubliés : les cas s’enchaînent', explanationFr: 'Sans `break`, l’exécution continue dans le cas suivant (« fall-through ») : chaque cas doit se terminer par un break.', code: `String ${p.out};\nswitch (${p.v}) {\n${DAYS.map((d, i) => `    case ${i + 1}:\n        ${p.out} = "${d}";`).join('\n')}\n    default:\n        ${p.out} = "inconnu";\n}` },
        { id: 'decalage-numerotation', label: 'numérotation à partir de 0', explanationFr: 'Le lundi est le jour numéro 1 (pas 0).', code: `String ${p.out};\nswitch (${p.v}) {\n${DAYS.map((d, i) => `    case ${i}:\n        ${p.out} = "${d}";\n        break;`).join('\n')}\n    default:\n        ${p.out} = "inconnu";\n}` },
        { id: 'default-oublie', label: 'valeurs invalides : mauvais défaut', explanationFr: 'Pour une valeur hors de 1..7 le résultat doit être "inconnu".', code: `String ${p.out} = "lundi";\nswitch (${p.v}) {\n${DAYS.slice(1).map((d, i) => `    case ${i + 2}:\n        ${p.out} = "${d}";\n        break;`).join('\n')}\n}` },
      ],
      tests: (p) => rows([p.v], [[1], [4], [7], [2], [6], [0], [8]], 2, true),
      hints: () => ['Chaque valeur possible correspond à un « case » ; une valeur inattendue est traitée par « default ».', 'Dans chaque case : affecte le nom puis termine par break (sinon l’exécution continue dans le cas suivant).', 'switch (jour) { case 1: nom = "lundi"; break; … default: nom = "inconnu"; }'],
    },
    {
      id: 'jours-du-mois', label: 'nombre de jours d’un mois', difficulty: 2, estimatedMinutes: 8, params: (rng) => ({ v: rng.pick(['mois', 'm', 'numMois']), out: rng.pick(['nbJours', 'jours', 'nb']) }),
      statement: (p) => `L’entier \`${p.v}\` (entre 1 et 12) est déjà déclaré et initialisé. On considère une année **non bissextile**.\n\nDéclarez un entier \`${p.out}\` contenant le nombre de jours du mois : 28 pour février (2), 30 pour avril, juin, septembre et novembre (4, 6, 9, 11), 31 pour les autres.\n\nUtilisez un \`switch\` en regroupant les cas qui donnent le même résultat.`,
      given: (p) => [{ name: p.v, type: 'int', description: '' }],
      expect: (p) => [{ name: p.out, type: 'int' }],
      reference: (p) => `int ${p.out};\nswitch (${p.v}) {\n    case 2:\n        ${p.out} = 28;\n        break;\n    case 4:\n    case 6:\n    case 9:\n    case 11:\n        ${p.out} = 30;\n        break;\n    default:\n        ${p.out} = 31;\n}`,
      mutants: (p) => [
        { id: 'oublie-novembre', label: 'novembre oublié (31 jours)', explanationFr: 'Novembre (11) a 30 jours : il fait partie des mois à 30 jours.', code: `int ${p.out};\nswitch (${p.v}) {\n    case 2:\n        ${p.out} = 28;\n        break;\n    case 4:\n    case 6:\n    case 9:\n        ${p.out} = 30;\n        break;\n    default:\n        ${p.out} = 31;\n}` },
        { id: 'fevrier-30', label: 'février à 30 jours', explanationFr: 'Février (2) a 28 jours dans une année non bissextile.', code: `int ${p.out};\nswitch (${p.v}) {\n    case 4:\n    case 6:\n    case 9:\n    case 11:\n    case 2:\n        ${p.out} = 30;\n        break;\n    default:\n        ${p.out} = 31;\n}` },
        { id: 'oublie-septembre', label: 'septembre oublié', explanationFr: 'Septembre (9) a 30 jours.', code: `int ${p.out};\nswitch (${p.v}) {\n    case 2:\n        ${p.out} = 28;\n        break;\n    case 4:\n    case 6:\n    case 11:\n        ${p.out} = 30;\n        break;\n    default:\n        ${p.out} = 31;\n}` },
      ],
      tests: (p) => rows([p.v], [[2], [4], [1], [9], [11], [6], [12]], 2, true),
      hints: () => ['Plusieurs mois donnent le même résultat : on peut écrire plusieurs « case » à la suite sans break entre eux.', 'Trois groupes : février (28), les mois à 30 jours (4, 6, 9, 11), et tous les autres (default : 31).', 'case 4: case 6: case 9: case 11: nb = 30; break;'],
    },
    {
      id: 'calculatrice', label: 'petite calculatrice', difficulty: 3, estimatedMinutes: 10, params: () => ({ v: 'op', out: 'res' }),
      statement: () => `Les entiers \`a\` et \`b\` et le caractère \`op\` (parmi '+', '-', '*', '/') sont déjà déclarés et initialisés (\`b\` n’est jamais nul quand \`op\` vaut '/').\n\nDéclarez un entier \`res\` contenant le résultat de \`a op b\` (division **entière** pour '/').\n\nUtilisez un \`switch\` sur \`op\`.`,
      given: () => [{ name: 'a', type: 'int', description: '' }, { name: 'b', type: 'int', description: '' }, { name: 'op', type: 'char', description: '' }],
      expect: () => [{ name: 'res', type: 'int' }],
      reference: () => `int res;\nswitch (op) {\n    case '+':\n        res = a + b;\n        break;\n    case '-':\n        res = a - b;\n        break;\n    case '*':\n        res = a * b;\n        break;\n    default:\n        res = a / b;\n}`,
      mutants: () => [
        { id: 'oublie-break', label: 'break oubliés', explanationFr: 'Sans break, chaque cas « tombe » dans le suivant et le dernier calcul écrase les autres.', code: `int res;\nswitch (op) {\n    case '+':\n        res = a + b;\n    case '-':\n        res = a - b;\n    case '*':\n        res = a * b;\n    default:\n        res = a / b;\n}` },
        { id: 'soustraction-inversee', label: 'b − a', explanationFr: 'a - b : l’ordre des opérandes compte pour la soustraction.', code: `int res;\nswitch (op) {\n    case '+':\n        res = a + b;\n        break;\n    case '-':\n        res = b - a;\n        break;\n    case '*':\n        res = a * b;\n        break;\n    default:\n        res = a / b;\n}` },
        { id: 'division-inversee', label: 'b / a', explanationFr: 'a / b : le numérateur est a.', code: `int res;\nswitch (op) {\n    case '+':\n        res = a + b;\n        break;\n    case '-':\n        res = a - b;\n        break;\n    case '*':\n        res = a * b;\n        break;\n    default:\n        res = b / a;\n}` },
      ],
      tests: () => rows(['a', 'b', 'op'], [[12, 4, '+'], [12, 4, '/'], [7, 3, '-'], [6, 7, '*'], [3, 10, '-'], [17, 5, '/'], [2, 9, '/']], 2, true),
      hints: () => ['On choisit le calcul selon le caractère op : c’est un switch sur un char.', "case '+': res = a + b; break; — répète pour '-' et '*' ; le dernier cas peut être default.", "Pour la division entière entre deux int, l’opérateur / suffit."],
    },
  ],
};
export default family;
