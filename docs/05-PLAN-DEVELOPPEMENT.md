# Plan de développement (phase Sonnet) — architecture, tâches, critères

## 1. Arborescence cible

```
ipa-studio/
├─ README.md                    état du projet, démarrage, règles « zéro dépense »
├─ docs/                        décisions (01–05) — lire avant toute modification
├─ contracts/                   bank.ts (types), firestore.rules (règles)
├─ proto/                       prototypes VALIDÉS (harnais Java, stub, page de test CheerpJ)
├─ java/
│  ├─ harness/src/ipa/          Harness, Guard, Driver, Cap, outils (from proto)
│  └─ build.sh                  javac --release 17 → public/java/ipa-harness.jar ; Stub → stub-rt.jar
├─ bank/
│  ├─ families/*.ts             FamilyDefinition (40 familles v1)
│  ├─ schooding/                (VIDE dans le dépôt public — contenu en Firestore)
│  └─ build/                    validate.ts : génère pools, exécute références (JDK local), mutants
├─ content/fiches/N01…N20.md    fiches de cours originales
├─ public/
│  ├─ java/                     ecj.jar, stub-rt.jar, asm.jar, ipa-harness.jar
│  ├─ runner.html               iframe d'exécution CheerpJ
│  └─ bank/v{version}/          manifest.json, pools/{familyId}.json, hints/…, solutions/… (chargés après remise)
├─ src/
│  ├─ types/                    = contracts/bank.ts
│  ├─ java/                     runner.ts (postMessage), template.ts (gabarits), compare.ts, ecjMessagesFr.ts, errorTags.ts
│  ├─ engine/                   rng.ts, compose.ts (DST), barème.ts, mastery.ts, weakness.ts
│  ├─ data/                     firebase.ts, repo.ts (Firestore + IndexedDB, mode hors quota), bankLoader.ts
│  ├─ features/                 dashboard, tp, training, dst, history, progress, fiches, settings, admin-import
│  ├─ components/               CodeEditor (CodeMirror 6), ExerciseView, ResultsPanel, GridView, CanvasView, RunnerView, Timer, HintPanel, ClaudePromptButton
│  └─ app/                      routes, layout (sidebar desktop / bottom-nav mobile), thème
├─ tests/                       unit (Vitest), rules (émulateur), e2e (Playwright)
└─ .github/workflows/           ci.yml (tests) + pages.yml (déploiement GitHub Pages)
```

## 2. Modèle Firestore

| Chemin | Contenu | Écritures typiques |
|---|---|---|
| `config/admins` `{uids: [...]}` · `config/cohort` `{code}` | réglages (console uniquement) | 0 |
| `users/{uid}` | `displayName, createdAt, settings{theme, editorFont, asOfSession}, cohort, inviteCode` | rare |
| `users/{uid}/drafts/{exerciseKey}` | `code, updatedAt` | ≤ 1 / 30 s pendant l'édition |
| `users/{uid}/attempts/{autoId}` | `Attempt` | 1 par « Vérifier » |
| `users/{uid}/dsts/{dstId}` | `DstSubject` + `status, startedAt(serverTimestamp), submittedAt, answers{key: code}, results, grade` | ~1 / 30 s pendant l'épreuve |
| `users/{uid}/stats/mastery` | `{ [NotionId]: NotionMastery }`, `errorTagCounts`, `totals` | 1 par tentative |
| `users/{uid}/progress/tp` | `{ [exerciseKey]: {status, bestScore, timeSec, attempts} }` | 1 par tentative |
| `schooding/{bankVersion}/exercises/{key}` | `Exercise` complet (énoncé original, tests, référence) | import admin |
| `imports/{importId}` | rapport d'import (date, ajouts, modifs, notions, tests) | import admin |
| `stats/{variantKey}` | `n, sumLogSec` | 1 par réussite |

Lecture du tableau de bord = 3 documents (`users/{uid}`, `stats/mastery`, `progress/tp`) + 5 dernières tentatives ⇒ peu coûteux.

