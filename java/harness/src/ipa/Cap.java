package ipa;

/** Capture typée des variables que l'étudiant devait déclarer. Une surcharge par type Java. */
public final class Cap {
    private Cap() {}
    private static void put(String n, String t, String v) {
        StringBuilder c = Driver.caps;
        if (c == null) return;
        if (c.length() > 0) c.append(',');
        c.append("{\"n\":").append(Json.str(n)).append(",\"t\":\"").append(t).append("\",\"v\":").append(v).append('}');
    }
    public static void v(String n, int x) { put(n, "int", Integer.toString(x)); }
    public static void v(String n, long x) { put(n, "long", Long.toString(x)); }
    public static void v(String n, float x) { put(n, "float", Json.dbl(x)); }
    public static void v(String n, double x) { put(n, "double", Json.dbl(x)); }
    public static void v(String n, boolean x) { put(n, "boolean", x ? "true" : "false"); }
    public static void v(String n, char x) { put(n, "char", Json.str(String.valueOf(x))); }
    public static void v(String n, String x) { put(n, "String", Json.str(x)); }
    public static void v(String n, int[] x) { put(n, "int[]", arr(x)); }
    public static void v(String n, double[] x) { put(n, "double[]", arr(x)); }
    public static void v(String n, boolean[] x) { put(n, "boolean[]", arr(x)); }
    public static void v(String n, char[] x) { put(n, "char[]", arr(x)); }
    public static void v(String n, String[] x) { put(n, "String[]", arr(x)); }
    public static void v(String n, int[][] x) { put(n, "int[][]", arr2(x)); }
    public static void v(String n, double[][] x) { put(n, "double[][]", arr2(x)); }
    public static void v(String n, char[][] x) { put(n, "char[][]", arr2(x)); }
    public static void v(String n, Object x) { put(n, "Object", Json.str(String.valueOf(x))); }

    private static String arr(int[] a) { if (a == null) return "null"; StringBuilder s = new StringBuilder("["); for (int i = 0; i < a.length; i++) { if (i > 0) s.append(','); s.append(a[i]); } return s.append(']').toString(); }
    private static String arr(double[] a) { if (a == null) return "null"; StringBuilder s = new StringBuilder("["); for (int i = 0; i < a.length; i++) { if (i > 0) s.append(','); s.append(Json.dbl(a[i])); } return s.append(']').toString(); }
    private static String arr(boolean[] a) { if (a == null) return "null"; StringBuilder s = new StringBuilder("["); for (int i = 0; i < a.length; i++) { if (i > 0) s.append(','); s.append(a[i]); } return s.append(']').toString(); }
    private static String arr(char[] a) { if (a == null) return "null"; StringBuilder s = new StringBuilder("["); for (int i = 0; i < a.length; i++) { if (i > 0) s.append(','); Json.str(s, String.valueOf(a[i])); } return s.append(']').toString(); }
    private static String arr(String[] a) { if (a == null) return "null"; StringBuilder s = new StringBuilder("["); for (int i = 0; i < a.length; i++) { if (i > 0) s.append(','); Json.str(s, a[i]); } return s.append(']').toString(); }
    private static String arr2(int[][] a) { if (a == null) return "null"; StringBuilder s = new StringBuilder("["); for (int i = 0; i < a.length; i++) { if (i > 0) s.append(','); s.append(arr(a[i])); } return s.append(']').toString(); }
    private static String arr2(double[][] a) { if (a == null) return "null"; StringBuilder s = new StringBuilder("["); for (int i = 0; i < a.length; i++) { if (i > 0) s.append(','); s.append(arr(a[i])); } return s.append(']').toString(); }
    private static String arr2(char[][] a) { if (a == null) return "null"; StringBuilder s = new StringBuilder("["); for (int i = 0; i < a.length; i++) { if (i > 0) s.append(','); s.append(arr(a[i])); } return s.append(']').toString(); }
}
