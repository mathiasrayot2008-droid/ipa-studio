# Programme IPA, analyse Schooding et banque d'exercices

## 1. Séances Schooding (cours 725, relevé du 16/11/2026)

| # | id Schooding | Titre | Échéance | Exercices codés | QCM |
|---|---|---|---|---|---|
| 1 | 8469 | Variables et opérations arithmétiques | 18/09/2026 12:00 | 8 (dont 1 DM) | 490 |
| 2 | 8470 | Appels de fonctions | 19/09/2026 20:00 | 7 (2 DM) | 515 |
| 3 | 8471 | Traitements conditionnels 1 | 26/09/2026 | 11 (1 DM) | 528 |
| 4 | 8472 | Traitements conditionnels 2 | 03/10/2026 | 7 (2 DM) | 535 |
| 5 | 8473 | Boucles 1 | 10/10/2026 | 9 (1 DM) | 544 |
| 6 | 8474 | Boucles 2 | 17/10/2026 | 13 (7 DM) | — |
| 7 | 8475 | Tableaux 1 | 24/10/2026 | 8 (2 DM) | 570 |
| 8 | 8476 | Tableaux 2 | 07/11/2026 | 9 (4 DM) | 577 |
| 9 | 8477 | Chaînes de caractères 1 | 21/11/2026 | 7 (1 DM) | 596 |

Total : **79 exercices Java** + 8 QCM (les QCM ne sont pas utilisés dans les DST). Données complètes : export `ipa-schooding-export-2026-11-16.json` (énoncés FR, outils, code enregistré de Mathias) — **à importer en phase 2** (cf. 05 §Import). URL d'un exercice : `/codingtest/{id}/` ; d'une séance : `/session/{id}/`.

Constats de fidélité : fragments sans classe ; entrées pré-déclarées ; vérification par variables / `affiche` / état graphique ; outils propres à chaque exercice ; séance 6 entièrement en grilles `fillCase` ; « Messages du compilateur » (4466, 4484) = exercices de **lecture d'erreurs** (code fourni volontairement faux) ⇒ notre table FR des messages ECJ est pédagogiquement centrale.

## 2. Notions (introduites dans l'ordre réel du cours)

| Notion | Séance | Sous-notions | Prérequis |
|---|---|---|---|
| N01 Variables et types | 1 | déclaration, `int/double/boolean/char/String`, affectation, `debug` | — |
| N02 Expressions arithmétiques | 1 | `/` entière vs réelle, `%`, cast `(int)`, priorité, `Math.sqrt/abs` | N01 |
| N03 Appels de fonctions | 2 | appel avec arguments, valeur de retour, procédures (dessin, Runner) | N01 |
| N04 if / else | 3 | if, if-else, bloc | N02 |
| N05 Logique et comparaisons | 3 | `== != < <= > >=`, `&& \|\| !`, `char` comparés | N04 |
| N06 switch | 4 | `switch` sur int/char/String, `break`, `default` | N04 |
| N07 Conditions en cascade | 4 | `else if`, imbrication, tranches | N04, N05 |
| N08 Boucle for | 5 | compteur, bornes, pas | N04 |
| N09 Boucle while | 5 | condition d'arrêt, do-while | N04, N05 |
| N10 Accumulateurs et compteurs | 5 | somme, produit, comptage, drapeau booléen | N08 |
| N11 Boucles imbriquées | 6 | double boucle, dépendance i/j | N08 |
| N12 Grille et coordonnées | 6 | (x,y), `largeur/hauteur`, conditions géométriques (bord, diagonale, centre, parité) | N11, N05 |
| N13 Tableaux : bases | 7 | `new int[n]`, littéraux, `length`, accès, indices | N08 |
| N14 Parcours de tableau | 7 | affichage, inverse, min/max, recherche, test de tri, cumul | N13, N10 |
| N15 Construction de tableaux | 8 | ajout fin/début, insertion avec décalage, concaténation, suppression de doublons | N14 |
| N16 Tableaux 2D | 8 | `int[][]`, `t.length`/`t[i].length`, init, Pascal | N13, N11 |
| N17 Aplatissement / transposition | 8 | indice `i*l+j`, `k/l`, `k%l`, transposée | N16 |
| N18 String : bases | 9 | `length()`, `charAt`, concaténation, conversion `""+x` | N01 |
| N19 String : parcours | 9 | comptage de caractères, voyelles, mots (espaces), acronyme | N18, N10 |
| N20 String : comparaison | 9 | `equals` vs `==`, `equalsIgnoreCase`, règles de jeu | N18, N07 |

