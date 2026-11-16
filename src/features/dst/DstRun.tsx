import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Exercise } from '@/types/bank';
import { Page } from '@/app/Page';
import { useAuth } from '@/data/auth';
import type { DstRecord } from '@/data/types';
import { loadPublicExercise, loadSecret, type IpaSecret } from '@/bank/ipaPool';
import { Markdown } from '@/components/Markdown';
import { ExerciseRunner } from '@/features/exercise/ExerciseRunner';
import { HINT_PENALTIES } from '@/engine/scoring';
import DstResult from './DstResult';
import { formatClock, isBlank, submitDst, type GradingProgress } from './dstLogic';

const fmt = (n: number) => String(n).replace('.', ',');

export default function DstRun() {
  const { id = '' } = useParams();
  const repo = useAuth((a) => a.repo);
  const status = useAuth((a) => a.status);
  const [rec, setRec] = useState<DstRecord | null | undefined>(undefined);
  useEffect(() => {
    if (status === 'loading') return;
    let off = false;
    setRec(undefined);
    void repo.getDst(id).then((r) => { if (!off) setRec(r ?? null); }).catch(() => { if (!off) setRec(null); });
    return () => { off = true; };
  }, [repo, status, id]);

  if (rec === undefined) return <Page title="DST"><p className="text-muted">Chargement…</p></Page>;
  if (rec === null) return <Page title="DST introuvable"><p>Ce DST n’existe pas sur ce compte. <Link to="/dst" className="text-accent underline">Retour</Link></p></Page>;
  if (rec.status === 'submitted') return <DstResult id={id} record={rec} />;
  return <DstRunning key={id} id={id} initial={rec} onSubmitted={setRec} />;
}

type Phase = 'working' | 'confirm' | 'grading' | 'error';

