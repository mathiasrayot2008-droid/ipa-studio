import { create } from 'zustand';
import type { HarnessOutput } from './harnessTypes';
import { packFiles, type BuiltProject } from './template';

export type JavaState = 'idle' | 'loading' | 'ready' | 'busy' | 'error';

interface JavaStatus { state: JavaState; detail?: string; initMs?: number; set: (s: JavaState, detail?: string, initMs?: number) => void }
export const useJavaStatus = create<JavaStatus>((set) => ({
  state: 'idle',
  set: (state, detail, initMs) => set((p) => ({ state, detail, initMs: initMs ?? p.initMs })),
}));

/** Interface minimale d'un moteur d'exécution : le navigateur (CheerpJ) ou, en test, la JVM locale. */
export interface JavaBackend {
  check(project: BuiltProject, opts: { perTestMs: number; totalMs: number }): Promise<HarnessOutput>;
}

interface Pending { resolve: (v: string) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }

/**
 * Exécuteur Java du navigateur : une iframe same-origin (runner.html) qui héberge CheerpJ.
 * - une seule requête à la fois (file d'attente),
 * - délai de garde : si Java ne répond pas dans timeout + 5 s, l'iframe est recréée (filet final contre les blocages).
 */
export class BrowserJavaRunner implements JavaBackend {
  private frame: HTMLIFrameElement | null = null;
  private ready: Promise<void> | null = null;
  private seq = 0;
  private pending = new Map<number, Pending>();
  private queue: Promise<unknown> = Promise.resolve();
  private warm = false;
  private onMsg = (e: MessageEvent) => this.handle(e);

  constructor(private readonly runnerUrl = `${import.meta.env.BASE_URL}runner.html`) {}

  private handle(e: MessageEvent) {
    if (e.origin !== location.origin || e.source !== this.frame?.contentWindow) return;
    const m = e.data as { type?: string; id?: number; ok?: boolean; json?: string; error?: string; initMs?: number };
    if (m.type === 'ready') { this.resolveReady?.(); useJavaStatus.getState().set('ready', undefined, m.initMs); return; }
    if (m.type === 'fatal') { this.rejectReady?.(new Error(m.error ?? 'Java indisponible')); useJavaStatus.getState().set('error', m.error); return; }
    if (typeof m.id === 'number') {
      const p = this.pending.get(m.id);
      if (!p) return;
      this.pending.delete(m.id);
      clearTimeout(p.timer);
      if (m.ok && typeof m.json === 'string') p.resolve(m.json);
      else p.reject(new Error(m.error ?? 'Erreur Java'));
    }
  }
  private resolveReady?: () => void;
  private rejectReady?: (e: Error) => void;

  private start(): Promise<void> {
    if (this.ready) return this.ready;
    useJavaStatus.getState().set('loading');
    window.addEventListener('message', this.onMsg);
    this.ready = new Promise<void>((res, rej) => { this.resolveReady = res; this.rejectReady = rej; });
    const f = document.createElement('iframe');
    f.src = this.runnerUrl;
    f.title = 'Exécuteur Java';
    f.setAttribute('aria-hidden', 'true');
    f.style.cssText = 'position:fixed;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(f);
    this.frame = f;
    return this.ready;
  }

  /** Recrée l'iframe (Java bloqué). Les requêtes en attente échouent proprement. */
  reset() {
    for (const [, p] of this.pending) { clearTimeout(p.timer); p.reject(new Error('Java a été redémarré')); }
    this.pending.clear();
    this.frame?.remove();
    this.frame = null; this.ready = null; this.warm = false;
    window.removeEventListener('message', this.onMsg);
    useJavaStatus.getState().set('idle');
  }

  private send(msg: Record<string, unknown>, guardMs: number): Promise<string> {
    return this.start().then(() => new Promise<string>((resolve, reject) => {
      const id = ++this.seq;
      const timer = setTimeout(() => { this.pending.delete(id); this.reset(); reject(new Error('Java ne répond plus : exécuteur redémarré.')); }, guardMs);
      this.pending.set(id, { resolve, reject, timer });
      this.frame!.contentWindow!.postMessage({ id, ...msg }, location.origin);
    }));
  }

  /** Charge CheerpJ et fait une compilation factice : la 1ʳᵉ compilation est lente (~20 s), autant la payer en tâche de fond. */
  async warmUp(): Promise<void> {
    if (this.warm) return;
    await this.start();
    useJavaStatus.getState().set('loading', 'Compilation de préchauffage…');
    const dummy = `public class W { public static void main(String[] a) { int x = 1; } }`;
    await this.send({ type: 'main', packed: `W.java\u0001${dummy}`, mainClass: 'W', stdin: '', totalMs: 5000 }, 90_000);
    this.warm = true;
    useJavaStatus.getState().set('ready');
  }

  check(project: BuiltProject, opts: { perTestMs: number; totalMs: number }): Promise<HarnessOutput> {
    const run = async () => {
      const st = useJavaStatus.getState();
      st.set('busy');
      try {
        const guard = (this.warm ? 0 : 90_000) + opts.totalMs + 8000 + 5000;
        const json = await this.send({ type: 'check', packed: packFiles(project.files), mainClass: project.mainClass, perTestMs: opts.perTestMs, totalMs: opts.totalMs }, guard);
        this.warm = true;
        return JSON.parse(json) as HarnessOutput;
      } finally {
        if (useJavaStatus.getState().state === 'busy') useJavaStatus.getState().set('ready');
      }
    };
    const p = this.queue.then(run, run);
    this.queue = p.catch(() => undefined);
    return p;
  }

  /** Bac à sable : programme libre avec main(). */
  runProgram(source: string, stdin: string, totalMs = 5000): Promise<HarnessOutput> {
    const run = async () => {
      useJavaStatus.getState().set('busy');
      try {
        const m = source.match(/public\s+class\s+([A-Za-z_]\w*)/);
        const cls = m?.[1] ?? 'Main';
        const json = await this.send({ type: 'main', packed: `${cls}.java\u0001${source}`, mainClass: cls, stdin, totalMs }, (this.warm ? 0 : 90_000) + totalMs + 8000 + 5000);
        this.warm = true;
        return JSON.parse(json) as HarnessOutput;
      } finally {
        if (useJavaStatus.getState().state === 'busy') useJavaStatus.getState().set('ready');
      }
    };
    const p = this.queue.then(run, run);
    this.queue = p.catch(() => undefined);
    return p;
  }
}

let shared: BrowserJavaRunner | null = null;
export const javaRunner = () => (shared ??= new BrowserJavaRunner());
