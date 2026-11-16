import type { Repo } from './types';

/**
 * Sauvegarde des brouillons : toujours instantanée en local, mais écriture distante limitée à
 * 1 toutes les 30 s par exercice (budget Spark : 20 000 écritures/jour ≈ 200 étudiants actifs).
 * `flush()` (changement d'exercice, fermeture de l'onglet) écrit immédiatement.
 */
export class DraftSaver {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pending: string | null = null;
  private lastWrite = 0;
  constructor(private repo: Repo, private key: string, private intervalMs = 30_000) {}

  save(code: string) {
    this.pending = code;
    const wait = Math.max(0, this.lastWrite + this.intervalMs - Date.now());
    if (this.timer) return;
    this.timer = setTimeout(() => void this.flush(), wait);
  }
  async flush() {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    if (this.pending === null) return;
    const c = this.pending;
    this.pending = null;
    this.lastWrite = Date.now();
    try { await this.repo.setDraft(this.key, c); } catch { this.pending = c; /* réessayé au prochain save/flush */ }
  }
}
