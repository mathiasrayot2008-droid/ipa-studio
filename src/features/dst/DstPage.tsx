import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { DstConfig, DstMode, DstSubject, Level, NotionId } from '@/types/bank';
import { Card, Page } from '@/app/Page';
import { useAuth } from '@/data/auth';
import type { DstRecord } from '@/data/types';
import { useBank } from '@/bank/store';
import { IPA_POOL_VERSION, loadIndex, type IpaIndex } from '@/bank/ipaPool';
import { NOTIONS, NOTION_BY_ID } from '@/engine/notions';
import { HINT_PENALTIES } from '@/engine/scoring';
import { buildComposeContext, composeFor, DST_MAX, DST_MIN, remainingMs, startRecord, formatClock } from './dstLogic';
import { ComposeError } from '@/engine/compose';

const DURATIONS = [15, 30, 45, 60, 90, 120, 180];
const LEVELS: { id: Level; label: string; hint: string }[] = [
  { id: 'facile', label: 'Facile', hint: 'de 1 à 3 environ' },
  { id: 'moyen', label: 'Moyen', hint: 'de 2 à 4 environ' },
  { id: 'difficile', label: 'Difficile', hint: 'de 2,5 à 5' },
];
const MODES: { id: DstMode; label: string; hint: string }[] = [
  { id: 'examen', label: 'Examen strict', hint: 'Aucun indice, aucune solution. Seuls les tests publics sont exécutables ; la correction complète a lieu à la remise.' },
  { id: 'assiste', label: 'Assisté', hint: `Indices à 3 niveaux (−${HINT_PENALTIES[0] * 100} %, −${HINT_PENALTIES[1] * 100} %, −${HINT_PENALTIES[2] * 100} % des points de l’exercice). Voir la solution = 0 point sur l’exercice.` },
];

const fmt = (n: number) => String(n).replace('.', ',');
const when = (t: number) => new Date(t).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

function Choice<T extends string>({ value, onChange, options, name }: { value: T; onChange: (v: T) => void; options: { id: T; label: string; hint: string }[]; name: string }) {
  return (
    <div role="radiogroup" aria-label={name} className="grid gap-2 sm:grid-cols-3">
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} data-testid={`${name}-${o.id}`} onClick={() => onChange(o.id)}
          className={`touch rounded-lg border p-3 text-left text-sm ${value === o.id ? 'border-accent bg-surface-2' : 'border-border hover:bg-surface-2'}`}>
          <div className="font-semibold">{o.label}</div><div className="text-muted">{o.hint}</div>
        </button>
      ))}
    </div>
  );
}

