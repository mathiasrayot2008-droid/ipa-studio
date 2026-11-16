# Import hebdomadaire des nouveaux TP Schooding

Déclenché chaque **lundi à 9 h (Europe/Paris)** par une tâche planifiée Claude. Principes non négociables :

1. **Autorisation d'abord.** La tâche commence par demander à Mathias l'accord explicite de consulter sa session
   Schooding. Sans « oui », elle ne lit aucune page Schooding et s'arrête (semaine reportée).
2. **Lecture seule.** Aucune soumission, aucun clic sur Exécuter, aucune réinitialisation de code. Aucune authentification
   n'est jamais contournée : la session doit déjà être ouverte dans le Chrome de Mathias.
3. **Versionné et réversible.** Chaque import crée une nouvelle version ; rien n'est supprimé ; les progressions sont
   indexées par des clés d'exercice stables (`sch-<id>`), donc aucune perte.
4. **Validation humaine.** Rien n'est publié avant la validation de Mathias sur le rapport (ajouts, modifications,
   notions nouvelles, résultats de tests).
5. **Contenu protégé.** Énoncés, tests et solutions Schooding restent dans `private/` (ignoré par git) puis Firestore
   (cohorte uniquement). Jamais dans le dépôt public.

## Déroulé
1. Demande d'autorisation (message à Mathias) → attente de la réponse.
2. Inventaire en lecture seule : séances (`/course/725/`, onglets `#list-sessionNNNN`, pages `/session/NNNN/`) et
   exercices (`/codingtest/ID/`, `/qcm/ID/`), comparés à la dernière version importée (`imports` / export précédent).
3. Pour chaque nouvel exercice : énoncé (partie française), outils (signature + description), variables fournies,
   code enregistré → export JSON `ipa-schooding-export-AAAA-MM-JJ.json` (même format que celui du 16/11/2026).
4. Construction avec `scripts/schooding/build.ts` à partir de l'export et des spécifications privées
   (`private/specs/`, à rédiger pour les nouveaux exercices : classification en notions, solution de référence, tests ;
   les sorties attendues sont **calculées** en exécutant la référence avec le vrai JDK). Les exercices dont la
   fidélité n'est pas « exacte » sont signalés dans le rapport.
5. Nouvelles notions : familles d'exercices inédites (`bank/families/`) validées par `bank/build/pools.ts`
   (référence = 100 %, chaque mutant échoue à au moins un test) avant publication.
6. Rapport à Mathias → **validation** → import via **TP Schooding → Gérer la banque** (aperçu, import, publication, activation). Retour arrière possible.

## Ce que la tâche a besoin d'avoir sous la main
- le dépôt `ipa-studio` (GitHub, public) ;
- la sauvegarde privée (dossier `ipa-studio-prive`) que Mathias met à disposition de la session : sans elle, la tâche
  peut inventorier et préparer l'export, mais pas reconstruire la banque ;
- Chrome ouvert sur Schooding (session connectée) avec l'extension Claude, et la tâche réglée sur « Require this
  computer » dans l'application de bureau Claude.
