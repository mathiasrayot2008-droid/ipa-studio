package ipa;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.objectweb.asm.*;

/**
 * Compile (ECJ) puis exécute les tests générés. Appelé depuis JavaScript (CheerpJ) ou en ligne de commande.
 * Entrée : fichiers sources « nom\u0001contenu » séparés par \u0000. Sortie : JSON.
 */
public class Harness {

    static final class MemLoader extends ClassLoader {
        final Map<String, byte[]> classes;
        MemLoader(Map<String, byte[]> c, ClassLoader parent) { super(parent); classes = c; }
        @Override protected Class<?> findClass(String n) throws ClassNotFoundException {
            byte[] raw = classes.get(n);
            if (raw == null) throw new ClassNotFoundException(n);
            byte[] b = instrument(raw);
            if (violation != null) throw new SecurityException("Instruction non autorisée : " + violation);
            return defineClass(n, b, 0, b.length);
        }
    }

    static volatile String violation;

    static final String[] FORBIDDEN_PREFIX = {
        "java/lang/Thread", "java/lang/Runtime", "java/lang/Process", "java/lang/ClassLoader", "java/lang/reflect/",
        "java/lang/invoke/MethodHandle", "java/lang/invoke/VarHandle", "java/net/", "java/io/File", "java/io/RandomAccessFile",
        "java/nio/file/", "java/nio/channels/", "java/util/concurrent/", "java/lang/Class", "java/lang/SecurityManager"
    };
    static final Set<String> SYSTEM_OK = new HashSet<>(Arrays.asList(
        "currentTimeMillis", "nanoTime", "arraycopy", "lineSeparator", "identityHashCode"));

    static boolean forbidden(String owner) {
        for (String p : FORBIDDEN_PREFIX) if (owner.startsWith(p)) return true;
        return false;
    }
    static void flag(String what) { if (violation == null) violation = what.replace('/', '.'); }

    /** Insère Guard.tick() avant chaque saut arrière, Guard.arr() avant chaque tableau ; refuse les API interdites. */
    static byte[] instrument(byte[] in) {
        ClassReader cr = new ClassReader(in);
        ClassWriter cw = new ClassWriter(cr, ClassWriter.COMPUTE_MAXS);
        cr.accept(new ClassVisitor(Opcodes.ASM9, cw) {
            @Override public MethodVisitor visitMethod(int acc, String name, String desc, String sig, String[] ex) {
                MethodVisitor mv = super.visitMethod(acc, name, desc, sig, ex);
                return new MethodVisitor(Opcodes.ASM9, mv) {
                    final Set<Label> seen = new HashSet<>();
                    @Override public void visitLabel(Label l) { seen.add(l); super.visitLabel(l); }
                    @Override public void visitJumpInsn(int op, Label l) {
                        if (seen.contains(l)) super.visitMethodInsn(Opcodes.INVOKESTATIC, "ipa/Guard", "tick", "()V", false);
                        super.visitJumpInsn(op, l);
                    }
                    @Override public void visitIntInsn(int op, int operand) {
                        if (op == Opcodes.NEWARRAY) { super.visitInsn(Opcodes.DUP); super.visitMethodInsn(Opcodes.INVOKESTATIC, "ipa/Guard", "arr", "(I)V", false); }
                        super.visitIntInsn(op, operand);
                    }
                    @Override public void visitTypeInsn(int op, String type) {
                        if (forbidden(type)) flag(type);
                        if (op == Opcodes.ANEWARRAY) { super.visitInsn(Opcodes.DUP); super.visitMethodInsn(Opcodes.INVOKESTATIC, "ipa/Guard", "arr", "(I)V", false); }
                        super.visitTypeInsn(op, type);
                    }
                    @Override public void visitMethodInsn(int op, String owner, String n, String d, boolean itf) {
                        if (forbidden(owner)) flag(owner);
                        if (owner.equals("java/lang/System") && !SYSTEM_OK.contains(n)) flag("java/lang/System." + n);
                        super.visitMethodInsn(op, owner, n, d, itf);
                    }
                    @Override public void visitFieldInsn(int op, String owner, String n, String d) {
                        if (forbidden(owner)) flag(owner);
                        super.visitFieldInsn(op, owner, n, d);
                    }
                    @Override public void visitInvokeDynamicInsn(String n, String d, Handle bsm, Object... args) {
                        String o = bsm.getOwner();
                        if (!o.equals("java/lang/invoke/LambdaMetafactory") && !o.equals("java/lang/invoke/StringConcatFactory")) flag(o);
                        super.visitInvokeDynamicInsn(n, d, bsm, args);
                    }
                };
            }
        }, 0);
        return cw.toByteArray();
    }

    static String workRoot() {
        String r = System.getProperty("ipa.work");
        return r != null ? r : System.getProperty("java.io.tmpdir");
    }
    static void rmrf(File f) { File[] k = f.listFiles(); if (k != null) for (File x : k) rmrf(x); f.delete(); }

