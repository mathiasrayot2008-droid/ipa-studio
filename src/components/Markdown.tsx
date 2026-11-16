import { Fragment, type ReactNode } from 'react';

/** Mini-rendu Markdown sûr (aucun HTML brut) : paragraphes, listes « - », **gras**, *italique*, `code`, blocs ```. */
function inline(s: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*\n]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    const t = m[0];
    if (t.startsWith('`')) out.push(<code key={`${key}c${i}`} className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[0.9em]">{t.slice(1, -1)}</code>);
    else if (t.startsWith('**')) out.push(<strong key={`${key}b${i}`}>{t.slice(2, -2)}</strong>);
    else out.push(<em key={`${key}e${i}`}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
    i++;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

export function Markdown({ text, className = '' }: { text: string; className?: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  let i = 0;
  let k = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (line.startsWith('```')) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.startsWith('```')) buf.push(lines[i++]!);
      i++;
      blocks.push(<pre key={k++} className="overflow-x-auto rounded-lg bg-surface-2 p-3 font-mono text-sm">{buf.join('\n')}</pre>);
    } else if (/^\s*[-*] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*] /.test(lines[i]!)) items.push(lines[i++]!.replace(/^\s*[-*] /, ''));
      blocks.push(<ul key={k++} className="ml-5 list-disc space-y-1">{items.map((it, j) => <li key={j}>{inline(it, `l${k}${j}`)}</li>)}</ul>);
    } else if (line.trim() === '') i++;
    else {
      const buf: string[] = [];
      while (i < lines.length && lines[i]!.trim() !== '' && !lines[i]!.startsWith('```') && !/^\s*[-*] /.test(lines[i]!)) buf.push(lines[i++]!);
      blocks.push(<p key={k++}>{buf.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{inline(l, `p${k}${j}`)}</Fragment>)}</p>);
    }
  }
  return <div className={`space-y-3 leading-relaxed ${className}`}>{blocks}</div>;
}
