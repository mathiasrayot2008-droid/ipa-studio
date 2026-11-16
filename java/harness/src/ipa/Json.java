package ipa;

final class Json {
    private Json() {}
    static void str(StringBuilder sb, String s) {
        if (s == null) { sb.append("null"); return; }
        sb.append('"');
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"': sb.append("\\\""); break;
                case '\\': sb.append("\\\\"); break;
                case '\n': sb.append("\\n"); break;
                case '\r': sb.append("\\r"); break;
                case '\t': sb.append("\\t"); break;
                default:
                    if (c < 0x20 || (c >= 0xD800 && c <= 0xDFFF)) sb.append(String.format("\\u%04x", (int) c));
                    else sb.append(c);
            }
        }
        sb.append('"');
    }
    static String str(String s) { StringBuilder sb = new StringBuilder(); str(sb, s); return sb.toString(); }
    static String dbl(double d) {
        if (Double.isNaN(d)) return "\"NaN\"";
        if (Double.isInfinite(d)) return d > 0 ? "\"Infinity\"" : "\"-Infinity\"";
        return Double.toString(d);
    }
}
