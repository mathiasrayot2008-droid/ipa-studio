import type { FamilyDefinition, Rng } from '@/types/bank';
import { rows } from './kit';

interface A { a: string; b: string; c: string; tmp: string; sol: string; dep: string; ret: string; av: string; va: string; pre: string; cou: string; suiv: string }
const params = (rng: Rng): A => {
  const [a, b, c] = rng.shuffle(['a', 'b', 'c', 'x', 'y', 'z']) as [string, string, string];
  return {
    a, b, c, tmp: rng.pick(['tmp', 'temp', 'aux', 'memo']),
    sol: rng.pick(['solde', 'compte', 'argent']), dep: rng.pick(['depot', 'credit', 'ajout']), ret: rng.pick(['retrait', 'debit', 'depense']),
    av: rng.pick(['avant', 'initial', 'ancien']), va: rng.pick(['variation', 'ecart', 'difference']),
    pre: rng.pick(['prec', 'u', 'ancien']), cou: rng.pick(['cour', 'v', 'actuel']), suiv: rng.pick(['suiv', 'nouveau', 'next']),
  };
};
const ints = (...n: string[]) => n.map((name) => ({ name, type: 'int' as const, description: '' }));
const mod = (...n: string[]) => n.map((name) => ({ name, type: 'int' as const }));