« Fonctions et méthodes écrites par l'étudiant » : **pas encore au programme** (S2 = appels seulement) ⇒ notion réservée `N21` ajoutée automatiquement à l'import de la séance qui l'introduit. Aucun sujet ne l'utilise avant.

**Éligibilité DST** : une notion est éligible si sa séance ≤ `config.asOfSession` (par défaut la dernière séance importée ; l'utilisateur peut la baisser : « je n'ai pas encore fait la séance 9 »).

## 3. Classement des 79 exercices Schooding (id → notions, difficulté estimée 1–5)

| Séance | Exercices (id : titre → notion principale [+secondaires], difficulté) |
|---|---|
| 1 | 2940 Déclarations → N01, 1 · 4464 Aire d'un disque et debug → N02, 1 · 4466 Messages du compilateur → N01, 1 · 493 Moyenne de 4 valeurs → N02, 1 · 494 Partie non entière → N02, 2 · 6634 Polynôme degré 2 → N02, 1 · 2938 Conversion horaires → N02, 1 · 2939 Conversions horaires 2 (DM) → N02, 2 |
| 2 | 488 Simplification de fraction → N03 [N02], 1 · 482 Tracé de maison → N03, 1 · 491 Runner premiers pas → N03, 1 · 492 Runner coude → N03, 1 · 483 Maison décalée → N03 [N02], 2 · 513 Tracé de lettres (DM) → N03, 2 · 514 Tracé d'horloge (DM) → N03 [N02], 3 |
| 3 | 517 Valeur absolue → N04, 1 · 519 Parité → N04 [N02], 1 · 516 Minimum de 2 → N04, 1 · 2937 Max de 4 (*) → N04 [N07], 2 · 2936 Sorte de caractère (*) → N05, 2 · 2935 Salutations (*) → N05 [N04], 2 · 2934 Mention au Bac (*) → N07, 2 · 525 Dimensions rectangle → N04, 2 · 527 Point dans rectangle → N05, 2 · 526 Runner 4 coins → N04 [N03], 2 · 2931 Racines polynôme (DM) → N07 [N02], 3 |
| 4 | 524 Calculatrice → N06, 2 · 531 IMC (*) → N07, 2 · 530 Franchise d'assurance → N07 [N05], 3 · 2933 Intersection de cercles (*) → N05 [N02], 3 · 533 Tranches d'imposition (*) → N07 [N02], 3 · 2932 Plus court segment (DM) → N07 [N02], 3 · 529 Tracé de T-shirt (DM) → N03 [N04], 2 |
| 5 | 539 Compte à rebours → N08, 1 · 540 Puissance → N08 [N10], 2 · 542 Factorielle → N08 [N10], 2 · 541 Table de multiplication (*) → N08, 2 · 536 Runner Ouest → N09, 2 · 537 Runner Nord-Ouest → N09, 2 · 538 Runner positions aléatoires → N09 [N04], 3 · 543 Primalité (*) → N09 [N10, N05], 3 · 545 Chaud ou froid (DM) → N09 [N04], 3 |
| 6 | 4484 Messages du compilateur 2 → N08, 1 · 546 Ligne → N12 [N08], 1 · 547 Plus (*) → N12, 2 · 549 Cadre (*) → N12 [N11], 3 · 551 En 4 (*) → N12 [N11], 3 · 553 Barres → N12 [N11, N02], 3 · DM : 550 Damier, 548 Cadre épais, 554 Barres épaisses, 555 Diagonale, 552 Cadres imbriqués, 556 Sablier, 557 Anneau → N12 [N11, N05], 3–5 |
| 7 | 558 Déclaration de tableaux → N13, 1 · 559 Accès aux éléments → N13, 1 · 561 Affichage → N14, 1 · 562 Affichage inverse → N14, 2 · 563 Minimum → N14 [N10], 2 · 566 Tableau trié ? → N14 [N05], 3 · 560 Recherche (DM) → N14, 2 · 569 Tableau intégral (DM) → N14 [N10], 3 |
| 8 | 564 Ajout en fin → N15, 2 · 565 Ajout en début → N15, 2 · 567 Insertion → N15, 3 · 571 Concaténation → N15, 3 · 573 Init tableau 2D → N16, 2 · 568 Doublons (DM) → N15 [N11], 4 · 575 Transposée (DM) → N17 [N16], 3 · 576 Aplatissement (DM) → N17, 3 · 574 Pascal (DM) → N16 [N11], 4 |
| 9 | 592 Accès aux caractères → N18, 1 · 589 Table de multiplication v2 → N18 [N08], 2 · 590 Occurrences d'un caractère → N19, 2 · 591 Voyelles (*) → N19 [N05], 3 · 593 Nombre de mots (*) → N19, 3 · 594 Acronyme → N19, 3 · 595 Pierre-Ciseau-Papier (DM) → N20 [N07], 3 |

