import { describe, expect, it } from 'vitest';
import type { Attempt } from '@/types/bank';
import type { DstRecord, Repo } from '@/data/types';

const att = (over: Partial<Attempt> = {}): Attempt => ({
  exerciseKey: 'sch-592', context: 'tp', code: 'int x = 1;', status: 'partiel', score: 0.5, testsPassed: 1, testsTotal: 2,
  hintsUsed: 0, solutionShown: false, durationSec: 30, attemptsBefore: 0, firstTimeSeen: true, errorTags: ['wrong:var-value'],
  createdAt: '2026-11-16T10:00:00.000Z', bankVersion: 'v1', ...over,
});

const dst = (id: string, startedAt: number, updatedAt = startedAt): DstRecord => ({
  subject: { id, seed: 'ab12', generatorVersion: '1.0.0', bankVersion: 'v1', config: { scope: 'global', durationMin: 120, level: 'moyen', mode: 'examen', adaptive: true, asOfSession: 9 }, items: [{ exerciseKey: 'fam-x/d1/0001', points: 5, targetDifficulty: 1, estimatedMinutes: 4 }], estimatedTotalMin: 4, hintPolicy: { penalties: [0.1, 0.25, 0.5], solutionRevealedScore: 0 }, createdAt: '2026-11-16T09:00:00.000Z' },
  status: 'running', startedAt, deadlineAt: startedAt + 7_200_000, answers: { 'fam-x/d1/0001': 'int a = 1;' }, hintsUsed: {}, solutionShown: {}, updatedAt,
});

/** Mêmes garanties pour le stockage local et Firestore. `fresh` renvoie un dépôt vide pour un utilisateur neuf. */
export function repoContract(name: string, fresh: () => Promise<Repo>, other: () => Promise<Repo>) {
  describe(`${name} — contrat du dépôt`, () => {
    it('réglages : valeurs par défaut puis fusion partielle', async () => {
      const r = await fresh();
      expect((await r.getSettings()).theme).toBe('dark');
      await r.setSettings({ theme: 'light' });
      await r.setSettings({ editorFont: 18 });
      expect(await r.getSettings()).toMatchObject({ theme: 'light', editorFont: 18 });
    });
    it('brouillons : écrasés, clés de variantes avec « / »', async () => {
      const r = await fresh();
      expect(await r.getDraft('sch-1')).toBeUndefined();
      await r.setDraft('sch-1', 'a');
      await r.setDraft('sch-1', 'b');
      await r.setDraft('fam-strCount/d3/0007', 'c');
      expect((await r.getDraft('sch-1'))?.code).toBe('b');
      expect((await r.getDraft('fam-strCount/d3/0007'))?.code).toBe('c');
    });
    it('tentatives : ordre récent→ancien, limite, filtre par exercice', async () => {
      const r = await fresh();
      await r.addAttempt(att({ createdAt: '2026-11-16T10:00:00.000Z' }));
      await r.addAttempt(att({ createdAt: '2026-11-16T11:00:00.000Z', exerciseKey: 'sch-593', status: 'reussi', score: 1 }));
      await r.addAttempt(att({ createdAt: '2026-11-16T12:00:00.000Z' }));
      const all = await r.listAttempts();
      expect(all.map((a) => a.createdAt)).toEqual(['2026-11-16T12:00:00.000Z', '2026-11-16T11:00:00.000Z', '2026-11-16T10:00:00.000Z']);
      expect(await r.listAttempts({ limit: 2 })).toHaveLength(2);
      const one = await r.listAttempts({ exerciseKey: 'sch-592' });
      expect(one).toHaveLength(2);
      expect(one[0]!.createdAt > one[1]!.createdAt).toBe(true);
      expect(all[0]!.code).toBe('int x = 1;');
    });
    it('progression TP et maîtrise', async () => {
      const r = await fresh();
      await r.setProgressEntry('sch-592', { status: 'reussi', bestScore: 1, timeSec: 90, attempts: 2, updatedAt: 5 });
      await r.setProgressEntry('fam-a/d2/0003', { status: 'en-cours', bestScore: 0.4, timeSec: 10, attempts: 1, updatedAt: 6 });
      const p = await r.getProgress();
      expect(p['sch-592']?.status).toBe('reussi');
      expect(p['fam-a/d2/0003']?.bestScore).toBe(0.4);
      expect((await r.getMastery()).updatedAt).toBe(0);
      await r.setMastery({ notions: { 'N01-variables-types': { evidence: 3, weightSum: 4, distinctFamiliesSucceeded: 2, estimate: 0.71 } }, errorTagCounts: { 'wrong:var-value': 4 }, totals: { attempts: 9, successes: 5 }, updatedAt: 7 });
      expect((await r.getMastery()).notions['N01-variables-types']?.estimate).toBe(0.71);
    });
    it('DST : sauvegarde, relecture, liste du plus récent au plus ancien', async () => {
      const r = await fresh();
      await r.saveDst('d1', dst('d1', 1000));
      await r.saveDst('d2', dst('d2', 2000));
      const d1 = await r.getDst('d1');
      expect(d1?.answers['fam-x/d1/0001']).toBe('int a = 1;');
      expect((await r.listDsts()).map((x) => x.id)).toEqual(['d2', 'd1']);
      expect(await r.getDst('nope')).toBeUndefined();
    });
    it('migration : export d’un dépôt → import dans un autre, idempotent, sans écraser du plus récent', async () => {
      const a = await fresh();
      const b = await other();
      await a.setDraft('sch-1', 'brouillon A');
      await a.addAttempt(att());
      await a.setProgressEntry('sch-1', { status: 'reussi', bestScore: 1, timeSec: 5, attempts: 1, updatedAt: 10 });
      await a.saveDst('d1', dst('d1', 1000, 1000));
      await b.setProgressEntry('sch-1', { status: 'reussi', bestScore: 1, timeSec: 5, attempts: 9, updatedAt: 99 }); // plus récent côté B
      const x = await a.exportAll();
      await b.importAll(x);
      await b.importAll(x);
      expect((await b.getDraft('sch-1'))?.code).toBe('brouillon A');
      expect(await b.listAttempts()).toHaveLength(1);
      expect((await b.getProgress())['sch-1']?.attempts).toBe(9);
      expect((await b.listDsts()).map((d) => d.id)).toEqual(['d1']);
    });
  });
}
