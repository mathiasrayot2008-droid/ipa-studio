import type { Exercise } from '@/types/bank';
import { expectedFrom } from './compare';
import { fingerprintResult } from './fingerprint';
import type { TestVerdict } from './grade';

/** Identifiant stable d'une variante : « fam.strCompte.count-char.03 » → « fam.strCompte.count-char » ; un exercice Schooding reste « sch-592 ». */
export const variantKeyOf = (key: string) => key.replace(/\.\d+$/, '');

type Probe = Pick<Exercise, 'key' | 'kind' | 'expectedVariables' | 'mutantFingerprints'>;

/** Empreinte du comportement de l'étudiant sur un test (même calcul qu'au build pour les erreurs-types). */
export function studentFingerprint(v: TestVerdict, kind: string, expectedVars: Probe['expectedVariables']): string | undefined {
  const act = v.actual;
  if (!act || v.skipped) return undefined;
  if (act.exc) return `EXC:${act.exc.type}`;
  if (act.timeout) return 'TIMEOUT';
  return fingerprintResult(expectedFrom(act, kind, expectedVars));
}

/**
 * Reconnaît une erreur-type connue SANS comparer le code : le comportement observé du programme de l'étudiant doit être identique,
 * sur TOUS les tests, à celui d'une version fautive connue (mutant) validée au build. N'est appelé qu'avec la série complète de tests.
 * Renvoie des étiquettes « mutant:<variante>:<id> ».
 */
export function matchMutants(ex: Probe, verdicts: readonly TestVerdict[]): string[] {
  const fps = ex.mutantFingerprints;
  if (!fps || verdicts.length === 0 || verdicts.every((v) => v.passed)) return [];
  const mine = new Map<string, string | undefined>();
  for (const v of verdicts) mine.set(v.id, studentFingerprint(v, ex.kind, ex.expectedVariables));
  const tags: string[] = [];
  for (const [mutantId, perTest] of Object.entries(fps)) {
    const ids = Object.keys(perTest);
    if (ids.length === 0) continue;
    if (ids.every((id) => mine.has(id) && mine.get(id) !== undefined && mine.get(id) === perTest[id])) tags.push(`mutant:${variantKeyOf(ex.key)}:${mutantId}`);
  }
  return tags;
}
