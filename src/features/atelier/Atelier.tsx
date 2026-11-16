import { useRef, useState } from 'react';
import { Page } from '@/app/Page';
import { CodeEditor, type CodeEditorHandle } from '@/components/CodeEditor';
import { MobileKeys } from '@/components/MobileKeys';
import { useTheme } from '@/app/theme';
import { javaRunner, useJavaStatus } from '@/java/runner';
import type { HarnessOutput } from '@/java/harnessTypes';
import { translateEcj } from '@/java/ecjMessagesFr';

const START = `public class Main {
    static int somme(int[] t) {
        int s = 0;
        for (int x : t) s += x;
        return s;
    }

    public static void main(String[] args) {
        int[] t = {3, 1, 4, 1, 5, 9, 2, 6};
        for (int i = 0; i < 3; i++) {
            if (i % 2 == 0) System.out.println("pair " + i);
            else System.out.println("impair " + i);
        }
        System.out.println("somme = " + somme(t));
    }
}
`;

/** Bac à sable : n'importe quel programme Java (classe + main), avec entrée clavier simulée. Vrai Java, pas une simulation. */
export default function Atelier() {
  const theme = useTheme((s) => s.theme);
  const editor = useRef<CodeEditorHandle>(null);
  const [src, setSrc] = useState(START);
  const [stdin, setStdin] = useState('');
  const [out, setOut] = useState<HarnessOutput | null>(null);
  const [busy, setBusy] = useState(false);
  const java = useJavaStatus((s) => s.state);

  const run = async () => {
    setBusy(true);
    try { setOut(await javaRunner().runProgram(src, stdin, 5000)); }
    catch (e) { setOut({ phase: 'compiler-crash', error: e instanceof Error ? e.message : String(e) }); }
    finally { setBusy(false); }
  };

  return (
    <Page title="Atelier Java" wide>
      <p className="mb-3 max-w-3xl text-sm text-muted">
        Écris un programme complet (classe avec <code>main</code>) et exécute-le avec le vrai Java. Ici c’est <code>System.out.println</code> qui affiche ;
        dans les exercices Schooding, tu utilises <code>affiche()</code>.
      </p>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="flex h-[55vh] flex-col rounded-xl border border-border bg-surface">
          <div className="min-h-0 flex-1 p-2"><CodeEditor ref={editor} value={src} onChange={setSrc} theme={theme} onRun={() => void run()} ariaLabel="Programme Java" /></div>
          <MobileKeys editor={editor} />
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => void run()} disabled={busy} className="touch rounded-lg bg-accent px-4 font-semibold text-accent-fg disabled:opacity-50">▶ Exécuter</button>
            <span className="text-xs text-muted" role="status">{busy ? 'Exécution…' : java === 'ready' ? 'Java prêt ✓' : 'Java se prépare (≈ 30 s la 1ʳᵉ fois)…'}</span>
          </div>
          <label className="block text-sm">Entrée clavier (stdin)
            <textarea value={stdin} onChange={(e) => setStdin(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-border bg-surface p-2 font-mono text-sm" />
          </label>
          <div className="min-h-32 rounded-xl border border-border bg-surface p-3 text-sm" aria-live="polite" data-testid="atelier-out">
            {!out && <span className="text-muted">La sortie apparaîtra ici.</span>}
            {out?.phase === 'main' && (
              <>
                <pre className="whitespace-pre-wrap font-mono" data-testid="atelier-stdout">{out.stdout}</pre>
                {out.exception && <p className="mt-2 text-bad">Exception : {out.exception}</p>}
                {out.timedOut && <p className="mt-2 text-warn">Temps limite dépassé (5 s) : boucle infinie ?</p>}
                <p className="mt-2 text-xs text-muted">compilation {out.compileMs} ms · exécution {out.runMs} ms</p>
              </>
            )}
            {out?.phase === 'compile' && out.diagnostics.filter((d) => d.kind === 'error').map((d, i) => (
              <div key={i} className="mb-2"><div className="font-semibold text-bad">Ligne {d.line} : {translateEcj(d.msg).fr}</div><code className="text-xs text-muted">{d.msg}</code></div>
            ))}
            {out?.phase === 'forbidden' && <p className="text-bad">Instruction non autorisée : <code>{out.what}</code></p>}
            {out && 'error' in out && <p className="text-bad">{out.error}</p>}
          </div>
        </div>
      </div>
    </Page>
  );
}
