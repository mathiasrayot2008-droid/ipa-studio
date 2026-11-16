# IPA Studio 2.0

Plateforme de révision Java pour le module **IPA (ESIEE Paris, 1ʳᵉ année)** : TP Schooding fidèles, entraînement ciblé par notion, DST générés (examen/assisté), exécution Java réelle dans le navigateur, suivi de maîtrise. **Zéro dépense** : GitHub Pages + Firebase Spark + CheerpJ Community.

## État du projet
- ✅ **Application complète côté code** (voir `docs/STATUS.md`) : TP Schooding fidèles, Java réel dans le navigateur, DST générés (strict / assisté), maîtrise par notion, fiches, PWA hors ligne.
- 🚀 **Mise en ligne** : suivre `docs/06-MISE-EN-PLACE.md` (GitHub Pages + Firebase Spark, ≈ 30 min, 0 €). Les workflows `.github/workflows/` testent et déploient automatiquement.
- 🔁 **Actualisation hebdomadaire des TP** : `docs/07-IMPORT-HEBDOMADAIRE.md`.

## Commandes
```bash
npm ci --legacy-peer-deps
npm run dev            # développement (mode local, sans compte)
npm test               # 87 tests unitaires
npm run test:rules     # règles Firestore (émulateur local)
npm run test:e2e       # Chrome réel : Java, DST, fiches, PWA (CHROME_PATH=/usr/bin/google-chrome)
npm run test:e2e:accounts  # deux comptes séparés (émulateurs Auth + Firestore)
npx tsx bank/build/pools.ts   # régénère la banque d'exercices générés (JDK requis)
```
Configuration Firebase : variable `VITE_FIREBASE_CONFIG` (JSON) au build — en CI, variable de dépôt `FIREBASE_CONFIG`. Absente ⇒ mode local.

## À lire avant de coder (dans l'ordre)
1. `docs/01-DECISIONS.md` — choix techniques et leurs preuves (ne pas les remettre en cause sans retour Opus)
2. `docs/02-JAVA-RUNTIME.md` — gabarits, outils Schooding, correction
3. `docs/03-PROGRAMME-ET-EXERCICES.md` — séances, notions, 79 exercices classés, familles
4. `docs/04-MOTEUR-DST-ET-PROGRESSION.md` — composition des DST, barème, maîtrise
5. `docs/05-PLAN-DEVELOPPEMENT.md` — arborescence, Firestore, tâches, critères A–N
6. `contracts/bank.ts` et `contracts/firestore.rules` — contrats à respecter

## Règles « zéro dépense » (non négociables)
- Firebase reste sur **Spark**. Ne jamais cliquer « Passer à Blaze ». Pas de Cloud Functions, Cloud Storage, Auth SMS.
- Dépôt **public** (GitHub Pages gratuit) ⇒ aucun énoncé Schooding, aucun secret dans le dépôt. Les originaux vivent dans Firestore (cohorte + code d'invitation).
- CheerpJ chargé depuis son CDN officiel (licence Community). Ne pas auto-héberger le runtime.
- Aucune API payante, aucune clé payante.

## Prototype Java validé (reproductible)
```bash
# dépendances (Maven Central)
curl -o lib/ecj.jar https://repo1.maven.org/maven2/org/eclipse/jdt/ecj/3.46.100/ecj-3.46.100.jar
curl -o lib/asm.jar https://repo1.maven.org/maven2/org/ow2/asm/asm/9.8/asm-9.8.jar
# harnais
javac -nowarn --release 17 -cp lib/ecj.jar:lib/asm.jar -d out proto/harness/src/ipa/*.java && (cd out && jar cf ../web/harness.jar ipa)
# stub JDK (signatures seulement) : java proto/stub/ExtractJavaBase.java cls && java -cp lib/asm.jar:proto/stub Stub cls web/stub-rt.jar
# page de test : servir web/ avec un serveur supportant Range (npx http-server web -p 8765), puis python3 proto/run_proto.py
```
Dans l'espace de travail Claude : prototypes déjà construits dans `/home/claude/proto/` (jars prêts dans `/home/claude/proto/web/`). Chrome headless : passer `--proxy-server=http://127.0.0.1:42131` (proxy de l'environnement).

## En attente côté Mathias
- [ ] Activer « Require this computer » sur la tâche planifiée du lundi (application de bureau Claude).
- [ ] Créer le projet Firebase (offre **Spark**, jamais Blaze) et le compte + dépôt GitHub public `ipa-studio` → `docs/06-MISE-EN-PLACE.md`.
- [ ] Choisir le code d'invitation de la cohorte (saisi dans Firestore, jamais dans le code).
