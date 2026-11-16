import { createStore, get, set, type UseStore } from 'idb-keyval';
import { EMPTY_MANIFEST, type BankFile, type BankHistoryEntry, type BankManifest, type BankSource, type SolutionsFile } from './types';

let _store: UseStore | undefined;
const store = () => (_store ??= createStore('ipa-studio:bank', 'kv'));

/** Banque sur cet appareil (IndexedDB) : fichier importé à la main ; fonctionne sans compte ni réseau. */
export class LocalBank implements BankSource {
  readonly kind = 'local' as const;
  constructor(private s: UseStore = store()) {}

  async getManifest(): Promise<BankManifest> { return (await get<BankManifest>('manifest', this.s)) ?? { ...EMPTY_MANIFEST, versions: [], history: [] }; }
  getVersion(v: string) { return get<BankFile>(`file:${v}`, this.s); }
  async getSolution(v: string, key: string, _session?: number) { return (await get<SolutionsFile>(`solutions:${v}`, this.s))?.solutions[key]; }

  async putVersion(file: BankFile, solutions?: SolutionsFile) {
    const m = await this.getManifest();
    const existing = await this.getVersion(file.version);
    if (existing && JSON.stringify(existing) !== JSON.stringify(file)) throw new Error(`La version « ${file.version} » existe déjà avec un contenu différent : change le numéro de version (BANK_VERSION) avant de réimporter.`);
    await set(`file:${file.version}`, file, this.s);
    if (solutions) await set(`solutions:${file.version}`, solutions, this.s);
    if (!m.versions.some((x) => x.version === file.version)) {
      m.versions.push({ version: file.version, builtAt: file.builtAt, importedAt: new Date().toISOString(), exerciseCount: file.exercises.length, sessionCount: file.sessions.length });
      m.history.push({ at: new Date().toISOString(), action: 'import', version: file.version });
    }
    await set('manifest', m, this.s);
  }

  async activate(version: string, action: BankHistoryEntry['action']) {
    const m = await this.getManifest();
    if (!m.versions.some((v) => v.version === version)) throw new Error(`Version inconnue : ${version}`);
    m.history.push({ at: new Date().toISOString(), action, version, from: m.current });
    m.current = version;
    await set('manifest', m, this.s);
  }
}