export default function DstPage() {
  const nav = useNavigate();
  const repo = useAuth((a) => a.repo);
  const status = useAuth((a) => a.status);
  const bank = useBank((b) => b.bank);
  const [index, setIndex] = useState<IpaIndex | null>(null);
  const [indexErr, setIndexErr] = useState<string | null>(null);
  const [history, setHistory] = useState<{ id: string; record: DstRecord }[] | null>(null);
  const [settingsSession, setSettingsSession] = useState<number | null>(null);

  const [scope, setScope] = useState<DstConfig['scope']>('global');
  const [notions, setNotions] = useState<NotionId[]>([]);
  const [duration, setDuration] = useState(60);
  const [level, setLevel] = useState<Level>('moyen');
  const [mode, setMode] = useState<DstMode>('examen');
  const [adaptive, setAdaptive] = useState(true);
  const [asOf, setAsOf] = useState<number | null>(null);
  const [seedInput, setSeedInput] = useState('');
  const [preview, setPreview] = useState<DstSubject | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { void loadIndex(IPA_POOL_VERSION).then(setIndex).catch((e: Error) => setIndexErr(e.message)); }, []);
  useEffect(() => {
    if (status === 'loading') return;
    void repo.listDsts().then(setHistory).catch(() => setHistory([]));
    void repo.getSettings().then((s) => setSettingsSession(s.asOfSession)).catch(() => undefined);
  }, [repo, status]);

  const latestSession = useMemo(() => (bank ? Math.max(0, ...bank.sessions.map((s) => s.number)) : 0), [bank]);
  const effectiveAsOf = asOf ?? settingsSession ?? (latestSession || 9);
  const available = useMemo(() => new Set(index?.entries.map((e) => e.notion) ?? []), [index]);
  const running = history?.filter((h) => h.record.status === 'running') ?? [];
  const done = history?.filter((h) => h.record.status === 'submitted') ?? [];

  const config = useMemo<DstConfig>(() => ({ scope, ...(scope === 'notion' ? { notions } : {}), durationMin: duration, level, mode, adaptive, asOfSession: effectiveAsOf }), [scope, notions, duration, level, mode, adaptive, effectiveAsOf]);

  const prepare = useCallback(async () => {
    setErr(null); setBusy(true);
    try {
      if (scope === 'notion' && notions.length === 0) throw new ComposeError('Choisis au moins une notion pour un entraînement ciblé.');
      const seed = seedInput.trim().toLowerCase();
      if (seed && !/^[0-9a-f]{32}$/.test(seed)) throw new ComposeError('La graine doit comporter 32 caractères hexadécimaux (0-9, a-f).');
      const ctx = await buildComposeContext(repo);
      setPreview(seed ? composeFor(config, ctx, seed) : composeFor(config, ctx));
    } catch (e) {
      setPreview(null); setErr(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  }, [config, repo, scope, notions, seedInput]);

  const start = useCallback(async () => {
    if (!preview) return;
    setBusy(true);
    try {
      let subject = preview;
      // Rejouer une graine ne doit jamais écraser un DST déjà passé : l'identifiant reste unique.
      if (await repo.getDst(subject.id)) subject = { ...subject, id: `${subject.id}-${Date.now().toString(36)}` };
      await repo.saveDst(subject.id, startRecord(subject));
      nav(`/dst/${subject.id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e)); setBusy(false);
    }
  }, [preview, repo, nav]);

  const poolNotions = (s: DstSubject) => {
    const byKey = new Map(index?.entries.map((e) => [e.key, e.notion]) ?? []);
    return [...new Set(s.items.map((it) => byKey.get(it.exerciseKey)).filter((x): x is NotionId => Boolean(x)))].map((n) => NOTION_BY_ID.get(n)?.label ?? n);
  };

  return (
    <Page title="DST" wide>
      <div className="max-w-3xl space-y-4">
        {running.map((h) => (
          <Card key={h.id} className="border-accent">
            <div className="flex flex-wrap items-center gap-3" data-testid="dst-running">
              <div className="min-w-0 flex-1">
                <div className="font-semibold">DST en cours</div>
                <div className="text-sm text-muted">Commencé le {when(h.record.startedAt)} · {h.record.subject.items.length} exercices · {remainingMs(h.record) > 0 ? <>il reste <span className="font-mono">{formatClock(remainingMs(h.record))}</span></> : 'temps écoulé : la remise se fait à l’ouverture'}</div>
              </div>
              <Link to={`/dst/${h.id}`} className="touch inline-flex items-center rounded-lg bg-accent px-4 font-semibold text-accent-fg">{remainingMs(h.record) > 0 ? 'Reprendre' : 'Rendre et corriger'}</Link>
            </div>
          </Card>
        ))}

        <Card>
          <h2 className="mb-1 text-lg font-semibold">Générer un sujet</h2>
          <p className="mb-4 text-sm text-muted">Sujet de difficulté croissante, durée proportionnée et barème sur 20, composé à partir de la banque d’exercices Java d’IPA Studio. La graine permet de le rejouer à l’identique.</p>
          {indexErr && <p role="alert" className="mb-3 text-sm text-bad">La banque d’exercices n’a pas pu être chargée : {indexErr}</p>}

          <fieldset className="mb-4">
            <legend className="mb-1 text-sm font-semibold">Périmètre</legend>
            <div className="flex flex-wrap gap-2">
              {([['global', 'Tout le programme étudié'], ['notion', 'Entraînement ciblé sur des notions']] as const).map(([id, label]) => (
                <label key={id} className={`touch inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 ${scope === id ? 'border-accent bg-surface-2' : 'border-border'}`}>
                  <input type="radio" name="scope" checked={scope === id} onChange={() => { setScope(id); setPreview(null); }} data-testid={`scope-${id}`} />{label}
                </label>
              ))}
            </div>
            {scope === 'global' ? (
              <label className="mt-3 flex flex-wrap items-center gap-2 text-sm">Programme étudié jusqu’à la séance
                <select value={effectiveAsOf} onChange={(e) => { setAsOf(Number(e.target.value)); setPreview(null); }} className="touch rounded-lg border border-border bg-surface-2 px-2" data-testid="asof">
                  {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            ) : (
              <div className="mt-3 grid gap-1 sm:grid-cols-2" data-testid="notion-list">
                {NOTIONS.map((n) => {
                  const ok = available.has(n.id);
                  return (
                    <label key={n.id} className={`touch flex items-center gap-2 rounded-lg px-2 text-sm ${ok ? 'cursor-pointer hover:bg-surface-2' : 'opacity-50'}`}>
                      <input type="checkbox" disabled={!ok} checked={notions.includes(n.id)} data-testid={`notion-${n.id.slice(0, 3)}`}
                        onChange={(e) => { setNotions(e.target.checked ? [...notions, n.id] : notions.filter((x) => x !== n.id)); setPreview(null); }} />
                      <span>{n.label}{!ok && <span className="text-muted"> — pas encore d’exercices</span>}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </fieldset>

          <fieldset className="mb-4">
            <legend className="mb-1 text-sm font-semibold">Durée</legend>
            <div className="flex flex-wrap items-center gap-2">
              {DURATIONS.map((d) => (
                <button key={d} type="button" onClick={() => { setDuration(d); setPreview(null); }} aria-pressed={duration === d} data-testid={`dur-${d}`}
                  className={`touch rounded-lg border px-3 text-sm ${duration === d ? 'border-accent bg-surface-2 font-semibold' : 'border-border hover:bg-surface-2'}`}>{d} min</button>
              ))}
              <label className="flex items-center gap-1 text-sm text-muted">autre
                <input type="number" min={DST_MIN} max={DST_MAX} step={5} value={duration} onChange={(e) => { setDuration(Math.min(DST_MAX, Math.max(DST_MIN, Number(e.target.value) || DST_MIN))); setPreview(null); }}
                  className="touch w-20 rounded-lg border border-border bg-surface-2 px-2 text-fg" aria-label="Durée en minutes" data-testid="dur-custom" /> min
              </label>
            </div>
          </fieldset>

          <fieldset className="mb-4"><legend className="mb-1 text-sm font-semibold">Niveau (difficulté sur 5)</legend>
            <Choice name="level" value={level} onChange={(v) => { setLevel(v); setPreview(null); }} options={LEVELS} /></fieldset>
          <fieldset className="mb-4"><legend className="mb-1 text-sm font-semibold">Mode</legend>
            <Choice name="mode" value={mode} onChange={(v) => { setMode(v); setPreview(null); }} options={MODES} /></fieldset>

          <label className="mb-3 flex items-start gap-2 text-sm"><input type="checkbox" checked={adaptive} onChange={(e) => { setAdaptive(e.target.checked); setPreview(null); }} className="mt-1" data-testid="adaptive" />
            <span><strong>Adapter à mes points faibles.</strong> <span className="text-muted">Les notions peu maîtrisées ou longtemps délaissées sont favorisées ; les exercices déjà réussis sont écartés tant qu’il en reste d’autres.</span></span></label>

          <details className="mb-4 text-sm"><summary className="cursor-pointer text-muted">Avancé : rejouer un sujet avec sa graine</summary>
            <input value={seedInput} onChange={(e) => { setSeedInput(e.target.value); setPreview(null); }} placeholder="32 caractères hexadécimaux (laisser vide pour un sujet nouveau)" className="touch mt-2 w-full rounded-lg border border-border bg-surface-2 px-3 font-mono text-xs" aria-label="Graine" data-testid="seed-input" />
          </details>

          <button type="button" onClick={() => void prepare()} disabled={busy || !index} className="touch rounded-lg bg-accent px-5 font-semibold text-accent-fg hover:opacity-90 disabled:opacity-50" data-testid="prepare">{preview ? 'Régénérer le sujet' : 'Préparer le sujet'}</button>
          {err && <p role="alert" className="mt-3 text-sm text-bad" data-testid="dst-error">{err}</p>}
        </Card>

        {preview && (
          <Card className="border-accent" >
            <div data-testid="dst-preview">
              <h2 className="mb-2 text-lg font-semibold">Sujet prêt</h2>
              <ul className="mb-3 space-y-1 text-sm">
                <li><strong data-testid="prev-count">{preview.items.length}</strong> exercices, de difficulté croissante, notés sur <strong>20</strong></li>
                <li>Durée du DST : <strong>{preview.config.durationMin} min</strong> · temps estimé du sujet : <span data-testid="prev-est">{preview.estimatedTotalMin}</span> min</li>
                <li>Notions : {poolNotions(preview).join(', ')}</li>
              </ul>
              <div className="mb-3 overflow-x-auto"><table className="text-sm"><thead><tr className="text-left text-muted"><th className="pr-4">Exercice</th>{preview.items.map((_, i) => <th key={i} className="px-2 font-normal">{i + 1}</th>)}</tr></thead>
                <tbody><tr><td className="pr-4 text-muted">Points</td>{preview.items.map((it, i) => <td key={i} className="px-2 tabular-nums" data-testid={`pts-${i}`}>{fmt(it.points)}</td>)}</tr></tbody></table></div>
              <div className="mb-3 rounded-lg border border-border bg-surface-2 p-3 text-sm" role="note" data-testid="rules">
                <div className="mb-1 font-semibold">Règles ({preview.config.mode === 'examen' ? 'examen strict' : 'assisté'})</div>
                <ul className="list-disc space-y-1 pl-5 text-muted">
                  <li>Le chronomètre démarre dès que tu appuies sur « Commencer » ; l’échéance est enregistrée, il continue même si tu fermes l’onglet.</li>
                  <li>« Exécuter » lance les tests publics. « Vérifier » n’existe pas pendant le DST : tout est corrigé à la remise (tests cachés et cas limites compris).</li>
                  <li>À l’échéance, le DST est rendu automatiquement avec ce que tu as écrit.</li>
                  {preview.config.mode === 'examen'
                    ? <li><strong>Aucun indice et aucune solution</strong> avant la remise.</li>
                    : <li><strong>Indices :</strong> niveau 1 = −{HINT_PENALTIES[0] * 100} %, niveau 2 = −{HINT_PENALTIES[1] * 100} %, niveau 3 = −{HINT_PENALTIES[2] * 100} % des points de l’exercice (c’est le niveau le plus élevé utilisé qui compte). <strong>Voir la solution = 0 point</strong> sur l’exercice.</li>}
                </ul>
              </div>
              {preview.warnings?.length ? <div className="mb-3 rounded-lg border border-warn p-3 text-sm" role="note" data-testid="dst-warnings"><div className="mb-1 font-semibold text-warn">À savoir</div><ul className="list-disc pl-5">{preview.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul></div> : null}
              <p className="mb-3 text-xs text-muted">Graine : <code className="font-mono" data-testid="seed">{preview.seed}</code> · banque {preview.bankVersion} · générateur {preview.generatorVersion}</p>
              <button type="button" onClick={() => void start()} disabled={busy} className="touch rounded-lg bg-accent px-6 font-semibold text-accent-fg hover:opacity-90 disabled:opacity-50" data-testid="dst-start">Commencer le DST ({preview.config.durationMin} min)</button>
            </div>
          </Card>
        )}

        <Card>
          <h2 className="mb-2 text-lg font-semibold">Mes DST</h2>
          {history === null ? <p className="text-sm text-muted">Chargement…</p> : done.length === 0 ? <p className="text-sm text-muted">Aucun DST rendu pour l’instant.</p> : (
            <ul className="divide-y divide-border" data-testid="dst-history">
              {done.map((h) => (
                <li key={h.id}><Link to={`/dst/${h.id}`} className="touch flex items-center gap-3 py-2 hover:bg-surface-2">
                  <span className="w-28 shrink-0 text-sm text-muted">{when(h.record.startedAt)}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">{h.record.subject.config.scope === 'notion' ? 'Entraînement ciblé' : 'Global'} · {h.record.subject.config.durationMin} min · {h.record.subject.config.level} · {h.record.subject.config.mode === 'examen' ? 'strict' : 'assisté'}</span>
                  <span className="font-semibold tabular-nums">{h.record.grade ? `${fmt(h.record.grade.note20)} / 20` : '—'}</span>
                </Link></li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </Page>
  );
}
