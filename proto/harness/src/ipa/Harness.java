package ipa;

import java.io.*;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.*;
import javax.tools.*;

/** Compile en mémoire avec ECJ (JSR-199) puis exécute une classe main, sorties capturées. */
public class Harness {

    static final class Src extends SimpleJavaFileObject {
        final String code;
        Src(String name, String code) { super(URI.create("string:///" + name), Kind.SOURCE); this.code = code; }
        @Override public CharSequence getCharContent(boolean b) { return code; }
    }
    static final class Out extends SimpleJavaFileObject {
        final ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        Out(String cls) { super(URI.create("mem:///" + cls.replace('.', '/') + ".class"), Kind.CLASS); }
        @Override public OutputStream openOutputStream() { return bytes; }
    }
    static final class MemLoader extends ClassLoader {
        final Map<String, Out> classes;
        MemLoader(Map<String, Out> c, ClassLoader parent) { super(parent); classes = c; }
        @Override protected Class<?> findClass(String n) throws ClassNotFoundException {
            Out o = classes.get(n);
            if (o == null) throw new ClassNotFoundException(n);
            byte[] b = instrument(o.bytes.toByteArray());
            return defineClass(n, b, 0, b.length);
        }
    }

    /** Insère Guard.tick() avant chaque saut arrière : détecte les boucles infinies sans tuer de thread. */
    static byte[] instrument(byte[] in) {
        org.objectweb.asm.ClassReader cr = new org.objectweb.asm.ClassReader(in);
        org.objectweb.asm.ClassWriter cw = new org.objectweb.asm.ClassWriter(cr, org.objectweb.asm.ClassWriter.COMPUTE_MAXS);
        cr.accept(new org.objectweb.asm.ClassVisitor(org.objectweb.asm.Opcodes.ASM9, cw) {
            @Override public org.objectweb.asm.MethodVisitor visitMethod(int acc, String name, String desc, String sig, String[] ex) {
                org.objectweb.asm.MethodVisitor mv = super.visitMethod(acc, name, desc, sig, ex);
                return new org.objectweb.asm.MethodVisitor(org.objectweb.asm.Opcodes.ASM9, mv) {
                    final java.util.Set<org.objectweb.asm.Label> seen = new java.util.HashSet<>();
                    @Override public void visitLabel(org.objectweb.asm.Label l) { seen.add(l); super.visitLabel(l); }
                    @Override public void visitJumpInsn(int op, org.objectweb.asm.Label l) {
                        if (seen.contains(l)) super.visitMethodInsn(org.objectweb.asm.Opcodes.INVOKESTATIC, "ipa/Guard", "tick", "()V", false);
                        super.visitJumpInsn(op, l);
                    }
                };
            }
        }, 0);
        return cw.toByteArray();
    }

    static String esc(String s) {
        if (s == null) return "null";
        StringBuilder sb = new StringBuilder("\"");
        for (char c : s.toCharArray()) {
            switch (c) {
                case '"': sb.append("\\\""); break;
                case '\\': sb.append("\\\\"); break;
                case '\n': sb.append("\\n"); break;
                case '\r': sb.append("\\r"); break;
                case '\t': sb.append("\\t"); break;
                default: if (c < 0x20) sb.append(String.format("\\u%04x", (int) c)); else sb.append(c);
            }
        }
        return sb.append('"').toString();
    }

    static String workRoot() {
        String r = System.getProperty("ipa.work");
        if (r == null) r = System.getProperty("java.io.tmpdir");
        return r;
    }
    static void rmrf(File f) { File[] k = f.listFiles(); if (k != null) for (File x : k) rmrf(x); f.delete(); }

