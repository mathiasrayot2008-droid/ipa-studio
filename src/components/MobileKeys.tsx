import type { RefObject } from 'react';
import type { CodeEditorHandle } from './CodeEditor';

const KEYS: (string | { label: string; text: string; aria: string })[] = [
  { label: 'Tab', text: '\t', aria: 'Tabulation' },
  '{', '}', '(', ')', '[', ']', ';', '"', "'", '<', '>', '=', '+', '-', '*', '/', '%', '!', '&', '|', '.', ',',
];

/** Barre de symboles pour clavier tactile : les caractères de Java sont pénibles à atteindre sur mobile. */
export function MobileKeys({ editor }: { editor: RefObject<CodeEditorHandle | null> }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-t border-border bg-surface-2 p-1 md:hidden" role="toolbar" aria-label="Symboles Java" data-testid="mobile-keys">
      {KEYS.map((k) => {
        const label = typeof k === 'string' ? k : k.label;
        const text = typeof k === 'string' ? k : k.text;
        const aria = typeof k === 'string' ? `Insérer ${k}` : k.aria;
        return (
          <button
            key={label}
            type="button"
            aria-label={aria}
            // pointerdown + preventDefault : le clavier ne se ferme pas et l'éditeur garde le focus
            onPointerDown={(e) => { e.preventDefault(); if (text === '\t') editor.current?.indent(); else editor.current?.insert(text); }}
            className="touch shrink-0 rounded-md border border-border bg-surface px-3 font-mono text-base active:bg-accent active:text-accent-fg"
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
