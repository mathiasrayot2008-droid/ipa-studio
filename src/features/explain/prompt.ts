import type { Exercise } from '@/types/bank';
import type { CheckResult } from '@/java/grade';
import { fmtJv, fmtValue } from '@/components/fmt';
import { tagLabel, isCountableTag } from '@/features/progress/labels';

/**
 * « Comprendre mon erreur avec Claude » — SANS API : on fabrique un prompt structuré que l'étudiant colle (ou ouvre) lui-même
 * dans claude.ai avec son propre compte. Aucun appel réseau, aucun coût, rien n'est envoyé tant qu'il n'ouvre pas le lien.
 */
export interface ExplainInput {
  title: string;
  statementMd: string;
  givens: string[];
  expecteds: string[];
  outputFormat?: string;
  tools: string[];
  code: string;
  statusLabel: string;
  passed: number;
  total: number;
  messages: string[];
  failures: string[];
  hiddenFailed: number;
  tags: string[];
  /** Vrai quand la correction vient d'un DST déjà rendu (les entrées des tests cachés ne sont pas conservées). */
  afterSubmission?: boolean;
}

const STATUS_FR: Record<string, string> = { reussi: 'réussi', partiel: 'partiellement réussi', echoue: 'échoué', compilation: 'ne compile pas', interdit: 'construction interdite', crash: 'erreur d’exécution', 'non-rendu': 'non rendu' };

function describeMismatch(m: NonNullable<CheckResult['verdicts'][number]['mismatches']>[number]): string {
  switch (m.kind) {
    case 'var': return m.reason === 'missing' ? `la variable ${m.name} n’existe pas à la fin` : m.reason === 'type' ? `la variable ${m.name} n’a pas le bon type (attendu ${m.expected.type}, obtenu ${m.got?.type})` : `${m.name} vaut ${fmtValue(m.got!.type, m.got!.value)} au lieu de ${fmtJv(m.expected)}`;
    case 'out': return `affichage obtenu « ${m.got || '(rien)'} » au lieu de « ${m.expected || '(rien)'} »`;
    case 'grid': return 'la grille finale diffère de la grille attendue';
    case 'canvas': return m.sizeDiffers ? 'la toile n’a pas les bonnes dimensions' : `le dessin diffère de ${m.diffPixels} pixels`;
    case 'runner': return m.reason === 'touched' ? 'le personnage touche une case rouge' : m.reason === 'absent' ? 'pas de personnage' : 'le personnage n’atteint pas la case verte';
    case 'exception': return `exception ${m.type}${m.msg ? ` (${m.msg})` : ''}${m.line > 0 ? ` à la ligne ${m.line}` : ''}`;
    case 'timeout': return 'temps limite dépassé (boucle infinie ?)';
    case 'hidden': return 'test caché';
  }
}

/** À partir d'un résultat de « Vérifier » ou « Exécuter » : seuls les tests PUBLICS sont détaillés (les cachés ne sont que comptés). */
export function fromCheck(ex: Pick<Exercise, 'title' | 'statementMd' | 'givenVariables' | 'expectedVariables' | 'outputFormat' | 'tools'>, code: string, r: CheckResult): ExplainInput {
  const failedPublic = r.verdicts.filter((v) => !v.passed && v.visibility === 'public');
  return {
    title: ex.title, statementMd: ex.statementMd,
    givens: ex.givenVariables.map((v) => `${v.type} ${v.name}`), expecteds: ex.expectedVariables.map((v) => `${v.type} ${v.name}`),
    outputFormat: ex.outputFormat, tools: ex.tools.map((t) => t.id),
    code, statusLabel: STATUS_FR[r.status] ?? r.status, passed: r.passed, total: r.total,
    messages: r.diagnostics.map((d) => `ligne ${d.line} : ${d.fr}${d.snippet ? ` — « ${d.snippet.trim()} »` : ''} (message original : ${d.original})`),
    failures: failedPublic.slice(0, 3).map((v) => {
      const inputs = v.inputs ? Object.entries(v.inputs).map(([k, j]) => `${k} = ${fmtJv(j)}`).join(', ') : '';
      return `${inputs ? `avec ${inputs} : ` : ''}${v.mismatches.map(describeMismatch).join(' ; ')}`;
    }),
    hiddenFailed: r.verdicts.filter((v) => !v.passed && v.visibility !== 'public').length,
    tags: r.errorTags.filter(isCountableTag).map(tagLabel),
  };
}

