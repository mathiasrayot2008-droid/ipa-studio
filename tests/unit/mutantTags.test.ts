import type { Exercise } from '@/types/bank';
import type { TestVerdict } from '@/java/grade';
import { matchMutants, variantKeyOf } from '@/java/mutantTags';
import { fingerprintResult } from '@/java/fingerprint';
import type { HarnessTestResult } from '@/java/harnessTypes';

const act = (v: number): HarnessTestResult => ({ id: 'x', ms: 1, skipped: false, timeout: false, caps: [{ n: 'res', t: 'int', v }], out: '', dbg: '', stdout: '', grid: null, canvas: null, runner: null, exc: null } as unknown as HarnessTestResult);
const verdict = (id: string, v: number, passed: boolean): TestVerdict => ({ id, visibility: 'hidden', weight: 2, passed, ms: 1, mismatches: [], actual: act(v), skipped: false });
const fp = (v: number) => fingerprintResult({ vars: { res: { type: 'int', value: v } } });
const ex = (): Pick<Exercise, 'key' | 'kind' | 'expectedVariables' | 'mutantFingerprints'> => ({
  key: 'fam.f.v.03', kind: 'snippet', expectedVariables: [{ name: 'res', type: 'int' }],
  mutantFingerprints: { off: { t1: fp(5), t2: fp(7) }, inv: { t1: fp(9), t2: fp(1) } },
});

describe('reconnaissance d’erreurs-types par comportement', () => {
  it('identifie le mutant dont le comportement est identique sur tous les tests', () => {
    expect(matchMutants(ex(), [verdict('t1', 5, false), verdict('t2', 7, false)])).toEqual(['mutant:fam.f.v:off']);
  });
  it('ne reconnaît rien si un seul test diffère', () => {
    expect(matchMutants(ex(), [verdict('t1', 5, false), verdict('t2', 8, false)])).toEqual([]);
  });
  it('ne tag pas une solution entièrement correcte', () => {
    expect(matchMutants(ex(), [verdict('t1', 5, true), verdict('t2', 7, true)])).toEqual([]);
  });
  it('ignore un test non exécuté (comportement inconnu)', () => {
    expect(matchMutants(ex(), [verdict('t1', 5, false), { ...verdict('t2', 7, false), actual: undefined, skipped: true }])).toEqual([]);
  });
  it('variantKeyOf retire le numéro d’instance seulement', () => {
    expect(variantKeyOf('fam.strCompte.count-char.12')).toBe('fam.strCompte.count-char');
    expect(variantKeyOf('sch-592')).toBe('sch-592');
  });
});
