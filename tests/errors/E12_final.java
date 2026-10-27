public class Main {
    static final int MAX = 10;
    final String id = "x";
    public static void main(String[] args) {
        final int x = 5;
        x = 6;
        MAX = 11;
        Main m = new Main();
        m.id = "y";
        int count = 0;
        Runnable r = () -> System.out.println(count);
        count++;
        int total = 0;
        java.util.List.of(1, 2).forEach(n -> total += n);
    }
}