    /** filesPacked : nom\u0001source\u0000nom\u0001source ... */
    public static String run(String filesPacked, String mainClass, String stdin, int timeoutMs) { return run2(filesPacked, mainClass, stdin, timeoutMs, "-17"); }
    public static String run2(String filesPacked, String mainClass, String stdin, int timeoutMs, String ecjOpts) {
        long t0 = System.currentTimeMillis();
        File dir = new File(workRoot(), "ipa" + System.nanoTime());
        File srcDir = new File(dir, "src"), outDir = new File(dir, "out");
        srcDir.mkdirs(); outDir.mkdirs();
        List<String> args = new ArrayList<>(Arrays.asList(ecjOpts.trim().split("\\s+")));
        args.addAll(Arrays.asList("-encoding", "UTF-8", "-nowarn", "-g", "-proc:none", "-Xemacs", "-d", outDir.getPath()));
        try {
            for (String part : filesPacked.split("\u0000")) {
                if (part.isEmpty()) continue;
                int i = part.indexOf('\u0001');
                File f = new File(srcDir, part.substring(0, i));
                try (Writer w = new OutputStreamWriter(new FileOutputStream(f), StandardCharsets.UTF_8)) { w.write(part.substring(i + 1)); }
                args.add(f.getPath());
            }
        } catch (IOException e) { return "{\"phase\":\"fs\",\"error\":" + esc(e.toString()) + "}"; }
        StringWriter cOut = new StringWriter(), cErr = new StringWriter();
        boolean ok;
        try {
            ok = org.eclipse.jdt.core.compiler.batch.BatchCompiler.compile(args.toArray(new String[0]), new PrintWriter(cOut), new PrintWriter(cErr), null);
        } catch (Throwable e) {
            return "{\"phase\":\"compiler-crash\",\"error\":" + esc(e.toString()) + "}";
        }
        long tCompile = System.currentTimeMillis() - t0;
        // Format -Xemacs : chemin:ligne: error: message
        StringBuilder d = new StringBuilder("[");
        String all = cErr.toString() + cOut.toString();
        for (String line : all.split("\n")) {
            java.util.regex.Matcher m = java.util.regex.Pattern.compile("^(.*?):(\\d+): (error|warning): (.*)$").matcher(line);
            if (m.find()) {
                if (d.length() > 1) d.append(',');
                String file = new File(m.group(1)).getName();
                d.append("{\"kind\":").append(esc(m.group(3))).append(",\"file\":").append(esc(file))
                 .append(",\"line\":").append(m.group(2)).append(",\"msg\":").append(esc(m.group(4))).append('}');
            }
        }
        d.append(']');
        if (!ok) {
            rmrf(dir);
            return "{\"phase\":\"compile\",\"ok\":false,\"compileMs\":" + tCompile + ",\"diagnostics\":" + d + ",\"raw\":" + esc(all) + "}";
        }
        Map<String, Out> classes = new HashMap<>();
        loadDir(outDir, "", classes);
        rmrf(dir);
        // Exécution
        ByteArrayOutputStream outBuf = new ByteArrayOutputStream();
        ByteArrayOutputStream errBuf = new ByteArrayOutputStream();
        PrintStream oldOut = System.out, oldErr = System.err; InputStream oldIn = System.in;
        final String[] exc = {null};
        final boolean[] done = {false};
        MemLoader loader = new MemLoader(classes, Harness.class.getClassLoader());
        Thread th = new Thread(() -> {
            try {
                Class<?> c = loader.loadClass(mainClass);
                c.getMethod("main", String[].class).invoke(null, (Object) new String[0]);
            } catch (java.lang.reflect.InvocationTargetException ite) {
                Throwable t = ite.getCause();
                StringWriter sw = new StringWriter(); t.printStackTrace(new PrintWriter(sw));
                exc[0] = sw.toString();
            } catch (Throwable t) { exc[0] = t.toString(); }
            done[0] = true;
        });
        long t1 = System.currentTimeMillis();
        try {
            System.setOut(new PrintStream(new LimitedStream(outBuf, 200_000), true, "UTF-8"));
            System.setErr(new PrintStream(new LimitedStream(errBuf, 50_000), true, "UTF-8"));
            System.setIn(new ByteArrayInputStream((stdin == null ? "" : stdin).getBytes(StandardCharsets.UTF_8)));
            Guard.deadline = System.currentTimeMillis() + timeoutMs;
            th.setDaemon(true);
            th.start();
            th.join(timeoutMs + 2000);
        } catch (Exception e) { exc[0] = e.toString(); }
        finally { System.out.flush(); System.setOut(oldOut); System.setErr(oldErr); System.setIn(oldIn); }
        boolean timedOut = !done[0] || (exc[0] != null && exc[0].contains("Temps limite"));
        Guard.deadline = Long.MAX_VALUE;
        String stopped = "no";
        if (!done[0]) {
            try { th.stop(); stopped = "stop"; } catch (Throwable t) { stopped = "impossible:" + t.getClass().getSimpleName(); }
        }
        long tRun = System.currentTimeMillis() - t1;
        return "{\"phase\":\"run\",\"ok\":true,\"compileMs\":" + tCompile + ",\"runMs\":" + tRun
            + ",\"diagnostics\":" + d
            + ",\"stdout\":" + esc(new String(outBuf.toByteArray(), StandardCharsets.UTF_8))
            + ",\"stderr\":" + esc(new String(errBuf.toByteArray(), StandardCharsets.UTF_8))
            + ",\"exception\":" + esc(exc[0])
            + ",\"timedOut\":" + timedOut + ",\"stopped\":" + esc(stopped) + "}";
    }

    static void loadDir(File d, String pkg, Map<String, Out> classes) {
        File[] k = d.listFiles(); if (k == null) return;
        for (File f : k) {
            if (f.isDirectory()) loadDir(f, pkg + f.getName() + ".", classes);
            else if (f.getName().endsWith(".class")) {
                String cn = pkg + f.getName().substring(0, f.getName().length() - 6);
                Out o = new Out(cn);
                try { o.bytes.write(java.nio.file.Files.readAllBytes(f.toPath())); } catch (IOException e) { }
                classes.put(cn, o);
            }
        }
    }

    static final class LimitedStream extends OutputStream {
        final OutputStream o; final int max; int n;
        LimitedStream(OutputStream o, int max) { this.o = o; this.max = max; }
        @Override public void write(int b) throws IOException {
            if (++n > max) throw new IOException("Sortie trop longue (boucle infinie ?)");
            o.write(b);
        }
    }

    public static void main(String[] a) throws Exception {
        String src = new String(System.in.readAllBytes(), StandardCharsets.UTF_8);
        System.out.println(run("Main.java\u0001" + src, a.length > 0 ? a[0] : "Main", "", 3000));
    }
}
