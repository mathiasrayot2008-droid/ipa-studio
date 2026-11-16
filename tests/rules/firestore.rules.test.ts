import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs } from 'firebase/firestore';
import { readFileSync } from 'node:fs';

const CODE = 'code-secret-2026';
let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-ipa-studio',
    firestore: { rules: readFileSync('contracts/firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
afterAll(async () => { await env.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'config/cohort'), { code: CODE });
    await setDoc(doc(db, 'config/admins'), { uids: ['mathias'] });
    await setDoc(doc(db, 'schooding/v1/exercises/sch-1'), { title: 'Contenu Schooding privé' });
    await setDoc(doc(db, 'schooding/current'), { version: 'v1' });
    await setDoc(doc(db, 'users/alice'), { displayName: 'Alice', createdAt: 1, cohort: 'esiee-ipa-2026', inviteCode: CODE });
    await setDoc(doc(db, 'users/alice/attempts/a1'), { code: 'int x = 1;', score: 1 });
    await setDoc(doc(db, 'users/alice/drafts/sch-1'), { code: 'int y;' });
    await setDoc(doc(db, 'users/bob'), { displayName: 'Bob', createdAt: 1 });
    await setDoc(doc(db, 'users/mathias'), { displayName: 'Mathias', createdAt: 1, cohort: 'esiee-ipa-2026', inviteCode: CODE });
  });
});

const as = (uid: string | null) => (uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore());

describe('A. comptes séparés', () => {
  it('chacun lit et écrit ses propres données', async () => {
    const a = as('alice');
    await assertSucceeds(getDoc(doc(a, 'users/alice')));
    await assertSucceeds(getDoc(doc(a, 'users/alice/attempts/a1')));
    await assertSucceeds(setDoc(doc(a, 'users/alice/drafts/sch-2'), { code: 'x' }));
    await assertSucceeds(addDoc(collection(a, 'users/alice/attempts'), { code: 'y', score: 0.5 }));
    await assertSucceeds(setDoc(doc(a, 'users/alice/stats/mastery'), { 'N01-variables-types': { estimate: 0.4 } }));
  });
  it('Bob ne lit AUCUNE donnée d’Alice (profil, tentatives, brouillons, liste)', async () => {
    const b = as('bob');
    await assertFails(getDoc(doc(b, 'users/alice')));
    await assertFails(getDoc(doc(b, 'users/alice/attempts/a1')));
    await assertFails(getDoc(doc(b, 'users/alice/drafts/sch-1')));
    await assertFails(getDocs(collection(b, 'users/alice/attempts')));
    await assertFails(getDocs(collection(b, 'users')));
  });
  it('Bob n’écrit, ne modifie, ne supprime rien chez Alice', async () => {
    const b = as('bob');
    await assertFails(setDoc(doc(b, 'users/alice/attempts/hack'), { code: 'z' }));
    await assertFails(setDoc(doc(b, 'users/alice/drafts/sch-1'), { code: 'écrasé' }));
    await assertFails(updateDoc(doc(b, 'users/alice'), { displayName: 'Pirate' }));
  });
  it('un visiteur non connecté ne lit ni n’écrit rien', async () => {
    const n = as(null);
    await assertFails(getDoc(doc(n, 'users/alice')));
    await assertFails(getDoc(doc(n, 'schooding/v1/exercises/sch-1')));
    await assertFails(setDoc(doc(n, 'users/x'), { displayName: 'x', createdAt: 1 }));
  });
  it('le profil refuse les champs inattendus (pas d’auto-promotion admin)', async () => {
    const c = as('carol');
    await assertSucceeds(setDoc(doc(c, 'users/carol'), { displayName: 'Carol', createdAt: 1, settings: { theme: 'dark' } }));
    await assertFails(setDoc(doc(c, 'users/carol2'), { displayName: 'x', createdAt: 1 }));
    await assertFails(setDoc(doc(as('dave'), 'users/dave'), { displayName: 'Dave', createdAt: 1, isAdmin: true }));
  });
});

describe('cohorte et code d’invitation', () => {
  it('config/* n’est lisible ni modifiable par aucun client (même connecté, même admin)', async () => {
    for (const uid of ['alice', 'mathias']) {
      await assertFails(getDoc(doc(as(uid), 'config/cohort')));
      await assertFails(getDoc(doc(as(uid), 'config/admins')));
      await assertFails(setDoc(doc(as(uid), 'config/admins'), { uids: [uid] }));
    }
  });
  it('rejoindre la cohorte : mauvais code refusé, bon code accepté', async () => {
    const b = as('bob');
    await assertFails(updateDoc(doc(b, 'users/bob'), { cohort: 'esiee-ipa-2026', inviteCode: 'devine' }));
    await assertSucceeds(updateDoc(doc(b, 'users/bob'), { cohort: 'esiee-ipa-2026', inviteCode: CODE }));
  });
  it('contenus Schooding : membres et admin lisent, les autres non', async () => {
    await assertSucceeds(getDoc(doc(as('alice'), 'schooding/v1/exercises/sch-1')));
    await assertSucceeds(getDoc(doc(as('alice'), 'schooding/current')));
    await assertSucceeds(getDoc(doc(as('mathias'), 'schooding/v1/exercises/sch-1')));
    await assertFails(getDoc(doc(as('bob'), 'schooding/v1/exercises/sch-1')));
    await assertFails(getDoc(doc(as('bob'), 'schooding/current')));
  });
  it('contenus Schooding : seul l’admin écrit (import), jamais un étudiant', async () => {
    await assertSucceeds(setDoc(doc(as('mathias'), 'schooding/v2/exercises/sch-2'), { title: 'Nouveau' }));
    await assertSucceeds(setDoc(doc(as('mathias'), 'schooding/current'), { version: 'v2' }));
    await assertSucceeds(setDoc(doc(as('mathias'), 'imports/i1'), { added: 1 }));
    await assertFails(setDoc(doc(as('alice'), 'schooding/v2/exercises/sch-2'), { title: 'Pirate' }));
    await assertFails(setDoc(doc(as('alice'), 'schooding/current'), { version: 'v0' }));
    await assertFails(setDoc(doc(as('alice'), 'imports/i2'), { added: 0 }));
  });
  it('journal des imports : lisible par la cohorte', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => { await setDoc(doc(ctx.firestore(), 'imports/i0'), { added: 3 }); });
    await assertSucceeds(getDoc(doc(as('alice'), 'imports/i0')));
    await assertFails(getDoc(doc(as('bob'), 'imports/i0')));
  });
});

describe('statistiques globales anonymes', () => {
  it('incrément de +1 seulement', async () => {
    const a = as('alice');
    await assertSucceeds(setDoc(doc(a, 'stats/fam-x'), { n: 1, sumLogSec: 4.2, updatedAt: 1 }));
    await assertSucceeds(updateDoc(doc(a, 'stats/fam-x'), { n: 2, sumLogSec: 8, updatedAt: 2 }));
    await assertFails(updateDoc(doc(a, 'stats/fam-x'), { n: 99, sumLogSec: 8, updatedAt: 3 }));
    await assertFails(updateDoc(doc(a, 'stats/fam-x'), { n: 0, sumLogSec: 0, updatedAt: 3 }));
  });
});
