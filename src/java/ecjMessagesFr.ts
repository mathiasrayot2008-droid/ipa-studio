/**
 * Traduction des messages ECJ les plus fréquents (ADR-09). Le message original reste affiché en dessous.
 * Chaque règle : motif sur le message anglais → { fr, hint }. Les groupes capturés alimentent le texte.
 */
export interface FrMessage { fr: string; hint?: string; tag: string }

interface Rule { re: RegExp; make: (m: RegExpMatchArray) => FrMessage }

const q = (s: string | undefined) => `« ${s} »`;

const RULES: Rule[] = [
  { re: /^Syntax error on token "(.*?)", (.*) expected( after this token)?$/, make: (m) => ({ tag: 'compile:syntax', fr: `Erreur de syntaxe près de ${q(m[1])} : ${m[2] === ';' ? 'il manque probablement un point-virgule' : `${q(m[2])} était attendu`}${m[3] ? ' juste après' : ''}.`, hint: 'Regarde la fin de la ligne précédente : un « ; » ou une parenthèse manque souvent là.' }) },
  { re: /^Syntax error, insert "(.*?)" to complete (.*)$/, make: (m) => ({ tag: 'compile:syntax', fr: `Erreur de syntaxe : il faut ajouter ${q(m[1])} pour terminer ${frConstruct(m[2] ?? "")}.` }) },
  { re: /^Syntax error on token "(.*?)", delete this token$/, make: (m) => ({ tag: 'compile:syntax', fr: `Le symbole ${q(m[1])} est de trop ici.` }) },
  { re: /^Syntax error on tokens, (.*)$/, make: () => ({ tag: 'compile:syntax', fr: 'Erreur de syntaxe : la structure de cette instruction est incorrecte.', hint: 'Relis l’instruction : parenthèses, point-virgule, mots-clés.' }) },
  { re: /^(.*) cannot be resolved to a variable$/, make: (m) => ({ tag: 'compile:undefined-variable', fr: `La variable ${q(m[1])} n'existe pas (pas déclarée, mal orthographiée, ou déclarée dans un bloc { } qui est déjà fermé).`, hint: 'Java distingue majuscules et minuscules : vérifie l’orthographe exacte.' }) },
  { re: /^(.*) cannot be resolved$/, make: (m) => ({ tag: 'compile:undefined-symbol', fr: `${q(m[1])} est inconnu : variable non déclarée, type ou classe inexistant.` }) },
  { re: /^(.*) cannot be resolved to a type$/, make: (m) => ({ tag: 'compile:unknown-type', fr: `Le type ${q(m[1])} n'existe pas.`, hint: 'Les types de base s’écrivent int, double, boolean, char ; String commence par une majuscule.' }) },
  { re: /^The method (.*)\((.*)\) is undefined for the type (.*)$/, make: (m) => ({ tag: 'compile:undefined-method', fr: `La méthode ${m[1]}(${m[2]}) n'existe pas pour ${m[3] === 'Exercice' ? 'cet exercice' : `le type ${m[3]}`}.`, hint: m[3] === 'Exercice' ? 'Java distingue majuscules et minuscules : écris le nom exactement comme dans la rubrique « Outils » de l’énoncé (par exemple setFillColor, pas SetFillColor).' : 'Java distingue majuscules et minuscules : vérifie l’orthographe exacte du nom de la méthode.' }) },
  { re: /^The method (.*) in the type (.*) is not applicable for the arguments \((.*)\)$/, make: (m) => ({ tag: 'compile:bad-arguments', fr: `Mauvais arguments pour ${q(m[1])} : tu as passé (${m[3]}).`, hint: 'Compare avec la signature de l’outil : nombre et types des paramètres.' }) },
  { re: /^Type mismatch: cannot convert from (.*) to (.*)$/, make: (m) => ({ tag: 'compile:type-mismatch', fr: `Types incompatibles : impossible de ranger un ${m[1]} dans un ${m[2]}.`, hint: m[1] === 'double' && m[2] === 'int' ? 'Pour garder la partie entière, utilise un cast : (int) valeur.' : undefined }) },
  { re: /^Duplicate local variable (.*)$/, make: (m) => ({ tag: 'compile:duplicate-variable', fr: `La variable ${q(m[1])} est déjà déclarée. On ne déclare une variable qu'une fois ; pour changer sa valeur, écris simplement ${m[1]} = …;`, hint: 'Si elle fait partie des variables fournies par l’énoncé, ne la redéclare pas.' }) },
  { re: /^The local variable (.*) may not have been initialized$/, make: (m) => ({ tag: 'compile:uninitialized', fr: `La variable ${q(m[1])} est utilisée avant d'avoir reçu une valeur.` }) },
  { re: /^Unreachable code$/, make: () => ({ tag: 'compile:unreachable', fr: 'Cette instruction ne sera jamais exécutée (après un return, un break ou une boucle infinie).' }) },
  { re: /^Void methods cannot return a value$/, make: () => ({ tag: 'compile:return-value', fr: 'Ici on ne peut pas retourner de valeur avec return.' }) },
  { re: /^Cannot make a static reference to the non-static (.*)$/, make: (m) => ({ tag: 'compile:static', fr: `On ne peut pas utiliser ${q(m[1])} depuis ici (contexte statique).` }) },
  { re: /^The operator (.*) is undefined for the argument type\(s\) (.*)$/, make: (m) => ({ tag: 'compile:bad-operator', fr: `L'opérateur ${q(m[1])} ne s'applique pas à des valeurs de type ${m[2]}.`, hint: 'Pour comparer des chaînes, utilise equals(), pas ==.' }) },
  { re: /^Incompatible operand types (.*) and (.*)$/, make: (m) => ({ tag: 'compile:bad-operator', fr: `Comparaison impossible entre un ${m[1]} et un ${m[2]}.` }) },
  { re: /^Cannot invoke (.*)\(\) on the primitive type (.*)$/, make: (m) => ({ tag: 'compile:primitive-method', fr: `Un ${m[2]} n'a pas de méthode ${m[1]}() : les types de base ne sont pas des objets.` }) },
  { re: /^Cannot (?:invoke|reference) (.*) on the array type (.*)$/, make: (m) => ({ tag: 'compile:array-method', fr: `Un tableau n'a pas de méthode ${m[1]}. Pour sa taille, utilise la propriété length (sans parenthèses).` }) },
  { re: /^length cannot be resolved or is not a field$/, make: () => ({ tag: 'compile:length-field', fr: 'length n’est pas un champ ici : sur une String on écrit s.length() ; sur un tableau, t.length (sans parenthèses).' }) },
  { re: /^Unhandled exception type (.*)$/, make: (m) => ({ tag: 'compile:unhandled-exception', fr: `Cette instruction peut lever l'exception ${m[1]} qu'il faut traiter (try/catch).` }) },
  { re: /^Invalid character constant$/, make: () => ({ tag: 'compile:char', fr: 'Une constante de type char contient un seul caractère entre apostrophes : \'a\'. Pour plusieurs caractères, utilise des guillemets : "abc".' }) },
  { re: /^String literal is not properly closed by a double-quote$/, make: () => ({ tag: 'compile:string-quote', fr: 'Un guillemet fermant manque : la chaîne de caractères n’est pas terminée sur cette ligne.' }) },
  { re: /^Dead code$/, make: () => ({ tag: 'compile:dead-code', fr: 'Ce code ne sera jamais exécuté.' }) },
  { re: /^(?:Illegal|Invalid) escape sequence/, make: () => ({ tag: 'compile:escape', fr: 'Séquence d’échappement invalide dans une chaîne : pour écrire un guillemet utilise \\" et pour un retour à la ligne \\n.' }) },
  { re: /^The value of the local variable (.*) is not used$/, make: (m) => ({ tag: 'compile:unused', fr: `La variable ${q(m[1])} est déclarée mais jamais utilisée.` }) },
  { re: /^Cannot assign a value to final variable (.*)$/, make: (m) => ({ tag: 'compile:final', fr: `${q(m[1])} est une constante : on ne peut pas modifier sa valeur.` }) },
  { re: /^Cannot switch on a value of type (.*)\./, make: (m) => ({ tag: 'compile:switch-type', fr: `Un switch ne s'applique pas à une valeur de type ${m[1]}.` }) },
  { re: /^Incorrect number of arguments for (.*)/, make: (m) => ({ tag: 'compile:bad-arguments', fr: `Nombre d'arguments incorrect pour ${q(m[1])}.` }) },
  { re: /^The constructor (.*) is undefined$/, make: (m) => ({ tag: 'compile:constructor', fr: `Le constructeur ${q(m[1])} n'existe pas.` }) },
  { re: /^Missing return statement$/, make: () => ({ tag: 'compile:missing-return', fr: 'Il manque un return à la fin.' }) },
];

