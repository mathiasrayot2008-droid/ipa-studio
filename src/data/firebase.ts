import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { activeConfig, USE_EMULATOR } from './firebaseConfig';

export interface FirebaseHandles { app: FirebaseApp; auth: Auth; db: Firestore }
let handles: Promise<FirebaseHandles> | null = null;

/** Chargement paresseux : le SDK Firebase (~150 Ko gzip) n'est téléchargé que si une config existe. */
export function firebase(): Promise<FirebaseHandles> {
  const cfg = activeConfig();
  if (!cfg) return Promise.reject(new Error('Firebase non configuré'));
  handles ??= (async () => {
    const [{ initializeApp }, { getAuth, connectAuthEmulator }, fs] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore')]);
    const app = initializeApp(cfg);
    const auth = getAuth(app);
    // Cache persistant : lectures instantanées et écritures mises en file hors connexion (retentées automatiquement).
    const db = USE_EMULATOR
      ? fs.initializeFirestore(app, { localCache: fs.memoryLocalCache() })
      : fs.initializeFirestore(app, { localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }) });
    if (USE_EMULATOR) {
      connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
      fs.connectFirestoreEmulator(db, '127.0.0.1', 8080);
    }
    return { app, auth, db };
  })();
  return handles;
}