## 3. Écrans (desktop : barre latérale ; mobile : barre d'onglets en bas)
Tableau de bord · TP Schooding · Entraînement ciblé · DST global · Historique · Progression · Fiches de cours · Paramètres (+ Admin import si admin).
**Vue exercice** : desktop = énoncé/outils à gauche, éditeur à droite, résultats en panneau repliable sous l'éditeur ; mobile = 3 onglets **Énoncé / Code / Résultats** avec bascule automatique sur Résultats après exécution, barre d'outils de saisie (`{ } ; ( ) [ ] " < > = + -`, Tab) au-dessus du clavier.
Thème sombre par défaut, clair en option ; tailles tactiles ≥ 44 px ; animations ≤ 150 ms, `prefers-reduced-motion` respecté.

## 4. Pipeline de build (CI GitHub Actions, gratuit pour dépôt public)
1. `java/build.sh` (JDK 17 du runner GitHub) → jars.
2. `bank/build/validate.ts` : pour chaque famille × variante × N graines (N = 40 par défaut) : générer, compiler la référence avec le **même gabarit** que le navigateur (javac/ECJ local), exécuter, calculer `expected`, rejeter les invalides, exiger que **chaque mutant échoue ≥ 1 test** et que les tests publics ne suffisent pas à valider un mutant trivial, dédoublonner (hash des paramètres) ⇒ écrire les pools + rapport `bank-report.json`. La CI échoue si une famille a < 10 variantes valides par difficulté déclarée.
3. Vitest + tests de règles (émulateur Firestore) + Playwright (Chrome headless, CheerpJ réel).
4. Déploiement Pages si tout est vert.

## 5. Import Schooding (initial puis hebdomadaire)
1. Export JSON produit dans le Chrome de Mathias (lecture seule, format `ipa-schooding-export-*.json` : `sessions[]`, `exercises[]{schoodingId, session, order, section, title, statement, tools[], studentSavedCode}`).
2. Script `bank/build/import-schooding.ts` (local, avec JDK) : parse, nettoie, classe en notions (règles §3 du doc 03 + validation manuelle), déduit `givenVariables`/`expectedVariables` depuis l'énoncé (**revue humaine obligatoire**, affichée en tableau), écrit/valide référence + tests, génère `Exercise` complets ; diff avec la version précédente (ajouts, modifs d'énoncé par hash, suppressions jamais appliquées : marquées `retired`).
3. Upload via la page **/admin/import** (connecté en admin) ⇒ `schooding/{newVersion}/exercises/…` + `imports/{id}`, puis bascule du pointeur `schooding/current {version}` (Firestore, privé). Les familles inédites suivent le même principe via `public/bank/current.json` (déploiement). Retour arrière = repointer vers la version précédente (les versions ne sont jamais effacées).
4. Les progressions sont indexées par `exerciseKey` stable (`sch-{id}`, clés de variantes immuables) ⇒ **aucune perte** à l'import.
5. Nouvelles notions ⇒ ajout au catalogue + familles inédites correspondantes (≥ 2) avant publication. Rapport présenté à Mathias, **publication seulement après sa validation**.

