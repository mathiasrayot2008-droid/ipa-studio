import { create } from 'zustand';
import { createStore, get, set } from 'idb-keyval';
import type { Exercise } from '@/types/bank';
import { useAuth } from '@/data/auth';
import { firebase } from '@/data/firebase';
import { LocalBank } from './localBank';
import type { BankFile, BankHistoryEntry, BankManifest, BankSource } from './types';

const cache = createStore('ipa-studio:bank-cache', 'kv');
export const localBank = new LocalBank();

export type BankStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error';
interface BankState {
  status: BankStatus;
  source: 'firestore' | 'local' | null;
  version: string | null;
  bank: BankFile | null;
  byKey: Map<string, Exercise>;
  manifest: BankManifest | null;
  error: string | null;
  load(): Promise<void>;
  solution(key: string): Promise<string | undefined>;
  /** Active une version (import, mise à jour ou retour arrière) puis recharge la banque. */
  activate(version: string, action: BankHistoryEntry['action']): Promise<void>;
}

let src: BankSource | null = null;

/** Choisit la source : banque de la cohorte (Firestore) si l'étudiant y a accès et qu'elle existe, sinon banque locale. */
async function pickSource(): Promise<{ source: BankSource; manifest: BankManifest }> {
  const a = useAuth.getState();
  if (a.configured && a.status === 'signed' && a.cohort) {
    try {
      const { db } = await firebase();
      const { FirestoreBank } = await import('./firestoreBank');
      const fs = new FirestoreBank(db);
      const m = await fs.getManifest();
      if (m.current) return { source: fs, manifest: m };
    } catch { /* hors ligne ou règle : on retombe sur la banque locale */ }
  }
  return { source: localBank, manifest: await localBank.getManifest() };
}

export const useBank = create<BankState>((setS, getS) => ({
  status: 'idle', source: null, version: null, bank: null, byKey: new Map(), manifest: null, error: null,

  async load() {
    setS({ status: 'loading', error: null });
    try {
      const { source, manifest } = await pickSource();
      src = source;
      if (!manifest.current) { setS({ status: 'empty', source: source.kind, manifest, bank: null, version: null, byKey: new Map() }); return; }
      const v = manifest.current;
      // Les versions sont immuables : on les met en cache (aucune relecture Firestore tant que la version ne change pas).
      let bank = source.kind === 'firestore' ? await get<BankFile>(`v:${v}`, cache) : await source.getVersion(v);
      if (!bank) {
        bank = await source.getVersion(v);
        if (bank && source.kind === 'firestore') await set(`v:${v}`, bank, cache).catch(() => undefined);
      }
      if (!bank) throw new Error(`La version « ${v} » de la banque est introuvable.`);
      setS({ status: 'ready', source: source.kind, version: v, bank, manifest, byKey: new Map(bank.exercises.map((e) => [e.key, e])) });
    } catch (e) {
      setS({ status: 'error', error: e instanceof Error ? e.message : String(e) });
    }
  },

  async solution(key) {
    const s = getS();
    const ex = s.byKey.get(key);
    if (!src || !s.version || !ex) return undefined;
    return src.getSolution(s.version, key, ex.provenance.session ?? 0);
  },

  async activate(version, action) {
    if (!src) await getS().load();
    if (!src) throw new Error('Aucune source de banque disponible.');
    await src.activate(version, action);
    await getS().load();
  },
}));

export const sessionsOf = (b: BankFile | null) => (b ? [...b.sessions].sort((x, y) => x.number - y.number) : []);
