package ipa;

import java.util.Locale;

/**
 * État et implémentation des outils (affichage, dessin, grille, runner).
 * Les wrappers appelables par l'étudiant sont générés par exercice (classe __Env) : seuls les outils
 * listés par l'exercice existent, comme sur Schooding.
 */
public final class Env {
    private Env() {}

    // ───────────── sortie ─────────────
    static final StringBuilder out = new StringBuilder();
    static final StringBuilder dbg = new StringBuilder();
    static int outCount;

    private static void guardOut() {
        if (++outCount > 10_000 || out.length() > 200_000)
            throw new Guard.Fatal("Sortie trop longue (plus de 10 000 affichages) : boucle infinie ?");
    }
    public static void print(String s, boolean nl) {
        guardOut();
        out.append(s == null ? "null" : s);
        if (nl) out.append('\n');
    }
    public static void printInt(long v, boolean nl) { print(Long.toString(v), nl); }
    public static void printBool(boolean v, boolean nl) { print(v ? "true" : "false", nl); }
    /** decimals < 0 : représentation Java par défaut. */
    public static void printReal(double v, int decimals, boolean nl) {
        print(decimals < 0 ? Double.toString(v) : String.format(Locale.ROOT, "%." + decimals + "f", v), nl);
    }
    public static void debug(String s) {
        if (dbg.length() > 100_000) return;
        dbg.append(s).append('\n');
    }
    public static void debugObj(Object o) {
        if (o instanceof int[]) debug(java.util.Arrays.toString((int[]) o));
        else if (o instanceof double[]) debug(java.util.Arrays.toString((double[]) o));
        else if (o instanceof char[]) debug(java.util.Arrays.toString((char[]) o));
        else if (o instanceof boolean[]) debug(java.util.Arrays.toString((boolean[]) o));
        else if (o instanceof Object[]) debug(java.util.Arrays.deepToString((Object[]) o));
        else debug(String.valueOf(o));
    }