Les difficultés sont **estimées** (titre + statut « (*) » = exercice d'approfondissement + DM) ; elles seront recalibrées avec les temps réels médians (§6).
Les codes enregistrés par Mathias sont des **tentatives**, pas des corrections : chaque solution de référence sera réécrite et validée par les tests.

## 4. Familles d'exercices inédits (catalogue cible v1 : 40 familles, ~3 variantes chacune)

Principe : une variante change **l'algorithme, la structure des données ou une contrainte**, pas seulement les noms/nombres. Chaque famille porte au moins **2 mutants nommés**.

| Famille | Notion(s) | Variantes (transformations algorithmiques) | Diff. |
|---|---|---|---|
| `convUnites` | N02 | sec→h/min/s ; jours→semaines+jours ; centimes→€/c ; pieds/pouces | 1–2 |
| `formuleReelle` | N02 | moyenne pondérée ; TTC/HT ; distance 2 points ; aire couronne (PI) | 1–2 |
| `chiffres` | N02 | somme des chiffres d'un nombre à 3 chiffres ; inverse ; chiffre des centaines | 2 |
| `fraction` | N03 N02 | simplifier ; additionner deux fractions (pgcd) ; fraction irréductible ? | 1–3 |
| `dessinScene` | N03 | maison, drapeau, robot à partir de formes ; version décalée par (dx,dy) | 1–3 |
| `runnerChemin` | N03→N09 | séquence fixe ; avec boucles ; carte paramétrée (position de départ variable) | 1–3 |
| `classerValeur` | N04 N07 | signe ; parité ; catégorie d'âge ; mention ; tranche tarifaire | 1–3 |
| `minMaxN` | N04 N07 | min de 2, max de 3, médiane de 3, 2ᵉ plus grand de 4 | 1–3 |
| `pointZone` | N05 | point dans rectangle ; dans cercle ; sur un bord ; dans l'intersection de 2 rectangles | 2–3 |
| `annee` | N05 | bissextile ; date valide (j/m/a) ; jours dans le mois | 2–4 |
| `caractere` | N05 | chiffre/lettre/autre ; majuscule→minuscule par calcul ; voyelle ? | 2 |
| `switchMenu` | N06 | calculatrice ; jour de la semaine ; nombre de jours d'un mois ; conversion note→lettre | 2–3 |
| `tranches` | N07 N02 | impôt progressif ; tarif dégressif ; frais de port à paliers | 3–4 |
| `racines2` | N07 N02 | nombre de racines ; racines affichées ; cas a = 0 | 3 |
| `accumulation` | N08 N10 | somme 1..n ; somme des pairs ; produit ; somme des carrés ; somme des multiples de k < n | 1–3 |
| `puissanceFact` | N08 N10 | a^n ; n! ; C(n,k) sans débordement ; suite arithmético-géométrique | 2–3 |
| `diviseurs` | N09 N10 | premier ? ; nombre de diviseurs ; nombre parfait ; pgcd par soustractions | 3–4 |
| `suiteWhile` | N09 | Syracuse (nb d'étapes) ; seuil de doublement ; nombre de chiffres | 2–3 |
| `tableMult` | N08 | table de k ; table de k à l'envers ; seulement les multiples pairs ; format `k x i = r` | 1–2 |
| `motifTexte` | N11 | triangle d'étoiles ; rectangle creux ; escalier ; damier texte | 2–4 |
| `grilleMotif` | N12 N11 | ligne/colonne centrale ; bords ; diagonales ; damier ; croix ; cadre d'épaisseur e ; anneau | 1–5 |
| `tabDeclAcces` | N13 | créer/remplir ; premier/dernier ; échanger deux cases ; indice valide ? | 1–2 |
| `tabStat` | N14 N10 | min ; max et indice ; moyenne ; nb d'éléments > seuil ; somme des positifs | 1–3 |
| `tabRecherche` | N14 | présence ; 1er indice ; dernier indice ; nb d'occurrences | 2–3 |
| `tabOrdre` | N14 N05 | trié croissant ? ; strictement ? ; monotone ? ; nb de « descentes » | 2–3 |
| `tabAffiche` | N14 | affichage ; inverse ; un sur deux ; format `[a, b, c]` | 1–2 |
| `tabCumul` | N14 N10 | tableau intégral (préfixes) ; différences successives ; moyenne glissante | 3 |
| `tabInsertion` | N15 | ajout fin ; ajout début ; insertion à l'indice k ; suppression à k | 2–3 |
| `tabFusion` | N15 | concaténation ; entrelacement ; inverser dans un nouveau tableau | 2–3 |
| `tabFiltre` | N15 N10 | garder les pairs ; supprimer une valeur ; doublons | 3–4 |
| `tab2DInit` | N16 | table de multiplication 2D ; identité ; damier 0/1 ; somme des lignes | 2–3 |
| `tab2DParcours` | N16 N11 | somme d'une colonne ; max global ; diagonale ; matrice symétrique ? | 2–4 |
| `aplatir` | N17 | 2D→1D ligne par ligne ; colonne par colonne ; 1D→2D (k/l, k%l) ; transposée | 3–4 |
| `pascal` | N16 N11 | triangle de Pascal ; coefficient (n,k) via tableau ; ligne n seulement | 4 |
| `strAcces` | N18 | longueur/1er/dernier/k-ième ; milieu ; caractère symétrique | 1–2 |
| `strCompte` | N19 | occurrences d'un caractère ; voyelles ; chiffres ; majuscules | 2–3 |
| `strMots` | N19 | nombre de mots ; plus long mot (longueur) ; acronyme ; initiales | 3–4 |
| `strTransforme` | N19 | inverser ; palindrome ? ; remplacer un caractère ; supprimer les espaces | 2–4 |
| `strJeu` | N20 N07 | pierre-feuille-ciseaux ; comparaison de mots ; mot de passe valide ? | 3 |
| `combo` | ≥2 notions | (S7+) compter dans un tableau de String ; grille depuis un tableau ; stats sur chaînes | 3–5 |

### Exemple de famille complètement spécifiée — `strCompte`, variante `count-char` (d2) et `count-vowels` (d3)

- **Paramètres** : `s` (String, 0–30 caractères, alphabet `a-z A-Z espaces ponctuation`), `c` (char présent 0–5 fois), nom de variable résultat tiré dans `{nb, compteur, occ}`.
- **Énoncé** (modèle 1) : « On vous fournit une chaîne `s` et un caractère `c`, déjà déclarés. Déclarez une variable entière `nb` contenant le nombre d'occurrences de `c` dans `s`. »
- **Référence** :
  ```java
  int nb = 0;
  for (int i = 0; i < s.length(); i++) { if (s.charAt(i) == c) { nb++; } }
  ```
- **Mutants** : `off-by-one-start` (`i = 1`) « tu ignores le premier caractère » ; `off-by-one-end` (`i <= s.length()-1-1`) « tu ignores le dernier caractère » ; `case` (comparaison insensible) ; `string-equals` (`==` remplacé, variante String).
- **Tests** : 2 publics (cas typique, absence), 3 cachés (c en 1ʳᵉ et dernière position, répétitions consécutives, majuscule ≠ minuscule), 1 limite (`s = ""`).
- **Indices** : 1 « Il faut examiner chaque caractère de `s` un par un. » 2 « Une boucle `for` de 0 à `s.length()-1` avec `s.charAt(i)` ; un compteur initialisé à 0 augmente quand le caractère vaut `c`. » 3 « Structure : `int nb = 0; for (…) { if (s.charAt(i) == c) { … } }` — complète les `…`. »
- **Variante `count-vowels`** (transformation de l'algorithme : ensemble de caractères au lieu d'un seul, test via `"aeiouy".indexOf(ch) >= 0` ou chaîne de `||`), mutant `forgot-uppercase`, `forgot-y`.

## 5. Fiches de cours (une par notion)
Structure fixe : *L'essentiel* (5–8 puces) · *Syntaxe Java* (bloc de code) · *Erreurs fréquentes* (3–5, reliées aux mutants/tags d'erreur) · *Exemples expliqués* (1–2) · *Exercices liés* (liens vers TP Schooding + familles). Contenu rédigé en Markdown dans `content/fiches/Nxx.md`, original (pas de copie des slides ESIEE).

## 6. Temps estimés
Barème initial par difficulté (minutes) : d1 = 4, d2 = 7, d3 = 11, d4 = 15, d5 = 20 ; les familles peuvent surcharger. Recalibrage : après ≥ 20 résolutions réussies d'une variante (tous utilisateurs, agrégat anonyme dans `stats/global`), `estimatedMinutes = clamp(moyenne géométrique × 1,1, 0,6×base, 1,8×base)` (agrégat `stats/{variantKey}` : `n`, `sumLogSec`).
