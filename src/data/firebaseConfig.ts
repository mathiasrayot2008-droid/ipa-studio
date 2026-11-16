import type { FirebaseOptions } from 'firebase/app';

/**
 * Configuration Web Firebase (offre Spark). Ce n'est PAS un secret : l'accès est protégé par les règles Firestore
 * (contracts/firestore.rules). À remplir une fois le projet créé (docs/05 §6, étape 1) ; tant que c'est `null`,
 * l'appli fonctionne en mode local (sans compte, données dans ce navigateur uniquement).
 */
export const FIREBASE_CONFIG: FirebaseOptions | null = null;

/** Build de test avec émulateurs locaux (aucun appel réseau vers Google). */
export const USE_EMULATOR = Boolean(import.meta.env.VITE_FIREBASE_EMULATOR);
export const EMULATOR_CONFIG: FirebaseOptions = { apiKey: 'demo-key', authDomain: 'localhost', projectId: 'demo-ipa-studio' };

export const activeConfig = (): FirebaseOptions | null => (USE_EMULATOR ? EMULATOR_CONFIG : FIREBASE_CONFIG);
export const isFirebaseConfigured = () => activeConfig() !== null;