    static void loadDir(File d, String pkg, Map<String, byte[]> classes) {
        File[] k = d.listFiles(); if (k == null) return;
        for (File f : k) {
            if (f.isDirectory()) loadDir(f, pkg + f.getName() + ".", classes);
            else if (f.getName().endsWith(".class")) {
                try { classes.put(pkg + f.getName().substring(0, f.getName().length() - 6), java.nio.file.Files.readAllBytes(f.toPath())); }
                catch (IOException e) { /* classe illisible : ignorée */ }
            }
        }
    }

    /** Sortie System.out/err du code étudiant : captée dans le test courant (non notée). */
    static final class Sink extends OutputStream {
        @Override public void write(int b) {
            StringBuilder s = Driver.stdout;
            if (s.length() < 100_000) s.append((char) (b & 0xFF));
        }
    }

    public static String check(String filesPacked, String mainClass, int perTestMs, int totalMs, String ecjOpts) {
        long t0 = System.currentTimeMillis();
        violation = null;
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
        } catch (IOException e) { return "{\"phase\":\"fs\",\"error\":" + Json.str(e.toString()) + "}"; }

        StringWriter cOut = new StringWriter(), cErr = new StringWriter();
        boolean ok;
        try {
            ok = org.eclipse.jdt.core.compiler.batch.BatchCompiler.compile(args.toArray(new String[0]), new PrintWriter(cOut), new PrintWriter(cErr), null);
        } catch (Throwable e) {
            rmrf(dir);
            return "{\"phase\":\"compiler-crash\",\"error\":" + Json.str(e.toString()) + "}";
        }
        long tCompile = System.currentTimeMillis() - t0;
        String all = cErr.toString() + cOut.toString();
        StringBuilder d = new StringBuilder("[");
        java.util.regex.Pattern pat = java.util.regex.Pattern.compile("^(.*?):(\\d+): (error|warning): (.*)$");
        for (String line : all.split("\n")) {
            java.util.regex.Matcher m = pat.matcher(line);
            if (m.find()) {
                if (d.length() > 1) d.append(',');
                d.append("{\"kind\":").append(Json.str(m.group(3))).append(",\"file\":").append(Json.str(new File(m.group(1)).getName()))
                 .append(",\"line\":").append(m.group(2)).append(",\"msg\":").append(Json.str(m.group(4))).append('}');
            }
        }
        d.append(']');
        if (!ok) {
            rmrf(dir);
            return "{\"phase\":\"compile\",\"ok\":false,\"compileMs\":" + tCompile + ",\"diagnostics\":" + d + ",\"raw\":" + Json.str(all) + "}";
        }

        Map<String, byte[]> classes = new HashMap<>();
        loadDir(outDir, "", classes);
        rmrf(dir);

        MemLoader loader = new MemLoader(classes, Harness.class.getClassLoader());
        final String[] crash = {null};
        final boolean[] done = {false};
        Thread th = new Thread(() -> {
            try {
                Class<?> c = loader.loadClass(mainClass);
                c.getMethod("main", String[].class).invoke(null, (Object) new String[0]);
            } catch (java.lang.reflect.InvocationTargetException ite) {
                crash[0] = String.valueOf(ite.getCause());
            } catch (Throwable t) { crash[0] = String.valueOf(t); }
            done[0] = true;
        });
        PrintStream oldOut = System.out, oldErr = System.err;
        long t1 = System.currentTimeMillis();
        try {
            PrintStream cap = new PrintStream(new Sink(), true, "UTF-8");
            System.setOut(cap); System.setErr(cap);
            th.setDaemon(true);
            th.start();
            th.join(totalMs + 3000L);
        } catch (Exception e) { crash[0] = e.toString(); }
        finally { System.out.flush(); System.setOut(oldOut); System.setErr(oldErr); }
        Guard.deadline = Long.MAX_VALUE;
        boolean hung = !done[0];
        long tRun = System.currentTimeMillis() - t1;

