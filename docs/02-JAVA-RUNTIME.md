# Environnement Java, fidélité Schooding et correction automatique

## 1. Ce que fait Schooding (constaté le 16/11/2026, session de Mathias, lecture seule)

- L'étudiant n'écrit **qu'un fragment** (onglet `MAIN`, id DOM `code_1_MAIN`) ; les variables d'entrée sont **déjà déclarées et initialisées** par la plateforme (ex. `str`, `radius`, `numerator`, `v1..v4`, `hauteur`, `largeur`).
- La plateforme vérifie ensuite :
  1. la **valeur de variables** que l'étudiant doit déclarer/modifier (`area`, `mean`, `result`, `time`, `numerator`…), et/ou
  2. la **sortie** produite par `affiche(String)` (une ligne par appel), et/ou
  3. un **état graphique** : dessin (`rectangle`, `isoTriangle`, `setFillColor`), grille (`fillCase`, `setFillColor`), personnage « Runner » (`moveUp/Down/Left/Right`).
- `debug(TYPE)` écrit dans une sortie de debug **non notée**.
- Les outils disponibles **varient par exercice** (rubrique « Outils ») : ex. `pgcd(int,int)` seulement en « Simplification de fraction », constante `PI` en « Aire d'un disque ».
- Détail révélateur : `rectangle(0, 100, width = 300, height = 200);` compile sur Schooding ⇒ des variables `width` et `height` existent dans l'environnement des exercices de dessin.
- Les énoncés sont bilingues (`$TR$en … $TR$fr …`) ; on garde le français.
- Les tests internes Schooding ne sont **pas** accessibles ⇒ nos tests sont **créés par IPA Studio** et étiquetés comme tels (`origin: "ipa-studio"`).

## 2. Modes d'exercice (champ `kind`)

| kind | L'étudiant écrit | Le gabarit fournit | Vérification |
|---|---|---|---|
| `snippet` (défaut Schooding) | quelques instructions | variables d'entrée, outils | variables capturées + sorties `affiche` |
| `drawing` | instructions de dessin | `width`, `height`, outils de dessin | raster de la toile (comparaison exacte pixel/couleur) |
| `grid` | instructions `fillCase` | `largeur`, `hauteur`, outils grille | état final de la grille |
| `runner` | déplacements (± boucles) | carte, outils de déplacement | position finale = arrivée, aucune case rouge touchée |
| `members` | méthodes `static` complètes | classe englobante | appels de méthodes par les tests |
| `program` | classe complète avec `main` | rien | `System.out` + stdin |

