import type { Notion, NotionId } from '@/types/bank';

const n = (id: NotionId, label: string, sessionNumber: number, prerequisites: NotionId[], subs: string[]): Notion => ({
  id, label, sessionNumber, prerequisites, cheatSheetId: id.slice(0, 3),
  subNotions: subs.map((s) => ({ id: `${id.slice(0, 3)}:${s}`, label: s })),
});

/** Programme IPA (docs/03 §2), dans l'ordre réel du cours. */
export const NOTIONS: Notion[] = [
  n('N01-variables-types', 'Variables et types', 1, [], ['déclaration', 'types de base', 'affectation']),
  n('N02-expressions-arith', 'Expressions arithmétiques', 1, ['N01-variables-types'], ['division entière', 'modulo', 'cast', 'priorité des opérateurs']),
  n('N03-appels-fonctions', 'Appels de fonctions', 2, ['N01-variables-types'], ['arguments', 'valeur de retour', 'dessin et Runner']),
  n('N04-if-else', 'if / else', 3, ['N02-expressions-arith'], ['if', 'if-else', 'blocs']),
  n('N05-logique-comparaisons', 'Logique et comparaisons', 3, ['N04-if-else'], ['comparaisons', 'et / ou / non', 'char']),
  n('N06-switch', 'switch', 4, ['N04-if-else'], ['switch', 'break', 'default']),
  n('N07-conditions-cascades', 'Conditions en cascade', 4, ['N04-if-else', 'N05-logique-comparaisons'], ['else if', 'imbrication', 'tranches']),
  n('N08-boucle-for', 'Boucle for', 5, ['N04-if-else'], ['compteur', 'bornes', 'pas']),
  n('N09-boucle-while', 'Boucle while', 5, ['N04-if-else', 'N05-logique-comparaisons'], ['condition d’arrêt', 'do-while']),
  n('N10-accumulateurs-compteurs', 'Accumulateurs et compteurs', 5, ['N08-boucle-for'], ['somme', 'produit', 'comptage', 'drapeau']),
  n('N11-boucles-imbriquees', 'Boucles imbriquées', 6, ['N08-boucle-for'], ['double boucle', 'dépendance i/j']),
  n('N12-grille-coordonnees', 'Grille et coordonnées', 6, ['N11-boucles-imbriquees', 'N05-logique-comparaisons'], ['bords', 'diagonales', 'centre', 'parité']),
  n('N13-tableaux-bases', 'Tableaux : bases', 7, ['N08-boucle-for'], ['création', 'length', 'accès', 'indices']),
  n('N14-parcours-tableau', 'Parcours de tableau', 7, ['N13-tableaux-bases', 'N10-accumulateurs-compteurs'], ['affichage', 'min/max', 'recherche', 'cumul']),
  n('N15-tableaux-construction', 'Construction de tableaux', 8, ['N14-parcours-tableau'], ['ajout', 'insertion', 'concaténation', 'doublons']),
  n('N16-tableaux-2d', 'Tableaux 2D', 8, ['N13-tableaux-bases', 'N11-boucles-imbriquees'], ['int[][]', 'dimensions', 'initialisation']),
  n('N17-aplatissement-transposition', 'Aplatissement et transposition', 8, ['N16-tableaux-2d'], ['indice i*l+j', 'transposée']),
  n('N18-string-bases', 'String : bases', 9, ['N01-variables-types'], ['length', 'charAt', 'concaténation']),
  n('N19-string-parcours', 'String : parcours', 9, ['N18-string-bases', 'N10-accumulateurs-compteurs'], ['comptage', 'mots', 'acronyme']),
  n('N20-string-comparaison', 'String : comparaison', 9, ['N18-string-bases', 'N07-conditions-cascades'], ['equals', 'equalsIgnoreCase']),
];

export const NOTION_BY_ID = new Map(NOTIONS.map((x) => [x.id, x]));
export const NOTION_SESSION: Record<NotionId, number> = Object.fromEntries(NOTIONS.map((x) => [x.id, x.sessionNumber])) as Record<NotionId, number>;
export const SUBNOTION_OWNER: Record<string, NotionId> = Object.fromEntries(NOTIONS.flatMap((x) => x.subNotions.map((s) => [s.id, x.id] as const)));
