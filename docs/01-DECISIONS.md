# IPA Studio 2.0 — Décisions d'architecture (ADR)

> Phase Opus — 16 novembre 2026. Chaque décision indique : contexte, choix, raison, preuve de vérification, conséquences.
> Statut : **VALIDÉ** = testé réellement ; **DÉCIDÉ** = choisi sur sources officielles, à confirmer en phase 2.

---

## ADR-01 — Exécution Java : CheerpJ 5 + compilateur ECJ dans le navigateur — **VALIDÉ**

- **Contexte** : exécuter réellement du Java, gratuitement, sans serveur payant, pour un nombre inconnu d'étudiants.
- **Choix** : JVM OpenJDK 17 en WebAssembly (**CheerpJ 5.0**, chargé depuis `https://cjrtnc.leaningtech.com/5.0/loader.js`) + **ECJ 3.46** (compilateur Eclipse, EPL-2.0) + **ASM 9.8** (BSD) + harnais maison `ipa.Harness`.
- **Pourquoi** : tout tourne chez l'étudiant ⇒ coût serveur nul, isolation naturelle (sandbox du navigateur), vraie compilation `javac`-compatible.
- **Licence** : CheerpJ Community = gratuit pour usage personnel / éducatif, chargé depuis le CDN officiel, sans compteur. Un bandeau « non-commercial » s'affiche. **Interdits** : auto-héberger le runtime CheerpJ, usage commercial.
- **Preuves (Chrome headless, 16/11/2026)** :
  | Test | Résultat |
  |---|---|
  | Conditions + boucles + tableaux 1D/2D + String + méthode | sortie exacte |
  | `int x = "a";` | diagnostic ECJ ligne 1 « Type mismatch… » |
  | `while(true){i++;}` | stoppé à 3 s par `Guard`, page réactive |
  | `t[5]=1` sur tableau de 2 | `ArrayIndexOutOfBoundsException` |
  | Temps | init 1,3 s ; chargement lib 7,7 s ; **1ʳᵉ compilation 19,6 s** (JIT à froid) ; ensuite **0,13–0,6 s** |
- **Options ECJ retenues** : `-1.8 -proc:none -bootclasspath /app/stub-rt.jar -encoding UTF-8 -nowarn -g -Xemacs`.
  - `-17` échoue (ECJ cherche `jrt-fs.jar`/`lib/modules`, absents de CheerpJ). `--system`, `-cp` seuls échouent aussi (testé).
  - Conséquence : **syntaxe Java 8** (pas de `var`, `switch ->`, text blocks). Suffisant pour tout IPA (vérifié sur les 79 titres). Piste future : fabriquer une image `jrt` minimale — **retour Opus** si un TP l'exige.
- **`stub-rt.jar`** (1,3 Mo au lieu de 6,1 Mo) : signatures publiques de `java.lang`, `java.util`, `java.io`, `java.math`, `java.text`, `java.nio.charset|file`, `java.time`, sans corps de méthode (outil `proto/stub/Stub.java`). Validé dans CheerpJ. Sert aussi de **liste blanche d'API** : `java.net`, `java.util.concurrent.locks`… sont absents ⇒ erreur de compilation.
- **Boucles infinies** : `Thread.stop` est impossible (Java 21 : `UnsupportedOperationException`) et CheerpJ ne préempte pas un thread Java qui boucle. Solution validée : **instrumentation bytecode ASM** — appel `ipa.Guard.tick()` avant chaque saut arrière ; tick vérifie l'échéance toutes les 1024 itérations et lève `Guard.TimeLimit`. Filet de sécurité supplémentaire (phase 2) : runner dans une **iframe dédiée** recréée si aucune réponse après `timeout + 5 s` (récursion infinie très profonde, etc.).
- **Limites connues** (à afficher dans l'aide) : messages ECJ en anglais (→ table de traduction FR, ADR-09) ; traces d'exception sans numéro de ligne dans CheerpJ (« Unknown Source ») et message d'AIOOBE sans indice ; 1ʳᵉ compilation lente (→ préchauffage en tâche de fond dès l'ouverture du site + écran « Préparation de Java… »).

