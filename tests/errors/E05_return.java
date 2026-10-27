public class Main {
    static int grade(int s) {
        if (s > 50) return 1;
        else if (s > 20) return 2;
    }
    static int loop() { while (true) { } }
    static int sw(int x) { switch (x) { case 1: return 1; default: return 0; } }
    static void v() { return 5; }
    static int r() { return; }
    static int t(int x) { try { return x; } catch (Exception e) { System.out.println(e); } }
    public static void main(String[] args) {
        int x = 1;
        return;
        System.out.println(x);
    }
}