const family: FamilyDefinition<A> = {
  id: 'affectations', title: 'Variables et affectations', notions: { primary: 'N01-variables-types', secondary: [] }, kind: 'snippet',
  variants: [
    {
      id: 'echange', label: 'échanger deux variables', difficulty: 1, estimatedMinutes: 5, params,
      statement: (p) => `Les variables entières \`${p.a}\` et \`${p.b}\` sont déjà déclarées et initialisées.\n\n**Échangez leurs valeurs** : à la fin, \`${p.a}\` doit contenir l’ancienne valeur de \`${p.b}\` et \`${p.b}\` l’ancienne valeur de \`${p.a}\`.\n\nExemple : si \`${p.a}\` vaut 3 et \`${p.b}\` vaut 8, alors à la fin \`${p.a}\` vaut 8 et \`${p.b}\` vaut 3.\n\nVous pouvez déclarer une variable supplémentaire.`,
      given: (p) => ints(p.a, p.b), expect: (p) => mod(p.a, p.b),
      reference: (p) => `int ${p.tmp} = ${p.a};\n${p.a} = ${p.b};\n${p.b} = ${p.tmp};`,
      mutants: (p) => [
        { id: 'ecrase-a', label: 'a = b puis b = a', explanationFr: `Après \`${p.a} = ${p.b};\` l’ancienne valeur de \`${p.a}\` est perdue : sauvegarde-la d’abord dans une variable intermédiaire.`, code: `${p.a} = ${p.b};\n${p.b} = ${p.a};` },
        { id: 'ecrase-b', label: 'b = a puis a = b', explanationFr: `Après \`${p.b} = ${p.a};\` l’ancienne valeur de \`${p.b}\` est perdue : les deux variables contiennent la même valeur.`, code: `${p.b} = ${p.a};\n${p.a} = ${p.b};` },
        { id: 'somme', label: 'a + b au lieu d’un échange', explanationFr: 'Additionner ne permet pas d’échanger : il faut recopier chaque valeur à sa place.', code: `${p.a} = ${p.a} + ${p.b};\n${p.b} = ${p.a} + ${p.b};` },
      ],
      tests: (p) => rows([p.a, p.b], [[3, 8], [10, -4], [0, 5], [-2, -9], [100, 1], [7, 7]], 2, true),
      hints: (p) => ['Quand on écrit dans une variable, son ancienne valeur disparaît : il faut la mettre de côté avant.', `Déclare une variable intermédiaire (\`${p.tmp}\`) qui reçoit l’ancienne valeur de \`${p.a}\`.`, `int ${p.tmp} = ${p.a}; ${p.a} = ${p.b}; ${p.b} = ${p.tmp};`],
    },
    {
      id: 'rotation', label: 'permutation circulaire de trois variables', difficulty: 2, estimatedMinutes: 8, params,
      statement: (p) => `Les variables entières \`${p.a}\`, \`${p.b}\` et \`${p.c}\` sont déjà déclarées et initialisées.\n\nFaites une **permutation circulaire** : à la fin, \`${p.a}\` contient l’ancienne valeur de \`${p.b}\`, \`${p.b}\` l’ancienne valeur de \`${p.c}\`, et \`${p.c}\` l’ancienne valeur de \`${p.a}\`.\n\nExemple : \`${p.a}\` = 1, \`${p.b}\` = 2, \`${p.c}\` = 3 devient \`${p.a}\` = 2, \`${p.b}\` = 3, \`${p.c}\` = 1.`,
      given: (p) => ints(p.a, p.b, p.c), expect: (p) => mod(p.a, p.b, p.c),
      reference: (p) => `int ${p.tmp} = ${p.a};\n${p.a} = ${p.b};\n${p.b} = ${p.c};\n${p.c} = ${p.tmp};`,
      mutants: (p) => [
        { id: 'sens-inverse', label: 'rotation dans l’autre sens', explanationFr: `Relis le sens demandé : \`${p.a}\` doit recevoir la valeur de \`${p.b}\`, pas celle de \`${p.c}\`.`, code: `int ${p.tmp} = ${p.a};\n${p.a} = ${p.c};\n${p.c} = ${p.b};\n${p.b} = ${p.tmp};` },
        { id: 'sans-memoire', label: 'ancienne valeur de a perdue', explanationFr: `Quand \`${p.c} = ${p.a};\` s’exécute, \`${p.a}\` a déjà été modifiée : il faut avoir mis son ancienne valeur de côté.`, code: `${p.a} = ${p.b};\n${p.b} = ${p.c};\n${p.c} = ${p.a};` },
        { id: 'echange-de-deux', label: 'seules a et b sont échangées', explanationFr: `Les trois variables doivent changer de valeur : \`${p.c}\` ne doit pas rester inchangée.`, code: `int ${p.tmp} = ${p.a};\n${p.a} = ${p.b};\n${p.b} = ${p.tmp};` },
      ],
      tests: (p) => rows([p.a, p.b, p.c], [[1, 2, 3], [5, 9, 4], [0, -1, 1], [10, 20, 30], [-7, 7, 2], [4, 4, 4]], 2, true),
      hints: (p) => ['Une seule variable intermédiaire suffit : elle garde l’ancienne valeur de celle qu’on écrase en premier.', `Sauvegarde \`${p.a}\`, puis écrase les variables dans l’ordre : \`${p.a}\` reçoit \`${p.b}\`, \`${p.b}\` reçoit \`${p.c}\`.`, `int ${p.tmp} = ${p.a}; ${p.a} = ${p.b}; ${p.b} = ${p.c}; ${p.c} = ${p.tmp};`],
    },
    {
      id: 'suivi-solde', label: 'suivre l’évolution d’un solde', difficulty: 2, estimatedMinutes: 9, params,
      statement: (p) => `Les variables entières \`${p.sol}\` (solde d’un compte), \`${p.dep}\` et \`${p.ret}\` (deux montants ≥ 0) sont déjà déclarées et initialisées.\n\nMettez à jour le compte, dans cet ordre :\n\n1. déclarez \`${p.av}\` qui mémorise le solde de départ ;\n2. ajoutez \`${p.dep}\` à \`${p.sol}\` ;\n3. retirez \`${p.ret}\` de \`${p.sol}\` ;\n4. déclarez \`${p.va}\`, la différence entre le solde final et le solde de départ (négative si le compte a perdu de l’argent).\n\nÀ la fin, \`${p.sol}\` contient donc le nouveau solde.`,
      given: (p) => ints(p.sol, p.dep, p.ret), expect: (p) => [{ name: p.av, type: 'int' }, { name: p.sol, type: 'int' }, { name: p.va, type: 'int' }],
      reference: (p) => `int ${p.av} = ${p.sol};\n${p.sol} = ${p.sol} + ${p.dep};\n${p.sol} = ${p.sol} - ${p.ret};\nint ${p.va} = ${p.sol} - ${p.av};`,
      mutants: (p) => [
        { id: 'memorise-trop-tard', label: 'solde de départ mémorisé après les opérations', explanationFr: `\`${p.av}\` doit garder le solde AVANT les opérations : mémorise-le avant de modifier \`${p.sol}\`.`, code: `${p.sol} = ${p.sol} + ${p.dep};\n${p.sol} = ${p.sol} - ${p.ret};\nint ${p.av} = ${p.sol};\nint ${p.va} = ${p.sol} - ${p.av};` },
        { id: 'retrait-ajoute', label: 'le retrait est ajouté', explanationFr: `Un retrait diminue le solde : \`${p.sol} - ${p.ret}\`.`, code: `int ${p.av} = ${p.sol};\n${p.sol} = ${p.sol} + ${p.dep};\n${p.sol} = ${p.sol} + ${p.ret};\nint ${p.va} = ${p.sol} - ${p.av};` },
        { id: 'difference-inversee', label: 'différence départ − final', explanationFr: 'La variation est « final moins départ » : positive si le compte a gagné de l’argent.', code: `int ${p.av} = ${p.sol};\n${p.sol} = ${p.sol} + ${p.dep};\n${p.sol} = ${p.sol} - ${p.ret};\nint ${p.va} = ${p.av} - ${p.sol};` },
      ],
      tests: (p) => rows([p.sol, p.dep, p.ret], [[100, 50, 20], [0, 30, 40], [250, 0, 0], [40, 15, 90], [-10, 5, 5], [20, 10, 30]], 2, true),
      hints: (p) => ['Les instructions s’exécutent dans l’ordre : une valeur doit être mémorisée avant d’être modifiée.', `Écris d’abord \`int ${p.av} = ${p.sol};\`, puis modifie \`${p.sol}\` en deux affectations, puis calcule la différence.`, `int ${p.av} = ${p.sol}; ${p.sol} = ${p.sol} + ${p.dep}; ${p.sol} = ${p.sol} - ${p.ret}; int ${p.va} = ${p.sol} - ${p.av};`],
    },
    {
      id: 'deux-rangs', label: 'faire avancer une suite de deux rangs', difficulty: 3, estimatedMinutes: 10, params,
      valid: (p) => new Set([p.pre, p.cou, p.suiv]).size === 3,
      statement: (p) => `Les variables entières \`${p.pre}\` et \`${p.cou}\` contiennent deux termes consécutifs d’une suite où chaque terme est la **somme des deux précédents** (comme Fibonacci).\n\nFaites avancer la suite de **deux rangs** sans boucle : à la fin, \`${p.pre}\` et \`${p.cou}\` doivent contenir les deux termes consécutifs situés deux rangs plus loin.\n\nExemple : \`${p.pre}\` = 2 et \`${p.cou}\` = 3 → les termes suivants sont 5 puis 8, donc à la fin \`${p.pre}\` = 5 et \`${p.cou}\` = 8.`,
      given: (p) => ints(p.pre, p.cou), expect: (p) => mod(p.pre, p.cou),
      reference: (p) => `int ${p.suiv} = ${p.pre} + ${p.cou};\n${p.pre} = ${p.cou};\n${p.cou} = ${p.suiv};\n${p.suiv} = ${p.pre} + ${p.cou};\n${p.pre} = ${p.cou};\n${p.cou} = ${p.suiv};`,
      mutants: (p) => [
        { id: 'un-seul-rang', label: 'un seul rang', explanationFr: 'La suite doit avancer de deux rangs : répète la mise à jour une seconde fois.', code: `int ${p.suiv} = ${p.pre} + ${p.cou};\n${p.pre} = ${p.cou};\n${p.cou} = ${p.suiv};` },
        { id: 'ancienne-valeur-perdue', label: 'pre = cou puis cou = pre + cou', explanationFr: `Après \`${p.pre} = ${p.cou};\`, \`${p.pre} + ${p.cou}\` vaut le double de \`${p.cou}\` : calcule la somme AVANT de modifier \`${p.pre}\`.`, code: `${p.pre} = ${p.cou};\n${p.cou} = ${p.pre} + ${p.cou};\n${p.pre} = ${p.cou};\n${p.cou} = ${p.pre} + ${p.cou};` },
        { id: 'trois-rangs', label: 'trois rangs', explanationFr: 'Tu avances trop loin : deux rangs seulement.', code: `int ${p.suiv} = ${p.pre} + ${p.cou};\n${p.pre} = ${p.cou};\n${p.cou} = ${p.suiv};\n${p.suiv} = ${p.pre} + ${p.cou};\n${p.pre} = ${p.cou};\n${p.cou} = ${p.suiv};\n${p.suiv} = ${p.pre} + ${p.cou};\n${p.pre} = ${p.cou};\n${p.cou} = ${p.suiv};` },
      ],
      tests: (p) => rows([p.pre, p.cou], [[2, 3], [0, 1], [1, 1], [5, 8], [13, 21], [3, 7]], 2, true),
      hints: (p) => ['Pour avancer d’un rang : le nouveau terme est la somme des deux derniers, puis les deux variables « glissent » d’un cran.', `Calcule d’abord \`int ${p.suiv} = ${p.pre} + ${p.cou};\`, puis \`${p.pre} = ${p.cou};\` et \`${p.cou} = ${p.suiv};\`. Recommence une fois.`, `int ${p.suiv} = ${p.pre} + ${p.cou}; ${p.pre} = ${p.cou}; ${p.cou} = ${p.suiv}; puis les mêmes trois lignes une seconde fois (le calcul de ${p.suiv} sans le « int »).`],
    },
  ],
};
export default family;
