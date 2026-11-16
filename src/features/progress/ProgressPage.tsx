import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Page } from '@/app/Page';
import { useBank } from '@/bank/store';
import { ACQUIRED_MIN_FAMILIES, ACQUIRED_THRESHOLD, estimateAt, familyOfKey, globalMastery, levelOf, recomputeMastery, type ExerciseMeta } from '@/engine/mastery';
import { NOTIONS, NOTION_SESSION } from '@/engine/notions';
import { presetUrl } from './weakness';
import { NotionBar } from './NotionBar';
import { useIpaIndex } from './useIpaIndex';
import { useProgressData } from './useProgress';

const DAY = 86_400_000;

export default function ProgressPage() {
  const bank = useBank((b) => b.bank);
  const { mastery, attempts, loading, repo, reload } = useProgressData(1000);
  const { index } = useIpaIndex();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const now = Date.now();
  const asOf = bank ? Math.max(0, ...bank.sessions.map((s) => s.number)) || 9 : 9;
  const available = useMemo(() => new Set(index?.entries.map((e) => e.notion) ?? []), [index]);

  const meta = useMemo(() => {
    const m = new Map<string, ExerciseMeta>();
    for (const e of bank?.exercises ?? []) m.set(e.key, { key: e.key, notions: e.notions, difficulty: e.difficulty, estimatedMinutes: e.estimatedMinutes });
    for (const e of index?.entries ?? []) m.set(e.key, { key: e.key, notions: { primary: e.notion, secondary: e.secondary }, difficulty: e.difficulty, estimatedMinutes: e.minutes });
    return m;
  }, [bank, index]);

  const recompute = async () => {
    setBusy(true); setMsg(null);
    try {
      const rebuilt = recomputeMastery(attempts, (k) => meta.get(k), Date.now());
      await repo.setMastery(rebuilt);
      await reload();
      setMsg(`Maîtrise recalculée depuis ${attempts.length} tentative(s).`);
    } catch (e) { setMsg(`Recalcul impossible : ${e instanceof Error ? e.message : String(e)}`); } finally { setBusy(false); }
  };

  const eligible = NOTIONS.filter((n) => NOTION_SESSION[n.id] <= asOf).map((n) => n.id);
  const global = globalMastery(mastery, eligible, {}, now);

  return (
    <Page title="Progression" wide>
      <div className="max-w-4xl space-y-4">
        <Card>
          <div className="flex flex-wrap items-end gap-6">
            <div><div className="text-sm text-muted">Maîtrise globale (estimation)</div><div className="text-4xl font-semibold tabular-nums" data-testid="prog-global">{loading ? '…' : mastery.totals.attempts === 0 ? '—' : `${Math.round(global * 100)} %`}</div></div>
            <p className="min-w-0 flex-1 text-sm text-muted">Ce pourcentage est une <strong>estimation pédagogique</strong> calculée à partir de tes tentatives : difficulté des exercices, indices utilisés, nombre d’essais, temps, fraîcheur (l’effet d’une tentative diminue de moitié en 30 jours). Une seule réussite ne suffit jamais à « maîtriser » une notion.</p>
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-semibold">Par notion</h2>
          <ul className="space-y-4" data-testid="notion-detail">
            {NOTIONS.map((n) => {
              const m = mastery.notions[n.id];
              const lvl = levelOf(m, mastery.updatedAt, now);
              const est = estimateAt(m, mastery.updatedAt, now);
              const fams = m?.distinctFamiliesSucceeded ?? 0;
              const newOk = m?.lastNewSuccessAt ? (now - Date.parse(m.lastNewSuccessAt)) / DAY <= 30 : false;
              const locked = NOTION_SESSION[n.id] > asOf;
              const has = available.has(n.id);
              return (
                <li key={n.id} className={locked ? 'opacity-60' : ''} data-testid={`notion-row-${n.id.slice(0, 3)}`}>
                  <NotionBar label={`${n.sessionNumber}. ${n.label}`} m={m} updatedAt={mastery.updatedAt} now={now} />
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 pl-0 text-xs text-muted sm:pl-[11.75rem]">
                    {lvl === 'non-travaillee' ? <span>Pas encore de tentative sur cette notion.</span> : (
                      <span>Pour être « acquise » : {Math.round(est * 100)} % / {ACQUIRED_THRESHOLD * 100} % · {fams} / {ACQUIRED_MIN_FAMILIES} familles réussies · réussite récente sur exercice nouveau : {newOk ? 'oui' : 'non'}</span>
                    )}
                    <Link to={`/fiches#${n.id.slice(0, 3)}`} className="text-accent underline">Fiche</Link>
                    {has ? <Link to={presetUrl({ scope: 'notion', notions: [n.id], durationMin: 30, level: 'moyen', mode: 'assiste', adaptive: true, asOfSession: asOf })} className="text-accent underline">S’entraîner (30 min)</Link> : <span>Pas encore d’exercices générés pour cette notion.</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card>
          <h2 className="mb-2 text-lg font-semibold">Recalculer</h2>
          <p className="mb-3 text-sm text-muted">Reconstruit la maîtrise à partir de tout l’historique des tentatives (corrige toute dérive). {attempts.length} tentative(s) disponibles ; {new Set(attempts.map((a) => familyOfKey(a.exerciseKey))).size} famille(s) ou exercice(s) distincts.</p>
          <button type="button" onClick={() => void recompute()} disabled={busy || loading} className="touch rounded-lg bg-surface-2 px-4 hover:bg-border disabled:opacity-50" data-testid="recompute">Recalculer ma maîtrise</button>
          {msg && <p role="status" className="mt-2 text-sm text-muted" data-testid="recompute-msg">{msg}</p>}
        </Card>
      </div>
    </Page>
  );
}
