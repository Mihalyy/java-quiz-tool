import java.util.*;
public class Main {
    static int count = 0;
    private List<Map<String, Integer>> data = new ArrayList<>();
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int[] a = {1, 2, 3};
        int x = a.length > 1 ? (int) 3.5 : -2147483648;
        for (int i = 0, j = 1; i < 3; i++, j--) { x += i >> 1; }
        for (String s : List.of("a")) System.out.println(s);
        Comparator<String> c = (s1, s2) -> s1.compareTo(s2);
        Runnable r = () -> { System.out.println("hi"); };
        String res = switch (x) { case 1, 2 -> "a"; default -> { yield "b"; } };
        outer:
        while (true) { break outer; }
        try { x /= 0; } catch (ArithmeticException | NullPointerException e) { e.printStackTrace(); } finally { }
        List<String> l = new ArrayList<String>();
        l.forEach(System.out::println);
        Object o = new Object() { public String toString() { return "anon"; } };
        if (o instanceof String str && str.length() > 2) {}
        char ch = (char) (x + 'a');
        boolean b = x < 3 && x > (2);
    }
}
abstract class Shape { protected abstract double area(); }
enum Color { RED, GREEN("g") { }, BLUE; Color() {} Color(String s) {} }
