import type { Exercise } from '@/types/bank';
import { diffBanks } from '@/bank/diff';
import type { BankFile, BankSource, SolutionsFile } from '@/bank/types';

const ex = (n: number, extra: Partial<Exercise> = {}): Exercise => ({
  key: `sch-${n}`, origin: 'schooding', kind: 'snippet', title: `Exercice ${n}`, statementMd: `Énoncé fictif ${n}`,
  notions: { primary: 'N01-variables-types', secondary: [] }, difficulty: 1, estimatedMinutes: 3, tools: [], givenVariables: [], expectedVariables: [],
  starterCode: '', compare: { trimLines: true, ignoreTrailingEmptyLines: true, caseSensitive: true, doubleTolerance: 1e-9 }, tests: [], hints: ['a', 'b', 'c'],
  referenceSolution: '', provenance: { source: 'test', bankVersion: 'x', session: 1 }, ...extra,
});
const bank = (version: string, exs: Exercise[]): BankFile => ({
  format: 1, version, builtAt: '2026-11-16T00:00:00Z', sessions: [{ number: 1, title: 'Séance fictive', exerciseKeys: exs.map((e) => e.key) }], exercises: exs,
});
export const V1 = bank('v1', [ex(1), ex(2), ex(3)]);
export const V2 = bank('v2', [ex(1), ex(2, { statementMd: 'Énoncé modifié' }), ex(4)]);
export const SOL1: SolutionsFile = { format: 1, version: 'v1', solutions: { 'sch-1': 'int a = 1;', 'sch-2': 'int b = 2;', 'sch-3': 'int c = 3;' } };

/** Contrat commun : `writer` publie, `reader` lit (mêmes données). */
export function bankContract(name: string, make: () => Promise<{ writer: BankSource; reader: BankSource }>) {
  describe(name, () => {
    it('banque vide au départ', async () => {
      const { reader } = await make();
      const m = await reader.getManifest();
      expect(m.current).toBeNull();
      expect(m.versions).toEqual([]);
    });

    it('importer une version ne l’active pas ; l’activer la rend lisible', async () => {
      const { writer, reader } = await make();
      await writer.putVersion(V1, SOL1);
      let m = await reader.getManifest();
      expect(m.current).toBeNull();
      expect(m.versions.map((v) => v.version)).toEqual(['v1']);
      await writer.activate('v1', 'activate');
      m = await reader.getManifest();
      expect(m.current).toBe('v1');
      const b = await reader.getVersion('v1');
      expect(b?.exercises.map((e) => e.key)).toEqual(['sch-1', 'sch-2', 'sch-3']);
      expect(b?.sessions[0]?.exerciseKeys).toEqual(['sch-1', 'sch-2', 'sch-3']);
      expect(await reader.getSolution('v1', 'sch-2', 1)).toBe('int b = 2;');
    });

    it('mise à jour puis retour arrière : les deux versions restent lisibles, rien n’est perdu', async () => {
      const { writer, reader } = await make();
      await writer.putVersion(V1, SOL1);
      await writer.activate('v1', 'activate');
      await writer.putVersion(V2);
      await writer.activate('v2', 'activate');
      expect((await reader.getManifest()).current).toBe('v2');
      await writer.activate('v1', 'rollback');
      const m = await reader.getManifest();
      expect(m.current).toBe('v1');
      expect(m.versions.map((v) => v.version)).toEqual(['v1', 'v2']);
      expect(m.history.map((h) => `${h.action}:${h.version}`)).toEqual(['import:v1', 'activate:v1', 'import:v2', 'activate:v2', 'rollback:v1']);
      expect((await reader.getVersion('v2'))?.exercises.map((e) => e.key)).toEqual(['sch-1', 'sch-2', 'sch-4']);
      expect((await reader.getVersion('v1'))?.exercises.map((e) => e.key)).toEqual(['sch-1', 'sch-2', 'sch-3']);
    });

    it('refuse de remplacer une version existante par un contenu différent', async () => {
      const { writer } = await make();
      await writer.putVersion(V1);
      await expect(writer.putVersion({ ...V1, exercises: [ex(1, { statementMd: 'autre' })], sessions: [{ number: 1, title: 'S', exerciseKeys: ['sch-1'] }] })).rejects.toThrow(/existe déjà/);
    });

    it('refuse d’activer une version inconnue', async () => {
      const { writer } = await make();
      await expect(writer.activate('v9', 'activate')).rejects.toThrow(/inconnue/);
    });
  });

  describe(`${name} : diff`, () => {
    it('détecte ajouts, suppressions et modifications', () => {
      const d = diffBanks(V1, V2);
      expect(d.added).toEqual(['sch-4']);
      expect(d.removed).toEqual(['sch-3']);
      expect(d.changed).toEqual(['sch-2']);
      expect(d.unchanged).toBe(1);
    });
    it('première importation : tout est ajouté', () => {
      expect(diffBanks(undefined, V1).added).toHaveLength(3);
    });
  });
}
