/**
 * IPA Studio 2.0 — Contrats de données (source de vérité des types).
 * À copier tel quel dans src/types/ en phase 2. Toute modification = mise à jour de docs/03 et docs/04.
 */

// ───────────────────────── Notions ─────────────────────────
export type NotionId =
  | 'N01-variables-types' | 'N02-expressions-arith' | 'N03-appels-fonctions'
  | 'N04-if-else' | 'N05-logique-comparaisons' | 'N06-switch' | 'N07-conditions-cascades'
  | 'N08-boucle-for' | 'N09-boucle-while' | 'N10-accumulateurs-compteurs' | 'N11-boucles-imbriquees'
  | 'N12-grille-coordonnees' | 'N13-tableaux-bases' | 'N14-parcours-tableau'
  | 'N15-tableaux-construction' | 'N16-tableaux-2d' | 'N17-aplatissement-transposition'
  | 'N18-string-bases' | 'N19-string-parcours' | 'N20-string-comparaison';

export interface Notion {
  id: NotionId;
  label: string;                 // « Boucles for »
  sessionNumber: number;         // séance d'introduction (1..9, puis 10+ à l'import)
  prerequisites: NotionId[];
  subNotions: { id: string; label: string }[];   // ex. « division entière », « modulo », « cast »
  cheatSheetId: string;          // fiche de cours
}

// ───────────────────────── Valeurs Java typées ─────────────────────────
export type JavaType = 'int' | 'long' | 'double' | 'boolean' | 'char' | 'String'
  | 'int[]' | 'double[]' | 'char[]' | 'boolean[]' | 'String[]' | 'int[][]' | 'double[][]' | 'char[][]';
export interface JavaValue { type: JavaType; value: unknown }      // value JSON-compatible (char = string de longueur 1)

// ───────────────────────── Outils Schooding ─────────────────────────
export type ToolId =
  | 'affiche' | 'afficheEntier' | 'afficheReel' | 'afficheReels' | 'afficheBooleen' | 'debug'
  | 'PI' | 'pgcd' | 'sqrt' | 'sin' | 'cos' | 'distance'
  | 'setFillColor' | 'rectangle' | 'isoTriangle' | 'circle' | 'line'
  | 'startPolygon' | 'addPoint' | 'stopPolygon'
  | 'fillCase' | 'moveUp' | 'moveDown' | 'moveLeft' | 'moveRight' | 'warmer' | 'canvasSize';

/** Configuration d'un outil dans un exercice (copiée de la description Schooding, jamais devinée). */
export interface ToolConfig {
  id: ToolId;
  /** affiche* : true = retour à la ligne après l'affichage (défaut), false = « sans passer à la ligne ». */
  newline?: boolean;
  /** afficheReel(s) : nombre de décimales imposé (ex. 3), sinon représentation Java par défaut. */
  decimals?: number;
}

export type ExerciseKind = 'snippet' | 'drawing' | 'grid' | 'runner' | 'members' | 'program';

// ───────────────────────── Tests ─────────────────────────
export interface TestCase {
  id: string;
  visibility: 'public' | 'hidden' | 'edge';
  weight: number;                                  // défaut : public 1, hidden 2, edge 2
  inputs: Record<string, JavaValue>;               // ordre = ordre des paramètres de __run
  stdin?: string;                                  // kind 'program'
  scene?: { grid?: { largeur: number; hauteur: number }; canvas?: { width: number; height: number };
            runner?: RunnerMap };
  expected: ExpectedResult;                        // calculé au build en exécutant la référence
}
export interface ExpectedResult {
  vars?: Record<string, JavaValue>;
  out?: string;                                    // texte produit par affiche* (avec \n), comparé ligne à ligne
  grid?: string[];                                 // une chaîne par ligne, 1 lettre par case (w blanc, k noir, r rouge, g vert, b bleu…)
  canvas?: { w: number; h: number; rle: number[] };// raster compressé : paires (couleur, longueur)
  runnerReached?: boolean;
  exception?: string;                              // rarement : exception attendue
}
export interface CompareOptions {
  trimLines: boolean; ignoreTrailingEmptyLines: boolean; caseSensitive: boolean; doubleTolerance: number;
  /** Toile : part maximale de pixels différents (0 = égalité exacte ; ex. 0.002 pour les tracés trigonométriques). */
  pixelTolerance?: number;
  /** Sortie texte : compare les « mots » séparés par des blancs (retours à la ligne ou espaces indifférents). À n'utiliser que si l'énoncé ne fixe pas la mise en forme. */
  collapseWhitespace?: boolean;
}
export interface RunnerMap { width: number; height: number; start: [number, number]; goal: [number, number]; walls: [number, number][] }