function frConstruct(c: string): string {
  return c.replace('Statement', 'l’instruction').replace('Expression', 'l’expression').replace('ConstructorHeader', 'l’en-tête').replace('MethodBody', 'le corps de la méthode');
}

export function translateEcj(msg: string): FrMessage {
  const m = msg.trim();
  for (const r of RULES) {
    const x = m.match(r.re);
    if (x) return r.make(x);
  }
  return { tag: 'compile:other', fr: 'Le compilateur refuse ce code (voir le message original ci-dessous).' };
}

/** Traductions d'exceptions d'exécution. */
export function translateException(type: string, msg: string | null): FrMessage {
  const short = type.replace(/^java\.(lang|util)\./, '');
  switch (short) {
    case 'ArrayIndexOutOfBoundsException': {
      const m = msg?.match(/Index (-?\d+) out of bounds for length (\d+)/);
      return { tag: 'runtime:aioobe', fr: m ? `Tu accèdes à la case ${m[1]} d'un tableau qui n'a que ${m[2]} cases (indices valides : 0 à ${Number(m[2]) - 1}).` : 'Tu accèdes à une case de tableau qui n’existe pas (indices valides : 0 à length − 1).', hint: 'Vérifie la condition d’arrêt de ta boucle : < length, pas <= length.' };
    }
    case 'StringIndexOutOfBoundsException': {
      const m = msg?.match(/(?:index|Index) (-?\d+)(?:,| out of bounds for) length (\d+)/i);
      return { tag: 'runtime:sioobe', fr: m ? `Tu demandes le caractère ${m[1]} d'une chaîne qui n'a que ${m[2]} caractères (indices valides : 0 à ${Number(m[2]) - 1}).` : 'Tu demandes un caractère qui n’existe pas dans la chaîne.', hint: 'Premier caractère : charAt(0) ; dernier : charAt(s.length() - 1).' };
    }
    case 'ArithmeticException':
      return { tag: 'runtime:div-zero', fr: 'Division (ou modulo) par zéro avec des entiers.', hint: 'Teste le diviseur avant de diviser.' };
    case 'NullPointerException':
      return { tag: 'runtime:npe', fr: 'Tu utilises une variable qui ne référence rien (null), par exemple un tableau ou une chaîne jamais créé.' };
    case 'NegativeArraySizeException':
      return { tag: 'runtime:neg-array', fr: `Tu crées un tableau de taille négative (${msg ?? '?'}).` };
    case 'StackOverflowError':
      return { tag: 'runtime:stack', fr: 'Pile d’appels pleine : une méthode s’appelle elle-même sans jamais s’arrêter.' };
    case 'OutOfMemoryError':
      return { tag: 'runtime:oom', fr: 'Mémoire épuisée : tableau ou chaîne beaucoup trop grand.' };
    case 'NumberFormatException':
      return { tag: 'runtime:number-format', fr: `Cette chaîne n'est pas un nombre valide (${msg ?? ''}).` };
    case 'IllegalArgumentException':
    case 'IllegalStateException':
    case 'ipa.Guard$Fatal':
      return { tag: 'runtime:env', fr: msg ?? 'Erreur d’exécution.' };
    case 'ipa.Guard$TimeLimit':
      return { tag: 'runtime:timeout', fr: 'Temps limite dépassé : boucle infinie ou calcul trop long ?', hint: 'Vérifie que la variable de ta boucle change bien à chaque tour et que la condition peut devenir fausse.' };
    default:
      return { tag: 'runtime:other', fr: `Exception ${short}${msg ? ' : ' + msg : ''}.` };
  }
}