## ADR-02 — Hébergement statique : **GitHub Pages** (et non Firebase Hosting) — **DÉCIDÉ**

- Firebase Hosting Spark = 10 Go stockés mais **360 Mo/jour** de transfert. Premier chargement ≈ 5,5 Mo (ECJ 3,4 + stub 1,3 + app ≈ 0,8) ⇒ ~60 premières visites/jour seulement.
- GitHub Pages : gratuit sur dépôt **public**, limite **souple** de 100 Go/mois, site ≤ 1 Go. Aucune carte bancaire.
- Conséquences : **le dépôt est public** ⇒ aucun énoncé Schooding, aucun secret dans le dépôt (cf. ADR-05). Le code de l'appli et les exercices **inédits** y sont publics (souhaité). Fallback documenté : Firebase Hosting (même build) si GitHub indisponible.
- Le runtime CheerpJ vient de son CDN (non compté). CodeMirror/Firebase SDK sont bundlés (≈ 0,8 Mo gzip au total, avec code-splitting par route).

## ADR-03 — Comptes et progression : **Firebase Spark** (Auth + Cloud Firestore uniquement) — **DÉCIDÉ**

- Spark : aucune carte, ne facture jamais ; à quota atteint le produit s'arrête jusqu'à la remise à zéro. Firestore : 1 Gio, 50 k lectures/j, 20 k écritures/j, 20 k suppressions/j. Auth e-mail/mot de passe et Google : gratuits (≈ 50 k MAU). **Pas** d'Auth par SMS, **pas** de Cloud Storage (exige Blaze depuis 2024), **pas** de Cloud Functions (exige Blaze).
- Règle d'or écrite dans le README : **ne jamais cliquer « Passer à Blaze »**.
- Budget estimé par étudiant actif/jour : ~40 lectures, ≤ 100 écritures (brouillons throttlés) ⇒ capacité ≈ 200 étudiants très actifs/jour.
- Dépassement de quota : l'appli détecte `resource-exhausted`, bascule en **mode local** (IndexedDB) avec bannière « Synchronisation suspendue jusqu'à demain », puis resynchronise.
- La configuration web Firebase (apiKey…) n'est pas un secret (protégée par les règles) ; elle est commitée.

## ADR-04 — Frontend : Vite + React + TypeScript strict + Tailwind + **CodeMirror 6** — **DÉCIDÉ**

- **CodeMirror 6 au lieu de Monaco** : Monaco n'est officiellement **pas supporté sur navigateurs mobiles** ; or iPhone/Android sont exigés. CodeMirror 6 : support tactile, ~10× plus léger, coloration Java (`@codemirror/lang-java`), indentation auto, numéros de ligne, diagnostics (`@codemirror/lint`), autocomplétion des outils Schooding, thèmes sombre/clair. Écart assumé avec le « idéalement Monaco » du cahier des charges, justifié par l'exigence mobile.
- Router : `react-router` ; état : **Zustand** ; cache local : `idb-keyval` ; formulaires : natif + `zod` pour la validation.
- Tests : **Vitest** (unitaires), **Playwright** (E2E, Chrome headless prouvé compatible CheerpJ), **Firebase Emulator Suite** + `@firebase/rules-unit-testing` (règles).
- PWA (manifest + service worker) pour mettre en cache ECJ/stub ⇒ chargements suivants quasi instantanés et usage hors-ligne des exercices déjà chargés.

## ADR-05 — Contenus Schooding : privés, dans Firestore, réservés à la cohorte — **DÉCIDÉ**

