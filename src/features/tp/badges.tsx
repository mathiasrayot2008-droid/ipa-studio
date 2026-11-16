import type { Exercise } from '@/types/bank';
import type { TpProgressEntry } from '@/data/types';

type Fidelity = NonNullable<Exercise['provenance']['fidelity']>;

const FID: Record<Fidelity, { label: string; cls: string; title: string }> = {
  exact: { label: 'Fidèle', cls: 'text-ok', title: 'Énoncé et tests entièrement déterminés par l’énoncé Schooding.' },
  'assets-recreated': { label: 'Éléments recréés', cls: 'text-warn', title: 'Schéma, carte ou code de départ absents de l’export : recréés d’après l’énoncé.' },
  reconstructed: { label: 'Reconstitué', cls: 'text-warn', title: 'Comportement déduit de ton code enregistré : à vérifier avec l’original.' },
  unavailable: { label: 'Énoncé seul', cls: 'text-muted', title: 'Pas de correction automatique pour cet exercice.' },
};

export function FidelityBadge({ fidelity }: { fidelity?: Exercise['provenance']['fidelity'] }) {
  const f = FID[fidelity ?? 'exact'];
  return <span className={`rounded border border-border px-1.5 py-0.5 text-xs ${f.cls}`} title={f.title}>{f.label}</span>;
}

export function StatusBadge({ entry }: { entry?: TpProgressEntry }) {
  const st = entry?.status ?? 'nouveau';
  const map = { nouveau: ['Nouveau', 'text-muted'], 'en-cours': ['En cours', 'text-warn'], reussi: ['Réussi', 'text-ok'] } as const;
  const [label, cls] = map[st];
  return <span className={`text-xs font-medium ${cls}`} data-status={st}>{st === 'reussi' ? '✓ ' : st === 'en-cours' ? '• ' : '○ '}{label}</span>;
}