## 6. Mise en place côté Mathias (guidée pas à pas en phase 2)
1. **Firebase** (compte Google, sans carte) : créer le projet « ipa-studio » → *ne pas* activer Google Analytics → ajouter une appli Web → copier la config → Authentication : activer E-mail/mot de passe + Google → Firestore : créer la base (mode production, région `eur3` ou `europe-west1`) → coller les règles → créer `config/admins` (son uid) et `config/cohort` (code d'invitation choisi). Vérifier que le plan affiché est **Spark**.
2. **GitHub** (gratuit) : compte, dépôt public `ipa-studio`, autoriser Claude (add_repo, accès push) ; activer Pages (source : GitHub Actions) ; ajouter le domaine `<pseudo>.github.io` dans Firebase Auth → domaines autorisés.
3. Partage : lien `https://<pseudo>.github.io/ipa-studio/` + code d'invitation communiqué aux camarades hors du site.

## 7. Ordre des tâches (chaque tâche : code + tests + coche dans `docs/STATUS.md`)

| # | Tâche | Dépend de | Définition de « terminé » |
|---|---|---|---|
| T1 | Squelette Vite/React/TS strict/Tailwind, routes, layout responsive, thème | — | build OK, Lighthouse mobile ≥ 90 accessibilité |
| T2 | Harnais Java définitif (Driver, Cap, outils, garde-classes) + `build.sh` | proto | tests Java locaux (JUnit simple ou script) verts |
| T3 | Runner iframe + gabarits + comparateurs + messages FR + tags d'erreur | T2 | E2E : test C, timeout, erreurs compil/exéc. |
| T4 | Éditeur CodeMirror (Java, lint, autocomplétion outils, barre mobile) + vues Grid/Canvas/Runner | T1 | E2E mobile (viewport iPhone) et desktop |
| T5 | Firebase : Auth (e-mail, Google), profil, code d'invitation, repo local+distant, mode hors quota | T1 | tests de règles émulateur (test A) |
| T6 | Import des 79 exercices Schooding (script + revue + page admin) | T3, T5 | test B sur ≥ 10 exercices représentatifs (snippet, dessin, grille, runner, tableaux, String) |
| T7 | Moteur : rng, familles (10 d'abord, puis 40), validate.ts, pools | T2 | rapport banque : 0 variante invalide, mutants tous tués |
| T8 | Compositeur DST + barème + solveur durée | T7 | tests D, E, F, G automatisés (Vitest, 1 000 graines) |
| T9 | Écrans DST examen/assisté, minuteur, sauvegarde, remise, bilan, indices | T8, T4, T5 | tests H, I, J (E2E) |
| T10 | Maîtrise, tableau de bord, progression, historique, faiblesses | T5, T9 | tests unitaires du modèle + E2E |
| T11 | Fiches de cours N01–N20 | — | relues, liées aux exercices |
| T12 | Bouton Claude + export bilan | T9 | prompt conforme (contenu exigé §7 du cahier) |
| T13 | PWA, préchauffage Java, perfs | T3 | 2ᵉ visite : Java prêt < 10 s |
| T14 | CI + déploiement Pages + guide de mise en place | tout | test K (autre appareil), test L (audit dépendances) |
| T15 | Mettre à jour la tâche du lundi (`trig_01BWh7UWgLxsxkGuzrnDa54Y`) avec l'URL du dépôt et la procédure d'import | T6, T14 | test N |

## 8. Critères d'acceptation → preuve attendue

| Test | Preuve |
|---|---|
| A Comptes séparés | tests de règles émulateur (lecture croisée refusée) + E2E deux comptes |
| B Exercice fidèle | 10 exercices importés : outils exacts, variables pré-déclarées, starter, mêmes consignes |
| C Exécution Java | E2E : programme conditions+boucles+tableaux+méthode exécuté et noté (déjà prouvé en prototype) |
| D Entraînement ciblé | Vitest : 1 000 configs aléatoires ⇒ sujet valide, notions respectées |
| E DST 2 h | Vitest : 8–15 exercices, Σ ∈ [102 ; 120] min, pour les 3 niveaux |
| F Difficulté croissante | Vitest : non-décroissance + écart ≥ 1 pour tous niveaux/durées |
| G DST global | Vitest : ≥ 5 notions distinctes, aucune notion de séance > asOfSession |
| H Mode examen | E2E : aucun indice/solution/test caché dans le DOM ni chargé (réseau) avant remise |
| I Mode assisté | E2E : 3 niveaux d'indice, pénalités affichées avant lancement et appliquées |
| J Historique | E2E : fermeture/réouverture ⇒ codes, résultats, DST retrouvés |
| K Partage | vérification manuelle sur 2ᵉ appareil (téléphone de Mathias) |
| L Zéro paiement | audit : Spark, GitHub Free, CheerpJ Community, aucune clé payante ; `npm ls` sans service payant |
| M Mise à jour | import d'un TP fictif ⇒ anciens exercices et progressions intacts, retour arrière OK |
| N Tâche programmée | `list_triggers` montre la tâche, prochaine exécution lundi 8 h 50 Paris |

## 9. Risques et signaux de « retour vers Opus »
Revenir temporairement à Opus si :
- un nouveau TP exige une syntaxe Java > 8 (ex. `var`, `record`) ⇒ chantier image `jrt` pour ECJ ;
- CheerpJ change de licence/version/CDN ou casse le runner ;
- le solveur de durée ne respecte plus E/F après ajout de familles ;
- Firestore approche des quotas (≥ 70 % sur une journée) ⇒ revoir la stratégie de sauvegarde ;
- un type d'exercice Schooding inédit apparaît (nouvel outil graphique, fonctions écrites par l'étudiant, classes) ⇒ concevoir le nouveau `kind` ;
- le modèle de maîtrise donne des résultats aberrants sur données réelles.
