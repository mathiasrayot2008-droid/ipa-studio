import type { FamilyDefinition, Rng } from '@/types/bank';
import { names, rows } from './kit';

interface Q { src: string; a: string; b: string; c: string }
const pick = (rng: Rng, srcList: string[], out: string[]): Q => {
  const [src] = names(rng, srcList, 1);
  const [a, b, c] = names(rng, out, 3, [src!]);
  return { src: src!, a: a!, b: b!, c: c! };
};

const family: FamilyDefinition<Q> = {
  id: 'convUnites', title: 'Conversions d’unités', notions: { primary: 'N02-expressions-arith', secondary: [] }, kind: 'snippet',
  variants: [
    {
      id: 'sec-hms', label: 'secondes → h / min / s', difficulty: 1, estimatedMinutes: 5,
      params: (rng) => pick(rng, ['duree', 'total', 'secondes', 'temps'], ['h', 'heures', 'hh', 'm', 'min', 'mm', 's', 'sec', 'ss']),
      valid: (p) => new Set([p.a, p.b, p.c, p.src]).size === 4 && p.a !== p.b,
      statement: (p) => `La variable entière \`${p.src}\` contient une durée exprimée en **secondes**.\n\nDéclarez trois variables entières \`${p.a}\`, \`${p.b}\` et \`${p.c}\` contenant la même durée exprimée en **heures**, **minutes** et **secondes** (les minutes et les secondes sont inférieures à 60).\n\nExemple : 3725 secondes = 1 h 2 min 5 s.`,
      given: (p) => [{ name: p.src, type: 'int', description: 'durée en secondes' }],
      expect: (p) => [{ name: p.a, type: 'int' }, { name: p.b, type: 'int' }, { name: p.c, type: 'int' }],
      reference: (p) => `int ${p.a} = ${p.src} / 3600;\nint ${p.b} = (${p.src} % 3600) / 60;\nint ${p.c} = ${p.src} % 60;`,
      mutants: (p) => [
        { id: 'minutes-non-reduites', label: 'minutes jamais ramenées sous 60', explanationFr: 'Tu divises toute la durée par 60 sans retirer d’abord les heures : il faut d’abord prendre le reste de la division par 3600.', code: `int ${p.a} = ${p.src} / 3600;\nint ${p.b} = ${p.src} / 60;\nint ${p.c} = ${p.src} % 60;` },
        { id: 'secondes-non-reduites', label: 'secondes = reste modulo 3600', explanationFr: 'Les secondes restantes sont le reste de la division par 60, pas par 3600.', code: `int ${p.a} = ${p.src} / 3600;\nint ${p.b} = (${p.src} % 3600) / 60;\nint ${p.c} = ${p.src} % 3600;` },
      ],
      tests: (p) => [...rows([p.src], [[3725], [59], [7322], [3600], [86399], [61], [0]], 2, true)],
      hints: (p) => ['Une heure = 3600 secondes, une minute = 60 secondes. La division entière donne le quotient, le modulo (%) donne le reste.', `Heures : \`${p.src} / 3600\`. Ce qui reste après les heures (\`${p.src} % 3600\`) se découpe ensuite en minutes et en secondes.`, `Minutes : \`(${p.src} % 3600) / 60\`. Secondes : \`${p.src} % 60\`.`],
    },
    {
      id: 'jours-semaines', label: 'jours → semaines et jours', difficulty: 1, estimatedMinutes: 4,
      params: (rng) => pick(rng, ['jours', 'nbJours', 'duree', 'n'], ['semaines', 'sem', 'w', 'reste', 'restants', 'j']),
      valid: (p) => new Set([p.a, p.b, p.src]).size === 3,
      statement: (p) => `La variable entière \`${p.src}\` contient un nombre de **jours**.\n\nDéclarez deux variables entières : \`${p.a}\` (nombre de semaines complètes) et \`${p.b}\` (nombre de jours restants, entre 0 et 6).\n\nExemple : 17 jours = 2 semaines et 3 jours.`,
      given: (p) => [{ name: p.src, type: 'int', description: 'nombre de jours' }],
      expect: (p) => [{ name: p.a, type: 'int' }, { name: p.b, type: 'int' }],
      reference: (p) => `int ${p.a} = ${p.src} / 7;\nint ${p.b} = ${p.src} % 7;`,
      mutants: (p) => [
        { id: 'inverse', label: 'quotient et reste échangés', explanationFr: 'Tu as inversé les deux opérations : / donne les semaines, % donne les jours restants.', code: `int ${p.a} = ${p.src} % 7;\nint ${p.b} = ${p.src} / 7;` },
        { id: 'reste-soustraction', label: 'reste = jours - 7', explanationFr: 'Le reste n’est pas « jours − 7 » : c’est le reste de la division entière par 7.', code: `int ${p.a} = ${p.src} / 7;\nint ${p.b} = ${p.src} - 7;` },
      ],
      tests: (p) => rows([p.src], [[17], [5], [14], [7], [100], [6], [0]], 2, true),
      hints: (p) => ['Une semaine = 7 jours. Quelle opération donne un quotient entier ? Un reste ?', `Semaines : \`${p.src} / 7\` (division entière). Jours restants : \`${p.src} % 7\`.`, `int ${p.a} = ${p.src} / 7; puis int ${p.b} = ${p.src} % 7;`],
    },
    {
      id: 'pouces', label: 'pouces → pieds, pouces et cm', difficulty: 2, estimatedMinutes: 7,
      params: (rng) => ({ src: names(rng, ['pouces', 'taille', 'longueur', 'nbPouces'], 1)[0]!, a: rng.pick(['pieds', 'ft', 'nbPieds']), b: rng.pick(['reste', 'pouRestants', 'pxRestants']), c: rng.pick(['cm', 'centimetres', 'longueurCm']) }),
      statement: (p) => `La variable entière \`${p.src}\` contient une longueur en **pouces** (1 pied = 12 pouces ; 1 pouce = 2,54 cm).\n\nDéclarez :\n\n- \`${p.a}\` (entier) : le nombre de pieds complets ;\n- \`${p.b}\` (entier) : le nombre de pouces restants (entre 0 et 11) ;\n- \`${p.c}\` (réel) : la longueur totale en centimètres.\n\nExemple : 30 pouces = 2 pieds, 6 pouces, soit 76,2 cm.`,
      given: (p) => [{ name: p.src, type: 'int', description: 'longueur en pouces' }],
      expect: (p) => [{ name: p.a, type: 'int' }, { name: p.b, type: 'int' }, { name: p.c, type: 'double' }],
      reference: (p) => `int ${p.a} = ${p.src} / 12;\nint ${p.b} = ${p.src} % 12;\ndouble ${p.c} = ${p.src} * 2.54;`,
      mutants: (p) => [
        { id: 'cm-division-entiere', label: 'centimètres calculés en entiers', explanationFr: 'Avec 2.54 la multiplication est réelle ; si tu écris (int) ou si tu divises des entiers tu perds les décimales.', code: `int ${p.a} = ${p.src} / 12;\nint ${p.b} = ${p.src} % 12;\ndouble ${p.c} = (int) (${p.src} * 2.54);` },
        { id: 'reste-sur-10', label: 'reste modulo 10', explanationFr: 'Un pied vaut 12 pouces : le reste se calcule modulo 12.', code: `int ${p.a} = ${p.src} / 12;\nint ${p.b} = ${p.src} % 10;\ndouble ${p.c} = ${p.src} * 2.54;` },
        { id: 'cm-sur-reste', label: 'cm calculés sur le reste seulement', explanationFr: 'Les centimètres concernent toute la longueur, pas seulement les pouces restants.', code: `int ${p.a} = ${p.src} / 12;\nint ${p.b} = ${p.src} % 12;\ndouble ${p.c} = ${p.b} * 2.54;` },
      ],
      tests: (p) => [...rows([p.src], [[30], [11], [12], [100], [1], [24], [0]], 2, true)],
      hints: (p) => ['Deux problèmes distincts : découper en pieds et pouces (division entière et modulo), puis convertir en centimètres (multiplication par un réel).', `Pieds : \`${p.src} / 12\`, pouces restants : \`${p.src} % 12\`. Les centimètres se calculent sur la longueur totale.`, `double ${p.c} = ${p.src} * 2.54; — la constante 2.54 rend le calcul réel.`],
    },
  ],
};
export default family;
