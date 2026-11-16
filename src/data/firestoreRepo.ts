import { addDoc, collection, doc, getDoc, getDocs, limit as qLimit, orderBy, query, setDoc, where, type Firestore } from 'firebase/firestore';
import type { Attempt } from '@/types/bank';
import { DEFAULT_SETTINGS, EMPTY_MASTERY, decodeKey, encodeKey, type Draft, type DstRecord, type MasteryDoc, type Repo, type RepoExport, type Settings, type StoredAttempt, type TpProgress, type TpProgressEntry } from './types';

/** Retire récursivement les `undefined` (refusés par Firestore). */
function clean<T>(v: T): T { return JSON.parse(JSON.stringify(v)) as T; }

/**
 * Stockage Firestore (offre Spark) : users/{uid}/…  Les règles garantissent l'étanchéité entre comptes.
 * Budget de requêtes : le tableau de bord lit 3 documents + 5 tentatives ; les brouillons sont limités
 * côté appelant (≤ 1 écriture / 30 s par exercice, cf. DraftSaver).
 */
export class FirestoreRepo implements Repo {
  readonly kind = 'firestore' as const;
  constructor(private db: Firestore, readonly uid: string) {}
  private d = (...p: string[]) => doc(this.db, 'users', this.uid, ...p);
  private c = (name: string) => collection(this.db, 'users', this.uid, name);

  async getSettings(): Promise<Settings> {
    const s = await getDoc(doc(this.db, 'users', this.uid));
    return { ...DEFAULT_SETTINGS, ...((s.data()?.settings as Partial<Settings> | undefined) ?? {}) };
  }
  async setSettings(p: Partial<Settings>) {
    await setDoc(doc(this.db, 'users', this.uid), { settings: clean({ ...(await this.getSettings()), ...p }) }, { merge: true });
  }
  /** Crée le profil à la première connexion (nom + éventuellement code d'invitation). */
  async ensureProfile(displayName: string, inviteCode?: string) {
    const ref = doc(this.db, 'users', this.uid);
    const s = await getDoc(ref);
    if (!s.exists()) await setDoc(ref, clean({ displayName: displayName.slice(0, 40), createdAt: Date.now(), settings: DEFAULT_SETTINGS, ...(inviteCode ? { cohort: 'esiee-ipa-2026', inviteCode } : {}) }));
    else if (inviteCode) await setDoc(ref, { cohort: 'esiee-ipa-2026', inviteCode }, { merge: true });
  }
  /** Corrige le nom affiché (l'écouteur d'authentification peut créer le profil avant que le prénom saisi soit connu). */
  async setDisplayName(name: string) { await setDoc(doc(this.db, 'users', this.uid), { displayName: name.slice(0, 40) }, { merge: true }); }
  async getProfile() { const s = await getDoc(doc(this.db, 'users', this.uid)); return s.exists() ? (s.data() as { displayName: string; cohort?: string }) : undefined; }

  async getDraft(k: string) { const s = await getDoc(this.d('drafts', encodeKey(k))); return s.exists() ? (s.data() as Draft) : undefined; }
  async setDraft(k: string, code: string) { await setDoc(this.d('drafts', encodeKey(k)), { code, updatedAt: Date.now() }); }

  async addAttempt(a: Attempt) { const r = await addDoc(this.c('attempts'), clean(a)); return r.id; }
  async listAttempts(o: { limit?: number; exerciseKey?: string } = {}) {
    // `where` + `orderBy` sur deux champs exigerait un index composite (à créer à la main dans la console) :
    // on évite cette dépendance en triant côté client les tentatives d'un exercice (peu nombreuses).
    if (o.exerciseKey) {
      const docs = (await getDocs(query(this.c('attempts'), where('exerciseKey', '==', o.exerciseKey), qLimit(200)))).docs;
      const all = docs.map((x) => ({ ...(x.data() as Attempt), id: x.id }) as StoredAttempt).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      return all.slice(0, o.limit ?? 50);
    }
    const q = query(this.c('attempts'), orderBy('createdAt', 'desc'), qLimit(o.limit ?? 50));
    return (await getDocs(q)).docs.map((x) => ({ ...(x.data() as Attempt), id: x.id }) as StoredAttempt);
  }

  async getProgress(): Promise<TpProgress> {
    const s = await getDoc(this.d('progress', 'tp'));
    const raw = (s.data() ?? {}) as TpProgress;
    return Object.fromEntries(Object.entries(raw).map(([k, v]) => [decodeKey(k), v]));
  }
  async setProgressEntry(k: string, e: TpProgressEntry) { await setDoc(this.d('progress', 'tp'), { [encodeKey(k)]: clean(e) }, { merge: true }); }

  async getMastery(): Promise<MasteryDoc> { const s = await getDoc(this.d('stats', 'mastery')); return s.exists() ? (s.data() as MasteryDoc) : structuredClone(EMPTY_MASTERY); }
  async setMastery(m: MasteryDoc) { await setDoc(this.d('stats', 'mastery'), clean(m)); }

  async saveDst(id: string, r: DstRecord) { await setDoc(this.d('dsts', id), clean(r)); }
  async getDst(id: string) { const s = await getDoc(this.d('dsts', id)); return s.exists() ? (s.data() as DstRecord) : undefined; }
  async listDsts() {
    const q = query(this.c('dsts'), orderBy('startedAt', 'desc'), qLimit(100));
    return (await getDocs(q)).docs.map((x) => ({ id: x.id, record: x.data() as DstRecord }));
  }

  async exportAll(): Promise<RepoExport> {
    const drafts: Record<string, Draft> = {};
    for (const x of (await getDocs(this.c('drafts'))).docs) drafts[decodeKey(x.id)] = x.data() as Draft;
    const dsts: Record<string, DstRecord> = {};
    for (const d of await this.listDsts()) dsts[d.id] = d.record;
    return { version: 1, settings: await this.getSettings(), drafts, attempts: await this.listAttempts({ limit: 1000 }), progress: await this.getProgress(), mastery: await this.getMastery(), dsts };
  }
  async importAll(x: RepoExport) {
    await this.setSettings(x.settings);
    for (const [k, d] of Object.entries(x.drafts)) { const cur = await this.getDraft(k); if (!cur || cur.updatedAt < d.updatedAt) await setDoc(this.d('drafts', encodeKey(k)), d); }
    const have = new Set((await this.listAttempts({ limit: 1000 })).map((a) => a.id));
    for (const a of x.attempts) if (!have.has(a.id)) await setDoc(this.d('attempts', a.id), clean(a));
    const p = await this.getProgress();
    for (const [k, e] of Object.entries(x.progress)) if (!p[k] || p[k]!.updatedAt < e.updatedAt) await this.setProgressEntry(k, e);
    const m = await this.getMastery();
    if (m.updatedAt < x.mastery.updatedAt) await this.setMastery(x.mastery);
    for (const [id, d] of Object.entries(x.dsts)) { const cur = await this.getDst(id); if (!cur || cur.updatedAt < d.updatedAt) await this.saveDst(id, d); }
  }
}