/** À partir d'un DST rendu : on dispose de l'énoncé, du code, du statut, du message du compilateur et des étiquettes — pas des entrées cachées. */
export function fromDstItem(ex: Pick<Exercise, 'title' | 'statementMd' | 'givenVariables' | 'expectedVariables' | 'outputFormat' | 'tools'>, code: string, item: { status: string; passed: number; total: number; message?: string; errorTags?: string[]; failedTests?: string[] }): ExplainInput {
  return {
    title: ex.title, statementMd: ex.statementMd,
    givens: ex.givenVariables.map((v) => `${v.type} ${v.name}`), expecteds: ex.expectedVariables.map((v) => `${v.type} ${v.name}`),
    outputFormat: ex.outputFormat, tools: ex.tools.map((t) => t.id),
    code, statusLabel: STATUS_FR[item.status] ?? item.status, passed: item.passed, total: item.total,
    messages: item.message ? [item.message] : [], failures: [], hiddenFailed: (item.failedTests ?? []).length,
    tags: (item.errorTags ?? []).filter(isCountableTag).map(tagLabel), afterSubmission: true,
  };
}

const clip = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n)}\n… (tronqué)`);

export function buildExplainPrompt(i: ExplainInput): string {
  const L: string[] = [];
  L.push('Tu es mon professeur de programmation Java (module IPA, première année d’école d’ingénieurs). Je suis bloqué sur un exercice et je veux COMPRENDRE mon erreur, pas recevoir la solution.');
  L.push('');
  L.push('## Consignes pour ta réponse');
  L.push('1. Explique-moi d’abord, avec des mots simples, ce que mon code fait réellement (pas ce que je voulais qu’il fasse).');
  L.push('2. Repère l’endroit précis de mon raisonnement qui pose problème, et pourquoi.');
  L.push('3. Ne me donne PAS la solution complète : guide-moi avec une question ou un indice pour que je corrige moi-même, puis propose-moi un petit exercice voisin pour vérifier que j’ai compris.');
  L.push('4. Reste dans le cadre du cours : Java 8, aucune bibliothèque, un fragment de code sans classe ni méthode main (les variables « fournies » sont déjà déclarées), `affiche(...)` pour ce qui est évalué.');
  L.push('');
  L.push(`## Exercice : ${i.title}`);
  L.push(clip(i.statementMd, 1800));
  if (i.givens.length) L.push(`\nVariables fournies (déjà déclarées) : ${i.givens.join(', ')}`);
  if (i.expecteds.length) L.push(`Variables à déclarer : ${i.expecteds.join(', ')}`);
  if (i.outputFormat) L.push(`Format de sortie : ${clip(i.outputFormat, 300)}`);
  if (i.tools.length) L.push(`Outils fournis : ${i.tools.join(', ')}`);
  L.push('');
  L.push('## Mon code');
  L.push('```java');
  L.push(clip(i.code.trim() || '(vide)', 1800));
  L.push('```');
  L.push('');
  L.push('## Résultat de la correction automatique (tests fonctionnels)');
  L.push(`- Statut : ${i.statusLabel}${i.total ? ` — ${i.passed}/${i.total} tests réussis` : ''}`);
  for (const m of i.messages.slice(0, 3)) L.push(`- Compilateur : ${clip(m, 400)}`);
  for (const f of i.failures) L.push(`- Test public échoué : ${clip(f, 400)}`);
  if (i.hiddenFailed) L.push(`- ${i.hiddenFailed} test(s) caché(s) ou limite(s) échoué(s)${i.afterSubmission ? '' : ' (détail non communiqué)'}`);
  if (i.tags.length) L.push(`- Types d’erreur détectés : ${i.tags.join(' ; ')}`);
  return L.join('\n');
}

/** Lien claude.ai pré-rempli quand le prompt tient dans une adresse raisonnable ; sinon on ouvre claude.ai et l'étudiant colle le prompt. */
export const MAX_URL_PROMPT = 6000;
export function claudeUrl(prompt: string): { url: string; prefilled: boolean } {
  const q = encodeURIComponent(prompt);
  return q.length <= MAX_URL_PROMPT ? { url: `https://claude.ai/new?q=${q}`, prefilled: true } : { url: 'https://claude.ai/new', prefilled: false };
}