Les DST et entraînements générés utilisent `snippet`, `grid` et `members`/`program` uniquement si la notion est au programme (méthodes écrites par l'étudiant : **pas encore introduites** au 16/11/2026).

## 3. Gabarit de compilation (`snippet`) — une seule compilation pour tous les tests

```java
// Fichier généré : Exercice.java  (l'étudiant ne le voit pas)
import java.util.*;
public class Exercice extends __Env {            // __Env = outils de CET exercice uniquement
  static void __run(String str /* entrées déclarées dans l'ordre de inputs */) {
    // ---- début code étudiant (ligne N0) ----
    <code de l'étudiant tel quel>
    // ---- fin code étudiant ----
    ;__Cap.v("taille", taille);                   // une capture par variable attendue
  }
  public static void main(String[] a) {           // pilote : boucle sur les cas de test
    __Driver.begin();
    __Driver.test("t1"); try { __run("Bonjour"); } catch (Throwable e) { __Driver.fail(e); } __Driver.end();
    __Driver.test("t2"); try { __run("ab"); }      catch (Throwable e) { __Driver.fail(e); } __Driver.end();
  }
}
```

- Les entrées sont des **paramètres** (modifiables comme sur Schooding, ex. `numerator = numerator / p;`).
- Variable attendue non déclarée ⇒ erreur ECJ « X cannot be resolved » ⇒ traduite : « La variable `area` demandée n'est pas déclarée. »
- `__Driver.test()` réinitialise l'environnement (sorties, grille, toile, runner) **et** l'échéance `Guard.deadline` **par test** (timeout par test : 2 s par défaut, 5 s total).
- Le pilote renvoie au JS un JSON : par test `{captures, affiche[], debug[], grid?, canvas?, runner?, exception?, timedOut, ms}`.
- Le décalage `N0` permet de reporter les erreurs de compilation **sur les lignes de l'étudiant**.
- Si le code de l'étudiant se termine par `return;`, la capture devient inaccessible ⇒ message dédié.

## 4. Registre des outils (`src/java/tools/`)

Chaque outil = `{ id, signature, descriptionFr, javaSource, renderer? }`. Le gabarit compose `__Env` avec **uniquement** les outils listés par l'exercice ⇒ appeler `fillCase` hors exercice de grille donne « The method fillCase(int, int) is undefined », comme sur Schooding.

| id | Signature | Implémentation |
|---|---|---|
| `affiche` | `void affiche(String message)` | ajoute une ligne à `out` |
| `debug` | `void debug(T value)` surcharges `int,long,double,float,char,boolean,String,Object` | ajoute à `dbg` (non noté) |
| `PI` | `static final double PI` | `3.1415926536` (10 décimales, comme l'outil Schooding) |
| `pgcd` | `int pgcd(int a, int b)` | Euclide sur valeurs absolues |
| `setFillColor` | `void setFillColor(String color)` | couleurs autorisées : `white, black, red, green, blue, yellow, orange, brown, gray, pink, purple, cyan` (à confirmer sur Schooding au 1ᵉʳ import — **hypothèse**) |
| `rectangle` | `void rectangle(int x, int y, int width, int height)` | remplissage sur toile `int[height][width]` |
| `isoTriangle` | `void isoTriangle(int x, int y, int width, int height)` | pointe vers le bas, hauteur négative ⇒ vers le haut ; remplissage par balayage |
| `fillCase` | `void fillCase(int x, int y)` | colorie la case (x = colonne, y = ligne, origine en haut à gauche) ; hors grille ⇒ exception explicite |
| `moveUp/Down/Left/Right` | `void moveX()` | déplace le personnage ; enregistre le chemin |
| variables `width`, `height` | `static int` | dimensions de la toile (défaut 300×300 — **hypothèse** à vérifier visuellement) |

Rendu : `CanvasView` (toile), `GridView` (grille), `RunnerView` (carte + animation du chemin), partagés entre exécution et correction.

**Runner** : les cartes Schooding ne sont visibles qu'en exécutant sur Schooding (non fait, lecture seule). IPA Studio dessine **ses propres cartes** (étiquetées « carte IPA Studio »), conformes aux énoncés (ex. « Coude », « Les 4 coins », positions aléatoires ⇒ cartes paramétrées).

## 5. Vérification et notation d'un exercice

- Types de cas : `public` (affichés, entrées + attendu visibles), `hidden` (résultat ✓/✗ seulement), `edge` (cas limites : vide, 1 élément, négatif, bornes).
- Comparateurs :
  - entier/booléen/char/String : égalité exacte ;
  - réel : `|a−b| ≤ 1e-6·max(1,|b|)` ;
  - tableaux : longueur + éléments (récursif pour 2D) ;
  - sortie `affiche` : ligne à ligne ; options par exercice `trimLines` (défaut vrai), `ignoreTrailingEmptyLines` (vrai), `caseSensitive` (vrai) ;
  - grille/toile : égalité exacte de l'état final ; runner : arrivée atteinte ∧ aucune case interdite.
- Deux programmes différents mais équivalents passent : on ne compare **jamais** le code source à la référence.
- Score d'un exercice = `Σ poids des tests réussis / Σ poids` (public 1, hidden 2, edge 2 par défaut). Erreur de compilation ⇒ 0. Timeout/exception sur un test ⇒ ce test échoue, les autres comptent.
- Statut : `réussi` (100 %), `partiel`, `échoué`, `erreur de compilation`.

## 6. Diagnostics pédagogiques fiables (sans IA)

Ordre d'affichage :
1. **Compilation** : message FR (table ADR-09) + ligne + extrait.
2. **Exécution** : exception traduite (`ArrayIndexOutOfBounds` → « Tu accèdes à une case qui n'existe pas : indices valides de 0 à length−1 »), timeout (« boucle qui ne s'arrête pas ? vérifie la mise à jour de la variable de boucle »).
3. **Résultat faux** : diff attendu/obtenu par test public.
4. **Empreinte de mutant** (ADR-06) : si, sur tous les tests échoués, la sortie de l'étudiant = celle d'un mutant nommé de la famille, afficher « Ton résultat correspond exactement à l'erreur classique : *…* » + explication rédigée et vérifiée.
5. Jamais d'explication inventée sur le raisonnement de l'étudiant au-delà de ces constats.

## 7. API JS du runner (`src/java/runner.ts`)

```ts
interface JavaRunner {
  warmUp(): Promise<void>;                                  // init CheerpJ + 1 compilation factice
  run(req: RunRequest): Promise<RunResult>;                 // bouton « Exécuter » (tests publics seulement)
  check(req: RunRequest): Promise<CheckResult>;             // bouton « Vérifier » (tous les tests)
  reset(): Promise<void>;                                   // recrée l'iframe si bloquée
}
```
- Le runner vit dans une **iframe same-origin dédiée** (`/runner.html`) ; communication `postMessage` ; une seule requête à la fois (file d'attente).
- Délai de garde JS : `timeoutTotal + 5 s` ⇒ `reset()` et résultat `{ kind: "runner-crash" }`.
- Fichiers servis : `/java/ecj.jar`, `/java/stub-rt.jar`, `/java/asm.jar`, `/java/ipa-harness.jar` (avec en-têtes `Accept-Ranges`, OK sur GitHub Pages).
- Préchauffage lancé après le premier rendu de l'appli (idle callback) ; état visible dans la barre « Java : prêt ✓ ».

## 8. Harnais Java (`java/harness`, compilé au build)

À partir du prototype validé `proto/harness/src/ipa/Harness.java` :
- `Harness.check(String filesPacked, String mainClass, int perTestTimeoutMs, int totalTimeoutMs) → String JSON`
- `Guard` (ASM, déjà validé), `__Driver`, `__Cap` (surcharges par type, tableaux sérialisés en JSON), outils dans `ipa.tools.*` mais **recopiés en source** dans `__Env` par exercice (pour la liste blanche).
- Sortie standard limitée à 200 Ko, `affiche` limité à 10 000 lignes ⇒ « sortie trop longue ».
- Classes interdites au niveau bytecode (vérif ASM au chargement) : `java/lang/Thread`, `java/lang/reflect`, `java/lang/Runtime`, `java/lang/ProcessBuilder`, `java/net/*` ⇒ « Instruction non autorisée dans cet exercice » (défense en profondeur ; le stub les filtre déjà partiellement).
