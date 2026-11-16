import { create } from 'zustand';
import { LocalRepo } from './localRepo';
import { FirestoreRepo } from './firestoreRepo';
import { firebase } from './firebase';
import { isFirebaseConfigured } from './firebaseConfig';
import type { Repo } from './types';

export interface AuthUser { uid: string; email: string | null; displayName: string }
export type AuthStatus = 'loading' | 'guest' | 'signed';

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  configured: boolean;
  /** Membre de la cohorte (accès aux exercices Schooding). */
  cohort: boolean;
  repo: Repo;
  busy: boolean;
  error: string | null;
  init(): void;
  signUp(email: string, password: string, name: string, inviteCode?: string): Promise<void>;
  signIn(email: string, password: string): Promise<void>;
  signInGoogle(): Promise<void>;
  signOut(): Promise<void>;
  joinCohort(code: string): Promise<boolean>;
  importGuestData(): Promise<number>;
}

const guestRepo = new LocalRepo('guest');

const FR_ERRORS: Record<string, string> = {
  'auth/invalid-credential': 'E-mail ou mot de passe incorrect.',
  'auth/wrong-password': 'E-mail ou mot de passe incorrect.',
  'auth/user-not-found': 'Aucun compte avec cet e-mail.',
  'auth/email-already-in-use': 'Un compte existe déjà avec cet e-mail.',
  'auth/weak-password': 'Mot de passe trop court (6 caractères minimum).',
  'auth/invalid-email': 'Adresse e-mail invalide.',
  'auth/network-request-failed': 'Pas de connexion : réessaie quand tu es en ligne.',
  'auth/too-many-requests': 'Trop de tentatives : patiente quelques minutes.',
  'auth/popup-closed-by-user': 'Connexion Google annulée.',
};
const frError = (e: unknown) => {
  const code = (e as { code?: string })?.code ?? '';
  return FR_ERRORS[code] ?? (e instanceof Error ? e.message : String(e));
};

export const useAuth = create<AuthState>((set, get) => ({
  status: 'loading', user: null, configured: isFirebaseConfigured(), cohort: false, repo: guestRepo, busy: false, error: null,

  init() {
    if (!isFirebaseConfigured()) { set({ status: 'guest', configured: false }); return; }
    void (async () => {
      try {
        const { auth, db } = await firebase();
        const { onAuthStateChanged } = await import('firebase/auth');
        onAuthStateChanged(auth, (u) => {
          if (!u) { set({ status: 'guest', user: null, cohort: false, repo: guestRepo }); return; }
          const repo = new FirestoreRepo(db, u.uid);
          set({ status: 'signed', user: { uid: u.uid, email: u.email, displayName: u.displayName ?? u.email?.split('@')[0] ?? 'Étudiant' }, repo });
          void repo.ensureProfile(u.displayName ?? u.email?.split('@')[0] ?? 'Étudiant').then(() => repo.getProfile()).then((p) => set({ cohort: p?.cohort === 'esiee-ipa-2026' })).catch(() => undefined);
        });
      } catch (e) { set({ status: 'guest', error: frError(e) }); }
    })();
  },

  async signUp(email, password, name, inviteCode) {
    set({ busy: true, error: null });
    try {
      const { auth, db } = await firebase();
      const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      const repo = new FirestoreRepo(db, cred.user.uid);
      const me = { uid: cred.user.uid, email: cred.user.email, displayName: name };
      try { await repo.ensureProfile(name, inviteCode || undefined); await repo.setDisplayName(name); set({ user: me, cohort: Boolean(inviteCode) }); }
      catch { await repo.ensureProfile(name); await repo.setDisplayName(name).catch(() => undefined); set({ user: me, error: "Compte créé, mais le code d'invitation est incorrect : tu pourras le ressaisir dans Paramètres.", cohort: false }); }
    } catch (e) { set({ error: frError(e) }); } finally { set({ busy: false }); }
  },
  async signIn(email, password) {
    set({ busy: true, error: null });
    try { const { auth } = await firebase(); const { signInWithEmailAndPassword } = await import('firebase/auth'); await signInWithEmailAndPassword(auth, email, password); }
    catch (e) { set({ error: frError(e) }); } finally { set({ busy: false }); }
  },
  async signInGoogle() {
    set({ busy: true, error: null });
    try { const { auth } = await firebase(); const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth'); await signInWithPopup(auth, new GoogleAuthProvider()); }
    catch (e) { set({ error: frError(e) }); } finally { set({ busy: false }); }
  },
  async signOut() {
    const { auth } = await firebase();
    const { signOut } = await import('firebase/auth');
    await signOut(auth);
  },
  async joinCohort(code) {
    const r = get().repo;
    if (!(r instanceof FirestoreRepo)) return false;
    try { await r.ensureProfile(get().user?.displayName ?? 'Étudiant', code); set({ cohort: true, error: null }); return true; }
    catch { set({ error: "Code d'invitation incorrect." }); return false; }
  },
  async importGuestData() {
    const x = await guestRepo.exportAll();
    await get().repo.importAll(x);
    return x.attempts.length + Object.keys(x.progress).length + Object.keys(x.dsts).length;
  },
}));
