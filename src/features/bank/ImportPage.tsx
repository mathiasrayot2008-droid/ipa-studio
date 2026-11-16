import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Page } from '@/app/Page';
import { previewImport, type ImportPreview } from '@/bank/importer';
import { localBank, useBank } from '@/bank/store';
import { FirestoreBank } from '@/bank/firestoreBank';
import type { BankFile } from '@/bank/types';
import { useAuth } from '@/data/auth';
import { firebase } from '@/data/firebase';

const FID_LABEL: Record<string, string> = { exact: 'fidèles', 'assets-recreated': 'éléments recréés', reconstructed: 'reconstitués', unavailable: 'énoncé seul' };
const ACTION_LABEL = { import: 'Import', activate: 'Activation', rollback: 'Retour arrière' } as const;
const readText = (f: File) => f.text();

function DiffList({ title, keys, titles }: { title: string; keys: string[]; titles: (k: string) => string }) {
  if (!keys.length) return null;
  return (
    <details className="text-sm"><summary className="cursor-pointer">{title} ({keys.length})</summary>
      <ul className="mt-1 list-disc pl-5 text-muted">{keys.slice(0, 60).map((k) => <li key={k}>{titles(k)}</li>)}{keys.length > 60 && <li>… et {keys.length - 60} autres</li>}</ul>
    </details>
  );
}

