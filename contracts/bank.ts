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
  expectedVariables: { name: string; type: JavaType }[];
  starterCode: string;               // ex. « //str est une chaîne de caractères déjà déclarée et initialisée »
  outputFormat?: string;             // exigences de format en clair
  compare: CompareOptions;
  tests: TestCase[];                 // pour 'schooding' : stockés dans Firestore (privé)
  hints: [string, string, string];   // indice 1 (orientation), 2 (méthode), 3 (guidage détaillé)
  referenceSolution: string;         // validée au build
  mutants?: { id: string; label: string; explanationFr: string }[];   // empreintes (pas le code)
  mutantFingerprints?: Record<string, Record<string, string>>;       // mutantId → testId → hash sortie
  provenance: { source: string; importedAt?: string; schoodingId?: number; session?: number; bankVersion: string };
}

// ───────────────────────── Familles (générateur) ─────────────────────────
/** Défini en TypeScript dans bank/families/<id>.ts ; exécuté au BUILD (Node) pour produire les pools. */
export interface FamilyDefinition<P = Record<string, unknown>> {
  id: string;                        // 'strCountChar'
  title: string;
  notions: { primary: NotionId; secondary: NotionId[] };
  prerequisites: NotionId[];
  kind: ExerciseKind;
  tools: ToolId[];
  difficultyRange: [number, number];
  variants: FamilyVariant<P>[];      // transformations ALGORITHMIQUES (pas seulement des noms)
}
export interface FamilyVariant<P> {
  id: string;                        // 'count-in-range'
  difficulty: 1 | 2 | 3 | 4 | 5;
  estimatedMinutes: number;
  params(rng: Rng): P;               // tirage déterministe
  validParams?(p: P): boolean;       // contraintes de validité
  statement(p: P, names: NamePool): string;          // plusieurs modèles, choisis via rng
  givenVariables(p: P): Exercise['givenVariables'];
  expectedVariables(p: P): Exercise['expectedVariables'];
  starterCode(p: P): string;
  reference(p: P): string;           // solution Java (fragment)
  mutants(p: P): { id: string; label: string; explanationFr: string; code: string }[];
  tests(p: P, rng: Rng): Omit<TestCase, 'expected'>[];   // ≥ 2 public, ≥ 3 hidden, ≥ 1 edge
  hints(p: P): [string, string, string];
}
export interface Rng { next(): number; int(min: number, max: number): number; pick<T>(a: readonly T[]): T; shuffle<T>(a: T[]): T[] }
export interface NamePool { variable(kind: 'int' | 'double' | 'String' | 'array'): string; person(): string }

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
export interface NotionMastery { evidence: number; weightSum: number; distinctFamiliesSucceeded: number; lastSuccessAt?: string; estimate: number }