function DstRunning({ id, initial, onSubmitted }: { id: string; initial: DstRecord; onSubmitted: (r: DstRecord) => void }) {
  const nav = useNavigate();
  const repo = useAuth((a) => a.repo);
  const recRef = useRef<DstRecord>(initial);
  const [rec, setRecState] = useState<DstRecord>(initial);
  const [cur, setCur] = useState(0);
  const [exs, setExs] = useState<Record<string, Exercise> | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('working');
  const [navOpen, setNavOpen] = useState(false);
  const [progress, setProgress] = useState<GradingProgress | null>(null);
  const [subErr, setSubErr] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [reloadKey, setReloadKey] = useState(0);
  const timer = useRef<number | undefined>(undefined);
  const submitting = useRef(false);

  const subject = initial.subject;
  const exam = subject.config.mode === 'examen';
  const remaining = Math.max(0, recRef.current.deadlineAt - now);
  const expired = remaining <= 0;

  // Exercices PUBLICS seulement (énoncé + tests publics). Indices, solutions et tests cachés restent sur le serveur jusqu'à la remise.
  useEffect(() => {
    let off = false;
    setLoadErr(null);
    void Promise.all(subject.items.map((it) => loadPublicExercise(it.exerciseKey, subject.bankVersion)))
      .then((list) => { if (!off) setExs(Object.fromEntries(list.map((e) => [e.key, e]))); })
      .catch((e: Error) => { if (!off) setLoadErr(e.message); });
    return () => { off = true; };
  }, [subject, reloadKey]);

  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 500); return () => window.clearInterval(t); }, []);

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current);
    try { await repo.saveDst(id, { ...recRef.current, updatedAt: Date.now() }); setSaveErr(false); } catch { setSaveErr(true); }
  }, [repo, id]);
  const update = useCallback((patch: (r: DstRecord) => DstRecord) => {
    recRef.current = patch(recRef.current); setRecState(recRef.current);
    window.clearTimeout(timer.current); timer.current = window.setTimeout(() => void flush(), 1200);
  }, [flush]);

  useEffect(() => {
    const f = () => void flush();
    window.addEventListener('pagehide', f);
    return () => { window.removeEventListener('pagehide', f); if (recRef.current.status === 'running') void flush(); };
  }, [flush]);

  const doSubmit = useCallback(async () => {
    if (submitting.current) return;
    submitting.current = true; setPhase('grading'); setSubErr(null); setNavOpen(false);
    try {
      await flush();
      const out = await submitDst(repo, id, recRef.current, setProgress);
      window.clearTimeout(timer.current);
      recRef.current = out; // le nettoyage au démontage ne doit jamais ré-écrire l'ancien état « en cours »
      onSubmitted(out);
    } catch (e) {
      submitting.current = false; setPhase('error'); setSubErr(e instanceof Error ? e.message : String(e));
    }
  }, [flush, repo, id, onSubmitted]);

  // Remise automatique à l'échéance (y compris si l'onglet a été fermé : à la réouverture, l'échéance est déjà passée).
  useEffect(() => { if (expired && phase === 'working') void doSubmit(); }, [expired, phase, doSubmit]);

  const key = subject.items[cur]?.exerciseKey ?? '';
  const ex = exs?.[key];
  const locked = expired || phase !== 'working';
  const answered = (k: string) => { const e = exs?.[k]; return Boolean(e) && !isBlank(rec.answers[k], e!); };

  const bar = useMemo(() => (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs text-muted sm:inline">Exercice {cur + 1}/{subject.items.length} · {fmt(subject.items[cur]?.points ?? 0)} pt</span>
      <span role="timer" aria-label="Temps restant" data-testid="dst-clock" className={`rounded-lg px-2 py-1 font-mono text-sm tabular-nums ${remaining < 60_000 ? 'bg-bad/20 text-bad' : remaining < 600_000 ? 'bg-warn/20 text-warn' : 'bg-surface-2'}`}>{formatClock(remaining)}</span>
      <button type="button" onClick={() => setNavOpen(true)} className="touch rounded-lg bg-surface-2 px-3 text-sm hover:bg-border" data-testid="dst-nav-open" aria-label="Liste des exercices">☰ {cur + 1}/{subject.items.length}</button>
      <button type="button" disabled={locked} onClick={() => setPhase('confirm')} className="touch rounded-lg bg-accent px-3 text-sm font-semibold text-accent-fg disabled:opacity-50" data-testid="dst-submit">Rendre</button>
    </div>
  ), [cur, remaining, subject.items, locked]);

  if (loadErr) {
    return <Page title="DST"><p role="alert" className="mb-3 text-bad">Impossible de charger les exercices : {loadErr}</p>
      <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="touch rounded-lg bg-accent px-4 font-semibold text-accent-fg">Réessayer</button> <Link to="/dst" className="ml-3 text-accent underline">Retour</Link></Page>;
  }
  if (!exs || !ex) return <Page title="DST"><p className="text-muted">Préparation du sujet…</p></Page>;

  if (phase === 'grading' || phase === 'error') {
    const pct = progress ? Math.round((progress.done / Math.max(1, progress.total)) * 100) : 0;
    return (
      <Page title={phase === 'grading' ? (expired ? 'Temps écoulé — remise automatique' : 'Correction en cours') : 'La correction a rencontré un problème'}>
        {phase === 'grading' ? (
          <div role="status" data-testid="dst-grading">
            <p className="mb-3 text-muted">Tes réponses sont corrigées sur tous les tests, y compris les tests cachés. Java compile chaque exercice : cela peut prendre une à deux minutes.</p>
            <div className="h-3 w-full overflow-hidden rounded-full bg-surface-2"><div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} /></div>
            <p className="mt-2 text-sm text-muted">{progress ? `Exercice ${Math.min(progress.done + 1, progress.total)} sur ${progress.total}` : 'Démarrage…'}</p>
          </div>
        ) : (
          <div role="alert"><p className="mb-3 text-bad" data-testid="dst-submit-error">{subErr}</p><p className="mb-3 text-sm text-muted">Tes réponses sont enregistrées. Tu peux relancer la correction.</p>
            <button type="button" onClick={() => { setPhase('working'); void doSubmit(); }} className="touch rounded-lg bg-accent px-4 font-semibold text-accent-fg" data-testid="dst-retry">Relancer la correction</button></div>
        )}
      </Page>
    );
  }

  const sheet = navOpen && (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Exercices du DST" onClick={() => setNavOpen(false)}>
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border bg-surface p-4 sm:rounded-2xl" onClick={(e) => e.stopPropagation()} data-testid="dst-nav">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Exercices</h2><button type="button" onClick={() => setNavOpen(false)} className="touch px-2 text-muted hover:text-fg" aria-label="Fermer">✕</button></div>
        <ul className="space-y-1">
          {subject.items.map((it, i) => (
            <li key={it.exerciseKey}>
              <button type="button" onClick={() => { setCur(i); setNavOpen(false); }} aria-current={i === cur} data-testid={`dst-item-${i}`}
                className={`touch flex w-full items-center gap-3 rounded-lg px-3 text-left ${i === cur ? 'bg-surface-2' : 'hover:bg-surface-2'}`}>
                <span className="w-6 font-semibold tabular-nums">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm">{exs[it.exerciseKey]?.title}</span>
                <span className="text-xs text-muted tabular-nums">{fmt(it.points)} pt</span>
                <span className={`text-xs ${answered(it.exerciseKey) ? 'text-ok' : 'text-muted'}`}>{answered(it.exerciseKey) ? '✎ écrit' : '—'}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  const confirm = phase === 'confirm' && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="alertdialog" aria-modal="true" aria-labelledby="cf-title">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5" data-testid="dst-confirm">
        <h2 id="cf-title" className="mb-2 text-lg font-semibold">Rendre le DST ?</h2>
        <p className="mb-1 text-sm">{subject.items.filter((it) => answered(it.exerciseKey)).length} exercice(s) sur {subject.items.length} ont du code. Il reste {formatClock(remaining)}.</p>
        <p className="mb-4 text-sm text-muted">Après la remise, tu ne peux plus modifier tes réponses.</p>
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={() => setPhase('working')} className="touch rounded-lg px-4 hover:bg-surface-2" data-testid="dst-cancel">Continuer</button>
          <button type="button" onClick={() => void doSubmit()} className="touch rounded-lg bg-accent px-4 font-semibold text-accent-fg" data-testid="dst-confirm-yes">Rendre maintenant</button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <ExerciseRunner
        key={key} exercise={ex} initialCode={rec.answers[key] ?? ex.starterCode} hideCheck readOnly={locked}
        onCode={(c) => { if (!locked) update((r) => ({ ...r, answers: { ...r.answers, [key]: c } })); }}
        onBack={() => nav('/dst')} header={bar}
        belowStatement={
          <div className="space-y-3">
            {saveErr && <p role="alert" className="text-sm text-warn" data-testid="dst-save-error">Enregistrement impossible pour l’instant : ton code reste dans cette page, ne la ferme pas.</p>}
            {!exam && <Assist exKey={key} rec={rec} locked={locked} bankVersion={subject.bankVersion} onHint={(n) => update((r) => ({ ...r, hintsUsed: { ...r.hintsUsed, [key]: n } }))} onSolution={() => update((r) => ({ ...r, solutionShown: { ...r.solutionShown, [key]: true } }))} />}
          </div>
        }
      />
      {sheet}{confirm}
    </>
  );
}

/** Indices (mode assisté seulement) : les secrets ne sont téléchargés qu'à la première demande, et chaque niveau annonce sa pénalité. */
function Assist({ exKey, rec, locked, bankVersion, onHint, onSolution }: { exKey: string; rec: DstRecord; locked: boolean; bankVersion: string; onHint: (n: 1 | 2 | 3) => void; onSolution: () => void }) {
  const hints = (rec.hintsUsed[exKey] ?? 0) as 0 | 1 | 2 | 3;
  const solution = rec.solutionShown[exKey] ?? false;
  const [secret, setSecret] = useState<IpaSecret | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);
  useEffect(() => { if (!armed) return; const t = window.setTimeout(() => setArmed(false), 6000); return () => window.clearTimeout(t); }, [armed]);
  const need = hints > 0 || solution;
  useEffect(() => { if (need && !secret) void loadSecret(exKey, bankVersion).then(setSecret).catch(() => setErr('Indices indisponibles (hors ligne ?).')); }, [need, secret, exKey, bankVersion]);
  const ensure = async () => { if (secret) return secret; const s = await loadSecret(exKey, bankVersion); setSecret(s); return s; };
  const nextPenalty = hints < 3 ? HINT_PENALTIES[hints as 0 | 1 | 2] * 100 : 0;

  return (
    <div className="space-y-3" data-testid="dst-assist">
      {secret && hints > 0 && <ol className="space-y-2 text-sm">{secret.hints.slice(0, hints).map((h, i) => <li key={i} className="rounded-lg border border-border bg-surface-2 p-3"><div className="mb-1 text-xs font-semibold text-accent">Indice {i + 1}</div><Markdown text={h} /></li>)}</ol>}
      <div className="flex flex-wrap gap-2">
        {hints < 3 && !solution && (
          <button type="button" disabled={locked} data-testid="dst-hint-btn" className="touch rounded-lg bg-surface-2 px-3 text-sm hover:bg-border disabled:opacity-50"
            onClick={async () => { try { await ensure(); onHint((hints + 1) as 1 | 2 | 3); } catch { setErr('Indices indisponibles (hors ligne ?).'); } }}>
            Indice {hints + 1}/3 <span className="text-muted">(−{nextPenalty} % au total)</span>
          </button>
        )}
        {!solution && (
          <button type="button" disabled={locked} data-testid="dst-solution-btn" className={`touch rounded-lg px-3 text-sm disabled:opacity-50 ${armed ? 'bg-bad/20 text-bad' : 'text-muted hover:text-fg'}`}
            onClick={async () => { if (!armed) { setArmed(true); return; } setArmed(false); try { await ensure(); onSolution(); } catch { setErr('Solution indisponible (hors ligne ?).'); } }}>
            {armed ? 'Confirmer : 0 point sur cet exercice' : 'Voir la solution (0 point)'}
          </button>
        )}
      </div>
      {hints > 0 && !solution && <p className="text-xs text-muted">Pénalité actuelle sur cet exercice : −{HINT_PENALTIES[hints - 1]! * 100} %.</p>}
      {solution && secret && <div><div className="mb-1 text-xs font-semibold text-warn">Solution de référence — cet exercice vaut 0 point</div><pre className="overflow-x-auto rounded-lg border border-border bg-surface-2 p-3 font-mono text-sm" data-testid="dst-solution">{secret.referenceSolution}</pre></div>}
      {err && <p role="alert" className="text-sm text-bad">{err}</p>}
    </div>
  );
}
