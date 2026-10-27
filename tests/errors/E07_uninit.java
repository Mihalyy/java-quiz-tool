import java.util.Scanner;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int x;
        System.out.println(x);
        String name;
        if (sc.nextInt() > 5) name = "big";
        System.out.println(name);
        int y;
        if (args.length > 0) y = 1; else y = 2;
        System.out.println(y);
        int choice;
        do { choice = sc.nextInt(); } while (choice != 5);
        System.out.println(choice);
        int z;
        while (sc.hasNext()) { z = 1; }
        System.out.println(z);
        int w;
        switch (choice) { case 1: w = 1; break; default: w = 2; }
        System.out.println(w);
        int q;
        try { q = Integer.parseInt("1"); } catch (Exception e) { q = 0; }
        System.out.println(q);
    }
}
