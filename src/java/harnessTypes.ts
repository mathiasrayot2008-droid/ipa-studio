/** Forme du JSON produit par ipa.Harness.check (voir java/harness/src/ipa). */
export interface HarnessDiagnostic { kind: 'error' | 'warning'; file: string; line: number; msg: string }

export interface CapturedVar { n: string; t: string; v: unknown }

export interface HarnessTestResult {
  id: string;
  ms: number;
  skipped: boolean;
  timeout: boolean;
  caps: CapturedVar[];
  out: string;
  dbg: string;
  stdout: string;
  grid: string[] | null;
  canvas: { w: number; h: number; hash: string; rle: number[] } | null;
  runner: { x: number; y: number; reached: boolean; touched: boolean; moves: number; path: number[] } | null;
  exc: { type: string; msg: string | null; line: number } | null;
}

export type HarnessOutput =
  | { phase: 'compile'; ok: false; compileMs: number; diagnostics: HarnessDiagnostic[]; raw: string }
  | { phase: 'run'; ok: true; compileMs: number; runMs: number; diagnostics: HarnessDiagnostic[]; hung: boolean; crash: string | null; tests: HarnessTestResult[] }
  | { phase: 'main'; ok: true; compileMs: number; runMs: number; stdout: string; exception: string | null; timedOut: boolean; hung: boolean }
  | { phase: 'forbidden'; what: string; compileMs: number }
  | { phase: 'fs' | 'compiler-crash'; error: string };

export interface JavaSourceFile { name: string; source: string }