        if (violation != null)
            return "{\"phase\":\"forbidden\",\"what\":" + Json.str(violation) + ",\"compileMs\":" + tCompile + "}";
        return "{\"phase\":\"run\",\"ok\":true,\"compileMs\":" + tCompile + ",\"runMs\":" + tRun
            + ",\"diagnostics\":" + d + ",\"hung\":" + hung + ",\"crash\":" + Json.str(crash[0])
            + ",\"tests\":" + Driver.json() + "}";
    }


    /** Bac à sable : compile des fichiers libres et exécute main(String[]) avec stdin ; sortie System.out/err captée. */
    public static String runMain(String filesPacked, String mainClass, String stdin, int totalMs, String ecjOpts) {
        long t0 = System.currentTimeMillis();
        violation = null;
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
        } catch (IOException e) { return "{\"phase\":\"fs\",\"error\":" + Json.str(e.toString()) + "}"; }
        StringWriter cOut = new StringWriter(), cErr = new StringWriter();
        boolean ok;
        try {
            ok = org.eclipse.jdt.core.compiler.batch.BatchCompiler.compile(args.toArray(new String[0]), new PrintWriter(cOut), new PrintWriter(cErr), null);
        } catch (Throwable e) { rmrf(dir); return "{\"phase\":\"compiler-crash\",\"error\":" + Json.str(e.toString()) + "}"; }
        long tCompile = System.currentTimeMillis() - t0;
        String all = cErr.toString() + cOut.toString();
        StringBuilder d = new StringBuilder("[");
        java.util.regex.Pattern pat = java.util.regex.Pattern.compile("^(.*?):(\\d+): (error|warning): (.*)$");
        for (String line : all.split("\n")) {
            java.util.regex.Matcher m = pat.matcher(line);
            if (m.find()) {
                if (d.length() > 1) d.append(',');
                d.append("{\"kind\":").append(Json.str(m.group(3))).append(",\"file\":").append(Json.str(new File(m.group(1)).getName()))
                 .append(",\"line\":").append(m.group(2)).append(",\"msg\":").append(Json.str(m.group(4))).append('}');
            }
        }
        d.append(']');
        if (!ok) { rmrf(dir); return "{\"phase\":\"compile\",\"ok\":false,\"compileMs\":" + tCompile + ",\"diagnostics\":" + d + ",\"raw\":" + Json.str(all) + "}"; }
        Map<String, byte[]> classes = new HashMap<>();
        loadDir(outDir, "", classes);
        rmrf(dir);

        MemLoader loader = new MemLoader(classes, Harness.class.getClassLoader());
        final ByteArrayOutputStream buf = new ByteArrayOutputStream();
        final String[] exc = {null};
        final boolean[] done = {false};
        Thread th = new Thread(() -> {
            try {
                Class<?> c = loader.loadClass(mainClass);
                c.getMethod("main", String[].class).invoke(null, (Object) new String[0]);
            } catch (java.lang.reflect.InvocationTargetException ite) {
                Throwable t = ite.getCause();
                exc[0] = t.getClass().getName() + (t.getMessage() == null ? "" : ": " + t.getMessage());
            } catch (Throwable t) { exc[0] = String.valueOf(t); }
            done[0] = true;
        });
        PrintStream oldOut = System.out, oldErr = System.err; InputStream oldIn = System.in;
        long t1 = System.currentTimeMillis();
        try {
            PrintStream cap = new PrintStream(new OutputStream() {
                @Override public void write(int b) { if (buf.size() < 200_000) buf.write(b); }
            }, true, "UTF-8");
            System.setOut(cap); System.setErr(cap);
            System.setIn(new ByteArrayInputStream((stdin == null ? "" : stdin).getBytes(StandardCharsets.UTF_8)));
            Guard.deadline = System.currentTimeMillis() + totalMs;
            th.setDaemon(true);
            th.start();
            th.join(totalMs + 3000L);
        } catch (Exception e) { exc[0] = e.toString(); }
        finally { System.out.flush(); System.setOut(oldOut); System.setErr(oldErr); System.setIn(oldIn); }
        Guard.deadline = Long.MAX_VALUE;
        boolean hung = !done[0];
        if (violation != null) return "{\"phase\":\"forbidden\",\"what\":" + Json.str(violation) + ",\"compileMs\":" + tCompile + "}";
        boolean timedOut = hung || (exc[0] != null && exc[0].contains("Temps limite"));
        String text; try { text = new String(buf.toByteArray(), "UTF-8"); } catch (Exception e) { text = ""; }
        return "{\"phase\":\"main\",\"ok\":true,\"compileMs\":" + tCompile + ",\"runMs\":" + (System.currentTimeMillis() - t1)
            + ",\"stdout\":" + Json.str(text) + ",\"exception\":" + Json.str(exc[0]) + ",\"timedOut\":" + timedOut + ",\"hung\":" + hung + "}";
    }

    /** CLI de test local : args = ecjOpts mainClass perTestMs totalMs ; stdin = fichiers empaquetés. */
    public static void main(String[] a) throws Exception {
        ByteArrayOutputStream bo = new ByteArrayOutputStream();
        byte[] buf = new byte[8192]; int r;
        while ((r = System.in.read(buf)) > 0) bo.write(buf, 0, r);
        String packed = new String(bo.toByteArray(), StandardCharsets.UTF_8);
        String res = check(packed, a[1], Integer.parseInt(a[2]), Integer.parseInt(a[3]), a[0]);
        PrintStream o = new PrintStream(new FileOutputStream(FileDescriptor.out), true, "UTF-8");
        o.println(res);
    }
}
