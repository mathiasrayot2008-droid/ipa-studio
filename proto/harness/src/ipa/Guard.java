package ipa;
/** Appelé avant chaque saut arrière (boucle) du code étudiant. */
public final class Guard {
    public static volatile long deadline = Long.MAX_VALUE;
    private static int n;
    public static void tick() {
        if ((++n & 1023) == 0 && System.currentTimeMillis() > deadline)
            throw new TimeLimit();
    }
    public static final class TimeLimit extends Error {
        public TimeLimit() { super("Temps limite dépassé : boucle infinie ou calcul trop long ?"); }
    }
}
