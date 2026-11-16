import { useEffect, useState, type FormEvent } from 'react';
import { Card, Page } from '@/app/Page';
import { useTheme } from '@/app/theme';
import { useAuth } from '@/data/auth';
import type { RepoExport, Settings as S } from '@/data/types';
import { DEFAULT_SETTINGS } from '@/data/types';

const input = 'touch w-full rounded-lg border border-border bg-bg px-3 py-2';
const btn = 'touch rounded-lg bg-accent px-4 font-semibold text-accent-fg disabled:opacity-50';
const btn2 = 'touch rounded-lg border border-border px-4 hover:bg-surface-2 disabled:opacity-50';

function AccountCard() {
  const a = useAuth();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (mode === 'in') void a.signIn(email, pw);
    else void a.signUp(email, pw, name || email.split('@')[0]!, code);
  };

  if (a.status === 'loading') return <Card>Chargement du compte…</Card>;

  if (!a.configured) {
    return (
      <Card>
        <h2 className="mb-2 text-lg font-semibold">Compte</h2>
        <p className="text-sm text-muted">
          <strong className="text-fg">Mode local.</strong> Les comptes personnels ne sont pas encore activés sur ce site : ta progression est enregistrée dans <em>ce navigateur uniquement</em>
          (elle n’est pas synchronisée entre appareils). Tu peux l’exporter ci-dessous. Voir <code>docs/05</code> §6 pour activer les comptes.
        </p>
      </Card>
    );
  }

  if (a.status === 'signed' && a.user) {
    return (
      <Card>
        <h2 className="mb-2 text-lg font-semibold">Compte</h2>
        <p data-testid="account-name">Connecté : <strong>{a.user.displayName}</strong> <span className="text-muted">({a.user.email})</span></p>
        <p className="mt-1 text-sm text-muted">Tes données sont privées : personne d’autre que toi ne peut les lire.</p>
        <div className="mt-3 text-sm">
          Cohorte ESIEE IPA : {a.cohort ? <span className="text-ok" data-testid="cohort-status">membre ✓ (TP Schooding accessibles)</span> : <span className="text-warn" data-testid="cohort-status">non membre</span>}
        </div>
        {!a.cohort && (
          <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); void a.joinCohort(code).then((ok) => setMsg(ok ? 'Bienvenue dans la cohorte !' : '')); }}>
            <input className={input} placeholder="Code d’invitation" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Code d’invitation" />
            <button className={btn} type="submit">Rejoindre</button>
          </form>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <button className={btn2} onClick={() => void a.importGuestData().then((n) => setMsg(`${n} éléments locaux importés dans ton compte.`))}>Importer ma progression locale</button>
          <button className={btn2} onClick={() => void a.signOut()}>Se déconnecter</button>
        </div>
        {msg && <p className="mt-2 text-sm text-ok" role="status">{msg}</p>}
        {a.error && <p className="mt-2 text-sm text-bad" role="alert">{a.error}</p>}
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="mb-2 text-lg font-semibold">Compte</h2>
      <div role="tablist" className="mb-3 flex gap-2">
        {(['in', 'up'] as const).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={`touch rounded-lg px-3 ${mode === m ? 'bg-surface-2 text-accent' : 'text-muted'}`}>{m === 'in' ? 'Connexion' : 'Créer un compte'}</button>
        ))}
      </div>
      <form onSubmit={submit} className="space-y-2">
        {mode === 'up' && <input className={input} placeholder="Prénom ou pseudo" value={name} onChange={(e) => setName(e.target.value)} aria-label="Prénom ou pseudo" autoComplete="nickname" />}
        <input className={input} type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="E-mail" autoComplete="email" required />
        <input className={input} type="password" placeholder="Mot de passe (6 caractères min.)" value={pw} onChange={(e) => setPw(e.target.value)} aria-label="Mot de passe" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} required minLength={6} />
        {mode === 'up' && <input className={input} placeholder="Code d’invitation de la cohorte (optionnel)" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Code d’invitation" />}
        <div className="flex flex-wrap gap-2">
          <button className={btn} type="submit" disabled={a.busy}>{mode === 'in' ? 'Se connecter' : 'Créer mon compte'}</button>
          <button className={btn2} type="button" disabled={a.busy} onClick={() => void a.signInGoogle()}>Continuer avec Google</button>
        </div>
      </form>
      {a.error && <p className="mt-2 text-sm text-bad" role="alert">{a.error}</p>}
      <p className="mt-3 text-xs text-muted">Sans compte, tu peux quand même t’entraîner : la progression reste dans ce navigateur.</p>
    </Card>
  );
}

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const repo = useAuth((s) => s.repo);
  const [s, setS] = useState<S>(DEFAULT_SETTINGS);
  const [msg, setMsg] = useState('');

  useEffect(() => { void repo.getSettings().then(setS); }, [repo]);
  const update = (p: Partial<S>) => { setS((x) => ({ ...x, ...p })); void repo.setSettings(p); };

  const doExport = async () => {
    const data = await repo.exportAll();
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = `ipa-studio-progression-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
  };
  const doImport = async (f: File) => {
    try {
      const x = JSON.parse(await f.text()) as RepoExport;
      if (x.version !== 1) throw new Error('format inconnu');
      await repo.importAll(x);
      setMsg('Progression importée (les données plus récentes ont été conservées).');
    } catch (e) { setMsg(`Import impossible : ${e instanceof Error ? e.message : String(e)}`); }
  };

  return (
    <Page title="Paramètres">
      <div className="space-y-4">
        <AccountCard />
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Affichage</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span>Thème</span>
              <div role="radiogroup" aria-label="Thème" className="flex gap-2">
                {(['dark', 'light'] as const).map((t) => (
                  <button key={t} role="radio" aria-checked={theme === t} onClick={() => { setTheme(t); update({ theme: t }); }} className={`touch rounded-lg border px-3 ${theme === t ? 'border-accent text-accent' : 'border-border text-muted'}`}>{t === 'dark' ? 'Sombre' : 'Clair'}</button>
                ))}
              </div>
            </div>
            <label className="flex items-center justify-between gap-3">
              <span>Taille du code : {s.editorFont}px</span>
              <input type="range" min={12} max={22} value={s.editorFont} onChange={(e) => update({ editorFont: Number(e.target.value) })} aria-label="Taille du code" />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span>Dernière séance étudiée<span className="block text-xs text-muted">Les DST ne contiendront que des notions vues jusque-là.</span></span>
              <select className="touch rounded-lg border border-border bg-bg px-2" value={s.asOfSession ?? ''} onChange={(e) => update({ asOfSession: e.target.value ? Number(e.target.value) : null })} aria-label="Dernière séance étudiée">
                <option value="">La plus récente</option>
                {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>Séance {n}</option>)}
              </select>
            </label>
          </div>
        </Card>
        <Card>
          <h2 className="mb-2 text-lg font-semibold">Mes données</h2>
          <p className="mb-3 text-sm text-muted">Sauvegarde ou transfère ta progression (tentatives, brouillons, DST) dans un fichier.</p>
          <div className="flex flex-wrap gap-2">
            <button className={btn2} onClick={() => void doExport()}>Exporter (JSON)</button>
            <label className={`${btn2} inline-flex cursor-pointer items-center`}>Importer<input type="file" accept="application/json" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void doImport(f); }} /></label>
          </div>
          {msg && <p className="mt-2 text-sm" role="status">{msg}</p>}
        </Card>
      </div>
    </Page>
  );
}
