import java.util.*;
import java.util.function.*;

interface Shape { double area(); default String label() { return "Shape " + area(); } static Shape unit() { return () -> 1.0; } }
abstract class Vehicle {
    protected String plate;
    private static int made;
    protected Vehicle(String plate) { this.plate = plate; made++; }
    abstract int wheels();
    static int getMade() { return made; }
}
class Car extends Vehicle {
    Car(String p) { super(p); }
    @Override int wheels() { return 4; }
    @Override public String toString() { return "Car " + plate; }
    @Override public boolean equals(Object o) { return o instanceof Car c && c.plate.equals(plate); }
    @Override public int hashCode() { return plate.hashCode(); }
}
class Node<T> {
    T val; Node<T> next;
    Node(T val) { this.val = val; }
}
class MyList<T> implements Iterable<T> {
    private Node<T> head, tail; private int size;
    void add(T v) { Node<T> n = new Node<>(v); if (head == null) head = tail = n; else { tail.next = n; tail = n; } size++; }
    int size() { return size; }
    public Iterator<T> iterator() {
        return new Iterator<T>() {
            Node<T> cur = head;
            public boolean hasNext() { return cur != null; }
            public T next() { T v = cur.val; cur = cur.next; return v; }
        };
    }
}
class Account {
    private final String id;
    private double balance;
    private static final double MIN = 0;
    Account(String id, double initial) { this.id = id; if (initial < MIN) throw new IllegalArgumentException("neg"); balance = initial; }
    void withdraw(double amt) throws Exception { if (amt > balance) throw new Exception("Insufficient"); balance -= amt; }
    double getBalance() { return balance; }
    String getId() { return id; }
}
enum Status { ACTIVE, INACTIVE; Status toggle() { return this == ACTIVE ? INACTIVE : ACTIVE; } }
public class Main {
    static final int SIZE = 3;
    static int[] counts = new int[SIZE];
    static String describe(Status s) {
        return switch (s) { case ACTIVE -> "on"; case INACTIVE -> "off"; };
    }
    static int find(int[] arr, int target) {
        for (int i = 0; i < arr.length; i++) if (arr[i] == target) return i;
        return -1;
    }
    static int classify(int n) {
        if (n < 0) { return -1; } else if (n == 0) { return 0; } else { return 1; }
    }
    static int loopRet() { int i = 0; while (true) { if (++i > 3) return i; } }
    static int sw(String s) { switch (s) { case "a": return 1; case "b": return 2; default: throw new IllegalStateException(); } }
    static boolean tryRet(String s) { try { Integer.parseInt(s); return true; } catch (NumberFormatException e) { return false; } }
    static int forever() { for (;;) { return 1; } }
    static char grade(int s) { char g; if (s >= 80) g = 'A'; else if (s >= 60) g = 'B'; else g = 'C'; return g; }
    static <T extends Comparable<T>> T maxOf(List<T> xs) { T best = xs.get(0); for (T x : xs) if (x.compareTo(best) > 0) best = x; return best; }
    public static void main(String[] args) throws Exception {
        Shape sq = () -> 4.0;
        System.out.println(sq.label() + " " + Shape.unit().area());
        Vehicle v = new Car("B 1234 XY");
        System.out.println(v + " " + v.wheels() + " " + Vehicle.getMade());
        Set<Car> cars = new HashSet<>(); cars.add(new Car("A")); cars.add(new Car("A")); System.out.println(cars.size());
        MyList<String> ml = new MyList<>(); ml.add("x"); ml.add("y");
        for (String s : ml) System.out.print(s); System.out.println(" " + ml.size());
        Account acc = new Account("AC1", 100);
        try { acc.withdraw(30); acc.withdraw(100); } catch (Exception e) { System.out.println("Error: " + e.getMessage()); }
        System.out.println(acc.getId() + " " + acc.getBalance());
        Status st = Status.ACTIVE; System.out.println(describe(st) + " " + describe(st.toggle()));
        System.out.println(find(new int[]{4, 5, 6}, 5) + " " + classify(-3) + " " + loopRet() + " " + sw("b") + " " + tryRet("x") + " " + forever() + " " + grade(70));
        System.out.println(maxOf(Arrays.asList(3, 9, 2)) + " " + maxOf(List.of("pear", "apple")));
        int total = 0;
        for (int c : counts) total += c;
        final int base = 10;
        int effectively = 5;
        Function<Integer, Integer> f = x -> x + base + effectively;
        System.out.println(f.apply(1) + " " + total);
        List<Integer> nums = new ArrayList<>(List.of(3, 1, 2));
        nums.sort((a, b) -> b - a);
        nums.forEach(n -> System.out.print(n + ","));
        System.out.println();
        Map<String, List<Integer>> m = new HashMap<>();
        m.computeIfAbsent("k", k -> new ArrayList<>()).add(1);
        m.forEach((k, list) -> System.out.println(k + list));
        int x;
        if (args.length > 100) { x = 1; } else { x = 2; }
        int y;
        switch (x) { case 1 -> y = 10; case 2 -> y = 20; default -> y = 0; }
        int z;
        try { z = Integer.parseInt("12"); } catch (NumberFormatException e) { z = -1; }
        int w;
        while (true) { w = 3; break; }
        String label;
        boolean ok = x > 1;
        if (ok) label = "big"; else label = "small";
        System.out.println(x + y + z + w + label);
        int k = 0;
        outer:
        for (int i = 0; i < 3; i++) for (int j = 0; j < 3; j++) { if (i * j == 2) break outer; k++; }
        System.out.println("k=" + k);
        Object o = "hello";
        if (o instanceof String s && s.length() > 3) System.out.println(s.toUpperCase());
        if (!(o instanceof Integer)) System.out.println("not int");
        byte b = 10; short sh = 100; char c = 65; b += 5; c++;
        long big = Integer.MAX_VALUE; big++;
        float fl = 1.5f; double dd = fl;
        System.out.println(b + " " + sh + " " + c + " " + big + " " + dd);
        Integer boxed = null;
        Comparator<String> byLen = Comparator.comparing(String::length);
        List<String> ws = new ArrayList<>(List.of("ccc", "a", "bb"));
        Collections.sort(ws, byLen.reversed());
        System.out.println(ws + " " + (boxed == null));
        Runnable r = new Runnable() { @Override public void run() { System.out.println("anon run " + base); } };
        r.run();
        BiFunction<Integer, Integer, Integer> add = Integer::sum;
        Supplier<Car> mk = () -> new Car("Z");
        System.out.println(add.apply(2, 3) + " " + mk.get());
        StringBuilder sb = new StringBuilder();
        for (char ch = 'a'; ch <= 'e'; ch++) sb.append(ch);
        System.out.println(sb.reverse());
        int[][] tri = new int[4][];
        for (int i = 0; i < tri.length; i++) { tri[i] = new int[i + 1]; tri[i][0] = tri[i][i] = 1; for (int j = 1; j < i; j++) tri[i][j] = tri[i-1][j-1] + tri[i-1][j]; }
        System.out.println(Arrays.deepToString(tri));
        double avg = nums.isEmpty() ? 0 : nums.stream().mapToInt(Integer::intValue).sum() / (double) nums.size();
        System.out.printf("avg=%.2f%n", avg);
        char op = '+';
        int res = switch (op) { case '+' -> 1 + 2; case '-' -> 1 - 2; default -> { System.out.println("?"); yield 0; } };
        System.out.println(res);
        do { k--; } while (k > 0);
        System.out.println(k);
        String text = null;
        System.out.println(text == null ? "null text" : text);
        Iterator<Integer> it = nums.iterator();
        while (it.hasNext()) { int n = it.next(); if (n == 2) it.remove(); }
        System.out.println(nums);
        var map2 = new TreeMap<String, Integer>();
        map2.put("b", 2); map2.put("a", 1);
        for (var e : map2.entrySet()) System.out.print(e.getKey() + e.getValue());
        System.out.println();
        int[] arr = {5, 2};
        int tmp = arr[0]; arr[0] = arr[1]; arr[1] = tmp;
        System.out.println(arr[0] + "" + arr[1]);
        throwIt(false);
    }
    static void throwIt(boolean b) { if (b) throw new RuntimeException("x"); System.out.println("done"); }
}