export default function ImportPage() {
  const { bank, manifest, version, source, load } = useBank();
  const { configured, status, cohort } = useAuth();
  const [bankFile, setBankFile] = useState<File | null>(null);
  const [solFile, setSolFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [activateNow, setActivateNow] = useState(true);


  useEffect(() => {
    if (!bankFile) { setPreview(null); return; }
    let off = false;
    void (async () => {
      try {
        const p = previewImport(await readText(bankFile), solFile ? await readText(solFile) : undefined, bank ?? undefined);
        if (!off) setPreview(p);
      } catch (e) { if (!off) { setPreview(null); setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) }); } }
    })();
    return () => { off = true; };
  }, [bankFile, solFile, bank]);

  const titles = (k: string) => `${(preview?.file.exercises.find((e) => e.key === k) ?? bank?.exercises.find((e) => e.key === k))?.title ?? k}`;
  const exists = (preview && manifest?.versions.some((v) => v.version === preview.file.version)) ?? false;

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(true); setMsg(null);
    try { await fn(); setMsg({ ok: true, text: label }); }
    catch (e) {
      const code = (e as { code?: string }).code;
      setMsg({ ok: false, text: code === 'permission-denied' ? 'Refusé : seul l’administrateur de la cohorte peut publier ou changer la version.' : e instanceof Error ? e.message : String(e) });
    } finally { setBusy(false); }
  };

  const importLocal = () => run(`Banque « ${preview!.file.version} » importée sur cet appareil${activateNow ? ' et activée' : ''}.`, async () => {
    await localBank.putVersion(preview!.file, preview!.solutions);
    if (activateNow) await localBank.activate(preview!.file.version, 'activate');
    await load();
  });

  const publish = () => run(`Banque « ${preview!.file.version} » publiée pour la cohorte${activateNow ? ' et activée' : ''}.`, async () => {
    const { db } = await firebase();
    const fs = new FirestoreBank(db);
    await fs.putVersion(preview!.file as BankFile, preview!.solutions);
    if (activateNow) await fs.activate(preview!.file.version, 'activate');
    await load();
  });

  const activate = (v: string, action: 'activate' | 'rollback') => run(`Version « ${v} » ${action === 'rollback' ? 'restaurée' : 'activée'}.`, () => useBank.getState().activate(v, action));

  return (
    <Page title="Banque d’exercices" wide>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <h2 className="font-semibold">Importer une nouvelle version</h2>
          <p className="text-sm text-muted">Chaque import crée une <strong>nouvelle version</strong> : l’ancienne est conservée et tu peux y revenir à tout moment. Ta progression (tentatives, brouillons, réussites) n’est jamais modifiée.</p>
          <label className="block text-sm">Fichier de banque (<code>schooding-bank-….json</code>)
            <input type="file" accept="application/json,.json" onChange={(e) => { setMsg(null); setBankFile(e.target.files?.[0] ?? null); }} className="mt-1 block w-full text-sm" data-testid="file-bank" />
          </label>
          <label className="block text-sm">Fichier de solutions (facultatif, <code>schooding-solutions-….json</code>)
            <input type="file" accept="application/json,.json" onChange={(e) => { setMsg(null); setSolFile(e.target.files?.[0] ?? null); }} className="mt-1 block w-full text-sm" data-testid="file-solutions" />
          </label>

          {preview && (
            <div className="space-y-2 rounded-lg border border-border bg-surface-2 p-3" data-testid="preview">
              <div className="font-medium">Version « {preview.file.version} » — {preview.file.exercises.length} exercices, {preview.file.sessions.length} séances</div>
              <div className="text-sm text-muted">{Object.entries(preview.fidelity).map(([k, n]) => `${n} ${FID_LABEL[k] ?? k}`).join(' · ')}</div>
              {bank ? (
                <div className="space-y-1">
                  <div className="text-sm" data-testid="diff-summary">Par rapport à « {version} » : <strong>{preview.diff.added.length}</strong> ajouté(s), <strong>{preview.diff.changed.length}</strong> modifié(s), <strong>{preview.diff.removed.length}</strong> retiré(s), {preview.diff.unchanged} inchangé(s).</div>
                  <DiffList title="Ajoutés" keys={preview.diff.added} titles={titles} />
                  <DiffList title="Modifiés (la correction change ; tes anciennes tentatives restent valables)" keys={preview.diff.changed} titles={titles} />
                  <DiffList title="Retirés (ta progression reste conservée)" keys={preview.diff.removed} titles={titles} />
                </div>
              ) : <div className="text-sm text-muted">Première importation : aucune banque à comparer.</div>}
              {preview.missingSolutions.length > 0 && <div className="text-sm text-warn">{preview.missingSolutions.length} exercice(s) sans solution de référence dans ce lot (le bouton « Voir la solution » sera indisponible).</div>}
              {exists && <div className="text-sm text-warn" role="alert">Cette version est déjà installée : l’import sera refusé si son contenu diffère. Change le numéro de version avant de réimporter.</div>}
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={activateNow} onChange={(e) => setActivateNow(e.target.checked)} /> L’activer tout de suite</label>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy} onClick={() => void importLocal()} className="touch rounded-lg bg-accent px-4 font-semibold text-accent-fg disabled:opacity-50" data-testid="import-local">Importer sur cet appareil</button>
                {configured && status === 'signed' && cohort && (
                  <button type="button" disabled={busy} onClick={() => void publish()} className="touch rounded-lg bg-surface px-4 font-medium ring-1 ring-border hover:bg-border disabled:opacity-50" data-testid="import-publish">Publier pour la cohorte (admin)</button>
                )}
              </div>
            </div>
          )}
          {msg && <p role={msg.ok ? 'status' : 'alert'} className={`text-sm ${msg.ok ? 'text-ok' : 'text-bad'}`} data-testid="import-msg">{msg.text}</p>}
        </Card>

        <Card className="space-y-3">
          <h2 className="font-semibold">Versions installées</h2>
          <p className="text-sm text-muted">Source active : {source === 'firestore' ? 'banque de la cohorte (en ligne)' : source === 'local' ? 'cet appareil' : '—'}.</p>
          {!manifest?.versions.length && <p className="text-sm text-muted">Aucune version installée.</p>}
          <ul className="space-y-2" data-testid="versions">
            {manifest?.versions.slice().reverse().map((v) => (
              <li key={v.version} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2 text-sm">
                <span className="font-mono">{v.version}</span>
                <span className="text-muted">{v.exerciseCount} ex. · {v.sessionCount} séances</span>
                {manifest.current === v.version
                  ? <span className="ml-auto rounded bg-accent px-2 py-0.5 text-xs font-semibold text-accent-fg">active</span>
                  : <button type="button" disabled={busy} onClick={() => void activate(v.version, manifest.history.some((h) => h.version === v.version && h.action === 'activate') ? 'rollback' : 'activate')} className="touch ml-auto rounded-lg bg-surface-2 px-3 hover:bg-border disabled:opacity-50" data-testid={`activate-${v.version}`}>Activer</button>}
              </li>
            ))}
          </ul>
          {manifest && manifest.history.length > 0 && (
            <details><summary className="cursor-pointer text-sm">Journal ({manifest.history.length})</summary>
              <ol className="mt-1 space-y-1 text-xs text-muted">{manifest.history.slice().reverse().map((h, i) => <li key={i}>{new Date(h.at).toLocaleString('fr-FR')} — {ACTION_LABEL[h.action]} « {h.version} »{h.from ? ` (depuis « ${h.from} »)` : ''}</li>)}</ol>
            </details>
          )}
          <p className="text-xs text-muted">Hors connexion ou sans compte : tout fonctionne avec la banque de cet appareil. <Link to="/tp" className="text-accent underline">Voir les TP</Link></p>
        </Card>
      </div>
    </Page>
  );
}
