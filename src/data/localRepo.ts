import { createStore, del, entries, get, set, type UseStore } from 'idb-keyval';
import type { Attempt } from '@/types/bank';
import { DEFAULT_SETTINGS, EMPTY_MASTERY, type Draft, type DstRecord, type MasteryDoc, type Repo, type RepoExport, type Settings, type StoredAttempt, type TpProgress, type TpProgressEntry } from './types';

const stores = new Map<string, UseStore>();
function store(name: string) {
  let s = stores.get(name);
  if (!s) { s = createStore(`ipa-studio:${name}`, 'kv'); stores.set(name, s); }
  return s;
}

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Stockage local (IndexedDB) : mode « sans compte » et cache de secours. Une base par profil. */
export class LocalRepo implements Repo {
  readonly kind = 'local' as const;
  private s: UseStore;
  constructor(readonly profile = 'guest') { this.s = store(profile); }

  async getSettings(): Promise<Settings> { return { ...DEFAULT_SETTINGS, ...((await get<Partial<Settings>>('settings', this.s)) ?? {}) }; }
  async setSettings(p: Partial<Settings>) { await set('settings', { ...(await this.getSettings()), ...p }, this.s); }

  getDraft(k: string) { return get<Draft>(`draft:${k}`, this.s); }
  async setDraft(k: string, code: string) { await set(`draft:${k}`, { code, updatedAt: Date.now() }, this.s); }

  async addAttempt(a: Attempt) { const id = newId(); await set(`attempt:${a.createdAt}:${id}`, { ...a, id }, this.s); return id; }
  async listAttempts(o: { limit?: number; exerciseKey?: string } = {}) {
    const all = (await entries<string, StoredAttempt>(this.s)).filter(([k]) => String(k).startsWith('attempt:')).map(([, v]) => v);
    const f = o.exerciseKey ? all.filter((a) => a.exerciseKey === o.exerciseKey) : all;
    f.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
    return o.limit ? f.slice(0, o.limit) : f;
  }

  async getProgress(): Promise<TpProgress> { return (await get<TpProgress>('progress', this.s)) ?? {}; }
  async setProgressEntry(k: string, e: TpProgressEntry) { const p = await this.getProgress(); p[k] = e; await set('progress', p, this.s); }

  async getMastery(): Promise<MasteryDoc> { return (await get<MasteryDoc>('mastery', this.s)) ?? structuredClone(EMPTY_MASTERY); }
  async setMastery(m: MasteryDoc) { await set('mastery', m, this.s); }

  async saveDst(id: string, d: DstRecord) { await set(`dst:${id}`, d, this.s); }
  getDst(id: string) { return get<DstRecord>(`dst:${id}`, this.s); }
  async listDsts() {
    return (await entries<string, DstRecord>(this.s)).filter(([k]) => String(k).startsWith('dst:')).map(([k, v]) => ({ id: String(k).slice(4), record: v }))
      .sort((a, b) => b.record.startedAt - a.record.startedAt);
  }

  async exportAll(): Promise<RepoExport> {
    const all = await entries<string, unknown>(this.s);
    const drafts: Record<string, Draft> = {};
    for (const [k, v] of all) if (String(k).startsWith('draft:')) drafts[String(k).slice(6)] = v as Draft;
    const dsts: Record<string, DstRecord> = {};
    for (const d of await this.listDsts()) dsts[d.id] = d.record;
    return { version: 1, settings: await this.getSettings(), drafts, attempts: await this.listAttempts(), progress: await this.getProgress(), mastery: await this.getMastery(), dsts };
  }
  async importAll(x: RepoExport) {
    await set('settings', x.settings, this.s);
    for (const [k, d] of Object.entries(x.drafts)) { const cur = await this.getDraft(k); if (!cur || cur.updatedAt < d.updatedAt) await set(`draft:${k}`, d, this.s); }
    const have = new Set((await this.listAttempts()).map((a) => a.id));
    for (const a of x.attempts) if (!have.has(a.id)) await set(`attempt:${a.createdAt}:${a.id}`, a, this.s);
    const p = await this.getProgress();
    for (const [k, e] of Object.entries(x.progress)) if (!p[k] || p[k]!.updatedAt < e.updatedAt) p[k] = e;
    await set('progress', p, this.s);
    const m = await this.getMastery();
    if (m.updatedAt < x.mastery.updatedAt) await this.setMastery(x.mastery);
    for (const [id, d] of Object.entries(x.dsts)) { const cur = await this.getDst(id); if (!cur || cur.updatedAt < d.updatedAt) await this.saveDst(id, d); }
  }
  async clear() { for (const [k] of await entries(this.s)) await del(k, this.s); }
}