    // ───────────── maths ─────────────
    public static int pgcd(int a, int b) {
        a = Math.abs(a); b = Math.abs(b);
        while (b != 0) { int t = a % b; a = b; b = t; }
        return a;
    }
    public static double distance(double x1, double y1, double x2, double y2) {
        double dx = x2 - x1, dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // ───────────── couleurs ─────────────
    /** Liste HYPOTHÈSE : la liste exacte de Schooding est tronquée dans l'export (docs/02 §4). */
    public static final String[] COLORS = {"white", "black", "red", "green", "blue", "yellow", "orange", "brown", "gray", "pink", "purple", "cyan"};
    static final char[] LETTERS = {'w', 'k', 'r', 'g', 'b', 'y', 'o', 'n', 'a', 'p', 'u', 'c'};
    static int fill = 1;

    public static void setFillColor(String c) {
        String k = c == null ? "" : c.trim().toLowerCase(Locale.ROOT);
        if (k.equals("grey")) k = "gray";
        for (int i = 0; i < COLORS.length; i++) if (COLORS[i].equals(k)) { fill = i; return; }
        throw new IllegalArgumentException("Couleur inconnue : \"" + c + "\". Couleurs gérées : " + String.join(", ", COLORS));
    }

    // ───────────── toile (kind drawing) ─────────────
    static int cw, ch;
    static int[][] canvas;

    private static void px(int x, int y) {
        if (canvas != null && x >= 0 && y >= 0 && x < cw && y < ch) canvas[y][x] = fill;
    }
    private static void needCanvas() { if (canvas == null) throw new IllegalStateException("Pas de toile de dessin dans cet exercice."); }

    public static void rectangle(int x, int y, int w, int h) {
        needCanvas();
        int x0 = Math.max(0, Math.min(x, x + w)), x1 = Math.min(cw, Math.max(x, x + w));
        int y0 = Math.max(0, Math.min(y, y + h)), y1 = Math.min(ch, Math.max(y, y + h));
        for (int j = y0; j < y1; j++) for (int i = x0; i < x1; i++) canvas[j][i] = fill;
    }
    /** Base horizontale en y de x à x+w, sommet en (x + w/2, y + h) : h < 0 ⇒ pointe vers le haut. */
    public static void isoTriangle(int x, int y, int w, int h) {
        needCanvas();
        fillPoly(new double[]{x, x + w, x + w / 2.0}, new double[]{y, y, y + h}, 3);
    }
    public static void circle(int cx, int cy, int r) {
        needCanvas();
        if (r < 0) return;
        for (int j = Math.max(0, cy - r); j <= Math.min(ch - 1, cy + r); j++)
            for (int i = Math.max(0, cx - r); i <= Math.min(cw - 1, cx + r); i++) {
                long dx = i - cx, dy = j - cy;
                if (dx * dx + dy * dy <= (long) r * r) canvas[j][i] = fill;
            }
    }
    public static void line(int x1, int y1, int x2, int y2) {
        needCanvas();
        int dx = Math.abs(x2 - x1), dy = -Math.abs(y2 - y1), sx = x1 < x2 ? 1 : -1, sy = y1 < y2 ? 1 : -1, err = dx + dy;
        for (int guard = 0; guard < 100_000; guard++) {
            px(x1, y1);
            if (x1 == x2 && y1 == y2) break;
            int e2 = 2 * err;
            if (e2 >= dy) { err += dy; x1 += sx; }
            if (e2 <= dx) { err += dx; y1 += sy; }
        }
    }

    // polygone courant
    static int[] px_ = new int[64], py_ = new int[64];
    static int pn;
    static boolean polyOpen;
    public static void startPolygon() {
        needCanvas();
        if (polyOpen) throw new IllegalStateException("Le polygone précédent doit être terminé (stopPolygon) avant d'en commencer un nouveau.");
        polyOpen = true; pn = 0;
    }
    public static void addPoint(int x, int y) {
        if (!polyOpen) throw new IllegalStateException("addPoint appelé sans startPolygon.");
        if (pn == px_.length) { px_ = java.util.Arrays.copyOf(px_, pn * 2); py_ = java.util.Arrays.copyOf(py_, pn * 2); }
        px_[pn] = x; py_[pn] = y; pn++;
    }
    public static void stopPolygon() {
        if (!polyOpen) throw new IllegalStateException("stopPolygon appelé sans startPolygon.");
        polyOpen = false;
        if (pn < 2) return;
        double[] xs = new double[pn], ys = new double[pn];
        for (int i = 0; i < pn; i++) { xs[i] = px_[i]; ys[i] = py_[i]; }
        fillPoly(xs, ys, pn);
        for (int i = 0; i < pn; i++) { int j = (i + 1) % pn; line(px_[i], py_[i], px_[j], py_[j]); }
    }

    /** Remplissage par balayage (règle pair-impair), sur les centres de pixels. */
    private static void fillPoly(double[] xs, double[] ys, int n) {
        double minY = Double.MAX_VALUE, maxY = -Double.MAX_VALUE;
        for (int i = 0; i < n; i++) { minY = Math.min(minY, ys[i]); maxY = Math.max(maxY, ys[i]); }
        int y0 = Math.max(0, (int) Math.floor(minY)), y1 = Math.min(ch - 1, (int) Math.ceil(maxY));
        double[] cut = new double[n];
        for (int y = y0; y <= y1; y++) {
            double yc = y + 0.5;
            int k = 0;
            for (int i = 0; i < n; i++) {
                int j = (i + 1) % n;
                double ya = ys[i], yb = ys[j];
                if ((ya <= yc && yb > yc) || (yb <= yc && ya > yc)) cut[k++] = xs[i] + (yc - ya) * (xs[j] - xs[i]) / (yb - ya);
            }
            java.util.Arrays.sort(cut, 0, k);
            for (int a = 0; a + 1 < k; a += 2) {
                int xa = (int) Math.ceil(cut[a] - 0.5), xb = (int) Math.floor(cut[a + 1] - 0.5);
                for (int x = Math.max(0, xa); x <= Math.min(cw - 1, xb); x++) canvas[y][x] = fill;
            }
        }
    }

    // ───────────── grille (kind grid) ─────────────
    static int gw, gh;
    static int[][] grid;
    public static void fillCase(int x, int y) {
        if (grid == null) throw new IllegalStateException("Pas de grille dans cet exercice.");
        if (x < 0 || y < 0 || x >= gw || y >= gh)
            throw new IllegalArgumentException("fillCase(" + x + ", " + y + ") : case hors de la grille (largeur " + gw + ", hauteur " + gh + ").");
        grid[y][x] = fill;
    }

    // ───────────── runner (kind runner) ─────────────
    static boolean hasRunner;
    static int rw, rh, rx, ry, gx, gy, sx0, sy0;
    static boolean[][] wall;
    static boolean touched, lastCloser;
    static int moves;
    static int[] path = new int[0];
    static int pathLen;

    private static void move(int dx, int dy) {
        if (!hasRunner) throw new IllegalStateException("Pas de personnage dans cet exercice.");
        if (++moves > 100_000) throw new Guard.Fatal("Trop de déplacements : boucle infinie ?");
        int before = Math.abs(rx - gx) + Math.abs(ry - gy);
        int nx = rx + dx, ny = ry + dy;
        if (nx < 0 || ny < 0 || nx >= rw || ny >= rh)
            throw new Guard.Fatal("Le personnage est sorti de la carte (case " + nx + ", " + ny + ").");
        rx = nx; ry = ny;
        lastCloser = Math.abs(rx - gx) + Math.abs(ry - gy) < before;
        if (pathLen + 2 <= path.length) { path[pathLen++] = rx; path[pathLen++] = ry; }
        if (wall[ry][rx]) { touched = true; throw new Guard.Fatal("Le personnage a touché une case rouge en (" + rx + ", " + ry + ")."); }
    }
    public static void moveUp() { move(0, -1); }
    public static void moveDown() { move(0, 1); }
    public static void moveLeft() { move(-1, 0); }
    public static void moveRight() { move(1, 0); }
    public static boolean warmer() { return lastCloser; }

    // ───────────── cycle de vie ─────────────
    /**
     * scene : [cw, ch, gw, gh, hasRunner, rw, rh, startX, startY, goalX, goalY, nWalls, (x, y)×nWalls]
     * (0 = absent). Appelé par Driver.test avant chaque test.
     */
    static void reset(int[] s) {
        out.setLength(0); dbg.setLength(0); outCount = 0;
        fill = 1; polyOpen = false; pn = 0;
        cw = s[0]; ch = s[1];
        canvas = cw > 0 && ch > 0 ? new int[ch][cw] : null;
        gw = s[2]; gh = s[3];
        grid = gw > 0 && gh > 0 ? new int[gh][gw] : null;
        hasRunner = s[4] != 0;
        touched = false; lastCloser = false; moves = 0; pathLen = 0;
        if (hasRunner) {
            rw = s[5]; rh = s[6]; rx = sx0 = s[7]; ry = sy0 = s[8]; gx = s[9]; gy = s[10];
            wall = new boolean[rh][rw];
            int nw = s[11];
            for (int i = 0; i < nw; i++) wall[s[13 + 2 * i]][s[12 + 2 * i]] = true;
            path = new int[2000];
        }
    }

    static String gridJson() {
        if (grid == null) return "null";
        StringBuilder sb = new StringBuilder("[");
        for (int y = 0; y < gh; y++) {
            if (y > 0) sb.append(',');
            sb.append('"');
            for (int x = 0; x < gw; x++) sb.append(LETTERS[grid[y][x]]);
            sb.append('"');
        }
        return sb.append(']').toString();
    }

    /** Raster compressé : w, h, puis paires (couleur, longueur) ; empreinte SHA-256 du raster brut. */
    static String canvasJson() {
        if (canvas == null) return "null";
        StringBuilder rle = new StringBuilder("[");
        int prev = -1, run = 0, pairs = 0;
        java.security.MessageDigest md = null;
        try { md = java.security.MessageDigest.getInstance("SHA-256"); } catch (Exception e) { /* empreinte absente */ }
        for (int y = 0; y < ch; y++) {
            for (int x = 0; x < cw; x++) {
                int c = canvas[y][x];
                if (md != null) md.update((byte) c);
                if (c == prev) run++;
                else {
                    if (run > 0) { if (pairs++ > 0) rle.append(','); rle.append(prev).append(',').append(run); }
                    prev = c; run = 1;
                }
            }
        }
        if (run > 0) { if (pairs > 0) rle.append(','); rle.append(prev).append(',').append(run); }
        rle.append(']');
        String hash = "";
        if (md != null) { StringBuilder h = new StringBuilder(); for (byte b : md.digest()) h.append(String.format("%02x", b)); hash = h.toString(); }
        return "{\"w\":" + cw + ",\"h\":" + ch + ",\"hash\":\"" + hash + "\",\"rle\":" + rle + "}";
    }

    static String runnerJson() {
        if (!hasRunner) return "null";
        StringBuilder p = new StringBuilder("[");
        for (int i = 0; i < pathLen; i++) { if (i > 0) p.append(','); p.append(path[i]); }
        p.append(']');
        return "{\"x\":" + rx + ",\"y\":" + ry + ",\"reached\":" + (rx == gx && ry == gy && !touched) + ",\"touched\":" + touched
            + ",\"moves\":" + moves + ",\"path\":" + p + "}";
    }
}
