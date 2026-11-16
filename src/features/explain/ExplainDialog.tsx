import { useEffect, useRef, useState } from 'react';
import { buildExplainPrompt, claudeUrl, type ExplainInput } from './prompt';

async function copy(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* repli ci-dessous */ }
  try {
    const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); document.body.removeChild(ta); return ok;
  } catch { return false; }
}

/** Fenêtre « Comprendre mon erreur avec Claude » : le prompt est visible, copiable, et s'ouvre dans claude.ai sur demande. */
export function ExplainDialog({ input, onClose }: { input: ExplainInput; onClose: () => void }) {
  const prompt = buildExplainPrompt(input);
  const { url, prefilled } = claudeUrl(prompt);
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { const f = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f); }, [onClose]);

  const doCopy = async () => { const ok = await copy(prompt); setState(ok ? 'copied' : 'failed'); if (!ok) ref.current?.select(); };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="ex-title" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-t-2xl border border-border bg-surface p-4 sm:rounded-2xl" onClick={(e) => e.stopPropagation()} data-testid="explain-dialog">
        <div className="mb-2 flex items-center justify-between gap-2"><h2 id="ex-title" className="text-lg font-semibold">Comprendre mon erreur avec Claude</h2><button type="button" onClick={onClose} className="touch px-2 text-muted hover:text-fg" aria-label="Fermer">✕</button></div>
        <p className="mb-2 text-sm text-muted">Voici le message qui sera donné à Claude : ton énoncé, ton code et le résultat de la correction (les tests cachés ne sont que comptés). Rien n’est envoyé tant que tu n’ouvres pas Claude toi-même ; cela utilise ton propre compte Claude.</p>
        <textarea ref={ref} readOnly value={prompt} className="min-h-40 flex-1 resize-none rounded-lg border border-border bg-surface-2 p-3 font-mono text-xs" aria-label="Message pour Claude" data-testid="explain-prompt" />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => void doCopy()} className="touch rounded-lg bg-surface-2 px-4 hover:bg-border" data-testid="explain-copy">Copier le message</button>
          <a href={url} target="_blank" rel="noopener noreferrer" onClick={() => void doCopy()} className="touch inline-flex items-center rounded-lg bg-accent px-4 font-semibold text-accent-fg" data-testid="explain-open">{prefilled ? 'Ouvrir dans Claude (message pré-rempli)' : 'Ouvrir Claude (colle ensuite le message)'}</a>
          <span role="status" className="text-sm text-muted" data-testid="explain-state">{state === 'copied' ? 'Message copié dans le presse-papiers.' : state === 'failed' ? 'Copie automatique impossible : sélectionne le texte ci-dessus.' : ''}</span>
        </div>
        {!prefilled && <p className="mt-2 text-xs text-muted">Le message est trop long pour être placé dans le lien : il est copié dans le presse-papiers, colle-le dans la conversation.</p>}
      </div>
    </div>
  );
}