- Les énoncés originaux appartiennent à l'ESIEE/leurs auteurs. Ils **ne vont jamais dans le dépôt public**.
- Stockage : collection Firestore `schooding/{bankVersion}/exercises/{id}`, lisible seulement par un utilisateur **connecté ET membre de la cohorte** (`users/{uid}.cohort == "esiee-ipa-2026"`). On devient membre en saisissant un **code d'invitation** ; la règle compare au document `config/cohort` **illisible par les clients** (seules les règles le lisent via `get()`).
- Écriture des contenus Schooding : uniquement par les **administrateurs** (`config/admins.uids` contient l'uid de Mathias) via la page `/admin/import`.
- Les exercices **inédits** (familles générées) sont publics, dans le bundle statique.

## ADR-06 — Moteur de sujets : **pools de variantes pré-générées et pré-validées** (pas d'IA en ligne) — **DÉCIDÉ**

- Chaque famille = générateur de paramètres (TS, déterministe) + solution de référence Java paramétrée + énoncés modèles + indices + **mutants nommés**.
- **Au build** (Node + vrai JDK) : pour chaque famille × difficulté, N graines ⇒ variantes ; on compile/exécute la référence sur tous les tests (sorties attendues = vérité) ; on rejette toute variante invalide (exception, timeout, tests non discriminants, doublon) ; on vérifie que **chaque mutant échoue à ≥ 1 test** ; on écrit des pools JSON immuables versionnés `public/bank/v{version}/pools/{familyId}.json`.
- **Dans le navigateur** : le compositeur ne fait que **choisir et assembler** des variantes validées (PRNG à graine). Aucun appel réseau payant, résultat reproductible, sujets instantanés.
- Source unique de vérité = la référence Java (pas d'oracle TS dupliqué ⇒ pas de divergence).
- Diagnostics fiables par **empreinte de mutants** : si les sorties de l'étudiant coïncident avec celles d'un mutant connu (« `<` au lieu de `<=` », « division entière »…), on affiche le commentaire pédagogique associé, formulé comme hypothèse vérifiable.

## ADR-07 — Tests cachés : limite assumée

- Tout est exécuté côté client : un étudiant motivé peut lire les tests cachés/solutions avec les outils développeur. Atténuations : solutions, indices et tests cachés dans des fichiers séparés chargés **après la remise** (mode examen) ; pas de prétention de sécurité anti-triche. Documenté dans l'aide (outil de révision, pas d'évaluation officielle).

## ADR-08 — « Comprendre mon erreur avec Claude » sans API — **DÉCIDÉ**

- Construction locale du prompt ⇒ **copie dans le presse-papiers** (toujours) ⇒ ouverture de `https://claude.ai/new` ; ajout de `?q=` (URL-encodé) seulement si le prompt fait < 6 000 caractères (la pré-saisie par `q` est documentée, tronquée vers ~14 000 caractères, et son comportement web a déjà varié). Message à l'écran : « Le prompt est copié : colle-le si la zone est vide ». Aucune transmission automatique.

## ADR-09 — Messages d'erreur en français

- Table `src/java/ecjMessagesFr.ts` (≈ 40 motifs regex ECJ les plus fréquents → message FR + conseil). Message original toujours visible en dessous. Lignes renvoyées **dans le repère du code de l'étudiant** (décalage du gabarit soustrait).

## ADR-10 — Tâche hebdomadaire

- Tâche programmée Claude créée le 16/11/2026 : `trig_01BWh7UWgLxsxkGuzrnDa54Y`, « IPA Studio – actualisation Schooding du lundi », `CRON_TZ=Europe/Paris 50 8 * * 1`, notification push, demande d'autorisation obligatoire avant toute lecture Schooding.
- **Action Mathias requise** : activer « Require this computer » dans l'appli de bureau Claude pour qu'elle puisse utiliser son Chrome. Sinon, elle demande l'autorisation puis lui demande d'ouvrir une session compatible.
- Le pipeline d'import est décrit dans `05-PLAN-DEVELOPPEMENT.md` §Import.

## Sources vérifiées
- Licence CheerpJ : https://cheerpj.com/docs/licensing — versions Java : https://cheerpj.com/docs/overview
- Offres Firebase : https://firebase.google.com/docs/projects/billing/firebase-pricing-plans — tarifs/quotas : https://firebase.google.com/pricing
- GitHub Pages : https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- Monaco non supporté sur mobile : https://microsoft.github.io/monaco-editor
- Liens claude.ai pré-remplis : https://support.claude.com/en/articles/14729294
