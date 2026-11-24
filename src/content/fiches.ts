import type { NotionId } from '@/types/bank';

/**
 * Fiches de cours (une par notion). Contenu rédigé pour IPA Studio : résumés de méthode, pas des extraits du cours.
 * Tous les exemples de code sont du Java 8 en « fragments » (pas de classe ni de main), comme dans les exercices :
 * les variables « fournies » sont déjà déclarées ; `affiche(...)` produit l'affichage évalué.
 */
export interface Fiche {
  /** Ancre d'URL : « N08 » (voir /fiches#N08). */
  id: string;
  notion: NotionId;
  title: string;
  /** L'essentiel en une ou deux phrases. */
  summary: string;
  /** Markdown simplifié (listes, **gras**, `code`, blocs ```java). */
  body: string;
}

export const FICHES: Fiche[] = [
  {
    id: 'N01', notion: 'N01-variables-types', title: 'Variables et types',
    summary: 'Une variable a un type, un nom et une valeur. On la déclare une fois, puis on l’affecte.',
    body: `**À retenir**

- Types de base : \`int\` (entier), \`double\` (réel), \`boolean\` (vrai/faux), \`char\` (un caractère, entre apostrophes \`'a'\`), \`String\` (texte, entre guillemets \`"abc"\`).
- Déclarer : \`int age;\` — initialiser : \`int age = 18;\` — affecter plus tard : \`age = 19;\`.
- Le signe \`=\` est une **affectation** (« range la valeur de droite dans la variable de gauche »), pas une égalité mathématique.
- On ne déclare une variable qu'**une seule fois** par portée ; on ne l'utilise qu'après lui avoir donné une valeur.
- \`debug(x)\` aide à voir une valeur pendant l'écriture ; \`affiche(...)\` est ce qui est évalué quand l'exercice parle d'affichage.

\`\`\`java
int a = 7;
double moyenne = 12.5;
boolean majeur = true;
char initiale = 'M';
String prenom = "Ada";
a = a + 1;   // a vaut maintenant 8
\`\`\`

**Pièges courants**

- Écrire \`int x = 3.5;\` : un réel ne rentre pas dans un \`int\` (erreur de types).
- Confondre \`'a'\` (char) et \`"a"\` (String).
- Redéclarer une variable déjà fournie par l'énoncé (« variable déjà définie »).`,
  },
  {
    id: 'N02', notion: 'N02-expressions-arith', title: 'Expressions arithmétiques',
    summary: 'Les opérateurs + - * / % suivent les priorités habituelles ; entre deux int, / donne un quotient entier.',
    body: `**À retenir**

- \`7 / 2\` vaut **3** (division entière) ; \`7.0 / 2\` vaut **3.5**. Dès qu'un opérande est réel, le calcul est réel.
- \`%\` donne le **reste** : \`7 % 2\` vaut 1. Utile pour la parité (\`n % 2 == 0\`), les heures/minutes, les chiffres (\`n % 10\` = dernier chiffre).
- Priorités : \`*\`, \`/\`, \`%\` avant \`+\`, \`-\` ; les parenthèses forcent l'ordre.
- Conversion : \`(int) 3.9\` vaut 3 (troncature, pas arrondi) ; \`(double) a / b\` convertit **avant** de diviser.
- Outils : \`sqrt(x)\`, \`PI\`, \`pgcd(a, b)\`, \`distance(x1, y1, x2, y2)\` selon l'exercice.

\`\`\`java
int secondes = 3725;
int h = secondes / 3600;          // 1
int m = (secondes % 3600) / 60;   // 2
int s = secondes % 60;            // 5
double moy = (double) (a + b) / 2;
\`\`\`

**Pièges courants**

- \`(double) (a / b)\` : la division entière a déjà eu lieu. Écris \`(double) a / b\`.
- Oublier les parenthèses : \`a + b / 2\` n'est pas la moyenne.`,
  },
  {
    id: 'N03', notion: 'N03-appels-fonctions', title: 'Appels de fonctions',
    summary: 'Appeler une fonction = écrire son nom et lui donner des arguments dans le bon ordre ; certaines renvoient une valeur.',
    body: `**À retenir**

- Une fonction se **reçoit** déjà écrite : on l'appelle avec \`nom(arguments);\`. L'ordre et le nombre des arguments comptent (voir la signature dans l'énoncé).
- Procédure (rien en retour) : \`rectangle(10, 20, 50, 30);\`, \`moveRight();\`.
- Fonction qui **renvoie** une valeur : on la récupère \`double d = distance(0, 0, 3, 4);\` ou on l'utilise directement dans un calcul.
- Dessin : l'origine est en haut à gauche, x croît vers la droite, y vers le **bas**. \`setFillColor("red")\` change la couleur des formes suivantes.
- Robot (Runner) : \`moveUp()\`, \`moveDown()\`, \`moveLeft()\`, \`moveRight()\` déplacent d'une case ; l'ordre des appels trace le chemin.

\`\`\`java
setFillColor("blue");
rectangle(50, 100, 80, 60);      // x, y, largeur, hauteur
isoTriangle(50, 60, 80, 40);
int g = pgcd(36, 24);            // 12
\`\`\`

**Pièges courants**

- Intervertir largeur et hauteur, ou x et y.
- Oublier le \`;\` ou les parenthèses vides : \`moveUp\` seul n'appelle rien.`,
  },
  {
    id: 'N04', notion: 'N04-if-else', title: 'if / else',
    summary: 'if exécute un bloc seulement si la condition est vraie ; else traite le cas contraire.',
    body: `**À retenir**

- Forme : \`if (condition) { ... } else { ... }\`. La condition est un **boolean**.
- Toujours mettre des **accolades**, même pour une seule instruction : elles évitent des erreurs d'inattention.
- Une variable déclarée **dans** un bloc n'existe pas en dehors. Si on en a besoin après, on la déclare avant le \`if\` :

\`\`\`java
int abs;
if (x < 0) {
    abs = -x;
} else {
    abs = x;
}
\`\`\`

- Sans \`else\`, rien ne se passe quand la condition est fausse : pense à initialiser la variable avant.

**Pièges courants**

- \`if (x = 3)\` : \`=\` affecte, \`==\` compare.
- Un \`;\` juste après la parenthèse du \`if\` : le bloc devient indépendant de la condition.`,
  },
  {
    id: 'N05', notion: 'N05-logique-comparaisons', title: 'Logique et comparaisons',
    summary: 'Les comparaisons produisent des boolean ; && (et), || (ou), ! (non) les combinent.',
    body: `**À retenir**

- Comparaisons : \`==  !=  <  <=  >  >=\`. Pour les \`char\` : \`'a' <= c && c <= 'z'\` teste une minuscule (les caractères sont ordonnés).
- \`&&\` : vrai si **les deux** sont vrais ; \`||\` : vrai si **au moins un** est vrai ; \`!\` : inverse.
- Intervalle : \`0 <= x && x <= 10\` (on n'écrit pas \`0 <= x <= 10\`).
- Lois de De Morgan : \`!(a && b)\` ⇔ \`!a || !b\` ; \`!(a || b)\` ⇔ \`!a && !b\`.
- Un boolean s'affecte directement : \`boolean pair = n % 2 == 0;\` (inutile de passer par un if).

\`\`\`java
boolean dansRectangle = x >= x0 && x < x0 + l && y >= y0 && y < y0 + h;
boolean voyelle = c == 'a' || c == 'e' || c == 'i' || c == 'o' || c == 'u';
\`\`\`

**Pièges courants**

- \`c == 'a' || 'e'\` : chaque comparaison doit être complète.
- Bornes : \`<\` ou \`<=\` ? Teste toujours la valeur limite.`,
  },
  {
    id: 'N06', notion: 'N06-switch', title: 'switch',
    summary: 'switch choisit une branche selon la valeur exacte d’un int, char ou String.',
    body: `**À retenir**

\`\`\`java
String nom;
switch (jour) {
    case 1:
        nom = "lundi";
        break;
    case 6:
    case 7:
        nom = "week-end";   // plusieurs cas, même résultat
        break;
    default:
        nom = "inconnu";
}
\`\`\`

- \`break\` termine la branche. **Sans break**, l'exécution continue dans le cas suivant (« fall-through ») : c'est parfois voulu pour regrouper des cas, souvent un oubli.
- \`default\` traite tous les autres cas ; il peut être omis, mais alors rien n'est affecté si aucun cas ne correspond.
- Les cas sont des valeurs **exactes** (pas d'intervalles) : pour des tranches, utilise des \`if / else if\`.
- Un \`char\` s'écrit entre apostrophes : \`case 'a':\`.

**Pièges courants**

- Oublier un \`break\`, ou oublier que le dernier cas n'en a pas besoin.
- Compter à partir de 0 alors que l'énoncé numérote à partir de 1.`,
  },
  {
    id: 'N07', notion: 'N07-conditions-cascades', title: 'Conditions en cascade',
    summary: 'Pour des tranches, on enchaîne if / else if / else, du seuil le plus petit au plus grand.',
    body: `**À retenir**

\`\`\`java
String mention;
if (note < 10) {
    mention = "insuffisant";
} else if (note < 12) {
    mention = "passable";
} else if (note < 14) {
    mention = "assez bien";
} else {
    mention = "bien";
}
\`\`\`

- Chaque \`else if\` sait déjà que les tests précédents sont **faux** : pas besoin de répéter \`note >= 10 &&\`.
- Ordre des tests : du plus petit seuil au plus grand (ou l'inverse), jamais dans le désordre.
- Des \`if\` **indépendants** (sans else) peuvent être vrais plusieurs fois : le dernier gagne. Pour des tranches exclusives, utilise \`else if\`.
- Imbrication : un \`if\` dans un \`if\` pour deux critères ; une condition combinée avec \`&&\` est souvent plus lisible.

**Pièges courants**

- Frontières mal placées (\`<\` / \`<=\`) : teste 9, 10, 11, 12 pour voir.
- Oublier le \`else\` final : une variable peut rester non initialisée.`,
  },
  {
    id: 'N08', notion: 'N08-boucle-for', title: 'Boucle for',
    summary: 'for répète un bloc un nombre de fois connu, avec un compteur qui évolue à chaque tour.',
    body: `**À retenir**

\`\`\`java
for (int i = 0; i < n; i++) {
    // corps : s'exécute pour i = 0, 1, ..., n-1
}
\`\`\`

- Trois parties : **initialisation** (\`int i = 0\`), **condition** (\`i < n\`, testée avant chaque tour), **mise à jour** (\`i++\`, après chaque tour).
- \`i < n\` fait **n** tours à partir de 0 ; \`i <= n\` en fait n + 1.
- Compter à rebours : \`for (int i = n; i >= 1; i--)\` ; avancer de 2 : \`i += 2\`.
- La variable du compteur n'existe que dans la boucle.
- Pour savoir ce que fait une boucle, déroule-la à la main sur 2 ou 3 tours.

**Pièges courants**

- Borne décalée d'un cran (« off-by-one ») : \`<\` contre \`<=\`.
- Modifier le compteur dans le corps de la boucle.
- Initialiser un accumulateur **dans** la boucle (il est remis à zéro à chaque tour).`,
  },
  {
    id: 'N09', notion: 'N09-boucle-while', title: 'Boucle while',
    summary: 'while répète tant qu’une condition est vraie, quand on ne connaît pas le nombre de tours à l’avance.',
    body: `**À retenir**

\`\`\`java
int n = depart;
int etapes = 0;
while (n != 1) {
    if (n % 2 == 0) { n = n / 2; } else { n = 3 * n + 1; }
    etapes++;
}
\`\`\`

- La condition est testée **avant** chaque tour ; si elle est fausse d'emblée, le corps ne s'exécute jamais.
- \`do { ... } while (condition);\` exécute le corps **au moins une fois** (condition testée après).
- Il faut que quelque chose dans le corps **fasse évoluer** la condition, sinon la boucle ne s'arrête jamais (boucle infinie : l'exécution est interrompue après un délai).
- Choisir : \`for\` si le nombre de tours est connu, \`while\` si on s'arrête sur un événement (trouvé, arrivé, valeur atteinte).

**Pièges courants**

- Oublier de mettre à jour la variable testée.
- Condition inversée : on veut continuer **tant que** ce n'est pas fini.
- Robot (Runner) : \`while (!arrive) ...\` doit contenir un déplacement.`,
  },
  {
    id: 'N10', notion: 'N10-accumulateurs-compteurs', title: 'Accumulateurs et compteurs',
    summary: 'On construit un résultat tour après tour : somme, produit, compte, ou drapeau booléen.',
    body: `**À retenir**

\`\`\`java
int somme = 0;                 // élément neutre de l'addition
for (int i = 1; i <= n; i++) {
    somme = somme + i;         // ou somme += i;
}
int produit = 1;               // élément neutre du produit (pas 0 !)
int pairs = 0;                 // compteur
boolean trouve = false;        // drapeau
\`\`\`

- **Initialiser avant** la boucle : 0 pour une somme ou un compteur, 1 pour un produit, \`false\`/\`true\` pour un drapeau.
- Compter = ajouter 1 quand une condition est vraie : \`if (t[i] % 2 == 0) { pairs++; }\`.
- Drapeau : on le passe à \`true\` dès qu'on a trouvé ; on ne le remet jamais à \`false\` dans la boucle.
- Moyenne : \`(double) somme / n\`.

**Pièges courants**

- Déclarer l'accumulateur à l'intérieur de la boucle.
- Produit initialisé à 0 (tout reste à 0).
- Oublier le cas limite : tableau ou intervalle vide.`,
  },
  {
    id: 'N11', notion: 'N11-boucles-imbriquees', title: 'Boucles imbriquées',
    summary: 'Une boucle dans une boucle parcourt toutes les paires (i, j) : lignes × colonnes.',
    body: `**À retenir**

\`\`\`java
for (int i = 0; i < hauteur; i++) {        // lignes
    for (int j = 0; j < largeur; j++) {    // colonnes
        // exécuté hauteur × largeur fois
    }
}
\`\`\`

- La boucle **intérieure** fait tous ses tours à chaque tour de la boucle extérieure.
- Le nombre total d'exécutions du corps est le **produit** des deux nombres de tours.
- La boucle intérieure peut dépendre de la variable extérieure : \`for (int j = 0; j <= i; j++)\` donne un triangle.
- Utilise deux noms différents (\`i\` et \`j\`) : réutiliser le même nom est une erreur.

**Pièges courants**

- Intervertir lignes et colonnes (x ↔ y).
- Remettre à zéro (ou pas) un compteur au bon niveau : à l'intérieur de la boucle extérieure pour un total **par ligne**.`,
  },
  {
    id: 'N12', notion: 'N12-grille-coordonnees', title: 'Grille et coordonnées',
    summary: 'On colorie une grille case par case avec fillCase(x, y) ; des conditions sur x et y décrivent le motif.',
    body: `**À retenir**

\`\`\`java
for (int y = 0; y < hauteur; y++) {
    for (int x = 0; x < largeur; x++) {
        if (x == 0 || y == 0 || x == largeur - 1 || y == hauteur - 1) {
            fillCase(x, y);               // le cadre
        }
    }
}
\`\`\`

- \`x\` = colonne (vers la droite), \`y\` = ligne (vers le **bas**) ; les indices vont de 0 à \`largeur - 1\` / \`hauteur - 1\`.
- Motifs classiques : bord (\`x == 0 || x == largeur - 1 ...\`), diagonale (\`x == y\`), anti-diagonale (\`x + y == taille - 1\`), damier (\`(x + y) % 2 == 0\`), centre (\`x == largeur / 2\`).
- \`setFillColor("...")\` avant \`fillCase\` choisit la couleur.
- Teste mentalement une petite grille (3×3, 4×5) avant de lancer.

**Pièges courants**

- Dernière case : \`largeur - 1\`, pas \`largeur\`.
- Diviser une taille impaire : \`largeur / 2\` est un quotient entier.`,
  },
  {
    id: 'N13', notion: 'N13-tableaux-bases', title: 'Tableaux : bases',
    summary: 'Un tableau range plusieurs valeurs du même type, repérées par un indice qui commence à 0.',
    body: `**À retenir**

\`\`\`java
int[] t = new int[5];            // 5 cases, toutes à 0
int[] u = {4, 9, 2};             // littéral
t[0] = 10;                        // première case
int dernier = u[u.length - 1];   // length : sans parenthèses !
\`\`\`

- Indices valides : de **0** à \`t.length - 1\`. Sortir de cet intervalle provoque une erreur d'exécution (\`ArrayIndexOutOfBoundsException\`).
- \`length\` est un **champ** pour un tableau (\`t.length\`), alors que pour un String c'est une méthode (\`s.length()\`).
- Valeurs par défaut : 0 (int), 0.0 (double), \`false\` (boolean), \`null\` (String).
- La taille d'un tableau est **fixe** : pour « ajouter », on crée un nouveau tableau plus grand.

**Pièges courants**

- \`t[t.length]\` : une case de trop.
- \`t.length()\` ou \`s.length\` : mauvaise syntaxe selon le type.`,
  },
  {
    id: 'N14', notion: 'N14-parcours-tableau', title: 'Parcours de tableau',
    summary: 'Une boucle for sur l’indice permet d’afficher, de chercher, de compter, de cumuler.',
    body: `**À retenir**

\`\`\`java
int min = t[0];                         // on part d'une vraie valeur du tableau
for (int i = 1; i < t.length; i++) {
    if (t[i] < min) { min = t[i]; }
}

boolean trie = true;                    // tableau trié croissant ?
for (int i = 0; i < t.length - 1; i++) {
    if (t[i] > t[i + 1]) { trie = false; }
}
\`\`\`

- Parcours complet : \`for (int i = 0; i < t.length; i++)\` ; parcours inverse : \`for (int i = t.length - 1; i >= 0; i--)\`.
- Min / max : initialiser avec \`t[0]\` (pas 0 : si toutes les valeurs sont négatives, 0 serait faux).
- Recherche : drapeau \`trouve\`, ou mémoriser l'indice (\`-1\` si absent).
- Comparer deux voisins \`t[i]\` et \`t[i + 1]\` : la boucle s'arrête à \`length - 1\`.

**Pièges courants**

- Dépasser le tableau avec \`t[i + 1]\`.
- Tableau vide : \`t[0]\` n'existe pas.`,
  },
  {
    id: 'N15', notion: 'N15-tableaux-construction', title: 'Construction de tableaux',
    summary: 'Pour ajouter, insérer ou concaténer, on crée un nouveau tableau puis on recopie ce qu’il faut.',
    body: `**À retenir**

\`\`\`java
int[] r = new int[t.length + 1];        // ajout en fin
for (int i = 0; i < t.length; i++) { r[i] = t[i]; }
r[t.length] = v;

int[] ins = new int[t.length + 1];      // insertion de v à l'indice k
for (int i = 0; i < k; i++)            { ins[i] = t[i]; }
ins[k] = v;
for (int i = k; i < t.length; i++)     { ins[i + 1] = t[i]; }
\`\`\`

- Taille du résultat : calcule-la **avant** de créer le tableau.
- Ajout en début : tout est décalé d'un cran (\`r[i + 1] = t[i]\`).
- Concaténation : première boucle pour \`a\`, seconde pour \`b\` avec le décalage \`a.length\`.
- Faire un petit exemple à la main (3 éléments) pour valider les indices avant d'écrire.

**Pièges courants**

- Écraser une valeur en décalant dans le mauvais sens (avec un tableau de même taille, on décale en partant de la **fin**).
- Oublier de recopier la partie après l'insertion.`,
  },
  {
    id: 'N16', notion: 'N16-tableaux-2d', title: 'Tableaux 2D',
    summary: 'int[][] est un tableau de lignes : t[i][j] = ligne i, colonne j ; t.length = nombre de lignes.',
    body: `**À retenir**

\`\`\`java
int[][] m = new int[3][4];               // 3 lignes, 4 colonnes
for (int i = 0; i < m.length; i++) {          // lignes
    for (int j = 0; j < m[i].length; j++) {   // colonnes de la ligne i
        m[i][j] = (i + 1) * (j + 1);
    }
}
int[][] pascal = {{1}, {1, 1}, {1, 2, 1}};   // lignes de longueurs différentes possibles
\`\`\`

- \`m.length\` : nombre de **lignes** ; \`m[i].length\` : nombre de **colonnes** de la ligne i.
- Deux indices, deux boucles imbriquées : la ligne extérieure, la colonne intérieure.
- Somme d'une ligne : un accumulateur remis à 0 au début de chaque ligne.

**Pièges courants**

- Inverser \`m[i][j]\` et \`m[j][i]\`.
- Utiliser \`m.length\` pour les colonnes.`,
  },
  {
    id: 'N17', notion: 'N17-aplatissement-transposition', title: 'Aplatissement et transposition',
    summary: 'Passer d’un tableau 2D à un tableau 1D (indice i × largeur + j) et inversement ; transposer = échanger lignes et colonnes.',
    body: `**À retenir**

\`\`\`java
// aplatir : m (l lignes, c colonnes) -> plat (taille l * c)
for (int i = 0; i < l; i++) {
    for (int j = 0; j < c; j++) {
        plat[i * c + j] = m[i][j];
    }
}
// retrouver ligne et colonne depuis l'indice k :
int ligne = k / c;
int colonne = k % c;
// transposée : t[j][i] = m[i][j]   (t a c lignes et l colonnes)
\`\`\`

- \`i * c + j\` : on saute \`i\` lignes entières de \`c\` cases, puis on avance de \`j\`.
- Dans l'autre sens, \`/\` donne la ligne et \`%\` la colonne (division entière).
- Transposée : le tableau résultat a les dimensions **inversées**.

**Pièges courants**

- Multiplier par le nombre de lignes au lieu du nombre de colonnes.
- Créer la transposée avec les mêmes dimensions que l'original (faux pour un rectangle).`,
  },
  {
    id: 'N18', notion: 'N18-string-bases', title: 'String : bases',
    summary: 'Un String est une suite de caractères : length() donne sa taille, charAt(i) le caractère à l’indice i.',
    body: `**À retenir**

\`\`\`java
String s = "Bonjour";
int n = s.length();         // 7  (avec parenthèses)
char c = s.charAt(0);       // 'B'  (indices de 0 à length() - 1)
String t = s + " " + n;     // concaténation : "Bonjour 7"
String d = "" + 42;         // conversion d'un nombre en texte : "42"
\`\`\`

- Les indices commencent à 0 ; \`s.charAt(s.length())\` provoque une erreur.
- \`+\` entre un texte et autre chose **concatène** ; entre deux nombres il additionne : \`"a" + 1 + 2\` vaut \`"a12"\`, mais \`1 + 2 + "a"\` vaut \`"3a"\`.
- Un String est **immuable** : on ne modifie pas un caractère, on construit un nouveau texte.
- \`char\` entre apostrophes, \`String\` entre guillemets.

**Pièges courants**

- \`s.length\` (sans parenthèses) ou \`s[0]\` : syntaxes de tableau.
- Oublier qu'un caractère est un nombre en coulisse : \`'a' + 1\` vaut 98 (un int).`,
  },
  {
    id: 'N19', notion: 'N19-string-parcours', title: 'String : parcours',
    summary: 'On parcourt un texte avec une boucle sur charAt(i) pour compter, chercher ou construire un résultat.',
    body: `**À retenir**

\`\`\`java
int voyelles = 0;
for (int i = 0; i < s.length(); i++) {
    char c = s.charAt(i);
    if (c == 'a' || c == 'e' || c == 'i' || c == 'o' || c == 'u' || c == 'y') {
        voyelles++;
    }
}
String acronyme = "";
for (int i = 0; i < s.length(); i++) {
    if (i == 0 || s.charAt(i - 1) == ' ') { acronyme += s.charAt(i); }
}
\`\`\`

- Compter les **mots** : un mot commence à un caractère qui n'est pas un espace et dont le précédent est un espace (ou au début).
- Pour construire un texte, on part de \`""\` et on concatène.
- Majuscule/minuscule : \`'A'\` et \`'a'\` sont des caractères différents ; compare les deux ou utilise les intervalles \`'A' <= c && c <= 'Z'\`.

**Pièges courants**

- Compter deux fois un mot quand il y a plusieurs espaces d'affilée.
- Lire \`s.charAt(i - 1)\` quand \`i\` vaut 0.`,
  },
  {
    id: 'N20', notion: 'N20-string-comparaison', title: 'String : comparaison',
    summary: 'On compare le contenu de deux String avec equals, jamais avec ==.',
    body: `**À retenir**

\`\`\`java
boolean memes = a.equals(b);                 // même contenu ?
boolean memesSansCasse = a.equalsIgnoreCase(b);
if (choix.equals("pierre")) { ... }
\`\`\`

- \`==\` compare les **références** (est-ce le même objet ?), pas le contenu : il peut donner \`false\` pour deux textes identiques. Pour les String, utilise toujours \`equals\`.
- Pour un \`char\`, au contraire, \`==\` est correct : \`c == 'a'\`.
- \`equalsIgnoreCase\` ignore la différence majuscule/minuscule.
- Jeux à règles (pierre-ciseau-papier…) : liste les cas gagnants, puis le reste (égalité / perdu) dans un \`else\`.
- Mets la constante d'abord pour éviter une erreur si la variable vaut \`null\` : \`"pierre".equals(choix)\`.

**Pièges courants**

- \`if (a == "oui")\` : à remplacer par \`a.equals("oui")\`.
- Oublier la casse : \`"Oui"\` n'est pas \`"oui"\` pour \`equals\`.`,
  },
  {
    id: 'N21', notion: 'N21-string-transformation', title: 'String : transformation',
    summary: 'On fabrique un nouveau texte avec substring, toUpperCase, toLowerCase, replace ; endsWith teste une terminaison.',
    body: `**À retenir**

\`\`\`java
String s = "bonjour";
String debut = s.substring(0, 1);        // "b"  (de l'indice 0 inclus à 1 exclu)
String reste = s.substring(1);           // "onjour"  (de l'indice 1 jusqu'à la fin)
String maj = s.toUpperCase();            // "BONJOUR"
String min = s.toLowerCase();            // "bonjour"
String capitalise = s.substring(0, 1).toUpperCase() + s.substring(1).toLowerCase();  // "Bonjour"
String leet = s.replace('o', '0');       // "b0nj0ur"
boolean fem = s.endsWith("a");           // false
\`\`\`

- Un String est **immuable** : \`toUpperCase()\`, \`replace\`, \`substring\` ne modifient pas \`s\`, ils **retournent** un nouveau texte. Il faut récupérer le résultat : \`s = s.toUpperCase();\`.
- \`substring(i, j)\` prend de l'indice \`i\` **inclus** à \`j\` **exclu** ; \`substring(i)\` va jusqu'à la fin.
- Pour **inverser** un texte, parcours-le de la fin vers le début (\`i\` de \`length() - 1\` à \`0\`) en ajoutant \`charAt(i)\` à un résultat qui part de \`""\`.
- \`replace(a, b)\` remplace **toutes** les occurrences ; pour plusieurs remplacements, enchaîne-les en réaffectant à chaque fois.
- Quand la casse ne compte pas, passe d'abord tout en minuscules (ou majuscules).

**Pièges courants**

- Écrire \`s.toUpperCase();\` seul : le résultat est perdu.
- \`s.substring(0, 1)\` sur une chaîne vide : erreur ; vérifie la taille avant.
- Confondre \`'a'\` (char) et \`"a"\` (String) : \`replace('a', 'b')\` et \`replace("a", "b")\` existent tous les deux, mais on ne mélange pas.`,
  },
  {
    id: 'N22', notion: 'N22-string-mots', title: 'String : mots et split',
    summary: 'split(" ") découpe une phrase en tableau de mots ; on traite chaque mot puis on reconstruit la phrase.',
    body: `**À retenir**

\`\`\`java
String phrase = "bonjour tout le monde";
String[] mots = phrase.split(" ");        // {"bonjour", "tout", "le", "monde"}
int nb = mots.length;                      // 4
String resultat = "";
for (int i = 0; i < mots.length; i++) {
    String mot = mots[i];
    mot = mot.substring(0, 1).toUpperCase() + mot.substring(1).toLowerCase();
    if (i > 0) { resultat = resultat + " "; }     // espace entre les mots, pas avant le premier
    resultat = resultat + mot;
}
// resultat vaut "Bonjour Tout Le Monde"
\`\`\`

- \`split(" ")\` renvoie un **tableau** de String : \`mots.length\` est le nombre de mots (sans parenthèses), \`mots[i]\` le mot numéro i.
- Pour **reconstruire** une phrase, ajoute un espace avant chaque mot **sauf le premier** (\`if (i > 0)\`).
- Comparer un mot à une liste de mots (interdits, etc.) : une boucle dans une boucle, avec \`equals\` ou \`equalsIgnoreCase\`, jamais \`==\`.
- \`"*".repeat\` n'est pas au programme : fabrique une suite d'étoiles avec une boucle.
- On ne remplace que des **mots entiers** : \`replace\` sur toute la phrase remplacerait aussi des morceaux de mots (« truc » dans « truculent »).

**Pièges courants**

- Oublier de réaffecter le mot modifié au résultat.
- Ajouter l'espace après chaque mot : la phrase finit alors par un espace en trop.
- Utiliser \`mots.length()\` (parenthèses de String) au lieu de \`mots.length\` (tableau).`,
  },
];

export const FICHE_BY_NOTION = new Map(FICHES.map((f) => [f.notion, f]));
