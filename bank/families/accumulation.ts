import type { FamilyDefinition, Rng } from '@/types/bank';
import { names, N_TOTAL, rows } from './kit';

interface A { n: string; k: string; out: string; i: string }
const params = (rng: Rng): A => ({ n: rng.pick(['n', 'nb', 'limite', 'max']), k: rng.pick(['k', 'pas', 'm']), out: rng.pick(N_TOTAL), i: rng.pick(['i', 'j', 'compteur']) });

const family: FamilyDefinition<A> = {
  id: 'accumulation', title: 'Accumuler dans une boucle', notions: { primary: 'N08-boucle-for', secondary: ['N10-accumulateurs-compteurs'] }, kind: 'snippet',
  variants: [
    {
      id: 'somme-1-n', label: 'somme des entiers de 1 à n', difficulty: 1, estimatedMinutes: 5, params,
      statement: (p) => `La variable entière \`${p.n}\` (≥ 0) est déjà déclarée et initialisée.\n\nDéclarez une variable entière \`${p.out}\` égale à la somme des entiers de 1 à \`${p.n}\` inclus (1 + 2 + … + ${p.n}). Pour \`${p.n}\` = 0, la somme vaut 0.\n\nVous devez utiliser une boucle \`for\`.`,
      given: (p) => [{ name: p.n, type: 'int', description: '' }],
      expect: (p) => [{ name: p.out, type: 'int' }],
      reference: (p) => `int ${p.out} = 0;\nfor (int ${p.i} = 1; ${p.i} <= ${p.n}; ${p.i}++) {\n    ${p.out} += ${p.i};\n}`,
      mutants: (p) => [
        { id: 'borne-exclue', label: 'la borne n est exclue', explanationFr: `La condition \`${p.i} < ${p.n}\` s’arrête avant ${p.n} : pour inclure ${p.n}, utilise \`<=\`.`, code: `int ${p.out} = 0;\nfor (int ${p.i} = 1; ${p.i} < ${p.n}; ${p.i}++) {\n    ${p.out} += ${p.i};\n}` },
        { id: 'depart-a-deux', label: 'le compteur démarre à 2', explanationFr: 'Le premier entier à ajouter est 1, pas 2 : le compteur doit démarrer à 1.', code: `int ${p.out} = 0;\nfor (int ${p.i} = 2; ${p.i} <= ${p.n}; ${p.i}++) {\n    ${p.out} += ${p.i};\n}` },
        { id: 'compte-au-lieu-de-somme', label: 'compte les tours au lieu de sommer', explanationFr: 'Tu ajoutes 1 à chaque tour : il faut ajouter la valeur du compteur.', code: `int ${p.out} = 0;\nfor (int ${p.i} = 1; ${p.i} <= ${p.n}; ${p.i}++) {\n    ${p.out} += 1;\n}` },
      ],
      tests: (p) => rows([p.n], [[5], [10], [1], [100], [7], [0]], 2, true),
      hints: (p) => ['Un accumulateur est une variable initialisée avant la boucle, puis modifiée à chaque tour.', `Initialise \`${p.out}\` à 0. Fais varier un compteur de 1 à ${p.n} et ajoute-le à \`${p.out}\` à chaque tour.`, `for (int ${p.i} = 1; ${p.i} <= ${p.n}; ${p.i}++) { ${p.out} += ${p.i}; }`],
    },
    {
      id: 'somme-multiples', label: 'somme des multiples de k jusqu’à n', difficulty: 2, estimatedMinutes: 8,
      params: (rng) => { const a = params(rng); return { ...a, k: names(rng, ['k', 'pas', 'm', 'q'], 1, [a.n, a.out, a.i])[0]! }; },
      statement: (p) => `Les variables entières \`${p.n}\` (≥ 0) et \`${p.k}\` (≥ 1) sont déjà déclarées et initialisées.\n\nDéclarez une variable entière \`${p.out}\` égale à la somme des **multiples de ${p.k} compris entre 1 et ${p.n}** (inclus).\n\nExemple : ${p.k} = 3 et ${p.n} = 10 → 3 + 6 + 9 = 18.`,
      given: (p) => [{ name: p.n, type: 'int', description: '' }, { name: p.k, type: 'int', description: '' }],
      expect: (p) => [{ name: p.out, type: 'int' }],
      reference: (p) => `int ${p.out} = 0;\nfor (int ${p.i} = ${p.k}; ${p.i} <= ${p.n}; ${p.i} += ${p.k}) {\n    ${p.out} += ${p.i};\n}`,
      mutants: (p) => [
        { id: 'borne-exclue', label: 'n exclu', explanationFr: `Quand ${p.n} est lui-même un multiple de ${p.k}, il doit être compté : utilise \`<=\`.`, code: `int ${p.out} = 0;\nfor (int ${p.i} = ${p.k}; ${p.i} < ${p.n}; ${p.i} += ${p.k}) {\n    ${p.out} += ${p.i};\n}` },
        { id: 'depart-zero-pas-un', label: 'pas de 1 avec test de divisibilité oublié', explanationFr: 'Tu additionnes tous les entiers au lieu des seuls multiples.', code: `int ${p.out} = 0;\nfor (int ${p.i} = 1; ${p.i} <= ${p.n}; ${p.i}++) {\n    ${p.out} += ${p.i};\n}` },
        { id: 'compte-les-multiples', label: 'compte les multiples au lieu de les sommer', explanationFr: 'Tu comptes combien il y a de multiples ; la consigne demande leur somme.', code: `int ${p.out} = 0;\nfor (int ${p.i} = ${p.k}; ${p.i} <= ${p.n}; ${p.i} += ${p.k}) {\n    ${p.out}++;\n}` },
      ],
      tests: (p) => rows([p.n, p.k], [[10, 3], [20, 5], [12, 4], [7, 10], [30, 1], [9, 3], [0, 4]], 2, true),
      hints: (p) => ['Deux façons : parcourir tous les entiers et tester la divisibilité, ou avancer directement de k en k.', `Un multiple de ${p.k} est un nombre qui laisse un reste 0 dans la division par ${p.k} (\`%\`), ou on peut partir de ${p.k} et avancer de ${p.k} à chaque tour.`, `for (int ${p.i} = ${p.k}; ${p.i} <= ${p.n}; ${p.i} += ${p.k}) { ${p.out} += ${p.i}; }`],
    },
    {
      id: 'produit-impairs', label: 'produit des entiers impairs jusqu’à n', difficulty: 3, estimatedMinutes: 9, params,
      statement: (p) => `La variable entière \`${p.n}\` (entre 0 et 15) est déjà déclarée et initialisée.\n\nDéclarez une variable entière \`${p.out}\` égale au **produit des entiers impairs** compris entre 1 et \`${p.n}\` (inclus). Le produit d’aucun nombre vaut 1.\n\nExemple : ${p.n} = 7 → 1 × 3 × 5 × 7 = 105.`,
      given: (p) => [{ name: p.n, type: 'int', description: '' }],
      expect: (p) => [{ name: p.out, type: 'int' }],
      reference: (p) => `int ${p.out} = 1;\nfor (int ${p.i} = 1; ${p.i} <= ${p.n}; ${p.i} += 2) {\n    ${p.out} *= ${p.i};\n}`,
      mutants: (p) => [
        { id: 'accumulateur-zero', label: 'produit initialisé à 0', explanationFr: 'Un produit s’initialise à 1 (élément neutre) : avec 0 le résultat reste toujours 0.', code: `int ${p.out} = 0;\nfor (int ${p.i} = 1; ${p.i} <= ${p.n}; ${p.i} += 2) {\n    ${p.out} *= ${p.i};\n}` },
        { id: 'nombres-pairs', label: 'produit des pairs', explanationFr: 'Tu as pris les nombres pairs : le premier impair est 1, puis 3, 5…', code: `int ${p.out} = 1;\nfor (int ${p.i} = 2; ${p.i} <= ${p.n}; ${p.i} += 2) {\n    ${p.out} *= ${p.i};\n}` },
        { id: 'borne-exclue', label: 'n exclu', explanationFr: `Si ${p.n} est impair il doit être inclus : \`<=\`.`, code: `int ${p.out} = 1;\nfor (int ${p.i} = 1; ${p.i} < ${p.n}; ${p.i} += 2) {\n    ${p.out} *= ${p.i};\n}` },
      ],
      tests: (p) => rows([p.n], [[7], [5], [1], [15], [10], [4], [0]], 2, true),
      hints: (p) => ['Un produit se calcule comme une somme, mais l’accumulateur de départ est différent. Lequel ?', 'Initialise l’accumulateur à 1. Les impairs sont 1, 3, 5… : le compteur peut avancer de 2 en 2.', `int ${p.out} = 1; for (int ${p.i} = 1; ${p.i} <= ${p.n}; ${p.i} += 2) { ${p.out} *= ${p.i}; }`],
    },
  ],
};
export default family;
