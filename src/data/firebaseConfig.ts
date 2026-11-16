import type { FirebaseOptions } from 'firebase/app';

/**
 * Lit la configuration Web Firebase fournie au build par la variable VITE_FIREBASE_CONFIG (JSON d'une seule ligne).
 * Retourne `null` si elle est absente ou invalide : l'appli reste alors en mode local, sans aucun appel réseau Firebase.
 */
export function parseFirebaseConfig(raw: string | undefined): FirebaseOptions | null {
  if (!raw || !raw.trim()) return null;
  try {
    const c = JSON.parse(raw) as Record<string, unknown>;
    const ok = ['apiKey', 'authDomain', 'projectId', 'appId'].every((k) => typeof c[k] === 'string' && (c[k] as string).length > 0);
    return ok ? (c as FirebaseOptions) : null;
  } catch { return null; }
}

/**
 * Configuration Web Firebase (offre Spark). Ce n'est PAS un secret : l'accès aux données est protégé par les règles
 * Firestore (contracts/firestore.rules). Elle est injectée au build depuis la variable de dépôt GitHub `FIREBASE_CONFIG`
 * (voir docs/06-MISE-EN-PLACE.md) ; tant qu'elle est absente, l'appli fonctionne en mode local (sans compte,
 * données dans ce navigateur uniquement).
 */
export const FIREBASE_CONFIG: FirebaseOptions | null = parseFirebaseConfig(import.meta.env.VITE_FIREBASE_CONFIG);

/** Build de test avec émulateurs locaux (aucun appel réseau vers Google). */
export const USE_EMULATOR = Boolean(import.meta.env.VITE_FIREBASE_EMULATOR);
export const EMULATOR_CONFIG: FirebaseOptions = { apiKey: 'demo-key', authDomain: 'localhost', projectId: 'demo-ipa-studio' };

export const activeConfig = (): FirebaseOptions | null => (USE_EMULATOR ? EMULATOR_CONFIG : FIREBASE_CONFIG);
export const isFirebaseConfigured = () => activeConfig() !== null;
