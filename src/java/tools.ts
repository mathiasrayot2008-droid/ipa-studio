import type { ToolConfig, ToolId } from '@/types/bank';

/**
 * Registre des outils : source Java des wrappers placés dans __Env.
 * Seuls les outils listés par l'exercice existent ⇒ appeler un outil absent donne
 * « The method X is undefined », comme sur Schooding. L'implémentation est dans ipa.Env (harnais).
 */
const nl = (c: ToolConfig) => (c.newline === false ? 'false' : 'true');
const dec = (c: ToolConfig) => (c.decimals && c.decimals > 0 ? String(c.decimals) : '-1');

type Gen = (c: ToolConfig) => string;

export const TOOLS: Record<ToolId, Gen> = {
  affiche: (c) => `static void affiche(String message) { ipa.Env.print(message, ${nl(c)}); }`,
  afficheEntier: (c) => `static void afficheEntier(int i) { ipa.Env.printInt(i, ${nl(c)}); }`,
  afficheReel: (c) => `static void afficheReel(double d) { ipa.Env.printReal(d, ${dec(c)}, ${nl(c)}); }`,
  afficheReels: (c) => `static void afficheReels(double f, double g) { ipa.Env.printReal(f, ${dec(c)}, false); ipa.Env.printReal(g, ${dec(c)}, ${nl(c)}); }`,
  afficheBooleen: (c) => `static void afficheBooleen(boolean b) { ipa.Env.printBool(b, ${nl(c)}); }`,
  debug: () =>
    ['int', 'long', 'float', 'double', 'char', 'boolean', 'String']
      .map((t) => `static void debug(${t} value) { ipa.Env.debug(String.valueOf(value)); }`)
      .join(' ') + ' static void debug(Object value) { ipa.Env.debugObj(value); }',
  PI: () => 'static final double PI = 3.1415926536;',
  pgcd: () => 'static int pgcd(int a, int b) { return ipa.Env.pgcd(a, b); }',
  sqrt: () => 'static double sqrt(double f) { return Math.sqrt(f); }',
  sin: () => 'static double sin(double angle) { return Math.sin(angle); }',
  cos: () => 'static double cos(double angle) { return Math.cos(angle); }',
  distance: () => 'static double distance(double x1, double y1, double x2, double y2) { return ipa.Env.distance(x1, y1, x2, y2); }',
  setFillColor: () => 'static void setFillColor(String color) { ipa.Env.setFillColor(color); }',
  rectangle: () => 'static void rectangle(int x, int y, int width, int height) { ipa.Env.rectangle(x, y, width, height); }',
  isoTriangle: () => 'static void isoTriangle(int x, int y, int width, int height) { ipa.Env.isoTriangle(x, y, width, height); }',
  circle: () => 'static void circle(int x, int y, int radius) { ipa.Env.circle(x, y, radius); }',
  line: () => 'static void line(int x1, int y1, int x2, int y2) { ipa.Env.line(x1, y1, x2, y2); }',
  startPolygon: () => 'static void startPolygon() { ipa.Env.startPolygon(); }',
  addPoint: () => 'static void addPoint(int x, int y) { ipa.Env.addPoint(x, y); }',
  stopPolygon: () => 'static void stopPolygon() { ipa.Env.stopPolygon(); }',
  fillCase: () => 'static void fillCase(int x, int y) { ipa.Env.fillCase(x, y); }',
  moveUp: () => 'static void moveUp() { ipa.Env.moveUp(); }',
  moveDown: () => 'static void moveDown() { ipa.Env.moveDown(); }',
  moveLeft: () => 'static void moveLeft() { ipa.Env.moveLeft(); }',
  moveRight: () => 'static void moveRight() { ipa.Env.moveRight(); }',
  warmer: () => 'static boolean warmer() { return ipa.Env.warmer(); }',
  canvasSize: () => '', // width/height sont déclarés d'office pour kind « drawing »
};

export function envSource(tools: ToolConfig[], opts: { canvasVars: boolean }): string {
  const lines = ['public class __Env {'];
  if (opts.canvasVars) lines.push('  static int width, height;');
  for (const t of tools) {
    const g = TOOLS[t.id];
    if (!g) throw new Error(`Outil inconnu : ${t.id}`);
    const src = g(t);
    if (src) lines.push('  ' + src);
  }
  lines.push('}');
  return lines.join('\n');
}
