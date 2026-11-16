import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import type { Firestore } from 'firebase/firestore';
import { FirestoreBank } from '@/bank/firestoreBank';
import { bankContract, V1 } from '../helpers/bankContract';

let env: RulesTestEnvironment;
beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-ipa-studio', firestore: { rules: readFileSync('contracts/firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 } });
});
afterAll(async () => { await env.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'config/admins'), { uids: ['admin'] });
    await setDoc(doc(db, 'users/stu'), { displayName: 'Étudiant', createdAt: 1, settings: {}, cohort: 'esiee-ipa-2026' });
    await setDoc(doc(db, 'users/out'), { displayName: 'Extérieur', createdAt: 1, settings: {} });
  });
});
const fs = (uid: string) => env.authenticatedContext(uid).firestore() as unknown as Firestore;

// L'administrateur publie ; un étudiant de la cohorte lit — avec les VRAIES règles.
bankContract('FirestoreBank (émulateur + règles : admin écrit, cohorte lit)', async () => ({ writer: new FirestoreBank(fs('admin')), reader: new FirestoreBank(fs('stu')) }));

describe('FirestoreBank : droits', () => {
  it('un étudiant (même de la cohorte) ne peut ni publier ni activer une version', async () => {
    const stu = new FirestoreBank(fs('stu'));
    await expect(stu.putVersion(V1)).rejects.toThrow();
    await expect(stu.activate('v1', 'activate')).rejects.toThrow();
  });
  it('un compte hors cohorte ne peut pas lire la banque', async () => {
    const admin = new FirestoreBank(fs('admin'));
    await admin.putVersion(V1); await admin.activate('v1', 'activate');
    await expect(new FirestoreBank(fs('out')).getManifest()).rejects.toThrow();
    await assertSucceeds(new FirestoreBank(fs('stu')).getManifest());
  });
  it('un visiteur non connecté ne peut rien lire', async () => {
    const anon = env.unauthenticatedContext().firestore() as unknown as Firestore;
    await assertFails(new FirestoreBank(anon).getManifest());
  });
});
