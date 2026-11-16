import { describe, expect, it } from 'vitest';
import { parseFirebaseConfig } from '@/data/firebaseConfig';

const VALID = { apiKey: 'AIza-test', authDomain: 'ipa-studio.firebaseapp.com', projectId: 'ipa-studio', appId: '1:123:web:abc' };

describe('configuration Firebase injectée au build', () => {
  it('absente, vide ou invalide → null (mode local, aucun appel réseau)', () => {
    expect(parseFirebaseConfig(undefined)).toBeNull();
    expect(parseFirebaseConfig('')).toBeNull();
    expect(parseFirebaseConfig('   ')).toBeNull();
    expect(parseFirebaseConfig('pas du json')).toBeNull();
    expect(parseFirebaseConfig('{"apiKey":"x"}')).toBeNull();
    expect(parseFirebaseConfig(JSON.stringify({ ...VALID, projectId: '' }))).toBeNull();
  });
  it('JSON complet → configuration', () => {
    expect(parseFirebaseConfig(JSON.stringify(VALID))).toEqual(VALID);
  });
});
