package ipa;

/** Pilote des tests : appelé par le main généré. Produit un JSON par test. */
public final class Driver {
    private Driver() {}

    static StringBuilder caps;
    static StringBuilder stdout = new StringBuilder();
    private static final StringBuilder res = new StringBuilder("[");
    private static int count;
    private static String cur;
    private static long t0, totalDeadline, perTest;
    private static String exc;       // JSON de l'exception du test courant
    private static boolean timeout, skipped, sawTimeout;

    public static void begin(int perTestMs, int totalMs) {
        perTest = perTestMs;
        totalDeadline = System.currentTimeMillis() + totalMs;
        res.setLength(0); res.append('['); count = 0; sawTimeout = false;
    }

    /** @return false si le temps total est épuisé : le test est alors ignoré (marqué « skipped »). */
    public static boolean test(String id, int[] scene) {
        cur = id; exc = null; timeout = false; skipped = false;
        caps = new StringBuilder(); stdout = new StringBuilder();
        t0 = System.currentTimeMillis();
        Env.reset(scene);
        if (t0 >= totalDeadline) { skipped = true; Guard.deadline = Long.MAX_VALUE; return false; }
        // Après un 1er dépassement, on suppose une boucle infinie : les tests suivants n'ont que 500 ms.
        Guard.deadline = Math.min(t0 + (sawTimeout ? Math.min(perTest, 500) : perTest), totalDeadline);
        return true;
    }

    public static void fail(Throwable e) {
        Guard.deadline = Long.MAX_VALUE;
        timeout = e instanceof Guard.TimeLimit;
        if (timeout) sawTimeout = true;
        int line = -1;
        try {
            for (StackTraceElement f : e.getStackTrace())
                if ("Exercice".equals(f.getClassName()) && f.getMethodName().startsWith("__run")) { line = f.getLineNumber(); break; }
        } catch (Throwable ignore) { /* pile indisponible */ }
        StringBuilder sb = new StringBuilder("{\"type\":");
        Json.str(sb, e.getClass().getName());
        sb.append(",\"msg\":"); Json.str(sb, e.getMessage());
        sb.append(",\"line\":").append(line).append('}');
        exc = sb.toString();
    }

    public static void end() {
        Guard.deadline = Long.MAX_VALUE;
        if (count++ > 0) res.append(',');
        res.append("{\"id\":"); Json.str(res, cur);
        res.append(",\"ms\":").append(System.currentTimeMillis() - t0);
        res.append(",\"skipped\":").append(skipped);
        res.append(",\"timeout\":").append(timeout);
        res.append(",\"caps\":[").append(caps).append(']');
        res.append(",\"out\":"); Json.str(res, Env.out.toString());
        res.append(",\"dbg\":"); Json.str(res, Env.dbg.toString());
        res.append(",\"stdout\":"); Json.str(res, stdout.toString());
        res.append(",\"grid\":").append(Env.gridJson());
        res.append(",\"canvas\":").append(Env.canvasJson());
        res.append(",\"runner\":").append(Env.runnerJson());
        res.append(",\"exc\":").append(exc == null ? "null" : exc);
        res.append('}');
    }

    public static String json() { return res.toString() + "]"; }
}
