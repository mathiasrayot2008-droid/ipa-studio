import 'fake-indexeddb/auto';
import { createStore } from 'idb-keyval';
import { LocalBank } from '@/bank/localBank';
import { LocalRepo } from '@/data/localRepo';
import { validateBank } from '@/bank/diff';
import { bankContract, V1, V2 } from '../helpers/bankContract';

let n = 0;
bankContract('LocalBank (IndexedDB)', async () => {
  const b = new LocalBank(createStore(`bank-test-${++n}`, 'kv'));
  return { writer: b, reader: b };
});

describe('import de banque et progression de l’étudiant', () => {
  it('la progression et les tentatives ne changent pas lors d’une mise à jour ni d’un retour arrière', async () => {
    const bank = new LocalBank(createStore(`bank-test-prog-${++n}`, 'kv'));
    const repo = new LocalRepo(`prog${n}`);
    await repo.clear();
    await bank.putVersion(V1); await bank.activate('v1', 'activate');
    await repo.setProgressEntry('sch-3', { status: 'reussi', bestScore: 1, timeSec: 42, attempts: 2, updatedAt: 1 });
    await repo.addAttempt({ exerciseKey: 'sch-3', context: 'tp', code: 'x', status: 'reussi', score: 1, testsPassed: 1, testsTotal: 1, hintsUsed: 0, solutionShown: false, durationSec: 42, attemptsBefore: 1, firstTimeSeen: false, errorTags: [], createdAt: '2026-11-16T10:00:00Z', bankVersion: 'v1' });
    const before = JSON.stringify([await repo.getProgress(), await repo.listAttempts()]);

    await bank.putVersion(V2); await bank.activate('v2', 'activate');   // sch-3 disparaît de la banque
    expect(JSON.stringify([await repo.getProgress(), await repo.listAttempts()])).toBe(before);
    await bank.activate('v1', 'rollback');
    expect(JSON.stringify([await repo.getProgress(), await repo.listAttempts()])).toBe(before);
  });

  it('validateBank refuse les fichiers incohérents', () => {
    expect(() => validateBank({})).toThrow(/invalide/);
    expect(() => validateBank({ ...V1, exercises: [V1.exercises[0], V1.exercises[0]] })).toThrow(/double/);
    expect(() => validateBank({ ...V1, sessions: [{ number: 1, title: 'x', exerciseKeys: ['sch-99'] }] })).toThrow(/inconnu/);
    expect(() => validateBank(V1)).not.toThrow();
  });
});
