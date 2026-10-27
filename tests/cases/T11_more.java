import java.util.*;
import java.util.function.*;

class Counter {
    static int instances;
    static { instances = 100; }
    int value;
    { value = 10; }
    Counter() { this(5); instances++; }
    Counter(int start) { value += start; instances++; }
}
class A { String who() { return "A"; } String hello() { return "hello from " + who(); } static String stat() { return "A.stat"; } }
class B extends A { @Override String who() { return "B"; } String parent() { return super.who(); } }
class C extends B { @Override String who() { return "C+" + super.who(); } static String stat() { return "C.stat"; } }
enum Op {
    ADD("+") { int apply(int a, int b) { return a + b; } },
    MUL("*") { int apply(int a, int b) { return a * b; } };
    final String sym;
    Op(String sym) { this.sym = sym; }
    abstract int apply(int a, int b);
}
class Shop {
    interface Rule { boolean ok(int qty); }
    enum Size { S, M, L }
    static class Line { String item; int qty; Line(String i, int q) { item = i; qty = q; } }
    private final List<Line> lines = new ArrayList<>();
    Shop add(String item, int qty) { lines.add(new Line(item, qty)); return this; }
    int total(Rule r) { int t = 0; for (Line l : lines) if (r.ok(l.qty)) t += l.qty; return t; }
}
public class Main {
    static int over(int x) { return 1; }
    static int over(long x) { return 2; }
    static int over(double x) { return 3; }
    static int over(Integer x) { return 4; }
    static int over(Object x) { return 5; }
    static int over(String x) { return 6; }
    static double sum(double... xs) { double s = 0; for (double x : xs) s += x; return s; }
    static <T> void printAll(List<? extends T> xs) { for (T x : xs) System.out.print(x + ";"); System.out.println(); }
    static double total(List<? extends Number> xs) { double t = 0; for (Number n : xs) t += n.doubleValue(); return t; }
    static int fact(int n) { return n <= 1 ? 1 : n * fact(n - 1); }
    static void hanoi(int n, char from, char to, char via, List<String> moves) {
        if (n == 0) return;
        hanoi(n - 1, from, via, to, moves);
        moves.add(from + ">" + to);
        hanoi(n - 1, via, to, from, moves);
    }
    public static void main(String[] args) {
        Counter c1 = new Counter(), c2 = new Counter(1);
        System.out.println(c1.value + " " + c2.value + " " + Counter.instances);
        A x = new C();
        System.out.println(x.who() + " | " + x.hello() + " | " + new B().parent() + " | " + A.stat() + " " + C.stat());
        for (Op op : Op.values()) System.out.print(op + op.sym + op.apply(3, 4) + " ");
        System.out.println(Op.valueOf("MUL").ordinal());
        Shop shop = new Shop().add("a", 2).add("b", 10).add("c", 5);
        System.out.println(shop.total(q -> q > 3) + " " + shop.total(q -> true) + " " + Shop.Size.M + " " + Shop.Size.values().length);
        byte bb = 1; short ss = 2; long ll = 3L; char cc = 'c'; float ff = 1f;
        System.out.println(over(bb) + "" + over(ss) + over(5) + over(ll) + over(ff) + over(2.0) + over(cc) + over(Integer.valueOf(7)) + over("s") + over(new int[0]) + over((Object) "o"));
        System.out.println(sum() + " " + sum(1) + " " + sum(1, 2.5, 3));
        printAll(List.of(1, 2, 3)); System.out.println(total(List.of(1, 2.5, 3L)));
        List<String> moves = new ArrayList<>(); hanoi(3, 'A', 'C', 'B', moves); System.out.println(moves.size() + " " + moves);
        System.out.println(fact(10) + " " + fact(13));
        int[] arr = {1, 2, 3}; arr[1] += 10; arr[2] *= arr[1]; arr[0]--; ++arr[0]; System.out.println(Arrays.toString(arr));
        int[][] jag = {{1}, {2, 3}, {4, 5, 6}}; int s = 0; for (int[] row : jag) for (int v : row) s += v; System.out.println(s + " " + jag[2].length);
        String[][] board = new String[2][2]; for (String[] row : board) Arrays.fill(row, "."); board[0][1] = "X"; System.out.println(Arrays.deepToString(board));
        char[] cs = {'d', 'a', 'c', 'b'}; Arrays.sort(cs); System.out.println(new String(cs) + String.valueOf(cs, 1, 2));
        int i = 10; i += i++ + ++i; System.out.println(i);
        int k = 7; k <<= 2; k >>= 1; k ^= 5; k |= 64; k &= ~1; k %= 50; System.out.println(k);
        double d = 10; d /= 4; d -= 0.5; System.out.println(d);
        String sw = "b";
        int code = switch (sw) { case "a" -> 1; case "b" -> { int t = 40; yield t + 2; } default -> -1; };
        System.out.println(code);
        Map<String, Integer> m = new LinkedHashMap<>(); m.put("x", 1); m.put("y", 2);
        for (String key : m.keySet()) System.out.print(key + m.get(key)); System.out.println();
        outer: for (int a = 0; a < 3; a++) { for (int b = 0; b < 3; b++) { if (b > a) continue outer; System.out.print(a + "" + b + " "); } } System.out.println();
        int n = 0; do { n += 3; } while (n < 10 && n % 2 != 0 || n == 6); System.out.println(n);
        Object o = 42; String desc = o instanceof Integer ? "int " + ((Integer) o + 1) : o instanceof String ? "str" : "other"; System.out.println(desc);
        System.out.println(true ? 1 : 2.0);
        System.out.println((char) ('a' + 1) + "" + (int) 'a' + (char) 98 + ('a' + 1));
        try (Scanner sc = new Scanner("12 apples")) { System.out.println(sc.nextInt() * 2 + sc.next()); }
        try { try { throw new IllegalStateException("inner"); } finally { System.out.println("f1"); } } catch (RuntimeException e) { System.out.println("caught " + e.getMessage()); } finally { System.out.println("f2"); }
        Function<Integer, Function<Integer, Integer>> adder = a -> b -> a + b; System.out.println(adder.apply(3).apply(4));
        BinaryOperator<Integer> mx = BinaryOperator.class.isInstance(null) ? null : (a, b) -> a > b ? a : b; System.out.println(mx.apply(3, 9));
        Supplier<String> sup = () -> "sup"; Predicate<Integer> even = v -> v % 2 == 0; Consumer<String> pr = System.out::print;
        pr.accept(sup.get() + even.test(4) + even.and(v -> v > 10).test(4) + "\n");
        List<String> names = new ArrayList<>(List.of("bob", "Al", "carl", "Dee"));
        names.replaceAll(String::toUpperCase); names.sort(Comparator.comparing(String::length).thenComparing(Comparator.naturalOrder())); System.out.println(names);
        System.out.println(String.format("%5.1f|%-6s|%06d|%x|%c|%10.3e|%b|%%", 3.14159, "ab", 42, 255, 'Z', 12345.6789, null));
        StringBuilder sb = new StringBuilder("hello world"); sb.insert(0, '[').append(']').replace(1, 6, "HELLO").deleteCharAt(sb.length() - 1).setCharAt(0, '<');
        System.out.println(sb + " " + sb.indexOf("world"));
        System.out.println(Math.abs(-7.5) + " " + Math.ceil(-1.2) + " " + Math.floorDiv(-7, 2) + " " + Math.floorMod(-7, 2) + " " + Math.hypot(3, 4) + " " + (int) Math.signum(-3.0) + " " + Math.cbrt(27));
        System.out.println(Integer.MAX_VALUE + Integer.MAX_VALUE + " " + (long) Integer.MAX_VALUE * 2 + " " + (byte) 130 + " " + (short) -40000 + " " + (int) 3e9 + " " + (long) 1e19 + " " + (int) Double.NaN);
        System.out.println(0.1 * 3 + " " + 1.0 / 3 + " " + 2.0 / 3 + " " + 100.0 / 7 + " " + 1e-5 + " " + 123456789012.0 + " " + (float) 1 / 3 + " " + 3.0f * 1.1f);
    }
}
