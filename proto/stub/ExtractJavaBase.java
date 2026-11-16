import java.nio.file.*; import java.net.URI; import java.util.*;
public class Ext { public static void main(String[] a) throws Exception {
  FileSystem fs = FileSystems.getFileSystem(URI.create("jrt:/"));
  Path root = fs.getPath("/modules/java.base");
  String[] keep = {"java/lang/","java/util/","java/io/","java/math/","java/text/","java/nio/","java/net/","java/time/","java/security/","java/lang/invoke/","jdk/internal/vm/annotation/"};
  Path out = Paths.get(a[0]);
  try (var s = Files.walk(root)) { for (Path p : (Iterable<Path>) s::iterator) {
    String r = root.relativize(p).toString();
    if (!r.endsWith(".class")) continue;
    boolean ok=false; for (String k: keep) if (r.startsWith(k)) ok=true;
    if (r.equals("module-info.class")) ok=false;
    if (!ok) continue;
    Path d = out.resolve(r); Files.createDirectories(d.getParent()); Files.copy(p, d, StandardCopyOption.REPLACE_EXISTING);
  }}
}}
