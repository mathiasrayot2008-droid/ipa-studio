/**
 * Vérifie l'équilibre des (), [], {} du code étudiant en ignorant chaînes, caractères et commentaires.
 * Un `}` en trop fermerait la méthode du gabarit : on le détecte avant de compiler pour donner un message clair.
 */
export interface BalanceProblem { line: number; message: string }

export function checkBalance(code: string): BalanceProblem | null {
  const stack: { ch: string; line: number }[] = [];
  const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
  let line = 1;
  let i = 0;
  const n = code.length;
  while (i < n) {
    const c = code[i]!;
    const d = code[i + 1];
    if (c === '\n') { line++; i++; continue; }
    if (c === '/' && d === '/') { while (i < n && code[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') {
      i += 2;
      while (i < n && !(code[i] === '*' && code[i + 1] === '/')) { if (code[i] === '\n') line++; i++; }
      i += 2; continue;
    }
    if (c === '"' || c === "'") {
      const q = c; i++;
      while (i < n && code[i] !== q && code[i] !== '\n') { if (code[i] === '\\') i++; i++; }
      i++; continue;
    }
    if (c === '(' || c === '[' || c === '{') stack.push({ ch: c, line });
    else if (c === ')' || c === ']' || c === '}') {
      const top = stack.pop();
      if (!top) return { line, message: `Il y a un « ${c} » en trop : rien n'est ouvert à cet endroit.` };
      if (top.ch !== pairs[c]) return { line, message: `Le « ${c} » ne correspond pas au « ${top.ch} » ouvert ligne ${top.line}.` };
    }
    i++;
  }
  const open = stack.pop();
  if (open) return { line: open.line, message: `Le « ${open.ch} » ouvert ligne ${open.line} n'est jamais fermé.` };
  return null;
}
