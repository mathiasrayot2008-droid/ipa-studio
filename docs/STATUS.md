# Suivi d'avancement

| # | Tâche | Statut | Preuve / remarque |
|---|---|---|---|
| P1 | Analyse Schooding (9 séances, 79 exercices, outils) | ✅ Opus | export JSON téléchargé, à joindre |
| P2 | Prototype exécution Java (CheerpJ + ECJ + ASM) | ✅ Opus | 4 tests réels OK, cf. 01-DECISIONS ADR-01 |
| P3 | Stub JDK 1,3 Mo validé dans CheerpJ | ✅ Opus | compilation + exécution OK |
| P4 | Architecture, contrats, règles, moteur DST, maîtrise | ✅ Opus | docs 01–05, contracts/ |
| P5 | Solveur de durée simulé (15 min → 3 h, 3 niveaux) | ✅ Opus | tableau doc 04 §3 |
| P6 | Tâche programmée du lundi | ✅ créée | trig_01BWh7UWgLxsxkGuzrnDa54Y, lundi 8 h 50 Paris ; « Require this computer » à activer |
| T1 | Squelette (Vite/React/TS/Tailwind, thème sombre par défaut, responsive) | ✅ Sonnet | tests unitaires thème/mise en page |
| T2–T3 | Harnais Java (ECJ+ASM, garde boucles/API interdites) + notation fonctionnelle | ✅ Sonnet | E2E « Java réel dans le navigateur = JVM locale » (11 cas), boucle infinie stoppée |
| T4 | Éditeur CodeMirror + vue exercice (bureau + mobile) | ✅ Sonnet | E2E desktop 1280×800 et mobile 390×844 |
| T5 | Comptes et stockage (local invité / Firestore), règles de sécurité, brouillons, tentatives | ✅ Sonnet | 17 tests émulateur (règles + dépôt), **test A E2E** : 2 comptes isolés, brouillon, tentative, cohorte, reconnexion. Non testé : Google réel et projet Firebase réel (config `null` → mode local) |
| T6 | Import des 79 exercices Schooding | ✅ Sonnet | 79 exercices / 9 séances en banque privée (`private/`, git-ignorée) : 55 fragments, 5 dessins, 7 runners, 12 grilles. Fidélité vérifiée, pas affirmée : 73/73 codes d'étudiants intacts réussissent à 100 % ; 1 écart documenté (539, espaces de « 321 GO ! »). Classes : exact / éléments recréés / reconstitués (513, 529) / énoncé seul (4484, non corrigeable). **Test B** (Chrome réel + vrai Java) : import par l'interface, 12 exercices de 4 types : code de départ jamais « Réussi », solution de référence toujours « Réussi ». Banque versionnée, import réversible (diff, activation, retour arrière, journal), progression jamais touchée (tests unitaires + règles Firestore : 27 tests) |
| T7–T15 | DST, écrans, fiches, PWA, CI/déploiement, audit zéro dépense, tests A–N | ⏳ à faire | voir 05-PLAN §7 |

## Limites connues à ce stade (honnêteté)
- Premier compile Java ≈ 20–28 s (préchauffage en arrière-plan) ; syntaxe Java 8 uniquement.
- Palette de couleurs `setFillColor` = hypothèse (12 couleurs), à confirmer.
- Les tests/schémas/cartes Runner de Schooding ne sont pas dans l'export : recréés par IPA Studio (provenance affichée).
- Les tests cachés sont lisibles côté client (limite assumée d'une appli sans serveur).
- Projet Firebase réel et dépôt GitHub : pas encore créés (actions de Mathias) ; tâche du lundi : activer « Require this computer ».
- Banque Schooding : énoncés/tests/solutions NON publiés dans le dépôt (privés). Chaque étudiant de la cohorte les reçoit depuis Firestore une fois que l'administrateur les a publiés ; sans cela, import d'un fichier sur l'appareil.
- Bundle Firebase non découpé (avertissement Vite) : à traiter en T13.
