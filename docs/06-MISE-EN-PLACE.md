# Mise en place (≈ 30 min, 0 €)

Tout ce qui suit est **gratuit et sans carte bancaire**. Si un écran te demande une carte, un « essai gratuit »,
« Passer à Blaze », « Mettre à niveau » ou « Identity Platform » : **tu t'arrêtes, tu ne valides rien** et tu me préviens.

Rappel du principe : le code est dans un dépôt GitHub public, publié par GitHub Pages ; les comptes et la progression
sont dans Firebase (offre **Spark**) ; Java s'exécute dans ton navigateur (CheerpJ). Le dépôt ne contient **aucun
énoncé Schooding** : ils sont dans Firestore, lisibles uniquement par les comptes qui ont le code d'invitation.

## Étape 1 — GitHub (gratuit)
1. Crée un compte sur github.com (e-mail + mot de passe, pas de carte). Note ton **pseudo** : le site sera à
   `https://<pseudo>.github.io/ipa-studio/`.
2. *New repository* → nom exact **`ipa-studio`** → **Public** → ne coche aucune option d'initialisation → *Create*.
3. Dis-moi « le dépôt est créé, mon pseudo est … » : je te demande alors l'accès au dépôt (autorisation **toi** dans
   l'interface) puis je pousse le code. Tu ne tapes aucune commande.
4. Dans le dépôt : **Settings → Pages → Build and deployment → Source : GitHub Actions**.

## Étape 2 — Firebase (offre Spark)
1. Va sur console.firebase.google.com avec un compte Google. *Créer un projet* → nom `ipa-studio` →
   **désactive Google Analytics** → *Créer*.
2. Vérifie en bas à gauche de la console que le plan affiché est **Spark** (« Sans frais »). Ne clique jamais sur
   *Mettre à niveau*.
3. **Ajouter une application → Web (`</>`)** → surnom `ipa-studio` → **ne coche pas** Firebase Hosting → *Enregistrer*.
   Copie l'objet `firebaseConfig` affiché (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId).
   Ce n'est **pas un secret** (il est visible dans toute appli web) : la sécurité vient des règles Firestore.
4. **Authentication → Commencer → Méthode de connexion** : active **E-mail/Mot de passe** et **Google**
   (adresse d'assistance : la tienne). Rien d'autre ; si on te propose *Identity Platform*, refuse.
5. **Firestore Database → Créer une base de données** : édition **Standard**, ID de base **`(default)`** (ne le change
   pas : les bases « nommées » n'ont pas le quota gratuit), emplacement **eur3** (Europe) ou **europe-west1**, mode
   **production**.
6. Onglet **Règles** : remplace tout par le contenu du fichier `contracts/firestore.rules` du dépôt → *Publier*.
7. **Authentication → Paramètres → Domaines autorisés** : ajoute `<pseudo>.github.io`.
8. Plus tard (après ta première connexion à l'appli, étape 4) : dans **Firestore → Données** crée
   - la collection `config`, document **`cohort`**, champ `code` (chaîne) = le **code d'invitation** que tu choisis
     (ex. une phrase de 3 mots) ;
   - le document **`admins`**, champ `uids` (tableau) contenant **ton UID** (visible dans *Authentication → Utilisateurs*).

Quotas gratuits de Firestore (vérifiés sur la page officielle des tarifs) : 1 Gio stocké, 50 000 lectures/jour,
20 000 écritures/jour, 20 000 suppressions/jour. L'appli est conçue pour rester très en dessous (brouillons groupés,
statistiques en incréments). Sur Spark, sans moyen de paiement enregistré, un dépassement ne peut pas être facturé :
les opérations sont simplement refusées jusqu'à la remise à zéro du quota (minuit, heure du Pacifique).

## Étape 3 — Relier le site à Firebase (une variable, pas de code)
Dans le dépôt GitHub : **Settings → Secrets and variables → Actions → onglet *Variables* → New repository variable**
- Nom : `FIREBASE_CONFIG`
- Valeur : le `firebaseConfig` **en JSON sur une seule ligne**, clés entre guillemets, par exemple
  `{"apiKey":"…","authDomain":"ipa-studio-xxxx.firebaseapp.com","projectId":"ipa-studio-xxxx","storageBucket":"…","messagingSenderId":"…","appId":"…"}`

Puis **Actions → Déploiement Pages → Run workflow**. Au bout de 2–3 minutes le site est en ligne. Sans cette
variable, le site fonctionne quand même, mais en **mode local** (sans comptes, progression dans le navigateur).

## Étape 4 — Premier lancement
1. Ouvre le site, **Créer un compte** (e-mail ou Google), puis fais l'étape 2.8 (code d'invitation + admin).
2. Dans *Réglages*, saisis le code d'invitation : ton compte rejoint la cohorte.
3. Menu **TP Schooding → Gérer la banque** : choisis `schooding-bank-….json` et `schooding-solutions-….json` (ma
   sauvegarde privée, voir ci-dessous) et vérifie l'aperçu (ajoutés / modifiés / retirés). **Importer sur cet appareil**
   te donne les 79 TP chez toi ; **Publier pour la cohorte (admin)** (visible une fois connecté, dans la cohorte et
   admin) les envoie dans Firestore pour tes camarades. Les entraînements et DST générés fonctionnent déjà sans cet import.
4. Camarades : tu leur donnes le lien et le code **hors du site** (message privé). Chacun a son compte et sa
   progression ; personne ne voit celle des autres (règles Firestore testées avec l'émulateur).

## Sauvegarde privée (à garder hors GitHub)
Je t'envoie un dossier `ipa-studio-prive` (banque Schooding, solutions de référence, spécifications). Garde-le dans
un endroit à toi (clé USB, cloud perso). **Ne le mets jamais dans le dépôt public** : ces contenus appartiennent à
Schooding / ton cours.

## Si quelque chose casse
- Le site s'ouvre mais « mode local » : la variable `FIREBASE_CONFIG` est absente ou mal formée → corrige-la et
  relance le déploiement.
- Connexion Google refusée : le domaine `<pseudo>.github.io` n'est pas dans les domaines autorisés (étape 2.7).
- « Refusé : seul l'administrateur… » à la publication : ton UID n'est pas dans `config/admins` (étape 2.8).
- Retour arrière d'un import : *Gérer la banque* → **Versions installées** → bouton de la version précédente (les versions ne sont jamais effacées ; le *Journal* garde la trace).
