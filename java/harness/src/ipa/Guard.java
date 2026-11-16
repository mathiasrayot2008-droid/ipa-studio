package ipa;

/** Garde-fous appelés par le bytecode instrumenté du code étudiant. */
public final class Guard {
    private Guard() {}
    public static volatile long deadline = Long.MAX_VALUE;
    private static int n;
    public static final int MAX_ARRAY = 20_000_000;

    /** Inséré avant chaque saut arrière (boucle) : vérifie l'échéance toutes les 1024 itérations. */
    public static void tick() {
        if ((++n & 1023) == 0 && System.currentTimeMillis() > deadline) throw new TimeLimit();
    }

    /** Inséré avant chaque création de tableau : refuse les tailles absurdes (mémoire du navigateur). */
    public static void arr(int size) {
        if (size > MAX_ARRAY) throw new Fatal("Tableau trop grand (" + size + " cases) : la mémoire est limitée dans le navigateur.");
    }

    public static final class TimeLimit extends Error {
        public TimeLimit() { super("Temps limite dépassé : boucle infinie ou calcul trop long ?"); }
    }

    /** Erreur d'environnement qui interrompt le test courant (sortie trop longue, case rouge touchée…). */
    public static final class Fatal extends Error {
        public Fatal(String m) { super(m); }
    }
}
