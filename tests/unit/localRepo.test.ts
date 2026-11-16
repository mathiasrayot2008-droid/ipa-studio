import 'fake-indexeddb/auto';
import { LocalRepo } from '@/data/localRepo';
import { repoContract } from '../helpers/repoContract';

let n = 0;
repoContract('LocalRepo (IndexedDB)', async () => { const r = new LocalRepo(`t${++n}`); await r.clear(); return r; }, async () => { const r = new LocalRepo(`t${++n}`); await r.clear(); return r; });
