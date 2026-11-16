# Moteur de génération des DST, notation et modèle de maîtrise

Tout est **déterministe** à partir de `(seed, config, generatorVersion, bankVersion, snapshot de maîtrise)`. Implémentation : `src/engine/` (TypeScript pur, sans dépendance au DOM, testé par Vitest).

## 1. PRNG et reproductibilité
- PRNG : **xoshiro128\*\*** initialisé par `cyrb128(seed)` ; `seed` = 128 bits aléatoires (`crypto.getRandomValues`) en hex.
- Sous-flux nommés : `rng.fork("notions")`, `rng.fork("slots")`, `rng.fork("variants")`… ⇒ ajouter une étape ne décale pas les autres tirages.
- Le DST enregistré contient `seed`, `config`, `generatorVersion`, `bankVersion`, la **maîtrise utilisée** (copie) **et** le sujet résolu (`DstSubject.items`). Les pools sont immuables par version ⇒ on peut toujours réafficher exactement le sujet ; un test Vitest régénère depuis la graine et vérifie l'égalité.

## 2. Algorithme de composition (étapes 1 → 10 du cahier des charges)

**Entrées** : `DstConfig`, maîtrise par notion, historique (familles vues), index des pools.

1. **Notions éligibles** : `scope=global` ⇒ toutes les notions de séance ≤ `asOfSession` ; `scope=notion` ⇒ notions choisies (+ leurs prérequis autorisés en notions secondaires seulement).
2. **Priorités** (si `adaptive`) : poids `w(n) = 1 × (1 + 1,5·(1 − m(n))) × (1,2 si non pratiquée depuis 14 j) × (2 si sous-notion prioritaire choisie)`. Sans adaptation : `w = 1`. Les notions des 2 dernières séances reçoivent ×1,3 en `global` (révision du cours récent).
3. **Taille et rampe de difficulté** — solveur (simulé et validé, cf. §3) :
   - bande par niveau (échelle 1–5) : facile `[1,0 ; 2,8]`, moyen `[1,6 ; 3,8]`, difficile `[2,4 ; 5,0]` ;
   - plage indicative `[nmin, nmax]` interpolée linéairement sur la table du cahier des charges (15 min : 2–4 ; 30 : 4–6 ; 45 : 5–8 ; 60 : 6–9 ; 90 : 7–12 ; 120 : 8–15 ; au-delà : ×D/120) ;
   - on explore `n ∈ [max(2, nmin−1), nmax+2]`, `abaissement du sommet δ ∈ {0 ; 0,3 ; 0,6 ; 0,9 ; 1,2}`, `courbure γ ∈ {0,7 ; 1 ; 1,4}` ; cibles `d_i = lo + (hi−δ−lo)·(i/(n−1))^γ` ;
   - temps de base `t(d)` = interpolation de {1:4, 2:7, 3:11, 4:15, 5:20} min ; facteur de longueur des variantes `k = clamp(0,92·D / Σt, 0,8, 1,25)` ;
   - coût = `10·|Σt·k / (0,92·D) − 1| + 2·(écart hors [nmin,nmax]) + 1,5·δ + 0,3·|γ−1|` ; on garde le minimum.
