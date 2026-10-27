import java.util.*;
import java.util.function.*;

class Box<T extends Comparable<T>> {
    private T value;
    Box(T v) { value = v; }
    T get() { return value; }
    boolean bigger(Box<T> o) { return value.compareTo(o.value) > 0; }
}
class Pair<K, V> {
    private final K key; private final V val;
    Pair(K k, V v) { key = k; val = v; }
    K getKey() { return key; } V getVal() { return val; }
    @Override public String toString() { return key + "=" + val; }
}
class Outer {
    private int x = 10;
    class Inner { int doubled() { return x * 2; } }
    static class Nested { String hi() { return "nested"; } }
    Inner make() { return new Inner(); }
}
class InitOrder {
    static { System.out.println("static init"); }
    int a = initA();
    { System.out.println("instance init a=" + a); }
    InitOrder() { System.out.println("ctor"); }
    int initA() { System.out.println("initA"); return 5; }
}
class Base {
    Base() { System.out.println("Base ctor"); hook(); }
    void hook() { System.out.println("Base hook"); }
}
class Derived extends Base {
    int v = 7;
    Derived() { super(); System.out.println("Derived ctor v=" + v); }
    @Override void hook() { System.out.println("Derived hook v=" + v); }
}
interface Calc { int apply(int a, int b); static Calc add() { return (a, b) -> a + b; } }
public class Main {
    static int counter;
    static String classify(int score) {
        if (score >= 85) return "A";
        else if (score >= 70) return "B";
        else if (score >= 55) return "C";
        return "D";
    }
    static String day(int d) {
        switch (d) {
            case 1: case 7: return "Weekend";
            case 2: case 3: case 4: case 5: case 6: return "Weekday";
            default: return "Invalid";
        }
    }
    public static void main(String[] args) {
        Box<Integer> b1 = new Box<>(5), b2 = new Box<>(3);
        System.out.println(b1.bigger(b2) + " " + b1.get());
        List<Pair<String, Integer>> ps = new ArrayList<>();
        ps.add(new Pair<>("b", 2)); ps.add(new Pair<>("a", 1));
        ps.sort(Comparator.comparing(Pair::getKey));
        System.out.println(ps);
        Outer o = new Outer(); System.out.println(o.make().doubled() + " " + new Outer.Nested().hi());
        Outer.Inner in2 = o.new Inner(); System.out.println(in2.doubled());
        new InitOrder(); new InitOrder();
        new Derived();
        System.out.println(Calc.add().apply(3, 4));
        Calc mul = (a, b) -> a * b; System.out.println(mul.apply(6, 7));
        Function<Integer, Integer> sq = x -> x * x; Function<Integer, String> str = x -> "<" + x + ">";
        System.out.println(sq.andThen(str).apply(5));
        Supplier<List<String>> sup = ArrayList::new; List<String> l = sup.get(); l.add("z"); System.out.println(l);
        BiFunction<Integer, Integer, Integer> max = Math::max; System.out.println(max.apply(3, 9));
        Predicate<String> empty = String::isEmpty; System.out.println(empty.test("") + " " + empty.negate().test(""));
        Consumer<String> printer = System.out::println; printer.accept("consumed");
        UnaryOperator<String> up = String::toUpperCase; System.out.println(up.apply("shout"));
        for (int s : new int[]{90, 75, 60, 10}) System.out.print(classify(s) + " ");
        System.out.println(day(1) + " " + day(3) + " " + day(9));
        String cmd = "stop";
        switch (cmd) { case "go": System.out.println("going"); case "stop": System.out.println("stopping"); case "x": System.out.println("fallthrough"); break; default: System.out.println("no"); }
        int k = 3;
        String r = switch (k) { case 1, 2 -> "low"; case 3 -> { String t = "three"; yield t.toUpperCase(); } default -> "high"; };
        System.out.println(r);
        outer:
        for (int i = 0; i < 5; i++) {
            for (int j = 0; j < 5; j++) {
                if (j == 3) continue outer;
                if (i == 3) break outer;
                System.out.print(i + "" + j + " ");
            }
        }
        System.out.println();
        int n = 0; while (true) { if (++n > 4) break; } System.out.println("n=" + n);
        int m = 10; do { m -= 3; } while (m > 0); System.out.println("m=" + m);
        for (int i = 0, j = 10; i < j; i += 3, j -= 3) System.out.print("(" + i + "," + j + ")");
        System.out.println();
        char grade = 'B';
        switch (grade) { case 'A' -> System.out.println("Excellent"); case 'B', 'C' -> System.out.println("Good"); default -> System.out.println("?"); }
        StringBuilder pattern = new StringBuilder();
        for (int i = 1; i <= 4; i++) { pattern.append(" ".repeat(4 - i)).append("*".repeat(2 * i - 1)).append("\n"); }
        System.out.print(pattern);
        int[][] mat = {{1, 2, 3}, {4, 5, 6}};
        int sum = 0; for (int[] row : mat) for (int v : row) sum += v; System.out.println("sum=" + sum + " rows=" + mat.length + " cols=" + mat[0].length);
        Integer boxed = 127, boxed2 = 127; System.out.println(boxed.equals(boxed2) + " " + boxed.compareTo(100) + " " + boxed.intValue());
        Double dd = 2.5; System.out.println(dd + " " + dd.intValue() + " " + Double.valueOf("3.25"));
        Character cc = 'x'; System.out.println(Character.isLetter(cc) + " " + Character.toUpperCase(cc) + " " + Character.isDigit('5') + " " + Character.getNumericValue('7') + " " + (char) ('a' + 2));
        long fact = 1; for (int i = 2; i <= 20; i++) fact *= i; System.out.println(fact);
        int ov = 1; for (int i = 0; i < 40; i++) ov *= 3; System.out.println(ov);
        System.out.println(Objects.equals(null, null) + " " + Objects.hash(1, "a") + " " + Arrays.asList(3, 1, 2));
        var list2 = new ArrayList<String>(); list2.add("var works"); for (var s : list2) System.out.println(s);
        final int LIMIT = 3; System.out.println(LIMIT * 2);
        int[] copy = Arrays.copyOf(new int[]{1, 2, 3}, 5); System.out.println(Arrays.toString(copy));
        Integer[] boxedArr = {3, 1, 2}; Arrays.sort(boxedArr, Collections.reverseOrder()); System.out.println(Arrays.toString(boxedArr));
        String[] words = {"pear", "Apple", "fig"}; Arrays.sort(words); System.out.println(Arrays.toString(words));
        Arrays.sort(words, String::compareToIgnoreCase); System.out.println(String.join(",", words));
        System.out.println(ternary(5) + ternary(-5) + ternary(0));
        counter += 5; Main.counter++; System.out.println(counter);
        System.out.println(Integer.valueOf(65) + " " + (int) 'A' + " " + Character.toString(66) + " " + String.valueOf((char) 67));
    }
    static String ternary(int x) { return x > 0 ? "pos " : x < 0 ? "neg " : "zero "; }
}