// ───────────────────────── Exercice concret ─────────────────────────
export interface Exercise {
  key: string;                       // stable à vie : 'sch-592' (Schooding) | 'fam-strCount/d3/0007' (variante)
  origin: 'schooding' | 'ipa-studio';
  kind: ExerciseKind;
  title: string;
  statementMd: string;               // Markdown (gras, listes, `code`)
  notions: { primary: NotionId; secondary: NotionId[] };
  difficulty: 1 | 2 | 3 | 4 | 5;
  estimatedMinutes: number;
  tools: ToolConfig[];
  givenVariables: { name: string; type: JavaType; description: string }[];
  /** declareOnly : la variable doit exister avec ce type mais n'est pas lue (déclarée « non initialisée » dans l'énoncé). */
  expectedVariables: { name: string; type: JavaType; declareOnly?: boolean }[];
  /** Exercices « écrire une fonction/procédure » (kind 'members') : appel de test généré par le harnais (les variables fournies sont les arguments). */
  member?: { call: string; result?: JavaType };
  /** Règles de l'énoncé vérifiées sur le code (comme « pas de if », « pas de Math », « pas d'espace avant la parenthèse ») : regex testée sur le code sans commentaires ni chaînes. */
  rules?: { re: string; fr: string }[];
  starterCode: string;               // ex. « //str est une chaîne de caractères déjà déclarée et initialisée »
  outputFormat?: string;             // exigences de format en clair
  compare: CompareOptions;
  tests: TestCase[];                 // pour 'schooding' : stockés dans Firestore (privé)
  hints: [string, string, string];   // indice 1 (orientation), 2 (méthode), 3 (guidage détaillé)
  referenceSolution: string;         // validée au build
  mutants?: { id: string; label: string; explanationFr: string }[];   // empreintes (pas le code)
  mutantFingerprints?: Record<string, Record<string, string>>;       // mutantId → testId → hash sortie
  provenance: {
    source: string; importedAt?: string; schoodingId?: number; session?: number; order?: number; bankVersion: string;
    /** Fidélité à l'exercice Schooding d'origine (cf. docs/06) : exact = énoncé et tests entièrement déterminés par l'énoncé ;
     *  assets-recreated = schéma/carte/code de départ absents de l'export et recréés ; reconstructed = comportement déduit du code enregistré de l'étudiant ;
     *  unavailable = énoncé seul, pas de correction automatique. */
    fidelity?: 'exact' | 'assets-recreated' | 'reconstructed' | 'unavailable';
    /** Choix et ambiguïtés, affichés à l'étudiant (« À propos de cet exercice »). */
    notes?: string[];
  };
}

// ───────────────────────── Familles (générateur) ─────────────────────────
/** Valeur JSON d'un test (avant typage) : l'auteur d'une famille écrit des valeurs simples, le build les type d'après `given`. */
export type FamValue = number | string | boolean | FamValue[];
export interface FamTest { vis: 'public' | 'hidden' | 'edge'; in: Record<string, FamValue>; scene?: TestCase['scene'] }

/**
 * Défini en TypeScript dans bank/families/<id>.ts ; exécuté au BUILD (Node + vrai JDK) pour produire les pools.
 * Une VARIANTE change l'algorithme, la structure des données ou une contrainte (pas seulement des noms ou des nombres).
 */