4. **Répartition des notions sur les créneaux** : tirage pondéré sans remise par `w(n)`, contraint par la **compatibilité difficulté** (une notion n'est placée que si une famille possède une variante dans `[d_i − 0,7 ; d_i + 0,7]`) ; maximum `ceil(n/3)` créneaux par notion principale ; `global` ⇒ au moins `min(n, nbNotionsÉligibles, 5)` notions distinctes.
5. **Familles** : pour chaque créneau, familles de la notion compatibles ; pénalité ×0,3 si vue dans les 3 derniers DST, ×0 si déjà utilisée dans ce DST.
6. **Variantes** : difficulté entière choisie autour de `d_i` (plafond avec probabilité = partie fractionnaire), puis variante dont `estimatedMinutes` est la plus proche de `t(d_i)·k` ; la variante concrète (paramètres) est tirée dans le pool pré-validé, en excluant les variantes déjà réussies par l'utilisateur.
7. **Validité** : seules des variantes du pool (validées au build) ; contrôle runtime que l'exercice a ≥ 2 tests publics et ≥ 3 cachés/limites.
8. **Anti-répétition** : pas deux fois la même famille ; pas deux variantes consécutives de même notion principale si une alternative existe (échange local).
9. **Ordre** : tri stable par `(difficulté, minutes estimées)` ⇒ progression **non décroissante garantie** ; vérification `difficulté(dernier) − difficulté(premier) ≥ 1` dès que `n ≥ 3` (sinon on remplace le premier par une variante plus facile de la même famille).
10. **Barème sur 20** : `p_i ∝ minutes_i^0,8 × (1 + 0,15·(d_i − 1))`, arrondi au 0,5, le reste d'arrondi est affecté au dernier exercice ; contrôle `Σ = 20`.
11. **Contrôle de durée** : `Σ minutes ∈ [0,85·D ; 1,0·D]` ; sinon on relance l'étape 6 avec `k` ajusté (2 essais) puis on accepte en affichant honnêtement « durée estimée : X min ».

**Adaptation ≠ difficulté** : la maîtrise modifie *quelles notions* sont choisies, **jamais la bande de difficulté** choisie par l'utilisateur.

## 3. Résultats de simulation du solveur (validés le 16/11/2026)

| Durée | Facile | Moyen | Difficile |
|---|---|---|---|
| 15 min | 2 ex., 1,0→2,8, 14 min | 2 ex., 1,6→3,2, 14 min | 2 ex., 2,4→3,8, 18 min* |
| 30 min | 4 ex., 1,0→2,8, 28 min | 4 ex., 1,6→3,5, 28 min | 3 ex., 2,4→4,1, 28 min |
| 1 h | 8 ex., 1,0→2,8, 55 min | 6 ex., 1,6→3,8, 55 min | 6 ex., 2,4→4,1, 56 min |
| 1 h 30 | 10 ex., 1,0→2,8, 83 min | 7 ex., 1,6→3,8, 83 min | 7 ex., 2,4→5,0, 83 min |
| **2 h** | **13 ex.**, 1,0→2,8, 110 min | **9 ex.**, 1,6→3,8, 110 min | **8 ex.**, 2,4→5,0, 110 min |
| 3 h | 20 ex. | 14 ex. | 12 ex. |

\* 15 min en difficile est structurellement serré : l'appli prévient « format court : 2 exercices, sommet abaissé ». Test E : 2 h ⇒ 8 à 13 exercices, ~110 min estimées (+ marge de relecture). Test F : rampe strictement croissante à tous niveaux.

## 4. Modes et indices
- **Examen** : sujet figé à la création ; minuteur basé sur `startedAt` (horodatage serveur Firestore) ⇒ résiste au rechargement ; sauvegarde auto des codes (local immédiat, Firestore toutes les 30 s et à chaque changement d'exercice) ; « Exécuter » autorisé avec **tests publics uniquement** ; aucun indice ni test caché ni correction avant remise ; remise manuelle (confirmation) ou automatique à 0:00 ; si l'utilisateur revient après l'échéance ⇒ remise automatique avec le dernier code sauvegardé.
- **Assisté** : même sujet ; indices progressifs ; pénalités **annoncées avant le lancement** : indice 1 = −10 %, indice 2 = −25 %, indice 3 = −50 % des points de l'exercice (non cumulatifs : on applique le plus haut), « Voir la solution » (double confirmation) ⇒ 0 point sur l'exercice. Indices = textes de la famille instanciés avec les paramètres (pas d'IA).
- Entraînement ciblé = même moteur avec `scope: notion`, mode au choix.

## 5. Correction d'un DST
Par exercice : `points × score_tests × (1 − pénalité_indice)`. Bilan : note /20, points par exercice, tests échoués (publics détaillés, cachés : entrée révélée **après** remise), compétences évaluées, temps par exercice (temps de focus mesuré), erreurs détectées (tags fiables, §6), correction de référence, notions à retravailler, bouton « Entraînement sur mes faiblesses », export du bilan vers Claude (prompt structuré).

## 6. Tags d'erreur fiables (`errorTags`)
- `compile:*` : `syntax`, `undefined-variable`, `type-mismatch`, `missing-return`, `unreachable`, `undefined-method` (outil non disponible), `string-eq` (`==` sur String détecté par motif) ;
- `runtime:*` : `aioobe`, `sioobe`, `npe`, `div-zero`, `timeout`, `output-too-long` ;
- `mutant:<familyId>:<mutantId>` : empreinte exacte d'un mutant connu ;
- `output:format` : sortie correcte aux espaces/casse près (détecté par comparaison normalisée).
Seuls ces tags alimentent « erreurs récurrentes » (compteur par tag sur 30 jours).

## 7. Modèle de maîtrise par notion (estimation pédagogique, affichée comme telle)

Chaque tentative pertinente (notion principale : poids plein ; secondaire : ×0,4) apporte une **preuve** :
- `e = score × autonomie × essais × temps`
  - autonomie : 1 (aucun indice), 0,85 / 0,65 / 0,4 (indice 1/2/3), 0 (solution vue) ;
  - essais (nb de « Vérifier » avant réussite) : 1 pour ≤ 2, puis `max(0,5 ; 1 − 0,1·(k−2))` ;
  - temps : `clamp((estimé / réel)^0,3, 0,7, 1)` ;
- poids `w = (1 + 0,25·(d − 1)) × nouveauté × récence` ; nouveauté 1 si exercice jamais vu, 0,4 si déjà réussi auparavant ; récence `0,5^(âge_jours / 30)`.
- Estimation : **moyenne a posteriori d'une Beta(1, 2)** : `m = (1 + Σ w·e) / (3 + Σ w)`.
  - 1 réussite parfaite d3 ⇒ 2,5/4,5 = **56 %** (une réussite ne suffit jamais) ; ~12 réussites autonomes variées et récentes ⇒ ≥ 90 %.
- Statut « **acquise** » seulement si `m ≥ 0,90` **et** ≥ 3 familles différentes réussies **et** une réussite sur exercice nouveau dans les 30 derniers jours. Cible de Mathias : 90–95 %.
- Maîtrise globale = moyenne des notions éligibles pondérée par le nombre de séances qui les mobilisent.
- Stockage : agrégats incrémentaux dans `users/{uid}/stats/mastery` (pas de relecture de tout l'historique) ; recalcul complet possible (bouton « Recalculer ») pour corriger la dérive de la récence.

## 8. « Entraînement sur mes faiblesses »
Config automatique : `scope=notion`, notions = les 3 de plus faible `m` parmi les éligibles (ou de tag d'erreur le plus fréquent), durée 30 min, niveau = niveau habituel de l'utilisateur, mode assisté.
