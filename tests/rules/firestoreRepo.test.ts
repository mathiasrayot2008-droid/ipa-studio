import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import type { Firestore } from 'firebase/firestore';
import { FirestoreRepo } from '@/data/firestoreRepo';
import { repoContract } from '../helpers/repoContract';

let env: RulesTestEnvironment;
let n = 0;
beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-ipa-studio', firestore: { rules: readFileSync('contracts/firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 } });
});
afterAll(async () => { await env.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); });

// Chaque dépôt appartient à un utilisateur différent, avec les VRAIES règles de sécurité appliquées.
// Le profil est créé à la connexion (comme dans l'appli) : les règles refusent un profil sans nom.
const mk = async () => {
  const uid = `u${++n}`;
  const db = env.authenticatedContext(uid).firestore() as unknown as Firestore;
  const repo = new FirestoreRepo(db, uid);
  await repo.ensureProfile(`Étudiant ${n}`);
  return repo;
};
repoContract('FirestoreRepo (émulateur + règles)', mk, mk);
