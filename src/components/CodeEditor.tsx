import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab, indentMore, indentLess } from '@codemirror/commands';
import { java } from '@codemirror/lang-java';
import { bracketMatching, indentOnInput, syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap, type CompletionContext } from '@codemirror/autocomplete';
import { setDiagnostics, lintGutter, type Diagnostic } from '@codemirror/lint';
import { tags as t } from '@lezer/highlight';

export interface EditorDiag { line: number; message: string; severity?: 'error' | 'warning' }
export interface CompletionItem { label: string; detail?: string; info?: string; type?: 'function' | 'variable' | 'keyword' | 'constant' }

export interface CodeEditorHandle {
  insert(text: string): void;
  indent(): void;
  outdent(): void;
  focus(): void;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
  diagnostics?: EditorDiag[];
  completions?: CompletionItem[];
  theme: 'dark' | 'light';
  fontSize?: number;
  onRun?: () => void;
  onCheck?: () => void;
  ariaLabel?: string;
}

const JAVA_KEYWORDS = ['if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'return', 'int', 'double', 'boolean', 'char', 'long', 'String', 'new', 'true', 'false', 'null', 'final', 'static'];

const dark = HighlightStyle.define([
  { tag: [t.keyword, t.modifier, t.controlKeyword], color: '#c4b5fd' },
  { tag: [t.typeName, t.className], color: '#7dd3fc' },
  { tag: [t.string, t.character], color: '#86efac' },
  { tag: [t.number, t.bool, t.null], color: '#fdba74' },
  { tag: t.comment, color: '#7c8aa8', fontStyle: 'italic' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: '#fde68a' },
  { tag: t.operator, color: '#cbd5e1' },
]);
const light = HighlightStyle.define([
  { tag: [t.keyword, t.modifier, t.controlKeyword], color: '#6d28d9' },
  { tag: [t.typeName, t.className], color: '#0369a1' },
  { tag: [t.string, t.character], color: '#15803d' },
  { tag: [t.number, t.bool, t.null], color: '#c2410c' },
  { tag: t.comment, color: '#64748b', fontStyle: 'italic' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: '#a16207' },
]);

function baseTheme(fontSize: number) {
  return EditorView.theme({
    '&': { height: '100%', backgroundColor: 'var(--surface)', color: 'var(--fg)', fontSize: `${fontSize}px` },
    '.cm-scroller': { fontFamily: 'var(--font-mono)', lineHeight: '1.55', overflow: 'auto' },
    '.cm-gutters': { backgroundColor: 'var(--surface-2)', color: 'var(--muted)', border: 'none' },
    '.cm-activeLine': { backgroundColor: 'color-mix(in srgb, var(--accent) 8%, transparent)' },
    '.cm-activeLineGutter': { backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)' },
    '.cm-content': { caretColor: 'var(--accent)', padding: '8px 0' },
    '.cm-cursor': { borderLeftColor: 'var(--accent)' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': { backgroundColor: 'color-mix(in srgb, var(--accent) 30%, transparent)' },
    '.cm-tooltip': { backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--fg)' },
    '.cm-tooltip-autocomplete ul li[aria-selected]': { backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' },
    '.cm-lintRange-error': { backgroundImage: 'none', textDecoration: 'underline wavy var(--bad)' },
  });
}

export const CodeEditor = forwardRef<CodeEditorHandle, Props>(function CodeEditor(
  { value, onChange, readOnly = false, diagnostics = [], completions = [], theme, fontSize = 15, onRun, onCheck, ariaLabel = 'Éditeur de code Java' },
  ref,
) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const cb = useRef({ onChange, onRun, onCheck });
  cb.current = { onChange, onRun, onCheck };
  const comp = useRef(completions);
  comp.current = completions;
  const themeC = useRef(new Compartment());
  const roC = useRef(new Compartment());

  useImperativeHandle(ref, () => ({
    insert(text) {
      const v = view.current;
      if (!v) return;
      const sel = v.state.selection.main;
      v.dispatch({ changes: { from: sel.from, to: sel.to, insert: text }, selection: { anchor: sel.from + text.length }, scrollIntoView: true });
      v.focus();
    },
    indent() { if (view.current) { indentMore(view.current); view.current.focus(); } },
    outdent() { if (view.current) { indentLess(view.current); view.current.focus(); } },
    focus() { view.current?.focus(); },
  }));

  useEffect(() => {
    if (!host.current) return;
    const source = (ctx: CompletionContext) => {
      const w = ctx.matchBefore(/[A-Za-z_]\w*/);
      if (!w || (w.from === w.to && !ctx.explicit)) return null;
      const opts = [
        ...comp.current.map((c) => ({ label: c.label, detail: c.detail, info: c.info, type: c.type ?? 'function', boost: 2 })),
        ...JAVA_KEYWORDS.map((k) => ({ label: k, type: 'keyword' as const })),
      ];
      return { from: w.from, options: opts, validFor: /^\w*$/ };
    };
    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(), lintGutter(), highlightActiveLine(), highlightActiveLineGutter(), drawSelection(),
        history(), indentOnInput(), bracketMatching(), closeBrackets(), java(),
        autocompletion({ override: [source], activateOnTyping: true, icons: false }),
        keymap.of([
          { key: 'Mod-Enter', run: () => { cb.current.onRun?.(); return true; } },
          { key: 'Mod-Shift-Enter', run: () => { cb.current.onCheck?.(); return true; } },
          ...closeBracketsKeymap, ...completionKeymap, ...historyKeymap, ...defaultKeymap, indentWithTab,
        ]),
        EditorView.lineWrapping,
        EditorView.contentAttributes.of({ autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', 'aria-label': ariaLabel, autocomplete: 'off' }),
        EditorView.updateListener.of((u) => { if (u.docChanged) cb.current.onChange(u.state.doc.toString()); }),
        themeC.current.of([baseTheme(fontSize), syntaxHighlighting(theme === 'dark' ? dark : light)]),
        roC.current.of([EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly)]),
      ],
    });
    const v = new EditorView({ state, parent: host.current });
    view.current = v;
    return () => { v.destroy(); view.current = null; };
    // création unique : les props dynamiques sont gérées par les effets ci-dessous
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const v = view.current;
    if (v && v.state.doc.toString() !== value) v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } });
  }, [value]);

  useEffect(() => {
    view.current?.dispatch({ effects: themeC.current.reconfigure([baseTheme(fontSize), syntaxHighlighting(theme === 'dark' ? dark : light)]) });
  }, [theme, fontSize]);

  useEffect(() => {
    view.current?.dispatch({ effects: roC.current.reconfigure([EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly)]) });
  }, [readOnly]);

  useEffect(() => {
    const v = view.current;
    if (!v) return;
    const doc = v.state.doc;
    const ds: Diagnostic[] = diagnostics
      .filter((d) => d.line >= 1 && d.line <= doc.lines)
      .map((d) => { const l = doc.line(d.line); return { from: l.from, to: Math.max(l.to, l.from + 1), severity: d.severity ?? 'error', message: d.message }; });
    v.dispatch(setDiagnostics(v.state, ds));
  }, [diagnostics, value]);

  return <div ref={host} className="h-full min-h-0 overflow-hidden rounded-lg border border-border" />;
});
