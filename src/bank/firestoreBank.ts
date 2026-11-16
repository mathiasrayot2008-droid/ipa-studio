import { collection, doc, getDoc, getDocs, setDoc, writeBatch, type Firestore } from 'firebase/firestore';
import { EMPTY_MANIFEST, type BankFile, type BankHistoryEntry, type BankManifest, type BankSession, type BankSource, type SolutionsFile } from './types';
import type { Exercise } from '@/types/bank';

/**
 * Banque Schooding sur Firestore (lecture : cohorte ; écriture : administrateur, cf. contracts/firestore.rules).
 *   schooding/manifest                      { current, versions[], history[] }   ← lu à chaque démarrage (1 lecture)
 *   schooding/{version}/sessions/{n}        { number, title, schoodingId, exercises[] }   ← 1 document par séance
 *   schooding/{version}/solutions/{n}       { solutions: { [key]: code } }                 ← lus à la demande
 * Les versions sont immuables ; une mise à jour = nouvelle version + bascule du manifeste (réversible).
 */
export class FirestoreBank implements BankSource {
  readonly kind = 'firestore' as const;
  constructor(private db: Firestore) {}

  private manifestRef() { return doc(this.db, 'schooding', 'manifest'); }

  async getManifest(): Promise<BankManifest> {
    const s = await getDoc(this.manifestRef());
    return s.exists() ? { ...EMPTY_MANIFEST, ...(s.data() as Partial<BankManifest>) } : { ...EMPTY_MANIFEST, versions: [], history: [] };
  }

  async getVersion(version: string): Promise<BankFile | undefined> {
    const m = await this.getManifest();
    const info = m.versions.find((v) => v.version === version);
    if (!info) return undefined;
    const snap = await getDocs(collection(this.db, 'schooding', version, 'sessions'));
    if (snap.empty) return undefined;
    const docs = snap.docs.map((d) => d.data() as BankSession & { exercises: Exercise[] }).sort((a, b) => a.number - b.number);
    return {
      format: 1, version, builtAt: info.builtAt,
      sessions: docs.map(({ number, title, schoodingId, exercises }) => ({ number, title, schoodingId, exerciseKeys: exercises.map((e) => e.key) })),
      exercises: docs.flatMap((d) => d.exercises),
    };
  }

  async getSolution(version: string, key: string, session: number): Promise<string | undefined> {
    const d = await getDoc(doc(this.db, 'schooding', version, 'solutions', String(session)));
    return d.exists() ? (d.data() as { solutions: Record<string, string> }).solutions[key] || undefined : undefined;
  }

  async putVersion(file: BankFile, solutions?: SolutionsFile) {
    const m = await this.getManifest();
    if (m.versions.some((v) => v.version === file.version)) throw new Error(`La version « ${file.version} » existe déjà : change le numéro de version avant de republier.`);
    const byKey = new Map(file.exercises.map((e) => [e.key, e]));
    for (const s of file.sessions) {
      const b = writeBatch(this.db);
      b.set(doc(this.db, 'schooding', file.version, 'sessions', String(s.number)), { number: s.number, title: s.title, schoodingId: s.schoodingId ?? null, exercises: s.exerciseKeys.map((k) => byKey.get(k)!) });
      if (solutions) b.set(doc(this.db, 'schooding', file.version, 'solutions', String(s.number)), { solutions: Object.fromEntries(s.exerciseKeys.map((k) => [k, solutions.solutions[k] ?? ''])) });
      await b.commit();
    }
    const now = new Date().toISOString();
    m.versions.push({ version: file.version, builtAt: file.builtAt, importedAt: now, exerciseCount: file.exercises.length, sessionCount: file.sessions.length });
    m.history.push({ at: now, action: 'import', version: file.version });
    await setDoc(this.manifestRef(), m);
  }

  async activate(version: string, action: BankHistoryEntry['action']) {
    const m = await this.getManifest();
    if (!m.versions.some((v) => v.version === version)) throw new Error(`Version inconnue : ${version}`);
    m.history.push({ at: new Date().toISOString(), action, version, from: m.current });
    m.current = version;
    await setDoc(this.manifestRef(), m);
  }
}