export interface FamilyDefinition<P = unknown> {
  id: string;                        // 'strCompte'
  title: string;                     // « Compter des caractères »
  notions: { primary: NotionId; secondary: NotionId[] };
  kind: ExerciseKind;
  variants: FamilyVariant<P>[];
}
export interface FamilyVariant<P> {
  id: string;                        // 'count-char'
  label: string;                     // « un caractère donné »
  difficulty: 1 | 2 | 3 | 4 | 5;
  estimatedMinutes: number;
  /** Tirage déterministe des paramètres (noms de variables compris, pour que l'énoncé, le code et les tests restent cohérents). */
  params(rng: Rng): P;
  valid?(p: P): boolean;
  statement(p: P): string;           // Markdown
  given(p: P): { name: string; type: JavaType; description: string }[];
  expect(p: P): { name: string; type: JavaType; declareOnly?: boolean }[];
  tools?(p: P): ToolId[];
  outputFormat?(p: P): string | undefined;
  starter?(p: P): string;            // défaut : commentaire listant les variables fournies
  reference(p: P): string;           // solution Java (fragment), validée au build
  mutants(p: P): { id: string; label: string; explanationFr: string; code: string }[];   // ≥ 2 : chacun DOIT échouer à ≥ 1 test
  tests(p: P, rng: Rng): FamTest[];  // ≥ 2 publics, ≥ 3 cachés (dont ≥ 1 limite)
  hints(p: P): [string, string, string];
  compare?: Partial<CompareOptions>;
}
export interface Rng { next(): number; int(min: number, max: number): number; pick<T>(a: readonly T[]): T; shuffle<T>(a: T[]): T[] }

// ───────────────────────── DST ─────────────────────────
export type Level = 'facile' | 'moyen' | 'difficile';
export type DstMode = 'examen' | 'assiste';
export interface DstConfig {
  scope: 'global' | 'notion';
  notions?: NotionId[];              // entraînement ciblé
  subNotions?: string[];             // priorités optionnelles
  durationMin: number;               // 15..240
  level: Level;
  mode: DstMode;
  adaptive: boolean;                 // défaut true
  asOfSession: number;               // dernière séance réellement étudiée (par défaut : la plus récente importée)
}
export interface DstSubject {
  id: string;
  seed: string;                      // 128 bits hex
  generatorVersion: string;          // ex. '1.0.0'
  bankVersion: string;
  config: DstConfig;
  items: { exerciseKey: string; points: number; targetDifficulty: number; estimatedMinutes: number }[];
  estimatedTotalMin: number;
  hintPolicy: HintPolicy;
  createdAt: string;
  /** Limites rencontrées à la composition (durée courte, banque trop étroite…) : affichées honnêtement à l'étudiant. */
  warnings?: string[];
}
export interface HintPolicy { penalties: [number, number, number]; solutionRevealedScore: 0 }  // ex. [0.10, 0.25, 0.50] cumul max

// ───────────────────────── Résultats / maîtrise ─────────────────────────
export interface Attempt {
  exerciseKey: string; context: 'tp' | 'entrainement' | 'dst'; dstId?: string;
  code: string; status: 'reussi' | 'partiel' | 'echoue' | 'compilation';
  score: number;                     // 0..1
  testsPassed: number; testsTotal: number;
  hintsUsed: 0 | 1 | 2 | 3; solutionShown: boolean;
  durationSec: number; attemptsBefore: number; firstTimeSeen: boolean;
  errorTags: string[];               // 'compile:undefined-variable', 'runtime:aioobe', 'mutant:off-by-one'…
  createdAt: string; bankVersion: string;
}
export interface NotionMastery {
  /** Σ w·e et Σ w, tels qu'à la date MasteryDoc.updatedAt (la récence est un facteur exponentiel : on décale les deux sommes du même facteur à la lecture). */
  evidence: number; weightSum: number;
  distinctFamiliesSucceeded: number;
  /** Familles (ou exercices Schooding) réussies : sert à compter les familles distinctes sans relire l'historique. */
  families?: string[];
  lastSuccessAt?: string;
  /** Dernière réussite sur un exercice jamais réussi auparavant (condition « acquise »). */
  lastNewSuccessAt?: string;
  estimate: number;
}
