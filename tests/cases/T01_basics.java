import java.util.*;
public class Main {
    static int sq(int x) { return x * x; }
    static double avg(int... xs) { int s = 0; for (int x : xs) s += x; return xs.length == 0 ? 0 : (double) s / xs.length; }
    public static void main(String[] args) {
        int a = 7, b = 2;
        System.out.println(a / b + " " + a % b + " " + (double) a / b + " " + a * 1.0 / b);
        System.out.println(-7 / 2 + " " + -7 % 2 + " " + 7.0 % 2.5);
        System.out.println(Integer.MAX_VALUE + 1);
        long big = 1L << 40; System.out.println(big + " " + (big * 3));
        double d = 0.1 + 0.2; System.out.println(d);
        System.out.println(100.0 + " " + 1e7 + " " + 1.0E-4 + " " + 123456789.0 + " " + 0.001 + " " + (float) 0.1 + " " + 1.0f/3);
        char c = 'A'; c++; c += 2; System.out.println(c + " " + (c + 1) + " " + (char)(c + 1) + " " + (int) c);
        System.out.println('a' + 'b' + "c" + 'd' + 1 + 2);
        System.out.println(1 + 2 + "3" + 4 + 5);
        String s = null; System.out.println("s=" + s);
        System.out.println(sq(9) + " " + avg(1, 2, 4) + " " + avg());
        System.out.println(10 == 10.0);
        System.out.println(5 / 2.0 > 2 ? "yes" : "no");
        int x = 5; x += 3.7; System.out.println(x);
        byte by = (byte) 200; short sh = (short) 70000; System.out.println(by + " " + sh);
        System.out.println((int) 3.99 + " " + (int) -3.99 + " " + Math.round(2.5) + " " + Math.round(-2.5) + " " + Math.round(2.4f));
        System.out.println(Math.max(3, 7) + " " + Math.max(3, 7.5) + " " + Math.abs(-4) + " " + Math.pow(2, 10) + " " + Math.sqrt(16));
        System.out.println(Math.floor(-1.5) + " " + Math.ceil(1.2) + " " + Math.abs(-2.5));
        int[] arr = {5, 3, 9, 1};
        Arrays.sort(arr);
        System.out.println(Arrays.toString(arr) + " " + arr.length);
        int[][] grid = new int[3][4]; grid[1][2] = 7;
        System.out.println(Arrays.deepToString(grid));
        String[] names = new String[2]; System.out.println(Arrays.toString(names));
        double[] ds = new double[2]; System.out.println(Arrays.toString(ds));
        boolean f = false; System.out.println(!f && (a > b || b > a));
        System.out.println(7 & 3 | 8 ^ 2);
        System.out.println(-17 >> 2);
        System.out.println(-17 >>> 28);
        int i = 0; i = i++ + ++i; System.out.println(i);
        System.out.println(Integer.parseInt("-42") + Double.parseDouble("3.5"));
        System.out.println(String.valueOf(3.0) + String.valueOf(true) + String.valueOf('x'));
        System.out.println(Integer.toBinaryString(10) + " " + Integer.toHexString(255) + " " + Integer.toHexString(-1));
        System.out.println(Long.MAX_VALUE + " " + Long.MIN_VALUE + " " + (Long.MAX_VALUE + 1));
        System.out.println(0.1f + 0.2f);
        System.out.println((0.1f + 0.2f) == 0.3f);
        float ff = 3.14159f; System.out.println(ff * 2);
        System.out.println(1.0 / 0 + " " + -1.0 / 0 + " " + 0.0 / 0);
        System.out.println(Double.compare(1.5, 2.5) + " " + Integer.compare(5, 3) + " " + "abc".compareTo("abd") + " " + "b".compareTo("abc"));
    }
}
