/** Libellés français des étiquettes d'erreur (docs/04 §6). Seules ces étiquettes alimentent « erreurs récurrentes ». */
const LABELS: Record<string, string> = {
  'compile:syntax': 'Erreur de syntaxe (point-virgule, parenthèse, accolade…)',
  'compile:balance': 'Accolades ou parenthèses non appariées',
  'compile:undefined-variable': 'Variable utilisée sans être déclarée',
  'compile:undefined-symbol': 'Nom inconnu (variable, méthode ou classe)',
  'compile:undefined-method': 'Méthode ou outil inexistant',
  'compile:type-mismatch': 'Types incompatibles (ex. double dans un int)',
  'compile:uninitialized': 'Variable utilisée avant d’avoir une valeur',
  'compile:duplicate-variable': 'Variable déclarée deux fois',
  'compile:missing-return': 'return manquant',
  'compile:return-value': 'return mal utilisé',
  'compile:unreachable': 'Code inatteignable',
  'compile:unreachable-end': 'Code qui se termine trop tôt (return)',
  'compile:missing-expected-var': 'Variable demandée non déclarée à la fin',
  'compile:string-quote': 'Guillemets de chaîne mal fermés',
  'compile:char': 'Confusion entre caractère (\') et chaîne (")',
  'compile:bad-operator': 'Opérateur mal utilisé',
  'compile:bad-arguments': 'Arguments d’appel incorrects',
  'compile:length-field': 'length / length() mal utilisé',
  'compile:array-method': 'Méthode utilisée sur un tableau',
  'compile:primitive-method': 'Méthode appelée sur un type simple',
  'compile:switch-type': 'switch sur un type non permis',
  'compile:final': 'Modification d’une constante',
  'compile:static': 'Contexte statique',
  'compile:unhandled-exception': 'Exception non gérée',
  'compile:unknown-type': 'Type inconnu',
  'compile:dead-code': 'Code mort',
  'compile:template': 'Erreur de compilation',
  'compile:other': 'Erreur de compilation',
  'runtime:aioobe': 'Indice de tableau hors limites',
  'runtime:sioobe': 'Indice de chaîne hors limites',
  'runtime:npe': 'Utilisation d’une valeur null',
  'runtime:div-zero': 'Division entière par zéro',
  'runtime:timeout': 'Boucle trop longue ou infinie',
  'runtime:stack': 'Récursion sans fin',
  'runtime:neg-array': 'Taille de tableau négative',
  'runtime:number-format': 'Conversion de nombre impossible',
  'runtime:oom': 'Mémoire insuffisante',
  'runtime:other': 'Erreur d’exécution',
  'output:format': 'Bonne valeur, mauvaise présentation (espaces, casse, ponctuation)',
  'wrong:var-value': 'Mauvaise valeur calculée',
  'wrong:var-type': 'Mauvais type de variable',
  'wrong:var-missing': 'Variable demandée absente',
  'wrong:out': 'Sortie différente de celle attendue',
  'wrong:grid': 'Grille différente de celle attendue',
  'wrong:canvas': 'Dessin différent du dessin attendu',
  'wrong:runner': 'Le robot n’atteint pas la cible',
};

const humanize = (s: string) => s.replace(/[-_]+/g, ' ').replace(/^./, (c) => c.toUpperCase());

export function tagLabel(tag: string): string {
  if (LABELS[tag]) return LABELS[tag]!;
  if (tag.startsWith('mutant:')) return `Erreur courante : ${humanize(tag.split(':').pop() ?? '')}`;
  return tag;
}
/** Étiquettes comptées comme « erreurs récurrentes » : on exclut les artefacts internes. */
export const isCountableTag = (t: string) => t !== 'internal' && t !== 'forbidden';
