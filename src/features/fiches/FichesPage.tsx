import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Page } from '@/app/Page';
import { FICHES } from '@/content/fiches';
import { Markdown } from '@/components/Markdown';
import { NOTION_SESSION } from '@/engine/notions';
import { presetUrl } from '@/features/progress/weakness';

export default function FichesPage() {
  const loc = useLocation();
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const list = useMemo(() => FICHES.filter((f) => !needle || f.title.toLowerCase().includes(needle) || f.summary.toLowerCase().includes(needle) || f.body.toLowerCase().includes(needle)), [needle]);
  // Ancre « #N08 » : ouvre la fiche demandée et la fait défiler (le routeur à « # » ne le fait pas tout seul).
  const wanted = useMemo(() => /(N\d\d)$/.exec(loc.hash || loc.search || '')?.[1] ?? /\/fiches#?(N\d\d)/.exec(window.location.hash)?.[1] ?? null, [loc]);
  useEffect(() => { if (wanted) document.getElementById(`fiche-${wanted}`)?.scrollIntoView({ block: 'start' }); }, [wanted, list.length]);

  return (
    <Page title="Fiches de cours" wide>
      <div className="max-w-3xl">
        <p className="mb-3 text-sm text-muted">Un résumé par notion, avec les pièges courants. Ces fiches sont écrites pour IPA Studio : elles complètent le cours Schooding, elles ne le remplacent pas.</p>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher dans les fiches" aria-label="Rechercher dans les fiches" className="touch mb-4 w-full rounded-lg border border-border bg-surface px-3 md:max-w-sm" data-testid="fiches-search" />
        {list.length === 0 && <p className="text-muted">Aucune fiche ne correspond.</p>}
        <ul className="space-y-2" data-testid="fiches">
          {list.map((f) => (
            <li key={f.id} id={`fiche-${f.id}`} className="scroll-mt-4">
              <details open={wanted === f.id} className="rounded-xl border border-border bg-surface">
                <summary className="touch cursor-pointer px-4 py-3">
                  <span className="mr-2 text-xs text-muted">Séance {NOTION_SESSION[f.notion]}</span><span className="font-semibold">{f.title}</span>
                  <div className="text-sm text-muted">{f.summary}</div>
                </summary>
                <div className="space-y-3 border-t border-border p-4"><Markdown text={f.body} />
                  <Link to={presetUrl({ scope: 'notion', notions: [f.notion], durationMin: 30, level: 'moyen', mode: 'assiste', adaptive: true, asOfSession: NOTION_SESSION[f.notion] })} className="touch inline-flex items-center text-sm text-accent underline" data-testid={`fiche-train-${f.id}`}>S’entraîner sur cette notion (30 min)</Link></div>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </Page>
  );
}
