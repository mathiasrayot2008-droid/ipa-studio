import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, Page } from '@/app/Page';
import { useBank } from '@/bank/store';
import { NOTIONS, NOTION_SESSION } from '@/engine/notions';
import { NotionBar } from './NotionBar';
import { useIpaIndex } from './useIpaIndex';
import { useProgressData } from './useProgress';
import { presetUrl, usualLevel, weakestNotions, weaknessConfig } from './weakness';

export default function TrainingPage() {
  const bank = useBank((b) => b.bank);
  const { mastery, dsts } = useProgressData();
  const { index, error } = useIpaIndex();
  const now = Date.now();
  const asOf = bank ? Math.max(0, ...bank.sessions.map((s) => s.number)) || 9 : 9;
  const available = useMemo(() => new Set(index?.entries.map((e) => e.notion) ?? []), [index]);
  const count = (n: string) => index?.entries.filter((e) => e.notion === n).length ?? 0;
  const weak = weakestNotions(mastery, available, asOf, now, 3);
  const level = usualLevel(dsts);

  return (
    <Page title="Entraînement ciblé" wide>
      <div className="max-w-4xl space-y-4">
        <Card className="border-accent">
          <h2 className="mb-1 text-lg font-semibold">Sur mes faiblesses</h2>
          <p className="mb-3 text-sm text-muted">Un sujet de 30 minutes sur tes 3 notions les moins maîtrisées, au niveau que tu choisis d’habitude ({level}), en mode assisté. Tu vois le barème et les règles avant de commencer.</p>
          {weak.length ? <p className="mb-3 text-sm">Notions visées : <strong>{weak.map((id) => NOTIONS.find((n) => n.id === id)!.label).join(', ')}</strong></p> : null}
          <Link to={weak.length ? presetUrl(weaknessConfig(weak, level, asOf)) : '/dst'} className="touch inline-flex items-center rounded-lg bg-accent px-5 font-semibold text-accent-fg" data-testid="train-weak">Préparer mon entraînement</Link>
        </Card>
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Choisir une notion</h2>
          {error && <p role="alert" className="mb-2 text-sm text-bad">Banque d’exercices indisponible : {error}</p>}
          <ul className="space-y-3">
            {NOTIONS.map((n) => {
              const has = available.has(n.id);
              return (
                <li key={n.id} className={`${NOTION_SESSION[n.id] > asOf ? 'opacity-60' : ''}`}>
                  <NotionBar label={`${n.sessionNumber}. ${n.label}`} m={mastery.notions[n.id]} updatedAt={mastery.updatedAt} now={now} />
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 text-xs text-muted sm:pl-[11.75rem]">
                    {has ? <><span>{count(n.id)} exercices générés</span>
                      <Link to={presetUrl({ scope: 'notion', notions: [n.id], durationMin: 30, level, mode: 'assiste', adaptive: true, asOfSession: asOf })} className="text-accent underline" data-testid={`train-${n.id.slice(0, 3)}`}>S’entraîner (30 min)</Link></>
                      : <span>Pas encore d’exercices générés pour cette notion (les TP Schooding correspondants restent disponibles).</span>}
                    <Link to={`/fiches#${n.id.slice(0, 3)}`} className="text-accent underline">Fiche</Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </Page>
  );
}
