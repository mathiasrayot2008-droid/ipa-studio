import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, Page } from '@/app/Page';
import { useAuth } from '@/data/auth';
import { latestSession, useBank } from '@/bank/store';
import { globalMastery, levelOf } from '@/engine/mastery';
import { LAST_SESSION, NOTIONS, NOTION_SESSION } from '@/engine/notions';
import { remainingMs, formatClock } from '@/features/dst/dstLogic';
import { NotionBar } from './NotionBar';
import { isCountableTag, tagLabel } from './labels';
import { useProgressData } from './useProgress';
import { presetUrl, usualLevel, weakestNotions, weaknessConfig } from './weakness';
import { useIpaIndex } from './useIpaIndex';

const DAY = 86_400_000;

export default function Dashboard() {
  const user = useAuth((a) => a.user);
  const authStatus = useAuth((a) => a.status);
  const bank = useBank((b) => b.bank);
  const { mastery, progress, attempts, dsts, loading, error } = useProgressData();
  const { index } = useIpaIndex();
  const now = Date.now();

  const latest = latestSession(bank);
  const asOf = latest || LAST_SESSION;
  const available = useMemo(() => new Set(index?.entries.map((e) => e.notion) ?? []), [index]);
  const eligible = NOTIONS.filter((n) => NOTION_SESSION[n.id] <= asOf);
  const global = globalMastery(mastery, eligible.map((n) => n.id), {}, now);
  const worked = eligible.filter((n) => (mastery.notions[n.id]?.weightSum ?? 0) > 0).length;
  const acquired = eligible.filter((n) => levelOf(mastery.notions[n.id], mastery.updatedAt, now) === 'acquise').length;
  const weak = weakestNotions(mastery, available, asOf, now, 3);
  // Même règle que la page TP : on ne compte que les exercices de la banque installée (pas les réussites de DST sur des exercices générés).
  const tpDone = (bank?.exercises ?? []).filter((e) => progress[e.key]?.status === 'reussi').length;
  const tpTotal = bank?.exercises.length ?? 0;
  const running = dsts.filter((d) => d.record.status === 'running');
  const lastDst = dsts.find((d) => d.record.status === 'submitted');

  const recurring = useMemo(() => {
    const c = new Map<string, number>();
    for (const a of attempts) if (now - Date.parse(a.createdAt) <= 30 * DAY && a.status !== 'reussi') for (const t of a.errorTags) if (isCountableTag(t)) c.set(t, (c.get(t) ?? 0) + 1);
    return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [attempts, now]);

  const weakUrl = weak.length ? presetUrl(weaknessConfig(weak, usualLevel(dsts), asOf)) : '/dst';

  return (
    <Page title={user?.displayName ? `Salut ${user.displayName.split(" ")[0]}` : 'Tableau de bord'} wide>
      <div className="max-w-4xl space-y-4">
        {running.map((d) => (
          <Card key={d.id} className="border-accent"><div className="flex flex-wrap items-center gap-3" data-testid="home-running">
            <div className="flex-1"><div className="font-semibold">DST en cours</div><div className="text-sm text-muted">{remainingMs(d.record) > 0 ? <>Il reste <span className="font-mono">{formatClock(remainingMs(d.record))}</span></> : 'Temps écoulé : à rendre'}</div></div>
            <Link to={`/dst/${d.id}`} className="touch inline-flex items-center rounded-lg bg-accent px-4 font-semibold text-accent-fg">{remainingMs(d.record) > 0 ? 'Reprendre' : 'Rendre et corriger'}</Link>
          </div></Card>
        ))}

        {authStatus !== 'loading' && !user && (
          <Card><p className="text-sm">Tu travailles en <strong>invité</strong> : tout est enregistré sur cet appareil seulement. <Link to="/parametres" className="text-accent underline">Crée un compte</Link> pour retrouver ta progression partout.</p></Card>
        )}
        {error && <p role="alert" className="text-bad">Impossible de lire ta progression : {error}</p>}

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="md:col-span-1">
            <div className="text-sm text-muted">Maîtrise globale <span title="Estimation pédagogique à partir de tes tentatives, pas une note">(estimation)</span></div>
            <div className="mt-1 text-4xl font-semibold tabular-nums" data-testid="home-global">{loading ? '…' : mastery.totals.attempts === 0 ? '—' : `${Math.round(global * 100)} %`}</div>
            <p className="mt-2 text-xs text-muted">{mastery.totals.attempts === 0 ? 'Pas encore de tentative : fais un exercice ou un DST pour démarrer. ' : `${worked} notion(s) travaillée(s) sur ${eligible.length} · ${acquired} acquise(s). `}Les notions pas encore travaillées comptent pour 33 % (valeur de départ). Une notion est « acquise » à partir de 90 %, avec au moins 3 familles d’exercices réussies et une réussite récente sur un exercice nouveau.</p>
          </Card>
          <Card>
            <div className="text-sm text-muted">TP Schooding</div>
            <div className="mt-1 text-4xl font-semibold tabular-nums" data-testid="home-tp">{tpTotal ? `${tpDone} / ${tpTotal}` : '—'}</div>
            <p className="mt-2 text-xs text-muted">{tpTotal ? 'exercices réussis' : 'Aucune banque installée.'} <Link to={tpTotal ? '/tp' : '/importer'} className="text-accent underline">{tpTotal ? 'Ouvrir les TP' : 'Importer'}</Link></p>
          </Card>
          <Card>
            <div className="text-sm text-muted">Dernier DST</div>
            <div className="mt-1 text-4xl font-semibold tabular-nums">{lastDst?.record.grade ? `${String(lastDst.record.grade.note20).replace('.', ',')} / 20` : '—'}</div>
            <p className="mt-2 text-xs text-muted">{lastDst ? <Link to={`/dst/${lastDst.id}`} className="text-accent underline">Voir la correction</Link> : 'Aucun DST rendu.'}</p>
          </Card>
        </div>

        <Card>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold">À retravailler</h2>
            <Link to={weakUrl} className="touch ml-auto inline-flex items-center rounded-lg bg-accent px-4 font-semibold text-accent-fg" data-testid="train-weak">Entraînement sur mes faiblesses</Link>
          </div>
          {weak.length === 0 ? <p className="text-sm text-muted">Pas encore assez d’exercices pour te proposer un entraînement.</p> : (
            <div className="space-y-2" data-testid="weak-list">
              {weak.map((id) => { const n = NOTIONS.find((x) => x.id === id)!; return <NotionBar key={id} label={n.label} m={mastery.notions[id]} updatedAt={mastery.updatedAt} now={now} />; })}
            </div>
          )}
          <p className="mt-3 text-xs text-muted">Le plan : 30 minutes, ces 3 notions, mode assisté. Tu vois le sujet (barème, règles) avant de commencer.</p>
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-semibold">Erreurs récurrentes <span className="text-sm font-normal text-muted">(30 derniers jours)</span></h2>
          {recurring.length === 0 ? <p className="text-sm text-muted">Rien à signaler pour l’instant.</p> : (
            <ul className="space-y-1 text-sm" data-testid="recurring">{recurring.map(([t, c]) => <li key={t} className="flex gap-3"><span className="w-8 shrink-0 text-right font-semibold tabular-nums">{c}×</span><span>{tagLabel(t)}</span></li>)}</ul>
          )}
        </Card>

        <div className="flex flex-wrap gap-2">
          <Link to="/dst" className="touch inline-flex items-center rounded-lg bg-surface-2 px-4 hover:bg-border">Nouveau DST</Link>
          <Link to="/progression" className="touch inline-flex items-center rounded-lg bg-surface-2 px-4 hover:bg-border">Ma progression détaillée</Link>
          <Link to="/fiches" className="touch inline-flex items-center rounded-lg bg-surface-2 px-4 hover:bg-border">Fiches de cours</Link>
        </div>
      </div>
    </Page>
  );
}
