import org.objectweb.asm.*; import java.nio.file.*; import java.util.*; import java.util.zip.*; import java.io.*;
/** Construit un jar "signatures seulement" (API publique/protégée, sans corps de méthode) pour la compilation ECJ. */
public class Stub { public static void main(String[] a) throws Exception {
  Path in = Paths.get(a[0]); String[] keep = {"java/lang/","java/util/","java/io/","java/math/","java/text/","java/nio/charset/","java/nio/file/","java/time/"};
  String[] drop = {"java/util/concurrent/locks/","java/lang/invoke/VarHandle", "java/util/random/","java/lang/foreign/","java/lang/classfile/"};
  try (ZipOutputStream z = new ZipOutputStream(new FileOutputStream(a[1])); var s = Files.walk(in)) {
   z.setLevel(9); int n=0;
   for (Path p : (Iterable<Path>) s::iterator) { String r = in.relativize(p).toString(); if (!r.endsWith(".class")) continue;
    boolean ok=false; for (String k: keep) if (r.startsWith(k)) ok=true; for (String d: drop) if (r.startsWith(d)) ok=false; if(!ok) continue;
    ClassReader cr = new ClassReader(Files.readAllBytes(p));
    if ((cr.getAccess() & (Opcodes.ACC_PUBLIC|Opcodes.ACC_PROTECTED)) == 0 && !r.contains("$")) continue;
    ClassWriter cw = new ClassWriter(0);
    cr.accept(new ClassVisitor(Opcodes.ASM9, cw) {
      public FieldVisitor visitField(int acc, String n, String d, String sg, Object v) { if ((acc & Opcodes.ACC_PRIVATE)!=0) return null; return super.visitField(acc,n,d,sg,v); }
      public MethodVisitor visitMethod(int acc, String n, String d, String sg, String[] ex) { if ((acc & Opcodes.ACC_PRIVATE)!=0 || (acc & Opcodes.ACC_SYNTHETIC)!=0) return null; final MethodVisitor out0 = super.visitMethod(acc,n,d,sg,ex);
        return new MethodVisitor(Opcodes.ASM9) { public AnnotationVisitor visitAnnotationDefault(){ return out0.visitAnnotationDefault(); } public AnnotationVisitor visitAnnotation(String ds, boolean vis){ return out0.visitAnnotation(ds, vis);} public void visitEnd(){ out0.visitEnd(); } }; }
    }, ClassReader.SKIP_CODE | ClassReader.SKIP_DEBUG | ClassReader.SKIP_FRAMES);
    z.putNextEntry(new ZipEntry(r)); z.write(cw.toByteArray()); z.closeEntry(); n++; }
   System.err.println("classes: " + n);
  } } }
